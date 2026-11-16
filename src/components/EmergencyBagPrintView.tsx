import type { InventoryItem, TransferBagChecklistMeta } from '../types/ward';
import { getTodayIso } from '../utils/dateUtils';

export const EMERGENCY_BAG_ROWS_PER_PAGE = 28;

interface EmergencyBagPrintViewProps {
  items: InventoryItem[];
  meta?: TransferBagChecklistMeta;
  defaultInspector: string;
}

function formatSlashDate(iso: string | null): string {
  if (!iso) return '';
  const parts = iso.split('-');
  if (parts.length !== 3) return iso;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

export function EmergencyBagPrintView({
  items,
  meta,
  defaultInspector,
}: EmergencyBagPrintViewProps) {
  const today = getTodayIso();
  const [y, m, d] = today.split('-');
  const defaultDate = `${d}/${m}/${y}`;
  const defaultMonth = new Date(Number(y), Math.max(0, Number(m) - 1), Number(d)).toLocaleDateString(
    'en-US',
    { month: 'long' }
  );

  const rawWard = meta?.wardNumber?.trim() || '';
  const bannerTitle = !rawWard
    ? 'Emergency Bag Checklist \u2013 Ward'
    : rawWard.toLowerCase().startsWith('ward')
      ? `Emergency Bag Checklist \u2013 ${rawWard}`
      : `Emergency Bag Checklist \u2013 Ward ${rawWard}`;

  const displayMonth = meta?.month?.trim() || defaultMonth;
  const displayYear = meta?.year?.trim() || y;
  const displayCheckedBy = meta?.checkedBy?.trim() || defaultInspector;
  const displayDate = meta?.date?.trim() || defaultDate;

  const pages: InventoryItem[][] = [];
  if (items.length === 0) {
    pages.push([]);
  } else {
    for (let i = 0; i < items.length; i += EMERGENCY_BAG_ROWS_PER_PAGE) {
      pages.push(items.slice(i, i + EMERGENCY_BAG_ROWS_PER_PAGE));
    }
  }

  return (
    <div className="space-y-6 print:space-y-0">
      <style>{`@media print { @page { size: A4 portrait; margin: 6mm 8mm; } }`}</style>

      {pages.map((pageItems, pageIdx) => {
        const isLastPage = pageIdx === pages.length - 1;
        const paddedRows: (InventoryItem | null)[] =
          pageIdx === 0 && pageItems.length < EMERGENCY_BAG_ROWS_PER_PAGE
            ? [
                ...pageItems,
                ...Array.from(
                  { length: EMERGENCY_BAG_ROWS_PER_PAGE - pageItems.length },
                  () => null
                ),
              ]
            : pageItems;

        return (
          <div
            key={`eb-page-${pageIdx}`}
            className="pharmacy-page-portrait bg-white border border-slate-300 shadow-sm mx-auto w-[210mm] min-h-[297mm] p-[10mm_14mm] flex flex-col justify-between text-black appendix2-sheet"
          >
            <div>
              {/* Official Kingdom of Bahrain Government Hospitals Header */}
              <div className="flex flex-col items-center mb-2">
                <img
                  src="/assets/store_header.jpg"
                  alt="Kingdom of Bahrain Government Hospitals"
                  className="h-[58px] w-auto object-contain"
                />
              </div>

              {/* Slate-Gray Banner + Month/Year + Checked By/Date Block */}
              <div className="w-full">
                <div className="bg-[#a8b1bf] text-center font-bold text-[17.5px] py-[4px] leading-tight text-black">
                  {bannerTitle}
                </div>

                <div className="bg-[#d6d9e0] grid grid-cols-[68%_32%] px-2 py-[2.5px] text-[12px] text-black">
                  <div>
                    <span className="font-bold">Month:</span>
                    <span className="ml-2 font-normal">{displayMonth}</span>
                  </div>
                  <div>
                    <span className="font-bold">Year:</span>
                    <span className="ml-2 font-normal">{displayYear}</span>
                  </div>
                </div>

                <div className="bg-white grid grid-cols-[68%_32%] px-2 py-[3px] text-[12px] text-black mb-1.5">
                  <div>
                    <span className="font-bold">Checked By:</span>
                    <span className="ml-2 font-normal">{displayCheckedBy}</span>
                  </div>
                  <div>
                    <span className="font-bold">Date:</span>
                    <span className="ml-2 font-normal">{displayDate}</span>
                  </div>
                </div>
              </div>

              {/* Official 28-Item Striped Blue Checklist Table */}
              <table className="w-full border-collapse text-[12px] text-black">
                <thead>
                  <tr className="bg-[#4472c4] text-white font-bold text-[13px]">
                    <th
                      colSpan={2}
                      className="border border-[#8ea9db] py-[4px] px-2 text-center w-[62%]"
                    >
                      Item
                    </th>
                    <th className="border border-[#8ea9db] py-[4px] px-2 text-center w-[13%]">
                      Quantity
                    </th>
                    <th className="border border-[#8ea9db] py-[4px] px-2 text-center w-[25%]">
                      Expire Date
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paddedRows.map((item, idx) => {
                    const rowNumber = pageIdx * EMERGENCY_BAG_ROWS_PER_PAGE + idx + 1;
                    const rowBg = idx % 2 === 0 ? 'bg-[#d9e1f2]' : 'bg-white';
                    return (
                      <tr key={item ? item.id : `eb-pad-${pageIdx}-${idx}`} className={rowBg}>
                        <td className="border border-[#8ea9db] py-[2.5px] px-1.5 text-center w-[8%]">
                          {rowNumber}.
                        </td>
                        <td className="border border-[#8ea9db] py-[2.5px] px-2 text-left w-[54%]">
                          {item ? item.name : ''}
                        </td>
                        <td className="border border-[#8ea9db] py-[2.5px] px-2 text-center tabular-nums w-[13%]">
                          {item ? item.quantity : ''}
                        </td>
                        <td className="border border-[#8ea9db] py-[2.5px] px-2 text-center tabular-nums w-[25%]">
                          {item ? formatSlashDate(item.expiryDate) : ''}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Required Monthly & Post-Use Lock Note */}
              {isLastPage && (
                <div className="mt-3.5 pl-4 text-[13px] appendix2-sans text-black">
                  <span className="text-[#c00000] font-bold">*</span>
                  <span>
                    The Checklist must be checked and locked Monthly and Post each use.
                  </span>
                </div>
              )}
            </div>

            {pages.length > 1 && (
              <div className="mt-2 text-right text-[10.5px] text-slate-600 shrink-0">
                Page {pageIdx + 1} of {pages.length}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
