const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:8000') + '/api';

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

export const api = {
  async getInventory() {
    const res = await fetch(`${API_BASE}/inventory`);
    if (!res.ok) throw new Error('Failed to fetch inventory');
    return res.json();
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