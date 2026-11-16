import type {
  InventoryItem,
  SectionPeriodMeta,
  StoreStaffAssignment,
} from '../types/ward';
import { getCrashCartSlotExpirySeverity, getTodayIso } from '../utils/dateUtils';
import type { StorePrintLayoutMode } from './StoreChecklistPrintView';

interface ProcedureTrolleyPrintViewProps {
  items: InventoryItem[];
  meta?: SectionPeriodMeta;
  wardName: string;
  defaultInspector: string;
  layoutMode?: StorePrintLayoutMode;
}

interface ProcedureTrolleyRowGroup {
  key: string;
  displayNo: number;
  items: InventoryItem[];
}

interface TrolleyLandscapePage {
  leftGroups: ProcedureTrolleyRowGroup[];
  rightGroups: ProcedureTrolleyRowGroup[];
  includeSignOffInRight: boolean;
}

interface TrolleyPortraitPage {
  groups: ProcedureTrolleyRowGroup[];
  includeSignOff: boolean;
}

function formatSlashDate(iso: string | null | undefined): string {
  if (!iso) return '';
  const parts = iso.split('-');
  if (parts.length !== 3) return iso;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function expiryHl(val: string): string {
  const sev = getCrashCartSlotExpirySeverity(val, getTodayIso());
  if (sev === 'expired') return 'bg-[#fecaca] text-[#7f1d1d] font-bold';
  if (sev === 'near-3m') return 'bg-[#fef08a] text-black font-bold';
  return '';
}

function formatTrolleyQty(item: InventoryItem): { label: string; tone: 'nil' | 'zero' | 'normal' } {
  const uom = item.unitOfMeasure.trim();
  if (item.quantity === 0 && uom.toLowerCase() === 'nil') {
    return { label: 'Nil', tone: 'nil' };
  }
  if (item.quantity === 0) {
    return { label: '0', tone: 'zero' };
  }
  if (uom.toLowerCase() === 'box') {
    return { label: `${item.quantity} box`, tone: 'normal' };
  }
  if (uom.toLowerCase() === 'boxes') {
    return { label: `${item.quantity} boxes`, tone: 'normal' };
  }
  if (uom && !['pcs', 'nil'].includes(uom.toLowerCase())) {
    return { label: `${item.quantity} ${uom}`, tone: 'normal' };
  }
  return { label: String(item.quantity), tone: 'normal' };
}

function groupProcedureTrolleyRows(items: InventoryItem[]): ProcedureTrolleyRowGroup[] {
  const groups: ProcedureTrolleyRowGroup[] = [];
  const byNumber = new Map<string, ProcedureTrolleyRowGroup>();
  let nextAutoNo = 1;

  for (const item of items) {
    const match = item.locationDetail?.trim().match(/^No\.\s*(\d+)/i);
    if (match) {
      const numVal = Number(match[1]);
      const key = `no-${numVal}`;
      const existing = byNumber.get(key);
      if (existing) {
        existing.items.push(item);
      } else {
        const group: ProcedureTrolleyRowGroup = {
          key,
          displayNo: numVal,
          items: [item],
        };
        byNumber.set(key, group);
        groups.push(group);
        if (numVal >= nextAutoNo) nextAutoNo = numVal + 1;
      }
    } else {
      const assigned = nextAutoNo++;
      groups.push({
        key: `custom-${item.id}`,
        displayNo: assigned,
        items: [item],
      });
    }
  }

  return groups;
}

function estimateGroupLines(group: ProcedureTrolleyRowGroup, portrait = false): number {
  const wrapThreshold = portrait ? 62 : 42;
  return group.items.reduce((sum, sub) => {
    const wrapped = sub.name.length > wrapThreshold ? 1.5 : 1;
    return sum + wrapped;
  }, 0);
}

const MAX_PANEL_LINES = 32;
const MAX_PORTRAIT_PAGE_1_LINES = 58;
const MAX_PORTRAIT_NEXT_LINES = 65;

function paginateTrolleyTwoColumn(
  groups: ProcedureTrolleyRowGroup[],
  staffCount: number
): TrolleyLandscapePage[] {
  if (groups.length === 0) {
    return [{ leftGroups: [], rightGroups: [], includeSignOffInRight: true }];
  }

  const signOffLines = 3.2 + Math.max(1, staffCount) * 1.35;
  const totalLines = groups.reduce((acc, g) => acc + estimateGroupLines(g, false), 0);

  if (totalLines + signOffLines <= MAX_PANEL_LINES * 2) {
    const targetLeft = Math.min(
      MAX_PANEL_LINES,
      Math.ceil((totalLines + signOffLines) / 2)
    );
    const leftGroups: ProcedureTrolleyRowGroup[] = [];
    const rightGroups: ProcedureTrolleyRowGroup[] = [];
    let leftLines = 0;

    for (const grp of groups) {
      const w = estimateGroupLines(grp, false);
      if (
        rightGroups.length === 0 &&
        (leftGroups.length === 0 || leftLines + w <= targetLeft)
      ) {
        leftGroups.push(grp);
        leftLines += w;
      } else {
        rightGroups.push(grp);
      }
    }

    const rightLines = rightGroups.reduce((acc, g) => acc + estimateGroupLines(g, false), 0);
    if (rightLines + signOffLines <= MAX_PANEL_LINES + 2) {
      return [{ leftGroups, rightGroups, includeSignOffInRight: true }];
    }
  }

  const pages: TrolleyLandscapePage[] = [];
  let idx = 0;

  const takePanel = (limit: number): { taken: ProcedureTrolleyRowGroup[]; used: number } => {
    const taken: ProcedureTrolleyRowGroup[] = [];
    let used = 0;
    while (idx < groups.length) {
      const w = estimateGroupLines(groups[idx], false);
      if (taken.length > 0 && used + w > limit) break;
      taken.push(groups[idx]);
      used += w;
      idx += 1;
    }
    return { taken, used };
  };

  while (idx < groups.length) {
    const left = takePanel(MAX_PANEL_LINES);
    const right = takePanel(MAX_PANEL_LINES);
    const isDone = idx >= groups.length;
    const includeSignOffInRight = isDone && right.used + signOffLines <= MAX_PANEL_LINES + 1;
    pages.push({
      leftGroups: left.taken,
      rightGroups: right.taken,
      includeSignOffInRight,
    });
  }

  const last = pages[pages.length - 1];
  if (last && !last.includeSignOffInRight) {
    pages.push({
      leftGroups: [],
      rightGroups: [],
      includeSignOffInRight: true,
    });
  }

  return pages;
}

function paginateTrolleyPortrait(
  groups: ProcedureTrolleyRowGroup[],
  staffCount: number
): TrolleyPortraitPage[] {
  if (groups.length === 0) {
    return [{ groups: [], includeSignOff: true }];
  }

  const signOffLines = 3.2 + Math.max(1, staffCount) * 1.4;
  const pages: TrolleyPortraitPage[] = [];
  let idx = 0;

  while (idx < groups.length) {
    const limit = pages.length === 0 ? MAX_PORTRAIT_PAGE_1_LINES : MAX_PORTRAIT_NEXT_LINES;
    const taken: ProcedureTrolleyRowGroup[] = [];
    let used = 0;

    while (idx < groups.length) {
      const w = estimateGroupLines(groups[idx], true);
      if (taken.length > 0 && used + w > limit) break;
      taken.push(groups[idx]);
      used += w;
      idx += 1;
    }

    const isDone = idx >= groups.length;
    const includeSignOff = isDone && used + signOffLines <= limit + 2;
    pages.push({ groups: taken, includeSignOff });
  }

  const last = pages[pages.length - 1];
  if (last && !last.includeSignOff) {
    pages.push({ groups: [], includeSignOff: true });
  }

  return pages;
}

export function ProcedureTrolleyPrintView({
  items,
  meta,
  wardName,
  defaultInspector,
  layoutMode = 'two-per-sheet',
}: ProcedureTrolleyPrintViewProps) {
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

  const staffAssignments: StoreStaffAssignment[] =
    meta?.staffAssignments && meta.staffAssignments.length > 0
      ? meta.staffAssignments
      : [
          {
            id: 'pt-staff-default',
            staffName: meta?.staffName?.trim() || defaultInspector,
            role: 'Staff Nurse',
            assignedSections: 'All Procedure Trolley Items (No. 1–42)',
            checkedDate: meta?.date?.trim() || defaultDate,
            signature: meta?.signature?.trim() || '',
          },
        ];

  const groupedRows = groupProcedureTrolleyRows(items);

  if (layoutMode === 'one-per-sheet') {
    const portraitPages = paginateTrolleyPortrait(groupedRows, staffAssignments.length);
    const totalPages = portraitPages.length;

    return (
      <div>
        <style>{`@media print { @page { size: A4 portrait; margin: 5mm 8mm; } }`}</style>

        <div className="no-print mb-2 flex items-center justify-between text-[11px] text-slate-600 px-1">
          <span>
            1 Table per Sheet (A4 Portrait) &mdash;{' '}
            <strong className="text-slate-900">
              {totalPages} {totalPages === 1 ? 'page' : 'pages'}
            </strong>{' '}
            ({groupedRows.length} rows / {items.length} items)
          </span>
          <span className="text-slate-500">Procedure Trolley Checklist</span>
        </div>

        <div className="space-y-5 print:space-y-0">
          {portraitPages.map((page, pageIdx) => {
            const isFirstPage = pageIdx === 0;
            const isLastPage = pageIdx === totalPages - 1;

            return (
              <div
                key={`pt-portrait-page-${pageIdx}`}
                className="pharmacy-page-portrait bg-white border border-slate-300 shadow-sm mx-auto w-[210mm] min-h-[297mm] p-[6mm_8mm] flex flex-col justify-between text-black appendix2-sans"
              >
                <div className="flex-1 flex flex-col">
                  {isFirstPage ? (
                    <div className="border border-slate-800 mb-1.5 shrink-0">
                      <div className="flex items-center justify-between gap-3 px-2.5 py-1 border-b border-slate-800 bg-[#f8fafc]">
                        <div className="shrink-0">
                          <img
                            src="/assets/store_header.jpg"
                            alt="Kingdom of Bahrain Government Hospitals"
                            className="h-[32px] w-auto object-contain"
                          />
                        </div>
                        <div className="text-center flex-1">
                          <div className="text-[13px] font-bold tracking-tight text-[#0f3d56] uppercase">
                            Procedure Trolley Checklist
                          </div>
                          <div className="text-[8px] text-slate-600">
                            Sterile Procedure Packs, Catheters, Needles, Sutures &amp; Dressing Stock Audit
                          </div>
                        </div>
                        <div className="text-right text-[8px] text-slate-700 shrink-0">
                          <div>
                            <span className="font-bold">Rows:</span> {groupedRows.length} ({items.length})
                          </div>
                          <div>
                            <span className="font-bold">Staff:</span> {staffAssignments.length}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-[44%_30%_26%] text-[8.5px] bg-white">
                        <div className="border-r border-slate-800 px-2 py-[2.5px]">
                          <span className="font-bold text-slate-700">Ward / Unit:</span>{' '}
                          <span className="font-medium text-black ml-1">{displayWard}</span>
                        </div>
                        <div className="border-r border-slate-800 px-2 py-[2.5px]">
                          <span className="font-bold text-slate-700">Month &amp; Year:</span>{' '}
                          <span className="font-medium text-black ml-1">{displayMonthYear}</span>
                        </div>
                        <div className="px-2 py-[2.5px]">
                          <span className="font-bold text-slate-700">Audit Cycle:</span>{' '}
                          <span className="font-medium text-black ml-1">Monthly &amp; Post-Use</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between border-b border-slate-800 pb-1 mb-1.5 text-[9px] shrink-0">
                      <span className="font-bold text-[#0f3d56] uppercase">
                        Procedure Trolley Checklist &mdash; {displayWard}
                      </span>
                      <span>
                        {displayMonthYear} &middot; Page {pageIdx + 1} of {totalPages}
                      </span>
                    </div>
                  )}

                  {page.groups.length > 0 && (
                    <TrolleyPanelTable groups={page.groups} portrait />
                  )}

                  {isLastPage && (
                    <div className={page.groups.length > 0 ? 'mt-2' : ''}>
                      <TrolleyStaffSignOffTable staffAssignments={staffAssignments} />
                    </div>
                  )}
                </div>

                <div className="mt-1.5 pt-1 border-t border-slate-300 flex items-center justify-between text-[8px] text-slate-600 shrink-0">
                  <span>
                    Procedure Trolley Checklist &middot; Ward {displayWard} &middot; {displayMonthYear}
                  </span>
                  <span>
                    {totalPages > 1
                      ? `Page ${pageIdx + 1} of ${totalPages}`
                      : 'Verify integrity & seal after every procedure'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  const pages = paginateTrolleyTwoColumn(groupedRows, staffAssignments.length);
  const totalPages = pages.length;

  return (
    <div>
      <style>{`@media print { @page { size: A4 landscape; margin: 5mm 6mm; } }`}</style>

      <div className="no-print mb-2 flex items-center justify-between text-[11px] text-slate-600 px-1">
        <span>
          2 Tables per Sheet (A4 Landscape) &mdash;{' '}
          <strong className="text-slate-900">
            {totalPages} {totalPages === 1 ? 'page' : 'pages'}
          </strong>{' '}
          ({groupedRows.length} rows / {items.length} items)
        </span>
        <span className="text-slate-500">Procedure Trolley Checklist</span>
      </div>

      <div className="space-y-5 print:space-y-0">
        {pages.map((page, pageIdx) => {
          const isFirstPage = pageIdx === 0;
          const isLastPage = pageIdx === totalPages - 1;

          return (
            <div
              key={`pt-landscape-page-${pageIdx}`}
              className="pharmacy-page-landscape bg-white border border-slate-300 shadow-sm mx-auto w-[297mm] min-h-[210mm] p-[6mm_7mm] flex flex-col justify-between text-black appendix2-sans"
            >
              <div className="flex-1 flex flex-col">
                {/* Clinical Header */}
                {isFirstPage ? (
                  <div className="border border-slate-800 mb-2 shrink-0">
                    <div className="flex items-center justify-between gap-4 px-3 py-1.5 border-b border-slate-800 bg-[#f8fafc]">
                      <div className="shrink-0">
                        <img
                          src="/assets/store_header.jpg"
                          alt="Kingdom of Bahrain Government Hospitals"
                          className="h-[34px] w-auto object-contain"
                        />
                      </div>
                      <div className="text-center flex-1">
                        <div className="text-[14px] font-bold tracking-tight text-[#0f3d56] uppercase">
                          Procedure Trolley Checklist
                        </div>
                        <div className="text-[8.5px] text-slate-600">
                          Sterile Procedure Packs, Catheters, Needles, Sutures &amp; Dressing Stock Audit
                        </div>
                      </div>
                      <div className="text-right text-[8.5px] text-slate-700 shrink-0 min-w-[145px]">
                        <div>
                          <span className="font-bold">Checklist Rows:</span> {groupedRows.length} ({items.length} items)
                        </div>
                        <div>
                          <span className="font-bold">Assigned Staff:</span> {staffAssignments.length}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-[44%_30%_26%] text-[9px] bg-white">
                      <div className="border-r border-slate-800 px-2.5 py-1">
                        <span className="font-bold text-slate-700">Ward / Unit:</span>{' '}
                        <span className="font-medium text-black ml-1">{displayWard}</span>
                      </div>
                      <div className="border-r border-slate-800 px-2.5 py-1">
                        <span className="font-bold text-slate-700">Month &amp; Year:</span>{' '}
                        <span className="font-medium text-black ml-1">{displayMonthYear}</span>
                      </div>
                      <div className="px-2.5 py-1">
                        <span className="font-bold text-slate-700">Audit Cycle:</span>{' '}
                        <span className="font-medium text-black ml-1">Monthly &amp; Post-Use</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between border-b border-slate-800 pb-1 mb-2 text-[9px] shrink-0">
                    <span className="font-bold text-[#0f3d56] uppercase">
                      Procedure Trolley Checklist &mdash; {displayWard}
                    </span>
                    <span>
                      {displayMonthYear} &middot; Page {pageIdx + 1} of {totalPages}
                    </span>
                  </div>
                )}

                {/* Dual-Column Balanced Trolley Tables */}
                <div className="grid grid-cols-2 gap-[4mm] items-start flex-1">
                  <TrolleyPanelTable groups={page.leftGroups} />

                  <div className="flex flex-col">
                    {page.rightGroups.length > 0 && (
                      <TrolleyPanelTable groups={page.rightGroups} />
                    )}

                    {isLastPage && (
                      <div className={page.rightGroups.length > 0 ? 'mt-2.5' : ''}>
                        <TrolleyStaffSignOffTable staffAssignments={staffAssignments} />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Clean Clinical Footer */}
              <div className="mt-2 pt-1 border-t border-slate-300 flex items-center justify-between text-[8px] text-slate-600 shrink-0">
                <span>
                  Procedure Trolley Checklist &middot; Ward {displayWard} &middot; {displayMonthYear}
                </span>
                <span>
                  {totalPages > 1
                    ? `Page ${pageIdx + 1} of ${totalPages}`
                    : 'Verify integrity & seal after every procedure'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TrolleyStaffSignOffTable({
  staffAssignments,
}: {
  staffAssignments: StoreStaffAssignment[];
}) {
  return (
    <div className="border border-slate-800">
      <div className="bg-[#0f3d56] text-white px-2.5 py-[2.5px] text-[8.5px] font-bold uppercase tracking-wide flex items-center justify-between">
        <span>Assigned Staff Verification &amp; Sign-Off</span>
        <span className="font-normal normal-case text-[8px] text-slate-200">
          Verify stock count, package integrity &amp; dual expiry dates
        </span>
      </div>
      <table className="w-full border-collapse text-[8.5px]">
        <thead>
          <tr className="bg-[#e8eff5] text-slate-900 font-bold">
            <th className="border-t border-r border-slate-400 px-2 py-[2px] text-left w-[27%]">
              Staff Name
            </th>
            <th className="border-t border-r border-slate-400 px-1.5 py-[2px] text-left w-[20%]">
              Role
            </th>
            <th className="border-t border-r border-slate-400 px-1.5 py-[2px] text-left w-[25%]">
              Assigned Scope
            </th>
            <th className="border-t border-r border-slate-400 px-1.5 py-[2px] text-center w-[13%]">
              Date
            </th>
            <th className="border-t border-slate-400 px-1.5 py-[2px] text-center w-[15%]">
              Signature
            </th>
          </tr>
        </thead>
        <tbody>
          {staffAssignments.map((st) => (
            <tr key={st.id} className="bg-white">
              <td className="border-t border-r border-slate-400 px-2 py-[2.5px] font-medium">
                {st.staffName}
              </td>
              <td className="border-t border-r border-slate-400 px-1.5 py-[2.5px] text-slate-700">
                {st.role}
              </td>
              <td className="border-t border-r border-slate-400 px-1.5 py-[2.5px] text-slate-700">
                {st.assignedSections}
              </td>
              <td className="border-t border-r border-slate-400 px-1.5 py-[2.5px] text-center tabular-nums">
                {st.checkedDate}
              </td>
              <td className="border-t border-slate-400 px-1.5 py-[2.5px] text-center">
                {st.signature}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TrolleyPanelTable({
  groups,
  portrait = false,
}: {
  groups: ProcedureTrolleyRowGroup[];
  portrait?: boolean;
}) {
  if (groups.length === 0) return null;

  const textSize = portrait ? 'text-[8.6px] leading-[1.15]' : 'text-[8.7px] leading-[1.2]';
  const cellPad = portrait ? 'py-[1.5px]' : 'py-[2.2px]';
  const headPad = portrait ? 'py-[3px]' : 'py-[3.5px]';

  return (
    <table className={`w-full border-collapse border border-slate-800 table-fixed ${textSize}`}>
      <thead>
        <tr className="bg-[#0f3d56] text-white font-bold">
          <th className={`border border-slate-800 px-1 ${headPad} text-center w-[6.5%]`}>No.</th>
          <th className={`border border-slate-800 px-1.5 ${headPad} text-left w-[49.5%]`}>
            Item Description
          </th>
          <th className={`border border-slate-800 px-1 ${headPad} text-center w-[12%]`}>Qty</th>
          <th className={`border border-slate-800 px-1 ${headPad} text-center w-[16%]`}>
            Expiry Date 1
          </th>
          <th className={`border border-slate-800 px-1 ${headPad} text-center w-[16%]`}>
            Expiry Date 2
          </th>
        </tr>
      </thead>
      <tbody>
        {groups.map((group, gIdx) => {
          const rowTint = gIdx % 2 === 1 ? 'bg-[#f8fafc]' : 'bg-white';

          return group.items.map((sub, subIdx) => {
            const isFirstSub = subIdx === 0;
            const isLastSub = subIdx === group.items.length - 1;
            const qtyInfo = formatTrolleyQty(sub);
            const d1 = formatSlashDate(sub.expiryDate);
            const d2 = formatSlashDate(sub.secondExpiryDate);
            const subBottomBorder = isLastSub
              ? 'border-b border-slate-800'
              : 'border-b border-dashed border-slate-300';

            return (
              <tr key={sub.id} className={rowTint}>
                {isFirstSub && (
                  <td
                    rowSpan={group.items.length}
                    className="border border-slate-800 px-1 py-[1.5px] text-center align-middle font-bold text-slate-800 tabular-nums"
                  >
                    {group.displayNo}
                  </td>
                )}
                <td
                  className={`border-r border-slate-800 ${subBottomBorder} px-1.5 ${cellPad} text-left text-slate-900 break-words`}
                >
                  {sub.name}
                </td>
                <td
                  className={`border-r border-slate-800 ${subBottomBorder} px-1 ${cellPad} text-center tabular-nums font-medium ${
                    qtyInfo.tone === 'nil'
                      ? 'text-slate-500 italic'
                      : qtyInfo.tone === 'zero'
                        ? 'text-amber-800 font-bold bg-[#fef3c7]'
                        : 'text-slate-900'
                  }`}
                >
                  {qtyInfo.label}
                </td>
                <td
                  className={`border-r border-slate-800 ${subBottomBorder} px-1 ${cellPad} text-center tabular-nums text-[8.2px] ${
                    d1 ? expiryHl(d1) : ''
                  }`}
                >
                  {d1}
                </td>
                <td
                  className={`border-r border-slate-800 ${subBottomBorder} px-1 ${cellPad} text-center tabular-nums text-[8.2px] ${
                    d2 ? expiryHl(d2) : ''
                  }`}
                >
                  {d2}
                </td>
              </tr>
            );
          });
        })}
      </tbody>
    </table>
  );
}
