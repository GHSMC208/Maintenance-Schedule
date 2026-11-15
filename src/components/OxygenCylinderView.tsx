import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  History,
  Plus,
  Trash2,
  XCircle,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import type { OxygenCheckLog, OxygenCylinder } from '../types/ward';
import {
  daysBetween,
  formatShortDate,
  getCylinderPressureState,
  getTodayIso,
} from '../utils/dateUtils';

interface OxygenCylinderViewProps {
  cylinders: OxygenCylinder[];
  logs: OxygenCheckLog[];
  defaultInspector: string;
  onLogCheck: (
    cylinderId: string,
    payload: {
      pressurePsi: number;
      valveAndLeakCheck: boolean;
      securedInRack: boolean;
      inspector: string;
      notes: string;
    }
  ) => void;
  onAddCylinder: (cyl: Omit<OxygenCylinder, 'id'>) => void;
  onDeleteCylinder: (cylinderId: string) => void;
}

export function OxygenCylinderView({
  cylinders,
  logs,
  defaultInspector,
  onLogCheck,
  onAddCylinder,
  onDeleteCylinder,
}: OxygenCylinderViewProps) {
  const today = getTodayIso();
  const [checkingCylinder, setCheckingCylinder] = useState<OxygenCylinder | null>(null);
  const [pressureInput, setPressureInput] = useState(1900);
  const [valveOk, setValveOk] = useState(true);
  const [securedOk, setSecuredOk] = useState(true);
  const [inspector, setInspector] = useState(defaultInspector);
  const [notes, setNotes] = useState('');

  const [showAddModal, setShowAddModal] = useState(false);
  const [newCode, setNewCode] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [newUnit, setNewUnit] = useState<'CCU' | 'SD' | 'General Ward'>('CCU');
  const [newSize, setNewSize] = useState<OxygenCylinder['size']>('E-Cylinder (Portable)');
  const [newPressure, setNewPressure] = useState(2000);
  const [newHydroDate, setNewHydroDate] = useState('2028-06-01');

  const stats = useMemo(() => {
    let critical = 0;
    let replaceSoon = 0;
    let overdueCheck = 0;

    for (const c of cylinders) {
      const pState = getCylinderPressureState(c);
      if (pState.state === 'critical' || !c.valveAndLeakCheck || !c.securedInRack) {
        critical += 1;
      } else if (pState.state === 'warning') {
        replaceSoon += 1;
      }
      if (daysBetween(c.lastCheckedDate, today) >= 7) {
        overdueCheck += 1;
      }
    }
    return { total: cylinders.length, critical, replaceSoon, overdueCheck };
  }, [cylinders, today]);

  const openCheckModal = (cyl: OxygenCylinder) => {
    setCheckingCylinder(cyl);
    setPressureInput(cyl.pressurePsi);
    setValveOk(cyl.valveAndLeakCheck);
    setSecuredOk(cyl.securedInRack);
    setInspector(defaultInspector);
    setNotes(cyl.notes);
  };

  const handleSaveCheck = (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkingCylinder) return;
    onLogCheck(checkingCylinder.id, {
      pressurePsi: Math.max(0, Math.min(2400, Number(pressureInput) || 0)),
      valveAndLeakCheck: valveOk,
      securedInRack: securedOk,
      inspector: inspector.trim() || defaultInspector,
      notes: notes.trim(),
    });
    setCheckingCylinder(null);
  };

  const handleAddCylinder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode.trim()) return;
    onAddCylinder({
      cylinderCode: newCode.trim().toUpperCase(),
      location: newLocation.trim() || 'Ward Rack',
      unit: newUnit,
      size: newSize,
      pressurePsi: Math.max(0, Math.min(2400, Number(newPressure) || 0)),
      minThresholdPsi: 500,
      valveAndLeakCheck: true,
      securedInRack: true,
      hydrostaticExpiry: newHydroDate,
      lastCheckedDate: today,
      lastCheckedBy: defaultInspector,
      notes: 'Added to weekly cylinder inspection log.',
    });
    setNewCode('');
    setNewLocation('');
    setShowAddModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Header Summary */}
      <div className="bg-white border border-slate-200 rounded-lg p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Weekly Oxygen Cylinders Checking Tool
            </h2>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl">
              Verify cylinder gauge pressure (&ge; 500 PSI minimum safety threshold; &ge; 1800 PSI for
              emergency transport readiness), regulator valve leaks, chain restraint, and hydrostatic
              retest dates every 7 days.
            </p>
          </div>
          <div className="flex items-center gap-6 text-right">
            <div>
              <div className="text-[11px] font-medium text-slate-500">Active Cylinders</div>
              <div className="text-xl font-semibold font-mono tabular-nums text-slate-900">
                {stats.total}
              </div>
            </div>
            <div>
              <div className="text-[11px] font-medium text-slate-500">Critical / Low PSI</div>
              <div
                className={`text-xl font-semibold font-mono tabular-nums ${
                  stats.critical > 0 ? 'text-rose-700' : 'text-emerald-700'
                }`}
              >
                {stats.critical}
              </div>
            </div>
            <div>
              <div className="text-[11px] font-medium text-slate-500">Weekly Check Due</div>
              <div
                className={`text-xl font-semibold font-mono tabular-nums ${
                  stats.overdueCheck > 0 ? 'text-amber-700' : 'text-slate-900'
                }`}
              >
                {stats.overdueCheck}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cylinders Table */}
      <section className="bg-white border border-slate-200 rounded-lg">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between gap-4">
          <div className="text-sm font-semibold text-slate-900">
            Ward Oxygen Cylinder Register
          </div>
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-teal-700 hover:bg-teal-800 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Cylinder
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-medium text-slate-500">
                <th className="py-2.5 px-4">Cylinder ID &amp; Location</th>
                <th className="py-2.5 px-3">Size / Unit</th>
                <th className="py-2.5 px-3 w-56">Pressure Gauge (PSI)</th>
                <th className="py-2.5 px-3">Safety Checks</th>
                <th className="py-2.5 px-3">Hydro Test Exp.</th>
                <th className="py-2.5 px-3">Last Weekly Check</th>
                <th className="py-2.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm">
              {cylinders.map((cyl) => {
                const pState = getCylinderPressureState(cyl);
                const daysSinceCheck = daysBetween(cyl.lastCheckedDate, today);
                const checkDue = daysSinceCheck >= 7;

                return (
                  <tr key={cyl.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-mono font-semibold text-slate-900">
                        {cyl.cylinderCode}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">{cyl.location}</div>
                      {cyl.notes && (
                        <div className="text-[11px] text-slate-500 mt-0.5 max-w-xs truncate" title={cyl.notes}>
                          {cyl.notes}
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-3 whitespace-nowrap text-xs text-slate-700">
                      <div className="font-medium">{cyl.unit}</div>
                      <div className="text-slate-500">{cyl.size}</div>
                    </td>

                    <td className="py-3 px-3">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span
                          className={`font-mono font-semibold tabular-nums ${
                            pState.state === 'critical'
                              ? 'text-rose-700'
                              : pState.state === 'warning'
                                ? 'text-amber-700'
                                : 'text-emerald-700'
                          }`}
                        >
                          {cyl.pressurePsi} PSI
                        </span>
                        <span className="text-[11px] text-slate-500">{pState.label}</span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all ${
                            pState.state === 'critical'
                              ? 'bg-rose-600'
                              : pState.state === 'warning'
                                ? 'bg-amber-500'
                                : 'bg-emerald-600'
                          }`}
                          style={{ width: `${pState.pct}%` }}
                        />
                      </div>
                    </td>

                    <td className="py-3 px-3 whitespace-nowrap text-xs">
                      <div className="space-y-0.5">
                        <div
                          className={`inline-flex items-center gap-1 ${
                            cyl.valveAndLeakCheck ? 'text-emerald-700' : 'text-rose-700 font-medium'
                          }`}
                        >
                          {cyl.valveAndLeakCheck ? (
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          ) : (
                            <XCircle className="w-3.5 h-3.5" />
                          )}
                          Valve / No Leak
                        </div>
                        <br />
                        <div
                          className={`inline-flex items-center gap-1 ${
                            cyl.securedInRack ? 'text-emerald-700' : 'text-rose-700 font-medium'
                          }`}
                        >
                          {cyl.securedInRack ? (
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          ) : (
                            <XCircle className="w-3.5 h-3.5" />
                          )}
                          Chained / Secured
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-3 whitespace-nowrap font-mono tabular-nums text-xs text-slate-700">
                      {formatShortDate(cyl.hydrostaticExpiry)}
                    </td>

                    <td className="py-3 px-3 whitespace-nowrap text-xs">
                      <div className="font-mono tabular-nums text-slate-900">
                        {formatShortDate(cyl.lastCheckedDate)}
                      </div>
                      <div
                        className={`text-[11px] inline-flex items-center gap-1 ${
                          checkDue ? 'text-amber-700 font-medium' : 'text-slate-400'
                        }`}
                      >
                        {checkDue && <AlertTriangle className="w-3 h-3" />}
                        {checkDue ? `Due (${daysSinceCheck}d ago)` : cyl.lastCheckedBy}
                      </div>
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => openCheckModal(cyl)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-teal-800 bg-teal-50 hover:bg-teal-100 rounded transition-colors cursor-pointer"
                        >
                          <ClipboardCheck className="w-3.5 h-3.5" />
                          Log Weekly Check
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteCylinder(cyl.id)}
                          title="Remove cylinder"
                          className="p-1.5 text-slate-400 hover:text-rose-700 rounded transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Recent Weekly Inspection Log */}
      <section className="bg-white border border-slate-200 rounded-lg">
        <div className="px-5 py-3.5 border-b border-slate-200 flex items-center gap-2">
          <History className="w-4 h-4 text-slate-500" />
          <h3 className="text-sm font-semibold text-slate-900">Recent Oxygen Inspection Log</h3>
        </div>
        {logs.length === 0 ? (
          <div className="p-6 text-xs text-slate-500">No inspection logs recorded yet.</div>
        ) : (
          <div className="divide-y divide-slate-200">
            {logs.slice(0, 8).map((log) => (
              <div
                key={log.id}
                className="px-5 py-2.5 flex flex-wrap items-center justify-between gap-4 text-xs"
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono font-semibold text-slate-900">{log.cylinderCode}</span>
                  <span className="font-mono tabular-nums text-slate-700">{log.pressurePsi} PSI</span>
                  <span className="text-slate-500">
                    {log.valvePass && log.securedPass ? 'Valve & Restraint Passed' : 'Safety Fault Flagged'}
                  </span>
                  {log.notes && <span className="text-slate-500">· {log.notes}</span>}
                </div>
                <div className="text-slate-500 font-mono tabular-nums">
                  {formatShortDate(log.checkedDate)} · {log.inspector}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Log Weekly Check Modal */}
      {checkingCylinder && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-lg w-full max-w-md shadow-lg">
            <div className="px-5 py-4 border-b border-slate-200">
              <h3 className="text-base font-semibold text-slate-900">
                Weekly Oxygen Check: {checkingCylinder.cylinderCode}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">{checkingCylinder.location}</p>
            </div>
            <form onSubmit={handleSaveCheck} className="p-5 space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-slate-700">
                    Pressure Gauge Reading (PSI)
                  </label>
                  <span className="font-mono font-semibold text-sm text-teal-800 tabular-nums">
                    {pressureInput} PSI
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={2200}
                  step={50}
                  value={pressureInput}
                  onChange={(e) => setPressureInput(Number(e.target.value))}
                  className="w-full accent-teal-700"
                />
                <input
                  type="number"
                  min={0}
                  max={2500}
                  value={pressureInput}
                  onChange={(e) => setPressureInput(Number(e.target.value))}
                  className="mt-2 w-full px-3 py-1.5 text-sm font-mono border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
                />
                <div className="mt-1 text-[11px] text-slate-500">
                  Minimum safe operational threshold: {checkingCylinder.minThresholdPsi} PSI
                </div>
              </div>

              <div className="space-y-2 pt-1">
                <label className="flex items-center gap-2 text-xs text-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={valveOk}
                    onChange={(e) => setValveOk(e.target.checked)}
                    className="rounded border-slate-300 text-teal-700 focus:ring-teal-700"
                  />
                  Regulator, O-ring seal, and valve free of leaks / damage
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={securedOk}
                    onChange={(e) => setSecuredOk(e.target.checked)}
                    className="rounded border-slate-300 text-teal-700 focus:ring-teal-700"
                  />
                  Cylinder upright and properly chained / secured in bracket
                </label>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Inspector Name
                </label>
                <input
                  type="text"
                  required
                  value={inspector}
                  onChange={(e) => setInspector(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Check Notes / Action Taken
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCheckingCylinder(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-medium text-white bg-teal-700 hover:bg-teal-800 rounded-md transition-colors cursor-pointer"
                >
                  Record Weekly Check
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Cylinder Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-lg w-full max-w-md shadow-lg">
            <div className="px-5 py-4 border-b border-slate-200">
              <h3 className="text-base font-semibold text-slate-900">Register Oxygen Cylinder</h3>
            </div>
            <form onSubmit={handleAddCylinder} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Cylinder Code
                  </label>
                  <input
                    type="text"
                    required
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value)}
                    placeholder="e.g., O2-CCU-E05"
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Unit</label>
                  <select
                    value={newUnit}
                    onChange={(e) =>
                      setNewUnit(e.target.value as 'CCU' | 'SD' | 'General Ward')
                    }
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
                  >
                    <option value="CCU">CCU</option>
                    <option value="SD">SD</option>
                    <option value="General Ward">General Ward</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Location</label>
                <input
                  type="text"
                  required
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  placeholder="e.g., CCU Bed 04 Backup Rack"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Size</label>
                  <select
                    value={newSize}
                    onChange={(e) => setNewSize(e.target.value as OxygenCylinder['size'])}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
                  >
                    <option value="E-Cylinder (Portable)">E-Cylinder</option>
                    <option value="D-Cylinder">D-Cylinder</option>
                    <option value="H/J-Cylinder (Backup)">H/J-Cylinder</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Initial PSI
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={2500}
                    value={newPressure}
                    onChange={(e) => setNewPressure(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Hydro Exp.
                  </label>
                  <input
                    type="date"
                    value={newHydroDate}
                    onChange={(e) => setNewHydroDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-medium text-white bg-teal-700 hover:bg-teal-800 rounded-md transition-colors cursor-pointer"
                >
                  Add Cylinder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
