import type {
  EnvironmentalFollowUpRow,
  EquipmentMaintenanceLogEntry,
  EquipmentMaintenanceLogStatus,
  MaintenanceTicket,
  TicketStatus,
  WardUnit,
} from '../types/ward';
import { addDaysIso } from './dateUtils';

export function slashDateToIso(raw: string | undefined, fallbackIso: string): string {
  const val = (raw || '').trim();
  if (!val) return fallbackIso;
  if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val;

  const match = val.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (!match) return fallbackIso;

  const day = Number(match[1]);
  const month = Number(match[2]);
  let year = Number(match[3]);
  if (year < 100) year += 2000;

  if (month < 1 || month > 12 || day < 1 || day > 31) return fallbackIso;
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function isoToSlashDate(iso: string | null | undefined): string {
  if (!iso) return '';
  const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return iso;
  return `${match[3]}/${match[2]}/${match[1]}`;
}

export function isRowPending(dateCompleted: string | undefined): boolean {
  const clean = (dateCompleted || '').trim().toLowerCase();
  return !clean || clean === 'pending' || clean.includes('pending');
}

export function inferUnitFromIssue(text: string): WardUnit {
  const upper = text.toUpperCase();
  if (/\bSD\b/.test(upper)) return 'SD';
  if (/\bCCU\b/.test(upper)) return 'CCU';
  return 'All Units';
}

export function inferDepartmentFromIssue(
  text: string
): MaintenanceTicket['department'] {
  const upper = text.toUpperCase();
  if (
    upper.includes('FIRE') ||
    upper.includes('EXTINGUISHER') ||
    upper.includes('ALARM') ||
    upper.includes('SMOKE') ||
    upper.includes('EGRESS')
  ) {
    return 'Fire Safety';
  }
  if (
    upper.includes('SUCTION') ||
    upper.includes('MONITOR') ||
    upper.includes('PUMP') ||
    upper.includes('ECG') ||
    upper.includes('BIOMED') ||
    upper.includes('DEFIB') ||
    upper.includes('OXYGEN') ||
    upper.includes('O2')
  ) {
    return 'Biomedical Engineering';
  }
  return 'Facilities & HVAC';
}

export function deriveTicketStatusFromRow(row: EnvironmentalFollowUpRow): TicketStatus {
  if (!isRowPending(row.dateCompleted)) return 'Resolved';
  return row.workOrderSubmitted ? 'In Progress' : 'Open';
}

/**
 * Ensures every GH0030 Environmental Follow-Up row has a linked MaintenanceTicket
 * and keeps linked tickets in sync when followUpRows are created or edited.
 */
export function syncMaintenanceTicketsFromFollowUpRows(
  followUpRows: EnvironmentalFollowUpRow[],
  existingTickets: MaintenanceTicket[],
  defaultInspector: string,
  today: string
): { followUpRows: EnvironmentalFollowUpRow[]; maintenanceTickets: MaintenanceTicket[] } {
  const ticketById = new Map(existingTickets.map((t) => [t.id, t]));
  const ticketByFollowUpId = new Map(
    existingTickets
      .filter((t) => t.linkedFollowUpId)
      .map((t) => [t.linkedFollowUpId as string, t])
  );

  const syncedRowIds = new Set(followUpRows.map((r) => r.id));
  const nextRows: EnvironmentalFollowUpRow[] = [];
  const generatedOrUpdatedTickets: MaintenanceTicket[] = [];
  const consumedTicketIds = new Set<string>();

  for (const row of followUpRows) {
    const existingTicket =
      (row.linkedTicketId ? ticketById.get(row.linkedTicketId) : undefined) ||
      ticketByFollowUpId.get(row.id);

    const status = deriveTicketStatusFromRow(row);
    const reportedDate = slashDateToIso(row.date, today);
    const resolvedDate =
      status === 'Resolved' ? slashDateToIso(row.dateCompleted, today) : null;
    const issueTitle = row.issue.trim() || 'Environmental Round Follow-Up Item';
    const deptText = row.responsibleDept.trim();
    const notesText = [
      deptText ? `Dept/Person: ${deptText}` : '',
      row.workOrderSubmitted ? 'Work Order Submitted' : 'Work Order Pending Submission',
    ]
      .filter(Boolean)
      .join(' · ');

    if (existingTicket) {
      consumedTicketIds.add(existingTicket.id);
      const updatedTicket: MaintenanceTicket = {
        ...existingTicket,
        title: issueTitle,
        sourceArea: 'Environmental Round (GH0030)',
        unit: inferUnitFromIssue(issueTitle),
        department: existingTicket.department || inferDepartmentFromIssue(issueTitle),
        reportedDate,
        status,
        resolvedDate,
        notes: notesText || existingTicket.notes,
        linkedFollowUpId: row.id,
      };
      generatedOrUpdatedTickets.push(updatedTicket);
      nextRows.push({ ...row, linkedTicketId: existingTicket.id });
    } else {
      const newTicketId = `mnt-env-${row.id}`;
      consumedTicketIds.add(newTicketId);
      const newTicket: MaintenanceTicket = {
        id: newTicketId,
        title: issueTitle,
        sourceArea: 'Environmental Round (GH0030)',
        unit: inferUnitFromIssue(issueTitle),
        department: inferDepartmentFromIssue(issueTitle),
        priority: row.highlightRed ? 'Urgent' : 'Routine',
        status,
        reportedDate,
        reportedBy: defaultInspector,
        targetDate: addDaysIso(reportedDate, row.highlightRed ? 2 : 5),
        resolvedDate,
        notes: notesText || 'Synced from Environmental Round (GH0030) Follow-Up Log.',
        linkedFollowUpId: row.id,
      };
      generatedOrUpdatedTickets.push(newTicket);
      nextRows.push({ ...row, linkedTicketId: newTicketId });
    }
  }

  // Keep unrelated tickets + drop any ticket whose linked follow-up row was explicitly deleted
  const remainingTickets = existingTickets.filter((tk) => {
    if (consumedTicketIds.has(tk.id)) return false;
    if (tk.linkedFollowUpId && !syncedRowIds.has(tk.linkedFollowUpId)) return false;
    return true;
  });

  // Put updated/new GH0030 tickets alongside remaining tickets preserving recent order
  return {
    followUpRows: nextRows,
    maintenanceTickets: [...remainingTickets, ...generatedOrUpdatedTickets],
  };
}

export function mapEquipmentLogStatusToTicketStatus(
  status: EquipmentMaintenanceLogStatus
): TicketStatus {
  if (status === 'Repaired / Returned') return 'Resolved';
  if (status === 'Open') return 'Open';
  return 'In Progress';
}

export function mapTicketStatusToEquipmentLogStatus(
  status: TicketStatus,
  previousLogStatus?: EquipmentMaintenanceLogStatus
): EquipmentMaintenanceLogStatus {
  if (status === 'Resolved') return 'Repaired / Returned';
  if (status === 'Open') return 'Open';
  if (
    previousLogStatus === 'Reported to Biomed' ||
    previousLogStatus === 'Sent to Workshop' ||
    previousLogStatus === 'Awaiting Parts'
  ) {
    return previousLogStatus;
  }
  return 'Reported to Biomed';
}

export function mapServiceDeptToTicketDept(
  serviceDept: string
): MaintenanceTicket['department'] {
  const lower = (serviceDept || '').toLowerCase();
  if (lower.includes('facilities') || lower.includes('electrical') || lower.includes('hvac')) {
    return 'Facilities & HVAC';
  }
  if (lower.includes('fire')) return 'Fire Safety';
  if (lower.includes('pharmacy') || lower.includes('supply')) return 'Pharmacy & Supply';
  return 'Biomedical Engineering';
}

export function mapTicketDeptToServiceDept(dept: MaintenanceTicket['department']): string {
  if (dept === 'Facilities & HVAC') return 'Facilities & Electrical';
  if (dept === 'Biomedical Engineering') return 'Biomedical Engineering';
  return dept;
}

/**
 * Ensures every Medical Equipment Maintenance & Repair Log entry has a synchronized
 * MaintenanceTicket in Maintenance Follow-Up and removes orphaned linked equipment tickets.
 */
export function syncMaintenanceTicketsFromEquipmentLogs(
  equipmentLogs: EquipmentMaintenanceLogEntry[],
  existingTickets: MaintenanceTicket[],
  defaultInspector: string,
  today: string
): {
  equipmentLogs: EquipmentMaintenanceLogEntry[];
  maintenanceTickets: MaintenanceTicket[];
} {
  const ticketById = new Map(existingTickets.map((t) => [t.id, t]));
  const ticketByEquipmentLogId = new Map(
    existingTickets
      .filter((t) => t.linkedEquipmentLogId)
      .map((t) => [t.linkedEquipmentLogId as string, t])
  );

  const validLogIds = new Set(equipmentLogs.map((l) => l.id));
  const nextLogs: EquipmentMaintenanceLogEntry[] = [];
  const syncedTickets: MaintenanceTicket[] = [];
  const consumedTicketIds = new Set<string>();

  for (const log of equipmentLogs) {
    const existingTicket =
      (log.linkedTicketId ? ticketById.get(log.linkedTicketId) : undefined) ||
      ticketByEquipmentLogId.get(log.id);

    const ticketStatus = mapEquipmentLogStatusToTicketStatus(log.status);
    const reportedDate = log.reportedDate || today;
    const resolvedDate =
      ticketStatus === 'Resolved' ? log.resolvedDate || today : null;
    const mohBadge =
      log.mohNumber && log.mohNumber !== '—' ? ` (MOH: ${log.mohNumber})` : '';
    const title = `${log.equipmentName}${mohBadge} — ${log.issueDescription}`;
    const notesParts = [
      log.workOrderNo?.trim() ? `WO: ${log.workOrderNo.trim()}` : '',
      log.serviceDepartment?.trim() ? `Service: ${log.serviceDepartment.trim()}` : '',
      log.actionTaken?.trim() ? log.actionTaken.trim() : '',
    ].filter(Boolean);
    const notes = notesParts.join(' · ');

    if (existingTicket) {
      consumedTicketIds.add(existingTicket.id);
      const updatedTicket: MaintenanceTicket = {
        ...existingTicket,
        title,
        sourceArea: `Medical Equipment (${log.tableName || 'Equipment Log'})`,
        unit: log.unit,
        department: mapServiceDeptToTicketDept(log.serviceDepartment),
        status: ticketStatus,
        reportedDate,
        reportedBy: log.reportedBy || defaultInspector,
        resolvedDate,
        notes: notes || existingTicket.notes,
        linkedEquipmentLogId: log.id,
      };
      syncedTickets.push(updatedTicket);
      nextLogs.push({ ...log, linkedTicketId: existingTicket.id });
    } else {
      const newTicketId = `mnt-eq-${log.id}`;
      consumedTicketIds.add(newTicketId);
      const newTicket: MaintenanceTicket = {
        id: newTicketId,
        title,
        sourceArea: `Medical Equipment (${log.tableName || 'Equipment Log'})`,
        unit: log.unit,
        department: mapServiceDeptToTicketDept(log.serviceDepartment),
        priority: ticketStatus === 'Resolved' ? 'Routine' : 'Urgent',
        status: ticketStatus,
        reportedDate,
        reportedBy: log.reportedBy || defaultInspector,
        targetDate: addDaysIso(reportedDate, 3),
        resolvedDate,
        notes: notes || 'Synced from Medical Equipment Maintenance, Repair Log & Follow-Up.',
        linkedEquipmentLogId: log.id,
      };
      syncedTickets.push(newTicket);
      nextLogs.push({ ...log, linkedTicketId: newTicketId });
    }
  }

  const remainingTickets = existingTickets.filter((tk) => {
    if (consumedTicketIds.has(tk.id)) return false;
    if (tk.linkedEquipmentLogId && !validLogIds.has(tk.linkedEquipmentLogId)) return false;
    return true;
  });

  return {
    equipmentLogs: nextLogs,
    maintenanceTickets: [...syncedTickets, ...remainingTickets],
  };
}
