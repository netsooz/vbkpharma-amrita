import React, { useState } from 'react';

interface SpecParamRow {
  parameter_name: string;
  test_method: string;
  min_limit: string;
  max_limit: string;
  uom: string;
  is_critical: boolean;
}

interface AddSpecificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (payload: any) => Promise<void>;
}

const EMPTY_PARAM: SpecParamRow = {
  parameter_name: '',
  test_method: '',
  min_limit: '',
  max_limit: '',
  uom: '',
  is_critical: false,
};

export const AddSpecificationModal: React.FC<AddSpecificationModalProps> = ({ isOpen, onClose, onSave }) => {
  const [specCode, setSpecCode] = useState('');
  const [materialCode, setMaterialCode] = useState('');
  const [materialName, setMaterialName] = useState('');
  const [version, setVersion] = useState('v1.0');
  const [approvedBy, setApprovedBy] = useState('');
  const [parameters, setParameters] = useState<SpecParamRow[]>([{ ...EMPTY_PARAM }]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const updateParam = (idx: number, field: keyof SpecParamRow, value: string | boolean) => {
    setParameters(prev => prev.map((p, i) => (i === idx ? { ...p, [field]: value } : p)));
  };

  const resetForm = () => {
    setSpecCode('');
    setMaterialCode('');
    setMaterialName('');
    setVersion('v1.0');
    setApprovedBy('');
    setParameters([{ ...EMPTY_PARAM }]);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!specCode.trim() || !materialCode.trim() || !materialName.trim()) {
      setError('Spec code, material code and material name are required.');
      return;
    }
    const validParams = parameters.filter(p => p.parameter_name.trim());
    if (validParams.length === 0) {
      setError('Add at least one test parameter.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      await onSave({
        spec_code: specCode.trim(),
        material_code: materialCode.trim(),
        material_name: materialName.trim(),
        version,
        approved_by: approvedBy.trim() || undefined,
        parameters: validParams.map(p => ({
          parameter_name: p.parameter_name.trim(),
          test_method: p.test_method.trim() || undefined,
          min_limit: p.min_limit.trim() || undefined,
          max_limit: p.max_limit.trim() || undefined,
          uom: p.uom.trim() || undefined,
          is_critical: p.is_critical,
        })),
      });
      resetForm();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to save specification.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
      <div className="w-full max-w-3xl rounded-xl bg-white p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-lg font-bold text-slate-800">Add Specification</h3>
            <p className="text-xs text-slate-500">Define QC test parameters and acceptance limits for a material.</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-lg font-bold">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Spec Code *</label>
              <input type="text" value={specCode} onChange={e => setSpecCode(e.target.value)} placeholder="e.g. SPEC-API-XYZ-01" className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-600" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Version</label>
              <input type="text" value={version} onChange={e => setVersion(e.target.value)} className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-600" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Material Code *</label>
              <input type="text" value={materialCode} onChange={e => setMaterialCode(e.target.value)} className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-600" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Material Name *</label>
              <input type="text" value={materialName} onChange={e => setMaterialName(e.target.value)} className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-600" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Approved By</label>
              <input type="text" value={approvedBy} onChange={e => setApprovedBy(e.target.value)} className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-600" />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-bold text-slate-700 uppercase">Test Parameters</label>
              <button
                type="button"
                onClick={() => setParameters(prev => [...prev, { ...EMPTY_PARAM }])}
                className="px-2.5 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded text-xs font-semibold"
              >
                + Add Parameter
              </button>
            </div>
            <div className="space-y-2">
              {parameters.map((p, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-slate-50 p-2 rounded-lg border border-slate-200">
                  <input
                    type="text" placeholder="Parameter (e.g. Assay)" value={p.parameter_name}
                    onChange={e => updateParam(idx, 'parameter_name', e.target.value)}
                    className="col-span-3 px-2 py-1.5 text-xs border rounded"
                  />
                  <input
                    type="text" placeholder="Test Method" value={p.test_method}
                    onChange={e => updateParam(idx, 'test_method', e.target.value)}
                    className="col-span-3 px-2 py-1.5 text-xs border rounded"
                  />
                  <input
                    type="text" placeholder="Min" value={p.min_limit}
                    onChange={e => updateParam(idx, 'min_limit', e.target.value)}
                    className="col-span-1 px-2 py-1.5 text-xs border rounded"
                  />
                  <input
                    type="text" placeholder="Max" value={p.max_limit}
                    onChange={e => updateParam(idx, 'max_limit', e.target.value)}
                    className="col-span-1 px-2 py-1.5 text-xs border rounded"
                  />
                  <input
                    type="text" placeholder="UOM" value={p.uom}
                    onChange={e => updateParam(idx, 'uom', e.target.value)}
                    className="col-span-2 px-2 py-1.5 text-xs border rounded"
                  />
                  <label className="col-span-1 flex items-center gap-1 text-[10px] text-slate-600">
                    <input type="checkbox" checked={p.is_critical} onChange={e => updateParam(idx, 'is_critical', e.target.checked)} />
                    Critical
                  </label>
                  <button
                    type="button"
                    onClick={() => setParameters(prev => prev.filter((_, i) => i !== idx))}
                    className="col-span-1 text-rose-600 hover:text-rose-800 text-xs font-bold"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>

          {error && <p className="text-xs text-rose-600">{error}</p>}

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="px-4 py-2 text-sm font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg shadow-sm transition disabled:opacity-50">
              {saving ? 'Saving…' : 'Save Specification'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
