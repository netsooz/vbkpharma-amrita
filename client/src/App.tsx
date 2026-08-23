import { useState } from 'react';
import { InventoryManagementDashboard } from './pages/InventoryManagementDashboard';
import { BatchExecutionWizard } from './pages/BatchExecutionWizard';
import { BatchReportDashboard } from './pages/BatchReportDashboard';
import { MasterDataDashboard } from './pages/MasterDataDashboard';
import { TransactionsDashboard } from './pages/TransactionsDashboard';

function App() {
  const [activeTab, setActiveTab] = useState<'inventory' | 'manufacturing' | 'reports' | 'masterData' | 'transactions'>('inventory');

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      {/* Top Application Bar */}
      <header className="bg-slate-900 text-white px-6 py-3.5 flex items-center justify-between shadow-md border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white shadow-sm">
            A
          </div>
          <div>
            <h1 className="font-bold text-base tracking-wide leading-none">AMRITA PHARMA R&D</h1>
            <span className="text-[10px] text-slate-400 tracking-wider uppercase font-semibold">
              Tablet MES & Batch Execution
            </span>
          </div>
        </div>

        {/* Tab Navigation */}
        <nav className="flex items-center gap-1 bg-slate-800 p-1 rounded-lg border border-slate-700">
          <button
            onClick={() => setActiveTab('inventory')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${
              activeTab === 'inventory'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            📦 Raw Materials & Quarantine
          </button>
          <button
            onClick={() => setActiveTab('masterData')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${
              activeTab === 'masterData'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            🧬 Master Formulations (MDM)
          </button>
          <button
            onClick={() => setActiveTab('transactions')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${
              activeTab === 'transactions'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            🔁 Transactions
          </button>
          <button
            onClick={() => setActiveTab('manufacturing')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${
              activeTab === 'manufacturing'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            ⚙️ 10-Step Batch Execution
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${
              activeTab === 'reports'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            📑 eBPR Records & Audit
          </button>
        </nav>

        {/* User Badge */}
        <div className="flex items-center gap-3">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span className="text-xs text-slate-300 font-medium">Operator ID: <strong className="text-white">RND-8041</strong></span>
        </div>
      </header>

      {/* Main View Area */}
      <main className="flex-1">
        {activeTab === 'inventory' && <InventoryManagementDashboard />}
        {activeTab === 'masterData' && <MasterDataDashboard />}
        {activeTab === 'transactions' && <TransactionsDashboard />}
        {activeTab === 'manufacturing' && <BatchExecutionWizard />}
        {activeTab === 'reports' && <BatchReportDashboard />}
      </main>
    </div>
  );
}

export default App;