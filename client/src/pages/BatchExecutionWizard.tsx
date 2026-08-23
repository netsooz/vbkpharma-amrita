import React, { useState } from 'react';
import type { BatchRecord, DispensingItem } from '../types/manufacturing';
import { ESignatureModal } from '../components/ESignatureModal';
import type { ESignaturePayload } from '../types/inventory';

const INITIAL_BATCH: BatchRecord = {
  batchNumber: 'TAB-2026-004',
  productName: 'Paracetamol 500mg Extended Release',
  batchSize: 100.0,
  targetTabletCount: 180000,
  currentStepIndex: 0,
  status: 'In Progress',
  dispensingList: [
    { id: '1', materialCode: 'API-PCM-01', materialName: 'Paracetamol IP/USP', targetQty: 90.0, tolerancePct: 0.5, uom: 'kg', isVerified: false },
    { id: '2', materialCode: 'EXC-MCC-02', materialName: 'Microcrystalline Cellulose', targetQty: 7.5, tolerancePct: 1.0, uom: 'kg', isVerified: false },
    { id: '3', materialCode: 'EXC-PVP-04', materialName: 'Povidone (PVP K-30)', targetQty: 2.0, tolerancePct: 1.0, uom: 'kg', isVerified: false },
    { id: '4', materialCode: 'EXC-MGST-03', materialName: 'Magnesium Stearate', targetQty: 0.5, tolerancePct: 1.0, uom: 'kg', isVerified: false },
  ],
  granulation: { binderType: 'PVP K-30 in Purified Water', binderQtyKg: 4.5, impellerSpeedRpm: 180, granulationTimeMin: 15, granulatorId: 'RMG-01' },
  drying: { fbdInletTempC: 60, fbdOutletTempC: 42, dryingTimeMin: 35, lodPercent: 1.4, dryerId: 'FBD-02' },
  milling: { sieveSizeMm: 1.0, millSpeedRpm: 1200, millId: 'CO-MILL-01' },
  screening: { meshSize: 20, oversizedGrams: 120, recoveryPct: 99.4 },
  blending: { lubricantCode: 'EXC-MGST-03', blenderRpm: 15, blendDurationMin: 10, blenderId: 'OCT-BLEND-01' },
  compression: { pressId: 'PRESS-36STN', turretSpeedRpm: 45, targetHardnessKp: 8.5, measuredHardnessKp: 8.6, avgWeightMg: 555.0, thicknessMm: 4.2, friabilityPct: 0.15 },
  coating: { coaterId: 'AUTO-COAT-01', sprayRateGpm: 45.0, panSpeedRpm: 12, bedTempC: 44.0, coatingWeightGainPct: 3.1 },
  packaging: { packType: 'Blister (PVC/Alu)', tabletsPerPack: 10, totalPacksProduced: 17850, cartonBarcode: 'GS1-890123-0098' },
  palletization: { palletId: 'PAL-2026-091', cartonsPerPallet: 24, totalPallets: 2, storageWarehouse: 'FG-COLD-ROOM-01' },
};

const STEP_NAMES = [
  '1. Dispensing',
  '2. Granulation',
  '3. Drying',
  '4. Milling',
  '5. Screening',
  '6. Blending',
  '7. Compression',
  '8. Coating',
  '9. Packaging',
  '10. Palletization',
];

export const BatchExecutionWizard: React.FC = () => {
  const [batch, setBatch] = useState<BatchRecord>(INITIAL_BATCH);
  const [activeStep, setActiveStep] = useState<number>(0);
  const [isSignModalOpen, setIsSignModalOpen] = useState(false);
  const [dispenseScanInput, setDispenseScanInput] = useState<{ [key: string]: { lot: string; gross: number; tare: number } }>({});

  const handleDispenseScan = (item: DispensingItem) => {
    const data = dispenseScanInput[item.id] || { lot: 'LOT-902411', gross: item.targetQty + 1.2, tare: 1.2 };
    const net = Number((data.gross - data.tare).toFixed(2));
    
    setBatch(prev => ({
      ...prev,
      dispensingList: prev.dispensingList.map(d => 
        d.id === item.id 
          ? { ...d, scannedLot: data.lot, tareWeight: data.tare, grossWeight: data.gross, scannedQty: net, isVerified: true } 
          : d
      )
    }));
  };

  const handleNextStepWithSign = () => {
    setIsSignModalOpen(true);
  };

  const handleSignConfirm = (_signature: ESignaturePayload) => {
    if (activeStep < 9) {
      setActiveStep(prev => prev + 1);
      setBatch(prev => ({ ...prev, currentStepIndex: Math.max(prev.currentStepIndex, activeStep + 1) }));
    } else {
      setBatch(prev => ({ ...prev, status: 'Completed' }));
      alert('Batch TAB-2026-004 has been fully manufactured, e-Signed, and palletized!');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 font-sans text-slate-800">
      {/* Top Banner */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm mb-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <span className="px-2.5 py-1 bg-blue-100 text-blue-800 text-xs font-mono font-bold rounded">
              Batch: {batch.batchNumber}
            </span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
              ● {batch.status}
            </span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 mt-1">{batch.productName}</h1>
          <p className="text-xs text-slate-500">
            Target Batch Size: <strong>{batch.batchSize} kg</strong> | Target Yield: <strong>{batch.targetTabletCount.toLocaleString()} Tablets</strong>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveStep(prev => Math.max(0, prev - 1))}
            disabled={activeStep === 0}
            className="px-3 py-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 disabled:opacity-40 rounded-lg text-slate-700"
          >
            ← Previous Stage
          </button>
          <button
            onClick={handleNextStepWithSign}
            className="px-4 py-2 text-xs font-semibold bg-blue-700 hover:bg-blue-800 text-white rounded-lg shadow-sm"
          >
            {activeStep === 9 ? 'Finalize & Palletize' : 'Verify & Next Stage →'}
          </button>
        </div>
      </div>

      {/* 10-Step Horizontal Flow Indicator */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm mb-6 overflow-x-auto">
        <div className="grid grid-cols-5 md:grid-cols-10 gap-2 min-w-[700px]">
          {STEP_NAMES.map((name, idx) => {
            const isCompleted = idx < activeStep;
            const isCurrent = idx === activeStep;
            return (
              <button
                key={name}
                onClick={() => setActiveStep(idx)}
                className={`flex flex-col items-center justify-center p-2 rounded-lg text-center transition border ${
                  isCurrent
                    ? 'bg-blue-700 text-white border-blue-700 font-bold shadow-sm'
                    : isCompleted
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300 font-medium'
                    : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <span className="text-[10px] font-mono">{isCompleted ? '✓ Completed' : `Stage ${idx + 1}`}</span>
                <span className="text-xs mt-0.5 truncate w-full">{name.split('. ')[1]}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Execution Workspace for Active Step */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        {activeStep === 0 && (
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Step 1: Dispensing & Weighing Module</h2>
                <p className="text-xs text-slate-500">Scan raw material barcode drums and capture net weights with ±0.5% tolerance.</p>
              </div>
              <span className="text-xs px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded font-mono">Scale Interface: Mettler Toledo (Online)</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-100 text-xs font-semibold text-slate-700 uppercase border-b border-slate-200">
                  <tr>
                    <th className="p-3">Material Info</th>
                    <th className="p-3">Recipe Target</th>
                    <th className="p-3">Barcode Verification</th>
                    <th className="p-3">Scale Capture (Tare / Gross)</th>
                    <th className="p-3">Net Dispensed</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {batch.dispensingList.map(item => (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="p-3">
                        <div className="font-semibold text-slate-900">{item.materialName}</div>
                        <div className="text-xs text-slate-400 font-mono">{item.materialCode}</div>
                      </td>
                      <td className="p-3 font-semibold text-slate-800">
                        {item.targetQty} {item.uom} <span className="text-xs text-slate-400">(±{item.tolerancePct}%)</span>
                      </td>
                      <td className="p-3">
                        {item.scannedLot ? (
                          <span className="px-2 py-1 bg-emerald-100 text-emerald-800 text-xs font-mono font-semibold rounded">
                            ✓ {item.scannedLot}
                          </span>
                        ) : (
                          <input
                            type="text"
                            placeholder="Scan Barcode..."
                            className="px-2 py-1 text-xs border rounded font-mono w-36"
                            onChange={e => setDispenseScanInput(prev => ({
                              ...prev,
                              [item.id]: { ...(prev[item.id] || { tare: 1.0, gross: item.targetQty + 1.0 }), lot: e.target.value }
                            }))}
                          />
                        )}
                      </td>
                      <td className="p-3 text-xs font-mono">
                        {item.isVerified ? (
                          <div>Gross: {item.grossWeight} | Tare: {item.tareWeight} {item.uom}</div>
                        ) : (
                          <div className="flex gap-1">
                            <input
                              type="number"
                              placeholder="Gross"
                              className="w-16 p-1 border rounded text-xs"
                              onChange={e => setDispenseScanInput(prev => ({
                                ...prev,
                                [item.id]: { ...(prev[item.id] || { lot: 'LOT-902411', tare: 1.0 }), gross: Number(e.target.value) }
                              }))}
                            />
                            <input
                              type="number"
                              placeholder="Tare"
                              className="w-14 p-1 border rounded text-xs"
                              onChange={e => setDispenseScanInput(prev => ({
                                ...prev,
                                [item.id]: { ...(prev[item.id] || { lot: 'LOT-902411', gross: item.targetQty + 1.0 }), tare: Number(e.target.value) }
                              }))}
                            />
                          </div>
                        )}
                      </td>
                      <td className="p-3">
                        {item.isVerified ? (
                          <span className="font-bold text-emerald-700 font-mono">{item.scannedQty} {item.uom}</span>
                        ) : (
                          <span className="text-xs text-slate-400">Pending Weighing</span>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        {!item.isVerified ? (
                          <button
                            onClick={() => handleDispenseScan(item)}
                            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded"
                          >
                            Weigh & Verify
                          </button>
                        ) : (
                          <span className="text-xs text-emerald-600 font-semibold">✓ Verified</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Step 2: Granulation */}
        {activeStep === 1 && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-slate-900 border-b pb-2">Step 2: Rapid Mixer Granulation (RMG)</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Assigned Granulator ID</label>
                <input type="text" value={batch.granulation.granulatorId} disabled className="w-full p-2 text-sm bg-slate-100 border rounded" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Impeller Speed (RPM)</label>
                <input type="number" defaultValue={batch.granulation.impellerSpeedRpm} className="w-full p-2 text-sm border rounded" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Granulation Time (Minutes)</label>
                <input type="number" defaultValue={batch.granulation.granulationTimeMin} className="w-full p-2 text-sm border rounded" />
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Drying */}
        {activeStep === 2 && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-slate-900 border-b pb-2">Step 3: Fluid Bed Drying (FBD)</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">FBD Inlet Temp (°C)</label>
                <input type="number" defaultValue={batch.drying.fbdInletTempC} className="w-full p-2 text-sm border rounded" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Drying Duration (min)</label>
                <input type="number" defaultValue={batch.drying.dryingTimeMin} className="w-full p-2 text-sm border rounded" />
              </div>
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded">
                <label className="block text-xs font-bold text-emerald-800 mb-1">IPC Check: Loss On Drying (LOD %)</label>
                <input type="number" step="0.1" defaultValue={batch.drying.lodPercent} className="w-full p-2 text-sm border rounded bg-white font-bold text-emerald-900" />
                <span className="text-[11px] text-emerald-700">Spec Limit: &lt; 2.0%</span>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Milling */}
        {activeStep === 3 && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-slate-900 border-b pb-2">Step 4: Granule Milling (Co-Mill)</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Screen / Sieve Size (mm)</label>
                <input type="number" step="0.1" defaultValue={batch.milling.sieveSizeMm} className="w-full p-2 text-sm border rounded" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Mill Speed (RPM)</label>
                <input type="number" defaultValue={batch.milling.millSpeedRpm} className="w-full p-2 text-sm border rounded" />
              </div>
            </div>
          </div>
        )}

        {/* Step 5: Screening */}
        {activeStep === 4 && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-slate-900 border-b pb-2">Step 5: Screening & Sifting</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Vibratory Sifter Mesh Size</label>
                <input type="number" defaultValue={batch.screening.meshSize} className="w-full p-2 text-sm border rounded" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Oversized Agglomerates (g)</label>
                <input type="number" defaultValue={batch.screening.oversizedGrams} className="w-full p-2 text-sm border rounded" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Granule Recovery (%)</label>
                <input type="number" step="0.1" defaultValue={batch.screening.recoveryPct} className="w-full p-2 text-sm border rounded font-bold text-blue-700" />
              </div>
            </div>
          </div>
        )}

        {/* Step 6: Blending */}
        {activeStep === 5 && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-slate-900 border-b pb-2">Step 6: Final Lubricant Blending (Octagonal Blender)</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Lubricant Material Lot</label>
                <input type="text" defaultValue="LOT-902488 (Magnesium Stearate)" className="w-full p-2 text-sm border rounded font-mono" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Blender Speed (RPM)</label>
                <input type="number" defaultValue={batch.blending.blenderRpm} className="w-full p-2 text-sm border rounded" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Tumbling Duration (min)</label>
                <input type="number" defaultValue={batch.blending.blendDurationMin} className="w-full p-2 text-sm border rounded" />
              </div>
            </div>
          </div>
        )}

        {/* Step 7: Compression */}
        {activeStep === 6 && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-slate-900 border-b pb-2">Step 7: Rotary Tablet Compression</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Turret Speed (RPM)</label>
                <input type="number" defaultValue={batch.compression.turretSpeedRpm} className="w-full p-2 text-sm border rounded" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Avg Weight (mg)</label>
                <input type="number" step="0.1" defaultValue={batch.compression.avgWeightMg} className="w-full p-2 text-sm border rounded" />
              </div>
              <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                <label className="block text-xs font-bold text-blue-800 mb-1">Hardness (Kp)</label>
                <input type="number" step="0.1" defaultValue={batch.compression.measuredHardnessKp} className="w-full p-2 text-sm border rounded bg-white font-bold" />
                <span className="text-[10px] text-blue-600">Target: 8.5 ± 1.0 Kp</span>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Friability (%)</label>
                <input type="number" step="0.01" defaultValue={batch.compression.friabilityPct} className="w-full p-2 text-sm border rounded" />
              </div>
            </div>
          </div>
        )}

        {/* Step 8: Coating */}
        {activeStep === 7 && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-slate-900 border-b pb-2">Step 8: Auto-Coating Operations</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Spray Rate (g/min)</label>
                <input type="number" defaultValue={batch.coating.sprayRateGpm} className="w-full p-2 text-sm border rounded" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Tablet Bed Temp (°C)</label>
                <input type="number" defaultValue={batch.coating.bedTempC} className="w-full p-2 text-sm border rounded" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Weight Gain Target (% w/w)</label>
                <input type="number" step="0.1" defaultValue={batch.coating.coatingWeightGainPct} className="w-full p-2 text-sm border rounded font-bold text-emerald-700" />
              </div>
            </div>
          </div>
        )}

        {/* Step 9: Packaging */}
        {activeStep === 8 && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-slate-900 border-b pb-2">Step 9: Blister Packaging & Secondary Labeling</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Packaging Format</label>
                <input type="text" defaultValue={batch.packaging.packType} disabled className="w-full p-2 text-sm bg-slate-100 border rounded" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Total Packs Counter</label>
                <input type="number" defaultValue={batch.packaging.totalPacksProduced} className="w-full p-2 text-sm border rounded font-mono font-bold" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Secondary Carton Barcode</label>
                <input type="text" defaultValue={batch.packaging.cartonBarcode} className="w-full p-2 text-sm border rounded font-mono" />
              </div>
            </div>
          </div>
        )}

        {/* Step 10: Palletization */}
        {activeStep === 9 && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-slate-900 border-b pb-2">Step 10: Palletization & Warehouse Transfer</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Pallet Label ID</label>
                <input type="text" defaultValue={batch.palletization.palletId} className="w-full p-2 text-sm border rounded font-mono font-bold text-blue-700" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Shipper Cartons / Pallet</label>
                <input type="number" defaultValue={batch.palletization.cartonsPerPallet} className="w-full p-2 text-sm border rounded" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Destination Finished Goods Store</label>
                <input type="text" defaultValue={batch.palletization.storageWarehouse} className="w-full p-2 text-sm border rounded" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 21 CFR Part 11 Electronic Signature Modal for Stage Sign-off */}
      <ESignatureModal
        isOpen={isSignModalOpen}
        onClose={() => setIsSignModalOpen(false)}
        onConfirm={handleSignConfirm}
        title={`Stage ${activeStep + 1} Sign-off: ${STEP_NAMES[activeStep]}`}
        actionMeaning="QC Approval"
      />
    </div>
  );
};