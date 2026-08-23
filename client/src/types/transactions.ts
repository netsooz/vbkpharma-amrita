export type TransactionType =
  | 'GOODS_INWARD'
  | 'GOODS_RETURN_SUPPLIER'
  | 'MATERIAL_ISSUE'
  | 'MATERIAL_RETURN'
  | 'STOCK_TRANSFER'
  | 'STOCK_ADJUSTMENT'
  | 'MATERIAL_REJECTION'
  | 'SAMPLE_WITHDRAWAL'
  | 'BARCODE_GENERATION'
  | 'BARCODE_VALIDATION';

export interface TransactionTypeMeta {
  type: TransactionType;
  label: string;
  description: string;
  icon: string;
}

export const TRANSACTION_TYPES: TransactionTypeMeta[] = [
  { type: 'GOODS_INWARD', label: 'Goods Inward', description: 'Raw material / packaging material receipt from a supplier', icon: '📥' },
  { type: 'GOODS_RETURN_SUPPLIER', label: 'Goods Return (Supplier)', description: 'Return of rejected or excess material back to the supplier', icon: '↩️' },
  { type: 'MATERIAL_ISSUE', label: 'Material Issue', description: 'Issue of material from inventory to the production floor', icon: '📤' },
  { type: 'MATERIAL_RETURN', label: 'Material Return', description: 'Return of unused/excess dispensed material from production to inventory', icon: '↪️' },
  { type: 'STOCK_TRANSFER', label: 'Stock Transfer', description: 'Movement of a lot between warehouse/storage locations', icon: '🔄' },
  { type: 'STOCK_ADJUSTMENT', label: 'Stock Adjustment', description: 'Physical stock count correction (positive or negative variance)', icon: '⚖️' },
  { type: 'MATERIAL_REJECTION', label: 'Material Rejection', description: 'QC-rejected material moved out of usable stock', icon: '🚫' },
  { type: 'SAMPLE_WITHDRAWAL', label: 'Sample Withdrawal', description: 'QC/stability sample pulled from a lot', icon: '🧪' },
  { type: 'BARCODE_GENERATION', label: 'Barcode Generation', description: 'Assign and print a traceability barcode for a lot (GS1/serialization)', icon: '🏷️' },
  { type: 'BARCODE_VALIDATION', label: 'Barcode Validation', description: 'Scan and verify a lot barcode before dispensing, receipt or dispatch', icon: '🔍' },
];

export interface StockTransactionRecord {
  id: string;
  transaction_code: string;
  transaction_type: TransactionType;
  material_code: string;
  material_name: string;
  lot_number?: string;
  quantity: number;
  uom: string;
  from_location?: string;
  to_location?: string;
  related_party?: string;
  reference_doc?: string;
  reason?: string;
  performed_by: string;
  signature_meaning?: string;
  status: string;
  transaction_date: string;
}

export interface StockTransactionCreatePayload {
  transaction_type: TransactionType;
  material_code: string;
  material_name: string;
  lot_number?: string;
  quantity?: number;
  uom: string;
  from_location?: string;
  to_location?: string;
  related_party?: string;
  reference_doc?: string;
  reason?: string;
  performed_by: string;
  signature_meaning?: string;
  scanned_value?: string;
}
