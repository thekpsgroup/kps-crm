'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Phone, PhoneOff, CheckCircle, AlertCircle, Loader2, User, Settings as SettingsIcon } from 'lucide-react';
import { ringcentralIdentity } from '@/lib/server-supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AppShell } from '@/components/layout/app-shell';
import Link from 'next/link';

// Note: In a real app, this would be called from a server component or API route
// For demo purposes, we'll simulate the API call
async function checkConnection(): Promise<{ connected: boolean; accountId?: string; extension?: string }> {
  // TODO: Replace with actual API call to check user connection
  // For now, return mock data
  return { connected: false };
}

async function disconnectRingCentral(): Promise<{ success: boolean }> {
  try {
    const response = await fetch('/api/ringcentral/disconnect', {
      method: 'POST',
    });

    if (!response.ok) throw new Error('Disconnect failed');
    return await response.json();
  } catch (error) {
    console.error('Disconnect error:', error);
    throw error;
  }
}

export default function SettingsPage() {
  const searchParams = useSearchParams();
  const [isConnected, setIsConnected] = useState(false);
  const [accountInfo, setAccountInfo] = useState<{ accountId?: string; extension?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadConnectionStatus();

    // Check for URL parameters (from OAuth callback)
    const rcStatus = searchParams.get('rc');
    const error = searchParams.get('error');
    const errorDesc = searchParams.get('error_description');

    if (rcStatus === 'connected') {
      setMessage({ type: 'success', text: 'RingCentral connected successfully!' });
      loadConnectionStatus();
    } else if (error) {
      let errorMessage = 'Failed to connect to RingCentral';
      if (error === 'access_denied') {
        errorMessage = 'RingCentral connection was cancelled';
      } else if (errorDesc) {
        errorMessage = errorDesc;
      }
      setMessage({ type: 'error', text: errorMessage });
    }
  }, [searchParams]);

  const loadConnectionStatus = async () => {
    try {
      const status = await checkConnection();
      setIsConnected(status.connected);
      setAccountInfo(status.connected ? { accountId: status.accountId, extension: status.extension } : null);
    } catch (error) {
      console.error('Error checking connection:', error);
      setIsConnected(false);
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      setDisconnecting(true);
      await disconnectRingCentral();
      setIsConnected(false);
      setAccountInfo(null);
      setMessage({ type: 'success', text: 'RingCentral disconnected successfully' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to disconnect RingCentral' });
    } finally {
      setDisconnecting(false);
    }
  };

  const handleConnect = () => {
    window.location.href = '/api/ringcentral/auth';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading settings...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AppShell>
      <div className="p-6">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-foreground">Settings</h1>
                <p className="text-muted-foreground mt-1">
                  Manage your account and integrations
                </p>
              </div>
              <Link
                href="/"
                className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                ← Back to Home
              </Link>
            </div>
          </div>

          {/* Status Message */}
          {message && (
            <Alert className={`mb-6 ${message.type === 'error' ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}`}>
              {message.type === 'success' ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-600" />
              )}
              <AlertDescription className={message.type === 'success' ? 'text-green-800' : 'text-red-800'}>
                {message.text}
              </AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Telephony Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Phone className="w-5 h-5" />
                  Telephony
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {isConnected ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle className="w-5 h-5" />
                      <span className="font-medium">Connected to RingCentral</span>
                    </div>

                    {accountInfo && (
                      <div className="text-sm text-muted-foreground space-y-1">
                        {accountInfo.accountId && (
                          <p>Account ID: {accountInfo.accountId.replace(/(\d{3})\d{6}(\d{4})/, '$1***$2')}</p>
                        )}
                        {accountInfo.extension && (
                          <p>Extension: {accountInfo.extension}</p>
                        )}
                      </div>
                    )}

                    <Button
                      onClick={handleDisconnect}
                      disabled={disconnecting}
                      variant="outline"
                      className="w-full"
                    >
                      {disconnecting ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Disconnecting...
                        </>
                      ) : (
                        <>
                          <PhoneOff className="w-4 h-4 mr-2" />
                          Disconnect RingCentral
                        </>
                      )}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <PhoneOff className="w-5 h-5" />
                      <span>Not connected to RingCentral</span>
                    </div>

                    <p className="text-sm text-muted-foreground">
                      Connect your RingCentral account to enable click-to-call functionality and call logging.
                    </p>

                    <Button onClick={handleConnect} className="w-full">
                      <Phone className="w-4 h-4 mr-2" />
                      Connect RingCentral
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Account Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Account
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-sm text-muted-foreground">
                  <p>Account management features coming soon...</p>
                  <p className="mt-2">This will include:</p>
                  <ul className="mt-1 ml-4 list-disc space-y-1">
                    <li>Profile information</li>
                    <li>Password settings</li>
                    <li>Notification preferences</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Additional Settings */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <SettingsIcon className="w-5 h-5" />
                System Settings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">
                <p>Additional system configuration options will be available here.</p>
                <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 border border-border rounded-lg">
                    <h4 className="font-medium mb-2">Data Export</h4>
                    <p className="text-xs">Export your CRM data</p>
                  </div>
                  <div className="text-center p-4 border border-border rounded-lg">
                    <h4 className="font-medium mb-2">API Access</h4>
                    <p className="text-xs">Manage API keys</p>
                  </div>
                  <div className="text-center p-4 border border-border rounded-lg">
                    <h4 className="font-medium mb-2">Webhooks</h4>
                    <p className="text-xs">Configure integrations</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
