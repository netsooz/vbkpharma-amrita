import type { MaterialType } from './inventory';

export interface RecipeIngredient {
  id: string;
  materialCode: string;
  materialName: string;
  type: MaterialType;
  percentageWw: number;
  requiredQuantity: number;
  standardUom: string;
  tolerancePct: number;
  isCritical: boolean;
}

export interface StageParameterSpec {
  stageNumber: number;
  stageName: string;
  equipmentCategory: string;
  parameters: {
    name: string;
    targetValue: string | number;
    unit: string;
    lowerLimit?: number;
    upperLimit?: number;
  }[];
}

export interface MasterRecipe {
  id: string;
  recipeCode: string;
  productName: string;
  bomType: string;
  dosageForm: string;
  strength: string;
  version: string;
  status: 'Draft' | 'Approved' | 'Obsolete';
  baseBatchSizeKg: number;
  ingredients: RecipeIngredient[];
  stageParameters: StageParameterSpec[];
  approvedBy?: string;
  approvalDate?: string;
}

export interface EquipmentItem {
  id: string;
  equipmentCode: string;
  equipmentName: string;
  category: 'Dispensing Scale' | 'Granulator' | 'Fluid Bed Dryer' | 'Mill' | 'Sifter' | 'Blender' | 'Tablet Press' | 'Coater' | 'Packer';
  roomLocation: string;
  modelNumber: string;
  manufacturer: string;
  calibrationDate: string;
  calibrationDueDate: string;
  status: 'Qualified & Available' | 'Calibration Due' | 'Under Maintenance' | 'Quarantined';
  lastLineClearanceBatch?: string;
}

export interface SupplierMaster {
  id: string;
  supplier_code: string;
  supplier_name: string;
  supplier_type: string;
  qualification_status: string;
  contact_person?: string;
  phone?: string;
  email?: string;
}

export interface ManufacturerMaster {
  id: string;
  manufacturer_code: string;
  manufacturer_name: string;
  site_location?: string;
  license_number?: string;
  gmp_status: string;
}

export interface StorageLocationMaster {
  id: string;
  location_code: string;
  location_name: string;
  area_type: string;
  room_condition: string;
  is_quarantine: boolean;
}

export interface MaterialMaster {
  id: string;
  material_code: string;
  material_name: string;
  material_type: string;
  category?: string;
  grade?: string;
  strength?: string;
  uom: string;
  shelf_life_days?: number;
  storage_condition?: string;
  status: string;
  approved_by?: string;
  approved_on?: string;
  supplier_id?: string;
  manufacturer_id?: string;
  storage_location_id?: string;
}

export interface FormulationIngredientMaster {
  id: string;
  material_code: string;
  material_name: string;
  material_type: string;
  required_quantity: number;
  uom: string;
  percentage_w_w: number;
  tolerance_pct: number;
  is_critical: boolean;
}

export interface FormulationMaster {
  id: string;
  formulation_code: string;
  product_name: string;
  bom_type: string;
  dosage_form: string;
  strength: string;
  version: string;
  status: string;
  batch_size_kg: number;
  approved_by?: string;
  approved_on?: string;
  ingredients?: FormulationIngredientMaster[];
}

export interface MasterDataDashboardSummary {
  total_materials: number;
  total_suppliers: number;
  total_formulations: number;
  total_equipment: number;
  approved_materials: number;
  quarantine_lots: number;
}

export interface MasterDataPayload {
  materials: MaterialMaster[];
  suppliers: SupplierMaster[];
  manufacturers: ManufacturerMaster[];
  locations: StorageLocationMaster[];
  formulations: FormulationMaster[];
  equipment: EquipmentItem[];
  summary?: MasterDataDashboardSummary;
}