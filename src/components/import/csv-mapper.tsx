'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, MapPin } from 'lucide-react';

interface CsvMapperProps {
  headers: string[];
  onMappingComplete: (mapping: Record<string, string>) => void;
  isProcessing: boolean;
}

const CONTACT_FIELDS = [
  { key: 'first_name', label: 'First Name', required: true },
  { key: 'last_name', label: 'Last Name', required: true },
  { key: 'email', label: 'Email', required: false },
  { key: 'phone', label: 'Phone', required: false },
  { key: 'title', label: 'Job Title', required: false },
  { key: 'company', label: 'Company Name', required: false },
];

export function CsvMapper({ headers, onMappingComplete, isProcessing }: CsvMapperProps) {
  const [mapping, setMapping] = useState<Record<string, string>>({});

  const handleFieldMapping = (fieldKey: string, csvColumn: string) => {
    setMapping(prev => ({
      ...prev,
      [fieldKey]: csvColumn,
    }));
  };

  const handleComplete = () => {
    // Validate required fields
    const requiredFields = CONTACT_FIELDS.filter(field => field.required);
    const missingFields = requiredFields.filter(field => !mapping[field.key]);

    if (missingFields.length > 0) {
      alert(`Please map the following required fields: ${missingFields.map(f => f.label).join(', ')}`);
      return;
    }

    onMappingComplete(mapping);
  };

  const getMappedColumns = () => {
    return Object.values(mapping).filter(Boolean);
  };

  const getUnmappedColumns = () => {
    return headers.filter(header => !getMappedColumns().includes(header));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="w-5 h-5" />
          Map CSV Columns
        </CardTitle>
        <CardDescription>
          Map your CSV columns to contact fields. Required fields are marked with an asterisk (*).
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Field Mapping */}
          <div className="grid gap-4">
            {CONTACT_FIELDS.map(field => (
              <div key={field.key} className="flex items-center gap-4">
                <div className="w-32 flex-shrink-0">
                  <label className="text-sm font-medium">
                    {field.label}
                    {field.required && <span className="text-red-500 ml-1">*</span>}
                  </label>
                </div>

                <ArrowRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />

                <div className="flex-1">
                  <Select
                    value={mapping[field.key] || ''}
                    onValueChange={(value) => handleFieldMapping(field.key, value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select column..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Don't import</SelectItem>
                      {headers.map(header => (
                        <SelectItem key={header} value={header}>
                          {header}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ))}
          </div>

          {/* Mapping Summary */}
          <div className="border-t pt-6">
            <h3 className="font-medium mb-3">Mapping Summary</h3>
            <div className="flex flex-wrap gap-2">
              {getMappedColumns().map(column => (
                <Badge key={column} variant="default">
                  {column}
                </Badge>
              ))}
              {getUnmappedColumns().map(column => (
                <Badge key={column} variant="secondary">
                  {column} (unmapped)
                </Badge>
              ))}
            </div>
            {getUnmappedColumns().length > 0 && (
              <p className="text-sm text-muted-foreground mt-2">
                Unmapped columns will be ignored during import.
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end pt-4">
            <Button
              onClick={handleComplete}
              disabled={isProcessing}
            >
              {isProcessing ? 'Processing...' : 'Continue to Review'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
