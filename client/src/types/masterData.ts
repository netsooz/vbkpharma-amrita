import type { MaterialType } from './inventory';

export interface RecipeIngredient {
  id: string;
  materialCode: string;
  materialName: string;
  type: MaterialType;
  percentageWw: number; // e.g. 80% API, 10% MCC
  standardUom: string;
  tolerancePct: number;
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
  recipeCode: string; // e.g., "MR-PCM-500ER"
  productName: string;
  dosageForm: string; // "Tablet"
  strength: string; // "500 mg"
  version: string; // "v2.0"
  status: 'Draft' | 'Approved' | 'Obsolete';
  baseBatchSizeKg: number;
  ingredients: RecipeIngredient[];
  stageParameters: StageParameterSpec[];
  approvedBy?: string;
  approvalDate?: string;
}

export interface EquipmentItem {
  id: string;
  equipmentCode: string; // e.g., "PRESS-36STN"
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