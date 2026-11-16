import { BLOOD_TROLLEY_DRAWERS } from '../data/bloodTrolleySeed';
import type {
  InventoryItem,
  SectionPeriodMeta,
  StoreStaffAssignment,
} from '../types/ward';
import { getCrashCartSlotExpirySeverity, getTodayIso } from '../utils/dateUtils';
import type { StorePrintLayoutMode } from './StoreChecklistPrintView';

export type BloodTrolleyPrintScope = 'both' | 'CCU' | 'SD';

interface BloodTrolleyPrintViewProps {
  items: InventoryItem[];
  meta?: SectionPeriodMeta;
  wardName?: string;
  defaultInspector: string;
  printScope?: BloodTrolleyPrintScope;
  layoutMode?: StorePrintLayoutMode;
}

type BloodTrolleyRow =
  | {
      kind: 'drawer-header';
      id: string;
      drawerName: string;
      headerTitle: string;
      expiryColTitle: string;
    }
  | {
      kind: 'item';
      id: string;
      drawerName: string;
      headerTitle: string;
      expiryColTitle: string;
      name: string;
      displayExpiry: string;
      rowIndexInDrawer: number;
    };

interface ContinuousTwoColumnPage {
  leftRows: BloodTrolleyRow[];
  rightRows: BloodTrolleyRow[];
  includeSignOffInRight: boolean;
}

interface ContinuousPortraitPage {
  rows: BloodTrolleyRow[];
  includeSignOff: boolean;
}

// Conservative printable vertical budgets (px at 96dpi)
const TWO_UP_PAGE_1_BUDGET_PX = 635;
const TWO_UP_NEXT_BUDGET_PX = 665;
const PORTRAIT_PAGE_1_BUDGET_PX = 955;
const PORTRAIT_NEXT_BUDGET_PX = 995;

function formatSlashDate(iso: string | null | undefined): string {
  if (!iso) return '';
  const parts = iso.split('-');
  if (parts.length !== 3) return iso;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function getItemExpiryDisplay(item: InventoryItem): string {
  if (item.expiryDisplay !== undefined) return item.expiryDisplay;
  return formatSlashDate(item.expiryDate);
}

function expiryHighlight(displayText: string): string {
  const clean = displayText.trim();
  if (!clean) return '';
  const upper = clean.toUpperCase();
  if (upper === 'NIL' || upper === 'NA' || upper === 'NO EXPIRY') {
    return 'text-slate-600 font-medium';
  }
  const sev = getCrashCartSlotExpirySeverity(clean, getTodayIso());
  if (sev === 'expired') return 'bg-[#fecaca] text-[#7f1d1d] font-bold';
  if (sev === 'near-3m') return 'bg-[#fef08a] text-black font-bold';
  return '';
}

function getDrawerHeaderLabel(drawerName: string): {
  headerTitle: string;
  expiryColTitle: string;
} {
  const low = drawerName.toLowerCase();
  if (low === '1st drawer') {
    return { headerTitle: 'Items (1st drawer)', expiryColTitle: 'Expiry Date' };
  }
  if (low === '2nd drawer') {
    return { headerTitle: 'Items (2nd drawer)', expiryColTitle: 'Expiry date' };
  }
  if (low === '3rd drawer') {
    return { headerTitle: 'Items (3rd Drawer)', expiryColTitle: 'Expiry date' };
  }
  if (low === '4th drawer') {
    return { headerTitle: 'Items (4th Drawer)', expiryColTitle: 'Expiry date' };
  }
  return { headerTitle: `Items (${drawerName})`, expiryColTitle: 'Expiry Date' };
}

function estimateRowHeightPx(row: BloodTrolleyRow, portrait: boolean): number {
  if (row.kind === 'drawer-header') {
    return portrait ? 19 : 20;
  }
  const nameCap = portrait ? 52 : 34;
  const expCap = portrait ? 38 : 24;
  const nameLines = Math.max(1, Math.ceil(row.name.length / nameCap));
  const expLines = Math.max(1, Math.ceil(row.displayExpiry.length / expCap));
  const lines = Math.max(nameLines, expLines);
  const base = portrait ? 14.4 : 15.6;
  const extra = portrait ? 10.2 : 11.2;
  return lines === 1 ? base : base + (lines - 1) * extra;
}

function estimateSignOffHeightPx(staffCount: number): number {
  return 44 + Math.max(1, staffCount) * 19;
}

function ensureLeadingHeader(rows: BloodTrolleyRow[]): BloodTrolleyRow[] {
  if (rows.length === 0) return rows;
  const first = rows[0];
  if (first.kind === 'drawer-header') return rows;
  return [
    {
      kind: 'drawer-header',
      id: `cont-hdr-${first.id}`,
      drawerName: first.drawerName,
      headerTitle: `${first.headerTitle} (cont.)`,
      expiryColTitle: first.expiryColTitle,
    },
    ...rows,
  ];
}

function paginateTwoColumnContinuous(
  rows: BloodTrolleyRow[],
  signOffHeightPx: number
): ContinuousTwoColumnPage[] {
  if (rows.length === 0) {
    return [{ leftRows: [], rightRows: [], includeSignOffInRight: true }];
  }

  const pages: ContinuousTwoColumnPage[] = [];
  let idx = 0;

  const fillColumn = (budgetPx: number): { taken: BloodTrolleyRow[]; usedPx: number } => {
    const taken: BloodTrolleyRow[] = [];
    let usedPx = 0;

    while (idx < rows.length) {
      const row = rows[idx];
      let h = estimateRowHeightPx(row, false);

      // If the very first row of a column is an item (continuation), reserve header height
      if (taken.length === 0 && row.kind === 'item') {
        usedPx += 20;
      }

      // Avoid leaving a drawer-header orphaned at the bottom of a column
      if (row.kind === 'drawer-header' && idx + 1 < rows.length) {
        const nextH = estimateRowHeightPx(rows[idx + 1], false);
        if (taken.length > 0 && usedPx + h + nextH > budgetPx) {
          break;
        }
        // Small visual gap before a subsequent drawer section header
        if (taken.length > 0) h += 6;
      }

      if (taken.length > 0 && usedPx + h > budgetPx) {
        break;
      }

      taken.push(row);
      usedPx += h;
      idx += 1;
    }

    return { taken: ensureLeadingHeader(taken), usedPx };
  };

  while (idx < rows.length) {
    const budgetPx = pages.length === 0 ? TWO_UP_PAGE_1_BUDGET_PX : TWO_UP_NEXT_BUDGET_PX;
    const left = fillColumn(budgetPx);
    const right = fillColumn(budgetPx);

    const isDone = idx >= rows.length;
    const includeSignOffInRight = isDone && right.usedPx + signOffHeightPx + 8 <= budgetPx;

    pages.push({
      leftRows: left.taken,
      rightRows: right.taken,
      includeSignOffInRight,
    });
  }

  const last = pages[pages.length - 1];
  if (last && !last.includeSignOffInRight) {
    pages.push({
      leftRows: [],
      rightRows: [],
      includeSignOffInRight: true,
    });
  }

  return pages;
}

function paginatePortraitContinuous(
  rows: BloodTrolleyRow[],
  signOffHeightPx: number
): ContinuousPortraitPage[] {
  if (rows.length === 0) {
    return [{ rows: [], includeSignOff: true }];
  }

  const pages: ContinuousPortraitPage[] = [];
  let idx = 0;

  while (idx < rows.length) {
    const budgetPx = pages.length === 0 ? PORTRAIT_PAGE_1_BUDGET_PX : PORTRAIT_NEXT_BUDGET_PX;
    const taken: BloodTrolleyRow[] = [];
    let usedPx = 0;

    while (idx < rows.length) {
      const row = rows[idx];
      let h = estimateRowHeightPx(row, true);

      if (taken.length === 0 && row.kind === 'item') {
        usedPx += 19;
      }

      if (row.kind === 'drawer-header' && idx + 1 < rows.length) {
        const nextH = estimateRowHeightPx(rows[idx + 1], true);
        if (taken.length > 0 && usedPx + h + nextH > budgetPx) {
          break;
        }
        if (taken.length > 0) h += 5;
      }

      if (taken.length > 0 && usedPx + h > budgetPx) {
        break;
      }

      taken.push(row);
      usedPx += h;
      idx += 1;
    }

    const isDone = idx >= rows.length;
    const includeSignOff = isDone && usedPx + signOffHeightPx + 8 <= budgetPx;

    pages.push({
      rows: ensureLeadingHeader(taken),
      includeSignOff,
    });
  }

  const last = pages[pages.length - 1];
  if (last && !last.includeSignOff) {
    pages.push({
      rows: [],
      includeSignOff: true,
    });
  }

  return pages;
}

function buildContinuousUnitData(unitItems: InventoryItem[]): {
  continuousRows: BloodTrolleyRow[];
  drawerCount: number;
} {
  const drawerMap = new Map<string, InventoryItem[]>();
  for (const dr of BLOOD_TROLLEY_DRAWERS) drawerMap.set(dr, []);
  for (const it of unitItems) {
    const key = it.locationDetail?.trim() || BLOOD_TROLLEY_DRAWERS[0];
    const bucket = drawerMap.get(key);
    if (bucket) bucket.push(it);
    else drawerMap.set(key, [it]);
  }

  const drawerCount = Array.from(drawerMap.values()).filter((l) => l.length > 0).length;

  const continuousRows: BloodTrolleyRow[] = [];
  for (const [drawerName, list] of drawerMap.entries()) {
    if (list.length === 0) continue;
    const labels = getDrawerHeaderLabel(drawerName);
    continuousRows.push({
      kind: 'drawer-header',
      id: `bt-hdr-${drawerName}`,
      drawerName,
      headerTitle: labels.headerTitle,
      expiryColTitle: labels.expiryColTitle,
    });
    list.forEach((item, idx) => {
      continuousRows.push({
        kind: 'item',
        id: item.id,
        drawerName,
        headerTitle: labels.headerTitle,
        expiryColTitle: labels.expiryColTitle,
        name: item.name,
        displayExpiry: getItemExpiryDisplay(item),
        rowIndexInDrawer: idx,
      });
    });
  }

  return { continuousRows, drawerCount };
}

export function BloodTrolleyPrintView({
  items,
  meta,
  wardName,
  defaultInspector,
  printScope = 'both',
  layoutMode = 'two-per-sheet',
}: BloodTrolleyPrintViewProps) {
  const today = getTodayIso();
  const [y, m, d] = today.split('-');
  const defaultDate = `${d}/${m}/${y}`;
  const defaultMonth = new Date(
    Number(y),
    Math.max(0, Number(m) - 1),
    Number(d)
  ).toLocaleDateString('en-US', { month: 'long' });

  const rawWard = meta?.wardNumber?.trim() || wardName?.trim() || '208';
  const baseWard = rawWard.replace(/\s+(CCU|SD)$/i, '').trim() || '208';
  const wardUpper = baseWard.toUpperCase();
  const wardPrefix = wardUpper.startsWith('WARD ') ? wardUpper : `WARD ${wardUpper}`;

  const displayMonth = meta?.month?.trim() || defaultMonth;
  const displayYear = meta?.year?.trim() || y;
  const displayMonthYear = [displayMonth, displayYear].filter(Boolean).join(' ');

  const staffAssignments: StoreStaffAssignment[] =
    meta?.staffAssignments && meta.staffAssignments.length > 0
      ? meta.staffAssignments
      : [
          {
            id: 'bt-staff-default',
            staffName: meta?.staffName?.trim() || defaultInspector,
            role: 'Staff Nurse',
            assignedSections: 'All Drawers (1st – 4th Drawer)',
            checkedDate: meta?.date || defaultDate,
            signature: meta?.signature || '',
          },
        ];

  const getUnitStaffAssignments = (unit: 'CCU' | 'SD'): StoreStaffAssignment[] => {
    const otherUnit = unit === 'CCU' ? 'SD' : 'CCU';
    const filtered = staffAssignments.filter((st) => {
      const scope = st.assignedSections.toUpperCase();
      const mentionsUnit = new RegExp(`\\b${unit}\\b`).test(scope);
      const mentionsOther = new RegExp(`\\b${otherUnit}\\b`).test(scope);
      return mentionsUnit || !mentionsOther;
    });
    return filtered.length > 0 ? filtered : staffAssignments;
  };

  const hasUnitSplitItems = items.some((it) => it.unit === 'CCU' || it.unit === 'SD');
  const unitsToPrint: Array<'CCU' | 'SD'> = printScope === 'both' ? ['CCU', 'SD'] : [printScope];

  const unitBundles = unitsToPrint.map((unit) => {
    const unitItems = hasUnitSplitItems ? items.filter((it) => it.unit === unit) : items;
    const { continuousRows, drawerCount } = buildContinuousUnitData(unitItems);
    const unitStaff = getUnitStaffAssignments(unit);
    const signOffHeightPx = estimateSignOffHeightPx(unitStaff.length);
    const checklistTitle = `${wardPrefix} ${unit} BLOOD COLLECTION TROLLEY EXPIRY CHECKLIST`;
    return {
      unit,
      unitItems,
      continuousRows,
      drawerCount,
      unitStaff,
      signOffHeightPx,
      checklistTitle,
    };
  });

  const summaryScopeText = unitBundles
    .map((b) => `${b.unit}: ${b.drawerCount} drawers / ${b.unitItems.length} items`)
    .join(' · ');

  if (layoutMode === 'one-per-sheet') {
    const allPages = unitBundles.flatMap((bundle) => {
      const unitPages = paginatePortraitContinuous(bundle.continuousRows, bundle.signOffHeightPx);
      return unitPages.map((pg, unitPageIdx) => ({
        ...pg,
        unit: bundle.unit,
        unitPageIdx,
        checklistTitle: bundle.checklistTitle,
        itemCount: bundle.unitItems.length,
        unitStaff: bundle.unitStaff,
      }));
    });
    const totalPages = allPages.length;

    return (
      <div>
        <style>{`@media print { @page { size: A4 portrait; margin: 5mm 8mm; } }`}</style>

        <div className="no-print mb-2 flex items-center justify-between text-[11px] text-slate-600 px-1">
          <span>
            1 Table per Page, Continuous (A4 Portrait) &mdash;{' '}
            <strong className="text-slate-900">
              {totalPages} {totalPages === 1 ? 'page' : 'pages'}
            </strong>{' '}
            ({summaryScopeText})
          </span>
          <span className="text-slate-500">Ward Blood Collection Trolley Checklist</span>
        </div>

        <div className="space-y-5 print:space-y-0">
          {allPages.map((pg, pageIdx) => (
            <div
              key={`bt-portrait-cont-${pg.unit}-${pg.unitPageIdx}`}
              className="pharmacy-page-portrait bg-white border border-slate-300 shadow-sm mx-auto w-[210mm] min-h-[297mm] p-[6mm_8mm] flex flex-col justify-between text-black appendix2-sans"
            >
              <div className="flex-1 flex flex-col">
                <div className="border border-slate-800 mb-2 shrink-0">
                  <div className="flex items-center justify-between gap-3 px-3 py-1 border-b border-slate-800 bg-[#f8fafc]">
                    <img
                      src="/assets/store_header.jpg"
                      alt="Kingdom of Bahrain Government Hospitals"
                      className="h-[30px] w-auto object-contain shrink-0"
                    />
                    <div className="text-center flex-1">
                      <div className="text-[12px] font-bold tracking-tight text-[#0f3d56] uppercase">
                        {pg.checklistTitle}
                      </div>
                      <div className="text-[8px] text-slate-600">
                        {pg.unit} Unit &middot; All Drawers (1st &ndash; 4th Drawer) &middot; Monthly Blood Collection Trolley Expiry Audit
                      </div>
                    </div>
                    <div className="text-right text-[8.5px] text-slate-700 shrink-0 min-w-[85px]">
                      <div>
                        <span className="font-bold">Items:</span> {pg.itemCount}
                      </div>
                      <div>
                        Page {pageIdx + 1}/{totalPages}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 text-[9px] bg-white">
                    <div className="border-r border-slate-800 px-2.5 py-[3px]">
                      <span className="font-bold text-slate-700">Ward / Unit:</span>{' '}
                      <span className="ml-1">
                        {baseWard} {pg.unit}
                      </span>
                    </div>
                    <div className="px-2.5 py-[3px]">
                      <span className="font-bold text-slate-700">MONTH:</span>{' '}
                      <span className="ml-1">{displayMonthYear}</span>
                    </div>
                  </div>
                </div>

                {pg.rows.length > 0 && <ContinuousDrawerTable rows={pg.rows} portrait />}

                {pg.includeSignOff && (
                  <div className="mt-2 shrink-0">
                    <BloodTrolleyStaffSignOffTable staffAssignments={pg.unitStaff} />
                  </div>
                )}
              </div>

              <div className="mt-1.5 pt-1 border-t border-slate-300 flex items-center justify-between text-[8px] text-slate-600 shrink-0">
                <span>
                  {pg.checklistTitle} &middot; {displayMonthYear}
                </span>
                <span>
                  Page {pageIdx + 1} of {totalPages}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Two Tables per Page, Continuous (A4 Landscape: Left + Right columns flow sequentially across drawers)
  const allPages = unitBundles.flatMap((bundle) => {
    const unitPages = paginateTwoColumnContinuous(bundle.continuousRows, bundle.signOffHeightPx);
    return unitPages.map((pg, unitPageIdx) => ({
      ...pg,
      unit: bundle.unit,
      unitPageIdx,
      checklistTitle: bundle.checklistTitle,
      itemCount: bundle.unitItems.length,
      unitStaff: bundle.unitStaff,
    }));
  });
  const totalPages = allPages.length;

  return (
    <div>
      <style>{`@media print { @page { size: A4 landscape; margin: 5mm 6mm; } }`}</style>

      <div className="no-print mb-2 flex items-center justify-between text-[11px] text-slate-600 px-1">
        <span>
          2 Tables per Page, Continuous (A4 Landscape) &mdash;{' '}
          <strong className="text-slate-900">
            {totalPages} {totalPages === 1 ? 'page' : 'pages'}
          </strong>{' '}
          ({summaryScopeText})
        </span>
        <span className="text-slate-500">Ward Blood Collection Trolley Checklist</span>
      </div>

      <div className="space-y-5 print:space-y-0">
        {allPages.map((pg, pageIdx) => (
          <div
            key={`bt-landscape-cont-${pg.unit}-${pg.unitPageIdx}`}
            className="pharmacy-page-landscape bg-white border border-slate-300 shadow-sm mx-auto w-[297mm] min-h-[210mm] p-[5mm_7mm] flex flex-col justify-between text-black appendix2-sans"
          >
            <div className="flex-1 flex flex-col">
              <div className="border border-slate-800 mb-2 shrink-0">
                <div className="flex items-center justify-between gap-4 px-3 py-1 border-b border-slate-800 bg-[#f8fafc]">
                  <img
                    src="/assets/store_header.jpg"
                    alt="Kingdom of Bahrain Government Hospitals"
                    className="h-[32px] w-auto object-contain shrink-0"
                  />
                  <div className="text-center flex-1">
                    <div className="text-[13.5px] font-bold tracking-tight text-[#0f3d56] uppercase">
                      {pg.checklistTitle}
                    </div>
                    <div className="text-[8.5px] text-slate-600">
                      {pg.unit} Unit &middot; 1st &ndash; 4th Drawer Continuous Checklist &middot; Monthly Expiry Audit
                    </div>
                  </div>
                  <div className="text-right text-[8.5px] text-slate-700 shrink-0 min-w-[110px]">
                    <div>
                      <span className="font-bold">Total Items:</span> {pg.itemCount}
                    </div>
                    <div>
                      Page {pageIdx + 1}/{totalPages}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 text-[9px] bg-white">
                  <div className="border-r border-slate-800 px-2.5 py-[3px]">
                    <span className="font-bold text-slate-700">Ward / Unit:</span>{' '}
                    <span className="ml-1">
                      {baseWard} {pg.unit}
                    </span>
                  </div>
                  <div className="px-2.5 py-[3px]">
                    <span className="font-bold text-slate-700">MONTH:</span>{' '}
                    <span className="ml-1">{displayMonthYear}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-[5mm] items-start flex-1">
                <div>{pg.leftRows.length > 0 && <ContinuousDrawerTable rows={pg.leftRows} />}</div>
                <div className="flex flex-col">
                  {pg.rightRows.length > 0 && <ContinuousDrawerTable rows={pg.rightRows} />}
                  {pg.includeSignOffInRight && (
                    <div className={pg.rightRows.length > 0 ? 'mt-2' : ''}>
                      <BloodTrolleyStaffSignOffTable staffAssignments={pg.unitStaff} />
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-1.5 pt-1 border-t border-slate-300 flex items-center justify-between text-[8px] text-slate-600 shrink-0">
              <span>
                {pg.checklistTitle} &middot; {displayMonthYear}
              </span>
              <span>
                Page {pageIdx + 1} of {totalPages}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ContinuousDrawerTable({
  rows,
  portrait = false,
}: {
  rows: BloodTrolleyRow[];
  portrait?: boolean;
}) {
  const textSize = portrait ? 'text-[9px] leading-[1.15]' : 'text-[9.5px] leading-[1.2]';
  const cellPad = portrait ? 'py-[1.6px]' : 'py-[2px]';
  const headerPad = portrait ? 'py-[2.5px]' : 'py-[3px]';

  return (
    <table className={`w-full border-collapse border border-slate-800 table-fixed ${textSize}`}>
      <tbody>
        {rows.map((row, idx) => {
          if (row.kind === 'drawer-header') {
            return (
              <tr
                key={`${row.id}-${idx}`}
                className="bg-[#d9d9d9] text-black font-bold border-y-2 border-slate-800"
              >
                <td className={`border-r border-slate-800 px-2.5 ${headerPad} text-center w-[56%]`}>
                  {row.headerTitle}
                </td>
                <td className={`px-2.5 ${headerPad} text-center w-[44%]`}>
                  {row.expiryColTitle}
                </td>
              </tr>
            );
          }

          return (
            <tr
              key={row.id}
              className={row.rowIndexInDrawer % 2 === 1 ? 'bg-[#f8fafc]' : 'bg-white'}
            >
              <td
                className={`border border-slate-800 px-2.5 ${cellPad} text-left font-medium break-words w-[56%]`}
              >
                {row.name}
              </td>
              <td
                className={`border border-slate-800 px-2.5 ${cellPad} text-center break-words w-[44%] ${expiryHighlight(
                  row.displayExpiry
                )}`}
              >
                {row.displayExpiry}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function BloodTrolleyStaffSignOffTable({
  staffAssignments,
}: {
  staffAssignments: StoreStaffAssignment[];
}) {
  return (
    <div className="border border-slate-800">
      <div className="bg-[#0f3d56] text-white px-2.5 py-[2.5px] text-[8.5px] font-bold uppercase tracking-wide flex items-center justify-between">
        <span>Assigned Staff Verification &amp; Sign-Off</span>
        <span className="font-normal normal-case text-[8px] text-slate-200">
          Verify vacutainers, culture bottles, cannulas &amp; drawer expiry dates
        </span>
      </div>
      <table className="w-full border-collapse text-[8.5px]">
        <thead>
          <tr className="bg-[#e8eff5] text-slate-900 font-bold">
            <th className="border-t border-r border-slate-400 px-2 py-[2px] text-left w-[25%]">
              Staff Name
            </th>
            <th className="border-t border-r border-slate-400 px-1.5 py-[2px] text-left w-[20%]">
              Role
            </th>
            <th className="border-t border-r border-slate-400 px-1.5 py-[2px] text-left w-[29%]">
              Assigned Drawers / Scope
            </th>
            <th className="border-t border-r border-slate-400 px-1.5 py-[2px] text-center w-[12%]">
              Date
            </th>
            <th className="border-t border-slate-400 px-1.5 py-[2px] text-center w-[14%]">
              Signature
            </th>
          </tr>
        </thead>
        <tbody>
          {staffAssignments.map((st) => (
            <tr key={st.id} className="bg-white">
              <td className="border-t border-r border-slate-400 px-2 py-[2px] font-medium">
                {st.staffName}
              </td>
              <td className="border-t border-r border-slate-400 px-1.5 py-[2px] text-slate-700">
                {st.role}
              </td>
              <td className="border-t border-r border-slate-400 px-1.5 py-[2px] text-slate-700">
                {st.assignedSections}
              </td>
              <td className="border-t border-r border-slate-400 px-1.5 py-[2px] text-center tabular-nums">
                {st.checkedDate}
              </td>
              <td className="border-t border-slate-400 px-1.5 py-[2px] text-center">
                {st.signature}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
