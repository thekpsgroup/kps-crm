import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserProfile } from '@/lib/session';
import { supabaseServer } from '@/lib/server-supabase';

// This is an API route, not a server action
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUserProfile();

    if (!currentUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user's organizations
    const { data: userOrgs, error: orgError } = await supabaseServer
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', currentUser.id);

    if (orgError || !userOrgs || userOrgs.length === 0) {
      return NextResponse.json(
        { error: 'No organization found' },
        { status: 400 }
      );
    }

    const orgIds = userOrgs.map(org => org.organization_id);

    // Get invitations for user's organizations
    const { data: invitations, error: inviteError } = await supabaseServer
      .from('user_invitations')
      .select(`
        id,
        email,
        role,
        expires_at,
        created_at,
        accepted_at
      `)
      .in('organization_id', orgIds)
      .is('accepted_at', null)
      .order('created_at', { ascending: false });

    if (inviteError) {
      console.error('Error fetching invitations:', inviteError);
      return NextResponse.json(
        { error: 'Failed to fetch invitations' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      invitations: invitations || [],
    });

  } catch (error) {
    console.error('List invitations error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
