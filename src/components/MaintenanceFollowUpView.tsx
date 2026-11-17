import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  Eye,
  FileEdit,
  Link2,
  Plus,
  Printer,
  RefreshCw,
  Trash2,
  Wrench,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import type { AddMaintenanceTicketSyncOptions } from '../hooks/useWardStore';
import type { PermissionLevel } from '../types/auth';
import type {
  InventoryItem,
  MaintenanceTicket,
  TicketPriority,
  TicketStatus,
  WardUnit,
} from '../types/ward';
import { addDaysIso, formatShortDate, getTodayIso } from '../utils/dateUtils';
import {
  MaintenanceFollowUpPrintView,
  type MaintenancePrintStatusFilter,
} from './MaintenanceFollowUpPrintView';
import { ReadOnlyBanner } from './ReadOnlyBanner';

interface MaintenanceFollowUpViewProps {
  tickets: MaintenanceTicket[];
  wardName?: string;
  defaultInspector: string;
  equipmentItems?: InventoryItem[];
  permission?: PermissionLevel;
  onAddTicket: (
    ticket: Omit<MaintenanceTicket, 'id'>,
    syncOptions?: boolean | AddMaintenanceTicketSyncOptions
  ) => void;
  onUpdateStatus: (ticketId: string, status: TicketStatus, notes?: string) => void;
  onDeleteTicket: (ticketId: string) => void;
  onSyncEquipmentLogs?: () => void;
  onOpenEquipmentRepairLog?: () => void;
  onOpenEnvironmentalRound?: () => void;
}

export function MaintenanceFollowUpView({
  tickets,
  wardName,
  defaultInspector,
  equipmentItems = [],
  permission = 'full',
  onAddTicket,
  onUpdateStatus,
  onDeleteTicket,
  onSyncEquipmentLogs,
  onOpenEquipmentRepairLog,
  onOpenEnvironmentalRound,
}: MaintenanceFollowUpViewProps) {
  const canEdit = permission === 'edit' || permission === 'full';
  const canFull = permission === 'full';
  const today = getTodayIso();
  const [statusFilter, setStatusFilter] = useState<MaintenancePrintStatusFilter>('active');
  const [unitFilter, setUnitFilter] = useState<'All' | WardUnit>('All');
  const [departmentFilter, setDepartmentFilter] = useState<
    'All' | MaintenanceTicket['department']
  >('All');
  const [priorityFilter, setPriorityFilter] = useState<'All' | TicketPriority>('All');
  const [viewMode, setViewMode] = useState<'list' | 'print-preview'>('list');
  const [showAddModal, setShowAddModal] = useState(false);

  const [newTitle, setNewTitle] = useState('');
  const [newArea, setNewArea] = useState('Environmental Round (GH0030)');
  const [newUnit, setNewUnit] = useState<WardUnit>('CCU');
  const [newDept, setNewDept] =
    useState<MaintenanceTicket['department']>('Facilities & HVAC');
  const [newPriority, setNewPriority] = useState<TicketPriority>('Urgent');
  const [newTargetDate, setNewTargetDate] = useState(addDaysIso(today, 2));
  const [newNotes, setNewNotes] = useState('');
  const [syncToEnvLog, setSyncToEnvLog] = useState(true);
  const [syncToEquipmentLog, setSyncToEquipmentLog] = useState(false);
  const [selectedEquipmentId, setSelectedEquipmentId] = useState('');
  const [newWorkOrderNo, setNewWorkOrderNo] = useState('');
  const [justSyncedEquipment, setJustSyncedEquipment] = useState(false);

  const isEquipmentLinkedTicket = (tk: MaintenanceTicket) =>
    Boolean(tk.linkedEquipmentLogId) ||
    tk.sourceArea.toLowerCase().includes('equipment') ||
    tk.department === 'Biomedical Engineering';

  const filteredTickets = useMemo(() => {
    return tickets.filter((tk) => {
      if (statusFilter === 'active' && tk.status === 'Resolved') return false;
      if (statusFilter === 'equipment' && !isEquipmentLinkedTicket(tk)) return false;
      if (
        statusFilter === 'gh0030' &&
        !tk.linkedFollowUpId &&
        !tk.sourceArea.toLowerCase().includes('gh0030') &&
        !tk.sourceArea.toLowerCase().includes('environmental')
      ) {
        return false;
      }
      if (statusFilter === 'resolved' && tk.status !== 'Resolved') return false;
      return true;
    });
  }, [tickets, statusFilter]);

  const counts = useMemo(() => {
    const open = tickets.filter((t) => t.status === 'Open').length;
    const inProgress = tickets.filter((t) => t.status === 'In Progress').length;
    const resolved = tickets.filter((t) => t.status === 'Resolved').length;
    const equipment = tickets.filter((t) => isEquipmentLinkedTicket(t)).length;
    const gh0030 = tickets.filter(
      (t) =>
        Boolean(t.linkedFollowUpId) ||
        t.sourceArea.toLowerCase().includes('gh0030') ||
        t.sourceArea.toLowerCase().includes('environmental')
    ).length;
    return { open, inProgress, resolved, equipment, gh0030 };
  }, [tickets]);

  const handleCreateTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    const linkedDevice = selectedEquipmentId
      ? equipmentItems.find((it) => it.id === selectedEquipmentId)
      : undefined;

    onAddTicket(
      {
        title: newTitle.trim(),
        sourceArea: newArea,
        unit: newUnit,
        department: newDept,
        priority: newPriority,
        status: 'Open',
        reportedDate: today,
        reportedBy: defaultInspector,
        targetDate: newTargetDate || addDaysIso(today, 3),
        resolvedDate: null,
        notes: newNotes.trim(),
      },
      {
        syncToEnvironmentalLog: syncToEnvLog,
        syncToEquipmentLog,
        equipmentItemId: linkedDevice?.id,
        equipmentName: linkedDevice
          ? linkedDevice.otherCode
            ? `${linkedDevice.name} (#${linkedDevice.otherCode})`
            : linkedDevice.name
          : newTitle.trim(),
        tableName: linkedDevice?.locationDetail || 'Table 9 - Others',
        mohNumber: linkedDevice?.batchOrSerial || '—',
        workOrderNo: newWorkOrderNo.trim(),
      }
    );
    setNewTitle('');
    setNewNotes('');
    setSelectedEquipmentId('');
    setNewWorkOrderNo('');
    setSyncToEquipmentLog(false);
    setShowAddModal(false);
  };

  return (
    <div className="space-y-5">
      <ReadOnlyBanner permission={permission} sectionLabel="Maintenance Follow-Up" />
      {/* Header */}
      <div className="no-print bg-white border border-slate-200 rounded-lg p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Maintenance Follow-Up &amp; Work Order Log
            </h2>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl">
              Track all needed repairs, biomedical calibrations, fire-safety fixes, and HVAC or
              facility follow-ups reported during weekly and monthly ward inspections.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-5">
            <div className="flex items-center gap-5 text-right">
              <div>
                <div className="text-[11px] font-medium text-slate-500">Open</div>
                <div
                  className={`text-xl font-semibold font-mono tabular-nums ${
                    counts.open > 0 ? 'text-rose-700' : 'text-slate-900'
                  }`}
                >
                  {counts.open}
                </div>
              </div>
              <div>
                <div className="text-[11px] font-medium text-slate-500">In Progress</div>
                <div className="text-xl font-semibold font-mono tabular-nums text-amber-700">
                  {counts.inProgress}
                </div>
              </div>
              <div>
                <div className="text-[11px] font-medium text-slate-500">Resolved</div>
                <div className="text-xl font-semibold font-mono tabular-nums text-emerald-700">
                  {counts.resolved}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                    viewMode === 'list'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <FileEdit className="w-3.5 h-3.5" />
                  Edit List
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
                Print Report (A4)
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Table Container */}
      <section
        className={`no-print bg-white border border-slate-200 rounded-lg ${
          viewMode === 'print-preview' ? 'hidden' : ''
        }`}
      >
        <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg overflow-x-auto">
            {(
              [
                { id: 'active', label: 'Active Follow-Ups' },
                { id: 'equipment', label: `Equipment Log (${counts.equipment})` },
                { id: 'gh0030', label: `GH0030 Round (${counts.gh0030})` },
                { id: 'resolved', label: 'Resolved' },
                { id: 'all', label: 'All Tickets' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  statusFilter === tab.id
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {canEdit && onSyncEquipmentLogs && (
              <button
                type="button"
                onClick={() => {
                  onSyncEquipmentLogs();
                  setJustSyncedEquipment(true);
                  window.setTimeout(() => setJustSyncedEquipment(false), 2200);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                title="Sync entries from Medical Equipment Maintenance, Repair Log & Follow-Up"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                {justSyncedEquipment ? 'Equipment Log Synced' : 'Sync Equipment Log'}
              </button>
            )}
            {onOpenEquipmentRepairLog && (
              <button
                type="button"
                onClick={onOpenEquipmentRepairLog}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Wrench className="w-3.5 h-3.5 text-amber-700" />
                Equipment Repair Log
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            )}
            {onOpenEnvironmentalRound && (
              <button
                type="button"
                onClick={onOpenEnvironmentalRound}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                GH0030 Follow-Up
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            )}
            {canFull && (
              <button
                type="button"
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-teal-700 hover:bg-teal-800 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Log Maintenance Request
              </button>
            )}
          </div>
        </div>

        {filteredTickets.length === 0 ? (
          <div className="p-12 text-center">
            <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
            <h3 className="mt-3 text-sm font-semibold text-slate-900">
              No maintenance tickets in this view
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              All ward maintenance requests for the selected filter are cleared.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-medium text-slate-500">
                  <th className="py-2.5 px-4">Issue &amp; Source</th>
                  <th className="py-2.5 px-3">Department</th>
                  <th className="py-2.5 px-3">Priority</th>
                  <th className="py-2.5 px-3">Reported</th>
                  <th className="py-2.5 px-3">Target / Resolved</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-4 text-right">Workflow</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {filteredTickets.map((tk) => (
                  <tr key={tk.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 max-w-md">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-medium text-slate-900">{tk.title}</span>
                        {tk.linkedEquipmentLogId && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium bg-amber-50 text-amber-900 border border-amber-200 rounded">
                            <Wrench className="w-2.5 h-2.5" />
                            Equipment Synced
                          </span>
                        )}
                        {tk.linkedFollowUpId && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium bg-teal-50 text-teal-800 border border-teal-200 rounded">
                            <Link2 className="w-2.5 h-2.5" />
                            GH0030 Synced
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 text-xs text-slate-500 flex flex-wrap items-center gap-1.5">
                        <span>{tk.sourceArea}</span>
                        <span aria-hidden="true">·</span>
                        <span>{tk.unit}</span>
                        {tk.notes && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="truncate max-w-xs" title={tk.notes}>
                              {tk.notes}
                            </span>
                          </>
                        )}
                      </div>
                    </td>

                    <td className="py-3 px-3 whitespace-nowrap text-xs text-slate-700">
                      {tk.department}
                    </td>

                    <td className="py-3 px-3 whitespace-nowrap text-xs">
                      <span
                        className={`font-medium ${
                          tk.priority === 'Urgent' ? 'text-rose-700' : 'text-slate-700'
                        }`}
                      >
                        {tk.priority}
                      </span>
                    </td>

                    <td className="py-3 px-3 whitespace-nowrap text-xs text-slate-600">
                      <div className="font-mono tabular-nums">
                        {formatShortDate(tk.reportedDate)}
                      </div>
                      <div className="text-[11px] text-slate-400">{tk.reportedBy}</div>
                    </td>

                    <td className="py-3 px-3 whitespace-nowrap font-mono tabular-nums text-xs text-slate-700">
                      {tk.resolvedDate
                        ? `Resolved ${formatShortDate(tk.resolvedDate)}`
                        : formatShortDate(tk.targetDate)}
                    </td>

                    <td className="py-3 px-3 whitespace-nowrap text-xs">
                      {tk.status === 'Open' && (
                        <span className="inline-flex items-center gap-1.5 font-medium text-rose-700">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          Open
                        </span>
                      )}
                      {tk.status === 'In Progress' && (
                        <span className="inline-flex items-center gap-1.5 font-medium text-amber-700">
                          <Clock className="w-3.5 h-3.5" />
                          In Progress
                        </span>
                      )}
                      {tk.status === 'Resolved' && (
                        <span className="inline-flex items-center gap-1.5 font-medium text-emerald-700">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Resolved
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap text-right">
                      <div className="inline-flex items-center gap-1.5">
                        {canEdit ? (
                          <>
                            {tk.status === 'Open' && (
                              <button
                                type="button"
                                onClick={() => onUpdateStatus(tk.id, 'In Progress')}
                                className="px-2.5 py-1 text-xs font-medium text-amber-800 bg-amber-50 hover:bg-amber-100 rounded transition-colors cursor-pointer"
                              >
                                Start Follow-Up
                              </button>
                            )}
                            {tk.status !== 'Resolved' ? (
                              <button
                                type="button"
                                onClick={() => onUpdateStatus(tk.id, 'Resolved')}
                                className="px-2.5 py-1 text-xs font-medium text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded transition-colors cursor-pointer"
                              >
                                Mark Resolved
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => onUpdateStatus(tk.id, 'Open')}
                                className="px-2.5 py-1 text-xs font-medium text-slate-700 border border-slate-200 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                              >
                                Reopen
                              </button>
                            )}
                          </>
                        ) : (
                          <span className="text-[11px] text-slate-400">View only</span>
                        )}
                        {canFull && (
                          <button
                            type="button"
                            onClick={() => onDeleteTicket(tk.id)}
                            title="Delete ticket"
                            className="p-1.5 text-slate-400 hover:text-rose-700 rounded transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Printable Report / Print Preview */}
      <div
        className={
          viewMode === 'print-preview'
            ? 'block overflow-x-auto pb-4'
            : 'hidden print-only-block'
        }
      >
        <div className="no-print mb-3 flex flex-wrap items-center justify-between gap-3 bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-xs text-slate-600">
          <div className="font-medium text-slate-700">
            Maintenance Follow-Up &amp; Work Order Report Options
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-medium text-slate-500">Scope:</span>
              <select
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value as MaintenancePrintStatusFilter)
                }
                className="px-2.5 py-1 text-xs font-medium text-slate-800 bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
              >
                <option value="active">
                  Active Follow-Ups ({counts.open + counts.inProgress})
                </option>
                <option value="equipment">
                  Medical Equipment Log ({counts.equipment})
                </option>
                <option value="gh0030">GH0030 Round ({counts.gh0030})</option>
                <option value="resolved">Resolved ({counts.resolved})</option>
                <option value="all">All Tickets ({tickets.length})</option>
              </select>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-medium text-slate-500">Unit:</span>
              <select
                value={unitFilter}
                onChange={(e) => setUnitFilter(e.target.value as 'All' | WardUnit)}
                className="px-2.5 py-1 text-xs font-medium text-slate-800 bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
              >
                <option value="All">All Units</option>
                <option value="CCU">CCU</option>
                <option value="SD">SD</option>
                <option value="General Ward">General Ward</option>
                <option value="All Units">Ward-Wide (All Units)</option>
              </select>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-medium text-slate-500">Department:</span>
              <select
                value={departmentFilter}
                onChange={(e) =>
                  setDepartmentFilter(
                    e.target.value as 'All' | MaintenanceTicket['department']
                  )
                }
                className="px-2.5 py-1 text-xs font-medium text-slate-800 bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
              >
                <option value="All">All Departments</option>
                <option value="Biomedical Engineering">Biomedical Engineering</option>
                <option value="Facilities & HVAC">Facilities &amp; HVAC</option>
                <option value="Fire Safety">Fire Safety</option>
                <option value="Pharmacy & Supply">Pharmacy &amp; Supply</option>
              </select>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-medium text-slate-500">Priority:</span>
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value as 'All' | TicketPriority)}
                className="px-2.5 py-1 text-xs font-medium text-slate-800 bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
              >
                <option value="All">All Priorities</option>
                <option value="Urgent">Urgent</option>
                <option value="Routine">Routine</option>
              </select>
            </div>
          </div>
        </div>
        <MaintenanceFollowUpPrintView
          tickets={tickets}
          wardName={wardName}
          defaultInspector={defaultInspector}
          statusFilter={statusFilter}
          unitFilter={unitFilter}
          departmentFilter={departmentFilter}
          priorityFilter={priorityFilter}
        />
      </div>

      {/* Add Ticket Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-lg w-full max-w-lg shadow-lg">
            <div className="px-5 py-4 border-b border-slate-200">
              <h3 className="text-base font-semibold text-slate-900">Log Maintenance Follow-Up</h3>
            </div>
            <form onSubmit={handleCreateTicket} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Issue Description
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g., Suction regulator gauge cracked at CCU Bed 02"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Assigned Department
                  </label>
                  <select
                    value={newDept}
                    onChange={(e) => {
                      const dept = e.target.value as MaintenanceTicket['department'];
                      setNewDept(dept);
                      if (dept === 'Biomedical Engineering') {
                        setSyncToEquipmentLog(true);
                        if (newArea.includes('Environmental')) {
                          setNewArea('Medical Equipment');
                        }
                      }
                    }}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
                  >
                    <option value="Biomedical Engineering">Biomedical Engineering</option>
                    <option value="Facilities & HVAC">Facilities &amp; HVAC</option>
                    <option value="Fire Safety">Fire Safety</option>
                    <option value="Pharmacy & Supply">Pharmacy &amp; Supply</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Ward Unit</label>
                  <select
                    value={newUnit}
                    onChange={(e) => setNewUnit(e.target.value as WardUnit)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
                  >
                    <option value="CCU">CCU</option>
                    <option value="SD">SD</option>
                    <option value="General Ward">General Ward</option>
                    <option value="All Units">All Units</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Source Area
                  </label>
                  <input
                    type="text"
                    value={newArea}
                    onChange={(e) => setNewArea(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Priority</label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as TicketPriority)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
                  >
                    <option value="Urgent">Urgent</option>
                    <option value="Routine">Routine</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Target Date
                  </label>
                  <input
                    type="date"
                    value={newTargetDate}
                    onChange={(e) => setNewTargetDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Notes</label>
                <textarea
                  rows={2}
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
                />
              </div>

              <div className="space-y-2 pt-1">
                <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={syncToEquipmentLog}
                    onChange={(e) => setSyncToEquipmentLog(e.target.checked)}
                    className="rounded border-slate-300 text-amber-700 focus:ring-amber-700"
                  />
                  Also sync to Medical Equipment (Maintenance, Repair Log &amp; Follow-Up)
                </label>

                {syncToEquipmentLog && (
                  <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-md space-y-2.5">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-700 mb-1">
                        Link Equipment Device (Optional — auto-fills MOH # &amp; unit)
                      </label>
                      <select
                        value={selectedEquipmentId}
                        onChange={(e) => {
                          const id = e.target.value;
                          setSelectedEquipmentId(id);
                          const found = equipmentItems.find((it) => it.id === id);
                          if (found) {
                            setNewUnit(found.unit);
                            setNewDept('Biomedical Engineering');
                            setNewArea(`Medical Equipment (${found.locationDetail})`);
                            if (!newTitle.trim()) {
                              setNewTitle(
                                `${found.otherCode ? `#${found.otherCode} ` : ''}${found.name} fault`
                              );
                            }
                          }
                        }}
                        className="w-full px-2.5 py-1.5 text-xs border border-amber-200 rounded bg-white focus:outline-none focus:ring-2 focus:ring-amber-700"
                      >
                        <option value="">-- Optional: Select device from Tables 1–9 --</option>
                        {equipmentItems.map((it) => (
                          <option key={it.id} value={it.id}>
                            {it.locationDetail} — {it.otherCode ? `#${it.otherCode} ` : ''}
                            {it.name} (MOH: {it.batchOrSerial}) [{it.unit}]
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-700 mb-1">
                        Work Order # (Optional)
                      </label>
                      <input
                        type="text"
                        value={newWorkOrderNo}
                        onChange={(e) => setNewWorkOrderNo(e.target.value)}
                        placeholder="e.g., BM-208-052"
                        className="w-full px-2.5 py-1.5 text-xs font-mono border border-amber-200 rounded bg-white focus:outline-none focus:ring-2 focus:ring-amber-700"
                      />
                    </div>
                  </div>
                )}

                <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={syncToEnvLog}
                    onChange={(e) => setSyncToEnvLog(e.target.checked)}
                    className="rounded border-slate-300 text-teal-700 focus:ring-teal-700"
                  />
                  Also add to Environmental Round (GH0030) Follow-Up Log
                </label>
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
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
