const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:8000') + '/api';

async function apiFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const token = localStorage.getItem('amrita_access_token');
  const headers = new Headers(init.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const response = await globalThis.fetch(input, { ...init, headers });
  if (response.status === 401 && token) {
    localStorage.removeItem('amrita_access_token');
    globalThis.dispatchEvent(new Event('amrita-auth-expired'));
  }
  return response;
}

const fetch = apiFetch;

async function postJson(url: string, payload: any, errorMessage: string) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.detail || errorMessage);
  }
  return res.json();
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export const api = {
  async login(username: string, password: string) {
    return postJson(`${API_BASE}/auth/login`, { username, password }, 'Login failed');
  },

  async getCurrentUser() {
    const res = await fetch(`${API_BASE}/auth/me`);
    if (!res.ok) throw new Error('Unable to load current user');
    return res.json();
  },

  async logout() {
    const res = await fetch(`${API_BASE}/auth/logout`, { method: 'POST' });
    if (!res.ok) throw new Error('Unable to record logout');
    return res.json();
  },

  async changePassword(currentPassword: string, newPassword: string) {
    return postJson(
      `${API_BASE}/auth/change-password`,
      { current_password: currentPassword, new_password: newPassword },
      'Unable to change password',
    );
  },

  async getAccessControl() {
    const res = await fetch(`${API_BASE}/access-control`);
    if (!res.ok) throw new Error('Unable to load access-control metadata');
    return res.json();
  },

  async getUsers() {
    const res = await fetch(`${API_BASE}/users`);
    if (!res.ok) throw new Error('Unable to load users');
    return res.json();
  },

  async createUser(payload: any) {
    return postJson(`${API_BASE}/users`, payload, 'Unable to create user');
  },

  async updateUser(id: string, payload: any) {
    const res = await fetch(`${API_BASE}/users/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw new Error(body?.detail || 'Unable to update user');
    }
    return res.json();
  },

  async resetUserPassword(id: string, newPassword: string) {
    return postJson(`${API_BASE}/users/${id}/reset-password`, { new_password: newPassword }, 'Unable to reset password');
  },

  async deactivateUser(id: string) {
    const res = await fetch(`${API_BASE}/users/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw new Error(body?.detail || 'Unable to deactivate user');
    }
    return res.json();
  },

  async getInventory() {
    const res = await fetch(`${API_BASE}/inventory`);
    if (!res.ok) throw new Error('Failed to fetch inventory');
    return res.json();
  },

  async getQcReports(lotNumber: string) {
    const res = await fetch(`${API_BASE}/inventory/${encodeURIComponent(lotNumber)}/qc-reports`);
    if (!res.ok) throw new Error('Failed to fetch QC evidence');
    return res.json();
  },

  async uploadQcReport(lotNumber: string, file: File, testResult: string, notes: string) {
    const body = new FormData();
    body.append('file', file);
    body.append('test_result', testResult);
    body.append('notes', notes);
    const res = await fetch(`${API_BASE}/inventory/${encodeURIComponent(lotNumber)}/qc-reports`, { method: 'POST', body });
    if (!res.ok) {
      const payload = await res.json().catch(() => null);
      throw new Error(payload?.detail || 'Failed to upload QC evidence');
    }
    return res.json();
  },

  async downloadQcReport(reportId: string, filename: string) {
    const res = await fetch(`${API_BASE}/inventory/qc-reports/${reportId}/download`);
    if (!res.ok) throw new Error('Failed to download QC evidence');
    downloadBlob(await res.blob(), filename);
  },

  async createGoodsInward(payload: any) {
    const res = await fetch(`${API_BASE}/inventory/inward`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Failed to create goods inward');
    return res.json();
  },

  async qcReleaseLot(lotNumber: string, payload: { status: string; signer_name: string; signature_meaning: string; password_verification: string }) {
    const res = await fetch(`${API_BASE}/inventory/${lotNumber}/qc-release`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Failed to update QC status');
    return res.json();
  },

  async getBatch(batchNumber: string) {
    const res = await fetch(`${API_BASE}/batch/${batchNumber}`);
    if (!res.ok) throw new Error('Failed to fetch batch');
    return res.json();
  },

  async getAuditLogs() {
    const res = await fetch(`${API_BASE}/audit-logs`);
    if (!res.ok) throw new Error('Failed to fetch audit logs');
    return res.json();
  },

  async getReports() {
    const res = await fetch(`${API_BASE}/reports`);
    if (!res.ok) throw new Error('Failed to fetch report catalog');
    return res.json();
  },

  async getStorageStatus() {
    const res = await fetch(`${API_BASE}/storage-status`);
    if (!res.ok) throw new Error('Failed to fetch storage status');
    return res.json();
  },

  async exportReport(reportKey: string, format: 'csv' | 'pdf') {
    const res = await fetch(`${API_BASE}/reports/${encodeURIComponent(reportKey)}.${format}`);
    if (!res.ok) throw new Error(`Failed to generate ${format.toUpperCase()} report`);
    const disposition = res.headers.get('content-disposition') || '';
    const filename = disposition.match(/filename="?([^";]+)"?/)?.[1] || `${reportKey}.${format}`;
    downloadBlob(await res.blob(), filename);
  },

  async getMasterData() {
    const res = await fetch(`${API_BASE}/master-data`);
    if (!res.ok) throw new Error('Failed to fetch master data');
    return res.json();
  },

  async getMasterDashboardSummary() {
    const res = await fetch(`${API_BASE}/master-data/dashboard`);
    if (!res.ok) throw new Error('Failed to fetch dashboard summary');
    return res.json();
  },

  async seedMasterData() {
    const res = await fetch(`${API_BASE}/master-data/seed`, {
      method: 'GET',
    });
    if (!res.ok) throw new Error('Failed to seed master data');
    return res.json();
  },

  async getTransactions(transactionType?: string) {
    const query = transactionType ? `?transaction_type=${encodeURIComponent(transactionType)}` : '';
    const res = await fetch(`${API_BASE}/transactions${query}`);
    if (!res.ok) throw new Error('Failed to fetch transactions');
    return res.json();
  },

  async createTransaction(payload: any) {
    const res = await fetch(`${API_BASE}/transactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw new Error(body?.detail || 'Failed to create transaction');
    }
    return res.json();
  },

  async deleteTransaction(id: string) {
    const res = await fetch(`${API_BASE}/transactions/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw new Error(body?.detail || 'Failed to delete transaction');
    }
    return res.json();
  },

  async getMaterials() {
    const res = await fetch(`${API_BASE}/materials`);
    if (!res.ok) throw new Error('Failed to fetch materials');
    return res.json();
  },

  async createMaterial(payload: any) {
    return postJson(`${API_BASE}/materials`, payload, 'Failed to create material');
  },

  async createSupplier(payload: any) {
    return postJson(`${API_BASE}/suppliers`, payload, 'Failed to create supplier');
  },

  async createManufacturer(payload: any) {
    return postJson(`${API_BASE}/manufacturers`, payload, 'Failed to create manufacturer');
  },

  async createStorageLocation(payload: any) {
    return postJson(`${API_BASE}/storage-locations`, payload, 'Failed to create storage location');
  },

  async createEquipment(payload: any) {
    return postJson(`${API_BASE}/equipment`, payload, 'Failed to create equipment');
  },

  async createUom(payload: any) {
    return postJson(`${API_BASE}/uom`, payload, 'Failed to create unit of measure');
  },

  async createSpecification(payload: any) {
    return postJson(`${API_BASE}/specifications`, payload, 'Failed to create specification');
  },

  async createCustomer(payload: any) {
    return postJson(`${API_BASE}/customers`, payload, 'Failed to create customer');
  },

  async createTaxCode(payload: any) {
    return postJson(`${API_BASE}/tax-codes`, payload, 'Failed to create tax/HSN code');
  },
};