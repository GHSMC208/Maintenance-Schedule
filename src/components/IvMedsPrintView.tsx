import {
  IV_MEDS_GROUPS,
  inferIvMedsGroup,
  isIvMedNearExpiry,
  type IvMedsGroupMeta,
} from '../data/ivMedsSeed';
import type {
  InventoryItem,
  IvMedsAuditMeta,
  IvMedsGroupId,
  ScheduleTask,
} from '../types/ward';
import { getCrashCartSlotExpirySeverity, getTodayIso } from '../utils/dateUtils';

interface IvMedsPrintViewProps {
  items: InventoryItem[];
  auditMeta: IvMedsAuditMeta;
  wardName: string;
  printScope: 'all' | IvMedsGroupId;
  monthlyTask?: ScheduleTask;
}

interface SectionChunk {
  group: IvMedsGroupMeta;
  rows: InventoryItem[];
  startNum: number;
  partLabel: string | null;
}

function formatSlashDate(iso: string | null): string {
  if (!iso) return '';
  const parts = iso.split('-');
  if (parts.length !== 3) return iso;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function expiryHighlight(iso: string | null, todayIso: string): string {
  const slash = formatSlashDate(iso);
  if (!slash) return '';
  const sev = getCrashCartSlotExpirySeverity(slash, todayIso);
  if (sev === 'expired') return 'bg-[#fecaca] text-[#7f1d1d] font-bold';
  if (sev === 'near-3m') return 'bg-[#fef08a] text-black font-bold';
  return '';
}

function buildSectionChunks(
  groups: IvMedsGroupMeta[],
  itemsByGroup: Record<IvMedsGroupId, InventoryItem[]>
): SectionChunk[] {
  const MAX_ROWS_PER_CHUNK = 22;
  const chunks: SectionChunk[] = [];

  for (const group of groups) {
    const list = itemsByGroup[group.id] || [];
    if (list.length === 0) {
      chunks.push({ group, rows: [], startNum: 1, partLabel: null });
      continue;
    }
    const totalParts = Math.ceil(list.length / MAX_ROWS_PER_CHUNK);
    for (let p = 0; p < totalParts; p++) {
      const slice = list.slice(p * MAX_ROWS_PER_CHUNK, (p + 1) * MAX_ROWS_PER_CHUNK);
      chunks.push({
        group,
        rows: slice,
        startNum: p * MAX_ROWS_PER_CHUNK + 1,
        partLabel: totalParts > 1 ? `Part ${p + 1}/${totalParts}` : null,
      });
    }
  }
  return chunks;
}

function paginateChunks(chunks: SectionChunk[]): SectionChunk[][] {
  const PAGE_CAPACITY = 26;
  const FIRST_PAGE_HEADER_COST = 5;

  const pages: SectionChunk[][] = [];
  let currentPage: SectionChunk[] = [];
  let usedUnits = FIRST_PAGE_HEADER_COST;

  for (const chunk of chunks) {
    const rowCost = Math.max(1, chunk.rows.length);
    const chunkUnits = 3 + rowCost; // section title + table header + rows

    if (currentPage.length > 0 && usedUnits + chunkUnits > PAGE_CAPACITY) {
      pages.push(currentPage);
      currentPage = [];
      usedUnits = 2; // compact continuation header
    }
    currentPage.push(chunk);
    usedUnits += chunkUnits;
  }

  if (currentPage.length > 0) {
    pages.push(currentPage);
  }
  return pages;
}

export function IvMedsPrintView({
  items,
  auditMeta,
  wardName,
  printScope,
  monthlyTask,
}: IvMedsPrintViewProps) {
  const today = getTodayIso();

  const groupsToRender =
    printScope === 'all'
      ? IV_MEDS_GROUPS
      : IV_MEDS_GROUPS.filter((g) => g.id === printScope);

  const itemsByGroup: Record<IvMedsGroupId, InventoryItem[]> = {
    cad: [],
    'high-alert': [],
    refrigerator: [],
    'iv-fluids': [],
    'near-expiry': [],
  };

  for (const it of items) {
    const grp = it.medGroup || inferIvMedsGroup(it);
    itemsByGroup[grp].push(it);
    if (grp !== 'near-expiry' && isIvMedNearExpiry(it, today)) {
      itemsByGroup['near-expiry'].push(it);
    }
  }

  const chunks = buildSectionChunks(groupsToRender, itemsByGroup);
  const pages = paginateChunks(chunks);

  // Ensure sign-off block always fits cleanly on the last page; otherwise add a clean sign-off tail
  const lastPageUnits =
    pages.length > 0
      ? (pages.length === 1 ? 5 : 2) +
        pages[pages.length - 1].reduce((acc, c) => acc + 3 + Math.max(1, c.rows.length), 0)
      : 0;
  const staffRowsCost = 3 + Math.max(3, auditMeta.staffAssignments.length) * 1.5;
  const putSignOffOnNewPage = pages.length > 0 && lastPageUnits + staffRowsCost > 27;

  const totalPages = pages.length + (putSignOffOnNewPage ? 1 : 0);

  const totalScopedItems = groupsToRender.reduce(
    (sum, g) => sum + (itemsByGroup[g.id]?.length || 0),
    0
  );

  const wardNumberText = auditMeta.wardNumber?.trim();
  const displayWard = wardNumberText ? `${wardNumberText} — ${wardName}` : wardName;
  const displayMonth = auditMeta.month?.trim() || '';
  const displayYear = auditMeta.year?.trim() || '';
  const displayPeriod =
    [displayMonth, displayYear].filter(Boolean).join(' ') || auditMeta.monthYear;

  const signOffBlock = (
    <div className="mt-3 shrink-0">
      <div className="bg-[#d9d9d9] border border-black border-b-0 px-2.5 py-1 text-[10.5px] font-bold flex items-center justify-between">
        <span>Monthly Scheduled Audit &mdash; Assigned Staff Sign-Off (Minimum 3 Staff)</span>
        <span className="font-normal text-[9.5px]">
          Assigned: {auditMeta.staffAssignments.length} Staff
        </span>
      </div>
      <table className="w-full border-collapse border border-black text-[9.5px]">
        <thead>
          <tr className="bg-[#eef2f6]">
            <th className="border border-black px-1.5 py-1 text-center font-bold w-[5%]">#</th>
            <th className="border border-black px-2 py-1 text-left font-bold w-[25%]">
              Staff Name
            </th>
            <th className="border border-black px-2 py-1 text-left font-bold w-[18%]">Role</th>
            <th className="border border-black px-2 py-1 text-left font-bold w-[25%]">
              Assigned List(s)
            </th>
            <th className="border border-black px-1.5 py-1 text-center font-bold w-[11%]">
              Date Checked
            </th>
            <th className="border border-black px-2 py-1 text-center font-bold w-[16%]">
              Signature
            </th>
          </tr>
        </thead>
        <tbody>
          {auditMeta.staffAssignments.map((st, idx) => (
            <tr key={st.id}>
              <td className="border border-black px-1.5 py-2 text-center font-bold">
                {idx + 1}
              </td>
              <td className="border border-black px-2 py-2 font-medium">{st.staffName}</td>
              <td className="border border-black px-2 py-2">{st.role}</td>
              <td className="border border-black px-2 py-2">{st.assignedLists}</td>
              <td className="border border-black px-1.5 py-2 text-center tabular-nums">
                {st.checkedDate}
              </td>
              <td className="border border-black px-2 py-2 text-center h-[32px]">
                {st.signature}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {auditMeta.notes && (
        <div className="mt-1 text-[9.5px] text-slate-800">
          <span className="font-bold">Notes:</span> {auditMeta.notes}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6 print:space-y-0">
      <style>{`@media print { @page { size: A4 portrait; margin: 6mm 8mm; } }`}</style>

      {pages.map((pageChunks, pageIdx) => {
        const isFirstPage = pageIdx === 0;
        const isLastContentPage = pageIdx === pages.length - 1;

        return (
          <div
            key={`ivm-print-page-${pageIdx}`}
            className="pharmacy-page-portrait bg-white border border-slate-300 shadow-sm mx-auto w-[210mm] min-h-[297mm] p-[9mm_11mm] flex flex-col justify-between text-black appendix2-sans"
          >
            <div>
              {isFirstPage ? (
                <>
                  {/* Top Official Government Hospitals Header */}
                  <div className="flex flex-col items-center mb-1.5">
                    <img
                      src="/assets/store_header.jpg"
                      alt="Kingdom of Bahrain Government Hospitals"
                      className="h-[48px] w-auto object-contain"
                    />
                  </div>

                  {/* Audit Header Summary Box */}
                  <div className="border border-black mb-2.5">
                    <div className="bg-[#dce6f2] border-b border-black py-1 px-2.5 text-center font-bold text-[13px]">
                      Stock IV Fluids &amp; Medications &mdash; Monthly Organized Audit Checklist
                    </div>
                    <div className="grid grid-cols-[44%_32%_24%] text-[10px]">
                      <div className="border-r border-black px-2 py-1">
                        <span className="font-bold">Ward No. / Unit:</span>{' '}
                        <span className="ml-1">{displayWard}</span>
                      </div>
                      <div className="border-r border-black px-2 py-1">
                        <span className="font-bold">Month / Year:</span>{' '}
                        <span className="ml-1">
                          {displayMonth || '____'} / {displayYear || '____'}
                        </span>
                      </div>
                      <div className="px-2 py-1">
                        <span className="font-bold">Schedule:</span>{' '}
                        <span className="ml-1">
                          Monthly ({auditMeta.staffAssignments.length} Staff)
                        </span>
                      </div>
                    </div>
                    <div className="grid grid-cols-[44%_32%_24%] border-t border-black text-[9.5px] bg-[#f8fafc]">
                      <div className="border-r border-black px-2 py-0.5">
                        <span className="font-bold">Lists Included:</span>{' '}
                        {groupsToRender.map((g) => g.shortLabel).join(' · ')}
                      </div>
                      <div className="border-r border-black px-2 py-0.5 tabular-nums">
                        <span className="font-bold">Total Items:</span> {totalScopedItems}
                      </div>
                      <div className="px-2 py-0.5 tabular-nums">
                        <span className="font-bold">Next Due:</span>{' '}
                        {monthlyTask ? formatSlashDate(monthlyTask.dueDate) : formatSlashDate(today)}
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="border-b border-black pb-1 mb-2.5 flex items-center justify-between text-[10px]">
                  <span className="font-bold">
                    Stock IV Fluids &amp; Medications &mdash; Monthly Audit ({displayWard})
                  </span>
                  <span>
                    {displayPeriod} &middot; Page {pageIdx + 1} of {totalPages}
                  </span>
                </div>
              )}

              {/* Organized Medication & IV Fluid Section Tables */}
              <div className="space-y-3">
                {pageChunks.map((chunk) => (
                  <div key={`${chunk.group.id}-${chunk.startNum}`}>
                    <div className="bg-[#dce6f2] border border-black border-b-0 px-2.5 py-1 flex items-center justify-between text-[10.5px] font-bold">
                      <span>
                        {chunk.group.label}
                        {chunk.partLabel ? ` (${chunk.partLabel})` : ''}
                      </span>
                      <span className="text-[9.5px] font-normal">
                        Form Ref: {chunk.group.formRef} &middot;{' '}
                        {itemsByGroup[chunk.group.id].length} items
                      </span>
                    </div>

                    <table className="w-full border-collapse border border-black text-[9.5px]">
                      <thead>
                        <tr className="bg-[#f1f5f9]">
                          <th className="border border-black px-1 py-1 text-center font-bold w-[5%]">
                            #
                          </th>
                          <th className="border border-black px-2 py-1 text-left font-bold w-[38%]">
                            Item / Medication Name
                          </th>
                          <th className="border border-black px-1.5 py-1 text-left font-bold w-[19%]">
                            Unit / Location
                          </th>
                          <th className="border border-black px-1.5 py-1 text-center font-bold w-[12%]">
                            Lot / Batch
                          </th>
                          <th className="border border-black px-1 py-1 text-center font-bold w-[12%]">
                            Stock / Par
                          </th>
                          <th className="border border-black px-1.5 py-1 text-center font-bold w-[14%]">
                            Expiry Date
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {chunk.rows.length === 0 ? (
                          <tr>
                            <td
                              colSpan={6}
                              className="border border-black px-2 py-2.5 text-center text-slate-500 italic"
                            >
                              No items in this list.
                            </td>
                          </tr>
                        ) : (
                          chunk.rows.map((item, idx) => {
                            const rowNum = chunk.startNum + idx;
                            const isLow = item.quantity < item.parLevel;
                            const expHl = expiryHighlight(item.expiryDate, today);
                            return (
                              <tr key={item.id}>
                                <td className="border border-black px-1 py-[3px] text-center tabular-nums">
                                  {rowNum}
                                </td>
                                <td className="border border-black px-2 py-[3px] text-left font-medium">
                                  {item.name}
                                </td>
                                <td className="border border-black px-1.5 py-[3px] text-left text-[9px]">
                                  {item.unit} &middot; {item.locationDetail}
                                </td>
                                <td className="border border-black px-1.5 py-[3px] text-center font-mono text-[8.5px]">
                                  {item.batchOrSerial}
                                </td>
                                <td
                                  className={`border border-black px-1 py-[3px] text-center tabular-nums ${
                                    isLow ? 'bg-[#fef3c7] font-bold' : ''
                                  }`}
                                >
                                  {item.quantity} / {item.parLevel} {item.unitOfMeasure}
                                </td>
                                <td
                                  className={`border border-black px-1.5 py-[3px] text-center tabular-nums ${expHl}`}
                                >
                                  {formatSlashDate(item.expiryDate) || '—'}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>

              {isLastContentPage && !putSignOffOnNewPage && signOffBlock}
            </div>

            {/* Official Footer */}
            <div className="mt-2 pt-1.5 border-t border-slate-300 flex items-center justify-between text-[9.5px] shrink-0">
              <span>
                Highlight Legend: Red = Expired &middot; Yellow = Near Expiry (&le; 3 Months)
                &middot; Amber = Below Par
              </span>
              <span className="tabular-nums">
                Page {pageIdx + 1} of {totalPages}
              </span>
            </div>
          </div>
        );
      })}

      {putSignOffOnNewPage && (
        <div className="pharmacy-page-portrait bg-white border border-slate-300 shadow-sm mx-auto w-[210mm] min-h-[297mm] p-[9mm_11mm] flex flex-col justify-between text-black appendix2-sans">
          <div>
            <div className="border-b border-black pb-1 mb-3 flex items-center justify-between text-[10px]">
              <span className="font-bold">
                Stock IV Fluids &amp; Medications &mdash; Monthly Staff Verification ({displayWard})
              </span>
              <span>
                {displayPeriod} &middot; Page {totalPages} of {totalPages}
              </span>
            </div>
            {signOffBlock}
          </div>

          <div className="mt-2 pt-1.5 border-t border-slate-300 flex items-center justify-between text-[9.5px] shrink-0">
            <span>Monthly Scheduled Audit (Minimum 3 Assigned Staff)</span>
            <span className="tabular-nums">
              Page {totalPages} of {totalPages}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
