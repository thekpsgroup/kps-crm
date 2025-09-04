import { createClient } from '@supabase/supabase-js'

// Server-side Supabase client with service role key
// This should only be used in server-side code (API routes, server components)
// Never expose the service role key to the client

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable')
}

if (!supabaseServiceKey) {
  throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable')
}

export const supabaseServer = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// User mirroring utilities
export const userMirror = {
  async ensureUserExists(userId: string, email: string) {
    const { data: existingUser } = await supabaseServer
      .from('users')
      .select('id')
      .eq('id', userId)
      .single();

    if (!existingUser) {
      const { error } = await supabaseServer
        .from('users')
        .insert({
          id: userId,
          email: email,
          created_at: new Date().toISOString()
        });

      if (error) throw error;
    }
  },

  async getUserOrganizations(userId: string) {
    const { data, error } = await supabaseServer
      .from('organization_members')
      .select(`
        organization_id,
        role,
        organizations (
          id,
          name
        )
      `)
      .eq('user_id', userId);

    if (error) throw error;
    return data;
  }
}

// Utility functions for RingCentral identity management
export const ringcentralIdentity = {
  // Upsert RingCentral identity for a user
  async upsert(userId: string, data: {
    rc_account_id?: string
    access_token?: string
    refresh_token?: string
    token_expires_at?: string
  }) {
    const { data: result, error } = await supabaseServer
      .from('ringcentral_identities')
      .upsert({
        user_id: userId,
        ...data,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      })
      .select()
      .single()

    if (error) throw error
    return result
  },

  // Get RingCentral identity for a user
  async get(userId: string) {
    const { data, error } = await supabaseServer
      .from('ringcentral_identities')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error && error.code !== 'PGRST116') throw error // PGRST116 is "not found"
    return data
  },

  // Delete RingCentral identity for a user
  async delete(userId: string) {
    const { error } = await supabaseServer
      .from('ringcentral_identities')
      .delete()
      .eq('user_id', userId)

    if (error) throw error
  },

  // Check if user has valid RingCentral connection
  async isConnected(userId: string): Promise<boolean> {
    const identity = await this.get(userId)
    if (!identity || !identity.access_token) return false

    // Check if token is expired
    if (identity.token_expires_at) {
      const expiresAt = new Date(identity.token_expires_at)
      const now = new Date()
      if (expiresAt <= now) return false
    }

    return true
  }
}

// Utility functions for call logs
export const callLogs = {
  // Insert a new call log
  async insert(data: {
    direction: 'inbound' | 'outbound'
    status?: string
    from_number?: string
    to_number?: string
    duration_seconds?: number
    recording_url?: string
    rc_call_id?: string
    matched_contact_id?: string
    matched_deal_id?: string
  }) {
    const { data: result, error } = await supabaseServer
      .from('call_logs')
      .insert([data])
      .select()
      .single()

    if (error) throw error
    return result
  },

  // Update existing call log
  async update(rcCallId: string, data: Partial<{
    status: string
    duration_seconds: number
    recording_url: string
    matched_contact_id: string
    matched_deal_id: string
  }>) {
    const { data: result, error } = await supabaseServer
      .from('call_logs')
      .update(data)
      .eq('rc_call_id', rcCallId)
      .select()
      .single()

    if (error) throw error
    return result
  }
}

// Utility functions for contacts
export const contacts = {
  // Find contact by phone number
  async findByPhone(phone: string) {
    // Normalize phone number (remove spaces, dashes, etc.)
    const normalizedPhone = phone.replace(/[\s\-\(\)]/g, '')

    const { data, error } = await supabaseServer
      .from('contacts')
      .select(`
        *,
        company:companies(*)
      `)
      .or(`phone.eq.${normalizedPhone},phone.eq.+${normalizedPhone},phone.eq.${phone}`)

    if (error) throw error
    return data?.[0] || null
  }
}

// Utility functions for deals
export const deals = {
  // Find recent active deals for a contact
  async findActiveByContact(contactId: string) {
    const { data, error } = await supabaseServer
      .from('deals')
      .select(`
        *,
        stage:deal_stages(*)
      `)
      .eq('contact_id', contactId)
      .neq('stage.name', 'Won')
      .neq('stage.name', 'Lost')
      .order('created_at', { ascending: false })
      .limit(5)

    if (error) throw error
    return data
  }
}
