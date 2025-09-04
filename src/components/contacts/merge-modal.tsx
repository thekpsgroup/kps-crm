'use client';

import { useState } from 'react';
import { Contact, Company } from '@/types/deals';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { AlertTriangle, Users } from 'lucide-react';

interface MergeModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingContact: (Contact & { company?: Company }) | null;
  newContactData: {
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string;
    title?: string;
    company_id?: string;
  };
  onMerge: (mergedData: any) => void;
  onSkip: () => void;
}

export function MergeModal({
  isOpen,
  onClose,
  existingContact,
  newContactData,
  onMerge,
  onSkip
}: MergeModalProps) {
  const [selectedFields, setSelectedFields] = useState<Record<string, 'existing' | 'new'>>({});

  if (!existingContact) return null;

  const fields = [
    { key: 'first_name', label: 'First Name', existing: existingContact.first_name, new: newContactData.first_name },
    { key: 'last_name', label: 'Last Name', existing: existingContact.last_name, new: newContactData.last_name },
    { key: 'email', label: 'Email', existing: existingContact.email, new: newContactData.email },
    { key: 'phone', label: 'Phone', existing: existingContact.phone, new: newContactData.phone },
    { key: 'title', label: 'Title', existing: existingContact.title, new: newContactData.title },
  ];

  const handleMerge = () => {
    const mergedData: any = {};

    fields.forEach(field => {
      const selection = selectedFields[field.key];
      if (selection === 'existing') {
        mergedData[field.key] = existingContact[field.key as keyof Contact];
      } else if (selection === 'new') {
        mergedData[field.key] = newContactData[field.key as keyof typeof newContactData];
      } else {
        // Default to existing if no selection
        mergedData[field.key] = existingContact[field.key as keyof Contact] || newContactData[field.key as keyof typeof newContactData];
      }
    });

    // Handle company separately
    if (selectedFields.company_id === 'existing') {
      mergedData.company_id = existingContact.company_id;
    } else if (selectedFields.company_id === 'new') {
      mergedData.company_id = newContactData.company_id;
    } else {
      mergedData.company_id = existingContact.company_id || newContactData.company_id;
    }

    onMerge(mergedData);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            Duplicate Contact Found
          </DialogTitle>
          <DialogDescription>
            We found an existing contact with the same phone number. Choose which information to keep.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            {/* Existing Contact */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Existing Contact</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="font-medium">
                  {existingContact.first_name} {existingContact.last_name}
                </div>
                {existingContact.email && (
                  <div className="text-sm text-muted-foreground">{existingContact.email}</div>
                )}
                {existingContact.phone && (
                  <div className="text-sm text-muted-foreground">{existingContact.phone}</div>
                )}
                {existingContact.title && (
                  <div className="text-sm text-muted-foreground">{existingContact.title}</div>
                )}
                {existingContact.company && (
                  <Badge variant="secondary" className="text-xs">
                    {existingContact.company.name}
                  </Badge>
                )}
              </CardContent>
            </Card>

            {/* New Contact */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">New Contact Data</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="font-medium">
                  {newContactData.first_name} {newContactData.last_name}
                </div>
                {newContactData.email && (
                  <div className="text-sm text-muted-foreground">{newContactData.email}</div>
                )}
                {newContactData.phone && (
                  <div className="text-sm text-muted-foreground">{newContactData.phone}</div>
                )}
                {newContactData.title && (
                  <div className="text-sm text-muted-foreground">{newContactData.title}</div>
                )}
                {newContactData.company_id && (
                  <Badge variant="outline" className="text-xs">
                    New Company
                  </Badge>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Field Selection */}
          <div className="space-y-4">
            <h3 className="font-medium">Choose which data to keep:</h3>

            {fields.map(field => {
              const hasConflict = field.existing && field.new && field.existing !== field.new;

              if (!hasConflict) {
                return (
                  <div key={field.key} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div>
                      <span className="font-medium">{field.label}:</span>
                      <span className="ml-2 text-muted-foreground">
                        {field.existing || field.new || 'Not provided'}
                      </span>
                    </div>
                    <Badge variant="secondary">No conflict</Badge>
                  </div>
                );
              }

              return (
                <div key={field.key} className="p-3 border rounded-lg">
                  <div className="font-medium mb-2">{field.label}</div>
                  <RadioGroup
                    value={selectedFields[field.key] || 'existing'}
                    onValueChange={(value) => setSelectedFields(prev => ({ ...prev, [field.key]: value }))}
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="existing" id={`${field.key}-existing`} />
                      <Label htmlFor={`${field.key}-existing`} className="flex-1">
                        Keep existing: <strong>{field.existing}</strong>
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="new" id={`${field.key}-new`} />
                      <Label htmlFor={`${field.key}-new`} className="flex-1">
                        Use new: <strong>{field.new}</strong>
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
              );
            })}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={onSkip}>
              Skip (Create Duplicate)
            </Button>
            <Button onClick={handleMerge}>
              <Users className="w-4 h-4 mr-2" />
              Merge Contacts
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
