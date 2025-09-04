'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Search, Plus, Phone, Edit, Mail, MessageSquare, StickyNote, CheckSquare } from 'lucide-react';
import { supabase } from '@/lib/supabase-client';
import { Contact, Company, Activity, ContactFormData } from '@/types/deals';
import { TextField } from '@/components/forms/TextField';
import { PhoneField } from '@/components/forms/PhoneField';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { AppShell } from '@/components/layout/app-shell';
import Link from 'next/link';
import { Upload } from 'lucide-react';

// Form validation schema
const contactSchema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().optional(),
  title: z.string().optional(),
  company_id: z.string().optional(),
});

const activitySchema = z.object({
  type: z.enum(['note', 'task', 'call', 'email', 'sms']),
  summary: z.string().min(1, 'Summary is required'),
  due_at: z.string().optional(),
  done: z.boolean().optional(),
});

export default function ContactsPage() {
  const [contacts, setContacts] = useState<(Contact & { company?: Company })[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedContact, setSelectedContact] = useState<(Contact & { company?: Company }) | null>(null);
  const [contactActivities, setContactActivities] = useState<Activity[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Forms
  const contactForm = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      title: '',
      company_id: '',
      tags: [],
    },
  });

  const activityForm = useForm({
    resolver: zodResolver(activitySchema),
    defaultValues: {
      type: 'note' as const,
      summary: '',
      due_at: '',
      done: false,
    },
  });

  useEffect(() => {
    loadContacts();
    loadCompanies();
  }, []);

  const loadContacts = async () => {
    try {
      const { data, error } = await supabase
        .from('contacts')
        .select(`
          *,
          company:companies(id, name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setContacts(data || []);
    } catch (error) {
      console.error('Error loading contacts:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCompanies = async () => {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .order('name');

      if (error) throw error;
      setCompanies(data || []);
    } catch (error) {
      console.error('Error loading companies:', error);
    }
  };

  const loadContactActivities = async (contactId: string) => {
    try {
      const { data, error } = await supabase
        .from('activities')
        .select('*')
        .eq('contact_id', contactId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setContactActivities(data || []);
    } catch (error) {
      console.error('Error loading activities:', error);
    }
  };

  const filteredContacts = contacts.filter((contact) => {
    const query = searchQuery.toLowerCase();
    const fullName = `${contact.first_name} ${contact.last_name}`.toLowerCase();
    return (
      fullName.includes(query) ||
      (contact.email && contact.email.toLowerCase().includes(query)) ||
      (contact.phone && contact.phone.includes(query)) ||
      (contact.company?.name && contact.company.name.toLowerCase().includes(query))
    );
  });

  const handleContactSubmit = async (data: ContactFormData) => {
    try {
      const contactData = {
        ...data,
        email: data.email || null,
        phone: data.phone || null,
        title: data.title || null,
        company_id: data.company_id || null,
      };

      const { error } = await supabase
        .from('contacts')
        .insert([contactData]);

      if (error) throw error;

      setIsAddDialogOpen(false);
      contactForm.reset();
      loadContacts();
    } catch (error) {
      console.error('Error creating contact:', error);
    }
  };

  const handleActivitySubmit = async (data: any) => {
    if (!selectedContact) return;

    try {
      const activityData = {
        ...data,
        contact_id: selectedContact.id,
        due_at: data.due_at || null,
        done: data.done || false,
      };

      const { error } = await supabase
        .from('activities')
        .insert([activityData]);

      if (error) throw error;

      activityForm.reset();
      loadContactActivities(selectedContact.id);
    } catch (error) {
      console.error('Error creating activity:', error);
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
      if (selectedContact) {
        loadContactActivities(selectedContact.id);
      }
    } catch (error) {
      console.error('Error making call:', error);
      alert('Failed to make call');
    }
  };

  const openContactDrawer = async (contact: Contact & { company?: Company }) => {
    setSelectedContact(contact);
    setIsDrawerOpen(true);
    await loadContactActivities(contact.id);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading contacts...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AppShell>
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-foreground">Contacts</h1>
                <p className="text-muted-foreground mt-1">
                  Manage your customer and prospect contacts
                </p>
              </div>
              <div className="flex gap-3">
                <Link href="/contacts/import">
                  <Button variant="outline">
                    <Upload className="w-4 h-4 mr-2" />
                    Import CSV
                  </Button>
                </Link>
                <Link
                  href="/"
                  className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  ← Back to Home
                </Link>
              </div>
            </div>
          </div>

          {/* Search and Add */}
          <div className="mb-6 flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search contacts by name, email, phone, or company..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Contact
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Add New Contact</DialogTitle>
                </DialogHeader>
                <form onSubmit={contactForm.handleSubmit(handleContactSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <TextField
                      {...contactForm.register('first_name')}
                      label="First Name"
                      error={contactForm.formState.errors.first_name}
                      required
                    />
                    <TextField
                      {...contactForm.register('last_name')}
                      label="Last Name"
                      error={contactForm.formState.errors.last_name}
                      required
                    />
                  </div>
                  <TextField
                    {...contactForm.register('email')}
                    label="Email"
                    type="email"
                    error={contactForm.formState.errors.email}
                  />
                  <PhoneField
                    {...contactForm.register('phone')}
                    label="Phone"
                    error={contactForm.formState.errors.phone}
                  />
                  <TextField
                    {...contactForm.register('title')}
                    label="Title"
                    error={contactForm.formState.errors.title}
                  />
                  <div>
                    <label className="text-sm font-medium">Company</label>
                    <Select
                      onValueChange={(value) => contactForm.setValue('company_id', value)}
                      defaultValue=""
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select a company" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">No company</SelectItem>
                        {companies.map((company) => (
                          <SelectItem key={company.id} value={company.id}>
                            {company.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button type="submit" className="w-full">
                    Create Contact
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {/* Contacts Table */}
          <div className="bg-card rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Tags</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredContacts.map((contact) => (
                  <TableRow
                    key={contact.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => openContactDrawer(contact)}
                  >
                    <TableCell className="font-medium">
                      {contact.first_name} {contact.last_name}
                    </TableCell>
                    <TableCell>{contact.company?.name || '-'}</TableCell>
                    <TableCell>{contact.email || '-'}</TableCell>
                    <TableCell>{contact.phone || '-'}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {contact.tags?.map((tag, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {contact.phone && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCall(contact.phone!);
                            }}
                          >
                            <Phone className="w-4 h-4" />
                          </Button>
                        )}
                        <Button size="sm" variant="outline">
                          <Edit className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {filteredContacts.length === 0 && (
            <div className="text-center py-12">
              <div className="text-muted-foreground mb-4">
                <Search className="w-12 h-12 mx-auto" />
              </div>
              <h2 className="text-xl font-semibold text-foreground mb-2">
                {searchQuery ? 'No contacts found' : 'No contacts yet'}
              </h2>
              <p className="text-muted-foreground">
                {searchQuery
                  ? 'Try adjusting your search terms'
                  : 'Get started by adding your first contact'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Contact Detail Drawer */}
      <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <SheetContent className="w-[400px] sm:w-[540px]">
          <SheetHeader>
            <SheetTitle>
              {selectedContact && `${selectedContact.first_name} ${selectedContact.last_name}`}
            </SheetTitle>
          </SheetHeader>

          {selectedContact && (
            <div className="mt-6 space-y-6">
              {/* Contact Info */}
              <div className="space-y-4">
                <h3 className="font-semibold">Contact Information</h3>
                <div className="space-y-2 text-sm">
                  {selectedContact.email && (
                    <p><strong>Email:</strong> {selectedContact.email}</p>
                  )}
                  {selectedContact.phone && (
                    <p><strong>Phone:</strong> {selectedContact.phone}</p>
                  )}
                  {selectedContact.title && (
                    <p><strong>Title:</strong> {selectedContact.title}</p>
                  )}
                  {selectedContact.company && (
                    <p><strong>Company:</strong> {selectedContact.company.name}</p>
                  )}
                </div>

                {selectedContact.phone && (
                  <Button
                    onClick={() => handleCall(selectedContact.phone!)}
                    className="w-full"
                  >
                    <Phone className="w-4 h-4 mr-2" />
                    Call {selectedContact.first_name}
                  </Button>
                )}
              </div>

              {/* Recent Activities */}
              <div className="space-y-4">
                <h3 className="font-semibold">Recent Activities</h3>
                {contactActivities.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No activities yet</p>
                ) : (
                  <div className="space-y-3">
                    {contactActivities.map((activity) => (
                      <div key={activity.id} className="border border-border rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-2">
                          {activity.type === 'call' && <Phone className="w-4 h-4" />}
                          {activity.type === 'email' && <Mail className="w-4 h-4" />}
                          {activity.type === 'note' && <StickyNote className="w-4 h-4" />}
                          {activity.type === 'task' && <CheckSquare className="w-4 h-4" />}
                          {activity.type === 'sms' && <MessageSquare className="w-4 h-4" />}
                          <span className="text-sm font-medium capitalize">{activity.type}</span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(activity.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-sm">{activity.summary}</p>
                        {activity.due_at && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Due: {new Date(activity.due_at).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Add Activity Form */}
              <div className="space-y-4">
                <h3 className="font-semibold">Add Activity</h3>
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
                    className="min-h-[80px]"
                  />

                  {activityForm.watch('type') === 'task' && (
                    <Input
                      {...activityForm.register('due_at')}
                      type="datetime-local"
                      placeholder="Due date"
                    />
                  )}

                  <Button type="submit" className="w-full">
                    Add Activity
                  </Button>
                </form>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </AppShell>
  );
}
