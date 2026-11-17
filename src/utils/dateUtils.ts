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

export function isStoreItemNearExpiry(
  item: InventoryItem,
  todayIso: string,
  monthsWindow: 1 | 3 | 6 = 3
): boolean {
  const cutoffIso = addMonthsIso(todayIso, monthsWindow);
  const d1 = item.expiryDate?.trim();
  const d2 = item.secondExpiryDate?.trim();
  return Boolean((d1 && d1 <= cutoffIso) || (d2 && d2 <= cutoffIso));
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

function clampDayToMonth(year: number, month: number, day: number): string {
  const maxDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const safeDay = Math.max(1, Math.min(day, maxDay));
  return `${year}-${String(month).padStart(2, '0')}-${String(safeDay).padStart(2, '0')}`;
}

function normalizeYear(rawYear: number): number {
  return rawYear < 100 ? 2000 + rawYear : rawYear;
}

export function parseCrashCartReferenceDate(checkDateStr: string): string {
  const m = checkDateStr.match(/(\d{1,2})\s*[/-]\s*(\d{1,2})\s*[/-]\s*(\d{2,4})/);
  if (m) {
    const d = Number(m[1]);
    const mo = Number(m[2]);
    const y = normalizeYear(Number(m[3]));
    if (mo >= 1 && mo <= 12 && y >= 2000 && y <= 2100) {
      return clampDayToMonth(y, mo, d);
    }
  }
  return getTodayIso();
}

export function extractIsoDatesFromSlot(slotValue: string): string[] {
  const text = slotValue.trim();
  if (!text) return [];
  const upper = text.toUpperCase();
  if (upper === 'NA' || upper === 'NIL' || upper === 'NILL') return [];

  const results: string[] = [];

  // 1. Match full DD-MM-YYYY or DD/MM/YYYY or DD-MM-YY
  const fullRe = /(\d{1,2})\s*[/-]\s*(\d{1,2})\s*[/-]\s*(\d{2,4})/g;
  const remainder = text.replace(fullRe, (_match, dStr, mStr, yStr) => {
    const d = Number(dStr);
    const mo = Number(mStr);
    const y = normalizeYear(Number(yStr));
    if (mo >= 1 && mo <= 12 && d >= 1 && d <= 31 && y >= 2020 && y <= 2045) {
      results.push(clampDayToMonth(y, mo, d));
    }
    return ' ';
  });

  // 2. Match MM-YYYY or MM/YYYY or MM-YY in remaining text (month-year expiry means end of that month)
  const myRe = /\b(\d{1,2})\s*[/-]\s*(\d{2,4})\b/g;
  let m: RegExpExecArray | null;
  while ((m = myRe.exec(remainder)) !== null) {
    const mo = Number(m[1]);
    const y = normalizeYear(Number(m[2]));
    if (mo >= 1 && mo <= 12 && y >= 2020 && y <= 2045) {
      const lastDay = new Date(Date.UTC(y, mo, 0)).getUTCDate();
      results.push(clampDayToMonth(y, mo, lastDay));
    }
  }

  return results;
}

export type CrashCartExpirySeverity = 'expired' | 'near-3m' | 'ok';

export function getCrashCartSlotExpirySeverity(
  slotValue: string,
  referenceDateIso: string
): CrashCartExpirySeverity {
  const dates = extractIsoDatesFromSlot(slotValue);
  if (dates.length === 0) return 'ok';

  // End of the 3rd calendar month from the reference date (e.g., Nov 2026 -> Feb 28, 2027)
  const [ry, rm] = referenceDateIso.split('-').map(Number);
  const cutoffDate = new Date(Date.UTC(ry, rm - 1 + 3 + 1, 0));
  const cutoffIso = `${cutoffDate.getUTCFullYear()}-${String(cutoffDate.getUTCMonth() + 1).padStart(2, '0')}-${String(cutoffDate.getUTCDate()).padStart(2, '0')}`;

  let worst: CrashCartExpirySeverity = 'ok';
  for (const iso of dates) {
    if (iso < referenceDateIso) {
      return 'expired';
    }
    if (iso <= cutoffIso) {
      worst = 'near-3m';
    }
  }
  return worst;
}

