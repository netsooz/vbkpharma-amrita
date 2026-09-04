import React, { useEffect, useState } from 'react';
import type { StockTransactionCreatePayload, TransactionType } from '../types/transactions';
import { TRANSACTION_TYPES } from '../types/transactions';
import { api } from '../services/api';

interface MaterialOption {
  material_code: string;
  material_name: string;
  material_type: string;
}

interface NewTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (payload: StockTransactionCreatePayload) => Promise<void>;
  defaultType?: TransactionType;
}

const LOCATION_REQUIRED_TYPES: TransactionType[] = ['GOODS_INWARD', 'MATERIAL_ISSUE', 'MATERIAL_RETURN', 'STOCK_TRANSFER'];
const SCAN_REQUIRED_TYPES: TransactionType[] = [
  'GOODS_RETURN_SUPPLIER', 'MATERIAL_ISSUE', 'MATERIAL_RETURN', 'STOCK_TRANSFER',
  'STOCK_ADJUSTMENT', 'MATERIAL_REJECTION', 'SAMPLE_WITHDRAWAL',
];
const PARTY_LABELS: Partial<Record<TransactionType, string>> = {
  GOODS_INWARD: 'Supplier',
  GOODS_RETURN_SUPPLIER: 'Supplier',
  MATERIAL_ISSUE: 'Issued To (Dept.)',
  MATERIAL_RETURN: 'Returned From (Dept.)',
};

export const NewTransactionModal: React.FC<NewTransactionModalProps> = ({ isOpen, onClose, onSave, defaultType }) => {
  const [transactionType, setTransactionType] = useState<TransactionType>(defaultType || 'GOODS_INWARD');
  const [materials, setMaterials] = useState<MaterialOption[]>([]);
  const [materialCode, setMaterialCode] = useState('');
  const [lotNumber, setLotNumber] = useState('');
  const [quantity, setQuantity] = useState<number>(0);
  const [uom, setUom] = useState('kg');
  const [fromLocation, setFromLocation] = useState('');
  const [toLocation, setToLocation] = useState('');
  const [relatedParty, setRelatedParty] = useState('');
  const [referenceDoc, setReferenceDoc] = useState('');
  const [reason, setReason] = useState('');
  const [performedBy, setPerformedBy] = useState('');
  const [scannedValue, setScannedValue] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [supplierLot, setSupplierLot] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    api.getMaterials()
      .then((data: MaterialOption[]) => setMaterials(data))
      .catch(() => setMaterials([]));
  }, [isOpen]);

  if (!isOpen) return null;

  const meta = TRANSACTION_TYPES.find(t => t.type === transactionType)!;
  const isBarcodeType = transactionType === 'BARCODE_GENERATION' || transactionType === 'BARCODE_VALIDATION';
  const requiresMovementScan = SCAN_REQUIRED_TYPES.includes(transactionType);
  const needsLocations = !isBarcodeType && (LOCATION_REQUIRED_TYPES.includes(transactionType) || transactionType === 'STOCK_TRANSFER');
  const isNewLotGoodsInward = transactionType === 'GOODS_INWARD' && !lotNumber.trim();
  const selectedMaterial = materials.find(m => m.material_code === materialCode);

  const resetForm = () => {
    setMaterialCode('');
    setLotNumber('');
    setQuantity(0);
    setFromLocation('');
    setToLocation('');
    setRelatedParty('');
    setReferenceDoc('');
    setReason('');
    setPerformedBy('');
    setScannedValue('');
    setExpiryDate('');
    setSupplierLot('');
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMaterial || !performedBy.trim()) {
      setError('Please select a valid material (from Raw Materials / Packaging Materials master) and enter Performed By.');
      return;
    }
    if (isBarcodeType && !lotNumber.trim()) {
      setError('Lot number is required for barcode operations.');
      return;
    }
    if (transactionType === 'BARCODE_VALIDATION' && !scannedValue.trim()) {
      setError('Scanned barcode value is required for barcode validation.');
      return;
    }
    if (requiresMovementScan && !scannedValue.trim()) {
      setError('Scan the physical lot barcode before recording this controlled movement.');
      return;
    }
    if (!isBarcodeType && !quantity) {
      setError('Quantity is required for this transaction type.');
      return;
    }
    if (isNewLotGoodsInward && !expiryDate.trim()) {
      setError('Expiry date is required when receiving a new lot (no existing Lot Number entered).');
      return;
    }

    setSaving(true);
    setError('');
    try {
      await onSave({
        transaction_type: transactionType,
        material_code: selectedMaterial.material_code,
        material_name: selectedMaterial.material_name,
        lot_number: lotNumber.trim() || undefined,
        quantity: isBarcodeType ? 0 : Number(quantity),
        uom,
        from_location: fromLocation.trim() || undefined,
        to_location: toLocation.trim() || undefined,
        related_party: relatedParty.trim() || undefined,
        reference_doc: referenceDoc.trim() || undefined,
        reason: reason.trim() || undefined,
        performed_by: performedBy.trim(),
        scanned_value: scannedValue.trim() || undefined,
        expiry_date: expiryDate.trim() || undefined,
        supplier_lot: supplierLot.trim() || undefined,
      });
      resetForm();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to create transaction.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-lg font-bold text-slate-800">New Stock Transaction</h3>
            <p className="text-xs text-slate-500">{meta.icon} {meta.description}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-lg font-bold">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Transaction Type</label>
            <select
              value={transactionType}
              onChange={(e) => setTransactionType(e.target.value as TransactionType)}
              className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-600"
            >
              {TRANSACTION_TYPES.map(t => (
                <option key={t.type} value={t.type}>{t.icon} {t.label}</option>
              ))}
            </select>
          </div>

          <div className="col-span-2">
            <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
              Material (Raw Material / Packaging Material)
            </label>
            <select
              required
              value={materialCode}
              onChange={(e) => setMaterialCode(e.target.value)}
              className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-600"
            >
              <option value="">Select a material…</option>
              {materials.map(m => (
                <option key={m.material_code} value={m.material_code}>
                  {m.material_code} — {m.material_name} ({m.material_type})
                </option>
              ))}
            </select>
            {materials.length === 0 && (
              <p className="mt-1 text-[11px] text-amber-600">
                No materials found. Seed master data or add materials before recording transactions.
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
              Lot Number {isBarcodeType ? '' : '(optional)'}
            </label>
            <input
              type="text"
              required={isBarcodeType}
              value={lotNumber}
              onChange={(e) => setLotNumber(e.target.value)}
              placeholder="e.g. LOT-INV-001"
              className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-600"
            />
            {transactionType === 'GOODS_INWARD' && (
              <p className="mt-1 text-[11px] text-slate-500">
                Leave blank to receive this as a brand-new lot (a lot number will be auto-generated).
              </p>
            )}
          </div>

          {isNewLotGoodsInward && (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Expiry Date *</label>
                <input
                  type="date"
                  required
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-600"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Supplier Lot Number</label>
                <input
                  type="text"
                  value={supplierLot}
                  onChange={(e) => setSupplierLot(e.target.value)}
                  placeholder="e.g. SUP-LOT-2001"
                  className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-600"
                />
              </div>
            </>
          )}

          {isBarcodeType ? (
            transactionType === 'BARCODE_VALIDATION' && (
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Scanned Barcode Value</label>
                <input
                  type="text"
                  required
                  value={scannedValue}
                  onChange={(e) => setScannedValue(e.target.value)}
                  placeholder="Scan or paste the barcode value"
                  className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-600"
                />
              </div>
            )
          ) : (
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Quantity</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-600"
                />
              </div>
              <div className="w-24">
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">UOM</label>
                <input
                  type="text"
                  value={uom}
                  onChange={(e) => setUom(e.target.value)}
                  className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-600"
                />
              </div>
            </div>
          )}

          {requiresMovementScan && (
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Physical Lot Barcode Scan *</label>
              <input
                type="text"
                required
                autoComplete="off"
                value={scannedValue}
                onChange={(e) => setScannedValue(e.target.value)}
                placeholder="Scan the barcode on the physical container label"
                className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-600 font-mono"
              />
              <p className="mt-1 text-[11px] text-slate-500">The scan must match the selected lot and material. Production issue also requires QC Pass and an unexpired lot.</p>
            </div>
          )}

          {needsLocations && (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">From Location</label>
                <input
                  type="text"
                  value={fromLocation}
                  onChange={(e) => setFromLocation(e.target.value)}
                  placeholder="e.g. WH-01"
                  className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-600"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">To Location</label>
                <input
                  type="text"
                  value={toLocation}
                  onChange={(e) => setToLocation(e.target.value)}
                  placeholder="e.g. Granulation Suite A"
                  className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-600"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
              {PARTY_LABELS[transactionType] || 'Related Party'}
            </label>
            <input
              type="text"
              value={relatedParty}
              onChange={(e) => setRelatedParty(e.target.value)}
              className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Reference Document</label>
            <input
              type="text"
              value={referenceDoc}
              onChange={(e) => setReferenceDoc(e.target.value)}
              placeholder="PO / BMR / Debit Note #"
              className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div className="col-span-2">
            <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Reason / Notes</label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Required for adjustments, returns, and rejections"
              className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div className="col-span-2">
            <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Performed By (Operator ID)</label>
            <input
              type="text"
              required
              value={performedBy}
              onChange={(e) => setPerformedBy(e.target.value)}
              placeholder="e.g. Warehouse Supervisor"
              className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-600"
            />
          </div>

          {error && <p className="col-span-2 text-xs text-rose-600">{error}</p>}

          <div className="col-span-2 flex justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg shadow-sm transition disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Record Transaction'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
