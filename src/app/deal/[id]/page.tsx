'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Phone, Mail, Building, ArrowLeft, Plus, Clock, CheckCircle, AlertCircle, MessageSquare, StickyNote } from 'lucide-react';
import { supabase } from '@/lib/supabase-client';
import { DealWithRelations, Activity, ActivityFormData } from '@/types/deals';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { AppShell } from '@/components/layout/app-shell';
import Link from 'next/link';

// Activity form schema
const activitySchema = z.object({
  type: z.enum(['note', 'task', 'call', 'email', 'sms']),
  summary: z.string().min(1, 'Summary is required'),
  due_at: z.string().optional(),
  done: z.boolean().optional(),
});

export default function DealDetailPage() {
  const params = useParams();
  const dealId = params.id as string;

  const [deal, setDeal] = useState<DealWithRelations | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const activityForm = useForm<ActivityFormData>({
    resolver: zodResolver(activitySchema),
    defaultValues: {
      type: 'note',
      summary: '',
      due_at: '',
      done: false,
    },
  });

  useEffect(() => {
    if (dealId) {
      loadDeal();
      loadActivities();
    }
  }, [dealId]);

  const loadDeal = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('deals')
        .select(`
          *,
          company:companies(id, name, phone, website),
          contact:contacts(id, first_name, last_name, email, phone, title),
          stage:deal_stages(id, name)
        `)
        .eq('id', dealId)
        .single();

      if (error) throw error;
      setDeal(data);
    } catch (err) {
      console.error('Error loading deal:', err);
      setError(err instanceof Error ? err.message : 'Failed to load deal');
    } finally {
      setLoading(false);
    }
  };

  const loadActivities = async () => {
    try {
      const { data, error } = await supabase
        .from('activities')
        .select('*')
        .eq('deal_id', dealId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setActivities(data || []);
    } catch (err) {
      console.error('Error loading activities:', err);
    }
  };

  const handleActivitySubmit = async (data: ActivityFormData) => {
    try {
      const activityData = {
        ...data,
        deal_id: dealId,
        contact_id: deal?.contact_id,
        due_at: data.due_at || null,
        done: data.done || false,
      };

      const { error } = await supabase
        .from('activities')
        .insert([activityData]);

      if (error) throw error;

      activityForm.reset();
      loadActivities();
    } catch (err) {
      console.error('Error creating activity:', err);
    }
  };

  const handleCall = async (phone: string) => {
    try {
      const response = await fetch('/api/ringcentral/call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: phone }),
      });

      if (!response.ok) throw new Error('Call failed');

      // Refresh activities to show the call
      loadActivities();
    } catch (err) {
      console.error('Error making call:', err);
      alert('Failed to make call');
    }
  };

  const formatCurrency = (amount: number | undefined) => {
    if (!amount) return '$0';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'call':
        return <Phone className="w-4 h-4" />;
      case 'email':
        return <Mail className="w-4 h-4" />;
      case 'note':
        return <StickyNote className="w-4 h-4" />;
      case 'task':
        return <CheckCircle className="w-4 h-4" />;
      case 'sms':
        return <MessageSquare className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading deal...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !deal) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-12">
            <div className="text-red-500 mb-4">
              <AlertCircle className="w-12 h-12 mx-auto" />
            </div>
            <h2 className="text-xl font-semibold text-foreground mb-2">Error Loading Deal</h2>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Link href="/deals">
              <Button>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Deals
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AppShell>
      <div className="p-6">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <Link href="/deals" className="inline-flex items-center text-muted-foreground hover:text-foreground mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Deals
            </Link>

            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-3xl font-bold text-foreground">{deal.title}</h1>
                <div className="flex items-center gap-4 mt-2">
                  <Badge variant="outline">{deal.stage?.name}</Badge>
                  {deal.amount && (
                    <span className="text-2xl font-bold text-primary">
                      {formatCurrency(deal.amount)}
                    </span>
                  )}
                </div>
              </div>

              {deal.contact?.phone && (
                <Button onClick={() => handleCall(deal.contact!.phone!)}>
                  <Phone className="w-4 h-4 mr-2" />
                  Call {deal.contact.first_name}
                </Button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Deal Info */}
            <div className="lg:col-span-1 space-y-6">
              {/* Contact Info */}
              {deal.contact && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      Contact
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <p className="font-medium">
                        {deal.contact.first_name} {deal.contact.last_name}
                      </p>
                      {deal.contact.title && (
                        <p className="text-sm text-muted-foreground">{deal.contact.title}</p>
                      )}
                    </div>
                    {deal.contact.email && (
                      <p className="text-sm">{deal.contact.email}</p>
                    )}
                    {deal.contact.phone && (
                      <p className="text-sm">{deal.contact.phone}</p>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Company Info */}
              {deal.company && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Building className="w-4 h-4" />
                      Company
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <p className="font-medium">{deal.company.name}</p>
                      {deal.company.website && (
                        <a
                          href={deal.company.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary hover:underline"
                        >
                          {deal.company.website}
                        </a>
                      )}
                    </div>
                    {deal.company.phone && (
                      <p className="text-sm">{deal.company.phone}</p>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Right Column - Activity Timeline & Composer */}
            <div className="lg:col-span-2 space-y-6">
              {/* Add Activity Form */}
              <Card>
                <CardHeader>
                  <CardTitle>Add Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={activityForm.handleSubmit(handleActivitySubmit)} className="space-y-4">
                    <Select
                      onValueChange={(value) => activityForm.setValue('type', value as any)}
                      defaultValue="note"
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select activity type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="note">Note</SelectItem>
                        <SelectItem value="task">Task</SelectItem>
                        <SelectItem value="call">Call</SelectItem>
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="sms">SMS</SelectItem>
                      </SelectContent>
                    </Select>

                    <Textarea
                      {...activityForm.register('summary')}
                      placeholder="Activity summary..."
                      className="min-h-[100px]"
                    />

                    {activityForm.watch('type') === 'task' && (
                      <div>
                        <label className="text-sm font-medium mb-2 block">Due Date</label>
                        <input
                          {...activityForm.register('due_at')}
                          type="datetime-local"
                          className="w-full px-3 py-2 border border-border rounded-md bg-background"
                        />
                      </div>
                    )}

                    <Button type="submit" className="w-full">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Activity
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* Activity Timeline */}
              <Card>
                <CardHeader>
                  <CardTitle>Activity Timeline</CardTitle>
                </CardHeader>
                <CardContent>
                  {activities.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No activities yet</p>
                      <p className="text-sm">Add your first activity above</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {activities.map((activity) => (
                        <div key={activity.id} className="flex gap-4 pb-4 border-b border-border last:border-b-0 last:pb-0">
                          <div className="flex-shrink-0 mt-1">
                            <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                              {getActivityIcon(activity.type)}
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium capitalize text-sm">{activity.type}</span>
                              <span className="text-xs text-muted-foreground">
                                {new Date(activity.created_at).toLocaleDateString()} at{' '}
                                {new Date(activity.created_at).toLocaleTimeString()}
                              </span>
                              {activity.done && (
                                <Badge variant="secondary" className="text-xs">
                                  Done
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-foreground mb-2">{activity.summary}</p>
                            {activity.due_at && (
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Clock className="w-3 h-3" />
                                Due: {new Date(activity.due_at).toLocaleDateString()} at{' '}
                                {new Date(activity.due_at).toLocaleTimeString()}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
