export interface DispensingItem {
  id: string;
  materialCode: string;
  materialName: string;
  targetQty: number;
  tolerancePct: number; // e.g. ±1%
  uom: string;
  scannedLot?: string;
  scannedQty?: number;
  tareWeight?: number;
  grossWeight?: number;
  isVerified: boolean;
}

export interface BatchRecord {
  batchNumber: string;
  productName: string;
  batchSize: number; // in kg
  targetTabletCount: number;
  currentStepIndex: number;
  status: 'In Progress' | 'Completed' | 'Deviated';
  dispensingList: DispensingItem[];
  granulation: {
    binderType: string;
    binderQtyKg: number;
    impellerSpeedRpm: number;
    granulationTimeMin: number;
    granulatorId: string;
  };
  drying: {
    fbdInletTempC: number;
    fbdOutletTempC: number;
    dryingTimeMin: number;
    lodPercent: number; // Loss on drying IPC (< 2.0%)
    dryerId: string;
  };
  milling: {
    sieveSizeMm: number;
    millSpeedRpm: number;
    millId: string;
  };
  screening: {
    meshSize: number;
    oversizedGrams: number;
    recoveryPct: number;
  };
  blending: {
    lubricantCode: string;
    blenderRpm: number;
    blendDurationMin: number;
    blenderId: string;
  };
  compression: {
    pressId: string;
    turretSpeedRpm: number;
    targetHardnessKp: number;
    measuredHardnessKp: number;
    avgWeightMg: number;
    thicknessMm: number;
    friabilityPct: number;
  };
  coating: {
    coaterId: string;
    sprayRateGpm: number;
    panSpeedRpm: number;
    bedTempC: number;
    coatingWeightGainPct: number;
  };
  packaging: {
    packType: 'Blister (PVC/Alu)' | 'HDPE Bottle' | 'Strip';
    tabletsPerPack: number;
    totalPacksProduced: number;
    cartonBarcode: string;
  };
  palletization: {
    palletId: string;
    cartonsPerPallet: number;
    totalPallets: number;
    storageWarehouse: string;
  };
}
