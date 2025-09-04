'use client';

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { Contact, Company } from '@/types/deals';
import { useActiveOrgId } from '@/store/org';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Phone, PhoneOff, User, Building, X } from 'lucide-react';
import Link from 'next/link';

interface IncomingCall {
  id: string;
  direction: string;
  from_number: string;
  to_number: string;
  status: string;
  matched_contact?: Contact & { company?: Company };
}

export function CallPop() {
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const activeOrgId = useActiveOrgId();

  useEffect(() => {
    if (!activeOrgId) return;

    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Subscribe to call logs for incoming calls
    const channel = supabase
      .channel('call-logs')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'call_logs',
          filter: `organization_id=eq.${activeOrgId}`,
        },
        (payload) => {
          const callData = payload.new;

          // Only show popup for inbound calls
          if (callData.direction === 'inbound' && callData.status === 'ringing') {
            setIncomingCall({
              id: callData.id,
              direction: callData.direction,
              from_number: callData.from_number,
              to_number: callData.to_number,
              status: callData.status,
              matched_contact: callData.matched_contact_id ? {
                id: callData.matched_contact_id,
                first_name: 'Loading...',
                last_name: '',
                // We'll need to fetch the actual contact data
              } : undefined,
            });
            setIsVisible(true);

            // Auto-hide after 30 seconds
            setTimeout(() => {
              setIsVisible(false);
            }, 30000);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeOrgId]);

  // Fetch contact details if we have a matched contact
  useEffect(() => {
    if (!incomingCall?.matched_contact?.id) return;

    const fetchContactDetails = async () => {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      const { data, error } = await supabase
        .from('contacts')
        .select(`
          *,
          company:companies(id, name)
        `)
        .eq('id', incomingCall.matched_contact!.id)
        .single();

      if (!error && data) {
        setIncomingCall(prev => prev ? {
          ...prev,
          matched_contact: data
        } : null);
      }
    };

    fetchContactDetails();
  }, [incomingCall?.matched_contact?.id]);

  const handleDismiss = () => {
    setIsVisible(false);
  };

  const handleCallAction = async (action: 'answer' | 'decline') => {
    // Here you could integrate with RingCentral to answer/decline the call
    // For now, just dismiss the popup
    setIsVisible(false);

    if (action === 'answer' && incomingCall?.matched_contact) {
      // Could navigate to contact page or deal page
      // window.location.href = `/contacts/${incomingCall.matched_contact.id}`;
    }
  };

  if (!isVisible || !incomingCall) return null;

  const callerName = incomingCall.matched_contact
    ? `${incomingCall.matched_contact.first_name} ${incomingCall.matched_contact.last_name || ''}`.trim()
    : 'Unknown Caller';

  const callerNumber = incomingCall.from_number;

  return (
    <div className="fixed top-4 right-4 z-50 w-96 animate-in slide-in-from-right-2">
      <Card className="shadow-lg border-2 border-blue-200">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <CardTitle className="text-lg">Incoming Call</CardTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDismiss}
              className="h-6 w-6 p-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Caller Info */}
          <div className="text-center space-y-2">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
              <User className="w-8 h-8 text-blue-600" />
            </div>

            <div>
              <h3 className="font-semibold text-lg">{callerName}</h3>
              <p className="text-muted-foreground">{callerNumber}</p>
            </div>

            {incomingCall.matched_contact?.company && (
              <div className="flex items-center justify-center gap-2">
                <Building className="w-4 h-4 text-muted-foreground" />
                <Badge variant="secondary">
                  {incomingCall.matched_contact.company.name}
                </Badge>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              onClick={() => handleCallAction('decline')}
              variant="outline"
              className="flex-1"
            >
              <PhoneOff className="w-4 h-4 mr-2" />
              Decline
            </Button>
            <Button
              onClick={() => handleCallAction('answer')}
              className="flex-1"
            >
              <Phone className="w-4 h-4 mr-2" />
              Answer
            </Button>
          </div>

          {/* Quick Actions */}
          {incomingCall.matched_contact && (
            <div className="pt-3 border-t">
              <Link href={`/contacts/${incomingCall.matched_contact.id}`}>
                <Button variant="ghost" size="sm" className="w-full">
                  View Contact
                </Button>
              </Link>
            </div>
          )}

          {!incomingCall.matched_contact && (
            <div className="pt-3 border-t">
              <Link href={`/contacts?phone=${encodeURIComponent(callerNumber)}`}>
                <Button variant="ghost" size="sm" className="w-full">
                  Create Contact
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
