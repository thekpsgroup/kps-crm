import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/server-supabase';

// This is an API route, not a server action
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const { userId, email, fullName } = await request.json();

    if (!userId || !email) {
      return NextResponse.json(
        { error: 'User ID and email are required' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const { data: existingUser } = await supabaseServer
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (existingUser) {
      // User already exists, just return success
      return NextResponse.json({ success: true, user: existingUser });
    }

    // Create new user with default role
    const { data: newUser, error } = await supabaseServer
      .from('users')
      .insert({
        id: userId,
        email: email,
        full_name: fullName,
        role: 'user', // Default role
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating user:', error);
      return NextResponse.json(
        { error: 'Failed to create user account' },
        { status: 500 }
      );
    }

    // Create a personal organization for the user
    const { data: organization, error: orgError } = await supabaseServer
      .from('organizations')
      .insert({
        name: `${fullName || email}'s Organization`,
        created_by: userId,
      })
      .select()
      .single();

    if (orgError) {
      console.error('Error creating organization:', orgError);
      // Don't fail the request if organization creation fails
    }

    // Add user to organization as owner
    if (organization) {
      const { error: memberError } = await supabaseServer
        .from('organization_members')
        .insert({
          organization_id: organization.id,
          user_id: userId,
          role: 'owner',
        });

      if (memberError) {
        console.error('Error adding user to organization:', memberError);
      }
    }

    return NextResponse.json({
      success: true,
      user: newUser,
      organization: organization || null
    });

  } catch (error) {
    console.error('Ensure user API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
