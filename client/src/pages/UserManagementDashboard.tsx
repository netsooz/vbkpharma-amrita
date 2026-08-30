import React, { useEffect, useState } from 'react';
import type { AccessControlMetadata, AppUser, ModulePermission } from '../types/auth';
import { api } from '../services/api';

interface UserManagementProps {
  currentUser: AppUser;
}

const PERMISSION_LABELS: Record<ModulePermission, string> = {
  master_data: 'Master Data Management',
  transactions: 'Transactions & Inventory',
  boms: 'Bills of Materials',
  manufacturing: 'Batch Execution',
  ebpr: 'eBPR & Audit',
  reports: 'Reports',
  user_management: 'User Management',
};

const EMPTY_FORM = {
  username: '',
  full_name: '',
  email: '',
  password: '',
  role: 'Production Operator',
  permissions: [] as ModulePermission[],
  is_active: true,
};

export const UserManagementDashboard: React.FC<UserManagementProps> = ({ currentUser }) => {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [metadata, setMetadata] = useState<AccessControlMetadata | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [resetUser, setResetUser] = useState<AppUser | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const [userData, accessData] = await Promise.all([api.getUsers(), api.getAccessControl()]);
    setUsers(userData);
    setMetadata(accessData);
  };

  useEffect(() => { load().catch(err => setError(err.message)); }, []);

  const openCreate = () => {
    const role = 'Production Operator';
    setEditingUser(null);
    setForm({ ...EMPTY_FORM, role, permissions: metadata?.role_templates[role] || [] });
    setModalOpen(true);
    setError('');
  };

  const openEdit = (user: AppUser) => {
    setEditingUser(user);
    setForm({
      username: user.username,
      full_name: user.full_name,
      email: user.email || '',
      password: '',
      role: user.role,
      permissions: [...user.permissions],
      is_active: user.is_active,
    });
    setModalOpen(true);
    setError('');
  };

  const chooseRole = (role: string) => {
    setForm(prev => ({ ...prev, role, permissions: metadata?.role_templates[role] || [] }));
  };

  const togglePermission = (permission: ModulePermission) => {
    setForm(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permission)
        ? prev.permissions.filter(item => item !== permission)
        : [...prev.permissions, permission],
    }));
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (editingUser) {
        await api.updateUser(editingUser.id, {
          full_name: form.full_name,
          email: form.email || null,
          role: form.role,
          permissions: form.permissions,
          is_active: form.is_active,
        });
      } else {
        await api.createUser({ ...form, email: form.email || null });
      }
      setModalOpen(false);
      await load();
    } catch (err: any) {
      setError(err?.message || 'Unable to save user');
    } finally {
      setSaving(false);
    }
  };

  const deactivate = async (user: AppUser) => {
    if (!confirm(`Deactivate ${user.username}? They will no longer be able to sign in.`)) return;
    try {
      await api.deactivateUser(user.id);
      await load();
    } catch (err: any) {
      alert(err?.message || 'Unable to deactivate user');
    }
  };

  const resetPassword = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!resetUser) return;
    setSaving(true);
    setError('');
    try {
      await api.resetUserPassword(resetUser.id, newPassword);
      setResetUser(null);
      setNewPassword('');
    } catch (err: any) {
      setError(err?.message || 'Unable to reset password');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 text-slate-800">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">User Management</h1>
          <p className="text-xs text-slate-500">Manage accounts, roles, module access and authentication status.</p>
        </div>
        <button onClick={openCreate} className="px-4 py-2.5 bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold rounded-md">
          + Add User
        </button>
      </div>

      {error && !modalOpen && !resetUser && <p className="mb-4 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded p-3">{error}</p>}

      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
        <table className="w-full text-left text-xs text-slate-600">
          <thead className="bg-slate-100 uppercase text-slate-700">
            <tr>
              <th className="p-3">User</th><th className="p-3">Role</th><th className="p-3">Module Access</th>
              <th className="p-3">Status</th><th className="p-3">Last Login</th><th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map(user => (
              <tr key={user.id} className="hover:bg-slate-50">
                <td className="p-3"><div className="font-semibold text-slate-900">{user.full_name}</div><div className="font-mono text-slate-400">{user.username}</div></td>
                <td className="p-3">{user.role}</td>
                <td className="p-3"><div className="flex flex-wrap gap-1">{user.permissions.map(permission => <span key={permission} className="px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded text-[10px]">{PERMISSION_LABELS[permission]}</span>)}</div></td>
                <td className="p-3"><span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${user.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'}`}>{user.is_active ? 'Active' : 'Inactive'}</span></td>
                <td className="p-3 font-mono">{user.last_login_at ? new Date(user.last_login_at).toLocaleString() : 'Never'}</td>
                <td className="p-3 text-right whitespace-nowrap">
                  <button onClick={() => openEdit(user)} className="px-2 py-1 text-blue-700 bg-blue-50 rounded mr-1">Edit</button>
                  <button onClick={() => { setResetUser(user); setError(''); }} className="px-2 py-1 text-amber-700 bg-amber-50 rounded mr-1">Reset Password</button>
                  {user.id !== currentUser.id && user.is_active && <button onClick={() => deactivate(user)} className="px-2 py-1 text-rose-700 bg-rose-50 rounded">Deactivate</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modalOpen && metadata && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <form onSubmit={save} className="bg-white w-full max-w-2xl rounded-lg p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between mb-4"><div><h2 className="text-lg font-bold">{editingUser ? 'Edit User' : 'Add User'}</h2><p className="text-xs text-slate-500">Assign a role template, then customize module permissions if needed.</p></div><button type="button" onClick={() => setModalOpen(false)}>✕</button></div>
            <div className="grid grid-cols-2 gap-4">
              <label className="text-xs font-semibold">Username<input disabled={!!editingUser} value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} required className="mt-1 w-full px-3 py-2 border rounded disabled:bg-slate-100" /></label>
              <label className="text-xs font-semibold">Full Name<input value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} required className="mt-1 w-full px-3 py-2 border rounded" /></label>
              <label className="text-xs font-semibold">Email<input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="mt-1 w-full px-3 py-2 border rounded" /></label>
              {!editingUser && <label className="text-xs font-semibold">Initial Password<input type="password" minLength={8} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required className="mt-1 w-full px-3 py-2 border rounded" /></label>}
              <label className="text-xs font-semibold">Role<select value={form.role} onChange={e => chooseRole(e.target.value)} className="mt-1 w-full px-3 py-2 border rounded">{Object.keys(metadata.role_templates).map(role => <option key={role}>{role}</option>)}</select></label>
              <label className="flex items-center gap-2 text-xs font-semibold pt-6"><input type="checkbox" checked={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked })} /> Active account</label>
            </div>
            <fieldset className="mt-5 border border-slate-200 rounded p-4"><legend className="px-2 text-xs font-bold uppercase">Module Access</legend><div className="grid grid-cols-2 gap-3">{metadata.permissions.map(permission => <label key={permission} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.permissions.includes(permission)} onChange={() => togglePermission(permission)} />{PERMISSION_LABELS[permission]}</label>)}</div></fieldset>
            {error && <p className="mt-3 text-xs text-rose-700">{error}</p>}
            <div className="flex justify-end gap-2 mt-5"><button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm">Cancel</button><button disabled={saving} className="px-4 py-2 bg-blue-700 text-white text-sm rounded">{saving ? 'Saving...' : 'Save User'}</button></div>
          </form>
        </div>
      )}

      {resetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <form onSubmit={resetPassword} className="bg-white w-full max-w-sm rounded-lg p-6 shadow-2xl">
            <h2 className="text-lg font-bold">Reset Password</h2><p className="text-xs text-slate-500 mb-4">Set a new password for {resetUser.username}.</p>
            <input type="password" minLength={8} autoFocus value={newPassword} onChange={e => setNewPassword(e.target.value)} required className="w-full px-3 py-2 border rounded" />
            {error && <p className="mt-2 text-xs text-rose-700">{error}</p>}
            <div className="flex justify-end gap-2 mt-4"><button type="button" onClick={() => setResetUser(null)} className="px-4 py-2 text-sm">Cancel</button><button disabled={saving} className="px-4 py-2 bg-blue-700 text-white text-sm rounded">Reset Password</button></div>
          </form>
        </div>
      )}
    </div>
  );
};