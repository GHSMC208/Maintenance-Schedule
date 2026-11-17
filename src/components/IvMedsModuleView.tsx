import {
  AlertTriangle,
  CalendarCheck,
  CheckCircle2,
  Edit3,
  Eye,
  FileEdit,
  Minus,
  Plus,
  Printer,
  RefreshCw,
  Trash2,
  Users,
  XCircle,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { IV_MEDS_GROUPS, inferIvMedsGroup, isIvMedNearExpiry } from '../data/ivMedsSeed';
import type { PermissionLevel } from '../types/auth';
import type {
  CategoryMeta,
  InventoryItem,
  IvMedsAuditMeta,
  IvMedsGroupId,
  IvMedsStaffAssignment,
  ScheduleTask,
} from '../types/ward';
import {
  formatShortDate,
  getExpiryStatus,
  getTaskDueState,
  getTodayIso,
} from '../utils/dateUtils';
import { IvMedsPrintView } from './IvMedsPrintView';
import { ReadOnlyBanner, ReadOnlySurface } from './ReadOnlyBanner';

interface IvMedsModuleViewProps {
  category: CategoryMeta;
  items: InventoryItem[];
  auditMeta: IvMedsAuditMeta;
  monthlyTask?: ScheduleTask;
  wardName: string;
  defaultInspector: string;
  onAddItem: (item: Omit<InventoryItem, 'id'>) => void;
  onUpdateItem: (itemId: string, patch: Partial<InventoryItem>) => void;
  onDeleteItem: (itemId: string) => void;
  onVerifyItem: (itemId: string, inspector: string) => void;
  onUpdateAuditMeta: (patch: Partial<IvMedsAuditMeta>) => void;
  onResyncFromForms: () => void;
  onCompleteMonthlyTask?: (
    taskId: string,
    inspector: string,
    outcome: 'completed' | 'follow-up',
    notes?: string
  ) => void;
  permission?: PermissionLevel;
}

export function IvMedsModuleView({
  category,
  items,
  auditMeta,
  monthlyTask,
  wardName,
  defaultInspector,
  onAddItem,
  onUpdateItem,
  onDeleteItem,
  onVerifyItem,
  onUpdateAuditMeta,
  onResyncFromForms,
  onCompleteMonthlyTask,
  permission = 'full',
}: IvMedsModuleViewProps) {
  const canEdit = permission === 'edit' || permission === 'full';
  const canFull = permission === 'full';
  const today = getTodayIso();
  const [viewMode, setViewMode] = useState<'editor' | 'print-preview'>('editor');
  const [activeGroupTab, setActiveGroupTab] = useState<'all' | IvMedsGroupId>('all');
  const [printScope, setPrintScope] = useState<'all' | IvMedsGroupId>('all');

  // Modal state
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [formGroup, setFormGroup] = useState<IvMedsGroupId>('iv-fluids');
  const [formName, setFormName] = useState('');
  const [formLocation, setFormLocation] = useState('');
  const [formQty, setFormQty] = useState(10);
  const [formPar, setFormPar] = useState(10);
  const [formUom, setFormUom] = useState('bags');
  const [formBatch, setFormBatch] = useState('');
  const [formExpiry, setFormExpiry] = useState('');
  const [formNotes, setFormNotes] = useState('');

  const categoryItems = useMemo(
    () =>
      items
        .filter((it) => it.categoryId === category.id)
        .map((it) => ({ ...it, medGroup: it.medGroup || inferIvMedsGroup(it) })),
    [items, category.id]
  );

  const summary = useMemo(() => {
    let expired = 0;
    let expiringSoon = 0;
    let belowPar = 0;
    const groupCounts: Record<IvMedsGroupId, number> = {
      cad: 0,
      'high-alert': 0,
      refrigerator: 0,
      'iv-fluids': 0,
      'near-expiry': 0,
    };

    for (const it of categoryItems) {
      const grp = it.medGroup || inferIvMedsGroup(it);
      groupCounts[grp] += 1;
      if (grp !== 'near-expiry' && isIvMedNearExpiry(it, today)) {
        groupCounts['near-expiry'] += 1;
      }
      const exp = getExpiryStatus(it.expiryDate, today);
      if (exp.state === 'expired') expired += 1;
      else if (exp.state === 'expiring-soon') expiringSoon += 1;
      if (it.quantity < it.parLevel) belowPar += 1;
    }

    return {
      total: categoryItems.length,
      expired,
      expiringSoon,
      belowPar,
      groupCounts,
    };
  }, [categoryItems, today]);

  const filteredByGroup = useMemo(() => {
    const map: Record<IvMedsGroupId, InventoryItem[]> = {
      cad: [],
      'high-alert': [],
      refrigerator: [],
      'iv-fluids': [],
      'near-expiry': [],
    };

    for (const it of categoryItems) {
      const grp = it.medGroup || inferIvMedsGroup(it);
      map[grp].push(it);
      if (grp !== 'near-expiry' && isIvMedNearExpiry(it, today)) {
        map['near-expiry'].push(it);
      }
    }
    return map;
  }, [categoryItems, today]);

  const assignedStaffReadyCount = auditMeta.staffAssignments.filter(
    (s) => s.staffName.trim() !== ''
  ).length;

  const taskDueState = monthlyTask ? getTaskDueState(monthlyTask, today) : null;

  const openAdd = (presetGroup?: IvMedsGroupId) => {
    if (!canFull) return;
    const grp = presetGroup || (activeGroupTab === 'all' ? 'iv-fluids' : activeGroupTab);
    setEditingItem(null);
    setFormGroup(grp);
    setFormName('');
    setFormLocation(
      grp === 'cad'
        ? 'CAD Double-Lock Cabinet'
        : grp === 'high-alert'
          ? 'High-Alert Med Shelf'
          : grp === 'refrigerator'
            ? 'Med Fridge (2–8°C)'
            : grp === 'near-expiry'
              ? 'Near Expiry Shelf'
              : 'IV Fluid Rack 1'
    );
    setFormQty(10);
    setFormPar(10);
    setFormUom(grp === 'iv-fluids' ? 'bags' : grp === 'near-expiry' ? 'units' : 'amps');
    setFormBatch('');
    setFormExpiry('');
    setFormNotes('');
    setShowModal(true);
  };

  const openEdit = (item: InventoryItem) => {
    if (!canEdit) return;
    setEditingItem(item);
    setFormGroup(item.medGroup || inferIvMedsGroup(item));
    setFormName(item.name);
    setFormLocation(item.locationDetail);
    setFormQty(item.quantity);
    setFormPar(item.parLevel);
    setFormUom(item.unitOfMeasure);
    setFormBatch(item.batchOrSerial);
    setFormExpiry(item.expiryDate || '');
    setFormNotes(item.notes);
    setShowModal(true);
  };

  const handleSaveItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingItem ? !canEdit : !canFull) return;
    if (!formName.trim()) return;

    const payload: Omit<InventoryItem, 'id'> = {
      categoryId: category.id,
      medGroup: formGroup,
      name: formName.trim(),
      unit: editingItem ? editingItem.unit : 'CCU',
      locationDetail: formLocation.trim() || 'Medication Room',
      quantity: Math.max(0, Number(formQty) || 0),
      parLevel: Math.max(0, Number(formPar) || 0),
      unitOfMeasure: formUom.trim() || 'units',
      batchOrSerial: formBatch.trim() || '—',
      expiryDate: formExpiry || null,
      lastCheckedDate: today,
      lastCheckedBy: defaultInspector,
      notes: formNotes.trim(),
    };

    if (editingItem) {
      onUpdateItem(editingItem.id, payload);
    } else {
      onAddItem(payload);
    }
    setShowModal(false);
  };

  const updateStaffField = (
    idx: number,
    field: keyof Omit<IvMedsStaffAssignment, 'id'>,
    val: string
  ) => {
    if (!canEdit) return;
    const next = auditMeta.staffAssignments.map((s, i) =>
      i === idx ? { ...s, [field]: val } : s
    );
    onUpdateAuditMeta({ staffAssignments: next });
  };

  const addStaffRow = () => {
    if (!canEdit) return;
    const next: IvMedsStaffAssignment[] = [
      ...auditMeta.staffAssignments,
      {
        id: `ivm-stf-${Date.now().toString(36)}`,
        staffName: '',
        role: 'Ward Nurse',
        assignedLists: '',
        checkedDate: '',
        signature: '',
      },
    ];
    onUpdateAuditMeta({ staffAssignments: next });
  };

  const removeStaffRow = (idx: number) => {
    if (!canEdit) return;
    if (auditMeta.staffAssignments.length <= 1) return;
    onUpdateAuditMeta({
      staffAssignments: auditMeta.staffAssignments.filter((_, i) => i !== idx),
    });
  };

  const handleCompleteMonthlyAudit = () => {
    if (!canEdit || !monthlyTask || !onCompleteMonthlyTask) return;
    const names = auditMeta.staffAssignments
      .map((s) => s.staffName.trim())
      .filter(Boolean);
    const inspectorLabel =
      names.length > 0 ? names.join(', ') : defaultInspector;
    onCompleteMonthlyTask(
      monthlyTask.id,
      inspectorLabel,
      'completed',
      `Monthly 5-list audit verified by ${Math.max(1, names.length)} assigned staff (${auditMeta.monthYear}).`
    );
  };

  const visibleGroups =
    activeGroupTab === 'all'
      ? IV_MEDS_GROUPS
      : IV_MEDS_GROUPS.filter((g) => g.id === activeGroupTab);

  return (
    <div className="space-y-5">
      <ReadOnlyBanner permission={permission} sectionLabel={category.label} />
      {/* Section Header & Summary Strip */}
      <div className="no-print bg-white border border-slate-200 rounded-lg p-5 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">{category.label}</h2>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl">{category.description}</p>
          </div>
          <div className="flex flex-wrap items-center gap-6 text-right">
            <div>
              <div className="text-[11px] font-medium text-slate-500">Tracked Items</div>
              <div className="text-xl font-semibold font-mono tabular-nums text-slate-900">
                {summary.total}
              </div>
            </div>
            <div>
              <div className="text-[11px] font-medium text-slate-500">Expired</div>
              <div
                className={`text-xl font-semibold font-mono tabular-nums ${
                  summary.expired > 0 ? 'text-rose-700' : 'text-slate-900'
                }`}
              >
                {summary.expired}
              </div>
            </div>
            <div>
              <div className="text-[11px] font-medium text-slate-500">Expiring &le; 30d</div>
              <div
                className={`text-xl font-semibold font-mono tabular-nums ${
                  summary.expiringSoon > 0 ? 'text-amber-700' : 'text-slate-900'
                }`}
              >
                {summary.expiringSoon}
              </div>
            </div>
            <div>
              <div className="text-[11px] font-medium text-slate-500">Below Par Stock</div>
              <div
                className={`text-xl font-semibold font-mono tabular-nums ${
                  summary.belowPar > 0 ? 'text-amber-700' : 'text-emerald-700'
                }`}
              >
                {summary.belowPar}
              </div>
            </div>
            <div>
              <div className="text-[11px] font-medium text-slate-500">Assigned Staff</div>
              <div className="text-xl font-semibold font-mono tabular-nums text-teal-800">
                {auditMeta.staffAssignments.length}
              </div>
            </div>
          </div>
        </div>

        {/* View Mode, Sync & Print Controls */}
        <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
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
                Manage Lists
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

            {canEdit && (
              <button
                type="button"
                onClick={onResyncFromForms}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-teal-800 bg-teal-50 hover:bg-teal-100 rounded-md transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Sync From Pharmacy Forms
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label className="text-xs text-slate-600 flex items-center gap-1.5">
              <span>Print Scope:</span>
              <select
                value={printScope}
                onChange={(e) => setPrintScope(e.target.value as 'all' | IvMedsGroupId)}
                className="px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
              >
                <option value="all">All 5 Lists (Organized Packet)</option>
                {IV_MEDS_GROUPS.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.label} Only
                  </option>
                ))}
              </select>
            </label>

            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-teal-700 hover:bg-teal-800 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              Print Organized Checklist (A4)
            </button>
          </div>
        </div>
      </div>

      {/* Monthly Scheduled Audit & 3+ Assigned Staff Section */}
      {viewMode === 'editor' && (
        <ReadOnlySurface readOnly={!canEdit}>
        <div className="no-print bg-white border border-slate-200 rounded-lg p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-md bg-teal-50 text-teal-800 flex items-center justify-center shrink-0">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Monthly Scheduled Staff Assignment
                </h3>
                <p className="text-xs text-slate-500">
                  Assigned team ({assignedStaffReadyCount} named /{' '}
                  {auditMeta.staffAssignments.length} slots) &middot;{' '}
                  {monthlyTask && taskDueState
                    ? `Monthly Schedule: ${taskDueState.label} (${formatShortDate(monthlyTask.dueDate)})`
                    : 'Monthly Recurring Task'}
                </p>
              </div>
            </div>

            {canEdit && (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={addStaffRow}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Staff
                </button>
                {monthlyTask && onCompleteMonthlyTask && (
                  <button
                    type="button"
                    onClick={handleCompleteMonthlyAudit}
                    disabled={assignedStaffReadyCount < 1}
                    title={
                      assignedStaffReadyCount < 1
                        ? 'Assign at least 1 staff name before completing monthly audit'
                        : 'Mark monthly audit completed and advance next due date by 1 month'
                    }
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-teal-700 hover:bg-teal-800 disabled:opacity-45 disabled:pointer-events-none rounded-md transition-colors cursor-pointer"
                  >
                    <CalendarCheck className="w-3.5 h-3.5" />
                    Complete Monthly Audit
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-6 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">
                Ward Number
              </label>
              <input
                type="text"
                value={auditMeta.wardNumber || ''}
                onChange={(e) => onUpdateAuditMeta({ wardNumber: e.target.value })}
                placeholder="e.g., 208 / CCU"
                className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">Month</label>
              <input
                type="text"
                value={auditMeta.month ?? ''}
                onChange={(e) => onUpdateAuditMeta({ month: e.target.value })}
                placeholder="e.g., November"
                className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">Year</label>
              <input
                type="text"
                value={auditMeta.year ?? ''}
                onChange={(e) => onUpdateAuditMeta({ year: e.target.value })}
                placeholder="2026"
                className="w-full px-2.5 py-1.5 text-xs font-mono border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
              />
            </div>
            <div className="sm:col-span-3">
              <label className="block text-[11px] font-medium text-slate-600 mb-1">
                Monthly Audit Notes
              </label>
              <input
                type="text"
                value={auditMeta.notes}
                onChange={(e) => onUpdateAuditMeta({ notes: e.target.value })}
                placeholder="Instructions or follow-up notes for assigned staff..."
                className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
              />
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-md">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-medium text-slate-600">
                  <th className="py-2 px-2.5 w-10 text-center">#</th>
                  <th className="py-2 px-2.5 min-w-[170px]">Staff Name</th>
                  <th className="py-2 px-2.5 min-w-[140px]">Role</th>
                  <th className="py-2 px-2.5 min-w-[200px]">Assigned List(s)</th>
                  <th className="py-2 px-2.5 w-32 text-center">Date Checked</th>
                  <th className="py-2 px-2.5 w-36 text-center">Signature</th>
                  <th className="py-2 px-2 w-10 text-center">
                    <span className="sr-only">Remove</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {auditMeta.staffAssignments.map((st, idx) => (
                  <tr key={st.id} className="hover:bg-slate-50/70">
                    <td className="p-1.5 text-center font-mono text-slate-500">{idx + 1}</td>
                    <td className="p-1.5">
                      <input
                        type="text"
                        value={st.staffName}
                        onChange={(e) => updateStaffField(idx, 'staffName', e.target.value)}
                        placeholder={`Staff ${idx + 1} full name`}
                        className="w-full px-2 py-1 text-xs border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-teal-700"
                      />
                    </td>
                    <td className="p-1.5">
                      <input
                        type="text"
                        value={st.role}
                        onChange={(e) => updateStaffField(idx, 'role', e.target.value)}
                        placeholder="e.g., Charge Nurse / RN"
                        className="w-full px-2 py-1 text-xs border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-teal-700"
                      />
                    </td>
                    <td className="p-1.5">
                      <input
                        type="text"
                        value={st.assignedLists}
                        onChange={(e) => updateStaffField(idx, 'assignedLists', e.target.value)}
                        placeholder="e.g., CAD & High-Alert / IV Fluids"
                        className="w-full px-2 py-1 text-xs border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-teal-700"
                      />
                    </td>
                    <td className="p-1.5">
                      <input
                        type="text"
                        value={st.checkedDate}
                        onChange={(e) => updateStaffField(idx, 'checkedDate', e.target.value)}
                        placeholder="DD/MM/YYYY"
                        className="w-full px-2 py-1 text-xs font-mono text-center border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-teal-700"
                      />
                    </td>
                    <td className="p-1.5">
                      <input
                        type="text"
                        value={st.signature}
                        onChange={(e) => updateStaffField(idx, 'signature', e.target.value)}
                        placeholder="Sign / Initials"
                        className="w-full px-2 py-1 text-xs text-center border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-teal-700"
                      />
                    </td>
                    <td className="p-1.5 text-center">
                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => removeStaffRow(idx)}
                          disabled={auditMeta.staffAssignments.length <= 1}
                          title={
                            auditMeta.staffAssignments.length <= 1
                              ? 'At least 1 assigned staff required'
                              : 'Remove staff member'
                          }
                          className="p-1 text-slate-400 hover:text-rose-600 disabled:opacity-30 disabled:pointer-events-none rounded cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        </ReadOnlySurface>
      )}

      {/* 4-List Filter Bar & Grouped Inventory Tables */}
      {viewMode === 'editor' && (
        <div className="no-print space-y-4">
          <div className="bg-white border border-slate-200 rounded-lg p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg">
                <button
                  type="button"
                  onClick={() => setActiveGroupTab('all')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                    activeGroupTab === 'all'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  All 5 Lists ({summary.total})
                </button>
                {IV_MEDS_GROUPS.map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => setActiveGroupTab(g.id)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                      activeGroupTab === g.id
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {g.shortLabel} ({summary.groupCounts[g.id]})
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Grouped List Cards */}
          {visibleGroups.map((group) => {
            const listItems = filteredByGroup[group.id];
            return (
              <div
                key={group.id}
                className="bg-white border border-slate-200 rounded-lg overflow-hidden"
              >
                <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-slate-900">{group.label}</h3>
                      <span className="font-mono text-[11px] text-slate-600 bg-white border border-slate-200 px-2 py-0.5 rounded">
                        {group.formRef}
                      </span>
                      <span className="font-mono text-xs text-slate-500 tabular-nums">
                        ({listItems.length})
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">{group.description}</p>
                  </div>

                  {canFull && (
                    <button
                      type="button"
                      onClick={() => openAdd(group.id)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-teal-800 bg-teal-50 hover:bg-teal-100 rounded transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add to {group.shortLabel}
                    </button>
                  )}
                </div>

                {listItems.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-500">
                    No items in {group.label}.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50/50 text-[11px] font-medium text-slate-500">
                          <th className="py-2 px-3 w-10 text-center">#</th>
                          <th className="py-2 px-3">Item &amp; Location</th>
                          <th className="py-2 px-3">Lot / Batch</th>
                          <th className="py-2 px-3">Stock / Par</th>
                          <th className="py-2 px-3">Expiry Date &amp; State</th>
                          <th className="py-2 px-3">Last Verified</th>
                          <th className="py-2 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 text-sm">
                        {listItems.map((item, idx) => {
                          const exp = getExpiryStatus(item.expiryDate, today);
                          const isLowStock = item.quantity < item.parLevel;
                          const originGroup =
                            group.id === 'near-expiry' &&
                            item.medGroup &&
                            item.medGroup !== 'near-expiry'
                              ? IV_MEDS_GROUPS.find((g) => g.id === item.medGroup)?.shortLabel
                              : null;
                          return (
                            <tr key={`${group.id}-${item.id}`} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-2.5 px-3 text-center font-mono text-xs text-slate-500">
                                {idx + 1}
                              </td>
                              <td className="py-2.5 px-3 max-w-md">
                                <div className="font-medium text-slate-900">{item.name}</div>
                                <div className="mt-0.5 text-xs text-slate-500 flex flex-wrap items-center gap-1.5">
                                  <span>{item.locationDetail}</span>
                                  {originGroup && (
                                    <>
                                      <span aria-hidden="true">&middot;</span>
                                      <span className="text-amber-800 font-medium">
                                        From {originGroup}
                                      </span>
                                    </>
                                  )}
                                  {item.notes && (
                                    <>
                                      <span aria-hidden="true">&middot;</span>
                                      <span className="truncate max-w-xs" title={item.notes}>
                                        {item.notes}
                                      </span>
                                    </>
                                  )}
                                </div>
                              </td>
                              <td className="py-2.5 px-3 whitespace-nowrap font-mono text-xs text-slate-600">
                                {item.batchOrSerial}
                              </td>
                              <td className="py-2.5 px-3 whitespace-nowrap">
                                <div className="flex items-center gap-2">
                                  {canEdit && (
                                    <button
                                      type="button"
                                      aria-label="Decrease quantity"
                                      onClick={() =>
                                        onUpdateItem(item.id, {
                                          quantity: Math.max(0, item.quantity - 1),
                                        })
                                      }
                                      className="p-1 text-slate-500 hover:text-slate-900 border border-slate-200 rounded hover:bg-slate-100 cursor-pointer"
                                    >
                                      <Minus className="w-3 h-3" />
                                    </button>
                                  )}
                                  <span
                                    className={`font-mono tabular-nums text-xs font-semibold min-w-[68px] text-center ${
                                      isLowStock ? 'text-amber-700' : 'text-slate-900'
                                    }`}
                                  >
                                    {item.quantity} / {item.parLevel} {item.unitOfMeasure}
                                  </span>
                                  {canEdit && (
                                    <button
                                      type="button"
                                      aria-label="Increase quantity"
                                      onClick={() =>
                                        onUpdateItem(item.id, { quantity: item.quantity + 1 })
                                      }
                                      className="p-1 text-slate-500 hover:text-slate-900 border border-slate-200 rounded hover:bg-slate-100 cursor-pointer"
                                    >
                                      <Plus className="w-3 h-3" />
                                    </button>
                                  )}
                                </div>
                              </td>
                              <td className="py-2.5 px-3 whitespace-nowrap text-xs">
                                <div className="font-mono tabular-nums text-slate-900">
                                  {formatShortDate(item.expiryDate)}
                                </div>
                                <div
                                  className={`text-[11px] font-medium inline-flex items-center gap-1 ${
                                    exp.state === 'expired'
                                      ? 'text-rose-700'
                                      : exp.state === 'expiring-soon'
                                        ? 'text-amber-700'
                                        : exp.state === 'valid'
                                          ? 'text-emerald-700'
                                          : 'text-slate-500'
                                  }`}
                                >
                                  {exp.state === 'expired' && <XCircle className="w-3 h-3" />}
                                  {exp.state === 'expiring-soon' && (
                                    <AlertTriangle className="w-3 h-3" />
                                  )}
                                  {exp.state === 'valid' && <CheckCircle2 className="w-3 h-3" />}
                                  <span className="tabular-nums">{exp.label}</span>
                                </div>
                              </td>
                              <td className="py-2.5 px-3 whitespace-nowrap text-xs text-slate-600">
                                <div className="font-mono tabular-nums">
                                  {formatShortDate(item.lastCheckedDate)}
                                </div>
                                <div className="text-[11px] text-slate-400 truncate max-w-[120px]">
                                  {item.lastCheckedBy}
                                </div>
                              </td>
                              <td className="py-2.5 px-4 whitespace-nowrap text-right">
                                <div className="inline-flex items-center gap-1.5">
                                  {canEdit && (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => onVerifyItem(item.id, defaultInspector)}
                                        className="px-2.5 py-1 text-xs font-medium text-teal-800 bg-teal-50 hover:bg-teal-100 rounded transition-colors cursor-pointer"
                                      >
                                        Verify
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => openEdit(item)}
                                        title="Edit item"
                                        className="p-1.5 text-slate-400 hover:text-slate-800 rounded transition-colors cursor-pointer"
                                      >
                                        <Edit3 className="w-3.5 h-3.5" />
                                      </button>
                                    </>
                                  )}
                                  {canFull && (
                                    <button
                                      type="button"
                                      onClick={() => onDeleteItem(item.id)}
                                      title="Delete item"
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
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Organized Printout View (Always mounted for direct printing, visible on screen in Print Preview) */}
      <div
        className={
          viewMode === 'print-preview'
            ? 'block overflow-x-auto pb-4'
            : 'hidden print-only-block'
        }
      >
        <IvMedsPrintView
          items={categoryItems}
          auditMeta={auditMeta}
          wardName={wardName}
          printScope={printScope}
          monthlyTask={monthlyTask}
        />
      </div>

      {/* Add / Edit Item Modal */}
      {(canEdit || canFull) && showModal && (
        <div className="no-print fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-lg w-full max-w-lg shadow-lg">
            <div className="px-5 py-4 border-b border-slate-200">
              <h3 className="text-base font-semibold text-slate-900">
                {editingItem ? 'Edit Medication / IV Fluid' : 'Add Medication / IV Fluid'}
              </h3>
            </div>
            <form onSubmit={handleSaveItem} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Assigned List
                </label>
                <select
                  value={formGroup}
                  onChange={(e) => setFormGroup(e.target.value as IvMedsGroupId)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
                >
                  {IV_MEDS_GROUPS.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Medication / IV Fluid Name
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Specific Location / Shelf
                </label>
                <input
                  type="text"
                  value={formLocation}
                  onChange={(e) => setFormLocation(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Quantity
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={formQty}
                    onChange={(e) => setFormQty(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Par Level
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={formPar}
                    onChange={(e) => setFormPar(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Unit</label>
                  <input
                    type="text"
                    value={formUom}
                    onChange={(e) => setFormUom(e.target.value)}
                    placeholder="amps / vials / bags"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Lot / Batch #
                  </label>
                  <input
                    type="text"
                    value={formBatch}
                    onChange={(e) => setFormBatch(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Expiry Date
                  </label>
                  <input
                    type="date"
                    value={formExpiry}
                    onChange={(e) => setFormExpiry(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Notes</label>
                <textarea
                  rows={2}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-medium text-white bg-teal-700 hover:bg-teal-800 rounded-md transition-colors cursor-pointer"
                >
                  {editingItem ? 'Save Changes' : 'Add Entry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
