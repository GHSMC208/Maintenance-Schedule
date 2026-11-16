import type {
  CheckingWeekday,
  CylinderMonthlySchedule,
  CylinderWeekPlan,
  CylinderWeekStaffMember,
  OxygenCylinder,
} from '../types/ward';
import { addDaysIso } from '../utils/dateUtils';

export const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

export const WEEKDAY_LABELS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;

export function formatDdMmYy(dateStr: string | undefined): string {
  if (!dateStr) return '';
  const trimmed = dateStr.trim();
  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    return `${isoMatch[3]}-${isoMatch[2]}-${isoMatch[1].slice(2)}`;
  }
  return trimmed;
}

/**
 * Returns every YYYY-MM-DD occurrence of `dayOfWeek` inside `(year, month)` (1-indexed month).
 * Every Gregorian month has minimum 4 and maximum 5 occurrences of any weekday.
 */
export function computeWeeklyDatesForMonth(
  year: number,
  month: number,
  dayOfWeek: CheckingWeekday
): string[] {
  const safeYear = Number.isFinite(year) && year >= 2020 && year <= 2099 ? year : 2026;
  const safeMonth = Number.isFinite(month) && month >= 1 && month <= 12 ? month : 1;
  const daysInMonth = new Date(Date.UTC(safeYear, safeMonth, 0)).getUTCDate();
  const dates: string[] = [];

  for (let day = 1; day <= daysInMonth; day++) {
    const dt = new Date(Date.UTC(safeYear, safeMonth - 1, day));
    if (dt.getUTCDay() === dayOfWeek) {
      dates.push(
        `${safeYear}-${String(safeMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      );
    }
  }
  return dates;
}

const DEFAULT_WEEKLY_STAFF_ROTATION: Array<{ staffName: string; role: string }> = [
  { staffName: 'RN Khalid Hassan', role: 'Charge Nurse' },
  { staffName: 'RN Sara Al-Mansoor', role: 'Staff Nurse' },
  { staffName: 'RN Nadia Omar', role: 'Staff Nurse' },
  { staffName: 'RN Tariq Youssef', role: 'Staff Nurse' },
  { staffName: 'RN Khalid Hassan', role: 'Charge Nurse' },
];

export function createDefaultWeekStaff(weekNumber: number): CylinderWeekStaffMember[] {
  const preset =
    DEFAULT_WEEKLY_STAFF_ROTATION[(weekNumber - 1) % DEFAULT_WEEKLY_STAFF_ROTATION.length];
  return [
    {
      id: `cyl-w${weekNumber}-st-1`,
      staffName: preset.staffName,
      role: preset.role,
      signature: '',
    },
  ];
}

export function buildCylinderWeeksForMonth(
  year: number,
  month: number,
  dayOfWeek: CheckingWeekday,
  existingWeeks?: CylinderWeekPlan[]
): CylinderWeekPlan[] {
  const dates = computeWeeklyDatesForMonth(year, month, dayOfWeek);
  return dates.map((checkDate, idx) => {
    const weekNumber = idx + 1;
    const existing = existingWeeks?.find((w) => w.weekNumber === weekNumber);
    const assignedStaff =
      existing && Array.isArray(existing.assignedStaff) && existing.assignedStaff.length > 0
        ? existing.assignedStaff.map((st) => ({ ...st }))
        : createDefaultWeekStaff(weekNumber);

    return {
      weekNumber,
      checkDate,
      assignedStaff,
      records: existing?.records ? { ...existing.records } : {},
    };
  });
}

export function createInitialCylinderSchedule(today: string): CylinderMonthlySchedule {
  const [yStr, mStr] = today.split('-');
  const year = Number(yStr) || 2026;
  const month = Number(mStr) || 1;
  // Default checking day: Sunday (0), matching 04-01-26 in the official checklist
  const checkDayOfWeek: CheckingWeekday = 0;

  return {
    wardLocation: '208 CCU',
    month,
    year,
    checkDayOfWeek,
    weeks: buildCylinderWeeksForMonth(year, month, checkDayOfWeek),
  };
}

interface PdfCylinderSeedRow {
  id: string;
  batchNumber: string;
  location: string;
  sizeLiters: number;
  dateOfFilling: string;
  pressurePsi: number;
  typeOfGas: string;
  cylinderType: string;
  conditionStatus: string;
  valveAndLeakCheck: boolean;
  spareAvailable: boolean;
}

const PDF_CYLINDER_SEED: PdfCylinderSeedRow[] = [
  {
    id: 'ox-01',
    batchNumber: '5J54',
    location: '208 CCU',
    sizeLiters: 1000,
    dateOfFilling: '30-12-25',
    pressurePsi: 2000,
    typeOfGas: 'OXYGEN',
    cylinderType: 'Aluminium',
    conditionStatus: 'GOOD/ green',
    valveAndLeakCheck: true,
    spareAvailable: true,
  },
  {
    id: 'ox-02',
    batchNumber: '180',
    location: '208 CCU',
    sizeLiters: 1000,
    dateOfFilling: '21-01-26',
    pressurePsi: 2000,
    typeOfGas: 'OXYGEN',
    cylinderType: 'Aluminium',
    conditionStatus: 'GOOD/ green',
    valveAndLeakCheck: true,
    spareAvailable: true,
  },
  {
    id: 'ox-03',
    batchNumber: '276',
    location: '208 CCU',
    sizeLiters: 1000,
    dateOfFilling: '18-01-26',
    pressurePsi: 2000,
    typeOfGas: 'OXYGEN',
    cylinderType: 'Aluminium',
    conditionStatus: 'GOOD/ green',
    valveAndLeakCheck: true,
    spareAvailable: true,
  },
  {
    id: 'ox-04',
    batchNumber: '848',
    location: '208 CCU',
    sizeLiters: 1000,
    dateOfFilling: '22-02-25',
    pressurePsi: 2000,
    typeOfGas: 'OXYGEN',
    cylinderType: 'Aluminium',
    conditionStatus: 'GOOD/ green',
    valveAndLeakCheck: true,
    spareAvailable: true,
  },
  {
    id: 'ox-05',
    batchNumber: '5689',
    location: '208 CCU',
    sizeLiters: 500,
    dateOfFilling: '26-12-25',
    pressurePsi: 2000,
    typeOfGas: 'OXYGEN',
    cylinderType: 'Aluminium',
    conditionStatus: 'GOOD/ green',
    valveAndLeakCheck: true,
    spareAvailable: true,
  },
  {
    id: 'ox-06',
    batchNumber: '5690',
    location: '208 CCU',
    sizeLiters: 500,
    dateOfFilling: '26-12-25',
    pressurePsi: 2000,
    typeOfGas: 'OXYGEN',
    cylinderType: 'Aluminium',
    conditionStatus: 'GOOD/ green',
    valveAndLeakCheck: true,
    spareAvailable: true,
  },
  {
    id: 'ox-07',
    batchNumber: '5767',
    location: '208 CCU',
    sizeLiters: 500,
    dateOfFilling: '31-12-25',
    pressurePsi: 2000,
    typeOfGas: 'OXYGEN',
    cylinderType: 'Aluminium',
    conditionStatus: 'GOOD/ green',
    valveAndLeakCheck: true,
    spareAvailable: true,
  },
  {
    id: 'ox-08',
    batchNumber: '157',
    location: '208 CCU',
    sizeLiters: 500,
    dateOfFilling: '11-01-26',
    pressurePsi: 2000,
    typeOfGas: 'OXYGEN',
    cylinderType: 'Aluminium',
    conditionStatus: 'GOOD/ green',
    valveAndLeakCheck: true,
    spareAvailable: true,
  },
  {
    id: 'ox-09',
    batchNumber: '862',
    location: '208 CCU',
    sizeLiters: 500,
    dateOfFilling: '24-02-26',
    pressurePsi: 2000,
    typeOfGas: 'OXYGEN',
    cylinderType: 'Aluminium',
    conditionStatus: 'GOOD/ green',
    valveAndLeakCheck: true,
    spareAvailable: true,
  },
  {
    id: 'ox-10',
    batchNumber: '827',
    location: '208 CCU',
    sizeLiters: 500,
    dateOfFilling: '22-02-26',
    pressurePsi: 2000,
    typeOfGas: 'OXYGEN',
    cylinderType: 'Aluminium',
    conditionStatus: 'GOOD/ green',
    valveAndLeakCheck: true,
    spareAvailable: true,
  },
  {
    id: 'ox-11',
    batchNumber: '860',
    location: '208 CCU',
    sizeLiters: 500,
    dateOfFilling: '22-02-26',
    pressurePsi: 2000,
    typeOfGas: 'OXYGEN',
    cylinderType: 'Aluminium',
    conditionStatus: 'GOOD/ green',
    valveAndLeakCheck: true,
    spareAvailable: true,
  },
  {
    id: 'ox-12',
    batchNumber: '615',
    location: '208 CCU',
    sizeLiters: 500,
    dateOfFilling: '08-02-26',
    pressurePsi: 2000,
    typeOfGas: 'OXYGEN',
    cylinderType: 'Aluminium',
    conditionStatus: 'GOOD/ green',
    valveAndLeakCheck: true,
    spareAvailable: true,
  },
];

export function createInitialOfficialCylinders(today: string): OxygenCylinder[] {
  return PDF_CYLINDER_SEED.map((row, idx) => ({
    id: row.id,
    cylinderCode: row.batchNumber,
    location: row.location,
    unit: 'CCU',
    size: row.sizeLiters >= 1000 ? 'H/J-Cylinder (Backup)' : 'E-Cylinder (Portable)',
    sizeLiters: row.sizeLiters,
    dateOfFilling: row.dateOfFilling,
    typeOfGas: row.typeOfGas,
    cylinderType: row.cylinderType,
    conditionStatus: row.conditionStatus,
    spareAvailable: row.spareAvailable,
    pressurePsi: row.pressurePsi,
    minThresholdPsi: 500,
    valveAndLeakCheck: row.valveAndLeakCheck,
    securedInRack: true,
    hydrostaticExpiry: addDaysIso(today, 450 + idx * 15),
    lastCheckedDate: today,
    lastCheckedBy: 'RN Khalid Hassan',
    notes: '',
  }));
}
