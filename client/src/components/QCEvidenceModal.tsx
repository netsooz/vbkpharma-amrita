import React, { useEffect, useState } from 'react';
import { api } from '../services/api';

interface QCEvidence {
  id: string;
  original_filename: string;
  content_type: string;
  file_size: number;
  sha256: string;
  test_result: string;
  notes?: string;
  uploaded_by: string;
  uploaded_at: string;
}

interface QCEvidenceModalProps {
  lotNumber: string | null;
  onClose: () => void;
  onChanged: () => void;
}

export const QCEvidenceModal: React.FC<QCEvidenceModalProps> = ({ lotNumber, onClose, onChanged }) => {
  const [reports, setReports] = useState<QCEvidence[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [testResult, setTestResult] = useState('Pending Review');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    if (!lotNumber) return;
    setReports(await api.getQcReports(lotNumber));
  };

  useEffect(() => { load().catch(err => setError(err.message)); }, [lotNumber]);

  if (!lotNumber) return null;

  const upload = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!file) {
      setError('Choose a QC report scan to upload.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await api.uploadQcReport(lotNumber, file, testResult, notes);
      setFile(null);
      setNotes('');
      await load();
      onChanged();
    } catch (err: any) {
      setError(err?.message || 'Upload failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
      <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-white rounded-lg shadow-2xl p-6">
        <div className="flex justify-between items-start border-b border-slate-200 pb-3">
          <div><h2 className="text-lg font-bold">QC Evidence · {lotNumber}</h2><p className="text-xs text-slate-500">PDF/image scans are integrity-protected with SHA-256 and included in the audit trail.</p></div>
          <button onClick={onClose} className="text-slate-500">✕</button>
        </div>

        <form onSubmit={upload} className="grid grid-cols-1 md:grid-cols-3 gap-3 py-4 border-b border-slate-200">
          <label className="text-xs font-semibold md:col-span-2">QC report scan (PDF, PNG, JPEG, TIFF · max 10 MB)
            <input type="file" accept="application/pdf,image/png,image/jpeg,image/tiff" onChange={event => setFile(event.target.files?.[0] || null)} className="block mt-1 w-full text-xs border border-slate-300 rounded p-2" />
          </label>
          <label className="text-xs font-semibold">Recorded result
            <select value={testResult} onChange={event => setTestResult(event.target.value)} className="block mt-1 w-full px-3 py-2 border rounded text-sm">
              <option>Pending Review</option><option>Pass</option><option>Fail</option><option>Quarantine</option>
            </select>
          </label>
          <label className="text-xs font-semibold md:col-span-2">Notes
            <input value={notes} onChange={event => setNotes(event.target.value)} className="block mt-1 w-full px-3 py-2 border rounded text-sm" />
          </label>
          <div className="flex items-end"><button disabled={saving} className="w-full px-4 py-2 bg-blue-700 text-white text-sm font-semibold rounded disabled:opacity-50">{saving ? 'Uploading...' : 'Upload evidence'}</button></div>
          {error && <p className="md:col-span-3 text-xs text-rose-700">{error}</p>}
        </form>

        <div className="mt-4 space-y-2">
          {reports.length === 0 && <p className="text-sm text-slate-400 text-center py-5">No QC evidence uploaded for this lot.</p>}
          {reports.map(report => (
            <div key={report.id} className="border border-slate-200 rounded p-3 flex items-center justify-between gap-4">
              <div className="min-w-0"><p className="text-sm font-semibold text-slate-900 truncate">{report.original_filename}</p><p className="text-[11px] text-slate-500">{report.test_result} · {(report.file_size / 1024).toFixed(1)} KB · {report.uploaded_by} · {new Date(report.uploaded_at).toLocaleString()}</p><p className="text-[10px] font-mono text-slate-400 truncate" title={report.sha256}>SHA-256: {report.sha256}</p></div>
              <button onClick={() => api.downloadQcReport(report.id, report.original_filename)} className="px-3 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 rounded shrink-0">Download</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
