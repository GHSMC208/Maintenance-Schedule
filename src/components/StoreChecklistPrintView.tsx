import { STORE_SECTIONS } from '../data/storeItemsSeed';
import type {
  InventoryItem,
  MonthlyStoreRow,
  SectionPeriodMeta,
  StoreStaffAssignment,
} from '../types/ward';
import { getCrashCartSlotExpirySeverity, getTodayIso } from '../utils/dateUtils';

interface StoreChecklistPrintViewProps {
  items: InventoryItem[];
  meta?: SectionPeriodMeta;
  wardName: string;
  defaultInspector: string;
}

interface CompactStorePage {
  leftRows: MonthlyStoreRow[];
  rightRows: MonthlyStoreRow[];
  rightHasRoomForSignOff: boolean;
}

const PAGE_1_PANEL_BUDGET_PX = 635;
const NEXT_PAGE_PANEL_BUDGET_PX = 665;

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

function estimateRowHeightPx(row: MonthlyStoreRow): number {
  if (row.isCategoryHeader) {
    return 14.5;
  }
  const descLines = Math.max(1, Math.ceil(row.description.length / 45));
  const stockLines = Math.max(1, Math.ceil(row.stockNo.length / 20));
  const qtyLines = Math.max(1, Math.ceil(row.qtyAvailable.length / 11));
  const lines = Math.max(descLines, stockLines, qtyLines);
  return lines === 1 ? 11.8 : 11.8 + (lines - 1) * 9.2;
}

function estimateSignOffHeightPx(staffCount: number): number {
  if (staffCount > 1) {
    return 22 + staffCount * 15;
  }
  return 54;
}

function paginateRowsTwoUp(
  rows: MonthlyStoreRow[],
  signOffHeightPx: number
): CompactStorePage[] {
  if (rows.length === 0) {
    return [{ leftRows: [], rightRows: [], rightHasRoomForSignOff: true }];
  }

  const pages: CompactStorePage[] = [];
  let idx = 0;

  const fillPanel = (budgetPx: number): { panelRows: MonthlyStoreRow[]; usedPx: number } => {
    const panelRows: MonthlyStoreRow[] = [];
    let usedPx = 0;

    while (idx < rows.length) {
      const row = rows[idx];
      const h = estimateRowHeightPx(row);

      // Avoid stranding a black category header at the very bottom of a panel
      if (row.isCategoryHeader && idx + 1 < rows.length) {
        const nextH = estimateRowHeightPx(rows[idx + 1]);
        if (panelRows.length > 0 && usedPx + h + nextH > budgetPx) {
          break;
        }
      }

      if (panelRows.length > 0 && usedPx + h > budgetPx) {
        break;
      }

      panelRows.push(row);
      usedPx += h;
      idx += 1;
    }

    return { panelRows, usedPx };
  };

  while (idx < rows.length) {
    const isFirstPage = pages.length === 0;
    const budgetPx = isFirstPage ? PAGE_1_PANEL_BUDGET_PX : NEXT_PAGE_PANEL_BUDGET_PX;

    const left = fillPanel(budgetPx);
    const right = fillPanel(budgetPx);

    const isDoneAfterRight = idx >= rows.length;
    const rightHasRoomForSignOff =
      isDoneAfterRight && right.usedPx + signOffHeightPx + 6 <= budgetPx;

    pages.push({
      leftRows: left.panelRows,
      rightRows: right.panelRows,
      rightHasRoomForSignOff,
    });
  }

  // If the last page's Right Panel had no spare vertical room for the sign-off block,
  // append one clean trailing page dedicated to the sign-off block so nothing clips.
  const lastPage = pages[pages.length - 1];
  if (lastPage && !lastPage.rightHasRoomForSignOff) {
    pages.push({
      leftRows: [],
      rightRows: [],
      rightHasRoomForSignOff: true,
    });
  }

  return pages;
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

  const staffAssignments: StoreStaffAssignment[] | undefined =
    meta?.staffAssignments && meta.staffAssignments.length > 0
      ? meta.staffAssignments
      : undefined;
  const primaryStaff = staffAssignments?.[0];
  const singleStaffName =
    primaryStaff?.staffName?.trim() || meta?.staffName?.trim() || defaultInspector;
  const singleSignature = primaryStaff?.signature?.trim() || meta?.signature?.trim() || '';
  const singleDate = primaryStaff?.checkedDate?.trim() || meta?.date?.trim() || defaultDate;

  const signOffHeightPx = estimateSignOffHeightPx(staffAssignments?.length ?? 1);
  const pages = paginateRowsTwoUp(mappedRows, signOffHeightPx);
  const totalPages = pages.length;

  return (
    <div>
      <style>{`@media print { @page { size: A4 landscape; margin: 4mm 5mm; } }`}</style>

      {/* Preview-only page count summary */}
      <div className="no-print mb-2 flex items-center justify-between text-[11px] text-slate-600 px-1">
        <span>
          Compact 2-Column A4 Landscape Layout —{' '}
          <strong className="text-slate-900">
            {totalPages} {totalPages === 1 ? 'page' : 'pages'}
          </strong>{' '}
          ({items.length} items)
        </span>
        <span className="font-mono text-slate-500">GH/NUR/2025-19</span>
      </div>

      <div className="space-y-5 print:space-y-0">
        {pages.map((page, pageIdx) => {
          const isFirstPage = pageIdx === 0;
          const isLastPage = pageIdx === totalPages - 1;

          return (
            <div
              key={`store-compact-page-${pageIdx}`}
              className="store-compact-page bg-white border border-slate-300 shadow-sm mx-auto w-[297mm] min-h-[210mm] p-[5mm] flex flex-col justify-between text-black appendix2-sans"
            >
              <div className="flex-1 flex flex-col">
                {/* Page 1 Full Header vs Compact Continuation Header */}
                {isFirstPage ? (
                  <div className="flex items-center justify-between gap-3 mb-[1.5mm] pb-[1mm] border-b border-black shrink-0">
                    <div className="shrink-0">
                      <img
                        src="/assets/store_header.jpg"
                        alt="Kingdom of Bahrain Government Hospitals"
                        className="h-[34px] w-auto object-contain"
                      />
                    </div>
                    <div className="text-center font-bold text-[13.5px] tracking-tight">
                      Monthly Store checklist
                    </div>
                    <table className="border-collapse border border-black text-[8.5px] min-w-[235px]">
                      <tbody>
                        <tr>
                          <td className="border border-black bg-[#d9d9d9] font-bold px-2 py-[2px] w-[42%]">
                            Ward
                          </td>
                          <td className="border border-black px-2 py-[2px] font-medium">
                            {displayWard}
                          </td>
                        </tr>
                        <tr>
                          <td className="border border-black bg-[#d9d9d9] font-bold px-2 py-[2px]">
                            Month &amp; Year
                          </td>
                          <td className="border border-black px-2 py-[2px] font-medium">
                            {displayMonthYear}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="flex items-center justify-between border-b border-black pb-[1mm] mb-[1.5mm] text-[8.5px] shrink-0">
                    <div>
                      <span className="font-bold">Monthly Store checklist</span>
                      <span className="mx-1.5">·</span>
                      <span>
                        <strong>Ward:</strong> {displayWard}
                      </span>
                      <span className="mx-1.5">·</span>
                      <span>
                        <strong>Month &amp; Year:</strong> {displayMonthYear}
                      </span>
                    </div>
                    <div className="font-semibold">GH/NUR/2025-19</div>
                  </div>
                )}

                {/* Dual-Panel Side-by-Side Store Tables */}
                <div className="grid grid-cols-2 gap-[3mm] items-start flex-1">
                  <StoreCompactPanelTable rows={page.leftRows} />
                  <div className="flex flex-col">
                    {page.rightRows.length > 0 && <StoreCompactPanelTable rows={page.rightRows} />}

                    {isLastPage && (
                      <div className={page.rightRows.length > 0 ? 'mt-[2mm]' : ''}>
                        <StoreCompactSignOff
                          staffAssignments={staffAssignments}
                          singleStaffName={singleStaffName}
                          singleSignature={singleSignature}
                          singleDate={singleDate}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Official Footer */}
              <div className="mt-[1.5mm] pt-[1mm] border-t border-black/40 flex items-center justify-between text-[8.5px] shrink-0">
                <span>GH/NUR/2025-19</span>
                <span>
                  Page {pageIdx + 1} of {totalPages}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StoreCompactPanelTable({ rows }: { rows: MonthlyStoreRow[] }) {
  if (rows.length === 0) return null;

  return (
    <table className="w-full border-collapse table-fixed text-[7.4px] leading-[1.12]">
      <thead>
        <tr>
          <th className="border border-black bg-[#9bc2e6] px-1 py-[2px] text-center font-bold w-[19%]">
            Stock No.
          </th>
          <th className="border border-black bg-[#9bc2e6] px-1 py-[2px] text-center font-bold w-[44%]">
            Item description
          </th>
          <th className="border border-black bg-[#9bc2e6] px-1 py-[2px] text-center font-bold w-[11%]">
            Qty Avail.
          </th>
          <th className="border border-black bg-[#9bc2e6] px-1 py-[2px] text-center font-bold w-[13%]">
            Exp. Date 1
          </th>
          <th className="border border-black bg-[#9bc2e6] px-1 py-[2px] text-center font-bold w-[13%]">
            Exp. Date 2
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) =>
          row.isCategoryHeader ? (
            <tr key={row.id}>
              <td
                colSpan={5}
                className="border border-black bg-black text-white px-1.5 py-[1.5px] text-center font-bold text-[7.5px] tracking-wide"
              >
                {row.description}
              </td>
            </tr>
          ) : (
            <tr key={row.id}>
              <td className="border border-black px-1 py-[1px] text-center text-[6.8px] break-words">
                {row.stockNo}
              </td>
              <td className="border border-black px-1 py-[1px] text-left text-[7.3px] break-words">
                {row.description}
              </td>
              <td className="border border-black px-1 py-[1px] text-center text-[7px] break-words">
                {row.qtyAvailable}
              </td>
              <td
                className={`border border-black px-0.5 py-[1px] text-center text-[6.8px] ${expiryHl(row.expiryDate1)}`}
              >
                {row.expiryDate1}
              </td>
              <td
                className={`border border-black px-0.5 py-[1px] text-center text-[6.8px] ${expiryHl(row.expiryDate2)}`}
              >
                {row.expiryDate2}
              </td>
            </tr>
          )
        )}
      </tbody>
    </table>
  );
}

function StoreCompactSignOff({
  staffAssignments,
  singleStaffName,
  singleSignature,
  singleDate,
}: {
  staffAssignments?: StoreStaffAssignment[];
  singleStaffName: string;
  singleSignature: string;
  singleDate: string;
}) {
  if (staffAssignments && staffAssignments.length > 1) {
    return (
      <table className="w-full border-collapse text-[8px]">
        <thead>
          <tr>
            <th className="border border-black bg-[#d9d9d9] font-bold px-1.5 py-[2px] text-left w-[42%]">
              Staff name
            </th>
            <th className="border border-black bg-[#d9d9d9] font-bold px-1.5 py-[2px] text-center w-[32%]">
              Signature
            </th>
            <th className="border border-black bg-[#d9d9d9] font-bold px-1.5 py-[2px] text-center w-[26%]">
              Date
            </th>
          </tr>
        </thead>
        <tbody>
          {staffAssignments.map((st) => (
            <tr key={st.id}>
              <td className="border border-black px-1.5 py-[2px]">{st.staffName}</td>
              <td className="border border-black px-1.5 py-[2px] text-center">{st.signature}</td>
              <td className="border border-black px-1.5 py-[2px] text-center">{st.checkedDate}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  return (
    <table className="w-[74%] ml-auto border-collapse text-[8px]">
      <tbody>
        <tr>
          <td className="border border-black bg-[#d9d9d9] font-bold px-2 py-[2.5px] w-[36%]">
            Staff name
          </td>
          <td className="border border-black px-2 py-[2.5px]">{singleStaffName}</td>
        </tr>
        <tr>
          <td className="border border-black bg-[#d9d9d9] font-bold px-2 py-[2.5px]">
            Signature
          </td>
          <td className="border border-black px-2 py-[2.5px]">{singleSignature}</td>
        </tr>
        <tr>
          <td className="border border-black bg-[#d9d9d9] font-bold px-2 py-[2.5px]">
            Date
          </td>
          <td className="border border-black px-2 py-[2.5px]">{singleDate}</td>
        </tr>
      </tbody>
    </table>
  );
}
