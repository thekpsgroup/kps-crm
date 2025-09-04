'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Phone, PhoneOff, CheckCircle, AlertCircle, Loader2, User, Settings as SettingsIcon } from 'lucide-react';
import { ringcentralIdentity } from '@/lib/server-supabase';
import { getCurrentUser } from '@/lib/session';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AppShell } from '@/components/layout/app-shell';
import { RoleSelector } from '@/components/auth/role-selector';
import { TeamInvitations } from '@/components/settings/team-invitations';
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

async function initiateRingCentralAuth(): Promise<{ url?: string; error?: string }> {
  try {
    const response = await fetch('/api/ringcentral/auth');
    if (!response.ok) throw new Error('Auth initiation failed');
    return await response.json();
  } catch (error) {
    console.error('Auth initiation error:', error);
    return { error: 'Failed to initiate RingCentral authentication' };
  }
}

export default function SettingsContent() {
  const searchParams = useSearchParams();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [ringCentralStatus, setRingCentralStatus] = useState<{
    connected: boolean;
    accountId?: string;
    extension?: string;
  } | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadCurrentUser();
    checkRingCentralConnection();

    // Check for OAuth callback parameters
    const rc = searchParams.get('rc');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    if (rc === 'connected') {
      setMessage({ type: 'success', text: 'RingCentral connected successfully!' });
      checkRingCentralConnection();
    } else if (error) {
      setMessage({
        type: 'error',
        text: errorDescription || 'RingCentral connection failed'
      });
    }
  }, [searchParams]);

  const loadCurrentUser = async () => {
    try {
      const user = await getCurrentUser();
      setCurrentUser(user);
    } catch (error) {
      console.error('Failed to load current user:', error);
    }
  };

  const checkRingCentralConnection = async () => {
    try {
      const status = await checkConnection();
      setRingCentralStatus(status);
    } catch (error) {
      console.error('Failed to check RingCentral connection:', error);
      setRingCentralStatus({ connected: false });
    }
  };

  const handleConnectRingCentral = async () => {
    setIsConnecting(true);
    setMessage(null);

    try {
      const result = await initiateRingCentralAuth();

      if (result.url) {
        // Redirect to RingCentral OAuth
        window.location.href = result.url;
      } else if (result.error) {
        setMessage({ type: 'error', text: result.error });
      }
    } catch (error) {
      console.error('Connect error:', error);
      setMessage({ type: 'error', text: 'Failed to connect to RingCentral' });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnectRingCentral = async () => {
    setIsDisconnecting(true);
    setMessage(null);

    try {
      await disconnectRingCentral();
      setRingCentralStatus({ connected: false });
      setMessage({ type: 'success', text: 'RingCentral disconnected successfully' });
    } catch (error) {
      console.error('Disconnect error:', error);
      setMessage({ type: 'error', text: 'Failed to disconnect RingCentral' });
    } finally {
      setIsDisconnecting(false);
    }
  };

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground">Manage your account and integrations</p>
        </div>

        {message && (
          <Alert className={message.type === 'error' ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}>
            {message.type === 'success' ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
            <AlertDescription>
              {message.text}
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          {/* RingCentral Integration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="w-5 h-5" />
                RingCentral Integration
              </CardTitle>
              <CardDescription>
                Connect your RingCentral account to enable click-to-call functionality
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  {ringCentralStatus?.connected ? (
                    <>
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      <span className="text-sm text-green-600 font-medium">Connected</span>
                      {ringCentralStatus.accountId && (
                        <span className="text-xs text-muted-foreground">
                          Account: {ringCentralStatus.accountId}
                        </span>
                      )}
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-5 h-5 text-red-500" />
                      <span className="text-sm text-red-600">Not Connected</span>
                    </>
                  )}
                </div>

                {ringCentralStatus?.connected ? (
                  <Button
                    onClick={handleDisconnectRingCentral}
                    disabled={isDisconnecting}
                    variant="outline"
                    className="w-full"
                  >
                    {isDisconnecting ? (
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
                ) : (
                  <Button
                    onClick={handleConnectRingCentral}
                    disabled={isConnecting}
                    className="w-full"
                  >
                    {isConnecting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Connecting...
                      </>
                    ) : (
                      <>
                        <Phone className="w-4 h-4 mr-2" />
                        Connect RingCentral
                      </>
                    )}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* User Profile */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                User Profile
              </CardTitle>
              <CardDescription>
                View and manage your account information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {currentUser ? (
                  <div className="space-y-2">
                    <div>
                      <label className="text-sm font-medium">Email</label>
                      <p className="text-sm text-muted-foreground">{currentUser.email}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Name</label>
                      <p className="text-sm text-muted-foreground">{currentUser.user_metadata?.full_name || 'Not set'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Role</label>
                      <p className="text-sm text-muted-foreground capitalize">{currentUser.role || 'user'}</p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Loading user information...</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Role Management */}
          {currentUser && (
            <div className="md:col-span-1">
              <RoleSelector
                currentUser={currentUser}
                onRoleUpdate={() => loadCurrentUser()}
              />
            </div>
          )}

          {/* Team Invitations */}
          {currentUser && currentUser.role === 'admin' && (
            <div className="md:col-span-2">
              <TeamInvitations />
            </div>
          )}
        </div>

        {/* Additional Settings */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <SettingsIcon className="w-5 h-5" />
              Additional Settings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Data Management</h4>
                <p className="text-sm text-muted-foreground mb-3">
                  Export your data or manage your account settings.
                </p>
                <div className="flex gap-3">
                  <Button variant="outline" size="sm">
                    Export Data
                  </Button>
                  <Button variant="outline" size="sm">
                    Privacy Settings
                  </Button>
                </div>
              </div>

              <div className="pt-4 border-t">
                <h4 className="font-medium mb-2">Support</h4>
                <p className="text-sm text-muted-foreground mb-3">
                  Need help? Contact our support team.
                </p>
                <Button variant="outline" size="sm" asChild>
                  <Link href="mailto:support@kpsgroup.com">
                    Contact Support
                  </Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
