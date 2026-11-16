import type {
  CrashCartChecklist,
  CrashCartItemRow,
  PharmacyFormsState,
  WeeklyStockChecklistForm,
  WeeklyStockFormId,
  WeeklyStockRow,
} from '../types/ward';
import {
  getCrashCartSlotExpirySeverity,
  getTodayIso,
  parseCrashCartReferenceDate,
} from './dateUtils';

export const AUTO_NEAR_PREFIX = 'auto-near::';

const CRASH_CART_MED_SECTIONS = new Set<CrashCartItemRow['sectionId']>([
  'drawer-1',
  'drawer-2',
  'cad-cupboard',
  'fridge',
]);

const CRASH_CART_MED_EXTRA_IDS = new Set<string>(['d4-28', 'd4-29']);

export interface NearExpiryCandidate {
  autoId: string;
  sourceType: 'crash-cart' | 'pharmacy-form';
  sourceLabel: string;
  medicationName: string;
  wardQuantity: string;
  currentQty: string;
  expDate: string;
}

function isCrashCartMedication(item: CrashCartItemRow): boolean {
  return CRASH_CART_MED_SECTIONS.has(item.sectionId) || CRASH_CART_MED_EXTRA_IDS.has(item.id);
}

function isHighlighted(value: string, referenceDateIso: string): boolean {
  const sev = getCrashCartSlotExpirySeverity(value, referenceDateIso);
  return sev === 'near-3m' || sev === 'expired';
}

export function collectNearExpiryCandidates(
  pharmacyForms: PharmacyFormsState,
  crashCarts: CrashCartChecklist[],
  todayIso: string = getTodayIso()
): NearExpiryCandidate[] {
  const candidates: NearExpiryCandidate[] = [];

  // 1. Highlighted near-expiry Crash Cart medications
  for (const cart of crashCarts) {
    const refDate = parseCrashCartReferenceDate(cart.checkDate);
    for (const item of cart.items) {
      if (!isCrashCartMedication(item)) continue;
      const flaggedSlots: string[] = [];
      for (const rawSlot of item.slots) {
        const trimmed = rawSlot.trim();
        if (!trimmed) continue;
        if (isHighlighted(trimmed, refDate) && !flaggedSlots.includes(trimmed)) {
          flaggedSlots.push(trimmed);
        }
      }
      if (flaggedSlots.length > 0) {
        candidates.push({
          autoId: `${AUTO_NEAR_PREFIX}cc::${cart.id}::${item.id}`,
          sourceType: 'crash-cart',
          sourceLabel: cart.cartTitle || `Crash Cart ${cart.defibLabel}`,
          medicationName: `${item.name} [${cart.cartTitle || `Crash Cart ${cart.defibLabel}`}]`,
          wardQuantity: item.quantity,
          currentQty: item.quantity,
          expDate: flaggedSlots.join(', '),
        });
      }
    }
  }

  // 2. Highlighted near-expiry CAD Checklist items
  for (const row of pharmacyForms.cad.rows) {
    const name = row.drugName.trim();
    const exp = row.expiryDate.trim();
    if (!name || !exp) continue;
    if (isHighlighted(exp, todayIso)) {
      candidates.push({
        autoId: `${AUTO_NEAR_PREFIX}cad::${row.id}`,
        sourceType: 'pharmacy-form',
        sourceLabel: 'CAD Checklist',
        medicationName: `${name} [CAD]`,
        wardQuantity: '',
        currentQty: '',
        expDate: exp,
      });
    }
  }

  // 3. Highlighted near-expiry Weekly Stock Pharmacy Forms (High-Alert, Refrigerator, Med Stock)
  const weeklySources: { id: Exclude<WeeklyStockFormId, 'near-expiry'>; tag: string }[] = [
    { id: 'high-alert', tag: 'High-Alert' },
    { id: 'refrigerator', tag: 'Refrigerator' },
    { id: 'stock-meds', tag: 'Med Stock' },
  ];

  for (const src of weeklySources) {
    const wf = pharmacyForms.weeklyForms[src.id];
    if (!wf) continue;
    for (const row of wf.rows) {
      const name = row.medicationName.trim();
      if (!name) continue;
      // Pick the latest weekly check that has an expiry date entered
      let latestCheck: { qty: string; expDate: string } | null = null;
      for (let i = row.checks.length - 1; i >= 0; i--) {
        if (row.checks[i].expDate.trim()) {
          latestCheck = row.checks[i];
          break;
        }
      }
      if (latestCheck && isHighlighted(latestCheck.expDate, todayIso)) {
        candidates.push({
          autoId: `${AUTO_NEAR_PREFIX}wf::${src.id}::${row.id}`,
          sourceType: 'pharmacy-form',
          sourceLabel: wf.title,
          medicationName: `${name} [${src.tag}]`,
          wardQuantity: row.wardQuantity,
          currentQty: latestCheck.qty.trim() || row.wardQuantity,
          expDate: latestCheck.expDate.trim(),
        });
      }
    }
  }

  // 4. Highlighted near-expiry Monthly Store Checklist items
  for (const row of pharmacyForms.monthlyStore.rows) {
    const name = row.description.trim();
    if (!name) continue;
    const flaggedDates: string[] = [];
    for (const d of [row.expiryDate1.trim(), row.expiryDate2.trim()]) {
      if (d && isHighlighted(d, todayIso) && !flaggedDates.includes(d)) {
        flaggedDates.push(d);
      }
    }
    if (flaggedDates.length > 0) {
      candidates.push({
        autoId: `${AUTO_NEAR_PREFIX}ms::${row.id}`,
        sourceType: 'pharmacy-form',
        sourceLabel: 'Monthly Store',
        medicationName: `${name} [Monthly Store]`,
        wardQuantity: row.qtyAvailable,
        currentQty: row.qtyAvailable,
        expDate: flaggedDates.join(' / '),
      });
    }
  }

  return candidates;
}

function hasManualRowContent(row: WeeklyStockRow): boolean {
  if (row.id.startsWith(AUTO_NEAR_PREFIX)) return false;
  if (row.medicationName.trim() || row.wardQuantity.trim()) return true;
  return row.checks.some((c) => c.qty.trim() || c.expDate.trim());
}

export function buildSyncedNearExpiryForm(
  pharmacyForms: PharmacyFormsState,
  crashCarts: CrashCartChecklist[],
  todayIso: string = getTodayIso()
): WeeklyStockChecklistForm {
  const nearForm = pharmacyForms.weeklyForms['near-expiry'];
  const candidates = collectNearExpiryCandidates(pharmacyForms, crashCarts, todayIso);

  const existingById = new Map<string, WeeklyStockRow>();
  for (const row of nearForm.rows) {
    existingById.set(row.id, row);
  }

  const autoRows: WeeklyStockRow[] = candidates.map((cand) => {
    const prev = existingById.get(cand.autoId);
    const prevChecks =
      prev && prev.checks.length === 5
        ? prev.checks.map((c) => ({ ...c }))
        : Array.from({ length: 5 }, () => ({ qty: '', expDate: '' }));

    prevChecks[0] = {
      qty: cand.currentQty || prevChecks[0].qty,
      expDate: cand.expDate,
    };

    return {
      id: cand.autoId,
      slNo: '',
      medicationName: cand.medicationName,
      wardQuantity: cand.wardQuantity || prev?.wardQuantity || '',
      checks: prevChecks,
    };
  });

  // Preserve any user-created non-auto rows that have content
  const manualRows = nearForm.rows.filter(hasManualRowContent);

  const combined = [...autoRows, ...manualRows];
  const minRows = Math.max(12, combined.length);

  const paddedRows: WeeklyStockRow[] = Array.from({ length: minRows }, (_, idx) => {
    const existing = combined[idx];
    if (existing) {
      return {
        ...existing,
        slNo: String(idx + 1),
      };
    }
    return {
      id: `near-expiry-r-blank-${idx + 1}`,
      slNo: '',
      medicationName: '',
      wardQuantity: '',
      checks: Array.from({ length: 5 }, () => ({ qty: '', expDate: '' })),
    };
  });

  return {
    ...nearForm,
    rows: paddedRows,
  };
}

export function syncNearExpiryInPharmacyForms(
  pharmacyForms: PharmacyFormsState,
  crashCarts: CrashCartChecklist[],
  force: boolean = false
): PharmacyFormsState {
  if (!force && pharmacyForms.autoSyncNearExpiry === false) {
    return pharmacyForms;
  }

  const nextNearForm = buildSyncedNearExpiryForm(pharmacyForms, crashCarts);
  return {
    ...pharmacyForms,
    autoSyncNearExpiry: true,
    weeklyForms: {
      ...pharmacyForms.weeklyForms,
      'near-expiry': nextNearForm,
    },
  };
}
