import React, { useEffect, useState } from 'react';
import type {
  MasterRecipe,
  EquipmentItem,
  MasterDataPayload,
  FormulationMaster,
} from '../types/masterData';
import { ESignatureModal } from '../components/ESignatureModal';
import type { ESignaturePayload } from '../types/inventory';
import { api } from '../services/api';

const INITIAL_RECIPES: MasterRecipe[] = [];
const INITIAL_EQUIPMENT: EquipmentItem[] = [];

const mapFormulationToRecipe = (r: FormulationMaster): MasterRecipe => ({
  id: r.id,
  recipeCode: r.formulation_code,
  productName: r.product_name,
  dosageForm: r.dosage_form,
  strength: r.strength,
  version: r.version,
  status: r.status === 'Approved' ? 'Approved' : r.status === 'Draft' ? 'Draft' : 'Obsolete',
  baseBatchSizeKg: r.batch_size_kg,
  ingredients: (r.ingredients || []).map((ing, idx) => ({
    id: String(idx + 1),
    materialCode: ing.material_code,
    materialName: ing.material_name,
    type: ing.material_type as any,
    percentageWw: ing.percentage_w_w,
    standardUom: ing.uom,
    tolerancePct: ing.tolerance_pct,
  })),
  stageParameters: [],
  approvedBy: r.approved_by,
  approvalDate: r.approved_on ? r.approved_on.split('T')[0] : undefined,
});

const mapEquipment = (eq: any): EquipmentItem => ({
  id: eq.id,
  equipmentCode: eq.equipment_code,
  equipmentName: eq.equipment_name,
  category: eq.category as any,
  roomLocation: eq.room_location || '',
  modelNumber: eq.model_number || '',
  manufacturer: eq.manufacturer || '',
  calibrationDate: eq.calibration_date || '',
  calibrationDueDate: eq.calibration_due_date || '',
  status: eq.status as any,
  lastLineClearanceBatch: eq.last_line_clearance_batch || '',
});

type MasterDataTab = 'formulations' | 'materials' | 'suppliers' | 'manufacturers' | 'locations' | 'equipment';

export const MasterDataDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<MasterDataTab>('formulations');
  const [recipes, setRecipes] = useState<MasterRecipe[]>(INITIAL_RECIPES);
  const [equipmentList, setEquipmentList] = useState<EquipmentItem[]>(INITIAL_EQUIPMENT);
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
      const mappedEquipment = (data.equipment || []).map(mapEquipment);

      setMasterData(data);
      setRecipes(mappedRecipes);
      setEquipmentList(mappedEquipment);
      setSelectedRecipe(mappedRecipes[0] || null);
    } catch (error) {
      console.error('Failed to load master data:', error);
      setRecipes([]);
      setEquipmentList([]);
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

  return (
    <div className="min-h-screen bg-slate-50 p-6 font-sans text-slate-800">
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Master Data Management (MDM)</h1>
          <p className="text-xs text-slate-500">
            Formulation Master Recipes (eBOM), 10-Step CPP Rules & Equipment Calibration Registry
          </p>
        </div>

        <div className="flex flex-wrap bg-white p-1 rounded-lg border border-slate-300 shadow-sm gap-1">
          {([
            { key: 'formulations', label: '🧪 Formulation Master Recipes (eBOM)' },
            { key: 'materials', label: '📦 Material Master' },
            { key: 'suppliers', label: '🚚 Supplier Master' },
            { key: 'manufacturers', label: '🏷️ Manufacturer Master' },
            { key: 'locations', label: '📍 Storage Locations' },
            { key: 'equipment', label: '🏭 Equipment Master & Calibration' },
          ] as { key: MasterDataTab; label: string }[]).map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-1.5 text-xs font-semibold rounded-md transition ${
                activeTab === tab.key ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
          Loading master data from the live pharma database...
        </div>
      )}

      {masterData && !loading && (
        <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-xs uppercase tracking-wider text-slate-400">Materials</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{masterData.materials?.length || 0}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-xs uppercase tracking-wider text-slate-400">Suppliers</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{masterData.suppliers?.length || 0}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-xs uppercase tracking-wider text-slate-400">Formulations</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{masterData.formulations?.length || 0}</p>
          </div>
        </div>
      )}

      {activeTab === 'formulations' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-3">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Master Formulations</h2>
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
              {recipes.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-500">
                  No formulations available. Seed master data to load example pharma recipes.
                </div>
              ) : (
                recipes.map(r => (
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
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'materials' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50">
            <h2 className="text-sm font-bold text-slate-900">Material Master (APIs, Excipients & Packaging)</h2>
            <p className="text-xs text-slate-500">Approved raw materials with linked supplier, manufacturer and storage details.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-100 uppercase font-semibold text-slate-700 border-b border-slate-200">
                <tr>
                  <th className="p-3">Material Code</th>
                  <th className="p-3">Material Name</th>
                  <th className="p-3">Type</th>
                  <th className="p-3">Grade</th>
                  <th className="p-3">UOM</th>
                  <th className="p-3">Shelf Life (days)</th>
                  <th className="p-3">Storage Condition</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(masterData?.materials || []).length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-slate-400">
                      No materials found. Click "+ Seed Pharma Master Data" on the Formulations tab to load examples.
                    </td>
                  </tr>
                ) : (
                  (masterData?.materials || []).map(m => (
                    <tr key={m.id} className="hover:bg-slate-50">
                      <td className="p-3 font-mono font-bold text-blue-700">{m.material_code}</td>
                      <td className="p-3 font-semibold text-slate-900">{m.material_name}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-700 font-medium">
                          {m.material_type}
                        </span>
                      </td>
                      <td className="p-3">{m.grade || '—'}</td>
                      <td className="p-3">{m.uom}</td>
                      <td className="p-3">{m.shelf_life_days ?? '—'}</td>
                      <td className="p-3">{m.storage_condition || '—'}</td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            m.status === 'Approved' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          ● {m.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'suppliers' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50">
            <h2 className="text-sm font-bold text-slate-900">Supplier Master</h2>
            <p className="text-xs text-slate-500">Qualified vendors for API, excipient and packaging supply.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-100 uppercase font-semibold text-slate-700 border-b border-slate-200">
                <tr>
                  <th className="p-3">Supplier Code</th>
                  <th className="p-3">Supplier Name</th>
                  <th className="p-3">Type</th>
                  <th className="p-3">Contact Person</th>
                  <th className="p-3">Phone</th>
                  <th className="p-3">Email</th>
                  <th className="p-3">Qualification Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(masterData?.suppliers || []).length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-slate-400">
                      No suppliers found. Click "+ Seed Pharma Master Data" on the Formulations tab to load examples.
                    </td>
                  </tr>
                ) : (
                  (masterData?.suppliers || []).map(s => (
                    <tr key={s.id} className="hover:bg-slate-50">
                      <td className="p-3 font-mono font-bold text-blue-700">{s.supplier_code}</td>
                      <td className="p-3 font-semibold text-slate-900">{s.supplier_name}</td>
                      <td className="p-3">{s.supplier_type}</td>
                      <td className="p-3">{s.contact_person || '—'}</td>
                      <td className="p-3">{s.phone || '—'}</td>
                      <td className="p-3">{s.email || '—'}</td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            s.qualification_status === 'Approved' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          ● {s.qualification_status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'manufacturers' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50">
            <h2 className="text-sm font-bold text-slate-900">Manufacturer Master</h2>
            <p className="text-xs text-slate-500">GMP-approved manufacturing sites for sourced materials.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-100 uppercase font-semibold text-slate-700 border-b border-slate-200">
                <tr>
                  <th className="p-3">Manufacturer Code</th>
                  <th className="p-3">Manufacturer Name</th>
                  <th className="p-3">Site Location</th>
                  <th className="p-3">License Number</th>
                  <th className="p-3">GMP Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(masterData?.manufacturers || []).length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-slate-400">
                      No manufacturers found. Click "+ Seed Pharma Master Data" on the Formulations tab to load examples.
                    </td>
                  </tr>
                ) : (
                  (masterData?.manufacturers || []).map(mfr => (
                    <tr key={mfr.id} className="hover:bg-slate-50">
                      <td className="p-3 font-mono font-bold text-blue-700">{mfr.manufacturer_code}</td>
                      <td className="p-3 font-semibold text-slate-900">{mfr.manufacturer_name}</td>
                      <td className="p-3">{mfr.site_location || '—'}</td>
                      <td className="p-3">{mfr.license_number || '—'}</td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            mfr.gmp_status === 'Approved' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          ● {mfr.gmp_status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'locations' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50">
            <h2 className="text-sm font-bold text-slate-900">Storage Location Master</h2>
            <p className="text-xs text-slate-500">Warehouse bins, quarantine zones and controlled storage areas.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-100 uppercase font-semibold text-slate-700 border-b border-slate-200">
                <tr>
                  <th className="p-3">Location Code</th>
                  <th className="p-3">Location Name</th>
                  <th className="p-3">Area Type</th>
                  <th className="p-3">Room Condition</th>
                  <th className="p-3">Quarantine Zone</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(masterData?.locations || []).length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-slate-400">
                      No storage locations found. Click "+ Seed Pharma Master Data" on the Formulations tab to load examples.
                    </td>
                  </tr>
                ) : (
                  (masterData?.locations || []).map(loc => (
                    <tr key={loc.id} className="hover:bg-slate-50">
                      <td className="p-3 font-mono font-bold text-blue-700">{loc.location_code}</td>
                      <td className="p-3 font-semibold text-slate-900">{loc.location_name}</td>
                      <td className="p-3">{loc.area_type}</td>
                      <td className="p-3">{loc.room_condition}</td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            loc.is_quarantine ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {loc.is_quarantine ? 'Quarantine' : 'General'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

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