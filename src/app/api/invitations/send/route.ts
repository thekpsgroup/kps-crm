import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserProfile } from '@/lib/session';
import { supabaseServer } from '@/lib/server-supabase';
import crypto from 'crypto';

// This is an API route, not a server action
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const { email, role = 'user' } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Get current user
    const currentUser = await getCurrentUserProfile();
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user's organization
    const { data: userOrgs, error: orgError } = await supabaseServer
      .from('organization_members')
      .select(`
        organization_id,
        role,
        organizations (
          id,
          name
        )
      `)
      .eq('user_id', currentUser.id);

    if (orgError || !userOrgs || userOrgs.length === 0) {
      return NextResponse.json(
        { error: 'No organization found' },
        { status: 400 }
      );
    }

    // Use the first organization (or could allow user to choose)
    const organizations = userOrgs[0].organizations as { id: string; name: string }[];
    const organization = organizations[0];

    // Check if user already exists
    const { data: existingUser } = await supabaseServer
      .from('users')
      .select('id, email')
      .eq('email', email)
      .single();

    if (existingUser) {
      return NextResponse.json(
        { error: 'User already exists in the system' },
        { status: 400 }
      );
    }

    // Check if invitation already exists
    const { data: existingInvitation } = await supabaseServer
      .from('user_invitations')
      .select('id')
      .eq('email', email)
      .eq('organization_id', organization.id)
      .is('accepted_at', null)
      .single();

    if (existingInvitation) {
      return NextResponse.json(
        { error: 'Invitation already sent to this email' },
        { status: 400 }
      );
    }

    // Generate invitation token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

    // Create invitation
    const { data: invitation, error: inviteError } = await supabaseServer
      .from('user_invitations')
      .insert({
        email,
        role,
        organization_id: organization.id,
        invited_by: currentUser.id,
        invitation_token: token,
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    if (inviteError) {
      console.error('Error creating invitation:', inviteError);
      return NextResponse.json(
        { error: 'Failed to create invitation' },
        { status: 500 }
      );
    }

    // Generate invitation URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const invitationUrl = `${baseUrl}/invite/${token}`;

    // TODO: Send email with invitation link
    // For now, we'll just return the URL so you can manually send it
    console.log('📧 Invitation created for:', email);
    console.log('🔗 Invitation URL:', invitationUrl);
    console.log('⏰ Expires:', expiresAt.toISOString());

    // In production, you would send an email here
    // Example: await sendInvitationEmail(email, invitationUrl, organization.name, currentUser.profile.full_name);

    return NextResponse.json({
      success: true,
      invitation: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        expires_at: invitation.expires_at,
        invitation_url: invitationUrl,
      },
      message: 'Invitation created successfully. Copy the invitation URL to send to the user.',
    });

  } catch (error) {
    console.error('Send invitation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
