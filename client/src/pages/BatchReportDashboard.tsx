import React, { useState } from 'react';

interface AuditTrailEvent {
  id: string;
  stage: string;
  action: string;
  performedBy: string;
  role: string;
  timestamp: string;
  signatureMeaning: string;
  status: 'Verified' | 'Flagged';
}

const AUDIT_TRAIL: AuditTrailEvent[] = [
  { id: 'EVT-101', stage: '1. Dispensing', action: 'API & Excipient barcode verification & net weight capture', performedBy: 'R. Sharma', role: 'Formulation Scientist', timestamp: '2026-08-22 09:15:32', signatureMeaning: 'Dispensing Verification', status: 'Verified' },
  { id: 'EVT-102', stage: '2. Granulation', action: 'Binder spray and RMG cycle execution (180 RPM, 15 min)', performedBy: 'R. Sharma', role: 'Formulation Scientist', timestamp: '2026-08-22 10:45:10', signatureMeaning: 'Granulation Release', status: 'Verified' },
  { id: 'EVT-103', stage: '3. Drying', action: 'FBD operation completed; IPC LOD confirmed at 1.4% (Spec < 2.0%)', performedBy: 'M. Patel', role: 'Process Operator', timestamp: '2026-08-22 11:50:00', signatureMeaning: 'IPC Quality Clearance', status: 'Verified' },
  { id: 'EVT-104', stage: '4. Milling & 5. Screening', action: '1.0mm Co-Mill & #20 mesh screening; Recovery: 99.4%', performedBy: 'M. Patel', role: 'Process Operator', timestamp: '2026-08-22 13:10:22', signatureMeaning: 'Granule Size Verification', status: 'Verified' },
  { id: 'EVT-105', stage: '6. Blending', action: 'Lubrication blending with Mg Stearate for 10 min at 15 RPM', performedBy: 'R. Sharma', role: 'Formulation Scientist', timestamp: '2026-08-22 14:00:15', signatureMeaning: 'Blend Uniformity Release', status: 'Verified' },
  { id: 'EVT-106', stage: '7. Compression', action: 'Rotary press compression; Hardness: 8.6 Kp, Friability: 0.15%', performedBy: 'K. Verma', role: 'Machine Specialist', timestamp: '2026-08-22 15:40:50', signatureMeaning: 'Core Tablet Release', status: 'Verified' },
  { id: 'EVT-107', stage: '8. Coating', action: 'Film coating completed; Weight gain: 3.1% w/w', performedBy: 'K. Verma', role: 'Machine Specialist', timestamp: '2026-08-22 17:15:00', signatureMeaning: 'Coating IPC Sign-off', status: 'Verified' },
  { id: 'EVT-108', stage: '9. Packaging & 10. Palletization', action: '17,850 blister packs aggregated onto Pallet PAL-2026-091', performedBy: 'A. Joseph', role: 'Packaging Lead', timestamp: '2026-08-22 18:30:12', signatureMeaning: 'Finished Batch Transfer', status: 'Verified' },
];

export const BatchReportDashboard: React.FC = () => {
  const [activeView, setActiveView] = useState<'ebpr' | 'analytics' | 'audit'>('ebpr');

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 font-sans text-slate-800">
      {/* Header Controls */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Electronic Batch Record (eBPR) & QA Review</h1>
            <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 text-xs font-semibold rounded-full">
              21 CFR Part 11 Certified
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Batch ID: <strong className="text-slate-800 font-mono">TAB-2026-004</strong> | Product: <strong>Paracetamol 500mg ER Tablets</strong>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex bg-white p-1 rounded-lg border border-slate-300 shadow-sm">
            <button
              onClick={() => setActiveView('ebpr')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${
                activeView === 'ebpr' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              📄 eBPR Document
            </button>
            <button
              onClick={() => setActiveView('analytics')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${
                activeView === 'analytics' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              📊 SPC Quality Trends
            </button>
            <button
              onClick={() => setActiveView('audit')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${
                activeView === 'audit' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              🔒 21 CFR Audit Trail
            </button>
          </div>

          <button
            onClick={handlePrint}
            className="flex items-center gap-2 bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded-lg text-xs font-semibold shadow-sm transition"
          >
            🖨️ Export PDF / Print
          </button>
        </div>
      </div>

      {/* VIEW 1: Formal eBPR Document */}
      {activeView === 'ebpr' && (
        <div className="bg-white rounded-xl border border-slate-300 shadow-sm p-8 max-w-5xl mx-auto space-y-6">
          {/* Pharma Header Banner */}
          <div className="border-b-2 border-slate-900 pb-4 flex justify-between items-end">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-slate-900">AMRITA PHARMACEUTICAL R&D LABORATORIES</h2>
              <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Master Electronic Batch Production Record (eBPR)</p>
            </div>
            <div className="text-right text-xs font-mono">
              <div>Doc Ref: <strong>eBPR-TAB-004-R2</strong></div>
              <div>Revision: <strong>v3.4 (Validated)</strong></div>
            </div>
          </div>

          {/* Batch Meta Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-lg border border-slate-200 text-xs">
            <div><span className="text-slate-500">Batch Number:</span> <strong className="block font-mono text-slate-900 text-sm">TAB-2026-004</strong></div>
            <div><span className="text-slate-500">Product Name:</span> <strong className="block text-slate-900 text-sm">Paracetamol 500mg ER</strong></div>
            <div><span className="text-slate-500">Batch Size:</span> <strong className="block text-slate-900 text-sm">100.0 kg</strong></div>
            <div><span className="text-slate-500">Yield Produced:</span> <strong className="block text-emerald-700 text-sm">178,500 Tablets (99.1%)</strong></div>
          </div>

          {/* Process Stage Summary Table */}
          <div>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3">10-Step Stage Parameter & IPC Summary</h3>
            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-100 font-semibold uppercase text-slate-700 border-b border-slate-200">
                  <tr>
                    <th className="p-2.5">Stage #</th>
                    <th className="p-2.5">Manufacturing Step</th>
                    <th className="p-2.5">Critical Process Parameter (CPP)</th>
                    <th className="p-2.5">Acceptance Limit</th>
                    <th className="p-2.5">Actual Measured</th>
                    <th className="p-2.5">Result</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="p-2.5 font-bold">1</td>
                    <td className="p-2.5 font-medium">Dispensing & Weighing</td>
                    <td className="p-2.5">Raw Material Barcode & Net Weights</td>
                    <td className="p-2.5">±0.5% Target Qty</td>
                    <td className="p-2.5 font-mono">100.0 kg (Exact)</td>
                    <td className="p-2.5"><span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-semibold">PASS</span></td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-bold">2</td>
                    <td className="p-2.5 font-medium">Granulation</td>
                    <td className="p-2.5">Impeller Speed & Kneading Time</td>
                    <td className="p-2.5">180 RPM / 15 ± 2 min</td>
                    <td className="p-2.5 font-mono">180 RPM / 15 min</td>
                    <td className="p-2.5"><span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-semibold">PASS</span></td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-bold">3</td>
                    <td className="p-2.5 font-medium">Fluid Bed Drying</td>
                    <td className="p-2.5">IPC: Loss on Drying (LOD)</td>
                    <td className="p-2.5">&lt; 2.0% w/w</td>
                    <td className="p-2.5 font-mono font-bold text-blue-700">1.4%</td>
                    <td className="p-2.5"><span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-semibold">PASS</span></td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-bold">4 & 5</td>
                    <td className="p-2.5 font-medium">Milling & Screening</td>
                    <td className="p-2.5">Mesh Sieve & Granule Recovery</td>
                    <td className="p-2.5">&gt; 98.5% Recovery</td>
                    <td className="p-2.5 font-mono">99.4%</td>
                    <td className="p-2.5"><span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-semibold">PASS</span></td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-bold">6</td>
                    <td className="p-2.5 font-medium">Lubrication Blending</td>
                    <td className="p-2.5">Octagonal Blender Duration</td>
                    <td className="p-2.5">10 min @ 15 RPM</td>
                    <td className="p-2.5 font-mono">10 min @ 15 RPM</td>
                    <td className="p-2.5"><span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-semibold">PASS</span></td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-bold">7</td>
                    <td className="p-2.5 font-medium">Tablet Compression</td>
                    <td className="p-2.5">Hardness & Friability</td>
                    <td className="p-2.5">8.5 ± 1.0 Kp / &lt; 0.8%</td>
                    <td className="p-2.5 font-mono">8.6 Kp / 0.15%</td>
                    <td className="p-2.5"><span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-semibold">PASS</span></td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-bold">8</td>
                    <td className="p-2.5 font-medium">Film Coating</td>
                    <td className="p-2.5">Coating Weight Gain</td>
                    <td className="p-2.5">3.0 ± 0.5% w/w</td>
                    <td className="p-2.5 font-mono">3.1%</td>
                    <td className="p-2.5"><span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-semibold">PASS</span></td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-bold">9 & 10</td>
                    <td className="p-2.5 font-medium">Packaging & Palletization</td>
                    <td className="p-2.5">Blister Integrity & Pallet ID</td>
                    <td className="p-2.5">10 tabs/pack | 24 cartons/pallet</td>
                    <td className="p-2.5 font-mono">17,850 packs / PAL-2026-091</td>
                    <td className="p-2.5"><span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-semibold">PASS</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* QA Final Sign-off Box */}
          <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-lg flex items-center justify-between">
            <div>
              <h4 className="text-xs font-bold text-emerald-900 uppercase">Quality Assurance Final Batch Release</h4>
              <p className="text-[11px] text-emerald-700">All 10 stages have completed within specified tolerances and 21 CFR Part 11 e-signatures.</p>
            </div>
            <div className="text-right text-xs">
              <div className="font-bold text-emerald-900">Dr. Sarah Lin, QA Director</div>
              <div className="text-[10px] text-emerald-700 font-mono">Digitally Signed: 2026-08-22 18:45:00 UTC</div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: SPC Quality Trends */}
      {activeView === 'analytics' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Metric 1: Hardness Chart Card */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm font-bold text-slate-800">Tablet Hardness Control Chart (Kp)</h3>
                <span className="text-[10px] px-2 py-0.5 bg-blue-100 text-blue-800 font-semibold rounded">Target: 8.5 Kp</span>
              </div>
              <div className="h-40 flex items-end gap-3 pt-6 px-2 border-b border-l border-slate-300">
                {[8.4, 8.6, 8.5, 8.7, 8.5, 8.6, 8.4, 8.6, 8.5].map((val, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
                    <span className="text-[10px] font-mono text-slate-500">{val}</span>
                    <div
                      className="w-full bg-blue-600 rounded-t transition-all group-hover:bg-blue-800"
                      style={{ height: `${(val / 10) * 100}%` }}
                    ></div>
                    <span className="text-[9px] text-slate-400">S{i + 1}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between text-[10px] text-slate-500 mt-2">
                <span>LCL: 7.5 Kp</span>
                <span>Mean: 8.53 Kp</span>
                <span>UCL: 9.5 Kp</span>
              </div>
            </div>

            {/* Metric 2: LOD % Trend */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm font-bold text-slate-800">FBD Loss on Drying (LOD %)</h3>
                <span className="text-[10px] px-2 py-0.5 bg-emerald-100 text-emerald-800 font-semibold rounded">Limit &lt; 2.0%</span>
              </div>
              <div className="h-40 flex items-end gap-4 pt-6 px-4 border-b border-l border-slate-300">
                {[
                  { time: '10 min', val: 5.2 },
                  { time: '20 min', val: 3.1 },
                  { time: '30 min', val: 1.8 },
                  { time: '35 min', val: 1.4 },
                ].map((item, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-[10px] font-mono font-bold text-emerald-700">{item.val}%</span>
                    <div
                      className="w-full bg-emerald-600 rounded-t"
                      style={{ height: `${(item.val / 6) * 100}%` }}
                    ></div>
                    <span className="text-[9px] text-slate-400">{item.time}</span>
                  </div>
                ))}
              </div>
              <div className="text-[10px] text-center text-slate-500 mt-2">Target moisture endpoint achieved at 35 min</div>
            </div>

            {/* Metric 3: Stage Yield Recovery */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm font-bold text-slate-800">Stage-Wise Material Yield (%)</h3>
                <span className="text-[10px] px-2 py-0.5 bg-indigo-100 text-indigo-800 font-semibold rounded">Overall: 99.1%</span>
              </div>
              <div className="space-y-3 pt-2">
                {[
                  { stage: 'Dispensing', pct: 100.0 },
                  { stage: 'Granulation & Drying', pct: 99.6 },
                  { stage: 'Milling & Screening', pct: 99.4 },
                  { stage: 'Compression', pct: 99.2 },
                  { stage: 'Coating & Packaging', pct: 99.1 },
                ].map((s, i) => (
                  <div key={i}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-600 font-medium">{s.stage}</span>
                      <span className="font-mono font-bold text-slate-900">{s.pct}%</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div className="bg-indigo-600 h-full rounded-full" style={{ width: `${s.pct}%` }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 3: 21 CFR Part 11 Audit Trail Table */}
      {activeView === 'audit' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Immutable Electronic Audit Log (21 CFR Part 11)</h3>
              <p className="text-xs text-slate-500">Cryptographically stamped stage transitions and user authentications.</p>
            </div>
            <span className="text-xs px-2.5 py-1 bg-slate-200 text-slate-700 font-mono rounded">Total Records: {AUDIT_TRAIL.length}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-100 uppercase font-semibold text-slate-700 border-b border-slate-200">
                <tr>
                  <th className="p-3">Event ID</th>
                  <th className="p-3">Manufacturing Stage</th>
                  <th className="p-3">Action Performed</th>
                  <th className="p-3">Signer & Role</th>
                  <th className="p-3">Meaning of Signature</th>
                  <th className="p-3">Timestamp (UTC)</th>
                  <th className="p-3 text-right">Integrity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {AUDIT_TRAIL.map((evt) => (
                  <tr key={evt.id} className="hover:bg-slate-50">
                    <td className="p-3 font-mono font-bold text-blue-700">{evt.id}</td>
                    <td className="p-3 font-semibold text-slate-900">{evt.stage}</td>
                    <td className="p-3 text-slate-600">{evt.action}</td>
                    <td className="p-3">
                      <div className="font-bold text-slate-800">{evt.performedBy}</div>
                      <div className="text-[10px] text-slate-400">{evt.role}</div>
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded border border-blue-200 text-[10px] font-medium">
                        {evt.signatureMeaning}
                      </span>
                    </td>
                    <td className="p-3 font-mono text-slate-500">{evt.timestamp}</td>
                    <td className="p-3 text-right">
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-semibold text-[10px]">
                        ✓ {evt.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};