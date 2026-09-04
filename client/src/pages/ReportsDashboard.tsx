import React, { useEffect, useState } from 'react';
import { api } from '../services/api';

interface ReportItem {
  key: string;
  title: string;
  category: string;
  description: string;
}

interface StorageStatus {
  backend: string;
  durable: boolean;
  qc_evidence_storage: string;
  warning?: string;
}

export const ReportsDashboard: React.FC = () => {
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [storage, setStorage] = useState<StorageStatus | null>(null);
  const [generating, setGenerating] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([api.getReports(), api.getStorageStatus()])
      .then(([catalog, storageStatus]) => {
        setReports(catalog);
        setStorage(storageStatus);
      })
      .catch(err => setError(err.message));
  }, []);

  const exportReport = async (key: string, format: 'csv' | 'pdf') => {
    const operation = `${key}-${format}`;
    setGenerating(operation);
    setError('');
    try {
      await api.exportReport(key, format);
    } catch (err: any) {
      setError(err?.message || 'Report generation failed');
    } finally {
      setGenerating('');
    }
  };

  const categories = Array.from(new Set(reports.map(report => report.category)));

  return (
    <div className="min-h-screen bg-slate-50 p-6 font-sans text-slate-800">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Regulatory &amp; Operational Reports</h1>
        <p className="text-xs text-slate-500">
          FDA 21 CFR Part 11 audit evidence, quality-control records, inventory activity, and complete master-data registers.
        </p>
      </div>

      {storage?.warning && (
        <div className="mb-6 border border-amber-300 bg-amber-50 px-4 py-3 rounded-md">
          <p className="text-xs font-bold text-amber-900">Production retention warning</p>
          <p className="text-xs text-amber-800 mt-1">{storage.warning}</p>
        </div>
      )}

      {error && <div className="mb-5 border border-rose-200 bg-rose-50 text-rose-700 text-sm px-4 py-3 rounded-md">{error}</div>}

      {categories.map(category => (
        <section key={category} className="mb-7">
          <div className="flex items-center gap-3 mb-3">
            <h2 className="text-xs font-bold uppercase text-slate-700 tracking-wide">{category}</h2>
            <div className="h-px bg-slate-200 flex-1" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {reports.filter(report => report.category === category).map(report => (
              <article key={report.key} className="bg-white border border-slate-200 rounded-md p-4 flex items-center justify-between gap-5 shadow-sm">
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-slate-900">{report.title}</h3>
                  <p className="text-xs text-slate-500 mt-1">{report.description}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => exportReport(report.key, 'csv')}
                    disabled={!!generating}
                    className="px-3 py-1.5 text-xs font-semibold border border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 rounded disabled:opacity-50"
                  >
                    {generating === `${report.key}-csv` ? 'Generating...' : 'CSV'}
                  </button>
                  <button
                    onClick={() => exportReport(report.key, 'pdf')}
                    disabled={!!generating}
                    className="px-3 py-1.5 text-xs font-semibold border border-rose-300 bg-rose-50 text-rose-800 hover:bg-rose-100 rounded disabled:opacity-50"
                  >
                    {generating === `${report.key}-pdf` ? 'Generating...' : 'PDF'}
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
};
