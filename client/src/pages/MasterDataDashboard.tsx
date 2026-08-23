import React, { useEffect, useState } from 'react';
import type { EquipmentItem, MasterDataPayload } from '../types/masterData';
import { api } from '../services/api';

const INITIAL_EQUIPMENT: EquipmentItem[] = [];

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

type MasterDataTab = 'materials' | 'suppliers' | 'manufacturers' | 'locations' | 'equipment' | 'uom' | 'specifications' | 'customers' | 'tax-codes';

export const MasterDataDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<MasterDataTab>('materials');
  const [equipmentList, setEquipmentList] = useState<EquipmentItem[]>(INITIAL_EQUIPMENT);
  const [masterData, setMasterData] = useState<MasterDataPayload | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const loadMasterData = async () => {
    try {
      setLoading(true);
      const data = await api.getMasterData();
      const mappedEquipment = (data.equipment || []).map(mapEquipment);

      setMasterData(data);
      setEquipmentList(mappedEquipment);
    } catch (error) {
      console.error('Failed to load master data:', error);
      setEquipmentList([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMasterData();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 p-6 font-sans text-slate-800">
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Master Data Management</h1>
          <p className="text-xs text-slate-500">
            Material, Supplier, Manufacturer, Location, Equipment, UOM, Specification, Customer &amp; Tax/HSN Masters
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={async () => {
              try {
                await api.seedMasterData();
                await loadMasterData();
              } catch (err) {
                alert('Unable to seed master data. Check backend connection.');
              }
            }}
            className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-semibold whitespace-nowrap"
          >
            + Seed Pharma Master Data
          </button>
          <div className="flex flex-wrap bg-white p-1 rounded-lg border border-slate-300 shadow-sm gap-1">
            {([
              { key: 'materials', label: '🧱 Material Master' },
              { key: 'suppliers', label: '🚚 Supplier Master' },
              { key: 'manufacturers', label: '🏷️ Manufacturer Master' },
              { key: 'locations', label: '📍 Storage Locations' },
              { key: 'equipment', label: '🏭 Equipment Master & Calibration' },
              { key: 'uom', label: '📏 UOM Master' },
              { key: 'specifications', label: '📋 Specification Master' },
              { key: 'customers', label: '🧑\u200d💼 Customer Master' },
              { key: 'tax-codes', label: '🧾 Tax / HSN Master' },
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
      </div>

      {loading && (
        <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
          Loading master data from the live pharma database...
        </div>
      )}

      {masterData && !loading && (
        <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-xs uppercase tracking-wider text-slate-400">Materials</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{masterData.materials?.length || 0}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-xs uppercase tracking-wider text-slate-400">Suppliers</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{masterData.suppliers?.length || 0}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-xs uppercase tracking-wider text-slate-400">Customers</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{masterData.customers?.length || 0}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-xs uppercase tracking-wider text-slate-400">Equipment</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{equipmentList.length}</p>
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
                      No materials found. Click "+ Seed Pharma Master Data" above to load examples.
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
                      No suppliers found. Click "+ Seed Pharma Master Data" above to load examples.
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
                      No manufacturers found. Click "+ Seed Pharma Master Data" above to load examples.
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
                      No storage locations found. Click "+ Seed Pharma Master Data" above to load examples.
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

      {activeTab === 'uom' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50">
            <h2 className="text-sm font-bold text-slate-900">Unit of Measure (UOM) Master</h2>
            <p className="text-xs text-slate-500">Canonical units and conversion factors used across inventory, formulations and transactions.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-100 uppercase font-semibold text-slate-700 border-b border-slate-200">
                <tr>
                  <th className="p-3">UOM Code</th>
                  <th className="p-3">Name</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Base UOM</th>
                  <th className="p-3 text-right">Conversion Factor</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(masterData?.uom || []).length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-slate-400">
                      No units of measure found. Click "+ Seed Pharma Master Data" above to load examples.
                    </td>
                  </tr>
                ) : (
                  (masterData?.uom || []).map(u => (
                    <tr key={u.id} className="hover:bg-slate-50">
                      <td className="p-3 font-mono font-bold text-blue-700">{u.uom_code}</td>
                      <td className="p-3 font-semibold text-slate-900">{u.uom_name}</td>
                      <td className="p-3">{u.uom_category}</td>
                      <td className="p-3 font-mono">{u.base_uom_code || '—'}</td>
                      <td className="p-3 text-right font-mono">{u.conversion_factor}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                          ● {u.status}
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

      {activeTab === 'specifications' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50">
            <h2 className="text-sm font-bold text-slate-900">Specification Master</h2>
            <p className="text-xs text-slate-500">QC test parameters, methods and acceptance limits per material.</p>
          </div>
          <div className="divide-y divide-slate-100">
            {(masterData?.specifications || []).length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs">
                No specifications found. Click "+ Seed Pharma Master Data" above to load examples.
              </div>
            ) : (
              (masterData?.specifications || []).map(spec => (
                <div key={spec.id} className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <span className="font-mono text-xs font-bold text-blue-700">{spec.spec_code}</span>
                      <span className="ml-2 text-sm font-semibold text-slate-900">{spec.material_name}</span>
                      <span className="ml-2 text-xs text-slate-400 font-mono">({spec.material_code})</span>
                    </div>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      {spec.status} · {spec.version}
                    </span>
                  </div>
                  <table className="w-full text-left text-xs text-slate-600 border border-slate-200 rounded-lg overflow-hidden">
                    <thead className="bg-slate-100 uppercase font-semibold text-slate-700">
                      <tr>
                        <th className="p-2.5">Parameter</th>
                        <th className="p-2.5">Test Method</th>
                        <th className="p-2.5 text-right">Min</th>
                        <th className="p-2.5 text-right">Max</th>
                        <th className="p-2.5">UOM</th>
                        <th className="p-2.5">Critical</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {spec.parameters.map(param => (
                        <tr key={param.id}>
                          <td className="p-2.5 font-semibold text-slate-900">{param.parameter_name}</td>
                          <td className="p-2.5">{param.test_method || '—'}</td>
                          <td className="p-2.5 text-right font-mono">{param.min_limit ?? '—'}</td>
                          <td className="p-2.5 text-right font-mono">{param.max_limit ?? '—'}</td>
                          <td className="p-2.5">{param.uom || '—'}</td>
                          <td className="p-2.5">{param.is_critical ? 'Yes' : 'No'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === 'customers' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50">
            <h2 className="text-sm font-bold text-slate-900">Customer Master</h2>
            <p className="text-xs text-slate-500">Distributors, institutional buyers and pharmacies purchasing finished goods.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-100 uppercase font-semibold text-slate-700 border-b border-slate-200">
                <tr>
                  <th className="p-3">Customer Code</th>
                  <th className="p-3">Customer Name</th>
                  <th className="p-3">Type</th>
                  <th className="p-3">GSTIN</th>
                  <th className="p-3">Contact</th>
                  <th className="p-3 text-right">Credit Limit</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(masterData?.customers || []).length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-slate-400">
                      No customers found. Click "+ Seed Pharma Master Data" above to load examples.
                    </td>
                  </tr>
                ) : (
                  (masterData?.customers || []).map(c => (
                    <tr key={c.id} className="hover:bg-slate-50">
                      <td className="p-3 font-mono font-bold text-blue-700">{c.customer_code}</td>
                      <td className="p-3 font-semibold text-slate-900">{c.customer_name}</td>
                      <td className="p-3">{c.customer_type}</td>
                      <td className="p-3 font-mono">{c.gstin || '—'}</td>
                      <td className="p-3 text-xs">
                        <div>{c.contact_person || '—'}</div>
                        <div className="text-slate-400">{c.phone || c.email || ''}</div>
                      </td>
                      <td className="p-3 text-right font-mono">{c.credit_limit.toLocaleString()}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                          ● {c.status}
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

      {activeTab === 'tax-codes' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50">
            <h2 className="text-sm font-bold text-slate-900">Tax / HSN Code Master</h2>
            <p className="text-xs text-slate-500">HSN classification and applicable tax rates for materials and finished goods.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-100 uppercase font-semibold text-slate-700 border-b border-slate-200">
                <tr>
                  <th className="p-3">HSN Code</th>
                  <th className="p-3">Description</th>
                  <th className="p-3">Tax Type</th>
                  <th className="p-3 text-right">Tax %</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(masterData?.tax_codes || []).length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-slate-400">
                      No tax/HSN codes found. Click "+ Seed Pharma Master Data" above to load examples.
                    </td>
                  </tr>
                ) : (
                  (masterData?.tax_codes || []).map(t => (
                    <tr key={t.id} className="hover:bg-slate-50">
                      <td className="p-3 font-mono font-bold text-blue-700">{t.hsn_code}</td>
                      <td className="p-3 font-semibold text-slate-900">{t.description}</td>
                      <td className="p-3">{t.tax_type}</td>
                      <td className="p-3 text-right font-mono">{t.tax_percentage.toFixed(1)} %</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                          ● {t.status}
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
    </div>
  );
};