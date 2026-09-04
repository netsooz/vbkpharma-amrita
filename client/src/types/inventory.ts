export type MaterialType = 'API' | 'Excipient' | 'Solvent' | 'Packaging';

export type InventoryStatus = 'Quarantine' | 'Approved' | 'Rejected' | 'Expired';

export interface InventoryItem {
  id: string;
  lotNumber: string;
  materialCode: string;
  materialName: string;
  type: MaterialType;
  supplier: string;
  supplierLot: string;
  quantity: number;
  uom: 'kg' | 'g' | 'L' | 'units';
  receivedDate: string;
  expiryDate: string;
  storageLocation: string; // e.g., "WH-A/Rack-02/Bin-14"
  status: InventoryStatus;
  qcStatus?: 'Pass' | 'Fail' | 'Quarantine';
  qcTestedBy?: string;
  qcTestedAt?: string;
  qcReportCount?: number;
  coaUrl?: string;
  releasedBy?: string;
  releaseDate?: string;
}

export interface ESignaturePayload {
  signerName: string;
  meaning: 'QC Approval' | 'QC Rejection' | 'QC Quarantine' | 'Goods Receipt Authorization';
  passwordVerification: string;
  timestamp: string;
}