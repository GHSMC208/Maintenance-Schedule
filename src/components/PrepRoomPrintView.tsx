import { DEFAULT_PREP_ROOM_CCU_COMMENTS } from '../data/prepRoomSeed';
import type {
  InventoryItem,
  SectionPeriodMeta,
  StoreStaffAssignment,
} from '../types/ward';
import { getCrashCartSlotExpirySeverity, getTodayIso } from '../utils/dateUtils';
import type { StorePrintLayoutMode } from './StoreChecklistPrintView';

export type PrepRoomPrintScope = 'both' | 'CCU' | 'SD';

interface PrepRoomPrintViewProps {
  items: InventoryItem[];
  meta?: SectionPeriodMeta;
  wardName: string;
  defaultInspector: string;
  printScope?: PrepRoomPrintScope;
  layoutMode?: StorePrintLayoutMode;
}

interface NumberedPrepItem {
  no: number;
  item: InventoryItem;
  displayExpiry: string;
}

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
  if (upper === 'NIL' || upper === 'CSSD' || upper === 'ONCE USED' || upper === 'NO EXPIRY') {
    return 'text-slate-600 italic';
  }
  const sev = getCrashCartSlotExpirySeverity(clean, getTodayIso());
  if (sev === 'expired') return 'bg-[#fecaca] text-[#7f1d1d] font-bold';
  if (sev === 'near-3m') return 'bg-[#fef08a] text-black font-bold';
  return '';
}

function chunkList<T>(list: T[], size: number): T[][] {
  if (list.length === 0) return [[]];
  const chunks: T[][] = [];
  for (let i = 0; i < list.length; i += size) {
    chunks.push(list.slice(i, i + size));
  }
  return chunks;
}

const PORTRAIT_ROWS_PER_PAGE = 44;
const TWO_UP_ROWS_PER_PANEL = 24;

export function PrepRoomPrintView({
  items,
  meta,
  wardName,
  defaultInspector,
  printScope = 'both',
  layoutMode = 'two-per-sheet',
}: PrepRoomPrintViewProps) {
  const today = getTodayIso();
  const [y, m, d] = today.split('-');
  const defaultMonth = new Date(
    Number(y),
    Math.max(0, Number(m) - 1),
    Number(d)
  ).toLocaleDateString('en-US', { month: 'long' });

  const defaultDate = `${d}/${m}/${y}`;
  const displayWard = meta?.wardNumber?.trim() || wardName;
  const displayMonth = meta?.month?.trim() || defaultMonth;
  const displayYear = meta?.year?.trim() || y;
  const displayMonthYear = [displayMonth, displayYear].filter(Boolean).join(' ');
  const displayComments =
    meta?.comments !== undefined ? meta.comments.trim() : DEFAULT_PREP_ROOM_CCU_COMMENTS;

  const staffAssignments: StoreStaffAssignment[] =
    meta?.staffAssignments && meta.staffAssignments.length > 0
      ? meta.staffAssignments
      : [
          {
            id: 'pr-staff-default',
            staffName: meta?.staffName?.trim() || defaultInspector,
            role: 'Staff Nurse',
            assignedSections: 'Preparation Room (CCU & SD)',
            checkedDate: meta?.date || defaultDate,
            signature: meta?.signature || '',
          },
        ];

  const getUnitStaffLabel = (unit: 'CCU' | 'SD'): string => {
    const active = staffAssignments.filter((s) => s.staffName.trim());
    const unitMatched = active.filter((s) => {
      const scope = s.assignedSections.toUpperCase();
      return new RegExp(`\\b${unit}\\b`).test(scope);
    });
    const source = unitMatched.length > 0 ? unitMatched : active;
    if (source.length > 0) {
      return source.map((s) => s.staffName.trim()).join(', ');
    }
    return meta?.staffName?.trim() || defaultInspector;
  };

  const ccuItems: NumberedPrepItem[] = items
    .filter((it) => it.unit === 'CCU')
    .map((item, idx) => ({
      no: idx + 1,
      item,
      displayExpiry: getItemExpiryDisplay(item),
    }));

  const sdItems: NumberedPrepItem[] = items
    .filter((it) => it.unit === 'SD')
    .map((item, idx) => ({
      no: idx + 1,
      item,
      displayExpiry: getItemExpiryDisplay(item),
    }));

  const checklists: Array<{
    unit: 'CCU' | 'SD';
    title: string;
    itemColLabel: string;
    expiryColLabel: string;
    noColLabel: string;
    staffLabel: string;
    rows: NumberedPrepItem[];
    comments?: string;
  }> = [];

  if (printScope === 'both' || printScope === 'CCU') {
    checklists.push({
      unit: 'CCU',
      title: 'CCU PREPARATION ROOM EXPIRY CHECKLIST',
      noColLabel: 'No.',
      itemColLabel: 'Item',
      expiryColLabel: 'Expiry Date',
      staffLabel: 'Checked by:',
      rows: ccuItems,
      comments: displayComments,
    });
  }

  if (printScope === 'both' || printScope === 'SD') {
    checklists.push({
      unit: 'SD',
      title: 'SD PREPARATION ROOM EXPIRY CHECKLIST',
      noColLabel: 'NO',
      itemColLabel: 'Item',
      expiryColLabel: 'EXPIRY DATE',
      staffLabel: 'Done by:',
      rows: sdItems,
    });
  }

  if (layoutMode === 'one-per-sheet') {
    const renderedPages = checklists.flatMap((cl) => {
      const pageSlices = chunkList(cl.rows, PORTRAIT_ROWS_PER_PAGE);
      return pageSlices.map((slice, sIdx) => ({
        checklist: cl,
        slice,
        sliceIdx: sIdx,
        totalSlicesForUnit: pageSlices.length,
        isLastSliceForUnit: sIdx === pageSlices.length - 1,
      }));
    });

    const totalPages = renderedPages.length;

    return (
      <div>
        <style>{`@media print { @page { size: A4 portrait; margin: 6mm 9mm; } }`}</style>

        <div className="no-print mb-2 flex items-center justify-between text-[11px] text-slate-600 px-1">
          <span>
            1 Table per Sheet (A4 Portrait) &mdash;{' '}
            <strong className="text-slate-900">
              {totalPages} {totalPages === 1 ? 'page' : 'pages'}
            </strong>{' '}
            ({checklists.map((c) => `${c.unit}: ${c.rows.length}`).join(' · ')})
          </span>
          <span className="text-slate-500">Preparation Room Expiry Checklists</span>
        </div>

        <div className="space-y-5 print:space-y-0">
          {renderedPages.map((pg, pageIdx) => (
            <div
              key={`pr-portrait-${pg.checklist.unit}-${pg.sliceIdx}`}
              className="pharmacy-page-portrait bg-white border border-slate-300 shadow-sm mx-auto w-[210mm] min-h-[297mm] p-[8mm_10mm] flex flex-col justify-between text-black appendix2-sans"
            >
              <div className="flex-1 flex flex-col">
                <div className="border border-slate-800 mb-2 shrink-0">
                  <div className="flex items-center justify-between gap-3 px-3 py-1.5 border-b border-slate-800 bg-[#f8fafc]">
                    <img
                      src="/assets/store_header.jpg"
                      alt="Kingdom of Bahrain Government Hospitals"
                      className="h-[34px] w-auto object-contain shrink-0"
                    />
                    <div className="text-center flex-1">
                      <div className="text-[13px] font-bold tracking-tight text-[#0f3d56] uppercase">
                        {pg.checklist.title}
                      </div>
                      <div className="text-[8px] text-slate-600">
                        {pg.checklist.unit} Unit &middot; Sterile Stock &amp; Medication Expiry Audit
                      </div>
                    </div>
                    <div className="text-right text-[8.5px] text-slate-700 shrink-0 min-w-[90px]">
                      <div>
                        <span className="font-bold">Items:</span> {pg.checklist.rows.length}
                      </div>
                      {pg.totalSlicesForUnit > 1 && (
                        <div>
                          Part {pg.sliceIdx + 1}/{pg.totalSlicesForUnit}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-[36%_30%_34%] text-[9.5px] bg-white">
                    <div className="border-r border-slate-800 px-2.5 py-1">
                      <span className="font-bold text-slate-700">Ward / Unit:</span>{' '}
                      <span className="ml-1">{displayWard}</span>
                    </div>
                    <div className="border-r border-slate-800 px-2.5 py-1">
                      <span className="font-bold text-slate-700">Month &amp; Year:</span>{' '}
                      <span className="ml-1">{displayMonthYear}</span>
                    </div>
                    <div className="px-2.5 py-1">
                      <span className="font-bold text-slate-700">{pg.checklist.staffLabel}</span>{' '}
                      <span className="ml-1">{getUnitStaffLabel(pg.checklist.unit)}</span>
                    </div>
                  </div>
                </div>

                <PrepRoomTable
                  rows={pg.slice}
                  noColLabel={pg.checklist.noColLabel}
                  itemColLabel={pg.checklist.itemColLabel}
                  expiryColLabel={pg.checklist.expiryColLabel}
                  portrait
                />

                {pg.isLastSliceForUnit && pg.checklist.comments && (
                  <div className="mt-2 border border-slate-400 bg-[#f8fafc] px-3 py-1 text-[9px] shrink-0">
                    <div className="font-bold text-slate-800 mb-0.5">Comments:</div>
                    <ul className="list-disc pl-5 text-slate-800 space-y-0.5">
                      {pg.checklist.comments
                        .split('\n')
                        .map((l) => l.trim())
                        .filter(Boolean)
                        .map((line, i) => (
                          <li key={i}>{line}</li>
                        ))}
                    </ul>
                  </div>
                )}

                {pg.isLastSliceForUnit && (
                  <div className="mt-2 shrink-0">
                    <PrepRoomStaffSignOffTable staffAssignments={staffAssignments} />
                  </div>
                )}
              </div>

              <div className="mt-2 pt-1 border-t border-slate-300 flex items-center justify-between text-[8.5px] text-slate-600 shrink-0">
                <span>
                  {pg.checklist.title} &middot; {displayMonthYear}
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

  // Two Tables per Sheet (A4 Landscape)
  const twoUpPages = checklists.flatMap((cl) => {
    const pageCapacity = TWO_UP_ROWS_PER_PANEL * 2;
    const slices = chunkList(cl.rows, pageCapacity);
    return slices.map((slice, sIdx) => {
      const splitPoint = Math.ceil(slice.length / 2);
      return {
        checklist: cl,
        leftRows: slice.slice(0, splitPoint),
        rightRows: slice.slice(splitPoint),
        sliceIdx: sIdx,
        totalSlicesForUnit: slices.length,
        isLastSliceForUnit: sIdx === slices.length - 1,
      };
    });
  });

  const totalPages = twoUpPages.length;

  return (
    <div>
      <style>{`@media print { @page { size: A4 landscape; margin: 5mm 6mm; } }`}</style>

      <div className="no-print mb-2 flex items-center justify-between text-[11px] text-slate-600 px-1">
        <span>
          2 Tables per Sheet (A4 Landscape) &mdash;{' '}
          <strong className="text-slate-900">
            {totalPages} {totalPages === 1 ? 'page' : 'pages'}
          </strong>{' '}
          ({checklists.map((c) => `${c.unit}: ${c.rows.length}`).join(' · ')})
        </span>
        <span className="text-slate-500">Preparation Room Expiry Checklists</span>
      </div>

      <div className="space-y-5 print:space-y-0">
        {twoUpPages.map((pg, pageIdx) => (
          <div
            key={`pr-landscape-${pg.checklist.unit}-${pg.sliceIdx}`}
            className="pharmacy-page-landscape bg-white border border-slate-300 shadow-sm mx-auto w-[297mm] min-h-[210mm] p-[6mm_7mm] flex flex-col justify-between text-black appendix2-sans"
          >
            <div className="flex-1 flex flex-col">
              <div className="border border-slate-800 mb-2 shrink-0">
                <div className="flex items-center justify-between gap-4 px-3 py-1.5 border-b border-slate-800 bg-[#f8fafc]">
                  <img
                    src="/assets/store_header.jpg"
                    alt="Kingdom of Bahrain Government Hospitals"
                    className="h-[34px] w-auto object-contain shrink-0"
                  />
                  <div className="text-center flex-1">
                    <div className="text-[14px] font-bold tracking-tight text-[#0f3d56] uppercase">
                      {pg.checklist.title}
                    </div>
                    <div className="text-[8.5px] text-slate-600">
                      {pg.checklist.unit} Unit &middot; Monthly Preparation Room Expiry Audit
                    </div>
                  </div>
                  <div className="text-right text-[8.5px] text-slate-700 shrink-0 min-w-[120px]">
                    <div>
                      <span className="font-bold">Total Items:</span> {pg.checklist.rows.length}
                    </div>
                    {pg.totalSlicesForUnit > 1 && (
                      <div>
                        Part {pg.sliceIdx + 1}/{pg.totalSlicesForUnit}
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-[38%_28%_34%] text-[9px] bg-white">
                  <div className="border-r border-slate-800 px-2.5 py-1">
                    <span className="font-bold text-slate-700">Ward / Unit:</span>{' '}
                    <span className="ml-1">{displayWard}</span>
                  </div>
                  <div className="border-r border-slate-800 px-2.5 py-1">
                    <span className="font-bold text-slate-700">Month &amp; Year:</span>{' '}
                    <span className="ml-1">{displayMonthYear}</span>
                  </div>
                  <div className="px-2.5 py-1">
                    <span className="font-bold text-slate-700">{pg.checklist.staffLabel}</span>{' '}
                    <span className="ml-1">{getUnitStaffLabel(pg.checklist.unit)}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-[4mm] items-start flex-1">
                <PrepRoomTable
                  rows={pg.leftRows}
                  noColLabel={pg.checklist.noColLabel}
                  itemColLabel={pg.checklist.itemColLabel}
                  expiryColLabel={pg.checklist.expiryColLabel}
                  compact
                />
                <div className="flex flex-col">
                  <PrepRoomTable
                    rows={pg.rightRows}
                    noColLabel={pg.checklist.noColLabel}
                    itemColLabel={pg.checklist.itemColLabel}
                    expiryColLabel={pg.checklist.expiryColLabel}
                    compact
                  />
                  {pg.isLastSliceForUnit && pg.checklist.comments && (
                    <div className="mt-2 border border-slate-400 bg-[#f8fafc] px-2.5 py-1.5 text-[8.8px]">
                      <div className="font-bold text-slate-800 mb-0.5">Comments:</div>
                      <ul className="list-disc pl-4 text-slate-800 space-y-0.5">
                        {pg.checklist.comments
                          .split('\n')
                          .map((l) => l.trim())
                          .filter(Boolean)
                          .map((line, i) => (
                            <li key={i}>{line}</li>
                          ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>

              {pg.isLastSliceForUnit && (
                <div className="mt-2 shrink-0">
                  <PrepRoomStaffSignOffTable staffAssignments={staffAssignments} />
                </div>
              )}
            </div>

            <div className="mt-2 pt-1 border-t border-slate-300 flex items-center justify-between text-[8px] text-slate-600 shrink-0">
              <span>
                {pg.checklist.title} &middot; Ward {displayWard} &middot; {displayMonthYear}
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

function PrepRoomStaffSignOffTable({
  staffAssignments,
}: {
  staffAssignments: StoreStaffAssignment[];
}) {
  return (
    <div className="border border-slate-800">
      <div className="bg-[#0f3d56] text-white px-2.5 py-[2.5px] text-[8.5px] font-bold uppercase tracking-wide flex items-center justify-between">
        <span>Assigned Staff Verification &amp; Sign-Off</span>
        <span className="font-normal normal-case text-[8px] text-slate-200">
          Verify sterile packs, expiry dates &amp; rotation compliance
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
              Assigned Room / Scope
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

function PrepRoomTable({
  rows,
  noColLabel,
  itemColLabel,
  expiryColLabel,
  compact = false,
  portrait = false,
}: {
  rows: NumberedPrepItem[];
  noColLabel: string;
  itemColLabel: string;
  expiryColLabel: string;
  compact?: boolean;
  portrait?: boolean;
}) {
  if (rows.length === 0) return null;

  const textSize = compact
    ? 'text-[9px] leading-[1.2]'
    : portrait
      ? 'text-[9px] leading-[1.18]'
      : 'text-[9.5px] leading-[1.25]';
  const cellPad = compact ? 'py-[2px]' : portrait ? 'py-[1.7px]' : 'py-[2.5px]';

  return (
    <table className={`w-full border-collapse border border-slate-800 table-fixed ${textSize}`}>
      <thead>
        <tr className="bg-[#d9d9d9] text-black font-bold">
          <th className="border border-slate-800 px-1.5 py-[3px] text-center w-[9%]">
            {noColLabel}
          </th>
          <th className="border border-slate-800 px-2 py-[3px] text-left w-[52%]">
            {itemColLabel}
          </th>
          <th className="border border-slate-800 px-2 py-[3px] text-center w-[39%]">
            {expiryColLabel}
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map((entry, idx) => (
          <tr key={entry.item.id} className={idx % 2 === 1 ? 'bg-[#f8fafc]' : 'bg-white'}>
            <td className={`border border-slate-800 px-1.5 ${cellPad} text-center tabular-nums font-semibold`}>
              {entry.no}.
            </td>
            <td className={`border border-slate-800 px-2 ${cellPad} text-left font-medium break-words`}>
              {entry.item.name}
            </td>
            <td
              className={`border border-slate-800 px-2 ${cellPad} text-center break-words ${expiryHighlight(
                entry.displayExpiry
              )}`}
            >
              {entry.displayExpiry}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
