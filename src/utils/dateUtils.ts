import type { InventoryItem, OxygenCylinder, ScheduleTask } from '../types/ward';

export function getTodayIso(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function daysBetween(fromIso: string, toIso: string): number {
  const [fy, fm, fd] = fromIso.split('-').map(Number);
  const [ty, tm, td] = toIso.split('-').map(Number);
  const fromUtc = Date.UTC(fy, fm - 1, fd);
  const toUtc = Date.UTC(ty, tm - 1, td);
  return Math.round((toUtc - fromUtc) / (1000 * 60 * 60 * 24));
}

export function addDaysIso(dateIso: string, days: number): string {
  const [y, m, d] = dateIso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  const ny = dt.getUTCFullYear();
  const nm = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const nd = String(dt.getUTCDate()).padStart(2, '0');
  return `${ny}-${nm}-${nd}`;
}

export function addMonthsIso(dateIso: string, months: number): string {
  const [y, m, d] = dateIso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1 + months, d));
  const ny = dt.getUTCFullYear();
  const nm = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const nd = String(dt.getUTCDate()).padStart(2, '0');
  return `${ny}-${nm}-${nd}`;
}

export function formatShortDate(dateIso: string | null): string {
  if (!dateIso) return '—';
  const [y, m, d] = dateIso.split('-').map(Number);
  if (!y || !m || !d) return dateIso;
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export type ExpiryState = 'expired' | 'expiring-soon' | 'valid' | 'none';

export function getExpiryStatus(
  expiryDate: string | null | undefined,
  todayIso: string
): { state: ExpiryState; daysLeft: number | null; label: string } {
  if (!expiryDate) {
    return { state: 'none', daysLeft: null, label: 'No Expiry' };
  }
  const diff = daysBetween(todayIso, expiryDate);
  if (diff < 0) {
    return {
      state: 'expired',
      daysLeft: diff,
      label: `Expired ${Math.abs(diff)}d ago`,
    };
  }
  if (diff === 0) {
    return { state: 'expired', daysLeft: 0, label: 'Expires Today' };
  }
  if (diff <= 30) {
    return {
      state: 'expiring-soon',
      daysLeft: diff,
      label: `Expires in ${diff}d`,
    };
  }
  return { state: 'valid', daysLeft: diff, label: `Valid (${diff}d)` };
}

export function getTaskDueState(
  task: ScheduleTask,
  todayIso: string
): { state: 'overdue' | 'due-soon' | 'scheduled' | 'follow-up'; daysLeft: number; label: string } {
  if (task.status === 'follow-up') {
    return { state: 'follow-up', daysLeft: daysBetween(todayIso, task.dueDate), label: 'Follow-Up Needed' };
  }
  const diff = daysBetween(todayIso, task.dueDate);
  if (diff < 0) {
    return {
      state: 'overdue',
      daysLeft: diff,
      label: `Overdue by ${Math.abs(diff)}d`,
    };
  }
  if (diff === 0) {
    return { state: 'due-soon', daysLeft: 0, label: 'Due Today' };
  }
  if (diff <= 3) {
    return { state: 'due-soon', daysLeft: diff, label: `Due in ${diff}d` };
  }
  return { state: 'scheduled', daysLeft: diff, label: `Due in ${diff}d` };
}

export function getCylinderPressureState(cylinder: OxygenCylinder): {
  state: 'critical' | 'warning' | 'nominal';
  label: string;
  pct: number;
} {
  const pct = Math.max(0, Math.min(100, Math.round((cylinder.pressurePsi / 2000) * 100)));
  if (cylinder.pressurePsi < cylinder.minThresholdPsi) {
    return { state: 'critical', label: 'Refill / Replace Now', pct };
  }
  if (cylinder.pressurePsi < 1200) {
    return { state: 'warning', label: 'Replace Soon', pct };
  }
  return { state: 'nominal', label: 'Full / Ready', pct };
}

export function isItemAttentionNeeded(item: InventoryItem, todayIso: string): boolean {
  const exp = getExpiryStatus(item.expiryDate, todayIso);
  if (exp.state === 'expired' || exp.state === 'expiring-soon') return true;
  if (item.quantity < item.parLevel) return true;
  if (item.equipmentStatus && item.equipmentStatus !== 'Operational') return true;
  if (item.nextPmDate) {
    const pmDiff = daysBetween(todayIso, item.nextPmDate);
    if (pmDiff <= 14) return true;
  }
  return false;
}

export function escapeCsvCell(val: string | number | boolean | null | undefined): string {
  const str = val === null || val === undefined ? '' : String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function downloadTextFile(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
