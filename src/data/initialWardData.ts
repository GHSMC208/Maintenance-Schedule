import type { CategoryMeta, SectionPeriodMeta, WardStoreData } from '../types/ward';
import { addDaysIso, getTodayIso } from '../utils/dateUtils';
import { syncNearExpiryInPharmacyForms } from '../utils/nearExpirySync';
import { createInitialBloodTrolleyItems } from './bloodTrolleySeed';
import { createInitialCrashCarts } from './crashCartSeed';
import {
  createInitialEquipmentItems,
  createInitialEquipmentMaintenanceLogs,
} from './equipmentSeed';
import {
  createInitialIvMedsAuditMeta,
  createInitialIvMedsItems,
} from './ivMedsSeed';
import { createInitialPharmacyForms } from './pharmacyFormsSeed';
import {
  createInitialCylinderSchedule,
  createInitialOfficialCylinders,
} from './oxygenCylinderSeed';
import {
  createInitialPrepRoomItems,
  DEFAULT_PREP_ROOM_CCU_COMMENTS,
} from './prepRoomSeed';
import { createInitialProcedureTrolleyItems } from './procedureTrolleySeed';
import { createInitialStoreItems } from './storeItemsSeed';
import {
  createInitialTransferBagItems,
  createInitialTransferBagMeta,
} from './transferBagSeed';
import {
  createInitialEnvironmentalChecks,
  createInitialEnvironmentalRoundMeta,
  createInitialEnvironmentalStaff,
} from './environmentalRoundSeed';

export const CORE_CATEGORIES: CategoryMeta[] = [
  {
    id: 'equipment',
    label: 'Medical Equipment',
    shortLabel: 'Medical Equipment',
    description:
      'Medical Equipment Monthly Inventory organized across 10 official ward tables: Patient Beds, Cardiac Monitors, CCU Central, Crash Cart Trolleys, Suction & O2, ECG, Telemetry, Alaris Infusion Pumps, and Others.',
    supportsUnitSplit: true,
    isEquipment: true,
  },
  {
    id: 'store',
    label: 'Store Items',
    shortLabel: 'Store Items',
    description:
      'Standardized hospital Store Checklist across 8 store sections — Stock No., Item description, Quantity available, Expiry Date 1 & 2.',
    supportsUnitSplit: false,
  },
  {
    id: 'prep-room',
    label: 'Preparation Room (CCU & SD)',
    shortLabel: 'Prep Room CCU/SD',
    description: 'Medication & sterile preparation room stock, diluents, and expiry verification across CCU and SD.',
    supportsUnitSplit: true,
  },
  {
    id: 'blood-trolley',
    label: 'Blood Collection Trolley (CCU & SD)',
    shortLabel: 'Blood Trolley CCU/SD',
    description:
      'Official 4-drawer Blood Collection Trolley Expiry Checklist covering 1st–4th Drawers across CCU and SD.',
    supportsUnitSplit: true,
  },
  {
    id: 'procedure-trolley',
    label: 'Procedure Trolley',
    shortLabel: 'Procedure Trolley',
    description:
      'Official 42-item Procedure Trolley checklist covering sterile central line kits, catheters, syringes, needles, sutures, dressings, and dual expiry dates.',
    supportsUnitSplit: false,
  },
  {
    id: 'iv-meds',
    label: 'Stock IV Fluids & Medications',
    shortLabel: 'IV Fluids & Meds',
    description:
      'Organized lists matching CAD Checklist, High-Alert Meds, Refrigerator Stock, IV Fluids, and Near Expiry — monthly scheduled staff audit.',
    supportsUnitSplit: false,
  },
  {
    id: 'transfer-bag',
    label: 'Emergency Patient Transfer Bag',
    shortLabel: 'Transfer Bag',
    description: 'Emergency Bag Checklist – Ward: 28 standardized items checked and locked monthly and post each use.',
    supportsUnitSplit: false,
  },
];

export function createDefaultSectionPeriodMeta(today: string): SectionPeriodMeta {
  const [year, monthNum, day] = today.split('-');
  const dt = new Date(Number(year), Math.max(0, Number(monthNum) - 1), Number(day));
  const month = Number.isNaN(dt.getTime())
    ? ''
    : dt.toLocaleDateString('en-US', { month: 'long' });
  return {
    wardNumber: '',
    month,
    year: year || '',
  };
}

export function createInitialStoreStaff(today: string) {
  const [y, m, d] = today.split('-');
  const slashDate = y && m && d ? `${d}/${m}/${y}` : '';
  return [
    {
      id: 'st-staff-1',
      staffName: 'RN Sara Al-Mansoor',
      role: 'Staff Nurse / Store Lead',
      assignedSections: 'All Store Categories',
      checkedDate: slashDate,
      signature: '',
    },
  ];
}

export function createInitialProcedureTrolleyStaff(today: string) {
  const [y, m, d] = today.split('-');
  const slashDate = y && m && d ? `${d}/${m}/${y}` : '';
  return [
    {
      id: 'pt-staff-1',
      staffName: 'RN Tariq Youssef',
      role: 'Staff Nurse / Trolley Lead',
      assignedSections: 'All Procedure Trolley Items (No. 1–42)',
      checkedDate: slashDate,
      signature: '',
    },
  ];
}

export function createInitialPrepRoomStaff(today: string) {
  const [y, m, d] = today.split('-');
  const slashDate = y && m && d ? `${d}/${m}/${y}` : '';
  return [
    {
      id: 'pr-staff-1',
      staffName: 'RN Sara Al-Mansoor',
      role: 'Staff Nurse / CCU Lead',
      assignedSections: 'CCU Preparation Room (No. 1–38)',
      checkedDate: slashDate,
      signature: '',
    },
    {
      id: 'pr-staff-2',
      staffName: 'RN Nadia Omar',
      role: 'Staff Nurse / SD Lead',
      assignedSections: 'SD Preparation Room (No. 1–32)',
      checkedDate: slashDate,
      signature: '',
    },
  ];
}

export function createInitialBloodTrolleyStaff(today: string) {
  const [y, m, d] = today.split('-');
  const slashDate = y && m && d ? `${d}/${m}/${y}` : '';
  return [
    {
      id: 'bt-staff-1',
      staffName: 'RN Sara Al-Mansoor',
      role: 'Staff Nurse / CCU Lead',
      assignedSections: 'CCU Blood Collection Trolley (1st – 4th Drawer)',
      checkedDate: slashDate,
      signature: '',
    },
    {
      id: 'bt-staff-2',
      staffName: 'RN Nadia Omar',
      role: 'Staff Nurse / SD Lead',
      assignedSections: 'SD Blood Collection Trolley (1st – 4th Drawer)',
      checkedDate: slashDate,
      signature: '',
    },
  ];
}

export function createInitialEquipmentStaff(today: string) {
  const [y, m, d] = today.split('-');
  const slashDate = y && m && d ? `${d}/${m}/${y}` : '';
  return [
    {
      id: 'eq-staff-1',
      staffName: 'RN Sara Al-Mansoor',
      role: 'Staff Nurse / CCU Lead',
      assignedSections: 'Tables 1–5 (Beds, Monitors, Central, Crash Carts, Suction)',
      checkedDate: slashDate,
      signature: '',
    },
    {
      id: 'eq-staff-2',
      staffName: 'RN Nadia Omar',
      role: 'Staff Nurse / SD & Pumps Lead',
      assignedSections: 'Tables 6–9 (ECG, Telemetry, Alaris Pumps & Others)',
      checkedDate: slashDate,
      signature: '',
    },
  ];
}

export function createInitialSectionMeta(today: string): Record<string, SectionPeriodMeta> {
  const base = createDefaultSectionPeriodMeta(today);
  const [y, m, d] = today.split('-');
  const slashDate = y && m && d ? `${d}/${m}/${y}` : '';
  return {
    equipment: {
      ...base,
      wardNumber: '208',
      staffName: 'RN Sara Al-Mansoor',
      signature: '',
      date: slashDate,
      staffAssignments: createInitialEquipmentStaff(today),
    },
    store: {
      ...base,
      staffName: 'RN Sara Al-Mansoor',
      signature: '',
      date: slashDate,
      staffAssignments: createInitialStoreStaff(today),
    },
    'prep-room': {
      ...base,
      staffName: 'RN Sara Al-Mansoor',
      signature: '',
      date: slashDate,
      comments: DEFAULT_PREP_ROOM_CCU_COMMENTS,
      staffAssignments: createInitialPrepRoomStaff(today),
    },
    'blood-trolley': {
      ...base,
      wardNumber: '208',
      staffName: 'RN Sara Al-Mansoor',
      signature: '',
      date: slashDate,
      staffAssignments: createInitialBloodTrolleyStaff(today),
    },
    'procedure-trolley': {
      ...base,
      staffName: 'RN Tariq Youssef',
      signature: '',
      date: slashDate,
      staffAssignments: createInitialProcedureTrolleyStaff(today),
    },
    environmental: {
      ...base,
      wardNumber: '208 (CCU & Step-Down)',
      staffName: 'RN Sara Al-Mansoor',
      signature: '',
      date: slashDate,
      staffAssignments: createInitialEnvironmentalStaff(today),
    },
  };
}

export function createInitialWardData(): WardStoreData {
  const today = getTodayIso();
  const crashCarts = createInitialCrashCarts();
  const pharmacyForms = syncNearExpiryInPharmacyForms(
    createInitialPharmacyForms(),
    crashCarts
  );

  return {
    wardName: 'Cardiac Care (CCU) & Step-Down (SD) Ward',
    defaultInspector: 'RN Sara Al-Mansoor',
    customCategories: [],
    crashCarts,
    pharmacyForms,
    transferBagMeta: createInitialTransferBagMeta(today),
    ivMedsAuditMeta: createInitialIvMedsAuditMeta(today),
    sectionMeta: createInitialSectionMeta(today),
    environmentalRoundMeta: createInitialEnvironmentalRoundMeta(today),
    equipmentMaintenanceLogs: createInitialEquipmentMaintenanceLogs(today),
    lastBackupDate: null,
    tasks: [
      {
        id: 'tsk-01',
        title: 'Weekly Oxygen Cylinders Pressure & Leak Inspection',
        category: 'Oxygen Cylinders',
        unit: 'All Units',
        frequency: 'weekly',
        dueDate: today,
        lastCompletedDate: addDaysIso(today, -7),
        lastInspector: 'RN Khalid Hassan',
        status: 'pending',
        assignedRole: 'Charge Nurse',
        notes: 'Verify PSI >= 1800 on backup racks, check valve seal & chain restraint.',
      },
      {
        id: 'tsk-02',
        title: 'Blood Collection Trolley (CCU & SD) Restock & Expiry Audit',
        category: 'Blood Collection Trolley',
        unit: 'CCU',
        frequency: 'weekly',
        dueDate: addDaysIso(today, 1),
        lastCompletedDate: addDaysIso(today, -6),
        lastInspector: 'RN Sara Al-Mansoor',
        status: 'pending',
        assignedRole: 'Morning Shift RN',
        notes: 'Check vacutainer tube expiry dates and blood culture bottle availability.',
      },
      {
        id: 'tsk-03',
        title: 'Emergency Patient Transfer Bag Seal & Item Check',
        category: 'Emergency Transfer Bag',
        unit: 'All Units',
        frequency: 'weekly',
        dueDate: addDaysIso(today, -1),
        lastCompletedDate: addDaysIso(today, -8),
        lastInspector: 'RN Nadia Omar',
        status: 'pending',
        assignedRole: 'ICU/CCU Transfer Nurse',
        notes: 'Confirm portable suction battery, BVM mask, and emergency dextrose/epinephrine expiry.',
      },
      {
        id: 'tsk-04',
        title: 'Preparation Room (CCU & SD) Cleaning, Temp & Expiry Check',
        category: 'Preparation Room',
        unit: 'SD',
        frequency: 'weekly',
        dueDate: addDaysIso(today, 2),
        lastCompletedDate: addDaysIso(today, -5),
        lastInspector: 'RN Sara Al-Mansoor',
        status: 'pending',
        assignedRole: 'Medication Nurse',
        notes: 'Log fridge 2-8°C, discard opened multi-dose vials beyond 28d.',
      },
      {
        id: 'tsk-05',
        title: 'Procedure Trolley Sterile Pack & Tray Verification',
        category: 'Procedure Trolley',
        unit: 'General Ward',
        frequency: 'weekly',
        dueDate: addDaysIso(today, 3),
        lastCompletedDate: addDaysIso(today, -4),
        lastInspector: 'RN Tariq Youssef',
        status: 'completed',
        assignedRole: 'Procedure Nurse',
        notes: 'All central line kits and sterile dressing packs verified intact.',
      },
      {
        id: 'tsk-06',
        title: 'Monthly Medical Equipment Inventory & Biomedical Status Audit',
        category: 'Medical Equipment',
        unit: 'All Units',
        frequency: 'monthly',
        dueDate: addDaysIso(today, 4),
        lastCompletedDate: addDaysIso(today, -26),
        lastInspector: 'Biomed Tech Rami',
        status: 'pending',
        assignedRole: 'Head Nurse & Biomed',
        notes: 'Reconcile all infusion pumps, monitors, ventilators, and PPM stickers.',
      },
      {
        id: 'tsk-07',
        title: 'Monthly Ward Store Items Par Level & Expiry Rotation (FEFO)',
        category: 'Store Items',
        unit: 'General Ward',
        frequency: 'monthly',
        dueDate: addDaysIso(today, 9),
        lastCompletedDate: addDaysIso(today, -21),
        lastInspector: 'Supply Coordinator',
        status: 'pending',
        assignedRole: 'Ward Storekeeper',
        notes: 'First-Expired First-Out rotation; flag items expiring within 60 days.',
      },
      {
        id: 'tsk-08',
        title: 'Monthly Stock IV Fluids & Meds Audit (CAD, High-Alert, Fridge & IV Fluids)',
        category: 'Stock IV Fluids & Meds',
        unit: 'All Units',
        frequency: 'monthly',
        dueDate: addDaysIso(today, -2),
        lastCompletedDate: addDaysIso(today, -32),
        lastInspector: 'RN Sara Al-Mansoor, RN Khalid Hassan, RN Nadia Omar',
        status: 'follow-up',
        assignedRole: 'Assigned Ward Staff',
        notes: 'Covers CAD Checklist, High-Alert Meds, Refrigerator Stock, and IV Fluids. Amiodarone ampoules expiring soon — replacement ordered.',
      },
      {
        id: 'tsk-09',
        title: 'Monthly Environmental Round & Fire-Extinguishing Tools Inspection',
        category: 'Environmental Round',
        unit: 'All Units',
        frequency: 'monthly',
        dueDate: addDaysIso(today, 6),
        lastCompletedDate: addDaysIso(today, -24),
        lastInspector: 'Safety Officer',
        status: 'pending',
        assignedRole: 'Safety Champion RN',
        notes: 'Inspect CO2/Powder fire extinguishers, fire hose reels, exit signage, and open maintenance tickets.',
      },
    ],
    inventory: [
      // Medical Equipment (Official 10-Table Monthly Inventory)
      ...createInitialEquipmentItems(today),

      // Store Items (Official Store Checklist Catalog)
      ...createInitialStoreItems(today),

      // Preparation Room (Official CCU 38-item & SD 32-item Checklists)
      ...createInitialPrepRoomItems(today),

      // Blood Collection Trolley (Official 4-Drawer 54-Item Checklist)
      ...createInitialBloodTrolleyItems(today),

      // Procedure Trolley (Official 42-Row Procedure Trolley Checklist)
      ...createInitialProcedureTrolleyItems(today),

      // Stock IV Fluids & Medications (CAD, High-Alert, Refrigerator Stock, IV Fluids)
      ...createInitialIvMedsItems(today),

      // Emergency Patient Transfer Bag (Official 28-Item Emergency Bag Checklist)
      ...createInitialTransferBagItems(today),
    ],
    environmentalChecks: createInitialEnvironmentalChecks(today),
    maintenanceTickets: [
      {
        id: 'mnt-01',
        title: 'Mindray N12 Patient Monitor (SD Bed 06) SpO2 Port Fault',
        sourceArea: 'Medical Equipment',
        unit: 'SD',
        department: 'Biomedical Engineering',
        priority: 'Urgent',
        status: 'In Progress',
        reportedDate: addDaysIso(today, -3),
        reportedBy: 'RN Nadia Omar',
        targetDate: addDaysIso(today, 2),
        resolvedDate: null,
        notes: 'Biomed took main unit to workshop; spare monitor active at SD Bed 06.',
      },
      {
        id: 'mnt-02',
        title: 'ABC Fire Extinguisher #2 Loose Wall Bracket',
        sourceArea: 'Environmental Round (Fire Safety)',
        unit: 'SD',
        department: 'Fire Safety',
        priority: 'Urgent',
        status: 'Open',
        reportedDate: addDaysIso(today, -2),
        reportedBy: 'RN Sara Al-Mansoor',
        targetDate: addDaysIso(today, 1),
        resolvedDate: null,
        notes: 'Needs heavy-duty wall anchor refastening near SD station.',
      },
      {
        id: 'mnt-03',
        title: 'CCU Preparation Room HVAC Cooling Airflow Weak (25.8°C)',
        sourceArea: 'Environmental Round (Cold Chain/HVAC)',
        unit: 'CCU',
        department: 'Facilities & HVAC',
        priority: 'Routine',
        status: 'Open',
        reportedDate: addDaysIso(today, -1),
        reportedBy: 'RN Nadia Omar',
        targetDate: addDaysIso(today, 3),
        resolvedDate: null,
        notes: 'Check thermostat damper and filter cleaning.',
      },
    ],
    oxygenCylinders: createInitialOfficialCylinders(today),
    cylinderSchedule: createInitialCylinderSchedule(today),
    oxygenLogs: [
      {
        id: 'oxl-01',
        cylinderId: 'ox-01',
        cylinderCode: '5J54',
        checkedDate: today,
        inspector: 'RN Khalid Hassan',
        pressurePsi: 2000,
        valvePass: true,
        securedPass: true,
        notes: 'Weekly check passed — GOOD/ green.',
      },
    ],
  };
}
