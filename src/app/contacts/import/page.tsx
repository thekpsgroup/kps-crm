'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Papa from 'papaparse';
import { Upload, FileText, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CsvMapper } from '@/components/import/csv-mapper';
import { supabase } from '@/lib/supabase-client';
import { normalizeE164, isValidPhone } from '@/lib/phone';
import { useActiveOrgId } from '@/store/org';
import Link from 'next/link';

interface CsvRow {
  [key: string]: string;
}

interface MappedRow {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  title?: string;
  company?: string;
  normalized_phone?: string;
  has_duplicate?: boolean;
}

interface ImportResult {
  inserted: number;
  merged: number;
  skipped: number;
  errors: string[];
}

export default function ImportContactsPage() {
  const [csvData, setCsvData] = useState<CsvRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mappedData, setMappedData] = useState<MappedRow[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const activeOrgId = useActiveOrgId();

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setError(null);

    Papa.parse<CsvRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          setError(`CSV parsing error: ${results.errors[0].message}`);
          setIsUploading(false);
          return;
        }

        setCsvData(results.data);
        setHeaders(results.meta.fields || []);
        setIsUploading(false);
      },
      error: (error) => {
        setError(`Failed to parse CSV: ${error.message}`);
        setIsUploading(false);
      },
    });
  }, []);

  const handleMappingComplete = useCallback(async (mapping: Record<string, string>) => {
    if (!activeOrgId) {
      setError('No active organization selected');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // Process each row with the mapping
      const processedData: MappedRow[] = csvData.map((row) => {
        const mappedRow: MappedRow = {};

        // Apply mapping
        Object.entries(mapping).forEach(([field, csvColumn]) => {
          if (csvColumn && row[csvColumn]) {
            mappedRow[field as keyof MappedRow] = row[csvColumn];
          }
        });

        // Normalize phone if present
        if (mappedRow.phone) {
          mappedRow.normalized_phone = normalizeE164(mappedRow.phone);
          mappedRow.phone = mappedRow.normalized_phone; // Update original phone field
        }

        return mappedRow;
      });

      // Check for duplicates
      const phoneNumbers = processedData
        .map(row => row.normalized_phone)
        .filter(Boolean);

      if (phoneNumbers.length > 0) {
        const { data: existingContacts } = await supabase
          .from('contacts')
          .select('phone')
          .in('phone', phoneNumbers)
          .eq('organization_id', activeOrgId);

        const existingPhones = new Set(
          existingContacts?.map(c => c.phone).filter(Boolean) || []
        );

        processedData.forEach(row => {
          if (row.normalized_phone && existingPhones.has(row.normalized_phone)) {
            row.has_duplicate = true;
          }
        });
      }

      setMappedData(processedData);
    } catch (err) {
      console.error('Error processing data:', err);
      setError('Failed to process CSV data');
    } finally {
      setIsProcessing(false);
    }
  }, [csvData, activeOrgId]);

  const handleImport = async () => {
    if (!activeOrgId) {
      setError('No active organization selected');
      return;
    }

    setIsProcessing(true);
    setError(null);

    const result: ImportResult = {
      inserted: 0,
      merged: 0,
      skipped: 0,
      errors: [],
    };

    try {
      for (const row of mappedData) {
        try {
          // Handle company creation/lookup
          let companyId = null;
          if (row.company) {
            const { data: existingCompany } = await supabase
              .from('companies')
              .select('id')
              .eq('name', row.company)
              .eq('organization_id', activeOrgId)
              .single();

            if (existingCompany) {
              companyId = existingCompany.id;
            } else {
              const { data: newCompany, error: companyError } = await supabase
                .from('companies')
                .insert({
                  name: row.company,
                  organization_id: activeOrgId,
                })
                .select('id')
                .single();

              if (companyError) throw companyError;
              companyId = newCompany.id;
            }
          }

          // Skip duplicates for now (in a full implementation, you might show merge options)
          if (row.has_duplicate) {
            result.skipped++;
            continue;
          }

          // Insert contact
          const { error: contactError } = await supabase
            .from('contacts')
            .insert({
              first_name: row.first_name,
              last_name: row.last_name,
              email: row.email,
              phone: row.phone,
              title: row.title,
              company_id: companyId,
              organization_id: activeOrgId,
            });

          if (contactError) {
            result.errors.push(`Failed to import ${row.first_name} ${row.last_name}: ${contactError.message}`);
            result.skipped++;
          } else {
            result.inserted++;
          }
        } catch (err: any) {
          result.errors.push(`Error importing row: ${err.message}`);
          result.skipped++;
        }
      }

      setImportResult(result);

      // Redirect back to contacts after successful import
      if (result.inserted > 0 && result.errors.length === 0) {
        setTimeout(() => {
          router.push('/contacts');
        }, 3000);
      }
    } catch (err: any) {
      setError(`Import failed: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  if (importResult) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-2xl mx-auto p-6">
          <div className="mb-8">
            <Link href="/contacts" className="inline-flex items-center text-muted-foreground hover:text-foreground mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Contacts
            </Link>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                Import Complete
              </CardTitle>
              <CardDescription>
                Your contacts have been imported successfully
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{importResult.inserted}</div>
                  <div className="text-sm text-green-700">Inserted</div>
                </div>
                <div className="text-center p-4 bg-yellow-50 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-600">{importResult.merged}</div>
                  <div className="text-sm text-yellow-700">Merged</div>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">{importResult.skipped}</div>
                  <div className="text-sm text-red-700">Skipped</div>
                </div>
              </div>

              {importResult.errors.length > 0 && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="font-medium mb-2">Some errors occurred:</div>
                    <ul className="list-disc list-inside space-y-1">
                      {importResult.errors.map((error, index) => (
                        <li key={index} className="text-sm">{error}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex gap-3 pt-4">
                <Button onClick={() => setImportResult(null)} variant="outline">
                  Import Another File
                </Button>
                <Link href="/contacts">
                  <Button>View Contacts</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto p-6">
        <div className="mb-8">
          <Link href="/contacts" className="inline-flex items-center text-muted-foreground hover:text-foreground mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Contacts
          </Link>
          <h1 className="text-3xl font-bold text-foreground">Import Contacts</h1>
          <p className="text-muted-foreground mt-1">
            Upload a CSV file to bulk import contacts and companies
          </p>
        </div>

        {error && (
          <Alert className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {!csvData.length ? (
          <Card>
            <CardHeader>
              <CardTitle>Upload CSV File</CardTitle>
              <CardDescription>
                Choose a CSV file containing your contact data. The file should include columns for contact information.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
                <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <div className="space-y-4">
                  <div>
                    <label htmlFor="csv-upload" className="cursor-pointer">
                      <Button
                        type="button"
                        disabled={isUploading}
                        className="pointer-events-none"
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        {isUploading ? 'Processing...' : 'Choose CSV File'}
                      </Button>
                      <input
                        id="csv-upload"
                        type="file"
                        accept=".csv"
                        onChange={handleFileUpload}
                        className="hidden"
                        disabled={isUploading}
                      />
                    </label>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Supports CSV files with headers. Maximum file size: 10MB
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : !mappedData.length ? (
          <CsvMapper
            headers={headers}
            onMappingComplete={handleMappingComplete}
            isProcessing={isProcessing}
          />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Review & Import</CardTitle>
              <CardDescription>
                Review the mapped data before importing. Contacts with duplicate phone numbers will be skipped.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {mappedData.length} contacts ready to import
                  </span>
                  <div className="flex gap-2">
                    <Badge variant="secondary">
                      {mappedData.filter(row => row.has_duplicate).length} duplicates
                    </Badge>
                    <Badge variant="default">
                      {mappedData.filter(row => !row.has_duplicate).length} new
                    </Badge>
                  </div>
                </div>

                <div className="max-h-96 overflow-y-auto border rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-muted">
                      <tr>
                        <th className="px-4 py-2 text-left">Name</th>
                        <th className="px-4 py-2 text-left">Email</th>
                        <th className="px-4 py-2 text-left">Phone</th>
                        <th className="px-4 py-2 text-left">Company</th>
                        <th className="px-4 py-2 text-left">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mappedData.slice(0, 10).map((row, index) => (
                        <tr key={index} className="border-t">
                          <td className="px-4 py-2">
                            {row.first_name} {row.last_name}
                          </td>
                          <td className="px-4 py-2">{row.email || '-'}</td>
                          <td className="px-4 py-2">{row.phone || '-'}</td>
                          <td className="px-4 py-2">{row.company || '-'}</td>
                          <td className="px-4 py-2">
                            {row.has_duplicate ? (
                              <Badge variant="destructive">Duplicate</Badge>
                            ) : (
                              <Badge variant="default">New</Badge>
                            )}
                          </td>
                        </tr>
                      ))}
                      {mappedData.length > 10 && (
                        <tr>
                          <td colSpan={5} className="px-4 py-2 text-center text-muted-foreground">
                            ... and {mappedData.length - 10} more rows
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    onClick={() => setCsvData([])}
                    variant="outline"
                  >
                    Start Over
                  </Button>
                  <Button
                    onClick={handleImport}
                    disabled={isProcessing}
                  >
                    {isProcessing ? 'Importing...' : `Import ${mappedData.filter(row => !row.has_duplicate).length} Contacts`}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
