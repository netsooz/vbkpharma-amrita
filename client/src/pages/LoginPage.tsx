import React, { useState } from 'react';
import type { AppUser } from '../types/auth';
import { api } from '../services/api';

interface LoginPageProps {
  onLogin: (user: AppUser) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const result = await api.login(username, password);
      localStorage.setItem('amrita_access_token', result.access_token);
      onLogin(result.user);
    } catch (err: any) {
      setError(err?.message || 'Unable to sign in');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <div className="w-full max-w-sm bg-white rounded-lg shadow-2xl overflow-hidden">
        <div className="bg-blue-700 px-6 py-7 text-white">
          <img src="/favicon.ico" alt="Amrita Pharma" className="w-14 h-14 object-contain mb-4" />
          <h1 className="text-xl font-bold">Amrita Pharma R&amp;D</h1>
          <p className="text-xs text-blue-100 mt-1">Secure MES &amp; Master Data Access</p>
        </div>

        <form onSubmit={submit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Username</label>
            <input
              autoFocus
              autoComplete="username"
              value={username}
              onChange={event => setUsername(event.target.value)}
              className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Password</label>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={event => setPassword(event.target.value)}
              className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
              required
            />
          </div>
          {error && <p className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded px-3 py-2">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold rounded-md disabled:opacity-50"
          >
            {submitting ? 'Signing in...' : 'Sign in'}
          </button>
          <p className="text-[11px] text-slate-500 text-center">
            Initial administrator: <strong>admin</strong>. Use the deployment password configured by your system administrator.
          </p>
        </form>
      </div>
    </div>
  );
};