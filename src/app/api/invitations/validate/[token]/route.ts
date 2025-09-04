import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/server-supabase';

// This is an API route, not a server action
export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const resolvedParams = await params;
    const token = resolvedParams.token;

    if (!token) {
      return NextResponse.json(
        { valid: false, error: 'Token is required' },
        { status: 400 }
      );
    }

    // Find invitation by token
    const { data: invitation, error } = await supabaseServer
      .from('user_invitations')
      .select(`
        id,
        email,
        role,
        expires_at,
        created_at,
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

    if (error || !invitation) {
      return NextResponse.json(
        { valid: false, error: 'Invalid invitation token' },
        { status: 400 }
      );
    }

    // Check if invitation has expired
    const now = new Date();
    const expiresAt = new Date(invitation.expires_at);

    if (now > expiresAt) {
      return NextResponse.json(
        { valid: false, error: 'Invitation has expired' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      valid: true,
      invitation: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        expires_at: invitation.expires_at,
        created_at: invitation.created_at,
        organizations: invitation.organizations,
        invited_by: invitation.users,
      },
    });

  } catch (error) {
    console.error('Validate invitation error:', error);
    return NextResponse.json(
      { valid: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
