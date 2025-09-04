import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/server-supabase';

// This is an API route, not a server action
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const { token, password, fullName } = await request.json();

    if (!token || !password || !fullName) {
      return NextResponse.json(
        { error: 'Token, password, and full name are required' },
        { status: 400 }
      );
    }

    // Find invitation by token
    const { data: invitation, error: inviteError } = await supabaseServer
      .from('user_invitations')
      .select(`
        *,
        organizations (
          id,
          name
        ),
        users!invited_by (
          email,
          full_name
        )
      `)
      .eq('invitation_token', token)
      .is('accepted_at', null)
      .single();

    if (inviteError || !invitation) {
      return NextResponse.json(
        { error: 'Invalid or expired invitation token' },
        { status: 400 }
      );
    }

    // Check if invitation has expired
    const now = new Date();
    const expiresAt = new Date(invitation.expires_at);

    if (now > expiresAt) {
      return NextResponse.json(
        { error: 'Invitation has expired' },
        { status: 400 }
      );
    }

    // Create user account
    const { data: authUser, error: authError } = await supabaseServer.auth.admin.createUser({
      email: invitation.email,
      password: password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
      },
    });

    if (authError) {
      console.error('Error creating user:', authError);
      return NextResponse.json(
        { error: 'Failed to create user account' },
        { status: 500 }
      );
    }

    // Create user profile in our users table
    const { data: userProfile, error: profileError } = await supabaseServer
      .from('users')
      .insert({
        id: authUser.user!.id,
        email: invitation.email,
        full_name: fullName,
        role: invitation.role,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (profileError) {
      console.error('Error creating user profile:', profileError);
      // Try to delete the auth user if profile creation failed
      await supabaseServer.auth.admin.deleteUser(authUser.user!.id);
      return NextResponse.json(
        { error: 'Failed to create user profile' },
        { status: 500 }
      );
    }

    // Add user to organization
    const { error: memberError } = await supabaseServer
      .from('organization_members')
      .insert({
        organization_id: invitation.organization_id,
        user_id: authUser.user!.id,
        role: invitation.role,
      });

    if (memberError) {
      console.error('Error adding user to organization:', memberError);
      // Try to clean up
      await supabaseServer.auth.admin.deleteUser(authUser.user!.id);
      return NextResponse.json(
        { error: 'Failed to add user to organization' },
        { status: 500 }
      );
    }

    // Mark invitation as accepted
    const { error: updateError } = await supabaseServer
      .from('user_invitations')
      .update({
        accepted_at: new Date().toISOString(),
      })
      .eq('id', invitation.id);

    if (updateError) {
      console.error('Error updating invitation:', updateError);
      // Don't fail the whole process for this
    }

    return NextResponse.json({
      success: true,
      user: {
        id: authUser.user!.id,
        email: authUser.user!.email,
        full_name: fullName,
        role: invitation.role,
        organization: invitation.organizations,
      },
      message: `Welcome to ${invitation.organizations.name}! Your account has been created successfully.`,
    });

  } catch (error) {
    console.error('Accept invitation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
