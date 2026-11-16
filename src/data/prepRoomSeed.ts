import type { InventoryItem } from '../types/ward';
import { extractIsoDatesFromSlot } from '../utils/dateUtils';

interface PrepRoomSeedTuple {
  id: string;
  unit: 'CCU' | 'SD';
  no: number;
  name: string;
  expiryText: string;
}

export function getEarliestIsoFromExpiryText(expiryText: string): string | null {
  const dates = extractIsoDatesFromSlot(expiryText);
  if (dates.length === 0) return null;
  return [...dates].sort()[0];
}

// Official CCU PREPARATION ROOM EXPIRY CHECKLIST (38 CSSD Items)
const RAW_CCU_PREP_ROOM_ITEMS: PrepRoomSeedTuple[] = [
  { id: 'pr-ccu-01', unit: 'CCU', no: 1, name: 'Gallipots Small', expiryText: '' },
  { id: 'pr-ccu-02', unit: 'CCU', no: 2, name: 'Gallipots Big', expiryText: '' },
  { id: 'pr-ccu-03', unit: 'CCU', no: 3, name: 'Kidney Dish Small', expiryText: '' },
  { id: 'pr-ccu-04', unit: 'CCU', no: 4, name: 'Artery Forceps (curved)', expiryText: '' },
  { id: 'pr-ccu-05', unit: 'CCU', no: 5, name: 'IV Cut down Set', expiryText: '' },
  { id: 'pr-ccu-06', unit: 'CCU', no: 6, name: 'Tracheal Dilator', expiryText: '' },
  { id: 'pr-ccu-07', unit: 'CCU', no: 7, name: 'Sterile Scissors', expiryText: '21/11/2026, 18/11/2026' },
  { id: 'pr-ccu-08', unit: 'CCU', no: 8, name: 'Tracheostomy Tube', expiryText: 'NIL' },
  { id: 'pr-ccu-09', unit: 'CCU', no: 9, name: 'BP Handle', expiryText: 'CSSD' },
  { id: 'pr-ccu-10', unit: 'CCU', no: 10, name: 'Artery Forceps (straight)', expiryText: '6/11/26, 26/11/26, 8/11/26, 28/11/26' },
  { id: 'pr-ccu-11', unit: 'CCU', no: 11, name: 'Magill’s Forceps', expiryText: '' },
  { id: 'pr-ccu-12', unit: 'CCU', no: 12, name: 'Needle Holder', expiryText: '10/11/2026, 21/11/2026' },
  { id: 'pr-ccu-13', unit: 'CCU', no: 13, name: 'Dissection forceps', expiryText: '22/9/2026' },
  { id: 'pr-ccu-14', unit: 'CCU', no: 14, name: 'Laryngoscope & Blade', expiryText: '21/12/2026' },
  { id: 'pr-ccu-15', unit: 'CCU', no: 15, name: 'Measuring Cup 500 &1000ml', expiryText: '' },
  { id: 'pr-ccu-16', unit: 'CCU', no: 16, name: 'Kidney Dish 300ml', expiryText: '6/11/2026' },
  { id: 'pr-ccu-17', unit: 'CCU', no: 17, name: 'Kidney Dish 600ml', expiryText: '' },
  { id: 'pr-ccu-18', unit: 'CCU', no: 18, name: 'Alcohol swab', expiryText: '03/2030' },
  { id: 'pr-ccu-19', unit: 'CCU', no: 19, name: 'Lancet', expiryText: '30/1/2031' },
  { id: 'pr-ccu-20', unit: 'CCU', no: 20, name: 'Blood glucose test strips', expiryText: '30/11/2026' },
  { id: 'pr-ccu-21', unit: 'CCU', no: 21, name: 'Syringe 1cc', expiryText: '10/2029' },
  { id: 'pr-ccu-22', unit: 'CCU', no: 22, name: 'Syringe 50cc', expiryText: '3/2029' },
  { id: 'pr-ccu-23', unit: 'CCU', no: 23, name: 'Syringe 20cc', expiryText: '16/8/2030' },
  { id: 'pr-ccu-24', unit: 'CCU', no: 24, name: 'Syringe 10cc', expiryText: '4/6/2030, 14/5/2030' },
  { id: 'pr-ccu-25', unit: 'CCU', no: 25, name: 'Syringe 5cc', expiryText: '1/5/2030' },
  { id: 'pr-ccu-26', unit: 'CCU', no: 26, name: 'Syringe 2cc', expiryText: '1/5/2030, 30/4/2030' },
  { id: 'pr-ccu-27', unit: 'CCU', no: 27, name: 'Needle NO.19', expiryText: '01/2030' },
  { id: 'pr-ccu-28', unit: 'CCU', no: 28, name: 'Needle NO.20', expiryText: '01/2030' },
  { id: 'pr-ccu-29', unit: 'CCU', no: 29, name: 'Needle NO.21', expiryText: '5/2030' },
  { id: 'pr-ccu-30', unit: 'CCU', no: 30, name: 'Needle NO.22', expiryText: 'NIL' },
  { id: 'pr-ccu-31', unit: 'CCU', no: 31, name: 'Needle NO.23', expiryText: '9/2030' },
  { id: 'pr-ccu-32', unit: 'CCU', no: 32, name: 'Needle NO.25', expiryText: '01/2027' },
  { id: 'pr-ccu-33', unit: 'CCU', no: 33, name: 'Needle NO.26', expiryText: '24/8/2027' },
  { id: 'pr-ccu-34', unit: 'CCU', no: 34, name: 'IV Closure Q Site', expiryText: 'NIL' },
  { id: 'pr-ccu-35', unit: 'CCU', no: 35, name: 'Blue Tray Small', expiryText: '18/11/2026, 10/11/2026' },
  { id: 'pr-ccu-36', unit: 'CCU', no: 36, name: 'Blue Tray Big', expiryText: '' },
  { id: 'pr-ccu-37', unit: 'CCU', no: 37, name: 'Bandage scissor', expiryText: '' },
  { id: 'pr-ccu-38', unit: 'CCU', no: 38, name: 'Protoscope', expiryText: '' },
];

// Official SD PREPARATION ROOM EXPIRY CHECKLIST (32 Items)
const RAW_SD_PREP_ROOM_ITEMS: PrepRoomSeedTuple[] = [
  { id: 'pr-sd-01', unit: 'SD', no: 1, name: 'ECG Electrodes', expiryText: '3/2028' },
  { id: 'pr-sd-02', unit: 'SD', no: 2, name: 'Monitor electrodes', expiryText: '3/2028' },
  { id: 'pr-sd-03', unit: 'SD', no: 3, name: 'Chlorhexidine mouth wash', expiryText: '5/2027' },
  { id: 'pr-sd-04', unit: 'SD', no: 4, name: 'Lancet', expiryText: '30/2/2028' },
  { id: 'pr-sd-05', unit: 'SD', no: 5, name: 'Unsterile gloves', expiryText: '4/23' },
  { id: 'pr-sd-06', unit: 'SD', no: 6, name: 'Betadine solution 10%', expiryText: '7/30' },
  { id: 'pr-sd-07', unit: 'SD', no: 7, name: 'Alcohol swabs', expiryText: '3/2030' },
  { id: 'pr-sd-08', unit: 'SD', no: 8, name: 'Surgical mask', expiryText: '5/2030' },
  { id: 'pr-sd-09', unit: 'SD', no: 9, name: '5% Dextrose 500 ML', expiryText: '3/30' },
  { id: 'pr-sd-10', unit: 'SD', no: 10, name: 'Normal Saline 100 ml', expiryText: '2/29' },
  { id: 'pr-sd-11', unit: 'SD', no: 11, name: 'Normal Saline250ml', expiryText: '3/28' },
  { id: 'pr-sd-12', unit: 'SD', no: 12, name: 'Normal Saline 500 ml', expiryText: '8/30' },
  { id: 'pr-sd-13', unit: 'SD', no: 13, name: 'Normal Saline 0.45%', expiryText: '4/30' },
  { id: 'pr-sd-14', unit: 'SD', no: 14, name: 'Elastoplast', expiryText: '7/2027' },
  { id: 'pr-sd-15', unit: 'SD', no: 15, name: 'Freestyle HGT Strip', expiryText: '10/2026' },
  { id: 'pr-sd-16', unit: 'SD', no: 16, name: 'O2 Humidifier disposable', expiryText: 'ONCE USED' },
  { id: 'pr-sd-17', unit: 'SD', no: 17, name: 'Vomiting bag', expiryText: '12/30' },
  { id: 'pr-sd-18', unit: 'SD', no: 18, name: 'Adult diaper', expiryText: '8/2/2030' },
  { id: 'pr-sd-19', unit: 'SD', no: 19, name: 'Baby oil', expiryText: '1/2029' },
  { id: 'pr-sd-20', unit: 'SD', no: 20, name: 'Welch Allyn thermometer probe', expiryText: 'NO EXPIRY' },
  { id: 'pr-sd-21', unit: 'SD', no: 21, name: 'Clinical Sheet', expiryText: '4/27' },
  { id: 'pr-sd-22', unit: 'SD', no: 22, name: 'Gloves sterile 7.5, 8 inch', expiryText: '12/28' },
  { id: 'pr-sd-23', unit: 'SD', no: 23, name: 'DISPOSABLE URINAL', expiryText: '5/33' },
  { id: 'pr-sd-24', unit: 'SD', no: 24, name: 'Atrovent Neb', expiryText: '3/2027' },
  { id: 'pr-sd-25', unit: 'SD', no: 25, name: 'Syp. Lactalose', expiryText: '4/2027' },
  { id: 'pr-sd-26', unit: 'SD', no: 26, name: 'Syp. Moxal', expiryText: '4/2028' },
  { id: 'pr-sd-27', unit: 'SD', no: 27, name: 'Inj. Lasix 20mg', expiryText: '2/2027' },
  { id: 'pr-sd-28', unit: 'SD', no: 28, name: 'Inj Lasix 250 mg', expiryText: 'nil' },
  { id: 'pr-sd-29', unit: 'SD', no: 29, name: 'Inj Hydrocortisole', expiryText: '3/2030' },
  { id: 'pr-sd-30', unit: 'SD', no: 30, name: 'Vantolin Neb.', expiryText: '9/2026' },
  { id: 'pr-sd-31', unit: 'SD', no: 31, name: 'Inj Paracetamole', expiryText: '8/2028' },
  { id: 'pr-sd-32', unit: 'SD', no: 32, name: 'Inj. Flagyl', expiryText: '7/2027' },
];

export const DEFAULT_PREP_ROOM_CCU_COMMENTS = 'Expired items were sent to CSSD Department.';

export function createInitialPrepRoomItems(today: string): InventoryItem[] {
  return [...RAW_CCU_PREP_ROOM_ITEMS, ...RAW_SD_PREP_ROOM_ITEMS].map((entry) => {
    const isNil = entry.expiryText.trim().toLowerCase() === 'nil';
    return {
      id: entry.id,
      categoryId: 'prep-room',
      name: entry.name,
      unit: entry.unit,
      locationDetail: `${entry.unit} Prep Room #${String(entry.no).padStart(2, '0')}`,
      quantity: isNil ? 0 : 1,
      parLevel: isNil ? 0 : 1,
      unitOfMeasure: 'pcs',
      batchOrSerial: entry.unit === 'CCU' ? 'CSSD' : '—',
      expiryDate: getEarliestIsoFromExpiryText(entry.expiryText),
      expiryDisplay: entry.expiryText,
      lastCheckedDate: today,
      lastCheckedBy: entry.unit === 'CCU' ? 'RN Sara Al-Mansoor' : 'RN Nadia Omar',
      notes: '',
    };
  });
}
