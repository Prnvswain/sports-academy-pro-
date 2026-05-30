'use client';

import { useRef, useState } from 'react';
import { Download, Upload, X, AlertCircle, CheckCircle2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useBulkCreateTeachers, BulkTeacherRow, BulkResult } from '../hooks/use-teachers';

function downloadTemplate() {
  const ws = XLSX.utils.aoa_to_sheet([
    ['Name', 'Email', 'Phone'],
    ['John Smith', 'john@school.com', '9876543210'],
    ['Jane Doe', 'jane@school.com', '9123456789'],
  ]);
  ws['!cols'] = [{ wch: 24 }, { wch: 28 }, { wch: 16 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Teachers');
  XLSX.writeFile(wb, 'teachers_template.xlsx');
}

function parseExcel(file: File): Promise<BulkTeacherRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' });
        const parsed: BulkTeacherRow[] = rows
          .map((r) => ({
            name: String(r['Name'] || r['name'] || '').trim(),
            email: String(r['Email'] || r['email'] || '').trim(),
            phone: String(r['Phone'] || r['phone'] || '').trim() || undefined,
          }))
          .filter((r) => r.name || r.email);
        resolve(parsed);
      } catch {
        reject(new Error('Failed to parse Excel file'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function BulkImportTeachersDialog({ open, onOpenChange }: Props) {
  const [preview, setPreview] = useState<BulkTeacherRow[]>([]);
  const [results, setResults] = useState<BulkResult[] | null>(null);
  const [parsing, setParsing] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const bulkMutation = useBulkCreateTeachers();

  function reset() {
    setPreview([]);
    setResults(null);
    if (fileRef.current) fileRef.current.value = '';
  }

  function handleClose(v: boolean) {
    if (!v) reset();
    onOpenChange(v);
  }

  async function handleFile(file: File) {
    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      alert('Please upload an Excel file (.xlsx or .xls)');
      return;
    }
    setParsing(true);
    try {
      const rows = await parseExcel(file);
      if (rows.length === 0) {
        alert('No valid rows found');
        return;
      }
      if (rows.length > 100) {
        alert('Maximum 100 teachers per import');
        return;
      }
      setPreview(rows);
      setResults(null);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setParsing(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Bulk import teachers</DialogTitle>
          <DialogDescription>
            Download the template, fill it in, then upload to import multiple teachers at once.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Step 1 */}
          <div className="bg-muted/40 rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Step 1 — Download template</p>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  Columns: <span className="font-mono">Name · Email · Phone</span>
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={downloadTemplate}>
                <Download className="mr-2 h-4 w-4" /> Download
              </Button>
            </div>
          </div>

          {/* Step 2 — upload or preview */}
          {!results && (
            <div>
              <p className="mb-2 text-sm font-medium">Step 2 — Upload filled Excel</p>
              {preview.length === 0 ? (
                <label
                  className="border-muted-foreground/30 hover:border-primary flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed py-10 transition"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const f = e.dataTransfer.files[0];
                    if (f) handleFile(f);
                  }}
                >
                  <Upload className="text-muted-foreground mb-2 h-8 w-8" />
                  <p className="text-muted-foreground text-sm">
                    {parsing ? 'Parsing...' : 'Click or drag & drop Excel file here'}
                  </p>
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".xlsx,.xls"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleFile(f);
                    }}
                  />
                </label>
              ) : (
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-muted-foreground text-sm">
                      {preview.length} teacher{preview.length > 1 ? 's' : ''} ready to import
                    </p>
                    <Button size="sm" variant="ghost" onClick={reset}>
                      <X className="mr-1 h-3 w-3" /> Clear
                    </Button>
                  </div>
                  <div className="max-h-52 overflow-y-auto rounded-lg border">
                    <table className="w-full text-sm">
                      <thead className="bg-muted text-muted-foreground sticky top-0 text-xs">
                        <tr>
                          <th className="px-3 py-2 text-left">#</th>
                          <th className="px-3 py-2 text-left">Name</th>
                          <th className="px-3 py-2 text-left">Email</th>
                          <th className="px-3 py-2 text-left">Phone</th>
                        </tr>
                      </thead>
                      <tbody>
                        {preview.map((row, i) => (
                          <tr key={i} className="border-t">
                            <td className="text-muted-foreground px-3 py-2">{i + 1}</td>
                            <td className="px-3 py-2 font-medium">
                              {row.name || <span className="text-destructive">—</span>}
                            </td>
                            <td className="px-3 py-2">
                              {row.email || <span className="text-destructive">—</span>}
                            </td>
                            <td className="text-muted-foreground px-3 py-2">{row.phone || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Results */}
          {results && (
            <div>
              <p className="mb-2 text-sm font-medium">Import results</p>
              <div className="max-h-60 overflow-y-auto rounded-lg border">
                <table className="w-full text-sm">
                  <thead className="bg-muted text-muted-foreground sticky top-0 text-xs">
                    <tr>
                      <th className="px-3 py-2 text-left">Name</th>
                      <th className="px-3 py-2 text-left">Email</th>
                      <th className="px-3 py-2 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((r, i) => (
                      <tr key={i} className="border-t">
                        <td className="px-3 py-2 font-medium">{r.name}</td>
                        <td className="text-muted-foreground px-3 py-2">{r.email}</td>
                        <td className="px-3 py-2">
                          {r.success ? (
                            <span className="flex items-center gap-1 text-green-600">
                              <CheckCircle2 className="h-4 w-4" /> Imported
                            </span>
                          ) : (
                            <span className="text-destructive flex items-center gap-1">
                              <AlertCircle className="h-4 w-4" /> {r.error}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Button className="mt-3 w-full" variant="outline" onClick={() => handleClose(false)}>
                Done
              </Button>
            </div>
          )}

          {/* Footer */}
          {preview.length > 0 && !results && (
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={reset}
                disabled={bulkMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                disabled={bulkMutation.isPending}
                onClick={() =>
                  bulkMutation.mutate(preview, {
                    onSuccess: (data) => setResults(data.results),
                  })
                }
              >
                {bulkMutation.isPending
                  ? `Importing ${preview.length} teachers...`
                  : `Import ${preview.length} teachers`}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
