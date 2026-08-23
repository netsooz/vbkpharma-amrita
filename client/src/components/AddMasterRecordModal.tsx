import React, { useState } from 'react';

export interface MasterFieldConfig {
  name: string;
  label: string;
  type: 'text' | 'number' | 'checkbox' | 'select';
  required?: boolean;
  options?: string[];
  defaultValue?: string | number | boolean;
  placeholder?: string;
}

interface AddMasterRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (payload: Record<string, any>) => Promise<void>;
  title: string;
  description?: string;
  fields: MasterFieldConfig[];
}

export const AddMasterRecordModal: React.FC<AddMasterRecordModalProps> = ({
  isOpen,
  onClose,
  onSave,
  title,
  description,
  fields,
}) => {
  const buildInitialState = () => {
    const state: Record<string, any> = {};
    fields.forEach(f => {
      state[f.name] = f.defaultValue ?? (f.type === 'checkbox' ? false : f.type === 'number' ? 0 : '');
    });
    return state;
  };

  const [values, setValues] = useState<Record<string, any>>(buildInitialState);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const setField = (name: string, value: any) => setValues(prev => ({ ...prev, [name]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const missing = fields.filter(f => f.required && !String(values[f.name] ?? '').trim());
    if (missing.length > 0) {
      setError(`Please fill in: ${missing.map(f => f.label).join(', ')}`);
      return;
    }

    setSaving(true);
    setError('');
    try {
      const payload: Record<string, any> = {};
      fields.forEach(f => {
        const raw = values[f.name];
        if (f.type === 'number') {
          payload[f.name] = raw === '' ? undefined : Number(raw);
        } else if (f.type === 'checkbox') {
          payload[f.name] = Boolean(raw);
        } else {
          payload[f.name] = String(raw).trim() || undefined;
        }
      });
      await onSave(payload);
      setValues(buildInitialState());
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to save record.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-xl bg-white p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-lg font-bold text-slate-800">{title}</h3>
            {description && <p className="text-xs text-slate-500">{description}</p>}
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-lg font-bold">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 grid grid-cols-2 gap-4">
          {fields.map(f => (
            <div key={f.name} className={f.type === 'checkbox' ? 'flex items-center gap-2 pt-5' : ''}>
              {f.type === 'checkbox' ? (
                <>
                  <input
                    type="checkbox"
                    checked={Boolean(values[f.name])}
                    onChange={e => setField(f.name, e.target.checked)}
                    className="h-4 w-4"
                  />
                  <label className="text-xs font-semibold text-slate-600 uppercase">{f.label}</label>
                </>
              ) : (
                <>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                    {f.label}{f.required ? ' *' : ''}
                  </label>
                  {f.type === 'select' ? (
                    <select
                      value={values[f.name]}
                      onChange={e => setField(f.name, e.target.value)}
                      className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-600"
                    >
                      {(f.options || []).map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={f.type}
                      value={values[f.name]}
                      onChange={e => setField(f.name, e.target.value)}
                      placeholder={f.placeholder}
                      className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-600"
                    />
                  )}
                </>
              )}
            </div>
          ))}

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
              {saving ? 'Saving…' : 'Save Record'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
