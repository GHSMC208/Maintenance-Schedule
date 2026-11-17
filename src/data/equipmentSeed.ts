import type { EquipmentMaintenanceLogEntry, InventoryItem } from '../types/ward';
import { addDaysIso } from '../utils/dateUtils';

export const EQUIPMENT_TABLES = [
  'Table 1 – Patient Beds',
  'Table 2 – CCU Cardiac Monitors and Accessories',
  'Table 3 – CCU Central',
  'Table 4 – Crash Cart Trolleys',
  'Table 5 – Suction and Oxygenation Items',
  'Table 6 – ECG Machines',
  'Table 7- Telemetry System',
  'Table 8 - Alaris GP IV Infusion Pumps',
  'Table 9 - Alaris Syringe IV Infusion Pumps',
  'Table 9 - Others',
] as const;

export type EquipmentTableName = (typeof EQUIPMENT_TABLES)[number];

export interface EquipmentExtraColumnDef {
  key: string;
  label: string;
  shortLabel: string;
}

export const TABLE2_ACCESSORY_COLS: EquipmentExtraColumnDef[] = [
  { key: 'ecgCable', label: 'ECG Cable', shortLabel: 'ECG Cable' },
  { key: 'bpCuff', label: 'BP Cable+ Cuff', shortLabel: 'BP Cable+ Cuff' },
  { key: 'spo2Cable', label: 'SPO2 Cable', shortLabel: 'SPO2 Cable' },
  { key: 'tempProbe', label: 'Temp Probe', shortLabel: 'Temp Probe' },
  { key: 'cvpCable', label: 'CVP Cable', shortLabel: 'CVP Cable' },
  { key: 'nebulizerAdapter', label: 'Nebulizer Adapter', shortLabel: 'Nebulizer Adapter' },
];

export const TABLE4_ACCESSORY_COLS: EquipmentExtraColumnDef[] = [
  { key: 'o2Cylinder', label: 'O2 Cylinder', shortLabel: 'O2 Cylinder' },
  { key: 'o2Flowmeter', label: 'Cylinder O2 Flowmeter', shortLabel: 'O2 Flowmeter' },
  { key: 'o2Regulator', label: 'O2 Regulator', shortLabel: 'O2 Regulator' },
  { key: 'suctionRegulator', label: 'Suction Regulator', shortLabel: 'Suction Reg' },
  { key: 'suctionBottle', label: 'Suction Bottle', shortLabel: 'Suction Bottle' },
];

export const TABLE5_SUCTION_COLS: EquipmentExtraColumnDef[] = [
  { key: 'suctionRegulator', label: 'Suction Regulator', shortLabel: 'Suction Reg' },
  {
    key: 'canisterLiner',
    label: 'Canister for Suction Liner',
    shortLabel: 'Canister Liner',
  },
  { key: 'canisterHanger', label: 'Canister Hanger', shortLabel: 'Canister Hanger' },
  { key: 'o2RegSingle', label: 'O2 Regulator Single', shortLabel: 'O2 Reg Single' },
  { key: 'o2RegDouble', label: 'O2 Regulator Double', shortLabel: 'O2 Reg Double' },
];

export function getEquipmentTableExtraCols(tableName: string): EquipmentExtraColumnDef[] {
  if (tableName === 'Table 2 – CCU Cardiac Monitors and Accessories') {
    return TABLE2_ACCESSORY_COLS;
  }
  if (tableName === 'Table 4 – Crash Cart Trolleys') {
    return TABLE4_ACCESSORY_COLS;
  }
  if (tableName === 'Table 5 – Suction and Oxygenation Items') {
    return TABLE5_SUCTION_COLS;
  }
  return [];
}

export function isEquipmentAccessoryTicked(val?: string): boolean {
  if (!val) return false;
  const normalized = val.trim().toLowerCase();
  return Boolean(
    normalized &&
      normalized !== 'no' &&
      normalized !== 'false' &&
      normalized !== '0' &&
      normalized !== '-' &&
      normalized !== '—'
  );
}

export const isMonitorAccessoryTicked = isEquipmentAccessoryTicked;

export function isTickableEquipmentTable(tableName: string): boolean {
  return (
    tableName === 'Table 2 – CCU Cardiac Monitors and Accessories' ||
    tableName === 'Table 4 – Crash Cart Trolleys' ||
    tableName === 'Table 5 – Suction and Oxygenation Items'
  );
}

export function computeTable5ColumnTotals(
  table5Items: InventoryItem[]
): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const col of TABLE5_SUCTION_COLS) {
    totals[col.key] = 0;
  }
  for (const it of table5Items) {
    const rowCode = (it.otherCode || it.name || '').trim();
    if (rowCode === 'Total') continue;
    const ex = it.extraColumns || {};
    if (rowCode === 'Store') {
      for (const col of TABLE5_SUCTION_COLS) {
        const num = parseInt((ex[col.key] || '').trim(), 10);
        if (!Number.isNaN(num) && num > 0) {
          totals[col.key] += num;
        }
      }
    } else {
      for (const col of TABLE5_SUCTION_COLS) {
        if (isEquipmentAccessoryTicked(ex[col.key])) {
          totals[col.key] += 1;
        }
      }
    }
  }
  return totals;
}

function makeEqItem(
  today: string,
  idx: number,
  table: EquipmentTableName,
  rowCode: string,
  name: string,
  mohNumber: string,
  unit: 'CCU' | 'SD' | 'General Ward' = 'CCU',
  notes = '',
  extraColumns?: Record<string, string>
): InventoryItem {
  return {
    id: `eq-${String(idx).padStart(3, '0')}`,
    categoryId: 'equipment',
    name,
    unit,
    locationDetail: table,
    quantity: 1,
    parLevel: 1,
    unitOfMeasure: 'unit',
    batchOrSerial: mohNumber,
    otherCode: rowCode,
    expiryDate: null,
    equipmentStatus: 'Operational',
    nextPmDate: addDaysIso(today, 90),
    extraColumns,
    lastCheckedDate: today,
    lastCheckedBy: 'RN Sara Al-Mansoor',
    notes,
  };
}

export function createInitialEquipmentItems(today: string): InventoryItem[] {
  const items: InventoryItem[] = [];
  let seq = 1;

  // Table 1 – Patient Beds (18 CCU & SD Electronic Beds + 1 Stretcher Bed)
  const electronicBeds: Array<{ count: string; moh: string; notes?: string }> = [
    {
      count: '1',
      moh: 'NIL',
      notes: 'ID: GH/BM/8836 – SN: GCT2029 – MED: S61515',
    },
    { count: '2', moh: 'NIL', notes: 'ID: GH/BM/6008 SN: 433991' },
    { count: '3', moh: '561487' },
    { count: '4', moh: '009087' },
    { count: '5', moh: '004112' },
    { count: '6', moh: '037141' },
    { count: '7', moh: '058374' },
    { count: '8', moh: '004297' },
    { count: '9', moh: '059843' },
    { count: '10', moh: '004220' },
    { count: '11', moh: '039038' },
    { count: '12', moh: '003515' },
    { count: '13', moh: '004219' },
    { count: '14', moh: '003931' },
    { count: '15', moh: '000669' },
    { count: '16', moh: '002113' },
    { count: '17', moh: '003947' },
    { count: '18', moh: '004295' },
  ];

  for (const bed of electronicBeds) {
    const unit: 'CCU' | 'SD' = Number(bed.count) >= 11 ? 'CCU' : 'SD';
    items.push(
      makeEqItem(
        today,
        seq++,
        'Table 1 – Patient Beds',
        bed.count,
        'CCU and SD Electronic Beds',
        bed.moh,
        unit,
        bed.notes || ''
      )
    );
  }
  items.push(
    makeEqItem(
      today,
      seq++,
      'Table 1 – Patient Beds',
      '1',
      'Stretcher Bed',
      '004082',
      'CCU',
      ''
    )
  );

  // Table 2 – CCU Cardiac Monitors and Accessories (Beds 11-18)
  const ccuMonitors: Array<{ bed: string; moh: string; ecg?: string }> = [
    { bed: '11', moh: '908367', ecg: '✓' },
    { bed: '12', moh: '908364' },
    { bed: '13', moh: '908373' },
    { bed: '14', moh: '908362' },
    { bed: '15', moh: '908363' },
    { bed: '16', moh: '908365' },
    { bed: '17', moh: '908368' },
    { bed: '18', moh: '908366' },
  ];
  for (const mon of ccuMonitors) {
    items.push(
      makeEqItem(
        today,
        seq++,
        'Table 2 – CCU Cardiac Monitors and Accessories',
        mon.bed,
        `Cardiac Monitor Bed ${mon.bed}`,
        mon.moh,
        'CCU',
        '',
        {
          ecgCable: mon.ecg || '',
          bpCuff: '',
          spo2Cable: '',
          tempProbe: '',
          cvpCable: '',
          nebulizerAdapter: '',
        }
      )
    );
  }

  // Table 3 – CCU Central
  const centralRows: Array<{ device: string; moh: string }> = [
    { device: 'CPU Unit', moh: '058372\n908376' },
    { device: 'Strip Recorder', moh: '-' },
    { device: 'Double Screen', moh: '-' },
    { device: 'Printer', moh: '58371' },
  ];
  centralRows.forEach((row, idx) => {
    items.push(
      makeEqItem(
        today,
        seq++,
        'Table 3 – CCU Central',
        String(idx + 1),
        row.device,
        row.moh,
        'CCU',
        ''
      )
    );
  });

  // Table 4 – Crash Cart Trolleys (A, B, C)
  const crashCarts: Array<{ code: string; trolleyMoh: string; defib: string; unit: 'CCU' | 'SD' }> = [
    { code: 'A', trolleyMoh: '021049', defib: 'Life Pak 003978', unit: 'CCU' },
    { code: 'B', trolleyMoh: '013615', defib: 'Philips 003981', unit: 'SD' },
    { code: 'C', trolleyMoh: '021080', defib: 'Philips 37143', unit: 'SD' },
  ];
  for (const cart of crashCarts) {
    items.push(
      makeEqItem(
        today,
        seq++,
        'Table 4 – Crash Cart Trolleys',
        cart.code,
        cart.defib,
        cart.trolleyMoh,
        cart.unit,
        '',
        {
          defibrillator: cart.defib,
          o2Cylinder: '',
          o2Flowmeter: '',
          o2Regulator: '',
          suctionRegulator: '',
          suctionBottle: '',
        }
      )
    );
  }

  // Table 5 – Suction and Oxygenation Items
  const suctionBeds = [
    '1',
    '2-3',
    '4-5',
    '6',
    '7-8',
    '9-10',
    '11',
    '12',
    '13',
    '14',
    '15',
    '16',
    '17',
    '18',
    'Store',
    'Total',
  ];
  for (const bedLabel of suctionBeds) {
    const numPart = parseInt(bedLabel, 10);
    const unit: 'CCU' | 'SD' | 'General Ward' =
      bedLabel === 'Store' || bedLabel === 'Total'
        ? 'General Ward'
        : !Number.isNaN(numPart) && numPart >= 11
          ? 'CCU'
          : 'SD';
    items.push(
      makeEqItem(
        today,
        seq++,
        'Table 5 – Suction and Oxygenation Items',
        bedLabel,
        bedLabel === 'Store' || bedLabel === 'Total' ? bedLabel : `Bed / Cubic ${bedLabel}`,
        '—',
        unit,
        '',
        {
          suctionRegulator: '',
          canisterLiner: '',
          canisterHanger: '',
          o2RegSingle: '',
          o2RegDouble: '',
        }
      )
    );
  }

  // Table 6 – ECG Machines
  const ecgRows: Array<{ no: string; brand: string; moh: string }> = [
    { no: '1', brand: 'Mortara (Model ELI 280)', moh: '75041' },
    { no: '2', brand: 'Mortara (Model ELI 250c)', moh: '73503' },
    { no: '3', brand: 'Mortara (Model ELI 250)', moh: '13286' },
  ];
  for (const ecg of ecgRows) {
    items.push(
      makeEqItem(today, seq++, 'Table 6 – ECG Machines', ecg.no, ecg.brand, ecg.moh, 'CCU', '')
    );
  }

  // Table 7- Telemetry System
  const telemetryRows: Array<{ no: string; device: string; moh: string }> = [
    { no: '1', device: 'Telemetry', moh: 'GH251136' },
    { no: '2', device: 'Telemetry', moh: 'GH251144' },
    { no: '3', device: 'Telemetry', moh: 'GH251140' },
    { no: '4', device: 'Telemetry', moh: 'GH2511113' },
    { no: '5', device: 'Telemetry', moh: 'GH251142' },
    { no: '6', device: 'Telemetry', moh: 'GH251138' },
    { no: '7', device: 'Telemetry', moh: 'GH251141' },
    { no: '8', device: 'Telemetry', moh: 'GH251137' },
    { no: '9', device: 'Telemetry', moh: 'GH251135' },
    { no: '10', device: 'Telemetry', moh: 'GH2M1145' },
    { no: '11', device: 'ECG Strip Recorder', moh: '21083' },
    { no: '12', device: 'Monitor', moh: '10232' },
    { no: '13', device: 'Printer', moh: '' },
  ];
  for (const tel of telemetryRows) {
    items.push(
      makeEqItem(
        today,
        seq++,
        'Table 7- Telemetry System',
        tel.no,
        tel.device,
        tel.moh,
        'SD',
        ''
      )
    );
  }

  // Table 8 - Alaris GP IV Infusion Pumps (1–35)
  const alarisGpMohs = [
    '003939',
    '003940',
    '003941',
    '003992',
    '004119',
    '013968',
    '021506',
    '021508',
    '037156',
    '037157',
    '037158',
    '037159',
    '069111',
    '069122',
    '069123',
    '069143',
    '906405',
    '906408',
    '90641?',
    '906417',
    '906421',
    '909293',
    '905640',
    '905655',
    '905656',
    '905657',
    '908895',
    '908896',
    '908897',
    '908898',
    '908899',
    '908900',
    '908901',
    '908902',
    '914215',
  ];
  alarisGpMohs.forEach((moh, idx) => {
    items.push(
      makeEqItem(
        today,
        seq++,
        'Table 8 - Alaris GP IV Infusion Pumps',
        String(idx + 1),
        'Alaris GP IV Infusion Pump',
        moh,
        idx < 18 ? 'CCU' : 'SD',
        ''
      )
    );
  });

  // Table 9 - Alaris Syringe IV Infusion Pumps (1–35)
  const alarisSyringeMohs = [
    '002558',
    '004030',
    '004551',
    '007642',
    '013280',
    '013599',
    '046995',
    '046998',
    '905670',
    '905671',
    '905672',
    '905673',
    '905674',
    '905675',
    '905676',
    '905677',
    '905678',
    '905679',
    '905680',
    '905681',
    '905682',
    '905683',
    '905684',
    '905685',
    '905686',
    '905687',
    '905688',
    '905689',
    '905690',
    '905691',
    '905706',
    '905707',
    '905708',
    '905709',
    '905710',
  ];
  alarisSyringeMohs.forEach((moh, idx) => {
    items.push(
      makeEqItem(
        today,
        seq++,
        'Table 9 - Alaris Syringe IV Infusion Pumps',
        String(idx + 1),
        'Alaris Syringe IV Infusion Pump',
        moh,
        idx < 18 ? 'CCU' : 'SD',
        ''
      )
    );
  });

  // Table 9 - Others (1–21)
  const otherDevices: Array<{ no: string; device: string; moh: string }> = [
    { no: '1', device: 'Alaris Charging Station', moh: '037154' },
    { no: '2', device: 'Portable Cardiac Monitor (PRO 1000)', moh: '004224' },
    { no: '3', device: 'Electronic BP Apparatus (Mediana)', moh: '003971' },
    {
      no: '4',
      device: 'Electronic BP Apparatus (Philips Intellivue MP20)',
      moh: '010209',
    },
    { no: '5', device: 'Portable BP Apparatus', moh: '037131' },
    { no: '6', device: 'Portable BP Apparatus', moh: '021989' },
    { no: '7', device: 'Pulse Oxymeter (Masimo)', moh: '066465' },
    { no: '8', device: 'Pulse Oxymeter (OXYPALM)', moh: '004103' },
    { no: '9', device: 'Pulse Oxymeter', moh: '-' },
    { no: '10', device: 'Portable ElecThermometer (Alaris)', moh: '014820' },
    { no: '11', device: 'Portable ElecThermometer (Welch Allyn)', moh: '9804??' },
    { no: '12', device: 'Weighing Scale', moh: '013283' },
    { no: '13', device: 'Ophthalmoscope', moh: '-' },
    { no: '14', device: 'Ophthalmoscope', moh: '-' },
    { no: '15', device: 'Ripple Mattress with Motor', moh: '004083' },
    { no: '16', device: 'Ripple Mattress with Motor', moh: '004250' },
    { no: '17', device: 'Ripple Mattress with Motor', moh: '039037' },
    { no: '18', device: 'Ripple Mattress with Motor', moh: '058364' },
    { no: '19', device: 'Ripple Mattress with Motor', moh: '-' },
    { no: '20', device: 'Ripple Mattress with Motor', moh: '-' },
    { no: '21', device: 'Ripple Mattress with Motor', moh: '-' },
  ];
  for (const oth of otherDevices) {
    items.push(
      makeEqItem(today, seq++, 'Table 9 - Others', oth.no, oth.device, oth.moh, 'CCU', '')
    );
  }

  return items;
}

export function createInitialEquipmentMaintenanceLogs(
  today: string
): EquipmentMaintenanceLogEntry[] {
  return [
    {
      id: 'eqm-01',
      equipmentName: 'CCU and SD Electronic Bed (#1)',
      tableName: 'Table 1 – Patient Beds',
      mohNumber: 'GH/BM/8836',
      unit: 'SD',
      issueDescription: 'Foot-end height actuator intermittently sluggish; biomedical check requested',
      reportedDate: addDaysIso(today, -3),
      reportedBy: 'RN Nadia Omar',
      workOrderNo: 'BM-208-041',
      serviceDepartment: 'Biomedical Engineering',
      actionTaken: 'Work order submitted; bed flagged for Biomed technician inspection on unit',
      status: 'Reported to Biomed',
      resolvedDate: null,
      verifiedBy: '',
    },
    {
      id: 'eqm-02',
      equipmentName: 'Alaris GP IV Infusion Pump (#04)',
      tableName: 'Table 8 - Alaris GP IV Infusion Pumps',
      mohNumber: '74921',
      unit: 'CCU',
      issueDescription: 'Door latch sensor alarm & annual PPM calibration sticker renewal',
      reportedDate: addDaysIso(today, -11),
      reportedBy: 'RN Sara Al-Mansoor',
      workOrderNo: 'BM-208-036',
      serviceDepartment: 'Biomedical Engineering',
      actionTaken: 'Door latch assembly replaced and flow-rate calibrated in Biomed workshop; PPM sticker renewed',
      status: 'Repaired / Returned',
      resolvedDate: addDaysIso(today, -4),
      verifiedBy: 'RN Sara Al-Mansoor',
    },
  ];
}
