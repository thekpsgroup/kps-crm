import { createBrowserClient } from '@supabase/ssr';
import type { User, Session } from '@supabase/supabase-js';

let supabase: ReturnType<typeof createBrowserClient>;

export function getSupabaseClient() {
  if (!supabase) {
    supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  return supabase;
}

export async function getCurrentUser(): Promise<User | null> {
  try {
    const supabase = getSupabaseClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error) {
      console.error('Error getting current user:', error);
      return null;
    }

    return user;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}

export async function getCurrentSession(): Promise<Session | null> {
  try {
    const supabase = getSupabaseClient();
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error) {
      console.error('Error getting current session:', error);
      return null;
    }

    return session;
  } catch (error) {
    console.error('Error getting current session:', error);
    return null;
  }
}

export async function signOut(): Promise<void> {
  try {
    const supabase = getSupabaseClient();
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error('Error signing out:', error);
    }
  } catch (error) {
    console.error('Error signing out:', error);
  }
}

export function onAuthStateChange(callback: (user: User | null) => void) {
  const supabase = getSupabaseClient();
  return supabase.auth.onAuthStateChange((_event, session) => {
    callback(session?.user ?? null);
  });
}

// Helper function to get user profile with role
export async function getCurrentUserProfile() {
  try {
    const user = await getCurrentUser();
    if (!user) return null;

    // Get user profile from our database
    const supabase = getSupabaseClient();
    const { data: profile, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) {
      console.error('Error getting user profile:', error);
      return null;
    }

    return {
      ...user,
      profile: profile
    };
  } catch (error) {
    console.error('Error getting user profile:', error);
    return null;
  }
}
