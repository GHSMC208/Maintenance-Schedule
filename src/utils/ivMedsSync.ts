import { inferIvMedsGroup } from '../data/ivMedsSeed';
import type { InventoryItem, IvMedsGroupId, PharmacyFormsState } from '../types/ward';
import { extractIsoDatesFromSlot } from './dateUtils';

function parseLeadingNum(raw: string): number | null {
  const m = raw.trim().match(/\d+/);
  if (!m) return null;
  const n = Number(m[0]);
  return Number.isFinite(n) ? n : null;
}

function parseFirstIsoDate(raw: string): string | null {
  const clean = raw.trim();
  if (!clean) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) return clean;
  const dates = extractIsoDatesFromSlot(clean);
  return dates.length > 0 ? dates[0] : null;
}

interface FormMedEntry {
  medGroup: IvMedsGroupId;
  name: string;
  quantity: number | null;
  parLevel: number | null;
  expiryDate: string | null;
  locationDetail: string;
}

export function syncPharmacyFormItemsIntoIvMeds(
  inventory: InventoryItem[],
  forms: PharmacyFormsState,
  today: string,
  defaultInspector = 'RN Sara Al-Mansoor'
): InventoryItem[] {
  const entries: FormMedEntry[] = [];

  // 1. CAD Checklist items
  for (const row of forms.cad.rows) {
    const name = row.drugName.trim();
    if (!name) continue;
    let latestQty: number | null = null;
    for (let i = row.shifts.length - 1; i >= 0; i--) {
      const q = parseLeadingNum(row.shifts[i]);
      if (q !== null) {
        latestQty = q;
        break;
      }
    }
    entries.push({
      medGroup: 'cad',
      name,
      quantity: latestQty,
      parLevel: latestQty,
      expiryDate: parseFirstIsoDate(row.expiryDate),
      locationDetail: 'CAD Double-Lock Cabinet',
    });
  }

  // 2. High-Alert Meds Checklist items
  for (const row of forms.weeklyForms['high-alert'].rows) {
    const name = row.medicationName.trim();
    if (!name) continue;
    let latestQty: number | null = null;
    let latestExp: string | null = null;
    for (let i = row.checks.length - 1; i >= 0; i--) {
      const chk = row.checks[i];
      if (latestQty === null) latestQty = parseLeadingNum(chk.qty);
      if (latestExp === null) latestExp = parseFirstIsoDate(chk.expDate);
      if (latestQty !== null && latestExp !== null) break;
    }
    const par = parseLeadingNum(row.wardQuantity);
    entries.push({
      medGroup: 'high-alert',
      name,
      quantity: latestQty ?? par,
      parLevel: par ?? latestQty,
      expiryDate: latestExp,
      locationDetail: forms.weeklyForms['high-alert'].location.trim() || 'High-Alert Med Shelf',
    });
  }

  // 3. Refrigerator Stock Checklist items
  for (const row of forms.weeklyForms.refrigerator.rows) {
    const name = row.medicationName.trim();
    if (!name) continue;
    let latestQty: number | null = null;
    let latestExp: string | null = null;
    for (let i = row.checks.length - 1; i >= 0; i--) {
      const chk = row.checks[i];
      if (latestQty === null) latestQty = parseLeadingNum(chk.qty);
      if (latestExp === null) latestExp = parseFirstIsoDate(chk.expDate);
      if (latestQty !== null && latestExp !== null) break;
    }
    const par = parseLeadingNum(row.wardQuantity);
    entries.push({
      medGroup: 'refrigerator',
      name,
      quantity: latestQty ?? par,
      parLevel: par ?? latestQty,
      expiryDate: latestExp,
      locationDetail: forms.weeklyForms.refrigerator.location.trim() || 'Med Fridge (2–8°C)',
    });
  }

  // 4. Near Expiry Checklist items (manual rows & non-IV-meds auto-flagged rows)
  const nearForm = forms.weeklyForms['near-expiry'];
  if (nearForm) {
    const existingNames = new Set(entries.map((e) => e.name.trim().toLowerCase()));
    for (const row of nearForm.rows) {
      if (
        row.id.startsWith('auto-near::cad::') ||
        row.id.startsWith('auto-near::wf::high-alert::') ||
        row.id.startsWith('auto-near::wf::refrigerator::')
      ) {
        continue;
      }
      const name = row.medicationName.trim();
      if (!name || existingNames.has(name.toLowerCase())) continue;

      let latestQty: number | null = null;
      let latestExp: string | null = null;
      for (let i = row.checks.length - 1; i >= 0; i--) {
        const chk = row.checks[i];
        if (latestQty === null) latestQty = parseLeadingNum(chk.qty);
        if (latestExp === null) latestExp = parseFirstIsoDate(chk.expDate);
        if (latestQty !== null && latestExp !== null) break;
      }
      const par = parseLeadingNum(row.wardQuantity);
      entries.push({
        medGroup: 'near-expiry',
        name,
        quantity: latestQty ?? par,
        parLevel: par ?? latestQty,
        expiryDate: latestExp,
        locationDetail: nearForm.location.trim() || 'Near Expiry Quarantine / Ward',
      });
    }
  }

  // Normalize existing inventory so every iv-meds item has a medGroup
  const nextInventory = inventory.map((item) =>
    item.categoryId === 'iv-meds' && !item.medGroup
      ? { ...item, medGroup: inferIvMedsGroup(item) }
      : item
  );

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const matchIdx = nextInventory.findIndex(
      (it) =>
        it.categoryId === 'iv-meds' &&
        (it.medGroup || inferIvMedsGroup(it)) === entry.medGroup &&
        it.name.trim().toLowerCase() === entry.name.toLowerCase()
    );

    if (matchIdx >= 0) {
      const existing = nextInventory[matchIdx];
      const nextExp = entry.expiryDate ?? existing.expiryDate;
      const nextQty = entry.quantity !== null ? entry.quantity : existing.quantity;
      const nextPar = entry.parLevel !== null ? entry.parLevel : existing.parLevel;
      if (
        nextExp !== existing.expiryDate ||
        nextQty !== existing.quantity ||
        nextPar !== existing.parLevel
      ) {
        nextInventory[matchIdx] = {
          ...existing,
          expiryDate: nextExp,
          quantity: nextQty,
          parLevel: nextPar,
        };
      }
    } else {
      nextInventory.push({
        id: `iv-sync-${entry.medGroup}-${Date.now().toString(36)}-${i}`,
        categoryId: 'iv-meds',
        medGroup: entry.medGroup,
        name: entry.name,
        unit: 'CCU',
        locationDetail: entry.locationDetail,
        quantity: entry.quantity ?? 1,
        parLevel: entry.parLevel ?? 1,
        unitOfMeasure: 'units',
        batchOrSerial: 'FORM-SYNC',
        expiryDate: entry.expiryDate,
        lastCheckedDate: today,
        lastCheckedBy: defaultInspector,
        notes: 'Synced from Pharmacy Form',
      });
    }
  }

  return nextInventory;
}
