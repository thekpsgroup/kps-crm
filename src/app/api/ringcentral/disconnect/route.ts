import { NextRequest, NextResponse } from 'next/server'
import { ringcentralIdentity } from '@/lib/server-supabase'

// This is an API route, not a server action
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    // TODO: In a real app, you'd get the user ID from authentication
    // For now, we'll use a demo user ID
    const demoUserId = '00000000-0000-0000-0000-000000000001'

    // Remove RingCentral identity from database
    await ringcentralIdentity.delete(demoUserId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('RingCentral disconnect error:', error)
    return NextResponse.json(
      { error: 'Failed to disconnect RingCentral' },
      { status: 500 }
    )
  }
}
