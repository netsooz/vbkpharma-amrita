const API_BASE = 'http://localhost:8000/api';

export const api = {
  // Inventory
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

  // Batch Execution
  async getBatch(batchNumber: string) {
    const res = await fetch(`${API_BASE}/batch/${batchNumber}`);
    if (!res.ok) throw new Error('Failed to fetch batch');
    return res.json();
  },

  // Audit Logs
  async getAuditLogs() {
    const res = await fetch(`${API_BASE}/audit-logs`);
    if (!res.ok) throw new Error('Failed to fetch audit logs');
    return res.json();
  }
};