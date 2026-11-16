import type { InventoryItem, IvMedsAuditMeta, IvMedsGroupId } from '../types/ward';
import { addDaysIso, getCrashCartSlotExpirySeverity } from '../utils/dateUtils';

export interface IvMedsGroupMeta {
  id: IvMedsGroupId;
  label: string;
  shortLabel: string;
  formRef: string;
  description: string;
}

export const IV_MEDS_GROUPS: IvMedsGroupMeta[] = [
  {
    id: 'cad',
    label: 'CAD Checklist Medications',
    shortLabel: 'CAD Checklist',
    formRef: 'GH/NUR/2025-15',
    description: 'Controlled & addictive medications matching the official CAD Checklist.',
  },
  {
    id: 'high-alert',
    label: 'High-Alert Medications',
    shortLabel: 'High-Alert Meds',
    formRef: 'GH/NUR/2025-16',
    description: 'High-alert ward stock medications requiring double-check and expiry tracking.',
  },
  {
    id: 'refrigerator',
    label: 'Refrigerator Stock Medications',
    shortLabel: 'Refrigerator Stock',
    formRef: 'GH/NUR/2025-17',
    description: 'Cold-chain (2°C – 8°C) medications matching the Refrigerator Stock Checklist.',
  },
  {
    id: 'iv-fluids',
    label: 'Stock IV Fluids',
    shortLabel: 'IV Fluids',
    formRef: 'IV Fluids List',
    description: 'Ward intravenous infusion bags, hypertonic solutions, and IV admixtures.',
  },
  {
    id: 'near-expiry',
    label: 'Near Expiry Medications & IV Fluids',
    shortLabel: 'Near Expiry',
    formRef: 'GH/NUR/2025-18',
    description:
      'Expired & near-expiry (<= 3 months) items flagged from IV Fluids & Meds lists and the Pharmacy Near Expiry Checklist.',
  },
];

interface RawIvMedSeed {
  id: string;
  medGroup: IvMedsGroupId;
  name: string;
  unit: 'CCU' | 'SD' | 'General Ward';
  locationDetail: string;
  quantity: number;
  parLevel: number;
  uom: string;
  lot: string;
  expiryDaysOffset: number;
  notes: string;
}

const RAW_IV_MEDS_SEED: RawIvMedSeed[] = [
  // 1. CAD Checklist Items (exact 19 medications from CAD_Checklist.pdf / pharmacyFormsSeed)
  {
    id: 'iv-cad-01',
    medGroup: 'cad',
    name: 'Inj. Fentanyl 0.05mg',
    unit: 'CCU',
    locationDetail: 'CAD Double-Lock Cabinet',
    quantity: 10,
    parLevel: 10,
    uom: 'amps',
    lot: 'CAD-FEN5-101',
    expiryDaysOffset: 240,
    notes: 'Controlled narcotic — shift count verified.',
  },
  {
    id: 'iv-cad-02',
    medGroup: 'cad',
    name: 'Inj. Fentanyl 0.01mg',
    unit: 'CCU',
    locationDetail: 'CAD Double-Lock Cabinet',
    quantity: 10,
    parLevel: 10,
    uom: 'amps',
    lot: 'CAD-FEN1-102',
    expiryDaysOffset: 260,
    notes: 'Controlled narcotic.',
  },
  {
    id: 'iv-cad-03',
    medGroup: 'cad',
    name: 'Inj. Morphine 10mg',
    unit: 'CCU',
    locationDetail: 'CAD Double-Lock Cabinet',
    quantity: 10,
    parLevel: 10,
    uom: 'amps',
    lot: 'CAD-MOR-103',
    expiryDaysOffset: 210,
    notes: 'Controlled narcotic.',
  },
  {
    id: 'iv-cad-04',
    medGroup: 'cad',
    name: 'Inj. Remifentanyl 5mg',
    unit: 'CCU',
    locationDetail: 'CAD Double-Lock Cabinet',
    quantity: 5,
    parLevel: 5,
    uom: 'vials',
    lot: 'CAD-REM-104',
    expiryDaysOffset: 185,
    notes: 'Controlled narcotic.',
  },
  {
    id: 'iv-cad-05',
    medGroup: 'cad',
    name: 'Inj. Dormicum 15 mg',
    unit: 'CCU',
    locationDetail: 'CAD Double-Lock Cabinet',
    quantity: 10,
    parLevel: 10,
    uom: 'amps',
    lot: 'CAD-DOR-105',
    expiryDaysOffset: 290,
    notes: 'Midazolam controlled stock.',
  },
  {
    id: 'iv-cad-06',
    medGroup: 'cad',
    name: 'Inj. Ephedrine10mg',
    unit: 'CCU',
    locationDetail: 'CAD Double-Lock Cabinet',
    quantity: 5,
    parLevel: 5,
    uom: 'amps',
    lot: 'CAD-EPH-106',
    expiryDaysOffset: 310,
    notes: 'Controlled vasopressor.',
  },
  {
    id: 'iv-cad-07',
    medGroup: 'cad',
    name: 'Inj. Tramadol 100mg',
    unit: 'SD',
    locationDetail: 'CAD Double-Lock Cabinet',
    quantity: 10,
    parLevel: 10,
    uom: 'amps',
    lot: 'CAD-TRM-107',
    expiryDaysOffset: 270,
    notes: 'Controlled analgesic.',
  },
  {
    id: 'iv-cad-08',
    medGroup: 'cad',
    name: 'Inj. Ketamine 500mg',
    unit: 'CCU',
    locationDetail: 'CAD Double-Lock Cabinet',
    quantity: 4,
    parLevel: 4,
    uom: 'vials',
    lot: 'CAD-KET-108',
    expiryDaysOffset: 330,
    notes: 'Controlled anesthetic.',
  },
  {
    id: 'iv-cad-09',
    medGroup: 'cad',
    name: 'Inj. Oxycodone 10mg',
    unit: 'CCU',
    locationDetail: 'CAD Double-Lock Cabinet',
    quantity: 5,
    parLevel: 5,
    uom: 'amps',
    lot: 'CAD-OXYI-109',
    expiryDaysOffset: 200,
    notes: 'Controlled narcotic.',
  },
  {
    id: 'iv-cad-10',
    medGroup: 'cad',
    name: 'Inj. Propofol 200mg',
    unit: 'CCU',
    locationDetail: 'CAD Double-Lock Cabinet',
    quantity: 10,
    parLevel: 10,
    uom: 'amps',
    lot: 'CAD-PRO-110',
    expiryDaysOffset: 175,
    notes: 'Controlled sedative emulsion.',
  },
  {
    id: 'iv-cad-11',
    medGroup: 'cad',
    name: 'Inj. Valium 10mg',
    unit: 'CCU',
    locationDetail: 'CAD Double-Lock Cabinet',
    quantity: 5,
    parLevel: 5,
    uom: 'amps',
    lot: 'CAD-VAL-111',
    expiryDaysOffset: 295,
    notes: 'Diazepam controlled injection.',
  },
  {
    id: 'iv-cad-12',
    medGroup: 'cad',
    name: 'Inj. Precedex 200mcq',
    unit: 'CCU',
    locationDetail: 'CAD Double-Lock Cabinet',
    quantity: 5,
    parLevel: 5,
    uom: 'vials',
    lot: 'CAD-PRE-112',
    expiryDaysOffset: 250,
    notes: 'Dexmedetomidine ICU sedation.',
  },
  {
    id: 'iv-cad-13',
    medGroup: 'cad',
    name: 'Tab lorazepam 2 mg',
    unit: 'SD',
    locationDetail: 'CAD Double-Lock Cabinet',
    quantity: 20,
    parLevel: 20,
    uom: 'tabs',
    lot: 'CAD-LOR-113',
    expiryDaysOffset: 340,
    notes: 'Controlled oral benzodiazepine.',
  },
  {
    id: 'iv-cad-14',
    medGroup: 'cad',
    name: 'Tab Tramadol 50 mg',
    unit: 'SD',
    locationDetail: 'CAD Double-Lock Cabinet',
    quantity: 20,
    parLevel: 20,
    uom: 'tabs',
    lot: 'CAD-TRT-114',
    expiryDaysOffset: 360,
    notes: 'Controlled oral analgesic.',
  },
  {
    id: 'iv-cad-15',
    medGroup: 'cad',
    name: 'Tab Oxycodone 20mg',
    unit: 'SD',
    locationDetail: 'CAD Double-Lock Cabinet',
    quantity: 10,
    parLevel: 10,
    uom: 'tabs',
    lot: 'CAD-O20-115',
    expiryDaysOffset: 220,
    notes: 'Controlled narcotic tablet.',
  },
  {
    id: 'iv-cad-16',
    medGroup: 'cad',
    name: 'Tab Oxycodone 5mg',
    unit: 'SD',
    locationDetail: 'CAD Double-Lock Cabinet',
    quantity: 20,
    parLevel: 20,
    uom: 'tabs',
    lot: 'CAD-O05-116',
    expiryDaysOffset: 230,
    notes: 'Controlled narcotic tablet.',
  },
  {
    id: 'iv-cad-17',
    medGroup: 'cad',
    name: 'Tab amitriptyline 10 mg',
    unit: 'SD',
    locationDetail: 'CAD Double-Lock Cabinet',
    quantity: 20,
    parLevel: 20,
    uom: 'tabs',
    lot: 'CAD-AMI-117',
    expiryDaysOffset: 380,
    notes: 'CAD checklist oral stock.',
  },
  {
    id: 'iv-cad-18',
    medGroup: 'cad',
    name: 'Tab Pregabalin 75 mg',
    unit: 'SD',
    locationDetail: 'CAD Double-Lock Cabinet',
    quantity: 20,
    parLevel: 20,
    uom: 'tabs',
    lot: 'CAD-PRG-118',
    expiryDaysOffset: 350,
    notes: 'Controlled gabapentinoid.',
  },
  {
    id: 'iv-cad-19',
    medGroup: 'cad',
    name: 'Tab Diazepam 5mg',
    unit: 'SD',
    locationDetail: 'CAD Double-Lock Cabinet',
    quantity: 20,
    parLevel: 20,
    uom: 'tabs',
    lot: 'CAD-DZP-119',
    expiryDaysOffset: 315,
    notes: 'Controlled oral benzodiazepine.',
  },

  // 2. High-Alert Medications (GH/NUR/2025-16)
  {
    id: 'iv-ha-01',
    medGroup: 'high-alert',
    name: 'AMIODARONE HCL 150MG/3ML IV INJ.',
    unit: 'CCU',
    locationDetail: 'High-Alert Med Shelf B',
    quantity: 10,
    parLevel: 10,
    uom: 'amps',
    lot: 'LOT-AMD-553',
    expiryDaysOffset: 11,
    notes: 'High-alert antiarrhythmic; replacement ordered from pharmacy.',
  },
  {
    id: 'iv-ha-02',
    medGroup: 'high-alert',
    name: 'ADRENALINE 1:1000 (1MG/ML) SC/IM/IV INJ',
    unit: 'CCU',
    locationDetail: 'High-Alert Emergency Box',
    quantity: 12,
    parLevel: 12,
    uom: 'amps',
    lot: 'LOT-EPI-741',
    expiryDaysOffset: 290,
    notes: 'High-alert sticker applied.',
  },
  {
    id: 'iv-ha-03',
    medGroup: 'high-alert',
    name: 'NOR-ADRENALINE 8MG/4ML IV INJECTION',
    unit: 'CCU',
    locationDetail: 'High-Alert Med Shelf A',
    quantity: 10,
    parLevel: 10,
    uom: 'amps',
    lot: 'LOT-NOR-310',
    expiryDaysOffset: 245,
    notes: 'High-alert vasopressor; central line administration.',
  },
  {
    id: 'iv-ha-04',
    medGroup: 'high-alert',
    name: 'DOPAMINE HCL 200MG/5ML INJ',
    unit: 'CCU',
    locationDetail: 'High-Alert Med Shelf A',
    quantity: 6,
    parLevel: 6,
    uom: 'amps',
    lot: 'LOT-DOP-218',
    expiryDaysOffset: 260,
    notes: 'High-alert vasoactive infusion.',
  },
  {
    id: 'iv-ha-05',
    medGroup: 'high-alert',
    name: 'DOBUTAMINE 250 MG IV',
    unit: 'CCU',
    locationDetail: 'High-Alert Med Shelf A',
    quantity: 4,
    parLevel: 4,
    uom: 'vials',
    lot: 'LOT-DOB-409',
    expiryDaysOffset: 275,
    notes: 'High-alert inotrope.',
  },
  {
    id: 'iv-ha-06',
    medGroup: 'high-alert',
    name: 'HEPARIN 25000 UNIT/5ML IV/SC INJ',
    unit: 'CCU',
    locationDetail: 'High-Alert Med Shelf C',
    quantity: 6,
    parLevel: 6,
    uom: 'vials',
    lot: 'LOT-HEP-884',
    expiryDaysOffset: 225,
    notes: 'High-alert anticoagulant — independent double-check.',
  },
  {
    id: 'iv-ha-07',
    medGroup: 'high-alert',
    name: 'POTASSIUM CHLORIDE 10% INFUSION INJ 10 ML',
    unit: 'CCU',
    locationDetail: 'High-Alert Red Bin (Locked)',
    quantity: 10,
    parLevel: 10,
    uom: 'amps',
    lot: 'LOT-KCL-192',
    expiryDaysOffset: 340,
    notes: 'Concentrated electrolyte — NEVER administer undiluted.',
  },
  {
    id: 'iv-ha-08',
    medGroup: 'high-alert',
    name: 'MAGNESIUM SULPHATE 50% IV INJECTION 2ML',
    unit: 'CCU',
    locationDetail: 'High-Alert Med Shelf C',
    quantity: 10,
    parLevel: 10,
    uom: 'amps',
    lot: 'LOT-MGS-504',
    expiryDaysOffset: 300,
    notes: 'High-alert electrolyte.',
  },
  {
    id: 'iv-ha-09',
    medGroup: 'high-alert',
    name: 'DIGOXIN 0.5 MG/2ML INJ',
    unit: 'SD',
    locationDetail: 'High-Alert Med Shelf B',
    quantity: 4,
    parLevel: 4,
    uom: 'amps',
    lot: 'LOT-DIG-612',
    expiryDaysOffset: 215,
    notes: 'High-alert cardiac glycoside.',
  },
  {
    id: 'iv-ha-10',
    medGroup: 'high-alert',
    name: 'NITROGLYCERIN 25MG/5ML IV INJECTION',
    unit: 'CCU',
    locationDetail: 'High-Alert Med Shelf B',
    quantity: 5,
    parLevel: 5,
    uom: 'amps',
    lot: 'LOT-NTG-701',
    expiryDaysOffset: 255,
    notes: 'High-alert vasodilator infusion.',
  },
  {
    id: 'iv-ha-11',
    medGroup: 'high-alert',
    name: 'TENECTEPLASE 50MG/10ML IV INJ (METALYSE)',
    unit: 'CCU',
    locationDetail: 'High-Alert Thrombolytic Box',
    quantity: 1,
    parLevel: 1,
    uom: 'vial',
    lot: 'LOT-TNK-910',
    expiryDaysOffset: 195,
    notes: 'High-alert fibrinolytic.',
  },

  // 3. Refrigerator Stock Medications (GH/NUR/2025-17, 2°C - 8°C)
  {
    id: 'iv-ref-01',
    medGroup: 'refrigerator',
    name: 'INSULIN NEUTRAL HUMAN 100 UNIT/ML INJ',
    unit: 'CCU',
    locationDetail: 'Med Fridge Shelf 1 (2–8°C)',
    quantity: 4,
    parLevel: 4,
    uom: 'vials',
    lot: 'LOT-INSN-301',
    expiryDaysOffset: 190,
    notes: 'High-alert cold chain; mark 28-day expiry once opened.',
  },
  {
    id: 'iv-ref-02',
    medGroup: 'refrigerator',
    name: 'INSULIN NPH HUMAN 100 UNIT/ML INJ',
    unit: 'SD',
    locationDetail: 'Med Fridge Shelf 1 (2–8°C)',
    quantity: 3,
    parLevel: 3,
    uom: 'vials',
    lot: 'LOT-INSP-302',
    expiryDaysOffset: 210,
    notes: 'Cold chain 2–8°C.',
  },
  {
    id: 'iv-ref-03',
    medGroup: 'refrigerator',
    name: 'SUXAMETHONIUM CHLORIDE 100MG/2ML IV INJ',
    unit: 'CCU',
    locationDetail: 'Med Fridge Shelf 2 (2–8°C)',
    quantity: 5,
    parLevel: 5,
    uom: 'amps',
    lot: 'LOT-SUX-401',
    expiryDaysOffset: 165,
    notes: 'Neuromuscular blocker — high-alert sticker applied.',
  },
  {
    id: 'iv-ref-04',
    medGroup: 'refrigerator',
    name: 'VASOPRESSIN 20 UNIT/ML IV/IM/SC INJECTION',
    unit: 'CCU',
    locationDetail: 'Med Fridge Shelf 2 (2–8°C)',
    quantity: 4,
    parLevel: 4,
    uom: 'amps',
    lot: 'LOT-VAS-405',
    expiryDaysOffset: 220,
    notes: 'Store refrigerated.',
  },
  {
    id: 'iv-ref-05',
    medGroup: 'refrigerator',
    name: 'CISATRACURIUM BESYLATE 2MG/ML IV INJ',
    unit: 'CCU',
    locationDetail: 'Med Fridge Shelf 2 (2–8°C)',
    quantity: 5,
    parLevel: 5,
    uom: 'amps',
    lot: 'LOT-CIS-408',
    expiryDaysOffset: 180,
    notes: 'High-alert neuromuscular blocker.',
  },
  {
    id: 'iv-ref-06',
    medGroup: 'refrigerator',
    name: 'ATRACURIUM BESYLATE 25MG/2.5ML IV INJ',
    unit: 'CCU',
    locationDetail: 'Med Fridge Shelf 2 (2–8°C)',
    quantity: 5,
    parLevel: 5,
    uom: 'amps',
    lot: 'LOT-ATR-409',
    expiryDaysOffset: 170,
    notes: 'High-alert neuromuscular blocker.',
  },
  {
    id: 'iv-ref-07',
    medGroup: 'refrigerator',
    name: 'ROCURONIUM 50MG/5ML IV INJ',
    unit: 'CCU',
    locationDetail: 'Med Fridge Shelf 2 (2–8°C)',
    quantity: 4,
    parLevel: 4,
    uom: 'vials',
    lot: 'LOT-ROC-412',
    expiryDaysOffset: 230,
    notes: 'RSI paralytic — refrigerated storage.',
  },
  {
    id: 'iv-ref-08',
    medGroup: 'refrigerator',
    name: 'ESMOLOL HCL 10MG/ML IV INJECTION',
    unit: 'CCU',
    locationDetail: 'Med Fridge Shelf 3 (2–8°C)',
    quantity: 4,
    parLevel: 4,
    uom: 'vials',
    lot: 'LOT-ESM-415',
    expiryDaysOffset: 240,
    notes: 'Beta-blocker IV vial.',
  },

  // 4. Stock IV Fluids (Dedicated Ward IV Fluids List)
  {
    id: 'iv-fl-01',
    medGroup: 'iv-fluids',
    name: 'Sodium Chloride 0.9% - 1000ml (Normal Saline)',
    unit: 'General Ward',
    locationDetail: 'IV Fluid Rack 1',
    quantity: 36,
    parLevel: 30,
    uom: 'bags',
    lot: 'LOT-NS1L-982',
    expiryDaysOffset: 180,
    notes: 'Overwrap intact.',
  },
  {
    id: 'iv-fl-02',
    medGroup: 'iv-fluids',
    name: 'Sodium Chloride 0.9% - 500ml',
    unit: 'General Ward',
    locationDetail: 'IV Fluid Rack 1',
    quantity: 40,
    parLevel: 40,
    uom: 'bags',
    lot: 'LOT-NS500-983',
    expiryDaysOffset: 240,
    notes: 'Standard isotonic infusion.',
  },
  {
    id: 'iv-fl-03',
    medGroup: 'iv-fluids',
    name: 'Sodium Chloride 0.9% - 250ml',
    unit: 'CCU',
    locationDetail: 'IV Fluid Rack 1',
    quantity: 20,
    parLevel: 20,
    uom: 'bags',
    lot: 'LOT-NS250-984',
    expiryDaysOffset: 260,
    notes: 'Infusion carrier bags.',
  },
  {
    id: 'iv-fl-04',
    medGroup: 'iv-fluids',
    name: 'Sodium Chloride 0.9% - 100ml',
    unit: 'CCU',
    locationDetail: 'IV Fluid Rack 1',
    quantity: 30,
    parLevel: 30,
    uom: 'bags',
    lot: 'LOT-NS100-985',
    expiryDaysOffset: 270,
    notes: 'IV piggyback diluent bags.',
  },
  {
    id: 'iv-fl-05',
    medGroup: 'iv-fluids',
    name: 'Sodium Lactate (Ringer Lactate) - 500ml',
    unit: 'SD',
    locationDetail: 'IV Fluid Rack 2',
    quantity: 14,
    parLevel: 20,
    uom: 'bags',
    lot: 'LOT-RL500-410',
    expiryDaysOffset: 145,
    notes: 'Below par level (14/20) — include on pharmacy requisition.',
  },
  {
    id: 'iv-fl-06',
    medGroup: 'iv-fluids',
    name: 'Dextrose 5% - 500ml',
    unit: 'General Ward',
    locationDetail: 'IV Fluid Rack 2',
    quantity: 24,
    parLevel: 24,
    uom: 'bags',
    lot: 'LOT-D5W5-501',
    expiryDaysOffset: 220,
    notes: 'Verified intact.',
  },
  {
    id: 'iv-fl-07',
    medGroup: 'iv-fluids',
    name: 'Dextrose 5% - 250ml',
    unit: 'CCU',
    locationDetail: 'IV Fluid Rack 2',
    quantity: 16,
    parLevel: 16,
    uom: 'bags',
    lot: 'LOT-D5W2-502',
    expiryDaysOffset: 235,
    notes: 'Infusion carrier bags.',
  },
  {
    id: 'iv-fl-08',
    medGroup: 'iv-fluids',
    name: 'Dextrose 10% - 500ml',
    unit: 'CCU',
    locationDetail: 'IV Fluid Rack 2',
    quantity: 10,
    parLevel: 10,
    uom: 'bags',
    lot: 'LOT-D10-503',
    expiryDaysOffset: 210,
    notes: 'Hypertonic dextrose stock.',
  },
  {
    id: 'iv-fl-09',
    medGroup: 'iv-fluids',
    name: 'Dextrose 50% - 50ml',
    unit: 'CCU',
    locationDetail: 'IV Med Cabinet Shelf A',
    quantity: 8,
    parLevel: 8,
    uom: 'vials',
    lot: 'LOT-D50-504',
    expiryDaysOffset: 205,
    notes: 'Emergency hypoglycemia bolus.',
  },
  {
    id: 'iv-fl-10',
    medGroup: 'iv-fluids',
    name: 'Sodium Chloride 0.45% + Dextrose 5% - 500ml',
    unit: 'SD',
    locationDetail: 'IV Fluid Rack 3',
    quantity: 12,
    parLevel: 12,
    uom: 'bags',
    lot: 'LOT-DNS-601',
    expiryDaysOffset: 250,
    notes: 'Maintenance fluid.',
  },
  {
    id: 'iv-fl-11',
    medGroup: 'iv-fluids',
    name: 'Sodium Chloride 3% - 500ml',
    unit: 'CCU',
    locationDetail: 'IV Fluid Rack 3 (High-Alert)',
    quantity: 4,
    parLevel: 4,
    uom: 'bags',
    lot: 'LOT-HS3-602',
    expiryDaysOffset: 230,
    notes: 'Hypertonic saline — high-alert infusion.',
  },
  {
    id: 'iv-fl-12',
    medGroup: 'iv-fluids',
    name: 'Mannitol 20% - 500ml',
    unit: 'CCU',
    locationDetail: 'IV Fluid Rack 3',
    quantity: 4,
    parLevel: 4,
    uom: 'bottles',
    lot: 'LOT-MAN-603',
    expiryDaysOffset: 280,
    notes: 'Inspect for crystallization prior to administration.',
  },
  {
    id: 'iv-fl-13',
    medGroup: 'iv-fluids',
    name: 'Paracetamol I.V. (Perfalgan) - 100ml',
    unit: 'General Ward',
    locationDetail: 'IV Med Cabinet Shelf B',
    quantity: 20,
    parLevel: 20,
    uom: 'vials',
    lot: 'LOT-PCM-701',
    expiryDaysOffset: 265,
    notes: 'IV antipyretic / analgesic.',
  },
  {
    id: 'iv-fl-14',
    medGroup: 'iv-fluids',
    name: 'Metronidazole (Flagyl) - 100ml',
    unit: 'General Ward',
    locationDetail: 'IV Med Cabinet Shelf B',
    quantity: 12,
    parLevel: 12,
    uom: 'bottles',
    lot: 'LOT-MTZ-702',
    expiryDaysOffset: 295,
    notes: 'IV antimicrobial bag/bottle.',
  },
];

export function createInitialIvMedsItems(today: string): InventoryItem[] {
  return RAW_IV_MEDS_SEED.map((entry) => ({
    id: entry.id,
    categoryId: 'iv-meds',
    medGroup: entry.medGroup,
    name: entry.name,
    unit: entry.unit,
    locationDetail: entry.locationDetail,
    quantity: entry.quantity,
    parLevel: entry.parLevel,
    unitOfMeasure: entry.uom,
    batchOrSerial: entry.lot,
    expiryDate: addDaysIso(today, entry.expiryDaysOffset),
    lastCheckedDate: addDaysIso(today, -2),
    lastCheckedBy: 'RN Sara Al-Mansoor',
    notes: entry.notes,
  }));
}

export function createInitialIvMedsAuditMeta(today: string): IvMedsAuditMeta {
  const [y, m, d] = today.split('-');
  const dt = new Date(Number(y), Math.max(0, Number(m) - 1), Number(d));
  const monthName = Number.isNaN(dt.getTime())
    ? ''
    : dt.toLocaleDateString('en-US', { month: 'long' });
  const yearStr = y || '';
  const monthYear = Number.isNaN(dt.getTime())
    ? ''
    : dt.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return {
    wardNumber: '',
    month: monthName,
    year: yearStr,
    monthYear,
    staffAssignments: [
      {
        id: 'ivm-stf-1',
        staffName: 'RN Sara Al-Mansoor',
        role: 'Charge Nurse (CCU)',
        assignedLists: 'CAD Checklist & High-Alert Meds',
        checkedDate: '',
        signature: '',
      },
      {
        id: 'ivm-stf-2',
        staffName: 'RN Khalid Hassan',
        role: 'Senior Staff Nurse',
        assignedLists: 'Refrigerator Stock (2°C–8°C)',
        checkedDate: '',
        signature: '',
      },
      {
        id: 'ivm-stf-3',
        staffName: 'RN Nadia Omar',
        role: 'Medication Nurse (SD)',
        assignedLists: 'Stock IV Fluids',
        checkedDate: '',
        signature: '',
      },
    ],
    notes: 'Monthly scheduled check assigned to at least 3 ward staff members.',
  };
}

export function isIvMedNearExpiry(item: InventoryItem, todayIso: string): boolean {
  if (!item.expiryDate) return false;
  const parts = item.expiryDate.split('-');
  const formatted = parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : item.expiryDate;
  const sev = getCrashCartSlotExpirySeverity(formatted, todayIso);
  return sev === 'expired' || sev === 'near-3m';
}

export function inferIvMedsGroup(item: InventoryItem): IvMedsGroupId {
  if (item.medGroup) return item.medGroup;
  const hay = `${item.name} ${item.locationDetail} ${item.notes}`.toLowerCase();
  if (
    hay.includes('cad') ||
    hay.includes('fentanyl') ||
    hay.includes('morphine') ||
    hay.includes('tramadol') ||
    hay.includes('dormicum') ||
    hay.includes('oxycodone') ||
    hay.includes('propofol') ||
    hay.includes('ketamine') ||
    hay.includes('pregabalin') ||
    hay.includes('diazepam') ||
    hay.includes('lorazepam')
  ) {
    return 'cad';
  }
  if (
    hay.includes('fridge') ||
    hay.includes('refrigerator') ||
    hay.includes('insulin') ||
    hay.includes('suxamethonium') ||
    hay.includes('succinyl') ||
    hay.includes('vasopressin') ||
    hay.includes('rocuronium') ||
    hay.includes('atracurium')
  ) {
    return 'refrigerator';
  }
  if (
    hay.includes('saline') ||
    hay.includes('sodium chloride') ||
    hay.includes('ringer') ||
    hay.includes('lactate') ||
    hay.includes('dextrose') ||
    hay.includes('mannitol') ||
    hay.includes('iv bag') ||
    hay.includes('iv fluid') ||
    hay.includes('water for injection') ||
    hay.includes('perfalgan')
  ) {
    return 'iv-fluids';
  }
  return 'high-alert';
}
