import {
  formatDdMmYy,
  MONTH_NAMES,
  WEEKDAY_LABELS,
} from '../data/oxygenCylinderSeed';
import type {
  CylinderMonthlySchedule,
  CylinderWeekPlan,
  OxygenCylinder,
} from '../types/ward';

export type CylinderPrintLayoutMode = 'two-weeks-per-page' | 'one-week-per-page';
export type CylinderPrintWeekScope = 'all' | number;

interface OxygenCylinderPrintViewProps {
  cylinders: OxygenCylinder[];
  schedule: CylinderMonthlySchedule;
  layoutMode?: CylinderPrintLayoutMode;
  weekScope?: CylinderPrintWeekScope;
  showAssignedStaffInCells?: boolean;
}

interface PrintableWeekBundle {
  week: CylinderWeekPlan;
  formattedDate: string;
  staffSummaryText: string;
}

function getWeekStaffSummary(week: CylinderWeekPlan): string {
  const active = week.assignedStaff.filter((s) => s.staffName.trim());
  if (active.length === 0) return '—';
  return active
    .map((s) => (s.role.trim() ? `${s.staffName.trim()} (${s.role.trim()})` : s.staffName.trim()))
    .join(', ');
}

function getWeekCellCheckedBy(week: CylinderWeekPlan, rowOverride?: string): string {
  if (rowOverride !== undefined && rowOverride.trim()) return rowOverride.trim();
  const active = week.assignedStaff.filter((s) => s.staffName.trim());
  if (active.length === 0) return '';
  return active
    .map((s) =>
      s.signature.trim()
        ? `${s.staffName.trim()} / ${s.signature.trim()}`
        : s.staffName.trim()
    )
    .join(', ');
}

export function OxygenCylinderPrintView({
  cylinders,
  schedule,
  layoutMode = 'two-weeks-per-page',
  weekScope = 'all',
  showAssignedStaffInCells = true,
}: OxygenCylinderPrintViewProps) {
  const monthLabel = MONTH_NAMES[(schedule.month - 1 + 12) % 12] || 'January';
  const monthYearLabel = `${monthLabel} ${schedule.year}`;
  const weekdayLabel = WEEKDAY_LABELS[schedule.checkDayOfWeek] || 'Sunday';
  const totalWeeksInMonth = schedule.weeks.length;

  const selectedWeeks =
    weekScope === 'all'
      ? schedule.weeks
      : schedule.weeks.filter((w) => w.weekNumber === weekScope);

  const bundles: PrintableWeekBundle[] = selectedWeeks.map((week) => ({
    week,
    formattedDate: formatDdMmYy(week.checkDate),
    staffSummaryText: getWeekStaffSummary(week),
  }));

  // Group weeks into landscape pages.
  // In 2-weeks-per-page mode, only pack 2 weeks on one sheet when cylinder count fits cleanly (<= 14 rows).
  const maxPerPage = layoutMode === 'two-weeks-per-page' && cylinders.length <= 14 ? 2 : 1;
  const pages: PrintableWeekBundle[][] = [];
  for (let i = 0; i < bundles.length; i += maxPerPage) {
    pages.push(bundles.slice(i, i + maxPerPage));
  }
  if (pages.length === 0) pages.push([]);

  const showMonthlyRosterOnLastPage = weekScope === 'all';
  const totalPages = pages.length;

  return (
    <div>
      <style>{`@media print { @page { size: A4 landscape; margin: 5mm 7mm; } }`}</style>

      <div className="no-print mb-2 flex items-center justify-between text-[11px] text-slate-600 px-1">
        <span>
          {layoutMode === 'two-weeks-per-page'
            ? '2 Weeks per Page (A4 Landscape)'
            : '1 Week per Page (A4 Landscape)'}{' '}
          &mdash;{' '}
          <strong className="text-slate-900">
            {totalPages} {totalPages === 1 ? 'page' : 'pages'}
          </strong>{' '}
          ({bundles.length} {bundles.length === 1 ? 'week' : 'weeks'}, {cylinders.length} cylinders ·{' '}
          Every {weekdayLabel} in {monthYearLabel})
        </span>
        <span className="text-slate-500">Weekly Cylinder Assessment Checklist</span>
      </div>

      <div className="space-y-5 print:space-y-0">
        {pages.map((pageWeeks, pageIdx) => {
          const isLastPage = pageIdx === pages.length - 1;
          const compact = pageWeeks.length >= 2 || cylinders.length > 13;

          return (
            <div
              key={`cyl-page-${pageIdx}`}
              className="pharmacy-page-landscape bg-white border border-slate-300 shadow-sm mx-auto w-[297mm] min-h-[210mm] p-[5mm_7mm] flex flex-col justify-between text-black appendix2-sheet"
            >
              <div className="flex-1 flex flex-col">
                {/* Official Monthly Hospital Header */}
                <div className="border border-slate-800 mb-2 shrink-0 appendix2-sans">
                  <div className="flex items-center justify-between gap-4 px-3 py-1 border-b border-slate-800 bg-[#f8fafc]">
                    <img
                      src="/assets/store_header.jpg"
                      alt="Kingdom of Bahrain Government Hospitals"
                      className="h-[30px] w-auto object-contain shrink-0"
                    />
                    <div className="text-center flex-1">
                      <div className="text-[13px] font-bold tracking-tight text-[#0f3d56] uppercase">
                        WEEKLY OXYGEN CYLINDER ASSESSMENT CHECKLIST
                      </div>
                      <div className="text-[8.5px] text-slate-600">
                        Monthly Schedule ({totalWeeksInMonth} Weekly Checks &middot; Every{' '}
                        {weekdayLabel}) &middot; Pressure, Valve, Regulator &amp; Spare Verification
                      </div>
                    </div>
                    <div className="text-right text-[8.5px] text-slate-700 shrink-0 min-w-[110px]">
                      <div>
                        <span className="font-bold">Cylinders:</span> {cylinders.length}
                      </div>
                      <div>
                        Page {pageIdx + 1}/{totalPages}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 text-[9px] bg-white">
                    <div className="border-r border-slate-800 px-2.5 py-[2.5px]">
                      <span className="font-bold text-slate-700">Ward / Location:</span>{' '}
                      <span className="ml-1">{schedule.wardLocation || '208 CCU'}</span>
                    </div>
                    <div className="border-r border-slate-800 px-2.5 py-[2.5px]">
                      <span className="font-bold text-slate-700">Month &amp; Year:</span>{' '}
                      <span className="ml-1">{monthYearLabel}</span>
                    </div>
                    <div className="border-r border-slate-800 px-2.5 py-[2.5px]">
                      <span className="font-bold text-slate-700">Check Day:</span>{' '}
                      <span className="ml-1">
                        {weekdayLabel} ({totalWeeksInMonth}x/month)
                      </span>
                    </div>
                    <div className="px-2.5 py-[2.5px]">
                      <span className="font-bold text-slate-700">Weeks Shown:</span>{' '}
                      <span className="ml-1">
                        {pageWeeks.map((pw) => `W${pw.week.weekNumber} (${pw.formattedDate})`).join(', ')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Weekly Assessment Tables matching Official PDF Grid */}
                <div className={compact ? 'space-y-2.5' : 'space-y-4'}>
                  {pageWeeks.map((bundle) => (
                    <SingleWeekCylinderTable
                      key={`wk-tbl-${bundle.week.weekNumber}`}
                      bundle={bundle}
                      cylinders={cylinders}
                      compact={compact}
                      showAssignedStaffInCells={showAssignedStaffInCells}
                    />
                  ))}
                </div>

                {/* Monthly Assigned Staff Roster & Verification Sign-Off on Final Page */}
                {isLastPage && showMonthlyRosterOnLastPage && (
                  <div className="mt-2.5 shrink-0 appendix2-sans">
                    <MonthlyCylinderStaffSignOffTable weeks={schedule.weeks} />
                  </div>
                )}

                {/* Per-week Staff Sign-Off strip when printing 1 week per page */}
                {!showMonthlyRosterOnLastPage && pageWeeks.length === 1 && (
                  <div className="mt-3 shrink-0 appendix2-sans">
                    <MonthlyCylinderStaffSignOffTable weeks={[pageWeeks[0].week]} />
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="mt-1.5 pt-1 border-t border-slate-300 flex items-center justify-between text-[8px] text-slate-600 shrink-0 appendix2-sans">
                <span>
                  Weekly Oxygen Cylinder Assessment Checklist &middot;{' '}
                  {schedule.wardLocation || '208 CCU'} &middot; {monthYearLabel}
                </span>
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

function SingleWeekCylinderTable({
  bundle,
  cylinders,
  compact,
  showAssignedStaffInCells,
}: {
  bundle: PrintableWeekBundle;
  cylinders: OxygenCylinder[];
  compact: boolean;
  showAssignedStaffInCells: boolean;
}) {
  const { week, formattedDate, staffSummaryText } = bundle;
  const headerText = compact
    ? 'text-[7.8px] leading-[1.1]'
    : 'text-[9px] leading-[1.15]';
  const cellText = compact
    ? 'text-[8.2px] leading-[1.12]'
    : 'text-[9.5px] leading-[1.2]';
  const cellPad = compact ? 'py-[1.5px] px-1' : 'py-[2.5px] px-1.5';
  const headerPad = compact ? 'py-[2.5px] px-1' : 'py-[4px] px-1';

  return (
    <div>
      {/* Week Header line mirroring attached PDF ("Week 1" centered) */}
      <div className="flex items-baseline justify-between mb-[2px]">
        <span className="text-[8.5px] text-slate-600 appendix2-sans w-[28%]">
          Check Date: <strong className="text-black">{formattedDate}</strong>
        </span>
        <div
          className={`text-center font-bold text-black flex-1 ${
            compact ? 'text-[11px]' : 'text-[13px]'
          }`}
        >
          Week {week.weekNumber}
        </div>
        <span className="text-[8.5px] text-slate-600 appendix2-sans w-[28%] text-right truncate">
          Assigned: <strong className="text-black">{staffSummaryText}</strong>
        </span>
      </div>

      {/* Exact 14-Column PDF Table */}
      <table className="w-full border-collapse table-fixed">
        <thead>
          <tr>
            {/* Empty Col 1 over row numbers, matching PDF */}
            <th className="w-[2.2%] border-0 bg-transparent p-0" />
            <th
              className={`w-[5.8%] border-t-[1.6px] border-l-[1.6px] border-r border-b-[1.6px] border-black font-bold text-center align-middle ${headerText} ${headerPad}`}
            >
              Date
            </th>
            <th
              className={`w-[6.3%] border-t-[1.6px] border-r border-b-[1.6px] border-black font-bold text-center align-middle ${headerText} ${headerPad}`}
            >
              Cylinder Location
            </th>
            <th
              className={`w-[6.5%] border-t-[1.6px] border-r border-b-[1.6px] border-black font-bold text-center align-middle ${headerText} ${headerPad}`}
            >
              Cylinder Batch Number
            </th>
            <th
              className={`w-[5.8%] border-t-[1.6px] border-r border-b-[1.6px] border-black font-bold text-center align-middle ${headerText} ${headerPad}`}
            >
              Cylinder Size (ltr)
            </th>
            <th
              className={`w-[6.4%] border-t-[1.6px] border-r border-b-[1.6px] border-black font-bold text-center align-middle ${headerText} ${headerPad}`}
            >
              Date of Filling
            </th>
            <th
              className={`w-[6.4%] border-t-[1.6px] border-r border-b-[1.6px] border-black font-bold text-center align-middle ${headerText} ${headerPad}`}
            >
              Pressure Level ( PSI)
            </th>
            <th
              className={`w-[6.1%] border-t-[1.6px] border-r border-b-[1.6px] border-black font-bold text-center align-middle ${headerText} ${headerPad}`}
            >
              Type of GAS
            </th>
            <th
              className={`w-[6.5%] border-t-[1.6px] border-r border-b-[1.6px] border-black font-bold text-center align-middle ${headerText} ${headerPad}`}
            >
              Type of cylinder
            </th>
            <th
              className={`w-[11%] border-t-[1.6px] border-r border-b-[1.6px] border-black font-bold text-center align-middle ${headerText} ${headerPad}`}
            >
              Cylinder Condition (Good/Damaged/Leaking/Colour)
            </th>
            <th
              className={`w-[8.6%] border-t-[1.6px] border-r border-b-[1.6px] border-black font-bold text-center align-middle ${headerText} ${headerPad}`}
            >
              Regulator &amp; Valve Functioning (Yes/No)
            </th>
            <th
              className={`w-[8.6%] border-t-[1.6px] border-r border-b-[1.6px] border-black font-bold text-center align-middle ${headerText} ${headerPad}`}
            >
              Availability of Spare Cylinders (Yes/No)
            </th>
            <th
              className={`w-[10.4%] border-t-[1.6px] border-r border-b-[1.6px] border-black font-bold text-center align-middle ${headerText} ${headerPad}`}
            >
              Checked By (Name &amp; Signature)
            </th>
            <th
              className={`w-[9.4%] border-t-[1.6px] border-r-[1.6px] border-b-[1.6px] border-black font-bold text-center align-middle ${headerText} ${headerPad}`}
            >
              Remarks/Issues Noted
            </th>
          </tr>
        </thead>
        <tbody>
          {cylinders.map((cyl, idx) => {
            const isLastRow = idx === cylinders.length - 1;
            const rec = week.records?.[cyl.id];
            const rowDate = rec?.date?.trim() || formattedDate;
            const psi = rec?.pressurePsi ?? cyl.pressurePsi;
            const condition = rec?.conditionStatus ?? cyl.conditionStatus ?? 'GOOD/ green';
            const valveOk = rec?.valveFunctioning ?? cyl.valveAndLeakCheck;
            const spareOk = rec?.spareAvailable ?? cyl.spareAvailable ?? true;
            const checkedBy = showAssignedStaffInCells
              ? getWeekCellCheckedBy(week, rec?.checkedBy)
              : rec?.checkedBy?.trim() || '';
            const remarks = rec?.remarks ?? cyl.notes ?? '';
            const sizeLiters =
              cyl.sizeLiters ?? (cyl.size === 'H/J-Cylinder (Backup)' ? 1000 : 500);
            const fillingDate = formatDdMmYy(cyl.dateOfFilling);
            const psiLow = psi < cyl.minThresholdPsi;
            const psiWarn = !psiLow && psi < 1200;
            const condBad = !condition.toLowerCase().includes('good');

            const bottomBorder = isLastRow ? 'border-b-[1.6px]' : 'border-b';

            return (
              <tr key={`${week.weekNumber}-${cyl.id}`} className="bg-white">
                <td
                  className={`border-t border-l border-b border-r-[1.6px] border-black text-center tabular-nums ${cellText} ${cellPad}`}
                >
                  {idx + 1}
                </td>
                <td
                  className={`border-r ${bottomBorder} border-black text-center whitespace-nowrap tabular-nums ${cellText} ${cellPad}`}
                >
                  {rowDate}
                </td>
                <td
                  className={`border-r ${bottomBorder} border-black text-center break-words ${cellText} ${cellPad}`}
                >
                  {cyl.location}
                </td>
                <td
                  className={`border-r ${bottomBorder} border-black text-center break-words ${cellText} ${cellPad}`}
                >
                  {cyl.cylinderCode}
                </td>
                <td
                  className={`border-r ${bottomBorder} border-black text-center tabular-nums ${cellText} ${cellPad}`}
                >
                  {sizeLiters}
                </td>
                <td
                  className={`border-r ${bottomBorder} border-black text-center whitespace-nowrap tabular-nums ${cellText} ${cellPad}`}
                >
                  {fillingDate}
                </td>
                <td
                  className={`border-r ${bottomBorder} border-black text-center tabular-nums ${cellText} ${cellPad} ${
                    psiLow
                      ? 'bg-[#fecaca] text-[#7f1d1d] font-bold'
                      : psiWarn
                        ? 'bg-[#fef08a] text-black font-bold'
                        : ''
                  }`}
                >
                  {psi}
                </td>
                <td
                  className={`border-r ${bottomBorder} border-black text-center break-words ${cellText} ${cellPad}`}
                >
                  {cyl.typeOfGas || 'OXYGEN'}
                </td>
                <td
                  className={`border-r ${bottomBorder} border-black text-center break-words ${cellText} ${cellPad}`}
                >
                  {cyl.cylinderType || 'Aluminium'}
                </td>
                <td
                  className={`border-r ${bottomBorder} border-black text-center break-words ${cellText} ${cellPad} ${
                    condBad ? 'bg-[#fecaca] text-[#7f1d1d] font-bold' : ''
                  }`}
                >
                  {condition}
                </td>
                <td
                  className={`border-r ${bottomBorder} border-black text-center font-medium ${cellText} ${cellPad} ${
                    !valveOk ? 'bg-[#fecaca] text-[#7f1d1d] font-bold' : ''
                  }`}
                >
                  {valveOk ? 'YES' : 'NO'}
                </td>
                <td
                  className={`border-r ${bottomBorder} border-black text-center font-medium ${cellText} ${cellPad} ${
                    !spareOk ? 'bg-[#fef08a] text-black font-bold' : ''
                  }`}
                >
                  {spareOk ? 'YES' : 'NO'}
                </td>
                <td
                  className={`border-r ${bottomBorder} border-black text-center break-words ${cellText} ${cellPad}`}
                >
                  {checkedBy}
                </td>
                <td
                  className={`border-r-[1.6px] ${bottomBorder} border-black text-left break-words ${cellText} ${cellPad}`}
                >
                  {remarks}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function MonthlyCylinderStaffSignOffTable({ weeks }: { weeks: CylinderWeekPlan[] }) {
  return (
    <div className="border border-slate-800">
      <div className="bg-[#0f3d56] text-white px-2.5 py-[2px] text-[8.5px] font-bold uppercase tracking-wide flex items-center justify-between">
        <span>Assigned Staff Weekly Checking Roster &amp; Sign-Off</span>
        <span className="font-normal normal-case text-[8px] text-slate-200">
          Minimum 4 / Maximum 5 weekly assessments per month depending on scheduled day
        </span>
      </div>
      <table className="w-full border-collapse text-[8px]">
        <thead>
          <tr className="bg-[#e8eff5] text-slate-900 font-bold">
            <th className="border-t border-r border-slate-400 px-2 py-[2px] text-center w-[10%]">
              Week
            </th>
            <th className="border-t border-r border-slate-400 px-2 py-[2px] text-center w-[13%]">
              Check Date
            </th>
            <th className="border-t border-r border-slate-400 px-2 py-[2px] text-left w-[35%]">
              Assigned Staff Name(s)
            </th>
            <th className="border-t border-r border-slate-400 px-2 py-[2px] text-left w-[22%]">
              Role
            </th>
            <th className="border-t border-slate-400 px-2 py-[2px] text-center w-[20%]">
              Signature
            </th>
          </tr>
        </thead>
        <tbody>
          {weeks.map((wk) => {
            const active = wk.assignedStaff.filter((s) => s.staffName.trim());
            const names =
              active.length > 0 ? active.map((s) => s.staffName.trim()).join(', ') : '—';
            const roles =
              active.length > 0
                ? active
                    .map((s) => s.role.trim())
                    .filter(Boolean)
                    .join(', ') || 'Staff Nurse'
                : '—';
            const signs = active
              .map((s) => s.signature.trim())
              .filter(Boolean)
              .join(', ');

            return (
              <tr key={`roster-w${wk.weekNumber}`} className="bg-white">
                <td className="border-t border-r border-slate-400 px-2 py-[2px] text-center font-bold">
                  Week {wk.weekNumber}
                </td>
                <td className="border-t border-r border-slate-400 px-2 py-[2px] text-center tabular-nums">
                  {formatDdMmYy(wk.checkDate)}
                </td>
                <td className="border-t border-r border-slate-400 px-2 py-[2px] font-medium">
                  {names}
                </td>
                <td className="border-t border-r border-slate-400 px-2 py-[2px] text-slate-700">
                  {roles}
                </td>
                <td className="border-t border-slate-400 px-2 py-[2px] text-center">
                  {signs}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
