import type { InventoryItem } from '../types/ward';
import { getEarliestIsoFromExpiryText } from './prepRoomSeed';

export const BLOOD_TROLLEY_DRAWERS = [
  '1st Drawer',
  '2nd Drawer',
  '3rd Drawer',
  '4th Drawer',
] as const;

export type BloodTrolleyDrawer = (typeof BLOOD_TROLLEY_DRAWERS)[number];

interface BloodTrolleySeedTuple {
  id: string;
  drawer: BloodTrolleyDrawer;
  name: string;
  expiryText: string;
}

// Official WARD 208 CCU BLOOD COLLECTION TROLLEY EXPIRY CHECKLIST (54 Items across 4 Drawers)
const RAW_BLOOD_TROLLEY_ITEMS: BloodTrolleySeedTuple[] = [
  // 1st Drawer (14 items)
  { id: 'bt-d1-01', drawer: '1st Drawer', name: 'Syringe 1cc', expiryText: '6/2028' },
  { id: 'bt-d1-02', drawer: '1st Drawer', name: 'Syringe 5cc', expiryText: '1/05/2030' },
  { id: 'bt-d1-03', drawer: '1st Drawer', name: 'Syringe 10cc', expiryText: '4/06/2030' },
  { id: 'bt-d1-04', drawer: '1st Drawer', name: 'Syringe 2cc', expiryText: '4/2030' },
  { id: 'bt-d1-05', drawer: '1st Drawer', name: 'Syringe 20cc', expiryText: '16/8/2030' },
  { id: 'bt-d1-06', drawer: '1st Drawer', name: 'Needle NO19 (yellow)', expiryText: '1/2030' },
  { id: 'bt-d1-07', drawer: '1st Drawer', name: 'Needle NO20 (yellow)', expiryText: '1/2030' },
  { id: 'bt-d1-08', drawer: '1st Drawer', name: 'Needle NO21 (green)', expiryText: '5/2030' },
  { id: 'bt-d1-09', drawer: '1st Drawer', name: 'Needle NO22 (Black)', expiryText: 'NIL' },
  { id: 'bt-d1-10', drawer: '1st Drawer', name: 'Needle NO23 (blue)', expiryText: '9/2030, 10/29' },
  { id: 'bt-d1-11', drawer: '1st Drawer', name: 'Needle NO25 (Orange)', expiryText: '01/2027' },
  { id: 'bt-d1-12', drawer: '1st Drawer', name: 'Needle NO26 (Brown)', expiryText: '19/10/2028' },
  { id: 'bt-d1-13', drawer: '1st Drawer', name: 'Scalp Vein NO23(Blue)', expiryText: '28/3/2030' },
  { id: 'bt-d1-14', drawer: '1st Drawer', name: 'Alcohol swab', expiryText: '1/2030' },

  // 2nd Drawer (14 items)
  { id: 'bt-d2-01', drawer: '2nd Drawer', name: 'Pink cannula', expiryText: '9/2029,04/2030' },
  { id: 'bt-d2-02', drawer: '2nd Drawer', name: 'Blue cannula', expiryText: '07/2028, 11/29' },
  { id: 'bt-d2-03', drawer: '2nd Drawer', name: 'Green cannula', expiryText: '03/2030' },
  { id: 'bt-d2-04', drawer: '2nd Drawer', name: 'Yellow cannula', expiryText: '12/29, 3/30' },
  { id: 'bt-d2-05', drawer: '2nd Drawer', name: 'PTT Bottle', expiryText: '1/11/27' },
  { id: 'bt-d2-06', drawer: '2nd Drawer', name: 'ESR bottle', expiryText: '15/1/2027' },
  { id: 'bt-d2-07', drawer: '2nd Drawer', name: 'Sugar bottle', expiryText: '31/08/2026, 28/2/27' },
  { id: 'bt-d2-08', drawer: '2nd Drawer', name: 'Serum bottle', expiryText: '17/9/2027' },
  { id: 'bt-d2-09', drawer: '2nd Drawer', name: 'Cross matching bottle', expiryText: '9/2026' },
  { id: 'bt-d2-10', drawer: '2nd Drawer', name: 'CBC Bottle', expiryText: '28/2/2027' },
  { id: 'bt-d2-11', drawer: '2nd Drawer', name: 'Blue BD Vacutainer', expiryText: '31/08/2028' },
  { id: 'bt-d2-12', drawer: '2nd Drawer', name: 'Black BD Vacutainer', expiryText: '27/11/2029' },
  { id: 'bt-d2-13', drawer: '2nd Drawer', name: 'Green BD Vacutainer', expiryText: 'NIL' },
  { id: 'bt-d2-14', drawer: '2nd Drawer', name: 'Distilled water 5ml / 10ml', expiryText: '12/2027, 5/28' },

  // 3rd Drawer (13 items)
  { id: 'bt-d3-01', drawer: '3rd Drawer', name: 'Culture Swabs', expiryText: '19/3/2027' },
  { id: 'bt-d3-02', drawer: '3rd Drawer', name: 'Cotton balls', expiryText: 'NIL' },
  { id: 'bt-d3-03', drawer: '3rd Drawer', name: 'Blood Culture bottle', expiryText: '4/8/2026,10/8/2026' },
  { id: 'bt-d3-04', drawer: '3rd Drawer', name: 'IV Extension', expiryText: '3/2030' },
  { id: 'bt-d3-05', drawer: '3rd Drawer', name: 'IV Cannula dressing', expiryText: '9/2029,01/04/2027' },
  { id: 'bt-d3-06', drawer: '3rd Drawer', name: 'ABG syringe', expiryText: '19/09/2027' },
  { id: 'bt-d3-07', drawer: '3rd Drawer', name: 'Transfix', expiryText: '1/08/2029,9/03/2030' },
  { id: 'bt-d3-08', drawer: '3rd Drawer', name: 'BD Q Syte', expiryText: 'NIL' },
  { id: 'bt-d3-09', drawer: '3rd Drawer', name: 'Sterile gauze', expiryText: '08/2030,9/9/2029' },
  { id: 'bt-d3-10', drawer: '3rd Drawer', name: 'CREP BANDAGE', expiryText: '9/2029' },
  { id: 'bt-d3-11', drawer: '3rd Drawer', name: 'STOO BOTTLE', expiryText: '19/3/2030' },
  { id: 'bt-d3-12', drawer: '3rd Drawer', name: 'TEGADERM', expiryText: '27/11/2026' },
  { id: 'bt-d3-13', drawer: '3rd Drawer', name: '3WAY', expiryText: '7/2029' },

  // 4th Drawer (13 items)
  { id: 'bt-d4-01', drawer: '4th Drawer', name: 'IV connector', expiryText: 'NIL' },
  { id: 'bt-d4-02', drawer: '4th Drawer', name: 'Alaris GP burette set', expiryText: '26/7/2027, 26/8/2027' },
  { id: 'bt-d4-03', drawer: '4th Drawer', name: 'Alaris GP non burette set', expiryText: '11/2026' },
  { id: 'bt-d4-04', drawer: '4th Drawer', name: 'Heparin Set', expiryText: '4/2028, 3/2028, 3/2028' },
  { id: 'bt-d4-05', drawer: '4th Drawer', name: 'IV set (Ordinary)', expiryText: 'NIL' },
  { id: 'bt-d4-06', drawer: '4th Drawer', name: 'Gloves sterile 6.5 ,7.5', expiryText: '12/28,1/2028' },
  { id: 'bt-d4-07', drawer: '4th Drawer', name: '50 ml Syringe', expiryText: '10/2029' },
  { id: 'bt-d4-08', drawer: '4th Drawer', name: 'SoluPrep Large swab stick', expiryText: 'NIL' },
  { id: 'bt-d4-09', drawer: '4th Drawer', name: 'SoluPrep small swab stick', expiryText: '10/2027' },
  { id: 'bt-d4-10', drawer: '4th Drawer', name: 'GAUSE 2X2', expiryText: '9/9/2029' },
  { id: 'bt-d4-11', drawer: '4th Drawer', name: 'GAUZE 10X10', expiryText: '8/2030' },
  { id: 'bt-d4-12', drawer: '4th Drawer', name: 'POSI FLUSH', expiryText: '31/1/2028' },
  { id: 'bt-d4-13', drawer: '4th Drawer', name: 'MEPOR', expiryText: '4/2030' },
];

export function createInitialBloodTrolleyCcuItems(today: string): InventoryItem[] {
  return RAW_BLOOD_TROLLEY_ITEMS.map((entry) => {
    const isNil = entry.expiryText.trim().toUpperCase() === 'NIL';
    return {
      id: entry.id,
      categoryId: 'blood-trolley',
      name: entry.name,
      unit: 'CCU',
      locationDetail: entry.drawer,
      quantity: isNil ? 0 : 1,
      parLevel: isNil ? 0 : 1,
      unitOfMeasure: 'pcs',
      batchOrSerial: '—',
      expiryDate: getEarliestIsoFromExpiryText(entry.expiryText),
      expiryDisplay: entry.expiryText,
      lastCheckedDate: today,
      lastCheckedBy: 'RN Sara Al-Mansoor',
      notes: '',
    };
  });
}

export function createInitialBloodTrolleySdItems(today: string): InventoryItem[] {
  return RAW_BLOOD_TROLLEY_ITEMS.map((entry) => ({
    id: entry.id.replace('bt-', 'bt-sd-'),
    categoryId: 'blood-trolley',
    name: entry.name,
    unit: 'SD',
    locationDetail: entry.drawer,
    quantity: 1,
    parLevel: 1,
    unitOfMeasure: 'pcs',
    batchOrSerial: '—',
    expiryDate: null,
    expiryDisplay: '',
    lastCheckedDate: today,
    lastCheckedBy: 'RN Nadia Omar',
    notes: '',
  }));
}

export function createInitialBloodTrolleyItems(today: string): InventoryItem[] {
  return [
    ...createInitialBloodTrolleyCcuItems(today),
    ...createInitialBloodTrolleySdItems(today),
  ];
}
