import { useCallback, useState } from 'react';
import { adminPost, getAdminToken } from '../../api/client';

const STEPS = ['Download Template', 'Upload File', 'Validate Data', 'Import Records'];

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const values = line.split(',');
    return headers.reduce((row, header, index) => {
      row[header] = (values[index] || '').trim();
      return row;
    }, {});
  });
}

export default function BulkImportPanel() {
  const [entity, setEntity] = useState('students');
  const [step, setStep] = useState(0);
  const [rows, setRows] = useState([]);
  const [validation, setValidation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [dragOver, setDragOver] = useState(false);

  const progress = ((step + 1) / STEPS.length) * 100;

  const downloadTemplate = async () => {
    try {
      const response = await fetch(`/api/v1/admin/import/${entity}/template.csv`, {
        headers: { Authorization: `Bearer ${getAdminToken()}` }
      });
      if (!response.ok) throw new Error('Failed to download template');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${entity}-import-template.csv`;
      a.click();
      URL.revokeObjectURL(url);
      setStep(1);
      setMessage({ text: 'Template downloaded. Upload your filled file next.', type: 'success' });
    } catch (error) {
      setMessage({ text: error.message, type: 'error' });
    }
  };

  const processFile = useCallback(async (file) => {
    if (!file) return;
    setLoading(true);
    setMessage({ text: '', type: '' });
    try {
      const text = await file.text();
      const parsed = parseCsv(text);
      setRows(parsed);
      setStep(2);
      const result = await adminPost(`/admin/import/${entity}/validate`, { rows: parsed });
      setValidation(result.data);
      if (result.data?.error_count > 0) {
        setMessage({
          text: `Validation found ${result.data.error_count} issue(s). Review before importing.`,
          type: 'error'
        });
      } else {
        setMessage({ text: 'All rows passed validation.', type: 'success' });
      }
    } catch (error) {
      setMessage({ text: error.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [entity]);

  const onFileInput = (event) => {
    processFile(event.target.files?.[0]);
  };

  const onDrop = (event) => {
    event.preventDefault();
    setDragOver(false);
    processFile(event.dataTransfer.files?.[0]);
  };

  const commitImport = async () => {
    if (!validation?.valid?.length) {
      setMessage({ text: 'No valid rows to import.', type: 'error' });
      return;
    }
    setLoading(true);
    try {
      const result = await adminPost(`/admin/import/${entity}/commit`, {
        rows: validation.valid
      });
      setStep(3);
      setMessage({
        text: `Successfully imported ${result.data?.imported_count ?? 0} record(s).`,
        type: 'success'
      });
    } catch (error) {
      setMessage({ text: error.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const downloadErrorReport = () => {
    if (!validation?.errors?.length) return;
    const header = 'line,field,message\n';
    const body = validation.errors
      .map((e) => `${e.line},${e.field},"${e.message.replace(/"/g, '""')}"`)
      .join('\n');
    const blob = new Blob([header + body], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${entity}-import-errors.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Bulk Import</h2>
        <p className="mt-1 text-muted">
          Import students, coaches, or batches using CSV templates with validation and error reports.
        </p>
      </div>

      <div className="rounded-lg border border-border bg-surface-secondary p-4">
        <div className="mb-2 flex justify-between text-sm font-medium text-foreground">
          <span>
            Step {step + 1} of {STEPS.length}: {STEPS[step]}
          </span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-border">
          <div
            className="h-full rounded-full bg-accent transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="card space-y-4 border-2 border-border bg-surface-secondary p-6 shadow-sm">
        <div>
          <label className="label text-foreground" htmlFor="importEntity">
            Import type
          </label>
          <select
            id="importEntity"
            className="input-field max-w-xs bg-surface"
            value={entity}
            onChange={(e) => {
              setEntity(e.target.value);
              setStep(0);
              setRows([]);
              setValidation(null);
            }}
          >
            <option value="students">Students</option>
            <option value="coaches">Coaches (validate only)</option>
            <option value="batches">Batches (validate only)</option>
          </select>
        </div>

        {step === 0 && (
          <div className="flex flex-wrap gap-3">
            <button type="button" className="btn-primary" onClick={downloadTemplate}>
              Download CSV Template
            </button>
            <button type="button" className="btn-secondary" onClick={() => setStep(1)}>
              Skip to Upload
            </button>
          </div>
        )}

        {step >= 1 && step < 3 && (
          <div
            className={`rounded-xl border-2 border-dashed p-10 text-center transition-colors ${
              dragOver ? 'border-accent bg-accent/10' : 'border-border bg-surface'
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
          >
            <p className="mb-4 text-base font-medium text-foreground">
              Drag & drop CSV here, or choose a file
            </p>
            <input type="file" accept=".csv,text/csv" onChange={onFileInput} className="mx-auto block" />
            {rows.length > 0 && (
              <p className="mt-4 text-sm text-muted">{rows.length} row(s) loaded</p>
            )}
          </div>
        )}

        {validation && (
          <div className="rounded-lg border border-border bg-surface p-4">
            <h3 className="mb-3 font-bold text-foreground">Validation Report</h3>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-md bg-surface-secondary p-3 text-center">
                <div className="text-2xl font-bold">{validation.summary?.total ?? 0}</div>
                <div className="text-xs uppercase text-muted">Total Rows</div>
              </div>
              <div className="rounded-md bg-success/10 p-3 text-center">
                <div className="text-2xl font-bold text-success">{validation.summary?.valid_count ?? 0}</div>
                <div className="text-xs uppercase text-muted">Valid</div>
              </div>
              <div className="rounded-md bg-danger/10 p-3 text-center">
                <div className="text-2xl font-bold text-danger">{validation.summary?.error_count ?? 0}</div>
                <div className="text-xs uppercase text-muted">Errors</div>
              </div>
            </div>
            {validation.errors?.length > 0 && (
              <div className="mt-4">
                <button type="button" className="btn-secondary btn-sm" onClick={downloadErrorReport}>
                  Download Error Report
                </button>
                <ul className="mt-3 max-h-40 space-y-1 overflow-y-auto text-sm text-danger">
                  {validation.errors.slice(0, 20).map((err, i) => (
                    <li key={`${err.line}-${err.field}-${i}`}>
                      Line {err.line} — {err.field}: {err.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {step >= 2 && validation?.valid_count > 0 && entity === 'students' && (
          <button type="button" className="btn-primary" disabled={loading} onClick={commitImport}>
            {loading ? 'Importing…' : `Import ${validation.valid_count} Record(s)`}
          </button>
        )}
      </div>

      {message.text && (
        <p className={message.type === 'success' ? 'alert-success' : 'alert-error'} role="alert">
          {message.text}
        </p>
      )}
    </div>
  );
}
