'use server';

import { ringcentralIdentity, callLogs, contacts, deals } from './server-supabase';

const RINGCENTRAL_SERVER_URL = process.env.RINGCENTRAL_SERVER_URL || 'https://platform.ringcentral.com';
const RINGCENTRAL_CLIENT_ID = process.env.RINGCENTRAL_CLIENT_ID!;
const RINGCENTRAL_CLIENT_SECRET = process.env.RINGCENTRAL_CLIENT_SECRET!;
const RINGCENTRAL_WEBHOOK_SECRET = process.env.RINGCENTRAL_WEBHOOK_SECRET!;

interface RingCentralTokens {
  access_token: string;
  refresh_token: string;
  token_expires_at: string;
}

// Get authenticated RingCentral client for a user
export async function getClientForUser(userId: string) {
  const identity = await ringcentralIdentity.get(userId);

  if (!identity || !identity.access_token) {
    throw new Error('RingCentral not connected');
  }

  // Check if token is expired and refresh if needed
  const now = new Date();
  const expiresAt = new Date(identity.token_expires_at);

  if (expiresAt <= now) {
    console.log('RingCentral token expired, refreshing...');
    await refreshTokens(userId, identity.refresh_token);
    // Re-fetch identity after refresh
    const refreshedIdentity = await ringcentralIdentity.get(userId);
    if (!refreshedIdentity) throw new Error('Failed to refresh tokens');
    return createAuthenticatedClient(refreshedIdentity.access_token);
  }

  return createAuthenticatedClient(identity.access_token);
}

// Create authenticated fetch client
function createAuthenticatedClient(accessToken: string) {
  return {
    async request(endpoint: string, options: RequestInit = {}) {
      const url = `${RINGCENTRAL_SERVER_URL}${endpoint}`;

      const response = await fetch(url, {
        ...options,
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      // Handle 401 (token expired)
      if (response.status === 401) {
        throw new Error('TOKEN_EXPIRED');
      }

      return response;
    }
  };
}

// Refresh RingCentral tokens
async function refreshTokens(userId: string, refreshToken: string) {
  try {
    const response = await fetch(`${RINGCENTRAL_SERVER_URL}/restapi/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${RINGCENTRAL_CLIENT_ID}:${RINGCENTRAL_CLIENT_SECRET}`).toString('base64')}`,
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
    });

    if (!response.ok) {
      throw new Error(`Token refresh failed: ${response.status}`);
    }

    const data = await response.json();

    // Calculate new expiration
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + data.expires_in);

    // Update tokens in database
    await ringcentralIdentity.upsert(userId, {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      token_expires_at: expiresAt.toISOString(),
    });

    console.log('RingCentral tokens refreshed successfully');
  } catch (error) {
    console.error('Token refresh error:', error);
    // If refresh fails, we might need to disconnect the user
    // For now, just throw the error
    throw error;
  }
}

// Check if tokens are expiring soon (within 24 hours)
export async function refreshIfExpiringSoon(userId: string) {
  const identity = await ringcentralIdentity.get(userId);

  if (!identity || !identity.access_token || !identity.token_expires_at) {
    return false;
  }

  const expiresAt = new Date(identity.token_expires_at);
  const now = new Date();
  const twentyFourHoursFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  if (expiresAt <= twentyFourHoursFromNow) {
    console.log('Tokens expiring soon, refreshing...');
    await refreshTokens(userId, identity.refresh_token);
    return true;
  }

  return false;
}

// Verify webhook signature
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string = RINGCENTRAL_WEBHOOK_SECRET
): boolean {
  if (!secret) {
    console.warn('RINGCENTRAL_WEBHOOK_SECRET not configured, skipping signature verification');
    return true;
  }

  const crypto = require('crypto');
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload, 'utf8')
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(expectedSignature, 'hex')
  );
}

// RingCentral API client methods
export const ringcentralApi = {
  // Make a call
  async makeCall(userId: string, to: string, from?: string) {
    const client = await getClientForUser(userId);

    const response = await client.request('/restapi/v1.0/account/~/extension/~/ring-out', {
      method: 'POST',
      body: JSON.stringify({
        to: { phoneNumber: to },
        from: { phoneNumber: from || process.env.RINGCENTRAL_ACCOUNT_MAIN_NUMBER },
        playPrompt: true,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Call failed: ${error}`);
    }

    return await response.json();
  },

  // Get call logs
  async getCallLogs(userId: string, dateFrom?: string, dateTo?: string) {
    const client = await getClientForUser(userId);

    const params = new URLSearchParams();
    if (dateFrom) params.append('dateFrom', dateFrom);
    if (dateTo) params.append('dateTo', dateTo);

    const response = await client.request(`/restapi/v1.0/account/~/extension/~/call-log?${params}`);

    if (!response.ok) {
      throw new Error('Failed to fetch call logs');
    }

    return await response.json();
  }
};
