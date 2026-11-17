import type {
  EnvironmentalFollowUpRow,
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
