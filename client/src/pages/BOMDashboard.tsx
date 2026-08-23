import React, { useEffect, useState } from 'react';
import type { MasterRecipe, MasterDataPayload, FormulationMaster } from '../types/masterData';
import { ESignatureModal } from '../components/ESignatureModal';
import type { ESignaturePayload } from '../types/inventory';
import { api } from '../services/api';

const mapFormulationToRecipe = (r: FormulationMaster): MasterRecipe => ({
  id: r.id,
  recipeCode: r.formulation_code,
  productName: r.product_name,
  bomType: r.bom_type || 'Manufacturing',
  dosageForm: r.dosage_form,
  strength: r.strength,
  version: r.version,
  status: r.status === 'Approved' ? 'Approved' : r.status === 'Draft' ? 'Draft' : 'Obsolete',
  baseBatchSizeKg: r.batch_size_kg,
  unitWeightMg: r.unit_weight_mg,
  unitsPerPack: r.units_per_pack,
  ingredients: (r.ingredients || []).map((ing, idx) => ({
    id: String(idx + 1),
    materialCode: ing.material_code,
    materialName: ing.material_name,
    type: ing.material_type as any,
    percentageWw: ing.percentage_w_w,
    requiredQuantity: ing.required_quantity,
    standardUom: ing.uom,
    tolerancePct: ing.tolerance_pct,
    isCritical: ing.is_critical,
  })),
  stageParameters: [],
  approvedBy: r.approved_by,
  approvalDate: r.approved_on ? r.approved_on.split('T')[0] : undefined,
});

type BomTab = 'manufacturing-bom' | 'packaging-bom';

export const BOMDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<BomTab>('manufacturing-bom');
  const [recipes, setRecipes] = useState<MasterRecipe[]>([]);
  const [masterData, setMasterData] = useState<MasterDataPayload | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedRecipe, setSelectedRecipe] = useState<MasterRecipe | null>(null);
  const [batchScaleInput, setBatchScaleInput] = useState<number>(100.0);
  const [isSignModalOpen, setIsSignModalOpen] = useState(false);
  const [pendingRecipeToApprove, setPendingRecipeToApprove] = useState<MasterRecipe | null>(null);

  const loadMasterData = async () => {
    try {
      setLoading(true);
      const data = await api.getMasterData();
      const mappedRecipes = (data.formulations || []).map(mapFormulationToRecipe);
      setMasterData(data);
      setRecipes(mappedRecipes);
      setSelectedRecipe(mappedRecipes.find((r: MasterRecipe) => r.bomType !== 'Packaging') || mappedRecipes[0] || null);
    } catch (error) {
      console.error('Failed to load BOM data:', error);
      setRecipes([]);
      setSelectedRecipe(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMasterData();
  }, []);

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
            : r,
        ),
      );
      setSelectedRecipe(prev =>
        prev
          ? { ...prev, status: 'Approved', approvedBy: `${sig.signerName} (QC Lead)`, approvalDate: sig.timestamp.split('T')[0] }
          : prev,
      );
    }
  };

  const totalPercentage = selectedRecipe && selectedRecipe.ingredients
    ? selectedRecipe.ingredients.reduce((sum, ing) => sum + ing.percentageWw, 0)
    : 0;

  const manufacturingBoms = recipes.filter(r => r.bomType !== 'Packaging');
  const packagingBoms = recipes.filter(r => r.bomType === 'Packaging');
  const isPackagingBomSelected = selectedRecipe?.bomType === 'Packaging';

  // Unit conversion: bulk ingredient weight (kg) -> finished dosage units -> packs.
  // e.g. a 100kg batch of 500mg tablets yields 200,000 tablets -> 2,000 bottles of 100.
  const estimatedUnitsFromBatch = selectedRecipe?.unitWeightMg
    ? Math.floor((batchScaleInput * 1_000_000) / selectedRecipe.unitWeightMg)
    : null;

  const linkedManufacturingYield = (() => {
    if (!isPackagingBomSelected || !selectedRecipe) return null;
    const linkedMfg = manufacturingBoms.find(
      m => m.productName === selectedRecipe.productName || m.strength === selectedRecipe.strength,
    );
    if (!linkedMfg?.unitWeightMg) return null;
    return Math.floor((linkedMfg.baseBatchSizeKg * 1_000_000) / linkedMfg.unitWeightMg);
  })();

  const switchBomTab = (tab: BomTab) => {
    setActiveTab(tab);
    const list = tab === 'packaging-bom' ? packagingBoms : manufacturingBoms;
    setSelectedRecipe(list[0] || null);
  };

  const renderBomTab = (bomType: 'Manufacturing' | 'Packaging') => {
    const list = bomType === 'Packaging' ? packagingBoms : manufacturingBoms;
    const emptyLabel = bomType === 'Packaging'
      ? 'No packaging BOMs available. Seed master data to load an example primary/secondary pack list.'
      : 'No manufacturing BOMs available. Seed master data to load an example formulation.';

    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-3">
          <div className="flex justify-between items-center pb-2 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
              {bomType === 'Packaging' ? 'Packaging BOMs' : 'Manufacturing BOMs'}
            </h2>
            <button
              onClick={async () => {
                try {
                  await api.seedMasterData();
                  await loadMasterData();
                } catch (err) {
                  alert('Unable to seed master data. Check backend connection.');
                }
              }}
              className="px-2.5 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded text-xs font-semibold"
            >
              + Seed Pharma Master Data
            </button>
          </div>

          <div className="space-y-2">
            {list.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-500">
                {emptyLabel}
              </div>
            ) : (
              list.map(r => (
                <div
                  key={r.id}
                  onClick={() => setSelectedRecipe(r)}
                  className={`p-3 rounded-lg border cursor-pointer transition ${
                    selectedRecipe?.id === r.id
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
              ))
            )}
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          {selectedRecipe && (
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

              {!isPackagingBomSelected && (
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
              )}

              {!isPackagingBomSelected && selectedRecipe.unitWeightMg && (
                <div className="mb-4 p-3.5 bg-indigo-50 rounded-lg border border-indigo-200 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs text-indigo-800">
                    <strong>Unit Conversion:</strong> {batchScaleInput} kg bulk batch ÷ {selectedRecipe.unitWeightMg} mg per unit
                  </p>
                  <p className="text-sm font-bold text-indigo-900 font-mono">
                    ≈ {estimatedUnitsFromBatch?.toLocaleString()} {selectedRecipe.dosageForm.toLowerCase()}s
                  </p>
                </div>
              )}

              {isPackagingBomSelected && selectedRecipe.unitsPerPack && (
                <div className="mb-4 p-3.5 bg-indigo-50 rounded-lg border border-indigo-200 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs text-indigo-800">
                    <strong>Unit Conversion:</strong> {selectedRecipe.unitsPerPack} dosage units per pack
                    {linkedManufacturingYield ? ` · linked batch yields ~${linkedManufacturingYield.toLocaleString()} units` : ''}
                  </p>
                  {linkedManufacturingYield && (
                    <p className="text-sm font-bold text-indigo-900 font-mono">
                      ≈ {Math.floor(linkedManufacturingYield / selectedRecipe.unitsPerPack).toLocaleString()} packs producible
                    </p>
                  )}
                </div>
              )}

              <div className={isPackagingBomSelected ? 'mt-4' : ''}>
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    {isPackagingBomSelected ? 'Packaging Bill of Materials (pBOM)' : 'Electronic Bill of Materials (eBOM) Formula'}
                  </h3>
                  {!isPackagingBomSelected && (
                    <span
                      className={`text-xs font-bold font-mono ${
                        totalPercentage === 100 ? 'text-emerald-700' : 'text-rose-600'
                      }`}
                    >
                      Formula Total: {totalPercentage.toFixed(1)}% {totalPercentage === 100 ? '✓ Balanced' : '⚠️ Must equal 100%'}
                    </span>
                  )}
                </div>

                <div className="overflow-x-auto border border-slate-200 rounded-lg">
                  {isPackagingBomSelected ? (
                    <table className="w-full text-left text-xs text-slate-700">
                      <thead className="bg-slate-100 uppercase font-semibold text-slate-700 border-b border-slate-200">
                        <tr>
                          <th className="p-2.5">Component Code</th>
                          <th className="p-2.5">Component Name</th>
                          <th className="p-2.5">Function</th>
                          <th className="p-2.5 text-right">Qty per Pack</th>
                          <th className="p-2.5">Critical Component</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {selectedRecipe.ingredients.map(ing => (
                          <tr key={ing.id} className="hover:bg-slate-50">
                            <td className="p-2.5 font-mono text-blue-700">{ing.materialCode}</td>
                            <td className="p-2.5 font-semibold text-slate-900">{ing.materialName}</td>
                            <td className="p-2.5">
                              <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-700 font-medium">
                                {ing.type}
                              </span>
                            </td>
                            <td className="p-2.5 text-right font-mono font-bold text-blue-700">
                              {ing.requiredQuantity} {ing.standardUom}
                            </td>
                            <td className="p-2.5 text-slate-500">{ing.isCritical ? 'Yes' : 'No'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
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
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 font-sans text-slate-800">
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Bill of Materials (BOMs)</h1>
          <p className="text-xs text-slate-500">
            Manufacturing (eBOM) and Packaging (pBOM) recipes, with bulk-to-unit-to-pack conversion and 21 CFR Part 11 approval.
          </p>
        </div>

        <div className="flex bg-white p-1 rounded-lg border border-slate-300 shadow-sm gap-1">
          <button
            onClick={() => switchBomTab('manufacturing-bom')}
            className={`px-4 py-1.5 text-xs font-semibold rounded-md transition ${
              activeTab === 'manufacturing-bom' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            🧪 Manufacturing BOM (eBOM)
          </button>
          <button
            onClick={() => switchBomTab('packaging-bom')}
            className={`px-4 py-1.5 text-xs font-semibold rounded-md transition ${
              activeTab === 'packaging-bom' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            📦 Packaging BOM (pBOM)
          </button>
        </div>
      </div>

      {loading && (
        <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
          Loading BOM data from the live pharma database...
        </div>
      )}

      {masterData && !loading && (
        <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-xs uppercase tracking-wider text-slate-400">Manufacturing BOMs</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{manufacturingBoms.length}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-xs uppercase tracking-wider text-slate-400">Packaging BOMs</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{packagingBoms.length}</p>
          </div>
        </div>
      )}

      {activeTab === 'manufacturing-bom' && renderBomTab('Manufacturing')}
      {activeTab === 'packaging-bom' && renderBomTab('Packaging')}

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
