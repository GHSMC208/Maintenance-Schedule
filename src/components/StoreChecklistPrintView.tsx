import { STORE_SECTIONS } from '../data/storeItemsSeed';
import type {
  InventoryItem,
  MonthlyStoreChecklistForm,
  MonthlyStoreRow,
  SectionPeriodMeta,
} from '../types/ward';
import { getTodayIso } from '../utils/dateUtils';
import {
  MONTHLY_STORE_ROWS_PER_PAGE,
  MonthlyStorePrintPage,
} from './PharmacyFormsPrintView';

interface StoreChecklistPrintViewProps {
  items: InventoryItem[];
  meta?: SectionPeriodMeta;
  wardName: string;
  defaultInspector: string;
}

function formatSlashDate(iso: string | null | undefined): string {
  if (!iso) return '';
  const parts = iso.split('-');
  if (parts.length !== 3) return iso;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

export function StoreChecklistPrintView({
  items,
  meta,
  wardName,
  defaultInspector,
}: StoreChecklistPrintViewProps) {
  const today = getTodayIso();
  const [y, m, d] = today.split('-');
  const defaultDate = `${d}/${m}/${y}`;
  const defaultMonth = new Date(
    Number(y),
    Math.max(0, Number(m) - 1),
    Number(d)
  ).toLocaleDateString('en-US', { month: 'long' });

  const displayWard = meta?.wardNumber?.trim() || wardName;
  const displayMonth = meta?.month?.trim() || defaultMonth;
  const displayYear = meta?.year?.trim() || y;
  const displayMonthYear = [displayMonth, displayYear].filter(Boolean).join(' ');

  // Group Store Items by official Store Categories in exact PDF order
  const grouped = new Map<string, InventoryItem[]>();
  for (const sec of STORE_SECTIONS) {
    grouped.set(sec, []);
  }
  for (const item of items) {
    const sec = item.locationDetail?.trim() || STORE_SECTIONS[0];
    const bucket = grouped.get(sec);
    if (bucket) {
      bucket.push(item);
    } else {
      grouped.set(sec, [item]);
    }
  }

  const mappedRows: MonthlyStoreRow[] = [];
  for (const [sectionName, sectionItems] of grouped.entries()) {
    if (sectionItems.length === 0) continue;
    mappedRows.push({
      id: `store-cat-hdr-${sectionName}`,
      isCategoryHeader: true,
      stockNo: '',
      description: sectionName,
      qtyAvailable: '',
      expiryDate1: '',
      expiryDate2: '',
    });

    for (const item of sectionItems) {
      const primaryCode = item.batchOrSerial === '—' ? '' : item.batchOrSerial.trim();
      const secondaryCode = item.otherCode?.trim() || '';
      const stockNo =
        primaryCode && secondaryCode
          ? `${primaryCode} / ${secondaryCode}`
          : primaryCode || secondaryCode;
      const qtyAvailable =
        item.quantity === 0 && item.parLevel === 0
          ? ''
          : `${item.quantity} ${item.unitOfMeasure}`;

      mappedRows.push({
        id: item.id,
        stockNo,
        description: item.name,
        qtyAvailable,
        expiryDate1: formatSlashDate(item.expiryDate),
        expiryDate2: formatSlashDate(item.secondExpiryDate),
      });
    }
  }

  const targetRowCount = Math.max(
    MONTHLY_STORE_ROWS_PER_PAGE,
    Math.ceil(mappedRows.length / MONTHLY_STORE_ROWS_PER_PAGE) *
      MONTHLY_STORE_ROWS_PER_PAGE
  );

  const paddedRows: MonthlyStoreRow[] = Array.from(
    { length: targetRowCount },
    (_, idx) =>
      mappedRows[idx] || {
        id: `store-print-blank-${idx + 1}`,
        stockNo: '',
        description: '',
        qtyAvailable: '',
        expiryDate1: '',
        expiryDate2: '',
      }
  );

  const form: MonthlyStoreChecklistForm = {
    formCode: 'GH/NUR/2025-19',
    ward: displayWard,
    monthYear: displayMonthYear,
    rows: paddedRows,
    staffName: meta?.staffName?.trim() || defaultInspector,
    signature: meta?.signature?.trim() || '',
    date: meta?.date?.trim() || defaultDate,
  };

  return (
    <div>
      <style>{`@media print { @page { size: A4 portrait; margin: 6mm 8mm; } }`}</style>
      <MonthlyStorePrintPage form={form} />
    </div>
  );
}
