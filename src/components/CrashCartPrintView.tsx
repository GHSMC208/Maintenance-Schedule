import type { CrashCartChecklist, CrashCartItemRow } from '../types/ward';
import {
  getCrashCartSlotExpirySeverity,
  parseCrashCartReferenceDate,
} from '../utils/dateUtils';

interface CrashCartPrintViewProps {
  cart: CrashCartChecklist;
}

function OfficialHeader() {
  return (
    <div className="mb-1.5 flex items-center justify-center">
      <img
        src="/assets/gov_hospitals_header.png"
        alt="Government Hospitals"
        className="h-[46px] w-auto object-contain"
      />
    </div>
  );
}

function slotHighlightClass(slotValue: string, refDate: string): string {
  const sev = getCrashCartSlotExpirySeverity(slotValue, refDate);
  if (sev === 'expired') {
    return 'bg-[#fecaca] text-[#7f1d1d] font-bold';
  }
  if (sev === 'near-3m') {
    return 'bg-[#fef08a] text-black font-bold';
  }
  return '';
}

function renderExpiryGrid(item: CrashCartItemRow, refDate: string) {
  if (item.cellLayout === 'single') {
    const hl = slotHighlightClass(item.slots[0] || '', refDate);
    return (
      <div
        className={`px-1.5 py-0.5 text-[9.5px] leading-tight text-center min-h-[17px] flex items-center justify-center ${hl}`}
      >
        {item.slots[0] || ''}
      </div>
    );
  }

  if (item.cellLayout === 'pair') {
    const hl0 = slotHighlightClass(item.slots[0] || '', refDate);
    const hl1 = slotHighlightClass(item.slots[1] || '', refDate);
    return (
      <div className="grid grid-cols-12 h-full min-h-[17px]">
        <div
          className={`col-span-9 border-r border-black px-1.5 py-0.5 text-[9.5px] leading-tight text-center flex items-center justify-center ${hl0}`}
        >
          {item.slots[0] || ''}
        </div>
        <div
          className={`col-span-3 px-1 py-0.5 text-[9.5px] leading-tight text-center flex items-center justify-center ${hl1}`}
        >
          {item.slots[1] || ''}
        </div>
      </div>
    );
  }

  if (item.cellLayout === 'triple') {
    return (
      <div className="grid grid-cols-3 h-full min-h-[17px]">
        {[0, 1, 2].map((idx) => (
          <div
            key={idx}
            className={`${idx < 2 ? 'border-r border-black ' : ''}px-1 py-0.5 text-[9px] leading-tight text-center flex items-center justify-center ${slotHighlightClass(item.slots[idx] || '', refDate)}`}
          >
            {item.slots[idx] || ''}
          </div>
        ))}
      </div>
    );
  }

  if (item.cellLayout === 'split-2x2') {
    return (
      <div className="grid grid-cols-2">
        {[0, 1, 2, 3].map((idx) => {
          const borderRight = idx % 2 === 0 ? 'border-r border-black ' : '';
          const borderBottom = idx < 2 ? 'border-b border-black ' : '';
          return (
            <div
              key={idx}
              className={`${borderRight}${borderBottom}px-1 py-0.5 text-[9px] leading-tight text-center min-h-[16px] flex items-center justify-center ${slotHighlightClass(item.slots[idx] || '', refDate)}`}
            >
              {item.slots[idx] || ''}
            </div>
          );
        })}
      </div>
    );
  }

  // split-2x3
  return (
    <div className="grid grid-cols-3">
      {[0, 1, 2, 3, 4, 5].map((idx) => {
        const borderRight = idx % 3 < 2 ? 'border-r border-black ' : '';
        const borderBottom = idx < 3 ? 'border-b border-black ' : '';
        return (
          <div
            key={idx}
            className={`${borderRight}${borderBottom}px-1 py-0.5 text-[8.5px] leading-tight text-center min-h-[16px] flex items-center justify-center ${slotHighlightClass(item.slots[idx] || '', refDate)}`}
          >
            {item.slots[idx] || ''}
          </div>
        );
      })}
    </div>
  );
}

function renderPage23ExpiryGrid(item: CrashCartItemRow, refDate: string) {
  if (item.cellLayout === 'pair') {
    return (
      <div className="grid grid-cols-2 h-full min-h-[17px]">
        <div
          className={`border-r border-black px-1 py-0.5 text-[9px] leading-tight text-center flex items-center justify-center ${slotHighlightClass(item.slots[0] || '', refDate)}`}
        >
          {item.slots[0] || ''}
        </div>
        <div
          className={`px-1 py-0.5 text-[9px] leading-tight text-center flex items-center justify-center ${slotHighlightClass(item.slots[1] || '', refDate)}`}
        >
          {item.slots[1] || ''}
        </div>
      </div>
    );
  }
  return renderExpiryGrid(item, refDate);
}

function SectionTablePage1({
  sideLabel,
  itemHeader,
  rows,
  refDate,
}: {
  sideLabel: string;
  itemHeader: string;
  rows: CrashCartItemRow[];
  refDate: string;
}) {
  return (
    <table className="w-full border-collapse border border-black mb-1.5">
      <tbody>
        <tr>
          <td
            rowSpan={rows.length + 1}
            className="border border-black w-[38px] p-1 text-center align-middle"
          >
            <div className="appendix2-vertical text-[9.5px] font-bold leading-tight mx-auto whitespace-pre-line">
              {sideLabel}
            </div>
          </td>
          <th className="border border-black w-[24px] px-1 py-0.5 text-[9.5px] font-bold text-left">
            No
          </th>
          <th className="border border-black px-1.5 py-0.5 text-[10.5px] font-bold text-left">
            {itemHeader}
          </th>
          <th className="border border-black w-[72px] px-1 py-0.5 text-[9.5px] font-bold text-center">
            Quantity
          </th>
          <th className="border border-black w-[230px] px-1 py-0.5 text-[9.5px] font-bold text-center">
            Expiry Date
          </th>
        </tr>
        {rows.map((row) => (
          <tr key={row.id}>
            <td className="border border-black px-1 py-0.5 text-[8.5px] align-top">{row.no}</td>
            <td className="border border-black px-1.5 py-0.5 text-[10.5px] leading-snug">
              {row.name}
            </td>
            <td className="border border-black px-1 py-0.5 text-[10px] text-center leading-tight">
              {row.quantity}
            </td>
            <td className="border border-black p-0 align-middle">
              {renderExpiryGrid(row, refDate)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function SectionTableMulti({
  sideLabel,
  itemHeader,
  rows,
  refDate,
  showHeader = true,
}: {
  sideLabel: string;
  itemHeader: string;
  rows: CrashCartItemRow[];
  refDate: string;
  showHeader?: boolean;
}) {
  return (
    <table className="w-full border-collapse border border-black mb-1.5">
      <tbody>
        {showHeader && (
          <tr>
            <td
              rowSpan={rows.length + 1}
              className="border border-black w-[36px] p-1 text-center align-middle"
            >
              <div className="appendix2-vertical text-[9.5px] font-bold leading-tight mx-auto whitespace-pre-line">
                {sideLabel}
              </div>
            </td>
            <th className="border border-black w-[24px] px-1 py-0.5 text-[9.5px] font-bold text-left">
              No
            </th>
            <th className="border border-black px-1.5 py-0.5 text-[10.5px] font-bold text-left">
              {itemHeader}
            </th>
            <th className="border border-black w-[66px] px-1 py-0.5 text-[9.5px] font-bold text-center">
              Quantity
            </th>
            <th className="border border-black w-[250px] px-1 py-0.5 text-[9.5px] font-bold text-center">
              Expiry Date
            </th>
          </tr>
        )}
        {rows.map((row, idx) => (
          <tr key={row.id}>
            {!showHeader && idx === 0 && (
              <td
                rowSpan={rows.length}
                className="border border-black w-[36px] p-1 text-center align-middle"
              >
                <div className="appendix2-vertical text-[9.5px] font-bold leading-tight mx-auto whitespace-pre-line">
                  {sideLabel}
                </div>
              </td>
            )}
            <td className="border border-black w-[24px] px-1 py-0.5 text-[8.5px] align-top">
              {row.no}
            </td>
            <td className="border border-black p-0 align-top">
              {row.hasExpirySubRow ? (
                <div>
                  <div className="px-1.5 py-0.5 text-[10px] leading-tight border-b border-black">
                    {row.name}
                  </div>
                  <div className="px-1.5 py-0.5 text-[8.5px] font-bold leading-tight">Expiry</div>
                </div>
              ) : (
                <div className="px-1.5 py-0.5 text-[10px] leading-tight">{row.name}</div>
              )}
            </td>
            <td className="border border-black w-[66px] px-1 py-0.5 text-[9.5px] text-center leading-tight">
              {row.quantity}
            </td>
            <td className="border border-black w-[250px] p-0 align-middle">
              {renderPage23ExpiryGrid(row, refDate)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function CrashCartPrintView({ cart }: CrashCartPrintViewProps) {
  const refDate = parseCrashCartReferenceDate(cart.checkDate);
  const bySection = (sec: CrashCartItemRow['sectionId']) =>
    cart.items.filter((it) => it.sectionId === sec);

  return (
    <div className="appendix2-sheet space-y-6 print:space-y-0">
      {/* ==================== PAGE 1 ==================== */}
      <div className="appendix2-page bg-white border border-slate-300 shadow-sm p-6 max-w-[820px] mx-auto">
        <OfficialHeader />

        <div className="flex items-baseline justify-between mb-0.5">
          <div className="text-[11px] font-bold underline">Appendix 2</div>
          <div className="appendix2-sans text-[8.5px] flex items-center gap-3">
            <span className="inline-flex items-center gap-1">
              <span className="inline-block w-2.5 h-2.5 bg-[#fef08a] border border-black" />
              <span>Near Expiry (&le; 3 months)</span>
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="inline-block w-2.5 h-2.5 bg-[#fecaca] border border-black" />
              <span>Expired</span>
            </span>
          </div>
        </div>
        <div className="text-center text-[12px] mb-2">
          Checklist Template – For Crash Cart &amp; Defibrillator - Adult/Pediatric
        </div>

        {/* Date / Next Due / Defib / Lock Number row */}
        <div className="flex items-center justify-between text-[11px] mb-2 gap-2">
          <div className="flex items-center gap-4">
            <span>
              Date:{' '}
              <span className="appendix2-sans text-[10.5px] ml-1">{cart.checkDate}</span>
            </span>
            <span>
              Next Due:{' '}
              <span className="appendix2-sans text-[10.5px] ml-1">{cart.nextDueDate}</span>
            </span>
            <span>
              Defib:{' '}
              <span className="appendix2-sans font-semibold text-[10.5px] ml-2">
                {cart.defibLabel}
              </span>
            </span>
          </div>
          <div className="border border-black px-2 py-0.5 text-[11px] min-w-[230px]">
            Lock number:{' '}
            <span className="appendix2-sans text-[10.5px] ml-1">{cart.lockNumber}</span>
          </div>
        </div>

        {/* Check Type Row */}
        <table className="w-full border-collapse border border-black mb-1.5">
          <tbody>
            <tr>
              <td className="border border-black w-[26px] text-center text-[10.5px] appendix2-sans py-0.5">
                {cart.weeklyCheck ? 'X' : ''}
              </td>
              <td className="border border-black px-2 py-0.5 text-[11px] font-bold w-[30%]">
                Weekly Check
              </td>
              <td className="border border-black w-[26px] text-center text-[10.5px] appendix2-sans py-0.5">
                {cart.followingUse ? 'X' : ''}
              </td>
              <td className="border border-black px-2 py-0.5 text-[11px] font-bold w-[30%]">
                Following Use
              </td>
              <td className="border border-black w-[26px] text-center text-[10.5px] appendix2-sans py-0.5">
                {cart.lockNotIntact ? 'X' : ''}
              </td>
              <td className="border border-black px-2 py-0.5 text-[11px] font-bold">
                Lock Not Intact
              </td>
            </tr>
          </tbody>
        </table>

        <SectionTablePage1
          sideLabel={'Top Shelf\n(Defibrillator)'}
          itemHeader="Defibrillator items"
          rows={bySection('top-shelf')}
          refDate={refDate}
        />
        <SectionTablePage1
          sideLabel={'1st Drawer:\n(Core medications)'}
          itemHeader="Drugs Name"
          rows={bySection('drawer-1')}
          refDate={refDate}
        />
        <SectionTablePage1
          sideLabel={'2nd Drawer:\n(Additional Medications)'}
          itemHeader="Drugs Name"
          rows={bySection('drawer-2')}
          refDate={refDate}
        />
        <SectionTablePage1
          sideLabel={'In CAD\nCupboard'}
          itemHeader="Drugs Name"
          rows={bySection('cad-cupboard')}
          refDate={refDate}
        />
        <SectionTablePage1
          sideLabel={'In\nFridge'}
          itemHeader="Drugs Name (Keep in fridge according to manufacture advice)"
          rows={bySection('fridge')}
          refDate={refDate}
        />
      </div>

      {/* ==================== PAGE 2 ==================== */}
      <div className="appendix2-page bg-white border border-slate-300 shadow-sm p-6 max-w-[820px] mx-auto">
        <OfficialHeader />

        <SectionTableMulti
          sideLabel={'3rd drawer:\n(Breathing/Airway)'}
          itemHeader="Breathing/Airway Items"
          rows={bySection('drawer-3')}
          refDate={refDate}
        />

        <SectionTableMulti
          sideLabel={'4th drawer:\nCirculation & IV.'}
          itemHeader="Circulation and IV Items"
          rows={bySection('drawer-4-p1')}
          refDate={refDate}
        />
      </div>

      {/* ==================== PAGE 3 ==================== */}
      <div className="appendix2-page bg-white border border-slate-300 shadow-sm p-6 max-w-[820px] mx-auto">
        <OfficialHeader />

        <SectionTableMulti
          sideLabel=""
          itemHeader="Circulation and IV Items"
          rows={bySection('drawer-4-p2')}
          refDate={refDate}
          showHeader={false}
        />

        <SectionTableMulti
          sideLabel={'In\nTreatment\nRoom'}
          itemHeader="Additional Accessory Items"
          rows={bySection('treatment-room')}
          refDate={refDate}
        />

        <SectionTableMulti
          sideLabel={'Emergency C\nSection'}
          itemHeader="Items"
          rows={bySection('emergency-c')}
          refDate={refDate}
        />

        <SectionTableMulti
          sideLabel={'Side of\nThe Cart'}
          itemHeader="Extras"
          rows={bySection('side-cart')}
          refDate={refDate}
        />

        {/* Comments & Sign-Off Boxes */}
        <table className="w-full border-collapse border border-black mt-2 text-[10.5px]">
          <tbody>
            <tr>
              <td className="border border-black p-1.5 align-top w-[68%] h-[68px]">
                <div className="font-normal">Comments:</div>
                <div className="appendix2-sans text-[8.5px] leading-snug mt-0.5">
                  {cart.staffNurseComment}
                </div>
              </td>
              <td className="border border-black p-1.5 text-center align-middle w-[16%] text-[9px] leading-tight">
                Staff Nurse Name &amp; Signature
              </td>
              <td className="border border-black p-1.5 align-top w-[16%] appendix2-sans text-[9.5px]">
                {cart.staffNurseName}
              </td>
            </tr>

            <tr>
              <td className="border border-black p-1.5 align-top h-[52px]">
                <div>Comments:</div>
                <div className="appendix2-sans text-[8.5px] leading-snug mt-0.5">
                  {cart.supervisorComment}
                </div>
              </td>
              <td className="border border-black p-1.5 text-center align-middle text-[9px] leading-tight">
                Nurse Supervisor Name and Signature
              </td>
              <td className="border border-black p-1.5 align-top appendix2-sans text-[9.5px]">
                {cart.supervisorName}
              </td>
            </tr>

            <tr>
              <td className="border border-black p-1.5 align-top h-[52px]">
                <div>Comments:</div>
                <div className="appendix2-sans text-[8.5px] leading-snug mt-0.5">
                  {cart.headNurseComment}
                </div>
              </td>
              <td className="border border-black p-1.5 text-center align-middle text-[9px] leading-tight">
                Head Nurse Name and Signature
              </td>
              <td className="border border-black p-1.5 align-top appendix2-sans text-[9.5px]">
                {cart.headNurseName}
              </td>
            </tr>
          </tbody>
        </table>

        {cart.staffCommentsContinued && (
          <div className="mt-1.5 appendix2-sans text-[8.5px] leading-snug">
            Staff comments continued: {cart.staffCommentsContinued}
          </div>
        )}
      </div>

      {/* ==================== PAGE 4 ==================== */}
      <div className="appendix2-page bg-white border border-slate-300 shadow-sm p-6 max-w-[820px] mx-auto min-h-[600px]">
        <OfficialHeader />

        <table className="w-full border-collapse border border-black mt-3 text-[11px]">
          <tbody>
            <tr>
              <td className="border border-black p-2.5">
                <div className="mb-3">
                  Pharmacist name (Monthly Check):{' '}
                  <span className="appendix2-sans text-[10.5px] ml-2">{cart.pharmacistName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    Signature:{' '}
                    <span className="appendix2-sans text-[10.5px] ml-2">
                      {cart.pharmacistSignature}
                    </span>
                  </div>
                  <div className="min-w-[200px]">
                    Date:{' '}
                    <span className="appendix2-sans text-[10.5px] ml-3">
                      {cart.pharmacistDate || '/       /'}
                    </span>
                  </div>
                </div>
              </td>
            </tr>

            <tr>
              <td className="border border-black p-2.5">
                <div className="mb-3">
                  Medical Equipment Staff Name (Twice a year and whenever required):{' '}
                  <span className="appendix2-sans text-[10.5px] ml-2">{cart.biomedName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    Signature:{' '}
                    <span className="appendix2-sans text-[10.5px] ml-2">
                      {cart.biomedSignature}
                    </span>
                  </div>
                  <div className="min-w-[200px]">
                    Date:{' '}
                    <span className="appendix2-sans text-[10.5px] ml-3">
                      {cart.biomedDate || '/       /'}
                    </span>
                  </div>
                </div>
              </td>
            </tr>

            <tr>
              <td className="border border-black p-2.5">
                <div className="mb-3">
                  Quality Management Nursing Staff Name (Twice a year and whenever required):{' '}
                  <span className="appendix2-sans text-[10.5px] ml-2">{cart.qualityNurseName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    Signature:{' '}
                    <span className="appendix2-sans text-[10.5px] ml-2">
                      {cart.qualityNurseSignature}
                    </span>
                  </div>
                  <div className="min-w-[200px]">
                    Date:{' '}
                    <span className="appendix2-sans text-[10.5px] ml-3">
                      {cart.qualityNurseDate || '/       /'}
                    </span>
                  </div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
