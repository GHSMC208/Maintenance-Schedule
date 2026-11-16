import type {
  MonthlyStoreChecklistForm,
  PharmacyFormsState,
  WeeklyStockChecklistForm,
  WeeklyStockFormId,
} from '../types/ward';

const CAD_DRUG_NAMES = [
  'Inj. Fentanyl 0.05mg',
  'Inj. Fentanyl 0.01mg',
  'Inj. Morphine 10mg',
  'Inj. Remifentanyl 5mg',
  'Inj. Dormicum 15 mg',
  'Inj. Ephedrine10mg',
  'Inj. Tramadol 100mg',
  'Inj. Ketamine 500mg',
  'Inj. Oxycodone 10mg',
  'Inj. Propofol 200mg',
  'Inj. Valium 10mg',
  'Inj. Precedex 200mcq',
  'Tab lorazepam 2 mg',
  'Tab Tramadol 50 mg',
  'Tab Oxycodone 20mg',
  'Tab Oxycodone 5mg',
  'Tab amitriptyline 10 mg',
  'Tab Pregabalin 75 mg',
  'Tab Diazepam 5mg',
  '',
  '',
];

function createWeeklyStockForm(
  id: WeeklyStockFormId,
  title: string,
  formCode: string
): WeeklyStockChecklistForm {
  return {
    id,
    title,
    formCode,
    location: '',
    month: '',
    weekDates: Array.from({ length: 5 }, () => ''),
    rows: Array.from({ length: 12 }, (_, idx) => ({
      id: `${id}-r-${idx + 1}`,
      slNo: '',
      medicationName: '',
      wardQuantity: '',
      checks: Array.from({ length: 5 }, () => ({ qty: '', expDate: '' })),
    })),
    staffSignatures: Array.from({ length: 5 }, () => ''),
  };
}

export function createInitialMonthlyStoreForm(): MonthlyStoreChecklistForm {
  return {
    formCode: 'GH/NUR/2025-19',
    ward: '',
    monthYear: '',
    rows: Array.from({ length: 17 }, (_, idx) => ({
      id: `ms-r-${idx + 1}`,
      stockNo: '',
      description: '',
      qtyAvailable: '',
      expiryDate1: '',
      expiryDate2: '',
    })),
    staffName: '',
    signature: '',
    date: '',
  };
}

export function createInitialPharmacyForms(): PharmacyFormsState {
  return {
    cad: {
      unit: '',
      month: '',
      dayDates: Array.from({ length: 7 }, () => ''),
      rows: CAD_DRUG_NAMES.map((drugName, idx) => ({
        id: `cad-r-${idx + 1}`,
        drugName,
        expiryDate: '',
        shifts: Array.from({ length: 21 }, () => ''),
      })),
      currentShiftTl: Array.from({ length: 21 }, () => ''),
      previousShiftTl: Array.from({ length: 21 }, () => ''),
    },
    weeklyForms: {
      'high-alert': createWeeklyStockForm(
        'high-alert',
        'High-Alert Medication Checklist',
        'GH/NUR/2025-16'
      ),
      'near-expiry': createWeeklyStockForm(
        'near-expiry',
        'Near Expiry Checklist',
        'GH/NUR/2025-18'
      ),
      refrigerator: createWeeklyStockForm(
        'refrigerator',
        'Medication Refrigerator Stock Checklist',
        'GH/NUR/2025-17'
      ),
      'stock-meds': createWeeklyStockForm(
        'stock-meds',
        'Medication Stock Checklist',
        'GH/NUR/2025-18'
      ),
    },
    monthlyStore: createInitialMonthlyStoreForm(),
  };
}
