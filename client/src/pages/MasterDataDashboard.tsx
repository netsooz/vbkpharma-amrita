import React, { useState } from 'react';
import type { MasterRecipe, EquipmentItem } from '../types/masterData';
import { ESignatureModal } from '../components/ESignatureModal';
import type { ESignaturePayload } from '../types/inventory';

const INITIAL_RECIPES: MasterRecipe[] = [
  {
    id: 'REC-001',
    recipeCode: 'MR-PCM-500ER',
    productName: 'Paracetamol 500mg Extended Release',
    dosageForm: 'Tablet',
    strength: '500 mg',
    version: 'v2.1',
    status: 'Approved',
    baseBatchSizeKg: 100.0,
    approvedBy: 'Dr. Sarah Lin (Head of R&D)',
    approvalDate: '2026-03-01',
    ingredients: [
      { id: '1', materialCode: 'API-PCM-01', materialName: 'Paracetamol IP/USP', type: 'API', percentageWw: 90.0, standardUom: 'kg', tolerancePct: 0.5 },
      { id: '2', materialCode: 'EXC-MCC-02', materialName: 'Microcrystalline Cellulose PH-102', type: 'Excipient', percentageWw: 7.5, standardUom: 'kg', tolerancePct: 1.0 },
      { id: '3', materialCode: 'EXC-PVP-04', materialName: 'Povidone (PVP K-30)', type: 'Excipient', percentageWw: 2.0, standardUom: 'kg', tolerancePct: 1.0 },
      { id: '4', materialCode: 'EXC-MGST-03', materialName: 'Magnesium Stearate (Veg Grade)', type: 'Excipient', percentageWw: 0.5, standardUom: 'kg', tolerancePct: 1.0 },
    ],
    stageParameters: [
      {
        stageNumber: 1,
        stageName: 'Dispensing',
        equipmentCategory: 'Dispensing Scale',
        parameters: [
          { name: 'Gross/Tare Verification', targetValue: 'Required', unit: 'Boolean' },
          { name: 'Dispensing Tolerance', targetValue: 0.5, unit: '± %' },
        ],
      },
      {
        stageNumber: 2,
        stageName: 'Granulation',
        equipmentCategory: 'Granulator',
        parameters: [
          { name: 'Impeller Speed', targetValue: 180, unit: 'RPM', lowerLimit: 170, upperLimit: 190 },
          { name: 'Granulation Time', targetValue: 15, unit: 'min', lowerLimit: 13, upperLimit: 17 },
        ],
      },
      {
        stageNumber: 3,
        stageName: 'Drying',
        equipmentCategory: 'Fluid Bed Dryer',
        parameters: [
          { name: 'Inlet Air Temp', targetValue: 60, unit: '°C', lowerLimit: 55, upperLimit: 65 },
          { name: 'IPC Loss on Drying (LOD)', targetValue: 1.5, unit: '% w/w', upperLimit: 2.0 },
        ],
      },
      {
        stageNumber: 7,
        stageName: 'Compression',
        equipmentCategory: 'Tablet Press',
        parameters: [
          { name: 'Target Hardness', targetValue: 8.5, unit: 'Kp', lowerLimit: 7.5, upperLimit: 9.5 },
          { name: 'Tablet Friability', targetValue: 0.2, unit: '%', upperLimit: 0.8 },
          { name: 'Avg Weight', targetValue: 555.0, unit: 'mg', lowerLimit: 535.0, upperLimit: 575.0 },
        ],
      },
    ],
  },
];

const INITIAL_EQUIPMENT: EquipmentItem[] = [
  { id: 'EQ-01', equipmentCode: 'BAL-MT-01', equipmentName: 'Mettler Toledo Precision Balance', category: 'Dispensing Scale', roomLocation: 'Dispensing Booth A', modelNumber: 'XP6002S', manufacturer: 'Mettler Toledo', calibrationDate: '2026-06-01', calibrationDueDate: '2026-12-01', status: 'Qualified & Available', lastLineClearanceBatch: 'TAB-2026-003' },
  { id: 'EQ-02', equipmentCode: 'RMG-01', equipmentName: 'Rapid Mixer Granulator 50L', category: 'Granulator', roomLocation: 'Granulation Suite 1', modelNumber: 'RMG-50-PRO', manufacturer: 'Ganson Engineering', calibrationDate: '2026-04-15', calibrationDueDate: '2026-10-15', status: 'Qualified & Available', lastLineClearanceBatch: 'TAB-2026-004' },
  { id: 'EQ-03', equipmentCode: 'FBD-02', equipmentName: 'Fluid Bed Dryer Top Spray', category: 'Fluid Bed Dryer', roomLocation: 'Granulation Suite 1', modelNumber: 'FBD-30', manufacturer: 'Glatt Pharma', calibrationDate: '2026-05-10', calibrationDueDate: '2026-11-10', status: 'Qualified & Available', lastLineClearanceBatch: 'TAB-2026-004' },
  { id: 'EQ-04', equipmentCode: 'CO-MILL-01', equipmentName: 'Conical Sieve Mill', category: 'Mill', roomLocation: 'Milling Room 2', modelNumber: 'CM-197', manufacturer: 'Quadro Engineering', calibrationDate: '2026-02-10', calibrationDueDate: '2026-08-10', status: 'Calibration Due', lastLineClearanceBatch: 'TAB-2026-002' },
  { id: 'EQ-05', equipmentCode: 'OCT-BLEND-01', equipmentName: 'Octagonal Blender 100L', category: 'Blender', roomLocation: 'Blending Bay B', modelNumber: 'OB-100', manufacturer: 'PharmaTech', calibrationDate: '2026-07-01', calibrationDueDate: '2027-01-01', status: 'Qualified & Available', lastLineClearanceBatch: 'TAB-2026-004' },
  { id: 'EQ-06', equipmentCode: 'PRESS-36STN', equipmentName: '36-Station Rotary Tablet Press', category: 'Tablet Press', roomLocation: 'Compression Suite A', modelNumber: 'Korsch XL-400', manufacturer: 'Korsch AG', calibrationDate: '2026-06-20', calibrationDueDate: '2026-12-20', status: 'Qualified & Available', lastLineClearanceBatch: 'TAB-2026-004' },
  { id: 'EQ-07', equipmentCode: 'AUTO-COAT-01', equipmentName: 'Perforated Auto Coater 24"', category: 'Coater', roomLocation: 'Coating Suite 1', modelNumber: 'AC-600', manufacturer: 'Thomas Engineering', calibrationDate: '2026-03-12', calibrationDueDate: '2026-09-12', status: 'Qualified & Available', lastLineClearanceBatch: 'TAB-2026-004' },
];

export const MasterDataDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'formulations' | 'equipment'>('formulations');
  const [recipes, setRecipes] = useState<MasterRecipe[]>(INITIAL_RECIPES);
  const [equipmentList] = useState<EquipmentItem[]>(INITIAL_EQUIPMENT);

  // Formulation Builder State
  const [selectedRecipe, setSelectedRecipe] = useState<MasterRecipe>(INITIAL_RECIPES[0]);
  const [batchScaleInput, setBatchScaleInput] = useState<number>(100.0);

  // Sign modal state
  const [isSignModalOpen, setIsSignModalOpen] = useState(false);
  const [pendingRecipeToApprove, setPendingRecipeToApprove] = useState<MasterRecipe | null>(null);

  const handleApproveRecipeTrigger = (recipe: MasterRecipe) => {
    setPendingRecipeToApprove(recipe);
    setIsSignModalOpen(true);
  };

  const handleSignConfirm = (sig: ESignaturePayload) => {
    if (pendingRecipeToApprove) {
      setRecipes(prev =>
        prev.map(r =>
          r.id === pendingRecipeToApprove.id
            ? { ...r, status: 'Approved', approvedBy: `${sig.signerName} (QC Lead)`, approvalDate: sig.timestamp.split('T')[0] }
            : r
        )
      );
      setSelectedRecipe(prev => ({
        ...prev,
        status: 'Approved',
        approvedBy: `${sig.signerName} (QC Lead)`,
        approvalDate: sig.timestamp.split('T')[0],
      }));
    }
  };

  const totalPercentage = selectedRecipe.ingredients.reduce((sum, ing) => sum + ing.percentageWw, 0);

  return (
    <div className="min-h-screen bg-slate-50 p-6 font-sans text-slate-800">
      {/* Top Header */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Master Data Management (MDM)</h1>
          <p className="text-xs text-slate-500">
            Formulation Master Recipes (eBOM), 10-Step CPP Rules & Equipment Calibration Registry
          </p>
        </div>

        {/* Sub-navigation Pills */}
        <div className="flex bg-white p-1 rounded-lg border border-slate-300 shadow-sm">
          <button
            onClick={() => setActiveTab('formulations')}
            className={`px-4 py-1.5 text-xs font-semibold rounded-md transition ${
              activeTab === 'formulations' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            🧪 Formulation Master Recipes (eBOM)
          </button>
          <button
            onClick={() => setActiveTab('equipment')}
            className={`px-4 py-1.5 text-xs font-semibold rounded-md transition ${
              activeTab === 'equipment' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            🏭 Equipment Master & Calibration
          </button>
        </div>
      </div>

      {/* VIEW 1: Formulation Master Recipes (eBOM) */}
      {activeTab === 'formulations' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Recipe List */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-3">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Master Formulations</h2>
              <button
                onClick={() => alert('New Recipe creation wizard will open.')}
                className="px-2.5 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded text-xs font-semibold"
              >
                + New Master
              </button>
            </div>

            <div className="space-y-2">
              {recipes.map(r => (
                <div
                  key={r.id}
                  onClick={() => setSelectedRecipe(r)}
                  className={`p-3 rounded-lg border cursor-pointer transition ${
                    selectedRecipe.id === r.id
                      ? 'border-blue-600 bg-blue-50/50 shadow-sm'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <span className="font-mono text-xs font-bold text-blue-700">{r.recipeCode}</span>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        r.status === 'Approved' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {r.status}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 mt-1">{r.productName}</h3>
                  <div className="text-xs text-slate-500 mt-1 flex justify-between">
                    <span>Strength: {r.strength}</span>
                    <span>Version: {r.version}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: Recipe Details & Dynamic Batch Scaler */}
          <div className="lg:col-span-2 space-y-6">
            {/* Meta Card */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-slate-900">{selectedRecipe.productName}</h2>
                    <span className="text-xs px-2 py-0.5 bg-slate-100 font-mono text-slate-700 rounded">
                      {selectedRecipe.recipeCode} ({selectedRecipe.version})
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Dosage: <strong>{selectedRecipe.dosageForm} ({selectedRecipe.strength})</strong> | Status:{' '}
                    <strong className={selectedRecipe.status === 'Approved' ? 'text-emerald-700' : 'text-amber-700'}>
                      {selectedRecipe.status}
                    </strong>
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {selectedRecipe.status === 'Draft' ? (
                    <button
                      onClick={() => handleApproveRecipeTrigger(selectedRecipe)}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded shadow-sm"
                    >
                      ✍️ 21 CFR Approve Recipe
                    </button>
                  ) : (
                    <div className="text-right text-[11px] text-slate-500">
                      <div>Approved By: <strong className="text-slate-800">{selectedRecipe.approvedBy}</strong></div>
                      <div>Date: {selectedRecipe.approvalDate}</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Dynamic Batch Scaler Calculator */}
              <div className="my-4 p-3.5 bg-slate-50 rounded-lg border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase">
                    R&D Scaling Simulator (Target Batch Size in kg)
                  </label>
                  <p className="text-[11px] text-slate-500">Formula auto-computes exact ingredient dispensing quantities.</p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="5"
                    value={batchScaleInput}
                    onChange={e => setBatchScaleInput(Number(e.target.value))}
                    className="w-24 px-3 py-1.5 text-sm font-bold text-blue-700 border border-slate-300 rounded bg-white text-right"
                  />
                  <span className="text-xs font-semibold text-slate-600">kg Batch</span>
                </div>
              </div>

              {/* Bill of Materials (eBOM) Table */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Electronic Bill of Materials (eBOM) Formula
                  </h3>
                  <span
                    className={`text-xs font-bold font-mono ${
                      totalPercentage === 100 ? 'text-emerald-700' : 'text-rose-600'
                    }`}
                  >
                    Formula Total: {totalPercentage.toFixed(1)}% {totalPercentage === 100 ? '✓ Balanced' : '⚠️ Must equal 100%'}
                  </span>
                </div>

                <div className="overflow-x-auto border border-slate-200 rounded-lg">
                  <table className="w-full text-left text-xs text-slate-700">
                    <thead className="bg-slate-100 uppercase font-semibold text-slate-700 border-b border-slate-200">
                      <tr>
                        <th className="p-2.5">Material Code</th>
                        <th className="p-2.5">Material Name</th>
                        <th className="p-2.5">Type</th>
                        <th className="p-2.5 text-right">Standard % (w/w)</th>
                        <th className="p-2.5 text-right font-bold text-blue-700">Scaled Qty ({batchScaleInput} kg)</th>
                        <th className="p-2.5 text-right">Dispensing Tol.</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedRecipe.ingredients.map(ing => {
                        const scaledQty = (ing.percentageWw / 100) * batchScaleInput;
                        return (
                          <tr key={ing.id} className="hover:bg-slate-50">
                            <td className="p-2.5 font-mono text-blue-700">{ing.materialCode}</td>
                            <td className="p-2.5 font-semibold text-slate-900">{ing.materialName}</td>
                            <td className="p-2.5">
                              <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-700 font-medium">
                                {ing.type}
                              </span>
                            </td>
                            <td className="p-2.5 text-right font-mono">{ing.percentageWw.toFixed(1)} %</td>
                            <td className="p-2.5 text-right font-mono font-bold text-blue-700 text-xs">
                              {scaledQty.toFixed(2)} {ing.standardUom}
                            </td>
                            <td className="p-2.5 text-right font-mono text-slate-500">± {ing.tolerancePct} %</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Master Stage Critical Process Parameters (CPP) */}
              <div className="mt-6">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                  Master Stage Critical Process Parameters (CPPs)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {selectedRecipe.stageParameters.map(sp => (
                    <div key={sp.stageNumber} className="p-3 border border-slate-200 rounded-lg bg-slate-50/50">
                      <div className="flex justify-between items-center pb-1 mb-2 border-b border-slate-200">
                        <span className="font-bold text-xs text-slate-800">
                          Stage {sp.stageNumber}: {sp.stageName}
                        </span>
                        <span className="text-[10px] text-slate-500">{sp.equipmentCategory}</span>
                      </div>
                      <div className="space-y-1.5">
                        {sp.parameters.map((p, i) => (
                          <div key={i} className="flex justify-between text-xs">
                            <span className="text-slate-600">{p.name}:</span>
                            <span className="font-mono font-bold text-slate-900">
                              {p.targetValue} {p.unit}
                              {p.lowerLimit && ` (${p.lowerLimit} - ${p.upperLimit})`}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: Equipment Master & Calibration Registry */}
      {activeTab === 'equipment' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Validated Equipment & Calibration Registry</h2>
              <p className="text-xs text-slate-500">
                GAMP 5 Category 4 equipment qualifications, calibration validity, and room line clearances.
              </p>
            </div>
            <button
              onClick={() => alert('Add Equipment modal will open.')}
              className="px-3 py-1.5 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded shadow-sm self-start sm:self-auto"
            >
              + Register New Machine
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-100 uppercase font-semibold text-slate-700 border-b border-slate-200">
                <tr>
                  <th className="p-3">Equipment Code</th>
                  <th className="p-3">Equipment Name & Model</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Room / Suite</th>
                  <th className="p-3">Last Calibration</th>
                  <th className="p-3">Due Date</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Last Line Clearance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {equipmentList.map(eq => {
                  const isDue = eq.status === 'Calibration Due';
                  return (
                    <tr key={eq.id} className="hover:bg-slate-50">
                      <td className="p-3 font-mono font-bold text-blue-700">{eq.equipmentCode}</td>
                      <td className="p-3">
                        <div className="font-semibold text-slate-900">{eq.equipmentName}</div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {eq.manufacturer} - {eq.modelNumber}
                        </div>
                      </td>
                      <td className="p-3 font-medium text-slate-700">{eq.category}</td>
                      <td className="p-3 text-slate-600">{eq.roomLocation}</td>
                      <td className="p-3 font-mono text-slate-500">{eq.calibrationDate}</td>
                      <td className="p-3 font-mono font-semibold text-slate-800">{eq.calibrationDueDate}</td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            eq.status === 'Qualified & Available'
                              ? 'bg-emerald-100 text-emerald-800'
                              : isDue
                              ? 'bg-rose-100 text-rose-800 animate-pulse'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          ● {eq.status}
                        </span>
                      </td>
                      <td className="p-3 font-mono text-xs text-slate-600">
                        {eq.lastLineClearanceBatch || 'N/A'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 21 CFR Part 11 Approval Modal */}
      <ESignatureModal
        isOpen={isSignModalOpen}
        onClose={() => setIsSignModalOpen(false)}
        onConfirm={handleSignConfirm}
        title="21 CFR Part 11 Master Recipe Authorization"
        actionMeaning="QC Approval"
      />
    </div>
  );
};