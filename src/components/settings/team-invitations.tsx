'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, Mail, Users, Copy, ExternalLink } from 'lucide-react';

interface Invitation {
  id: string;
  email: string;
  role: string;
  expires_at: string;
  created_at: string;
  invitation_url?: string;
}

export function TeamInvitations() {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('user');
  const [isInviting, setIsInviting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [isLoadingInvitations, setIsLoadingInvitations] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [lastInvitation, setLastInvitation] = useState<Invitation | null>(null);

  useEffect(() => {
    loadInvitations();
  }, []);

  const loadInvitations = async () => {
    try {
      const response = await fetch('/api/invitations/list');
      const data = await response.json();

      if (response.ok) {
        setInvitations(data.invitations || []);
      } else {
        console.error('Failed to load invitations:', data.error);
      }
    } catch (error) {
      console.error('Error loading invitations:', error);
    } finally {
      setIsLoadingInvitations(false);
    }
  };

  const handleSendInvitation = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      setMessage({ type: 'error', text: 'Email is required' });
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setMessage({ type: 'error', text: 'Please enter a valid email address' });
      return;
    }

    setIsInviting(true);
    setMessage(null);

    try {
      const response = await fetch('/api/invitations/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send invitation');
      }

      setMessage({ type: 'success', text: 'Invitation sent successfully!' });
      setLastInvitation(data.invitation);
      setEmail('');
      setRole('user');

      // Refresh invitations list
      loadInvitations();

    } catch (error: any) {
      console.error('Send invitation error:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to send invitation' });
    } finally {
      setIsInviting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setMessage({ type: 'success', text: 'Invitation link copied to clipboard!' });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin':
        return 'destructive';
      case 'manager':
        return 'default';
      default:
        return 'secondary';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          Team Invitations
        </CardTitle>
        <CardDescription>
          Invite new team members to join your organization
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {message && (
          <Alert className={message.type === 'error' ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}>
            {message.type === 'success' ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
            <AlertDescription>
              {message.text}
            </AlertDescription>
          </Alert>
        )}

        {/* Send Invitation Form */}
        <div className="space-y-4">
          <h4 className="font-medium">Send New Invitation</h4>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Mail className="w-4 h-4 mr-2" />
                Send Invitation
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Invite Team Member</DialogTitle>
                <DialogDescription>
                  Send an invitation to join your organization
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSendInvitation} className="space-y-4">
                <div>
                  <Label htmlFor="invite-email">Email Address</Label>
                  <Input
                    id="invite-email"
                    type="email"
                    placeholder="colleague@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="invite-role">Role</Label>
                  <Select value={role} onValueChange={setRole}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">User - Standard access</SelectItem>
                      <SelectItem value="manager">Manager - Team management</SelectItem>
                      <SelectItem value="admin">Admin - Full access</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isInviting} className="flex-1">
                    {isInviting ? 'Sending...' : 'Send Invitation'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Last Invitation Details */}
        {lastInvitation && (
          <div className="p-4 border rounded-lg bg-muted/50">
            <h4 className="font-medium mb-2">Last Invitation Sent</h4>
            <div className="space-y-2 text-sm">
              <p><strong>Email:</strong> {lastInvitation.email}</p>
              <p><strong>Role:</strong> <Badge variant={getRoleBadgeVariant(lastInvitation.role)}>{lastInvitation.role}</Badge></p>
              <p><strong>Expires:</strong> {formatDate(lastInvitation.expires_at)}</p>
              {lastInvitation.invitation_url && (
                <div className="flex items-center gap-2 mt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(lastInvitation.invitation_url!)}
                  >
                    <Copy className="w-3 h-3 mr-1" />
                    Copy Link
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.open(lastInvitation.invitation_url, '_blank')}
                  >
                    <ExternalLink className="w-3 h-3 mr-1" />
                    Open Link
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Pending Invitations */}
        <div className="space-y-4">
          <h4 className="font-medium">Pending Invitations</h4>

          {isLoadingInvitations ? (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
              <p className="text-sm text-muted-foreground mt-2">Loading invitations...</p>
            </div>
          ) : invitations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Mail className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No pending invitations</p>
              <p className="text-xs mt-1">Send your first invitation to get started</p>
            </div>
          ) : (
            <div className="space-y-3">
              {invitations.map((invitation) => (
                <div key={invitation.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{invitation.email}</span>
                      <Badge variant={getRoleBadgeVariant(invitation.role)} className="text-xs">
                        {invitation.role}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Sent {formatDate(invitation.created_at)} • Expires {formatDate(invitation.expires_at)}
                    </p>
                  </div>
                  {invitation.invitation_url && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyToClipboard(invitation.invitation_url!)}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
