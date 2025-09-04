import { NextRequest, NextResponse } from 'next/server'

const RINGCENTRAL_SERVER_URL = process.env.RINGCENTRAL_SERVER_URL || 'https://platform.ringcentral.com'
const RINGCENTRAL_CLIENT_ID = process.env.RINGCENTRAL_CLIENT_ID!
const RINGCENTRAL_REDIRECT_URI = process.env.RINGCENTRAL_REDIRECT_URI!

export async function GET(request: NextRequest) {
  try {
    // Validate required environment variables
    if (!RINGCENTRAL_CLIENT_ID) {
      throw new Error('RINGCENTRAL_CLIENT_ID is not configured')
    }

    if (!RINGCENTRAL_REDIRECT_URI) {
      throw new Error('RINGCENTRAL_REDIRECT_URI is not configured')
    }

    // Generate state parameter for security (you should store this in session/cache)
    const state = Math.random().toString(36).substring(7)

    // RingCentral OAuth URL parameters
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: RINGCENTRAL_CLIENT_ID,
      redirect_uri: RINGCENTRAL_REDIRECT_URI,
      state: state,
      scope: 'ReadCallLog CallControl SMS', // Add scopes as needed
    })

    // Construct the full OAuth URL
    const oauthUrl = `${RINGCENTRAL_SERVER_URL}/restapi/oauth/authorize?${params.toString()}`

    // Redirect to RingCentral OAuth
    return NextResponse.redirect(oauthUrl)
  } catch (error) {
    console.error('RingCentral auth error:', error)

    // Redirect back to settings with error
    const settingsUrl = new URL('/settings', request.url)
    settingsUrl.searchParams.set('error', 'oauth_failed')
    return NextResponse.redirect(settingsUrl)
  }
}
