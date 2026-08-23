import React from 'react';

export const ReportsDashboard: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 p-6 font-sans text-slate-800">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Reports</h1>
        <p className="text-xs text-slate-500">
          Batch release summaries, deviation trends, inventory aging & regulatory export reports.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-dashed border-slate-300 shadow-sm p-12 text-center">
        <div className="text-4xl mb-3">📊</div>
        <h2 className="text-sm font-bold text-slate-800">Reports module coming soon</h2>
        <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
          This section is reserved for future reporting capabilities such as batch release
          summaries, deviation/CAPA trends, inventory aging, and regulatory export packs.
        </p>
      </div>
    </div>
  );
};
