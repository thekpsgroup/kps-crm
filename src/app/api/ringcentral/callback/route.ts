import { NextRequest, NextResponse } from 'next/server'
import { ringcentralIdentity } from '@/lib/server-supabase'

// This is an API route, not a server action
export const runtime = 'nodejs'

const RINGCENTRAL_SERVER_URL = process.env.RINGCENTRAL_SERVER_URL || 'https://platform.ringcentral.com'
const RINGCENTRAL_CLIENT_ID = process.env.RINGCENTRAL_CLIENT_ID!
const RINGCENTRAL_CLIENT_SECRET = process.env.RINGCENTRAL_CLIENT_SECRET!
const RINGCENTRAL_REDIRECT_URI = process.env.RINGCENTRAL_REDIRECT_URI!

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')
    const errorDescription = searchParams.get('error_description')

    // Handle OAuth errors
    if (error) {
      console.error('RingCentral OAuth error:', error, errorDescription)
      const settingsUrl = new URL('/settings', process.env.NEXT_PUBLIC_APP_URL || 'https://simple-d1od43di9-thekpsgroup.vercel.app')
      settingsUrl.searchParams.set('error', error)
      if (errorDescription) {
        settingsUrl.searchParams.set('error_description', errorDescription)
      }
      return NextResponse.redirect(settingsUrl)
    }

    if (!code) {
      throw new Error('No authorization code received')
    }

    // Validate required environment variables
    if (!RINGCENTRAL_CLIENT_ID || !RINGCENTRAL_CLIENT_SECRET || !RINGCENTRAL_REDIRECT_URI) {
      throw new Error('RingCentral credentials not configured')
    }

    // Exchange authorization code for access token
    const tokenResponse = await fetch(`${RINGCENTRAL_SERVER_URL}/restapi/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${RINGCENTRAL_CLIENT_ID}:${RINGCENTRAL_CLIENT_SECRET}`).toString('base64')}`,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: RINGCENTRAL_REDIRECT_URI,
      }),
    })

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text()
      console.error('Token exchange failed:', tokenResponse.status, errorData)
      throw new Error('Failed to exchange authorization code for tokens')
    }

    const tokenData = await tokenResponse.json()

    // Calculate token expiration
    const expiresAt = new Date()
    expiresAt.setSeconds(expiresAt.getSeconds() + tokenData.expires_in)

    // TODO: In a real app, you'd get the user ID from authentication
    // For now, we'll use a demo user ID
    const demoUserId = '00000000-0000-0000-0000-000000000001'

    // Store tokens securely using service role
    await ringcentralIdentity.upsert(demoUserId, {
      rc_account_id: tokenData.owner_id, // RingCentral account ID
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      token_expires_at: expiresAt.toISOString(),
    })

    // Redirect to settings with success
    const settingsUrl = new URL('/settings', process.env.NEXT_PUBLIC_APP_URL || 'https://simple-d1od43di9-thekpsgroup.vercel.app')
    settingsUrl.searchParams.set('rc', 'connected')
    return NextResponse.redirect(settingsUrl)

  } catch (error) {
    console.error('RingCentral callback error:', error)

    // Redirect to settings with error
    const settingsUrl = new URL('/settings', process.env.NEXT_PUBLIC_APP_URL || 'https://simple-d1od43di9-thekpsgroup.vercel.app')
    settingsUrl.searchParams.set('error', 'callback_failed')
    return NextResponse.redirect(settingsUrl)
  }
}
