import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Edit3,
  Plus,
  Printer,
  Search,
  Trash2,
  Wrench,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { EQUIPMENT_TABLES } from '../data/equipmentSeed';
import type {
  EquipmentMaintenanceLogEntry,
  EquipmentMaintenanceLogStatus,
  EquipmentStatus,
  InventoryItem,
} from '../types/ward';
import { formatShortDate, getTodayIso } from '../utils/dateUtils';

interface EquipmentMaintenanceLogSectionProps {
  logs: EquipmentMaintenanceLogEntry[];
  equipmentItems: InventoryItem[];
  defaultInspector: string;
  preselectedItemForNewLog?: InventoryItem | null;
  onClearPreselectedItem?: () => void;
  onAddLog: (
    entry: Omit<EquipmentMaintenanceLogEntry, 'id'>,
    syncEquipmentStatus?: EquipmentStatus
  ) => void;
  onUpdateLog: (
    entryId: string,
    patch: Partial<EquipmentMaintenanceLogEntry>,
    syncEquipmentStatus?: EquipmentStatus
  ) => void;
  onDeleteLog: (entryId: string) => void;
  onPrintReport?: (filter: 'all' | 'active' | 'repaired') => void;
}

const LOG_STATUSES: EquipmentMaintenanceLogStatus[] = [
  'Open',
  'Reported to Biomed',
  'Sent to Workshop',
  'Awaiting Parts',
  'Repaired / Returned',
];

const SERVICE_DEPTS = [
  'Biomedical Engineering',
  'Vendor / Authorized Service',
  'Facilities & Electrical',
  'IT / Telemetry Support',
  'Ward Spare Replacement',
];

export function EquipmentMaintenanceLogSection({
  logs,
  equipmentItems,
  defaultInspector,
  preselectedItemForNewLog,
  onClearPreselectedItem,
  onAddLog,
  onUpdateLog,
  onDeleteLog,
  onPrintReport,
}: EquipmentMaintenanceLogSectionProps) {
  const today = getTodayIso();

  const [statusFilter, setStatusFilter] = useState<'active' | 'repaired' | 'all'>('all');
  const [unitFilter, setUnitFilter] = useState<'All' | 'CCU' | 'SD' | 'General Ward'>('All');
  const [search, setSearch] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<EquipmentMaintenanceLogEntry | null>(null);

  const [selectedItemId, setSelectedItemId] = useState('');
  const [formDeviceName, setFormDeviceName] = useState('');
  const [formTableName, setFormTableName] = useState<string>(EQUIPMENT_TABLES[0]);
  const [formMohNumber, setFormMohNumber] = useState('');
  const [formUnit, setFormUnit] = useState<'CCU' | 'SD' | 'General Ward'>('CCU');
  const [formIssue, setFormIssue] = useState('');
  const [formReportedDate, setFormReportedDate] = useState(today);
  const [formReportedBy, setFormReportedBy] = useState(defaultInspector);
  const [formWorkOrderNo, setFormWorkOrderNo] = useState('');
  const [formServiceDept, setFormServiceDept] = useState('Biomedical Engineering');
  const [formActionTaken, setFormActionTaken] = useState('');
  const [formStatus, setFormStatus] = useState<EquipmentMaintenanceLogStatus>('Reported to Biomed');
  const [formResolvedDate, setFormResolvedDate] = useState('');
  const [formVerifiedBy, setFormVerifiedBy] = useState('');
  const [syncDeviceStatus, setSyncDeviceStatus] = useState<EquipmentStatus | ''>(
    'Under Maintenance'
  );

  // Open pre-filled modal when user clicks "Log Repair" on a specific row in Tables 1–9
  useEffect(() => {
    if (!preselectedItemForNewLog) return;
    const item = preselectedItemForNewLog;
    setEditingEntry(null);
    setSelectedItemId(item.id);
    setFormDeviceName(
      item.otherCode ? `${item.name} (#${item.otherCode})` : item.name
    );
    setFormTableName(item.locationDetail || EQUIPMENT_TABLES[0]);
    setFormMohNumber(item.batchOrSerial || '—');
    setFormUnit(item.unit);
    setFormIssue(item.notes || '');
    setFormReportedDate(today);
    setFormReportedBy(defaultInspector);
    setFormWorkOrderNo('');
    setFormServiceDept('Biomedical Engineering');
    setFormActionTaken('');
    setFormStatus('Reported to Biomed');
    setFormResolvedDate('');
    setFormVerifiedBy('');
    setSyncDeviceStatus(
      item.equipmentStatus && item.equipmentStatus !== 'Operational'
        ? item.equipmentStatus
        : 'Under Maintenance'
    );
    setModalOpen(true);
    onClearPreselectedItem?.();
  }, [preselectedItemForNewLog, today, defaultInspector, onClearPreselectedItem]);

  const counts = useMemo(() => {
    const active = logs.filter((l) => l.status !== 'Repaired / Returned').length;
    const repaired = logs.filter((l) => l.status === 'Repaired / Returned').length;
    return { total: logs.length, active, repaired };
  }, [logs]);

  const flaggedNotLogged = useMemo(() => {
    const activeLinkedIds = new Set(
      logs
        .filter((l) => l.status !== 'Repaired / Returned' && l.equipmentItemId)
        .map((l) => l.equipmentItemId as string)
    );
    const activeMohs = new Set(
      logs
        .filter((l) => l.status !== 'Repaired / Returned' && l.mohNumber && l.mohNumber !== '—')
        .map((l) => l.mohNumber.trim().toLowerCase())
    );
    return equipmentItems.filter((it) => {
      if (!it.equipmentStatus || it.equipmentStatus === 'Operational') return false;
      if (activeLinkedIds.has(it.id)) return false;
      if (it.batchOrSerial && activeMohs.has(it.batchOrSerial.trim().toLowerCase())) return false;
      return true;
    });
  }, [equipmentItems, logs]);

  const filteredLogs = useMemo(() => {
    const q = search.trim().toLowerCase();
    return logs.filter((l) => {
      if (statusFilter === 'active' && l.status === 'Repaired / Returned') return false;
      if (statusFilter === 'repaired' && l.status !== 'Repaired / Returned') return false;
      if (unitFilter !== 'All' && l.unit !== unitFilter) return false;
      if (q) {
        const hay = `${l.equipmentName} ${l.tableName} ${l.mohNumber} ${l.issueDescription} ${l.workOrderNo} ${l.actionTaken} ${l.reportedBy}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [logs, statusFilter, unitFilter, search]);

  const openNewModal = () => {
    setEditingEntry(null);
    setSelectedItemId('');
    setFormDeviceName('');
    setFormTableName(EQUIPMENT_TABLES[0]);
    setFormMohNumber('');
    setFormUnit('CCU');
    setFormIssue('');
    setFormReportedDate(today);
    setFormReportedBy(defaultInspector);
    setFormWorkOrderNo('');
    setFormServiceDept('Biomedical Engineering');
    setFormActionTaken('');
    setFormStatus('Reported to Biomed');
    setFormResolvedDate('');
    setFormVerifiedBy('');
    setSyncDeviceStatus('Under Maintenance');
    setModalOpen(true);
  };

  const openEditModal = (entry: EquipmentMaintenanceLogEntry) => {
    setEditingEntry(entry);
    setSelectedItemId(entry.equipmentItemId || '');
    setFormDeviceName(entry.equipmentName);
    setFormTableName(entry.tableName || EQUIPMENT_TABLES[0]);
    setFormMohNumber(entry.mohNumber);
    setFormUnit(entry.unit);
    setFormIssue(entry.issueDescription);
    setFormReportedDate(entry.reportedDate);
    setFormReportedBy(entry.reportedBy);
    setFormWorkOrderNo(entry.workOrderNo);
    setFormServiceDept(entry.serviceDepartment);
    setFormActionTaken(entry.actionTaken);
    setFormStatus(entry.status);
    setFormResolvedDate(entry.resolvedDate || '');
    setFormVerifiedBy(entry.verifiedBy || '');
    setSyncDeviceStatus(
      entry.status === 'Repaired / Returned' ? 'Operational' : 'Under Maintenance'
    );
    setModalOpen(true);
  };

  const handleSelectInventoryItem = (itemId: string) => {
    setSelectedItemId(itemId);
    const found = equipmentItems.find((it) => it.id === itemId);
    if (!found) return;
    setFormDeviceName(
      found.otherCode ? `${found.name} (#${found.otherCode})` : found.name
    );
    setFormTableName(found.locationDetail || EQUIPMENT_TABLES[0]);
    setFormMohNumber(found.batchOrSerial || '—');
    setFormUnit(found.unit);
    if (!formIssue && found.notes) {
      setFormIssue(found.notes);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formDeviceName.trim() || !formIssue.trim()) return;

    const isRepaired = formStatus === 'Repaired / Returned';
    const payload: Omit<EquipmentMaintenanceLogEntry, 'id'> = {
      equipmentItemId: selectedItemId || undefined,
      equipmentName: formDeviceName.trim(),
      tableName: formTableName,
      mohNumber: formMohNumber.trim() || '—',
      unit: formUnit,
      issueDescription: formIssue.trim(),
      reportedDate: formReportedDate || today,
      reportedBy: formReportedBy.trim() || defaultInspector,
      workOrderNo: formWorkOrderNo.trim(),
      serviceDepartment: formServiceDept.trim() || 'Biomedical Engineering',
      actionTaken: formActionTaken.trim(),
      status: formStatus,
      resolvedDate: isRepaired ? formResolvedDate || today : null,
      verifiedBy: isRepaired ? formVerifiedBy.trim() || defaultInspector : formVerifiedBy.trim(),
    };

    const statusToSync = syncDeviceStatus ? syncDeviceStatus : undefined;

    if (editingEntry) {
      onUpdateLog(editingEntry.id, payload, statusToSync);
    } else {
      onAddLog(payload, statusToSync);
    }
    setModalOpen(false);
  };

  const handleImportFlagged = () => {
    for (const it of flaggedNotLogged) {
      onAddLog({
        equipmentItemId: it.id,
        equipmentName: it.otherCode ? `${it.name} (#${it.otherCode})` : it.name,
        tableName: it.locationDetail,
        mohNumber: it.batchOrSerial || '—',
        unit: it.unit,
        issueDescription:
          it.notes.trim() || `Device flagged as ${it.equipmentStatus} during inventory check`,
        reportedDate: today,
        reportedBy: defaultInspector,
        workOrderNo: '',
        serviceDepartment: 'Biomedical Engineering',
        actionTaken: `Imported from ${it.locationDetail} (${it.equipmentStatus})`,
        status: 'Open',
        resolvedDate: null,
        verifiedBy: '',
      });
    }
  };

  return (
    <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
      {/* Section Header */}
      <div className="p-4 border-b border-slate-200 bg-slate-50/80 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-2.5">
          <div className="p-2 bg-amber-50 border border-amber-200 rounded-md text-amber-800 shrink-0 mt-0.5">
            <Wrench className="w-4 h-4" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-semibold text-slate-900">
                Medical Equipment Maintenance, Repair Log &amp; Follow-Up
              </h3>
              <span
                className={`px-2 py-0.5 text-[11px] font-mono font-semibold rounded border ${
                  counts.active > 0
                    ? 'bg-rose-50 text-rose-800 border-rose-200'
                    : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                }`}
              >
                {counts.active} Active / {counts.repaired} Repaired
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Track faulty ward devices, biomedical work order numbers, workshop repairs, loaners,
              and return-to-service verification. Included in the Medical Equipment A4 printout.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {flaggedNotLogged.length > 0 && (
            <button
              type="button"
              onClick={handleImportFlagged}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-md transition-colors cursor-pointer"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              Import Flagged Devices ({flaggedNotLogged.length})
            </button>
          )}
          {onPrintReport && (
            <button
              type="button"
              onClick={() => onPrintReport(statusFilter)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-800 bg-white hover:bg-slate-100 border border-slate-200 rounded-md transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-teal-700" />
              Print Repair Report
            </button>
          )}
          <button
            type="button"
            onClick={openNewModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-teal-700 hover:bg-teal-800 rounded-md transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Log Repair / Maintenance
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="p-3.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            {(
              [
                ['all', `All Logs (${counts.total})`],
                ['active', `Active Follow-Up (${counts.active})`],
                ['repaired', `Repaired / Closed (${counts.repaired})`],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setStatusFilter(id)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                  statusFilter === id
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            {(['All', 'CCU', 'SD', 'General Ward'] as const).map((unit) => (
              <button
                key={unit}
                type="button"
                onClick={() => setUnitFilter(unit)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                  unitFilter === unit
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {unit === 'All' ? 'All Units' : unit}
              </button>
            ))}
          </div>
        </div>

        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search device, MOH no., work order..."
            className="pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-md w-64 focus:outline-none focus:ring-2 focus:ring-teal-700"
          />
        </div>
      </div>

      {/* Table */}
      {filteredLogs.length === 0 ? (
        <div className="p-10 text-center">
          <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
          <h4 className="mt-2.5 text-sm font-semibold text-slate-900">
            No maintenance or repair records in this view
          </h4>
          <p className="mt-1 text-xs text-slate-500">
            Click &ldquo;Log Repair / Maintenance&rdquo; above or use the wrench icon on any device
            row in Tables 1–9 to record a repair or biomedical follow-up.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-medium text-slate-500">
                <th className="py-2.5 px-3 w-10 text-center">#</th>
                <th className="py-2.5 px-3 min-w-[190px]">Equipment &amp; Table / MOH</th>
                <th className="py-2.5 px-3 min-w-[210px]">Fault / Repair Issue &amp; Reported</th>
                <th className="py-2.5 px-3 min-w-[155px]">Work Order # &amp; Dept</th>
                <th className="py-2.5 px-3 min-w-[210px]">Action Taken &amp; Follow-Up</th>
                <th className="py-2.5 px-3 min-w-[155px]">Follow-Up Status</th>
                <th className="py-2.5 px-3 min-w-[130px]">Resolved / Verified</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredLogs.map((entry, idx) => {
                const isRepaired = entry.status === 'Repaired / Returned';
                return (
                  <tr
                    key={entry.id}
                    className={`transition-colors ${
                      !isRepaired ? 'bg-rose-50/20 hover:bg-rose-50/40' : 'hover:bg-slate-50/80'
                    }`}
                  >
                    <td className="py-2.5 px-3 text-center font-mono text-slate-500">
                      {idx + 1}
                    </td>

                    <td className="py-2.5 px-3">
                      <div className="font-semibold text-slate-900">{entry.equipmentName}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">{entry.tableName}</div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px]">
                        <span className="font-mono font-medium text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">
                          MOH: {entry.mohNumber}
                        </span>
                        <span className="text-slate-500">{entry.unit}</span>
                      </div>
                    </td>

                    <td className="py-2.5 px-3">
                      <div className="text-slate-900 font-medium">{entry.issueDescription}</div>
                      <div className="text-[11px] text-slate-500 mt-1 font-mono tabular-nums">
                        Reported {formatShortDate(entry.reportedDate)} · {entry.reportedBy}
                      </div>
                    </td>

                    <td className="py-2.5 px-3 space-y-1">
                      <input
                        type="text"
                        value={entry.workOrderNo}
                        onChange={(e) =>
                          onUpdateLog(entry.id, { workOrderNo: e.target.value })
                        }
                        placeholder="Work Order / Ref #"
                        className="w-full px-2 py-1 text-xs font-mono border border-slate-200 rounded bg-white focus:outline-none focus:ring-1 focus:ring-teal-700"
                      />
                      <div className="text-[11px] text-slate-500 truncate">
                        {entry.serviceDepartment}
                      </div>
                    </td>

                    <td className="py-2.5 px-3">
                      <input
                        type="text"
                        value={entry.actionTaken}
                        onChange={(e) =>
                          onUpdateLog(entry.id, { actionTaken: e.target.value })
                        }
                        placeholder="Record repair / loaner / follow-up..."
                        className="w-full px-2 py-1 text-xs border border-slate-200 rounded bg-white focus:outline-none focus:ring-1 focus:ring-teal-700"
                      />
                    </td>

                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <select
                        value={entry.status}
                        onChange={(e) => {
                          const nextStatus = e.target.value as EquipmentMaintenanceLogStatus;
                          const repairedNow = nextStatus === 'Repaired / Returned';
                          onUpdateLog(
                            entry.id,
                            {
                              status: nextStatus,
                              resolvedDate: repairedNow ? entry.resolvedDate || today : null,
                              verifiedBy: repairedNow
                                ? entry.verifiedBy || defaultInspector
                                : entry.verifiedBy,
                            },
                            repairedNow ? 'Operational' : 'Under Maintenance'
                          );
                        }}
                        className={`px-2 py-1 text-[11px] font-semibold border rounded focus:outline-none focus:ring-1 focus:ring-teal-700 ${
                          isRepaired
                            ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                            : entry.status === 'Open'
                              ? 'border-rose-300 bg-rose-50 text-rose-800'
                              : 'border-amber-300 bg-amber-50 text-amber-800'
                        }`}
                      >
                        {LOG_STATUSES.map((st) => (
                          <option key={st} value={st}>
                            {st}
                          </option>
                        ))}
                      </select>
                    </td>

                    <td className="py-2.5 px-3 whitespace-nowrap">
                      {isRepaired ? (
                        <div>
                          <div className="font-mono tabular-nums text-emerald-800 font-medium">
                            {formatShortDate(entry.resolvedDate)}
                          </div>
                          <div className="text-[11px] text-slate-500 truncate max-w-[130px]">
                            {entry.verifiedBy || defaultInspector}
                          </div>
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-amber-700 font-medium">
                          <Clock className="w-3.5 h-3.5" />
                          Pending
                        </span>
                      )}
                    </td>

                    <td className="py-2.5 px-3 whitespace-nowrap text-right">
                      <div className="inline-flex items-center gap-1">
                        {!isRepaired && (
                          <button
                            type="button"
                            onClick={() =>
                              onUpdateLog(
                                entry.id,
                                {
                                  status: 'Repaired / Returned',
                                  resolvedDate: today,
                                  verifiedBy: defaultInspector,
                                },
                                'Operational'
                              )
                            }
                            className="px-2 py-1 text-[11px] font-medium text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded transition-colors cursor-pointer"
                          >
                            Mark Repaired
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => openEditModal(entry)}
                          title="Edit repair log"
                          className="p-1.5 text-slate-400 hover:text-slate-800 rounded transition-colors cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteLog(entry.id)}
                          title="Delete repair log"
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
      )}

      {/* Add / Edit Equipment Maintenance & Repair Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-lg w-full max-w-2xl shadow-lg max-h-[92vh] overflow-y-auto">
            <div className="px-5 py-4 border-b border-slate-200">
              <h3 className="text-base font-semibold text-slate-900">
                {editingEntry
                  ? 'Update Equipment Maintenance & Repair Entry'
                  : 'Log Medical Equipment Maintenance / Repair'}
              </h3>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-4">
              {/* Optional Picker from Inventory */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Link Existing Inventory Device (Optional — auto-fills details)
                </label>
                <select
                  value={selectedItemId}
                  onChange={(e) => handleSelectInventoryItem(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700 bg-white"
                >
                  <option value="">-- Select from Tables 1–9 or enter manually below --</option>
                  {equipmentItems.map((it) => (
                    <option key={it.id} value={it.id}>
                      {it.locationDetail} — {it.otherCode ? `#${it.otherCode} ` : ''}
                      {it.name} (MOH: {it.batchOrSerial}) [{it.unit}]
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Device / Equipment Name
                  </label>
                  <input
                    type="text"
                    required
                    value={formDeviceName}
                    onChange={(e) => setFormDeviceName(e.target.value)}
                    placeholder="e.g., Cardiac Monitor Bed 12 / Alaris GP Pump #4"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    MOH / Asset Number
                  </label>
                  <input
                    type="text"
                    value={formMohNumber}
                    onChange={(e) => setFormMohNumber(e.target.value)}
                    placeholder="e.g., 908364"
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Equipment Table
                  </label>
                  <select
                    value={formTableName}
                    onChange={(e) => setFormTableName(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
                  >
                    {EQUIPMENT_TABLES.map((tbl) => (
                      <option key={tbl} value={tbl}>
                        {tbl}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Ward Unit</label>
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

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Fault / Maintenance / Calibration Issue
                </label>
                <textarea
                  rows={2}
                  required
                  value={formIssue}
                  onChange={(e) => setFormIssue(e.target.value)}
                  placeholder="Describe the malfunction, alarm fault, broken part, or overdue PPM..."
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Reported Date
                  </label>
                  <input
                    type="date"
                    value={formReportedDate}
                    onChange={(e) => setFormReportedDate(e.target.value)}
                    className="w-full px-2.5 py-2 text-xs font-mono border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Reported By
                  </label>
                  <input
                    type="text"
                    value={formReportedBy}
                    onChange={(e) => setFormReportedBy(e.target.value)}
                    className="w-full px-2.5 py-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Work Order #
                  </label>
                  <input
                    type="text"
                    value={formWorkOrderNo}
                    onChange={(e) => setFormWorkOrderNo(e.target.value)}
                    placeholder="e.g., BM-208-045"
                    className="w-full px-2.5 py-2 text-xs font-mono border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Service Dept
                  </label>
                  <select
                    value={formServiceDept}
                    onChange={(e) => setFormServiceDept(e.target.value)}
                    className="w-full px-2.5 py-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
                  >
                    {SERVICE_DEPTS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Action Taken / Follow-Up Remarks
                </label>
                <textarea
                  rows={2}
                  value={formActionTaken}
                  onChange={(e) => setFormActionTaken(e.target.value)}
                  placeholder="e.g., Sent to Biomed workshop; backup pump assigned at Bed 12..."
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Follow-Up Status
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) => {
                      const next = e.target.value as EquipmentMaintenanceLogStatus;
                      setFormStatus(next);
                      if (next === 'Repaired / Returned') {
                        if (!formResolvedDate) setFormResolvedDate(today);
                        if (!formVerifiedBy) setFormVerifiedBy(defaultInspector);
                        setSyncDeviceStatus('Operational');
                      } else if (syncDeviceStatus === 'Operational') {
                        setSyncDeviceStatus('Under Maintenance');
                      }
                    }}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
                  >
                    {LOG_STATUSES.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Resolved Date
                  </label>
                  <input
                    type="date"
                    value={formResolvedDate}
                    onChange={(e) => setFormResolvedDate(e.target.value)}
                    disabled={formStatus !== 'Repaired / Returned'}
                    className="w-full px-2.5 py-2 text-xs font-mono border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700 disabled:bg-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Verified By (On Return)
                  </label>
                  <input
                    type="text"
                    value={formVerifiedBy}
                    onChange={(e) => setFormVerifiedBy(e.target.value)}
                    placeholder={defaultInspector}
                    className="w-full px-2.5 py-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
                  />
                </div>
              </div>

              {selectedItemId && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-md flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs text-slate-700">
                    Also update linked device status in Equipment Inventory:
                  </span>
                  <select
                    value={syncDeviceStatus}
                    onChange={(e) =>
                      setSyncDeviceStatus(e.target.value as EquipmentStatus | '')
                    }
                    className="px-2.5 py-1 text-xs border border-slate-200 rounded bg-white"
                  >
                    <option value="">Do not change inventory status</option>
                    <option value="Under Maintenance">Under Maintenance</option>
                    <option value="Needs Calibration">Needs Calibration</option>
                    <option value="Out of Service">Out of Service</option>
                    <option value="Operational">Operational</option>
                  </select>
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-medium text-white bg-teal-700 hover:bg-teal-800 rounded-md transition-colors cursor-pointer"
                >
                  {editingEntry ? 'Save Repair Log' : 'Submit Repair Log'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
