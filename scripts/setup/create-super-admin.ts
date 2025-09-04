#!/usr/bin/env tsx

/**
 * Setup script to create a super admin user
 * Run with: npx tsx scripts/setup/create-super-admin.ts
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables:');
  console.error('- NEXT_PUBLIC_SUPABASE_URL');
  console.error('- SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createSuperAdmin() {
  console.log('🚀 Creating super admin user...');

  try {
    // Create the user account
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: 'karson@kpsgroup.com',
      password: 'KPSadmin',
      email_confirm: true,
      user_metadata: {
        full_name: 'Karson Admin',
      },
    });

    if (authError) {
      if (authError.message.includes('already registered')) {
        console.log('ℹ️ User already exists, updating role...');
        // Get existing user
        const { data: existingUsers } = await supabase
          .from('users')
          .select('*')
          .eq('email', 'karson@kpsgroup.com')
          .single();

        if (existingUsers) {
          // Update role to admin
          const { error: updateError } = await supabase
            .from('users')
            .update({ role: 'admin' })
            .eq('id', existingUsers.id);

          if (updateError) {
            console.error('❌ Error updating user role:', updateError);
            return;
          }

          console.log('✅ Super admin role updated successfully!');
          console.log('👤 User ID:', existingUsers.id);
          return;
        }
      }
      console.error('❌ Error creating user:', authError);
      return;
    }

    if (!authUser.user) {
      console.error('❌ No user data returned');
      return;
    }

    console.log('✅ User account created:', authUser.user.id);

    // Create user profile in our users table
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .upsert({
        id: authUser.user.id,
        email: authUser.user.email,
        full_name: authUser.user.user_metadata?.full_name || 'Karson Admin',
        role: 'admin',
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (profileError) {
      console.error('❌ Error creating user profile:', profileError);
      return;
    }

    console.log('✅ User profile created with admin role');

    // Create organization for the admin
    const { data: organization, error: orgError } = await supabase
      .from('organizations')
      .insert({
        name: 'KPS Group',
        created_by: authUser.user.id,
      })
      .select()
      .single();

    if (orgError) {
      console.error('❌ Error creating organization:', orgError);
      return;
    }

    console.log('✅ Organization created:', organization.name);

    // Add admin to organization as owner
    const { error: memberError } = await supabase
      .from('organization_members')
      .insert({
        organization_id: organization.id,
        user_id: authUser.user.id,
        role: 'owner',
      });

    if (memberError) {
      console.error('❌ Error adding admin to organization:', memberError);
      return;
    }

    console.log('✅ Admin added to organization as owner');

    // Success message
    console.log('\n🎉 Super admin setup complete!');
    console.log('📧 Email: karson@kpsgroup.com');
    console.log('🔑 Password: KPSadmin');
    console.log('👑 Role: admin');
    console.log('🏢 Organization: KPS Group');
    console.log('\n💡 You can now login and invite team members!');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the setup
createSuperAdmin();
