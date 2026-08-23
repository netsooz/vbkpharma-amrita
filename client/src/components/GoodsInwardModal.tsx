import React, { useState } from 'react';
import type { InventoryItem, MaterialType } from '../types/inventory';

interface GoodsInwardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: Omit<InventoryItem, 'id' | 'status'>) => void;
}

export const GoodsInwardModal: React.FC<GoodsInwardModalProps> = ({ isOpen, onClose, onSave }) => {
  const [materialCode, setMaterialCode] = useState('RM-API-001');
  const [materialName, setMaterialName] = useState('');
  const [type, setType] = useState<MaterialType>('API');
  const [supplier, setSupplier] = useState('');
  const [supplierLot, setSupplierLot] = useState('');
  const [quantity, setQuantity] = useState<number>(0);
  const [uom, setUom] = useState<'kg' | 'g' | 'L' | 'units'>('kg');
  const [expiryDate, setExpiryDate] = useState('');
  const [storageLocation, setStorageLocation] = useState('WH-A/Rack-01/Bin-01');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const autoLot = `LOT-${Date.now().toString().slice(-6)}`;
    
    onSave({
      lotNumber: autoLot,
      materialCode,
      materialName,
      type,
      supplier,
      supplierLot,
      quantity: Number(quantity),
      uom,
      receivedDate: new Date().toISOString().split('T')[0],
      expiryDate,
      storageLocation,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-lg font-bold text-slate-800">Goods Receipt Entry (Raw Materials)</h3>
            <p className="text-xs text-slate-500">Inward inventory will be assigned a Quarantine state automatically.</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-lg font-bold">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Material Code</label>
            <input
              type="text"
              required
              value={materialCode}
              onChange={(e) => setMaterialCode(e.target.value)}
              className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Material Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Paracetamol Micronized"
              value={materialName}
              onChange={(e) => setMaterialName(e.target.value)}
              className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Material Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as MaterialType)}
              className="w-full px-3 py-2 text-sm border rounded-lg bg-white"
            >
              <option value="API">Active Pharmaceutical Ingredient (API)</option>
              <option value="Excipient">Excipient / Binder / Glidant</option>
              <option value="Solvent">Solvent / Liquid Reagent</option>
              <option value="Packaging">Primary / Secondary Packaging</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Supplier Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Sigma Aldrich"
              value={supplier}
              onChange={(e) => setSupplier(e.target.value)}
              className="w-full px-3 py-2 text-sm border rounded-lg"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Supplier Batch / Lot #</label>
            <input
              type="text"
              required
              placeholder="e.g. SA-2026-998"
              value={supplierLot}
              onChange={(e) => setSupplierLot(e.target.value)}
              className="w-full px-3 py-2 text-sm border rounded-lg"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Received Qty</label>
              <input
                type="number"
                step="0.01"
                required
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">UOM</label>
              <select
                value={uom}
                onChange={(e) => setUom(e.target.value as any)}
                className="w-full px-3 py-2 text-sm border rounded-lg bg-white"
              >
                <option value="kg">kg</option>
                <option value="g">g</option>
                <option value="L">L</option>
                <option value="units">units</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Expiry / Retest Date</label>
            <input
              type="date"
              required
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              className="w-full px-3 py-2 text-sm border rounded-lg"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Warehouse Bin Location</label>
            <input
              type="text"
              required
              value={storageLocation}
              onChange={(e) => setStorageLocation(e.target.value)}
              className="w-full px-3 py-2 text-sm border rounded-lg"
            />
          </div>

          <div className="col-span-2 flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg shadow-sm"
            >
              Generate GRN & Assign Lot
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};