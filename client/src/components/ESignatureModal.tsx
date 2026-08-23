import React, { useState } from 'react';
import type { ESignaturePayload } from '../types/inventory';

interface ESignatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (payload: ESignaturePayload) => void;
  title: string;
  actionMeaning: ESignaturePayload['meaning'];
}

export const ESignatureModal: React.FC<ESignatureModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  actionMeaning,
}) => {
  const [signerName, setSignerName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!signerName.trim() || !password.trim()) {
      setError('Both User ID/Signer Name and verification password are required for 21 CFR Part 11.');
      return;
    }

    onConfirm({
      signerName,
      meaning: actionMeaning,
      passwordVerification: password,
      timestamp: new Date().toISOString(),
    });

    setSignerName('');
    setPassword('');
    setError('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl border border-slate-200">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h3 className="text-lg font-semibold text-slate-800">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
        </div>

        <div className="my-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
          <strong>21 CFR Part 11 Notice:</strong> Applying your electronic signature is legally equivalent to your handwritten signature.
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
              Signer Name / Operator ID
            </label>
            <input
              type="text"
              value={signerName}
              onChange={(e) => setSignerName(e.target.value)}
              placeholder="e.g. John Doe (QC Lead)"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
              Meaning of Signature
            </label>
            <input
              type="text"
              value={actionMeaning}
              disabled
              className="w-full px-3 py-2 text-sm bg-slate-100 border border-slate-200 rounded-lg text-slate-600 font-medium cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
              Re-enter Password to Confirm
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          {error && <p className="text-xs text-rose-600">{error}</p>}

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg shadow-sm transition"
            >
              Digitally Sign & Confirm
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};