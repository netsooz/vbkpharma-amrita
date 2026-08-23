import React, { useEffect, useState } from 'react';
import type { StockTransactionRecord, TransactionType } from '../types/transactions';
import { TRANSACTION_TYPES } from '../types/transactions';
import { NewTransactionModal } from '../components/NewTransactionModal';
import { InventoryManagementDashboard } from './InventoryManagementDashboard';
import { api } from '../services/api';

type TransactionsTab = 'ledger' | 'inventory';

export const TransactionsDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TransactionsTab>('ledger');
  const [transactions, setTransactions] = useState<StockTransactionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<TransactionType | 'ALL'>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadTransactions = async () => {
    try {
      setLoading(true);
      const data = await api.getTransactions();
      setTransactions(data);
    } catch (err) {
      console.error('Failed to load transactions:', err);
      setError('Unable to load transactions. Check backend connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTransactions();
  }, []);

  const filtered = typeFilter === 'ALL' ? transactions : transactions.filter(t => t.transaction_type === typeFilter);

  const handleSave = async (payload: any) => {
    await api.createTransaction(payload);
    await loadTransactions();
  };

  const handleDelete = async (txn: StockTransactionRecord) => {
    if (!confirm(`Delete transaction ${txn.transaction_code}? This will reverse its stock effect.`)) return;
    setDeletingId(txn.id);
    try {
      await api.deleteTransaction(txn.id);
      await loadTransactions();
    } catch (err: any) {
      alert(err?.message || 'Failed to delete transaction.');
    } finally {
      setDeletingId(null);
    }
  };

  const typeMeta = (type: TransactionType) => TRANSACTION_TYPES.find(t => t.type === type);

  return (
    <div className="min-h-screen bg-slate-50 p-6 font-sans text-slate-800">
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Transactions</h1>
          <p className="text-xs text-slate-500">
            Raw material receipt & quarantine, plus the full stock movement ledger (issue, return, transfer, adjustment, rejection, sampling & barcode operations).
          </p>
        </div>
        {activeTab === 'ledger' && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-blue-700 hover:bg-blue-800 text-white px-4 py-2.5 rounded-lg text-sm font-semibold shadow-sm transition self-start"
          >
            + New Transaction
          </button>
        )}
      </div>

      <div className="mb-6 flex bg-white p-1 rounded-lg border border-slate-300 shadow-sm w-fit">
        <button
          onClick={() => setActiveTab('inventory')}
          className={`px-4 py-1.5 text-xs font-semibold rounded-md transition ${
            activeTab === 'inventory' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          📦 Raw Materials & Quarantine
        </button>
        <button
          onClick={() => setActiveTab('ledger')}
          className={`px-4 py-1.5 text-xs font-semibold rounded-md transition ${
            activeTab === 'ledger' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          🔁 Transaction Ledger
        </button>
      </div>

      {activeTab === 'inventory' && <InventoryManagementDashboard />}

      {activeTab === 'ledger' && (
        <>
          {error && (
            <div className="mb-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div>
          )}

          <div className="mb-6 flex flex-wrap gap-2">
            <button
              onClick={() => setTypeFilter('ALL')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                typeFilter === 'ALL' ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              All ({transactions.length})
            </button>
            {TRANSACTION_TYPES.map(t => {
              const count = transactions.filter(x => x.transaction_type === t.type).length;
              return (
                <button
                  key={t.type}
                  onClick={() => setTypeFilter(t.type)}
                  title={t.description}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                    typeFilter === t.type ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {t.icon} {t.label} ({count})
                </button>
              );
            })}
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              {loading ? (
                <div className="text-center py-12 text-slate-400">Loading transactions from live database...</div>
              ) : (
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-100 uppercase font-semibold text-slate-700 border-b border-slate-200">
                    <tr>
                      <th className="p-3">Txn Code</th>
                      <th className="p-3">Type</th>
                      <th className="p-3">Material</th>
                      <th className="p-3">Lot</th>
                      <th className="p-3 text-right">Qty</th>
                      <th className="p-3">From → To</th>
                      <th className="p-3">Related Party</th>
                      <th className="p-3">Reference</th>
                      <th className="p-3">Performed By</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Date</th>
                      <th className="p-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filtered.length === 0 ? (
                      <tr>
                        <td colSpan={12} className="text-center py-8 text-slate-400">
                          No transactions found for this filter.
                        </td>
                      </tr>
                    ) : (
                      filtered.map(t => (
                        <tr key={t.id} className="hover:bg-slate-50">
                          <td className="p-3 font-mono font-bold text-blue-700">{t.transaction_code}</td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-700 font-medium whitespace-nowrap">
                              {typeMeta(t.transaction_type)?.icon} {typeMeta(t.transaction_type)?.label || t.transaction_type}
                            </span>
                          </td>
                          <td className="p-3">
                            <div className="font-semibold text-slate-900">{t.material_name}</div>
                            <div className="text-[10px] text-slate-400 font-mono">{t.material_code}</div>
                          </td>
                          <td className="p-3 font-mono">{t.lot_number || '—'}</td>
                          <td className="p-3 text-right font-mono font-semibold text-slate-800">
                            {t.quantity} <span className="text-slate-400 font-normal">{t.uom}</span>
                          </td>
                          <td className="p-3 text-xs">{t.from_location || '—'} → {t.to_location || '—'}</td>
                          <td className="p-3">{t.related_party || '—'}</td>
                          <td className="p-3 font-mono text-xs">{t.reference_doc || '—'}</td>
                          <td className="p-3">{t.performed_by}</td>
                          <td className="p-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                t.status === 'Failed'
                                  ? 'bg-rose-100 text-rose-800'
                                  : t.status === 'Passed'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {t.status}
                            </span>
                          </td>
                          <td className="p-3 font-mono text-xs">{new Date(t.transaction_date).toLocaleString()}</td>
                          <td className="p-3 text-right">
                            <button
                              onClick={() => handleDelete(t)}
                              disabled={deletingId === t.id}
                              className="px-2 py-1 text-[10px] font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded disabled:opacity-50"
                            >
                              {deletingId === t.id ? 'Deleting…' : 'Delete'}
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </>
      )}

      <NewTransactionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
      />
    </div>
  );
};
