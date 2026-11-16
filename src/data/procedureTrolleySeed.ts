import type { InventoryItem } from '../types/ward';

interface ProcedureTrolleySeedTuple {
  id: string;
  no: number;
  name: string;
  quantity: number;
  unitOfMeasure: string;
}

const RAW_PROCEDURE_TROLLEY_ITEMS: ProcedureTrolleySeedTuple[] = [
  { id: 'pt-cat-01', no: 1, name: 'Central Line Catheter (Single Lumin)', quantity: 5, unitOfMeasure: 'pcs' },
  { id: 'pt-cat-02', no: 2, name: 'Central Line Catheter (Double Lumin)', quantity: 3, unitOfMeasure: 'pcs' },
  { id: 'pt-cat-03', no: 3, name: 'Central Line Catheter (Triple Lumin)', quantity: 0, unitOfMeasure: 'Nil' },
  { id: 'pt-cat-04', no: 4, name: 'Dialysis catheter kit (11.5Fr-20 cm)', quantity: 1, unitOfMeasure: 'pcs' },
  { id: 'pt-cat-05', no: 5, name: 'Dialysis catheter kit (11.5 Fr-15 cm)', quantity: 4, unitOfMeasure: 'pcs' },
  { id: 'pt-cat-06', no: 6, name: 'Sterile Clinical Sheets', quantity: 34, unitOfMeasure: 'pcs' },
  { id: 'pt-cat-07', no: 7, name: 'Long Sterile Drape', quantity: 0, unitOfMeasure: 'Nil' },
  { id: 'pt-cat-08', no: 8, name: 'Sterile Surgical Gown', quantity: 4, unitOfMeasure: 'pcs' },
  { id: 'pt-cat-09', no: 9, name: 'Unsterile Gloves', quantity: 1, unitOfMeasure: 'pcs' },
  { id: 'pt-cat-10', no: 10, name: '2% Chlorhexidine', quantity: 6, unitOfMeasure: 'pcs' },
  { id: 'pt-cat-11', no: 11, name: 'Spirit Swab Stick', quantity: 0, unitOfMeasure: 'Nil' },
  { id: 'pt-cat-12', no: 12, name: '70% Alcohol PAD', quantity: 1, unitOfMeasure: 'box' },
  { id: 'pt-cat-13', no: 13, name: 'Needle Holder', quantity: 1, unitOfMeasure: 'pcs' },
  { id: 'pt-cat-14', no: 14, name: 'Sterile Scissor', quantity: 3, unitOfMeasure: 'pcs' },
  { id: 'pt-cat-15', no: 15, name: 'Artery Forceps', quantity: 1, unitOfMeasure: 'pcs' },
  { id: 'pt-cat-16', no: 16, name: 'Sterile Gloves 7.5', quantity: 6, unitOfMeasure: 'pcs' },

  // #17 Grouped Syringes
  { id: 'pt-cat-17a', no: 17, name: 'Syringes 20cc', quantity: 5, unitOfMeasure: 'pcs' },
  { id: 'pt-cat-17b', no: 17, name: 'Syringes 10cc', quantity: 5, unitOfMeasure: 'pcs' },
  { id: 'pt-cat-17c', no: 17, name: 'Syringes 5cc', quantity: 5, unitOfMeasure: 'pcs' },
  { id: 'pt-cat-17d', no: 17, name: 'Syringes 2cc', quantity: 5, unitOfMeasure: 'pcs' },

  // #18 Grouped Needles
  { id: 'pt-cat-18a', no: 18, name: 'Needles 19G', quantity: 3, unitOfMeasure: 'pcs' },
  { id: 'pt-cat-18b', no: 18, name: 'Needles 21G', quantity: 3, unitOfMeasure: 'pcs' },
  { id: 'pt-cat-18c', no: 18, name: 'Needles 23G', quantity: 7, unitOfMeasure: 'pcs' },

  // #19 Grouped Transfer / Filters / Stopcock
  { id: 'pt-cat-19a', no: 19, name: 'Transfer Needles (Transfix)', quantity: 3, unitOfMeasure: 'pcs' },
  { id: 'pt-cat-19b', no: 19, name: 'Mini Spike Filter', quantity: 2, unitOfMeasure: 'pcs' },
  { id: 'pt-cat-19c', no: 19, name: 'Stopcock Three Way with extension', quantity: 6, unitOfMeasure: 'pcs' },

  // #20 Grouped Mersilk
  { id: 'pt-cat-20a', no: 20, name: 'Mersilk 0/0', quantity: 3, unitOfMeasure: 'pcs' },
  { id: 'pt-cat-20b', no: 20, name: 'Mersilk 2/0', quantity: 3, unitOfMeasure: 'pcs' },
  { id: 'pt-cat-20c', no: 20, name: 'Mersilk 3/0', quantity: 3, unitOfMeasure: 'pcs' },
  { id: 'pt-cat-20d', no: 20, name: 'Mersilk 4/0', quantity: 3, unitOfMeasure: 'pcs' },

  { id: 'pt-cat-21', no: 21, name: 'Sterile Water', quantity: 8, unitOfMeasure: 'pcs' },
  { id: 'pt-cat-22', no: 22, name: 'Blade straight', quantity: 8, unitOfMeasure: 'pcs' },
  { id: 'pt-cat-23', no: 23, name: 'Sterile Gauze (20 packets each box)', quantity: 2, unitOfMeasure: 'boxes' },
  { id: 'pt-cat-24', no: 24, name: 'Sterile Cotton Balls', quantity: 3, unitOfMeasure: 'pcs' },
  { id: 'pt-cat-25', no: 25, name: 'Sterile Gallipot', quantity: 4, unitOfMeasure: 'pcs' },
  { id: 'pt-cat-26', no: 26, name: 'Sterile Kidney Dish', quantity: 3, unitOfMeasure: 'pcs' },
  { id: 'pt-cat-27', no: 27, name: 'Shaving Razor', quantity: 5, unitOfMeasure: 'pcs' },
  { id: 'pt-cat-28', no: 28, name: 'Central Line Dressing (Tegaderm)', quantity: 1, unitOfMeasure: 'pcs' },
  { id: 'pt-cat-29', no: 29, name: 'Dressing Towel', quantity: 1, unitOfMeasure: 'pcs' },
  { id: 'pt-cat-30', no: 30, name: 'Mepore Dressing', quantity: 0, unitOfMeasure: 'pcs' },
  { id: 'pt-cat-31', no: 31, name: 'Elastic Adhesive Bandage / Clear tape', quantity: 1, unitOfMeasure: 'pcs' },
  { id: 'pt-cat-32', no: 32, name: 'Dressing Set', quantity: 1, unitOfMeasure: 'pcs' },
  { id: 'pt-cat-33', no: 33, name: 'IVF NS Saline 500ml', quantity: 2, unitOfMeasure: 'pcs' },
  { id: 'pt-cat-34', no: 34, name: 'IV Closer Q-syte', quantity: 5, unitOfMeasure: 'pcs' },
  { id: 'pt-cat-35', no: 35, name: 'Posiflush (IV Flush)', quantity: 5, unitOfMeasure: 'pcs' },
  { id: 'pt-cat-36', no: 36, name: 'IV Cannula 14G', quantity: 17, unitOfMeasure: 'pcs' },
  { id: 'pt-cat-37', no: 37, name: 'IV Cannula 20G', quantity: 1, unitOfMeasure: 'pcs' },
  { id: 'pt-cat-38', no: 38, name: 'Transfer Needle', quantity: 5, unitOfMeasure: 'pcs' },
  { id: 'pt-cat-39', no: 39, name: 'Suture removal kit', quantity: 2, unitOfMeasure: 'pcs' },
  { id: 'pt-cat-40', no: 40, name: 'Thoracic catheter', quantity: 3, unitOfMeasure: 'pcs' },
  { id: 'pt-cat-41', no: 41, name: 'Drape Incise adhesive film', quantity: 5, unitOfMeasure: 'pcs' },
  { id: 'pt-cat-42', no: 42, name: 'Lidocaine gel', quantity: 1, unitOfMeasure: 'pcs' },
];

export function createInitialProcedureTrolleyItems(today: string): InventoryItem[] {
  return RAW_PROCEDURE_TROLLEY_ITEMS.map((entry) => ({
    id: entry.id,
    categoryId: 'procedure-trolley',
    name: entry.name,
    unit: 'General Ward',
    locationDetail: `No. ${String(entry.no).padStart(2, '0')}`,
    quantity: entry.quantity,
    parLevel: entry.quantity,
    unitOfMeasure: entry.unitOfMeasure,
    batchOrSerial: '—',
    expiryDate: null,
    secondExpiryDate: null,
    lastCheckedDate: today,
    lastCheckedBy: 'Trolley Audit',
    notes: entry.unitOfMeasure === 'Nil' ? 'Nil stock baseline' : '',
  }));
}
