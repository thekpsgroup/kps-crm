import { NextRequest, NextResponse } from 'next/server'
import { ringcentralIdentity, callLogs, contacts, deals } from '@/lib/server-supabase'

// This is an API route, not a server action
export const runtime = 'nodejs'

const RINGCENTRAL_SERVER_URL = process.env.RINGCENTRAL_SERVER_URL || 'https://platform.ringcentral.com'
const RINGCENTRAL_ACCOUNT_MAIN_NUMBER = process.env.RINGCENTRAL_ACCOUNT_MAIN_NUMBER!

export async function POST(request: NextRequest) {
  try {
    const { to } = await request.json()

    if (!to) {
      return NextResponse.json({ error: 'Phone number is required' }, { status: 400 })
    }

    // TODO: In a real app, you'd get the user ID from authentication
    // For now, we'll use a demo user ID
    const demoUserId = '00000000-0000-0000-0000-000000000001'

    // Check if user has RingCentral connection
    const isConnected = await ringcentralIdentity.isConnected(demoUserId)
    if (!isConnected) {
      return NextResponse.json({ error: 'RingCentral not connected' }, { status: 403 })
    }

    // Get user's RingCentral tokens
    const identity = await ringcentralIdentity.get(demoUserId)
    if (!identity) {
      return NextResponse.json({ error: 'RingCentral identity not found' }, { status: 403 })
    }

    // Validate main number
    if (!RINGCENTRAL_ACCOUNT_MAIN_NUMBER) {
      return NextResponse.json({ error: 'Main number not configured' }, { status: 500 })
    }

    // Format phone numbers (ensure they have country code)
    const fromNumber = RINGCENTRAL_ACCOUNT_MAIN_NUMBER.startsWith('+')
      ? RINGCENTRAL_ACCOUNT_MAIN_NUMBER
      : `+${RINGCENTRAL_ACCOUNT_MAIN_NUMBER}`

    const toNumber = to.startsWith('+') ? to : `+${to}`

    // Make the call using RingCentral API
    const callResponse = await fetch(`${RINGCENTRAL_SERVER_URL}/restapi/v1.0/account/~/extension/~/ring-out`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${identity.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: { phoneNumber: toNumber },
        from: { phoneNumber: fromNumber },
        playPrompt: true,
      }),
    })

    if (!callResponse.ok) {
      const errorData = await callResponse.text()
      console.error('RingCentral call failed:', callResponse.status, errorData)

      // Try to refresh token if unauthorized
      if (callResponse.status === 401) {
        // TODO: Implement token refresh logic
        return NextResponse.json({ error: 'Authentication failed' }, { status: 401 })
      }

      return NextResponse.json({ error: 'Call failed' }, { status: 500 })
    }

    const callData = await callResponse.json()

    // Try to match contact by phone number
    let matchedContact = null
    let matchedDeal = null

    try {
      matchedContact = await contacts.findByPhone(toNumber)
      if (matchedContact) {
        // Find active deals for this contact
        const activeDeals = await deals.findActiveByContact(matchedContact.id)
        matchedDeal = activeDeals[0] || null // Take the most recent active deal
      }
    } catch (error) {
      console.warn('Failed to match contact/deal:', error)
    }

    // Log the call
    try {
      await callLogs.insert({
        direction: 'outbound',
        status: 'initiated', // Will be updated by webhook when call completes
        from_number: fromNumber,
        to_number: toNumber,
        rc_call_id: callData.id,
        matched_contact_id: matchedContact?.id,
        matched_deal_id: matchedDeal?.id,
      })
    } catch (error) {
      console.error('Failed to log call:', error)
      // Don't fail the request if logging fails
    }

    return NextResponse.json({
      success: true,
      callId: callData.id,
      message: 'Call initiated successfully',
    })

  } catch (error) {
    console.error('Call API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
