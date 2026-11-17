import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  ClipboardCheck,
  Copy,
  Edit3,
  Eye,
  FileEdit,
  History,
  Plus,
  Printer,
  Trash2,
  Users,
  XCircle,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  createInitialCylinderSchedule,
  formatDdMmYy,
  MONTH_NAMES,
  WEEKDAY_LABELS,
} from '../data/oxygenCylinderSeed';
import type { PermissionLevel } from '../types/auth';
import type {
  CheckingWeekday,
  CylinderMonthlySchedule,
  CylinderWeekRowRecord,
  CylinderWeekStaffMember,
  OxygenCheckLog,
  OxygenCylinder,
} from '../types/ward';
import {
  daysBetween,
  formatShortDate,
  getCylinderPressureState,
  getTodayIso,
} from '../utils/dateUtils';
import {
  type CylinderPrintLayoutMode,
  type CylinderPrintWeekScope,
  OxygenCylinderPrintView,
} from './OxygenCylinderPrintView';
import { ReadOnlyBanner, ReadOnlySurface } from './ReadOnlyBanner';

interface OxygenCylinderViewProps {
  cylinders: OxygenCylinder[];
  logs: OxygenCheckLog[];
  defaultInspector: string;
  cylinderSchedule?: CylinderMonthlySchedule;
  onUpdateSchedule: (
    patch: Partial<
      Pick<CylinderMonthlySchedule, 'wardLocation' | 'month' | 'year' | 'checkDayOfWeek'>
    >
  ) => void;
  onUpdateWeekDate: (weekNumber: number, checkDate: string) => void;
  onUpdateWeekStaff: (weekNumber: number, assignedStaff: CylinderWeekStaffMember[]) => void;
  onCopyWeek1StaffToAll: () => void;
  onUpdateWeekRecord: (
    weekNumber: number,
    cylinderId: string,
    recordPatch: Partial<CylinderWeekRowRecord>
  ) => void;
  onLogCheck: (
    cylinderId: string,
    payload: {
      pressurePsi: number;
      valveAndLeakCheck: boolean;
      securedInRack: boolean;
      conditionStatus?: string;
      spareAvailable?: boolean;
      weekNumber?: number;
      inspector: string;
      notes: string;
    }
  ) => void;
  onUpdateCylinder: (cylinderId: string, patch: Partial<OxygenCylinder>) => void;
  onAddCylinder: (cyl: Omit<OxygenCylinder, 'id'>) => void;
  onDeleteCylinder: (cylinderId: string) => void;
  permission?: PermissionLevel;
}

export function OxygenCylinderView({
  cylinders,
  logs,
  defaultInspector,
  cylinderSchedule,
  onUpdateSchedule,
  onUpdateWeekDate,
  onUpdateWeekStaff,
  onCopyWeek1StaffToAll,
  onUpdateWeekRecord,
  onLogCheck,
  onUpdateCylinder,
  onAddCylinder,
  onDeleteCylinder,
  permission = 'full',
}: OxygenCylinderViewProps) {
  const canEdit = permission === 'edit' || permission === 'full';
  const canFull = permission === 'full';
  const today = getTodayIso();
  const schedule = useMemo(
    () => cylinderSchedule || createInitialCylinderSchedule(today),
    [cylinderSchedule, today]
  );

  const [viewMode, setViewMode] = useState<'editor' | 'print-preview'>('editor');
  const [printLayout, setPrintLayout] =
    useState<CylinderPrintLayoutMode>('two-weeks-per-page');
  const [printWeekScope, setPrintWeekScope] = useState<CylinderPrintWeekScope>('all');
  const [showAssignedStaffInCells, setShowAssignedStaffInCells] = useState(true);
  const [activeWeekNum, setActiveWeekNum] = useState<number>(1);

  const safeActiveWeekNum =
    schedule.weeks.some((w) => w.weekNumber === activeWeekNum)
      ? activeWeekNum
      : schedule.weeks[0]?.weekNumber || 1;
  const activeWeek =
    schedule.weeks.find((w) => w.weekNumber === safeActiveWeekNum) || schedule.weeks[0];

  // Log Weekly Check Modal State
  const [checkingCylinder, setCheckingCylinder] = useState<OxygenCylinder | null>(null);
  const [pressureInput, setPressureInput] = useState(2000);
  const [conditionInput, setConditionInput] = useState('GOOD/ green');
  const [valveOk, setValveOk] = useState(true);
  const [spareOk, setSpareOk] = useState(true);
  const [securedOk, setSecuredOk] = useState(true);
  const [inspector, setInspector] = useState(defaultInspector);
  const [notes, setNotes] = useState('');

  // Add / Edit Cylinder Modal State
  const [showCylModal, setShowCylModal] = useState(false);
  const [editingCylinder, setEditingCylinder] = useState<OxygenCylinder | null>(null);
  const [formCode, setFormCode] = useState('');
  const [formLocation, setFormLocation] = useState('208 CCU');
  const [formUnit, setFormUnit] = useState<'CCU' | 'SD' | 'General Ward'>('CCU');
  const [formSizeLiters, setFormSizeLiters] = useState<number>(500);
  const [formFillingDate, setFormFillingDate] = useState('');
  const [formPressure, setFormPressure] = useState(2000);
  const [formGasType, setFormGasType] = useState('OXYGEN');
  const [formCylType, setFormCylType] = useState('Aluminium');
  const [formCondition, setFormCondition] = useState('GOOD/ green');
  const [formValveOk, setFormValveOk] = useState(true);
  const [formSpareOk, setFormSpareOk] = useState(true);
  const [formHydroDate, setFormHydroDate] = useState('2028-06-01');
  const [formNotes, setFormNotes] = useState('');

  const stats = useMemo(() => {
    let critical = 0;
    let overdueCheck = 0;

    for (const c of cylinders) {
      const pState = getCylinderPressureState(c);
      if (pState.state === 'critical' || !c.valveAndLeakCheck || !c.securedInRack) {
        critical += 1;
      }
      if (daysBetween(c.lastCheckedDate, today) >= 7) {
        overdueCheck += 1;
      }
    }
    return { total: cylinders.length, critical, overdueCheck };
  }, [cylinders, today]);

  const openCheckModal = (cyl: OxygenCylinder) => {
    if (!canEdit) return;
    const rec = activeWeek?.records?.[cyl.id];
    const weekStaffNames = (activeWeek?.assignedStaff || [])
      .map((s) => s.staffName.trim())
      .filter(Boolean)
      .join(', ');
    setCheckingCylinder(cyl);
    setPressureInput(rec?.pressurePsi ?? cyl.pressurePsi);
    setConditionInput(rec?.conditionStatus ?? cyl.conditionStatus ?? 'GOOD/ green');
    setValveOk(rec?.valveFunctioning ?? cyl.valveAndLeakCheck);
    setSpareOk(rec?.spareAvailable ?? cyl.spareAvailable ?? true);
    setSecuredOk(cyl.securedInRack);
    setInspector(rec?.checkedBy?.trim() || weekStaffNames || defaultInspector);
    setNotes(rec?.remarks ?? cyl.notes ?? '');
  };

  const handleSaveCheck = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit || !checkingCylinder) return;
    onLogCheck(checkingCylinder.id, {
      pressurePsi: Math.max(0, Math.min(2500, Number(pressureInput) || 0)),
      valveAndLeakCheck: valveOk,
      securedInRack: securedOk,
      conditionStatus: conditionInput.trim() || 'GOOD/ green',
      spareAvailable: spareOk,
      weekNumber: safeActiveWeekNum,
      inspector: inspector.trim() || defaultInspector,
      notes: notes.trim(),
    });
    setCheckingCylinder(null);
  };

  const openAddCylinder = () => {
    if (!canFull) return;
    setEditingCylinder(null);
    setFormCode('');
    setFormLocation(schedule.wardLocation || '208 CCU');
    setFormUnit('CCU');
    setFormSizeLiters(500);
    setFormFillingDate(formatDdMmYy(today));
    setFormPressure(2000);
    setFormGasType('OXYGEN');
    setFormCylType('Aluminium');
    setFormCondition('GOOD/ green');
    setFormValveOk(true);
    setFormSpareOk(true);
    setFormHydroDate('2028-06-01');
    setFormNotes('');
    setShowCylModal(true);
  };

  const openEditCylinder = (cyl: OxygenCylinder) => {
    if (!canEdit) return;
    setEditingCylinder(cyl);
    setFormCode(cyl.cylinderCode);
    setFormLocation(cyl.location);
    setFormUnit(cyl.unit);
    setFormSizeLiters(
      cyl.sizeLiters ?? (cyl.size === 'H/J-Cylinder (Backup)' ? 1000 : 500)
    );
    setFormFillingDate(cyl.dateOfFilling ?? '');
    setFormPressure(cyl.pressurePsi);
    setFormGasType(cyl.typeOfGas ?? 'OXYGEN');
    setFormCylType(cyl.cylinderType ?? 'Aluminium');
    setFormCondition(cyl.conditionStatus ?? 'GOOD/ green');
    setFormValveOk(cyl.valveAndLeakCheck);
    setFormSpareOk(cyl.spareAvailable ?? true);
    setFormHydroDate(cyl.hydrostaticExpiry || '2028-06-01');
    setFormNotes(cyl.notes);
    setShowCylModal(true);
  };

  const handleSaveCylinder = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingCylinder ? !canEdit : !canFull) return;
    if (!formCode.trim()) return;
    const liters = Math.max(100, Number(formSizeLiters) || 500);
    const derivedSize: OxygenCylinder['size'] =
      liters >= 1000 ? 'H/J-Cylinder (Backup)' : 'E-Cylinder (Portable)';

    const payload: Omit<OxygenCylinder, 'id'> = {
      cylinderCode: formCode.trim().toUpperCase(),
      location: formLocation.trim() || schedule.wardLocation || '208 CCU',
      unit: formUnit,
      size: derivedSize,
      sizeLiters: liters,
      dateOfFilling: formFillingDate.trim(),
      typeOfGas: formGasType.trim() || 'OXYGEN',
      cylinderType: formCylType.trim() || 'Aluminium',
      conditionStatus: formCondition.trim() || 'GOOD/ green',
      spareAvailable: formSpareOk,
      pressurePsi: Math.max(0, Math.min(2500, Number(formPressure) || 0)),
      minThresholdPsi: 500,
      valveAndLeakCheck: formValveOk,
      securedInRack: true,
      hydrostaticExpiry: formHydroDate || '2028-06-01',
      lastCheckedDate: editingCylinder?.lastCheckedDate || today,
      lastCheckedBy: editingCylinder?.lastCheckedBy || defaultInspector,
      notes: formNotes.trim(),
    };

    if (editingCylinder) {
      onUpdateCylinder(editingCylinder.id, payload);
    } else {
      onAddCylinder(payload);
    }
    setShowCylModal(false);
  };

  const updateStaffField = (
    weekNumber: number,
    staffIdx: number,
    field: keyof CylinderWeekStaffMember,
    value: string
  ) => {
    if (!canEdit) return;
    const wk = schedule.weeks.find((w) => w.weekNumber === weekNumber);
    if (!wk) return;
    const next = wk.assignedStaff.map((st, idx) =>
      idx === staffIdx ? { ...st, [field]: value } : st
    );
    onUpdateWeekStaff(weekNumber, next);
  };

  const addStaffToWeek = (weekNumber: number) => {
    if (!canEdit) return;
    const wk = schedule.weeks.find((w) => w.weekNumber === weekNumber);
    if (!wk) return;
    const next: CylinderWeekStaffMember[] = [
      ...wk.assignedStaff,
      {
        id: `cyl-w${weekNumber}-st-${Date.now().toString(36)}`,
        staffName: '',
        role: 'Staff Nurse',
        signature: '',
      },
    ];
    onUpdateWeekStaff(weekNumber, next);
  };

  const removeStaffFromWeek = (weekNumber: number, staffIdx: number) => {
    if (!canEdit) return;
    const wk = schedule.weeks.find((w) => w.weekNumber === weekNumber);
    if (!wk || wk.assignedStaff.length <= 1) return;
    onUpdateWeekStaff(
      weekNumber,
      wk.assignedStaff.filter((_, idx) => idx !== staffIdx)
    );
  };

  const monthName = MONTH_NAMES[(schedule.month - 1 + 12) % 12] || 'January';
  const dayName = WEEKDAY_LABELS[schedule.checkDayOfWeek] || 'Sunday';

  return (
    <div className="space-y-5">
      <ReadOnlyBanner permission={permission} sectionLabel="Oxygen Cylinders" />
      {/* Header Summary & Monthly Schedule / Print Controls */}
      <div className="no-print bg-white border border-slate-200 rounded-lg p-5 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Weekly Oxygen Cylinders Assessment Checklist
            </h2>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl">
              Monthly weekly check schedule ({schedule.weeks.length} checks in {monthName}{' '}
              {schedule.year}, every {dayName}) tracking cylinder location, batch number, size
              (ltr), filling date, pressure (PSI), gas/cylinder type, condition, regulator/valve,
              spares, and assigned staff per week.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-6 text-right">
            <div>
              <div className="text-[11px] font-medium text-slate-500">Cylinders</div>
              <div className="text-xl font-semibold font-mono tabular-nums text-slate-900">
                {stats.total}
              </div>
            </div>
            <div>
              <div className="text-[11px] font-medium text-slate-500">Checks This Month</div>
              <div className="text-xl font-semibold font-mono tabular-nums text-teal-800">
                {schedule.weeks.length}x
              </div>
            </div>
            <div>
              <div className="text-[11px] font-medium text-slate-500">Critical / Fault</div>
              <div
                className={`text-xl font-semibold font-mono tabular-nums ${
                  stats.critical > 0 ? 'text-rose-700' : 'text-emerald-700'
                }`}
              >
                {stats.critical}
              </div>
            </div>
            <div>
              <div className="text-[11px] font-medium text-slate-500">Check Due</div>
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

        {/* Monthly Schedule Bar & Print Controls */}
        <div className="pt-4 border-t border-slate-200 space-y-3">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <ReadOnlySurface readOnly={!canEdit}>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 flex-1 min-w-[320px] max-w-3xl">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  Ward / Location
                </label>
                <input
                  type="text"
                  value={schedule.wardLocation}
                  onChange={(e) => onUpdateSchedule({ wardLocation: e.target.value })}
                  placeholder="208 CCU"
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">Month</label>
                <select
                  value={schedule.month}
                  onChange={(e) => onUpdateSchedule({ month: Number(e.target.value) })}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
                >
                  {MONTH_NAMES.map((name, idx) => (
                    <option key={name} value={idx + 1}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">Year</label>
                <input
                  type="number"
                  min={2020}
                  max={2099}
                  value={schedule.year}
                  onChange={(e) => {
                    const yr = Number(e.target.value);
                    if (yr >= 2020 && yr <= 2099) onUpdateSchedule({ year: yr });
                  }}
                  className="w-full px-2.5 py-1.5 text-xs font-mono border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  Checking Day ({schedule.weeks.length} wks)
                </label>
                <select
                  value={schedule.checkDayOfWeek}
                  onChange={(e) =>
                    onUpdateSchedule({ checkDayOfWeek: Number(e.target.value) as CheckingWeekday })
                  }
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
                >
                  {WEEKDAY_LABELS.map((label, idx) => (
                    <option key={label} value={idx}>
                      Every {label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            </ReadOnlySurface>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <select
                value={printWeekScope === 'all' ? 'all' : String(printWeekScope)}
                onChange={(e) =>
                  setPrintWeekScope(e.target.value === 'all' ? 'all' : Number(e.target.value))
                }
                title="Select full month or individual week to print"
                className="px-2.5 py-1.5 text-xs font-medium text-slate-800 bg-slate-100 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700"
              >
                <option value="all">Full Month ({schedule.weeks.length} Weeks)</option>
                {schedule.weeks.map((wk) => (
                  <option key={wk.weekNumber} value={wk.weekNumber}>
                    Week {wk.weekNumber} Only ({formatDdMmYy(wk.checkDate)})
                  </option>
                ))}
              </select>

              <div
                className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg"
                title="Choose printout page density"
              >
                <button
                  type="button"
                  onClick={() => setPrintLayout('two-weeks-per-page')}
                  className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                    printLayout === 'two-weeks-per-page'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  2 Weeks / Page
                </button>
                <button
                  type="button"
                  onClick={() => setPrintLayout('one-week-per-page')}
                  className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                    printLayout === 'one-week-per-page'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  1 Week / Page
                </button>
              </div>

              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
                <button
                  type="button"
                  onClick={() => setViewMode('editor')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                    viewMode === 'editor'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <FileEdit className="w-3.5 h-3.5" />
                  Edit &amp; Schedule
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('print-preview')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                    viewMode === 'print-preview'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  Print Preview
                </button>
              </div>

              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-teal-700 hover:bg-teal-800 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                Print Checklist (A4)
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
            <div className="flex flex-wrap items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-teal-700" />
              <span className="font-medium text-slate-700">
                Scheduled {dayName}s in {monthName} {schedule.year}:
              </span>
              {schedule.weeks.map((wk) => (
                <span
                  key={`pill-w${wk.weekNumber}`}
                  className="font-mono text-[11px] bg-slate-100 text-slate-800 px-2 py-0.5 rounded"
                >
                  W{wk.weekNumber}: {formatDdMmYy(wk.checkDate)}
                </span>
              ))}
            </div>

            <label className="inline-flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showAssignedStaffInCells}
                onChange={(e) => setShowAssignedStaffInCells(e.target.checked)}
                className="rounded border-slate-300 text-teal-700 focus:ring-teal-700"
              />
              <span>Pre-fill Assigned Staff in &ldquo;Checked By&rdquo; column on printout</span>
            </label>
          </div>
        </div>
      </div>

      {/* Assigned Staff per Week Schedule Card */}
      {viewMode === 'editor' && (
        <ReadOnlySurface readOnly={!canEdit}>
        <section className="no-print bg-white border border-slate-200 rounded-lg p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-teal-700" />
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Assigned Staff by Week ({monthName} {schedule.year} &middot; {schedule.weeks.length}{' '}
                  Weekly Checks)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Assign one or more staff members to each weekly check. Dates auto-calculate for
                  every {dayName} (4 or 5 times per month) and can be adjusted individually.
                </p>
              </div>
            </div>

            {canEdit && (
              <button
                type="button"
                onClick={onCopyWeek1StaffToAll}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-teal-800 bg-teal-50 hover:bg-teal-100 rounded-md transition-colors cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                Copy Week 1 Staff to All Weeks
              </button>
            )}
          </div>

          <div className="space-y-3">
            {schedule.weeks.map((wk) => (
              <div
                key={`sched-wk-${wk.weekNumber}`}
                className="border border-slate-200 rounded-md overflow-hidden"
              >
                <div className="bg-slate-50 px-3.5 py-2 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-xs font-bold text-slate-900">
                      Week {wk.weekNumber}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-slate-500">Check Date:</span>
                      <input
                        type="date"
                        value={wk.checkDate}
                        onChange={(e) => {
                          if (e.target.value) onUpdateWeekDate(wk.weekNumber, e.target.value);
                        }}
                        className="px-2 py-0.5 text-xs font-mono bg-white border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-teal-700"
                      />
                      <span className="font-mono text-[11px] text-slate-500">
                        ({formatDdMmYy(wk.checkDate)})
                      </span>
                    </div>
                  </div>

                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => addStaffToWeek(wk.weekNumber)}
                      className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-teal-800 bg-teal-50 hover:bg-teal-100 rounded transition-colors cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      Add Staff to Week {wk.weekNumber}
                    </button>
                  )}
                </div>

                <div className="p-2.5 space-y-2 bg-white">
                  {wk.assignedStaff.map((st, stIdx) => (
                    <div
                      key={st.id}
                      className="grid grid-cols-1 sm:grid-cols-[1fr_190px_180px_36px] gap-2 items-center"
                    >
                      <input
                        type="text"
                        value={st.staffName}
                        onChange={(e) =>
                          updateStaffField(wk.weekNumber, stIdx, 'staffName', e.target.value)
                        }
                        placeholder={`Week ${wk.weekNumber} staff ${stIdx + 1} full name`}
                        className="w-full px-2.5 py-1 text-xs border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-teal-700"
                      />
                      <input
                        type="text"
                        value={st.role}
                        onChange={(e) =>
                          updateStaffField(wk.weekNumber, stIdx, 'role', e.target.value)
                        }
                        placeholder="Role (e.g., Charge Nurse)"
                        className="w-full px-2.5 py-1 text-xs border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-teal-700"
                      />
                      <input
                        type="text"
                        value={st.signature}
                        onChange={(e) =>
                          updateStaffField(wk.weekNumber, stIdx, 'signature', e.target.value)
                        }
                        placeholder="Signature / Initials"
                        className="w-full px-2.5 py-1 text-xs border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-teal-700"
                      />
                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => removeStaffFromWeek(wk.weekNumber, stIdx)}
                          disabled={wk.assignedStaff.length <= 1}
                          title="Remove staff member"
                          className="p-1.5 text-slate-400 hover:text-rose-700 disabled:opacity-30 disabled:cursor-not-allowed rounded transition-colors cursor-pointer justify-self-center"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
        </ReadOnlySurface>
      )}

      {/* Cylinders Table (Editor Mode) */}
      {viewMode === 'editor' && (
        <section className="no-print bg-white border border-slate-200 rounded-lg">
          <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="text-sm font-semibold text-slate-900">
                Cylinder Weekly Register
              </div>
              <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg">
                {schedule.weeks.map((wk) => (
                  <button
                    key={`tab-wk-${wk.weekNumber}`}
                    type="button"
                    onClick={() => setActiveWeekNum(wk.weekNumber)}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                      safeActiveWeekNum === wk.weekNumber
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Week {wk.weekNumber} ({formatDdMmYy(wk.checkDate)})
                  </button>
                ))}
              </div>
            </div>

            {canFull && (
              <button
                type="button"
                onClick={openAddCylinder}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-teal-700 hover:bg-teal-800 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Cylinder
              </button>
            )}
          </div>

          <ReadOnlySurface readOnly={!canEdit}>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-medium text-slate-500">
                  <th className="py-2.5 px-3 text-center w-10">#</th>
                  <th className="py-2.5 px-3">Batch No. &amp; Location</th>
                  <th className="py-2.5 px-3">Size (ltr) &amp; Filling Date</th>
                  <th className="py-2.5 px-3 w-44">Pressure Level (PSI)</th>
                  <th className="py-2.5 px-3">Gas &amp; Cylinder Type</th>
                  <th className="py-2.5 px-3">Condition</th>
                  <th className="py-2.5 px-3">Regulator &amp; Spare</th>
                  <th className="py-2.5 px-3">Remarks</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs">
                {cylinders.map((cyl, idx) => {
                  const rec = activeWeek?.records?.[cyl.id];
                  const effectivePsi = rec?.pressurePsi ?? cyl.pressurePsi;
                  const effectiveCond =
                    rec?.conditionStatus ?? cyl.conditionStatus ?? 'GOOD/ green';
                  const effectiveValve = rec?.valveFunctioning ?? cyl.valveAndLeakCheck;
                  const effectiveSpare = rec?.spareAvailable ?? cyl.spareAvailable ?? true;
                  const effectiveRemarks = rec?.remarks ?? cyl.notes ?? '';
                  const sizeLiters =
                    cyl.sizeLiters ?? (cyl.size === 'H/J-Cylinder (Backup)' ? 1000 : 500);
                  const pState = getCylinderPressureState({
                    ...cyl,
                    pressurePsi: effectivePsi,
                  });

                  return (
                    <tr key={cyl.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3 text-center font-mono text-slate-500">
                        {idx + 1}
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-mono font-semibold text-slate-900">
                          {cyl.cylinderCode}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">{cyl.location}</div>
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="font-mono font-medium text-slate-900">
                          {sizeLiters} ltr
                        </div>
                        <div className="font-mono text-[11px] text-slate-500">
                          Fill: {formatDdMmYy(cyl.dateOfFilling) || '—'}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center justify-between mb-1">
                          <span
                            className={`font-mono font-semibold tabular-nums ${
                              pState.state === 'critical'
                                ? 'text-rose-700'
                                : pState.state === 'warning'
                                  ? 'text-amber-700'
                                  : 'text-emerald-700'
                            }`}
                          >
                            {effectivePsi} PSI
                          </span>
                          <span className="text-[10px] text-slate-500">{pState.label}</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${
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
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="font-medium text-slate-800">
                          {cyl.typeOfGas || 'OXYGEN'}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {cyl.cylinderType || 'Aluminium'}
                        </div>
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span
                          className={`font-medium ${
                            effectiveCond.toLowerCase().includes('good')
                              ? 'text-emerald-700'
                              : 'text-rose-700'
                          }`}
                        >
                          {effectiveCond}
                        </span>
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="space-y-0.5">
                          <button
                            type="button"
                            onClick={() =>
                              onUpdateWeekRecord(safeActiveWeekNum, cyl.id, {
                                valveFunctioning: !effectiveValve,
                              })
                            }
                            className={`inline-flex items-center gap-1 cursor-pointer ${
                              effectiveValve
                                ? 'text-emerald-700'
                                : 'text-rose-700 font-semibold'
                            }`}
                          >
                            {effectiveValve ? (
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            ) : (
                              <XCircle className="w-3.5 h-3.5" />
                            )}
                            Valve: {effectiveValve ? 'YES' : 'NO'}
                          </button>
                          <br />
                          <button
                            type="button"
                            onClick={() =>
                              onUpdateWeekRecord(safeActiveWeekNum, cyl.id, {
                                spareAvailable: !effectiveSpare,
                              })
                            }
                            className={`inline-flex items-center gap-1 cursor-pointer ${
                              effectiveSpare
                                ? 'text-emerald-700'
                                : 'text-amber-700 font-semibold'
                            }`}
                          >
                            {effectiveSpare ? (
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            ) : (
                              <AlertTriangle className="w-3.5 h-3.5" />
                            )}
                            Spare: {effectiveSpare ? 'YES' : 'NO'}
                          </button>
                        </div>
                      </td>
                      <td className="py-3 px-3 max-w-[180px]">
                        <div className="text-slate-600 truncate" title={effectiveRemarks}>
                          {effectiveRemarks || '—'}
                        </div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap text-right">
                        <div className="inline-flex items-center gap-1.5">
                          {canEdit && (
                            <>
                              <button
                                type="button"
                                onClick={() => openCheckModal(cyl)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-teal-800 bg-teal-50 hover:bg-teal-100 rounded transition-colors cursor-pointer"
                              >
                                <ClipboardCheck className="w-3.5 h-3.5" />
                                Check W{safeActiveWeekNum}
                              </button>
                              <button
                                type="button"
                                onClick={() => openEditCylinder(cyl)}
                                title="Edit cylinder master details"
                                className="p-1.5 text-slate-400 hover:text-slate-800 rounded transition-colors cursor-pointer"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                          {canFull && (
                            <button
                              type="button"
                              onClick={() => onDeleteCylinder(cyl.id)}
                              title="Remove cylinder"
                              className="p-1.5 text-slate-400 hover:text-rose-700 rounded transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          </ReadOnlySurface>
        </section>
      )}

      {/* Recent Weekly Inspection Log */}
      {viewMode === 'editor' && (
        <section className="no-print bg-white border border-slate-200 rounded-lg">
          <div className="px-5 py-3.5 border-b border-slate-200 flex items-center gap-2">
            <History className="w-4 h-4 text-slate-500" />
            <h3 className="text-sm font-semibold text-slate-900">Recent Oxygen Inspection Log</h3>
          </div>
          {logs.length === 0 ? (
            <div className="p-6 text-xs text-slate-500">No inspection logs recorded yet.</div>
          ) : (
            <div className="divide-y divide-slate-200">
              {logs.slice(0, 6).map((log) => (
                <div
                  key={log.id}
                  className="px-5 py-2.5 flex flex-wrap items-center justify-between gap-4 text-xs"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-semibold text-slate-900">
                      {log.cylinderCode}
                    </span>
                    <span className="font-mono tabular-nums text-slate-700">
                      {log.pressurePsi} PSI
                    </span>
                    <span className="text-slate-500">
                      {log.valvePass && log.securedPass
                        ? 'Valve & Restraint Passed'
                        : 'Safety Fault Flagged'}
                    </span>
                    {log.notes && <span className="text-slate-500">&middot; {log.notes}</span>}
                  </div>
                  <div className="text-slate-500 font-mono tabular-nums">
                    {formatShortDate(log.checkedDate)} &middot; {log.inspector}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Official Monthly Weekly Assessment Checklist Printable View */}
      <div
        className={
          viewMode === 'print-preview'
            ? 'block overflow-x-auto pb-4'
            : 'hidden print-only-block'
        }
      >
        <OxygenCylinderPrintView
          cylinders={cylinders}
          schedule={schedule}
          layoutMode={printLayout}
          weekScope={printWeekScope}
          showAssignedStaffInCells={showAssignedStaffInCells}
        />
      </div>

      {/* Log Weekly Check Modal */}
      {canEdit && checkingCylinder && (
        <div className="no-print fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-lg w-full max-w-md shadow-lg">
            <div className="px-5 py-4 border-b border-slate-200">
              <h3 className="text-base font-semibold text-slate-900">
                Week {safeActiveWeekNum} Check: Batch {checkingCylinder.cylinderCode}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {checkingCylinder.location} &middot; Scheduled Date:{' '}
                {formatDdMmYy(activeWeek?.checkDate)}
              </p>
            </div>
            <form onSubmit={handleSaveCheck} className="p-5 space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-slate-700">
                    Pressure Level (PSI)
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
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Cylinder Condition (Good/Damaged/Leaking/Colour)
                </label>
                <input
                  type="text"
                  value={conditionInput}
                  onChange={(e) => setConditionInput(e.target.value)}
                  placeholder="GOOD/ green"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
                />
              </div>

              <div className="space-y-2 pt-1">
                <label className="flex items-center gap-2 text-xs text-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={valveOk}
                    onChange={(e) => setValveOk(e.target.checked)}
                    className="rounded border-slate-300 text-teal-700 focus:ring-teal-700"
                  />
                  Regulator &amp; Valve Functioning (YES)
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={spareOk}
                    onChange={(e) => setSpareOk(e.target.checked)}
                    className="rounded border-slate-300 text-teal-700 focus:ring-teal-700"
                  />
                  Availability of Spare Cylinders (YES)
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
                  Checked By (Name &amp; Signature)
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
                  Remarks / Issues Noted
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
                  Save Week {safeActiveWeekNum} Check
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add / Edit Cylinder Modal */}
      {(canEdit || canFull) && showCylModal && (
        <div className="no-print fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-lg w-full max-w-lg shadow-lg">
            <div className="px-5 py-4 border-b border-slate-200">
              <h3 className="text-base font-semibold text-slate-900">
                {editingCylinder
                  ? `Edit Cylinder (${editingCylinder.cylinderCode})`
                  : 'Register Oxygen Cylinder'}
              </h3>
            </div>
            <form onSubmit={handleSaveCylinder} className="p-5 space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Cylinder Batch Number
                  </label>
                  <input
                    type="text"
                    required
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value)}
                    placeholder="e.g., 5J54"
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Cylinder Location
                  </label>
                  <input
                    type="text"
                    required
                    value={formLocation}
                    onChange={(e) => setFormLocation(e.target.value)}
                    placeholder="e.g., 208 CCU"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Cylinder Size (ltr)
                  </label>
                  <input
                    type="number"
                    min={100}
                    max={10000}
                    step={50}
                    value={formSizeLiters}
                    onChange={(e) => setFormSizeLiters(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Date of Filling
                  </label>
                  <input
                    type="text"
                    value={formFillingDate}
                    onChange={(e) => setFormFillingDate(e.target.value)}
                    placeholder="DD-MM-YY"
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Pressure (PSI)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={2500}
                    value={formPressure}
                    onChange={(e) => setFormPressure(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Type of GAS
                  </label>
                  <input
                    type="text"
                    value={formGasType}
                    onChange={(e) => setFormGasType(e.target.value)}
                    placeholder="OXYGEN"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Type of Cylinder
                  </label>
                  <input
                    type="text"
                    value={formCylType}
                    onChange={(e) => setFormCylType(e.target.value)}
                    placeholder="Aluminium"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Unit</label>
                  <select
                    value={formUnit}
                    onChange={(e) =>
                      setFormUnit(e.target.value as 'CCU' | 'SD' | 'General Ward')
                    }
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
                  >
                    <option value="CCU">CCU</option>
                    <option value="SD">SD</option>
                    <option value="General Ward">General Ward</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Cylinder Condition
                  </label>
                  <input
                    type="text"
                    value={formCondition}
                    onChange={(e) => setFormCondition(e.target.value)}
                    placeholder="GOOD/ green"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Hydrostatic Exp.
                  </label>
                  <input
                    type="date"
                    value={formHydroDate}
                    onChange={(e) => setFormHydroDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-6 pt-1">
                <label className="flex items-center gap-2 text-xs text-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formValveOk}
                    onChange={(e) => setFormValveOk(e.target.checked)}
                    className="rounded border-slate-300 text-teal-700 focus:ring-teal-700"
                  />
                  Regulator &amp; Valve Functioning (YES)
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formSpareOk}
                    onChange={(e) => setFormSpareOk(e.target.checked)}
                    className="rounded border-slate-300 text-teal-700 focus:ring-teal-700"
                  />
                  Spare Cylinders Available (YES)
                </label>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Remarks / Issues Noted
                </label>
                <input
                  type="text"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCylModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-medium text-white bg-teal-700 hover:bg-teal-800 rounded-md transition-colors cursor-pointer"
                >
                  {editingCylinder ? 'Save Changes' : 'Add Cylinder'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
