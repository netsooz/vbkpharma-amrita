import React, { useState, useEffect } from 'react';
import type { InventoryItem, InventoryStatus, ESignaturePayload } from '../types/inventory';
import { ESignatureModal } from '../components/ESignatureModal';
import { GoodsInwardModal } from '../components/GoodsInwardModal';
import { api } from '../services/api';

export const InventoryManagementDashboard: React.FC = () => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modals
  const [isInwardOpen, setIsInwardOpen] = useState(false);
  const [isSignModalOpen, setIsSignModalOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<{
    lotNumber: string;
    targetStatus: InventoryStatus;
    meaning: ESignaturePayload['meaning'];
  } | null>(null);

  // Load from Live FastAPI Backend
  const loadInventory = async () => {
    try {
      setLoading(true);
      const data = await api.getInventory();
      // Map DB snake_case to frontend camelCase
      const mapped: InventoryItem[] = data.map((d: any) => ({
        id: d.id,
        lotNumber: d.lot_number,
        materialCode: d.material_code,
        materialName: d.material_name,
        type: d.material_type,
        supplier: d.supplier,
        supplierLot: d.supplier_lot,
        quantity: d.quantity,
        uom: d.uom,
        storageLocation: d.storage_location,
        status: d.status,
        expiryDate: d.expiry_date,
        receivedDate: d.received_date ? d.received_date.split('T')[0] : '',
        releasedBy: d.released_by,
        releaseDate: d.release_date,
      }));
      setItems(mapped);
    } catch (err) {
      console.error('Failed to load inventory from API:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInventory();
  }, []);

  // Filter Logic
  const filteredItems = items.filter((item) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      item.materialName.toLowerCase().includes(query) ||
      item.lotNumber.toLowerCase().includes(query) ||
      item.materialCode.toLowerCase().includes(query) ||
      item.supplierLot.toLowerCase().includes(query);

    const matchesStatus = statusFilter === 'ALL' || item.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Action Triggers requiring 21 CFR Part 11 e-Signature
  const triggerStatusChange = (lotNumber: string, newStatus: InventoryStatus) => {
    setPendingAction({
      lotNumber,
      targetStatus: newStatus,
      meaning: newStatus === 'Approved' ? 'QC Approval' : 'QC Rejection',
    });
    setIsSignModalOpen(true);
  };

  const handleSignatureConfirmed = async (signature: ESignaturePayload) => {
    if (!pendingAction) return;

    try {
      await api.qcReleaseLot(pendingAction.lotNumber, {
        status: pendingAction.targetStatus,
        signer_name: signature.signerName,
        signature_meaning: signature.meaning,
        password_verification: signature.passwordVerification,
      });
      await loadInventory(); // Refresh live table from backend
    } catch (err) {
      alert('Error updating status: ' + err);
    } finally {
      setPendingAction(null);
    }
  };

  const handleSaveInward = async (newItem: Omit<InventoryItem, 'id' | 'status'>) => {
    try {
      await api.createGoodsInward({
        lot_number: newItem.lotNumber,
        material_code: newItem.materialCode,
        material_name: newItem.materialName,
        material_type: newItem.type,
        supplier: newItem.supplier,
        supplier_lot: newItem.supplierLot,
        quantity: newItem.quantity,
        uom: newItem.uom,
        storage_location: newItem.storageLocation,
        expiry_date: newItem.expiryDate,
      });
      await loadInventory(); // Refresh live table from backend
    } catch (err) {
      alert('Error creating goods inward: ' + err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 font-sans text-slate-800">
      {/* Top Header */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Raw Material Inventory & Quarantine Management
          </h1>
          <p className="text-sm text-slate-500">
            Compliant with FDA 21 CFR Part 11 & GAMP 5 Lot Tracking
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsInwardOpen(true)}
            className="flex items-center gap-2 bg-blue-700 hover:bg-blue-800 text-white px-4 py-2.5 rounded-lg text-sm font-semibold shadow-sm transition"
          >
            <span>+ Goods Inward (GRN)</span>
          </button>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Active Lots</p>
          <p className="text-2xl font-bold text-slate-800 mt-1">{items.length}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-amber-200 bg-amber-50/40 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-amber-700">In Quarantine (QC Hold)</p>
          <p className="text-2xl font-bold text-amber-900 mt-1">
            {items.filter((i) => i.status === 'Quarantine').length}
          </p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-emerald-200 bg-emerald-50/40 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">Approved for Dispensing</p>
          <p className="text-2xl font-bold text-emerald-900 mt-1">
            {items.filter((i) => i.status === 'Approved').length}
          </p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total API Stock (kg)</p>
          <p className="text-2xl font-bold text-slate-800 mt-1">
            {items
              .filter((i) => i.type === 'API')
              .reduce((acc, curr) => acc + curr.quantity, 0)
              .toFixed(1)}
          </p>
        </div>
      </div>

      {/* Barcode Search & Filter Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6 flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="flex-1 w-full flex items-center gap-2">
          <div className="relative flex-1">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">🔍</span>
            <input
              type="text"
              placeholder="Search by Lot #, Material Name, Material Code, or Scan Barcode..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="text-xs text-slate-500 hover:text-slate-800 underline px-2"
            >
              Clear
            </button>
          )}
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-2">
          {['ALL', 'Quarantine', 'Approved', 'Rejected'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                statusFilter === status
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="text-center py-12 text-slate-400">Loading inventory from live database...</div>
          ) : (
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-100 text-xs font-semibold text-slate-700 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Internal Lot #</th>
                  <th className="px-4 py-3">Material Code & Name</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Supplier & Lot</th>
                  <th className="px-4 py-3">Stock Qty</th>
                  <th className="px-4 py-3">Bin Location</th>
                  <th className="px-4 py-3">Expiry Date</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">QC Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-8 text-slate-400">
                      No matching material lots found. Click "+ Goods Inward (GRN)" to add one.
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50 transition">
                      <td className="px-4 py-3 font-mono font-bold text-blue-700">
                        {item.lotNumber}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-800">{item.materialName}</div>
                        <div className="text-xs text-slate-400">{item.materialCode}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-block px-2 py-0.5 text-xs font-medium rounded-full bg-slate-100 text-slate-700">
                          {item.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <div>{item.supplier}</div>
                        <div className="text-slate-400 font-mono">Lot: {item.supplierLot}</div>
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-800">
                        {item.quantity} <span className="text-xs font-normal text-slate-500">{item.uom}</span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">{item.storageLocation}</td>
                      <td className="px-4 py-3 text-xs">{item.expiryDate}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                            item.status === 'Approved'
                              ? 'bg-emerald-100 text-emerald-800'
                              : item.status === 'Quarantine'
                              ? 'bg-amber-100 text-amber-800 animate-pulse'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          ● {item.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {item.status === 'Quarantine' ? (
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => triggerStatusChange(item.lotNumber, 'Approved')}
                              className="px-2.5 py-1 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded shadow-sm"
                            >
                              QC Release
                            </button>
                            <button
                              onClick={() => triggerStatusChange(item.lotNumber, 'Rejected')}
                              className="px-2.5 py-1 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded shadow-sm"
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">
                            Released ({item.releaseDate || 'Verified'})
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modals */}
      <GoodsInwardModal
        isOpen={isInwardOpen}
        onClose={() => setIsInwardOpen(false)}
        onSave={handleSaveInward}
      />

      <ESignatureModal
        isOpen={isSignModalOpen}
        onClose={() => setIsSignModalOpen(false)}
        onConfirm={handleSignatureConfirmed}
        title="21 CFR Part 11 Electronic Signature"
        actionMeaning={pendingAction?.meaning || 'QC Approval'}
      />
    </div>
  );
};