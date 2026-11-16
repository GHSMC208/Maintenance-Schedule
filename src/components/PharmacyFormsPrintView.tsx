import type {
  CadChecklistForm,
  MonthlyStoreChecklistForm,
  PharmacyRequestForm,
  WeeklyStockChecklistForm,
} from '../types/ward';
import { getCrashCartSlotExpirySeverity, getTodayIso } from '../utils/dateUtils';

function expiryHl(val: string): string {
  const sev = getCrashCartSlotExpirySeverity(val, getTodayIso());
  if (sev === 'expired') return 'bg-[#fecaca] text-[#7f1d1d] font-bold';
  if (sev === 'near-3m') return 'bg-[#fef08a] text-black font-bold';
  return '';
}

export const CAD_ROWS_PER_PAGE = 22;
export const WEEKLY_ROWS_PER_PAGE = 14;
export const MONTHLY_STORE_ROWS_PER_PAGE = 19;
export const REQUEST_ROWS_PER_PAGE = 12;

function chunkRows<T>(items: T[], size: number): T[][] {
  if (items.length === 0) return [[]];
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

export function CadPrintPage({ form }: { form: CadChecklistForm }) {
  const pages = chunkRows(form.rows, CAD_ROWS_PER_PAGE);
  const totalPages = pages.length;

  return (
    <div className="space-y-6 print:space-y-0">
      {pages.map((pageRows, pageIdx) => (
        <div
          key={`cad-page-${pageIdx}`}
          className="pharmacy-page-landscape bg-white border border-slate-300 shadow-sm mx-auto w-[297mm] min-h-[210mm] p-[8mm] flex flex-col justify-between text-black appendix2-sans"
        >
          <div className="flex-1 flex flex-col">
            {/* Top Header */}
            <div className="flex items-start justify-between mb-1.5">
              <div className="text-[11px] font-bold leading-relaxed min-w-[180px]">
                <div>
                  Unit: <span className="font-normal ml-1">{form.unit}</span>
                </div>
                <div>
                  Month: <span className="font-normal ml-1">{form.month}</span>
                </div>
              </div>

              <div className="text-[16px] font-bold tracking-tight pt-2">CAD Checklist</div>

              <div className="shrink-0">
                <img
                  src="/assets/cad_badge.png"
                  alt="Government Hospitals"
                  className="h-[52px] w-auto object-contain"
                />
              </div>
            </div>

            {/* Main CAD Table */}
            <table className="w-full border-collapse border-2 border-black flex-1 text-[9.5px]">
              <thead>
                <tr>
                  <th
                    rowSpan={2}
                    className="border border-black border-r-2 px-2 py-1 text-center font-bold w-[155px] text-[11px]"
                  >
                    Drug
                  </th>
                  <th className="border border-black border-r-2 px-1.5 py-1 text-center font-bold w-[82px] text-[10px]">
                    Date
                  </th>
                  {form.dayDates.map((d, idx) => (
                    <th
                      key={`day-hdr-${idx}`}
                      colSpan={3}
                      className="border border-black border-r-2 px-1 py-1 text-center font-semibold text-[9px]"
                    >
                      {d}
                    </th>
                  ))}
                </tr>
                <tr>
                  <th className="border border-black border-r-2 px-1.5 py-1 text-center font-bold text-[10px]">
                    Expiry date
                  </th>
                  {Array.from({ length: 7 }).map((_, dayIdx) => (
                    <FragmentShiftHeaders key={`sh-${dayIdx}`} />
                  ))}
                </tr>
              </thead>
              <tbody>
                {pageRows.map((row) => (
                  <tr key={row.id}>
                    <td className="border border-black border-r-2 px-1.5 py-[2px] font-bold text-[9.5px] whitespace-nowrap">
                      {row.drugName}
                    </td>
                    <td
                      className={`border border-black border-r-2 px-1 py-[2px] text-center text-[9px] ${expiryHl(row.expiryDate)}`}
                    >
                      {row.expiryDate}
                    </td>
                    {row.shifts.map((val, sIdx) => {
                      const isBlockEnd = (sIdx + 1) % 3 === 0;
                      return (
                        <td
                          key={`${row.id}-s-${sIdx}`}
                          className={`border border-black ${isBlockEnd ? 'border-r-2 ' : ''}px-0.5 py-[2px] text-center text-[8.5px] min-w-[22px]`}
                        >
                          {val}
                        </td>
                      );
                    })}
                  </tr>
                ))}

                {/* TL Signoff Rows */}
                <tr>
                  <td className="border border-black border-t-2 border-r-2 px-1.5 py-1 font-bold text-[9px] whitespace-nowrap">
                    Title &amp; Sign of current shift TL
                  </td>
                  <td className="border border-black border-t-2 border-r-2 px-1 py-1" />
                  {form.currentShiftTl.map((val, idx) => {
                    const isBlockEnd = (idx + 1) % 3 === 0;
                    return (
                      <td
                        key={`ctl-${idx}`}
                        className={`border border-black border-t-2 ${isBlockEnd ? 'border-r-2 ' : ''}px-0.5 py-1 text-center text-[8px]`}
                      >
                        {val}
                      </td>
                    );
                  })}
                </tr>
                <tr>
                  <td className="border border-black border-r-2 px-1.5 py-1 font-bold text-[9px] whitespace-nowrap">
                    Title &amp; Sign of previous shift TL
                  </td>
                  <td className="border border-black border-r-2 px-1 py-1" />
                  {form.previousShiftTl.map((val, idx) => {
                    const isBlockEnd = (idx + 1) % 3 === 0;
                    return (
                      <td
                        key={`ptl-${idx}`}
                        className={`border border-black ${isBlockEnd ? 'border-r-2 ' : ''}px-0.5 py-1 text-center text-[8px]`}
                      >
                        {val}
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>

          <div className="mt-1.5 flex items-center justify-between text-[10.5px] font-normal">
            <span>GH/NUR/2025-15</span>
            {totalPages > 1 && (
              <span>
                Page {pageIdx + 1} of {totalPages}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function FragmentShiftHeaders() {
  return (
    <>
      <th className="border border-black px-1 py-0.5 text-center font-bold text-[9.5px]">M</th>
      <th className="border border-black px-1 py-0.5 text-center font-bold text-[9.5px]">E</th>
      <th className="border border-black border-r-2 px-1 py-0.5 text-center font-bold text-[9.5px]">
        N
      </th>
    </>
  );
}

export function WeeklyStockPrintPage({ form }: { form: WeeklyStockChecklistForm }) {
  const pages = chunkRows(form.rows, WEEKLY_ROWS_PER_PAGE);
  const totalPages = pages.length;

  return (
    <div className="space-y-6 print:space-y-0">
      {pages.map((pageRows, pageIdx) => (
        <div
          key={`weekly-page-${pageIdx}`}
          className="pharmacy-page-landscape bg-white border border-slate-300 shadow-sm mx-auto w-[297mm] min-h-[210mm] p-[9mm] flex flex-col justify-between text-black appendix2-sans"
        >
          <div className="flex-1 flex flex-col">
            {/* Top Centered Gov Hospitals Header */}
            <div className="flex justify-center mb-2 shrink-0">
              <img
                src="/assets/gov_hospitals_header.png"
                alt="Government Hospitals"
                className="h-[52px] w-auto object-contain"
              />
            </div>

            {/* Main Landscape Checklist Table */}
            <table className="w-full border-collapse border border-black flex-1 text-[10px]">
              <thead>
                <tr>
                  <th
                    colSpan={13}
                    className="border border-black bg-[#dce6f2] py-1.5 px-2 text-center font-bold text-[13px]"
                  >
                    {form.title}
                  </th>
                </tr>
                <tr>
                  <td colSpan={6} className="border border-black px-2 py-1 text-[10.5px] font-bold">
                    Location: <span className="font-normal ml-1">{form.location}</span>
                  </td>
                  <td colSpan={7} className="border border-black px-2 py-1 text-[10.5px] font-bold">
                    Month: <span className="font-normal ml-1">{form.month}</span>
                  </td>
                </tr>
                <tr>
                  <th
                    rowSpan={2}
                    className="border border-black px-1 py-1 text-center font-bold w-[42px]"
                  >
                    SL No.
                  </th>
                  <th
                    rowSpan={2}
                    className="border border-black px-2 py-1 text-center font-bold min-w-[190px]"
                  >
                    Medication Name
                  </th>
                  <th
                    rowSpan={2}
                    className="border border-black px-1.5 py-1 text-center font-bold w-[72px] leading-tight"
                  >
                    Ward Quantity
                  </th>
                  {form.weekDates.map((wd, idx) => (
                    <th
                      key={`wk-d-${idx}`}
                      colSpan={2}
                      className="border border-black px-1.5 py-1 text-left font-bold text-[9.5px]"
                    >
                      Date: <span className="font-normal ml-1">{wd}</span>
                    </th>
                  ))}
                </tr>
                <tr>
                  {Array.from({ length: 5 }).map((_, idx) => (
                    <WeeklySubHeaders key={`sub-${idx}`} />
                  ))}
                </tr>
              </thead>
              <tbody>
                {pageRows.map((row) => (
                  <tr key={row.id}>
                    <td className="border border-black px-1 py-1 text-center text-[9.5px]">
                      {row.slNo}
                    </td>
                    <td className="border border-black px-2 py-1 text-left text-[9.5px]">
                      {row.medicationName}
                    </td>
                    <td className="border border-black px-1 py-1 text-center text-[9.5px]">
                      {row.wardQuantity}
                    </td>
                    {row.checks.map((chk, cIdx) => (
                      <WeeklyCheckCells
                        key={`${row.id}-c-${cIdx}`}
                        qty={chk.qty}
                        expDate={chk.expDate}
                      />
                    ))}
                  </tr>
                ))}

                {/* Bottom Staff Signature Row */}
                <tr>
                  <td colSpan={3} className="border border-black px-2 py-1.5 font-bold text-[10px]">
                    Staff Signature:
                  </td>
                  {form.staffSignatures.map((sig, idx) => (
                    <td
                      key={`sig-${idx}`}
                      colSpan={2}
                      className="border border-black px-1.5 py-1.5 text-center text-[9px]"
                    >
                      {sig}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>

          {/* Official Footer */}
          <div className="mt-2.5 flex items-center justify-between text-[11px] shrink-0">
            <div>{form.formCode}</div>
            <div className="text-[10.5px]">
              Stock checking is to be conducted on a weekly basis.
              {totalPages > 1 ? ` · Page ${pageIdx + 1} of ${totalPages}` : ''}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function WeeklySubHeaders() {
  return (
    <>
      <th className="border border-black px-1 py-1 text-center font-bold w-[42px] text-[9.5px]">
        Qty
      </th>
      <th className="border border-black px-1 py-1 text-center font-bold w-[72px] text-[9.5px]">
        Exp Date
      </th>
    </>
  );
}

function WeeklyCheckCells({ qty, expDate }: { qty: string; expDate: string }) {
  return (
    <>
      <td className="border border-black px-1 py-1 text-center text-[9.5px]">{qty}</td>
      <td className={`border border-black px-1 py-1 text-center text-[9px] ${expiryHl(expDate)}`}>
        {expDate}
      </td>
    </>
  );
}

export function MonthlyStorePrintPage({ form }: { form: MonthlyStoreChecklistForm }) {
  const pages = chunkRows(form.rows, MONTHLY_STORE_ROWS_PER_PAGE);
  const totalPages = pages.length;

  return (
    <div className="space-y-6 print:space-y-0">
      {pages.map((pageRows, pageIdx) => {
        const isLastPage = pageIdx === totalPages - 1;
        return (
          <div
            key={`ms-page-${pageIdx}`}
            className="pharmacy-page-portrait bg-white border border-slate-300 shadow-sm mx-auto w-[210mm] min-h-[297mm] p-[12mm] flex flex-col justify-between text-black appendix2-sans"
          >
            <div className="flex-1 flex flex-col">
              {/* Top Official Store Header Banner */}
              <div className="flex justify-center mb-3 shrink-0">
                <img
                  src="/assets/store_header.jpg"
                  alt="Kingdom of Bahrain Government Hospitals"
                  className="w-full max-w-[490px] h-auto object-contain"
                />
              </div>

              {/* Centered Title */}
              <div className="text-center font-bold text-[15px] mb-3 shrink-0">
                Monthly Store checklist
              </div>

              {/* Ward & Month/Year Box */}
              <table className="w-[56%] border-collapse border border-black mb-4 text-[11px] shrink-0">
                <tbody>
                  <tr>
                    <td className="border border-black bg-[#d9d9d9] font-bold px-2.5 py-1.5 w-[40%]">
                      Ward
                    </td>
                    <td className="border border-black px-2.5 py-1.5">{form.ward}</td>
                  </tr>
                  <tr>
                    <td className="border border-black bg-[#d9d9d9] font-bold px-2.5 py-1.5">
                      Month &amp; Year
                    </td>
                    <td className="border border-black px-2.5 py-1.5">{form.monthYear}</td>
                  </tr>
                </tbody>
              </table>

              {/* Main Monthly Store Table + Attached Sign-off Block */}
              <table className="w-full border-collapse text-[10.5px] flex-1">
                <thead>
                  <tr>
                    <th className="border border-black bg-[#9bc2e6] px-2 py-2 text-center font-bold w-[16%]">
                      Stock No.
                    </th>
                    <th className="border border-black bg-[#9bc2e6] px-2 py-2 text-center font-bold w-[34%]">
                      Item description
                    </th>
                    <th className="border border-black bg-[#9bc2e6] px-2 py-2 text-center font-bold w-[16%] leading-tight">
                      Quantity available
                    </th>
                    <th className="border border-black bg-[#9bc2e6] px-2 py-2 text-center font-bold w-[17%]">
                      Expiry Date 1
                    </th>
                    <th className="border border-black bg-[#9bc2e6] px-2 py-2 text-center font-bold w-[17%]">
                      Expiry Date 2
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((row) => (
                    <tr key={row.id}>
                      <td className="border border-black px-2 py-1 text-center text-[10px]">
                        {row.stockNo}
                      </td>
                      <td className="border border-black px-2 py-1 text-left text-[10px]">
                        {row.description}
                      </td>
                      <td className="border border-black px-2 py-1 text-center text-[10px]">
                        {row.qtyAvailable}
                      </td>
                      <td
                        className={`border border-black px-2 py-1 text-center text-[10px] ${expiryHl(row.expiryDate1)}`}
                      >
                        {row.expiryDate1}
                      </td>
                      <td
                        className={`border border-black px-2 py-1 text-center text-[10px] ${expiryHl(row.expiryDate2)}`}
                      >
                        {row.expiryDate2}
                      </td>
                    </tr>
                  ))}

                  {/* Attached Right-Aligned Sign-Off Rows on Final Page */}
                  {isLastPage && (
                    <>
                      <tr>
                        <td colSpan={2} className="border-0" />
                        <td className="border border-black bg-[#d9d9d9] font-bold px-2.5 py-2">
                          Staff name
                        </td>
                        <td colSpan={2} className="border border-black px-2.5 py-2">
                          {form.staffName}
                        </td>
                      </tr>
                      <tr>
                        <td colSpan={2} className="border-0" />
                        <td className="border border-black bg-[#d9d9d9] font-bold px-2.5 py-2">
                          Signature
                        </td>
                        <td colSpan={2} className="border border-black px-2.5 py-2">
                          {form.signature}
                        </td>
                      </tr>
                      <tr>
                        <td colSpan={2} className="border-0" />
                        <td className="border border-black bg-[#d9d9d9] font-bold px-2.5 py-2">
                          Date
                        </td>
                        <td colSpan={2} className="border border-black px-2.5 py-2">
                          {form.date}
                        </td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex items-center justify-between text-[11px] shrink-0">
              <span>{form.formCode}</span>
              {totalPages > 1 && (
                <span>
                  Page {pageIdx + 1} of {totalPages}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function PharmacyRequestPrintPage({ form }: { form: PharmacyRequestForm }) {
  const pages = chunkRows(form.rows, REQUEST_ROWS_PER_PAGE);
  const totalPages = pages.length;

  return (
    <div className="space-y-6 print:space-y-0">
      {pages.map((rawPageRows, pageIdx) => {
        const paddedRows = Array.from({ length: REQUEST_ROWS_PER_PAGE }, (_, idx) => {
          return (
            rawPageRows[idx] ?? {
              id: `pad-${pageIdx}-${idx}`,
              itemCode: '',
              description: '',
              uom: '',
              reqQty: '',
              suppliedQty: '',
              lotNo: '',
              expiryDate: '',
            }
          );
        });

        return (
          <div
            key={`req-page-${pageIdx}`}
            className="pharmacy-page-landscape bg-white border border-slate-300 shadow-sm mx-auto w-[297mm] min-h-[210mm] p-[8mm] flex flex-col justify-between text-black appendix2-sheet"
          >
            <div className="flex-1 flex flex-col">
              {/* Top Official Government Hospitals Header */}
              <div className="flex flex-col items-center mb-1 shrink-0">
                <img
                  src="/assets/store_header.jpg"
                  alt="Kingdom of Bahrain Government Hospitals"
                  className="h-[46px] w-auto object-contain"
                />
                <div className="text-[13px] font-bold mt-1">
                  Material Request Form - Pharmacy
                </div>
              </div>

              {/* Unified Thick-Bordered Request Form Box */}
              <div className="border-[1.5px] border-black flex-1 flex flex-col">
                {/* Requester Details Banner */}
                <div className="bg-[#d9d9d9] border-b border-black text-center font-bold text-[10.5px] py-[2px]">
                  Requester Details
                </div>

                {/* Requester Row 1: Request Date | Location | Cost Center | Contact # */}
                <div className="grid grid-cols-[13%_42%_20%_25%] border-b border-black text-[10px]">
                  <div className="border-r border-black px-1.5 py-1 flex flex-col items-center min-h-[34px]">
                    <div className="font-bold">Request Date</div>
                    <div className="mt-0.5 text-center">{form.requestDate}</div>
                  </div>
                  <div className="border-r border-black px-1.5 py-1 flex flex-col items-center min-h-[34px]">
                    <div className="font-bold">Location</div>
                    <div className="mt-0.5 text-center">{form.requesterLocation}</div>
                  </div>
                  <div className="border-r border-black px-1.5 py-1 flex flex-col items-center min-h-[34px]">
                    <div className="font-bold">Cost Center</div>
                    <div className="mt-0.5 text-center">{form.requesterCostCenter}</div>
                  </div>
                  <div className="px-1.5 py-1 flex flex-col items-center min-h-[34px]">
                    <div className="font-bold">Contact #</div>
                    <div className="mt-0.5 text-center">{form.contactNo}</div>
                  </div>
                </div>

                {/* Requester Row 2: Requester Name | CPR | Signature */}
                <div className="grid grid-cols-[55%_17%_28%] border-b border-black text-[10px]">
                  <div className="border-r border-black px-1.5 py-1 min-h-[36px]">
                    <div className="font-bold">Requester Name</div>
                    <div className="mt-0.5">{form.requesterName}</div>
                  </div>
                  <div className="border-r border-black px-1.5 py-1 flex flex-col items-center min-h-[36px]">
                    <div className="font-bold">CPR</div>
                    <div className="mt-0.5 text-center">{form.requesterCpr}</div>
                  </div>
                  <div className="px-1.5 py-1 flex flex-col items-center min-h-[36px]">
                    <div className="font-bold">Signature</div>
                    <div className="mt-0.5 text-center">{form.requesterSignature}</div>
                  </div>
                </div>

                {/* Remarks/Justification */}
                <div className="border-b border-black px-1.5 py-1 min-h-[26px] text-[10px]">
                  <span className="font-bold">Remarks/Justification</span>
                  {form.remarks && <span className="ml-2 font-normal">{form.remarks}</span>}
                </div>

                {/* Items Table */}
                <table className="w-full border-collapse flex-1 text-[10px]">
                  <thead>
                    <tr>
                      <th
                        colSpan={5}
                        className="bg-[#d9d9d9] border-b border-r border-black py-[2px] text-center font-bold text-[10.5px]"
                      >
                        Details to be Filled by Requester
                      </th>
                      <th
                        colSpan={3}
                        className="bg-[#d9d9d9] border-b border-black py-[2px] text-center font-bold text-[10.5px]"
                      >
                        To be Filled by Supplier
                      </th>
                    </tr>
                    <tr>
                      <th className="border-b border-r border-black px-1 py-[3px] text-center font-bold w-[2.5%]">
                        #
                      </th>
                      <th className="border-b border-r border-black px-1 py-[3px] text-center font-bold w-[10.5%]">
                        Item Code
                      </th>
                      <th className="border-b border-r border-black px-1.5 py-[3px] text-center font-bold w-[34%]">
                        Item Description
                      </th>
                      <th className="border-b border-r border-black px-1 py-[3px] text-center font-bold w-[8%]">
                        UoM
                      </th>
                      <th className="border-b border-r border-black px-1 py-[3px] text-center font-bold w-[8.5%]">
                        Req. Qty.
                      </th>
                      <th className="border-b border-r border-black px-1 py-[3px] text-center font-bold w-[11%]">
                        Supplied Qty.
                      </th>
                      <th className="border-b border-r border-black px-1 py-[3px] text-center font-bold w-[12.5%]">
                        Lot #
                      </th>
                      <th className="border-b border-black px-1 py-[3px] text-center font-bold w-[13%]">
                        Expiry Date
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {paddedRows.map((row, idx) => {
                      const rowNum = pageIdx * REQUEST_ROWS_PER_PAGE + idx + 1;
                      return (
                        <tr key={row.id}>
                          <td className="border-b border-r border-black px-1 py-[2.5px] text-center text-[10px]">
                            {rowNum}
                          </td>
                          <td className="border-b border-r border-black px-1 py-[2.5px] text-center text-[9.5px] font-mono">
                            {row.itemCode}
                          </td>
                          <td className="border-b border-r border-black bg-[#fff2cc] px-1.5 py-[2.5px] text-left text-[9.5px]">
                            {row.description}
                          </td>
                          <td className="border-b border-r border-black px-1 py-[2.5px] text-center text-[9.5px]">
                            {row.uom}
                          </td>
                          <td className="border-b border-r border-black px-1 py-[2.5px] text-center text-[9.5px]">
                            {row.reqQty}
                          </td>
                          <td className="border-b border-r border-black px-1 py-[2.5px] text-center text-[9.5px]">
                            {row.suppliedQty}
                          </td>
                          <td className="border-b border-r border-black px-1 py-[2.5px] text-center text-[9.5px]">
                            {row.lotNo}
                          </td>
                          <td
                            className={`border-b border-black px-1 py-[2.5px] text-center text-[9.5px] ${expiryHl(row.expiryDate)}`}
                          >
                            {row.expiryDate}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* Preparer Details Banner */}
                <div className="bg-[#d9d9d9] border-b border-black text-center font-bold text-[10.5px] py-[2px]">
                  Preparer Details
                </div>
                <div className="grid grid-cols-[13%_31%_11%_18%_14%_13%] border-b border-black text-[10px]">
                  <div className="border-r border-black px-1 py-1 flex flex-col items-center min-h-[38px]">
                    <div className="font-bold text-center leading-tight">
                      Prepared from Location
                    </div>
                    <div className="mt-0.5 text-center">{form.preparedFromLocation}</div>
                  </div>
                  <div className="border-r border-black px-1 py-1 flex flex-col items-center min-h-[38px]">
                    <div className="font-bold text-center">Cost Center</div>
                    <div className="mt-0.5 text-center">{form.preparerCostCenter}</div>
                  </div>
                  <div className="border-r border-black px-1 py-1 flex flex-col items-center min-h-[38px]">
                    <div className="font-bold text-center leading-tight">Preparation Date</div>
                    <div className="mt-0.5 text-center">{form.preparationDate}</div>
                  </div>
                  <div className="border-r border-black px-1 py-1 flex flex-col items-center min-h-[38px]">
                    <div className="font-bold text-center">Prepared by</div>
                    <div className="mt-0.5 text-center">{form.preparedBy}</div>
                  </div>
                  <div className="border-r border-black px-1 py-1 flex flex-col items-center min-h-[38px]">
                    <div className="font-bold text-center">Preparer&apos;s CPR #</div>
                    <div className="mt-0.5 text-center">{form.preparerCpr}</div>
                  </div>
                  <div className="px-1 py-1 flex flex-col items-center min-h-[38px]">
                    <div className="font-bold text-center">Preparer&apos;s Sign</div>
                    <div className="mt-0.5 text-center">{form.preparerSign}</div>
                  </div>
                </div>

                {/* Receiver Details Banner */}
                <div className="bg-[#d9d9d9] border-b border-black text-center font-bold text-[10.5px] py-[2px]">
                  Receiver Details
                </div>
                <div className="grid grid-cols-[13%_31%_29%_14%_13%] text-[10px]">
                  <div className="border-r border-black px-1 py-1 flex flex-col items-center min-h-[34px]">
                    <div className="font-bold text-center">Receiving Date</div>
                    <div className="mt-0.5 text-center">{form.receivingDate}</div>
                  </div>
                  <div className="border-r border-black px-1 py-1 flex flex-col items-center min-h-[34px]">
                    <div className="font-bold text-center">Location</div>
                    <div className="mt-0.5 text-center">{form.receiverLocation}</div>
                  </div>
                  <div className="border-r border-black px-1 py-1 flex flex-col items-center min-h-[34px]">
                    <div className="font-bold text-center">Received by (Full Name)</div>
                    <div className="mt-0.5 text-center">{form.receivedBy}</div>
                  </div>
                  <div className="border-r border-black px-1 py-1 flex flex-col items-center min-h-[34px]">
                    <div className="font-bold text-center">Receiver&apos;s CPR #</div>
                    <div className="mt-0.5 text-center">{form.receiverCpr}</div>
                  </div>
                  <div className="px-1 py-1 flex flex-col items-center min-h-[34px]">
                    <div className="font-bold text-center">Receiver&apos;s Sign.</div>
                    <div className="mt-0.5 text-center">{form.receiverSign}</div>
                  </div>
                </div>
              </div>
            </div>

            {totalPages > 1 && (
              <div className="mt-1 text-right text-[10px] shrink-0">
                Page {pageIdx + 1} of {totalPages}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
