import {
  computeTable5ColumnTotals,
  EQUIPMENT_TABLES,
  isEquipmentAccessoryTicked,
} from '../data/equipmentSeed';
import type {
  EquipmentMaintenanceLogEntry,
  InventoryItem,
  SectionPeriodMeta,
  StoreStaffAssignment,
} from '../types/ward';
import { formatShortDate, getTodayIso } from '../utils/dateUtils';

export type EquipmentPrintLayoutMode = 'grouped' | 'one-per-sheet';
export type EquipmentPrintScope = 'all' | 'maintenance-only';
export type EquipmentMaintenancePrintFilter = 'all' | 'active' | 'repaired';

interface EquipmentPrintViewProps {
  items: InventoryItem[];
  meta?: SectionPeriodMeta;
  wardName?: string;
  defaultInspector: string;
  layoutMode?: EquipmentPrintLayoutMode;
  selectedTable?: string; // 'All' or exact EQUIPMENT_TABLES name
  maintenanceLogs?: EquipmentMaintenanceLogEntry[];
  includeMaintenanceLog?: boolean;
  printScope?: EquipmentPrintScope;
  maintenancePrintFilter?: EquipmentMaintenancePrintFilter;
}

interface TableSlice {
  tableName: string;
  items: InventoryItem[];
  isContinuation?: boolean;
  padTo26?: boolean;
}

function getEffectiveComment(item: InventoryItem): string {
  const note = item.notes?.trim() || '';
  if (item.equipmentStatus && item.equipmentStatus !== 'Operational') {
    const tag = `[${item.equipmentStatus}]`;
    if (!note) return tag;
    if (!note.toLowerCase().includes(item.equipmentStatus.toLowerCase())) {
      return `${tag} ${note}`;
    }
  }
  return note;
}

function getRowAlertClass(item: InventoryItem): string {
  if (item.equipmentStatus === 'Out of Service' || item.equipmentStatus === 'Under Maintenance') {
    return 'bg-[#fee2e2] text-[#7f1d1d] font-bold';
  }
  if (item.equipmentStatus === 'Needs Calibration') {
    return 'bg-[#fef3c7] text-[#78350f] font-bold';
  }
  return '';
}

function chunkItems(list: InventoryItem[], maxRows: number): InventoryItem[][] {
  if (list.length === 0) return [[]];
  const chunks: InventoryItem[][] = [];
  for (let i = 0; i < list.length; i += maxRows) {
    chunks.push(list.slice(i, i + maxRows));
  }
  return chunks;
}

export function EquipmentPrintView({
  items,
  meta,
  wardName,
  defaultInspector,
  layoutMode = 'grouped',
  selectedTable = 'All',
  maintenanceLogs = [],
  includeMaintenanceLog = true,
  printScope = 'all',
  maintenancePrintFilter = 'all',
}: EquipmentPrintViewProps) {
  const today = getTodayIso();
  const [y, m, d] = today.split('-');
  const defaultDate = `${d}/${m}/${y}`;
  const defaultMonth = new Date(
    Number(y),
    Math.max(0, Number(m) - 1),
    Number(d)
  ).toLocaleDateString('en-US', { month: 'long' });

  const displayWard = meta?.wardNumber?.trim() || wardName?.trim() || '208 (CCU & SD)';
  const displayMonth = meta?.month?.trim() || defaultMonth;
  const displayYear = meta?.year?.trim() || y;

  const staffAssignments: StoreStaffAssignment[] =
    meta?.staffAssignments && meta.staffAssignments.length > 0
      ? meta.staffAssignments
      : [
          {
            id: 'eq-staff-default',
            staffName: meta?.staffName?.trim() || defaultInspector,
            role: 'Staff Nurse',
            assignedSections: 'All Medical Equipment Tables (1–9)',
            checkedDate: meta?.date || defaultDate,
            signature: meta?.signature || '',
          },
        ];

  // Group items into the 10 official tables (+ any custom table names)
  const tableMap = new Map<string, InventoryItem[]>();
  for (const tbl of EQUIPMENT_TABLES) tableMap.set(tbl, []);
  for (const it of items) {
    const key = it.locationDetail?.trim() || 'Table 9 - Others';
    const bucket = tableMap.get(key);
    if (bucket) bucket.push(it);
    else tableMap.set(key, [it]);
  }

  const activeTableNames = Array.from(tableMap.entries())
    .filter(([name, list]) => {
      if (selectedTable !== 'All' && name !== selectedTable) return false;
      return list.length > 0;
    })
    .map(([name]) => name);

  // Build pages according to layoutMode, selectedTable & printScope
  const pages: Array<{
    slices: TableSlice[];
    maintenanceSlice?: EquipmentMaintenanceLogEntry[];
    isFirstPage: boolean;
    isMaintenanceOnlyPage?: boolean;
  }> = [];

  if (printScope !== 'maintenance-only') {
    if (layoutMode === 'one-per-sheet' || selectedTable !== 'All') {
      for (const tbl of activeTableNames) {
        const list = tableMap.get(tbl) || [];
        const chunks = chunkItems(list, 35);
        chunks.forEach((chunk, idx) => {
          pages.push({
            slices: [
              {
                tableName: tbl,
                items: chunk,
                isContinuation: idx > 0,
                padTo26: tbl === 'Table 9 - Others' && idx === chunks.length - 1,
              },
            ],
            isFirstPage: pages.length === 0,
          });
        });
      }
    } else {
      // Official Grouped layout: keeps every table unbroken on its sheet
      const pageGroups: string[][] = [
        [
          'Table 1 – Patient Beds',
          'Table 2 – CCU Cardiac Monitors and Accessories',
          'Table 3 – CCU Central',
          'Table 4 – Crash Cart Trolleys',
        ],
        [
          'Table 5 – Suction and Oxygenation Items',
          'Table 6 – ECG Machines',
          'Table 7- Telemetry System',
        ],
        ['Table 8 - Alaris GP IV Infusion Pumps'],
        ['Table 9 - Alaris Syringe IV Infusion Pumps'],
        ['Table 9 - Others'],
      ];

      const knownSet = new Set(pageGroups.flat());
      const extraTables = activeTableNames.filter((t) => !knownSet.has(t));
      if (extraTables.length > 0) {
        pageGroups.push(extraTables);
      }

      for (const group of pageGroups) {
        const groupTables = group.filter((t) => (tableMap.get(t)?.length || 0) > 0);
        if (groupTables.length === 0) continue;

        // For multi-table pages, keep together unless a table has > 35 items
        const largeSingle =
          groupTables.length === 1 && (tableMap.get(groupTables[0])?.length || 0) > 35;
        if (largeSingle) {
          const tbl = groupTables[0];
          const chunks = chunkItems(tableMap.get(tbl) || [], 35);
          chunks.forEach((chunk, idx) => {
            pages.push({
              slices: [{ tableName: tbl, items: chunk, isContinuation: idx > 0 }],
              isFirstPage: pages.length === 0,
            });
          });
        } else {
          pages.push({
            slices: groupTables.map((tbl) => ({
              tableName: tbl,
              items: tableMap.get(tbl) || [],
              padTo26: tbl === 'Table 9 - Others',
            })),
            isFirstPage: pages.length === 0,
          });
        }
      }
    }
  }

  const filteredMaintenanceLogs = maintenanceLogs.filter((entry) => {
    if (maintenancePrintFilter === 'active') return entry.status !== 'Repaired / Returned';
    if (maintenancePrintFilter === 'repaired') return entry.status === 'Repaired / Returned';
    return true;
  });

  const filterBadgeLabel =
    maintenancePrintFilter === 'active'
      ? 'Active / Open Follow-Up Only'
      : maintenancePrintFilter === 'repaired'
        ? 'Repaired / Returned Only'
        : 'All Repair & Follow-Up Entries';

  const maintenanceActiveCount = filteredMaintenanceLogs.filter(
    (l) => l.status !== 'Repaired / Returned'
  ).length;
  const maintenanceRepairedCount = filteredMaintenanceLogs.filter(
    (l) => l.status === 'Repaired / Returned'
  ).length;

  const shouldRenderMaintenance =
    printScope === 'maintenance-only' ||
    (includeMaintenanceLog && selectedTable === 'All' && filteredMaintenanceLogs.length > 0);

  if (shouldRenderMaintenance) {
    const LOGS_PER_PAGE = 14;
    if (filteredMaintenanceLogs.length === 0) {
      pages.push({
        slices: [],
        maintenanceSlice: [],
        isFirstPage: pages.length === 0,
        isMaintenanceOnlyPage: true,
      });
    } else {
      for (let i = 0; i < filteredMaintenanceLogs.length; i += LOGS_PER_PAGE) {
        pages.push({
          slices: [],
          maintenanceSlice: filteredMaintenanceLogs.slice(i, i + LOGS_PER_PAGE),
          isFirstPage: pages.length === 0,
          isMaintenanceOnlyPage: true,
        });
      }
    }
  }

  if (pages.length === 0) {
    pages.push({ slices: [], isFirstPage: true });
  }

  const totalPages = pages.length;
  const isMaintenanceOnlyReport = printScope === 'maintenance-only';

  return (
    <div>
      <style>{`@media print { @page { size: A4 portrait; margin: 5mm 7mm; } }`}</style>

      <div className="no-print mb-2 flex items-center justify-between text-[11px] text-slate-600 px-1">
        <span>
          {isMaintenanceOnlyReport
            ? `Maintenance, Repair Log & Follow-Up Report — ${filterBadgeLabel} (A4 Portrait)`
            : layoutMode === 'one-per-sheet'
              ? '1 Table per Page (A4 Portrait)'
              : 'Official Grouped Monthly Form (A4 Portrait)'}{' '}
          &mdash;{' '}
          <strong className="text-slate-900">
            {totalPages} {totalPages === 1 ? 'page' : 'pages'}
          </strong>{' '}
          (
          {isMaintenanceOnlyReport
            ? `${filteredMaintenanceLogs.length} repair log ${
                filteredMaintenanceLogs.length === 1 ? 'entry' : 'entries'
              }`
            : `${activeTableNames.length} ${activeTableNames.length === 1 ? 'table' : 'tables'}, ${activeTableNames.reduce((acc, t) => acc + (tableMap.get(t)?.length || 0), 0)} devices`}
          )
        </span>
        <span className="text-slate-500">
          {isMaintenanceOnlyReport
            ? 'Medical Equipment Maintenance, Repair Log & Follow-Up Report'
            : 'Medical Equipment Monthly Inventory'}
        </span>
      </div>

      <div className="space-y-5 print:space-y-0">
        {pages.map((pg, pageIdx) => {
          const isLastPage = pageIdx === pages.length - 1;

          return (
            <div
              key={`eq-print-pg-${pageIdx}`}
              className="pharmacy-page-portrait bg-white border border-slate-300 shadow-sm mx-auto w-[210mm] min-h-[297mm] p-[6mm_8mm] flex flex-col justify-between text-black appendix2-sans"
            >
              <div className="flex-1 flex flex-col">
                {/* Official Hospital Header */}
                {pg.isFirstPage ? (
                  <div className="mb-1.5 shrink-0">
                    <div className="flex items-center justify-between gap-3 mb-1">
                      <div className="w-[90px] text-[8px] text-slate-600">
                        <div>
                          <span className="font-bold">Ward:</span> {displayWard}
                        </div>
                      </div>
                      <img
                        src="/assets/gov_hospitals_header.png"
                        alt="Kingdom of Bahrain Government Hospitals"
                        className="h-[36px] w-auto object-contain mx-auto"
                      />
                      <div className="w-[90px] text-right text-[8px] text-slate-600">
                        Page {pageIdx + 1}/{totalPages}
                      </div>
                    </div>

                    <table className="w-full border-collapse border border-black text-[10px]">
                      <tbody>
                        <tr>
                          <td className="border border-black px-2 py-[2px] font-bold text-center w-[20%] bg-[#f8fafc]">
                            Month
                          </td>
                          <td className="border border-black px-2.5 py-[2px] text-center font-semibold w-[80%]">
                            {displayMonth}
                          </td>
                        </tr>
                        <tr>
                          <td className="border border-black px-2 py-[2px] font-bold text-center bg-[#f8fafc]">
                            Year
                          </td>
                          <td className="border border-black px-2.5 py-[2px] text-center font-semibold">
                            {displayYear}
                          </td>
                        </tr>
                        <tr>
                          <td
                            colSpan={2}
                            className="border border-black px-2 py-[3px] text-center font-bold text-[11px] tracking-wide uppercase bg-[#f8fafc]"
                          >
                            {isMaintenanceOnlyReport
                              ? 'MEDICAL EQUIPMENT MAINTENANCE, REPAIR LOG & FOLLOW-UP REPORT'
                              : 'MEDICAL EQUIPMENT MONTHLY INVENTORY'}
                          </td>
                        </tr>
                        {isMaintenanceOnlyReport && (
                          <tr>
                            <td className="border border-black px-2 py-[2px] font-bold text-center bg-[#f8fafc]">
                              Report Scope
                            </td>
                            <td className="border border-black px-2.5 py-[2px] text-center font-medium text-[9.5px]">
                              {filterBadgeLabel} &middot; Total: {filteredMaintenanceLogs.length} (
                              {maintenanceActiveCount} Active / {maintenanceRepairedCount}{' '}
                              Repaired)
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="border border-black mb-2 px-2.5 py-1 bg-[#f8fafc] flex items-center justify-between gap-3 shrink-0">
                    <img
                      src="/assets/gov_hospitals_header.png"
                      alt="Government Hospitals"
                      className="h-[22px] w-auto object-contain shrink-0"
                    />
                    <div className="text-[10.5px] font-bold uppercase tracking-wide text-center flex-1">
                      {isMaintenanceOnlyReport
                        ? 'MEDICAL EQUIPMENT MAINTENANCE, REPAIR LOG & FOLLOW-UP REPORT'
                        : 'MEDICAL EQUIPMENT MONTHLY INVENTORY'}{' '}
                      &mdash; {displayMonth} {displayYear}
                    </div>
                    <div className="text-[8.5px] text-slate-700 shrink-0">
                      Ward {displayWard} &middot; Page {pageIdx + 1}/{totalPages}
                    </div>
                  </div>
                )}

                {/* Tables on this Page */}
                <div className="space-y-2.5">
                  {pg.slices.map((slice, sIdx) => (
                    <EquipmentPdfTable
                      key={`${slice.tableName}-${sIdx}`}
                      slice={slice}
                      compact={pg.slices.length >= 3}
                    />
                  ))}

                  {pg.isMaintenanceOnlyPage && (
                    <EquipmentMaintenancePdfTable logs={pg.maintenanceSlice || []} />
                  )}
                </div>

                {/* Assigned Staff Verification & Sign-Off on Final Page */}
                {isLastPage && (
                  <div className="mt-2.5 shrink-0">
                    <EquipmentStaffSignOffTable
                      staffAssignments={staffAssignments}
                      subtitle={
                        isMaintenanceOnlyReport
                          ? 'Equipment Maintenance, Repair Log & Follow-Up Verification'
                          : 'Monthly Medical Equipment Inventory & Biomedical Status Check'
                      }
                    />
                  </div>
                )}
              </div>

              {/* Page Footer */}
              <div className="mt-1.5 pt-1 border-t border-slate-300 flex items-center justify-between text-[8px] text-slate-600 shrink-0">
                <span>
                  {isMaintenanceOnlyReport
                    ? 'Medical Equipment Maintenance, Repair Log & Follow-Up Report'
                    : 'Medical Equipment Monthly Inventory'}{' '}
                  &middot; Ward {displayWard} &middot; {displayMonth} {displayYear}
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

function EquipmentPdfTable({
  slice,
  compact,
}: {
  slice: TableSlice;
  compact: boolean;
}) {
  const { tableName, items, isContinuation, padTo26 } = slice;
  const sidebarTitle = isContinuation ? `${tableName} (cont.)` : tableName;
  const isTable1 = tableName === 'Table 1 – Patient Beds';
  const sidebarBg = isTable1 ? 'bg-[#f4e6e6]' : 'bg-[#f8fafc]';

  const padCell = compact ? 'py-[1.5px] px-1' : 'py-[2px] px-1.5';
  const padHdr = compact ? 'py-[2px] px-1' : 'py-[3px] px-1.5';
  const textSz = compact ? 'text-[8px] leading-[1.15]' : 'text-[8.8px] leading-[1.2]';
  const hdrTextSz = compact ? 'text-[8px] leading-[1.1]' : 'text-[8.5px] leading-[1.15]';

  // Render Table 1 – Patient Beds
  if (tableName === 'Table 1 – Patient Beds') {
    const elecBeds = items.filter((it) =>
      it.name.toLowerCase().includes('electronic')
    );
    const otherBeds = items.filter(
      (it) => !it.name.toLowerCase().includes('electronic')
    );

    return (
      <div>
        <div className="text-[8.5px] font-bold mb-[1px] pl-1">S/N</div>
        <div className="flex border-[1.5px] border-black">
          <div
            className={`w-[26px] shrink-0 border-r border-black ${sidebarBg} flex items-center justify-center p-1`}
          >
            <div className="appendix2-vertical font-bold text-[9.5px] text-center whitespace-nowrap">
              {sidebarTitle}
            </div>
          </div>
          <table className={`w-full border-collapse table-fixed ${textSz}`}>
            <thead>
              <tr className="bg-white font-bold text-center">
                <th className={`border-b border-r border-black ${padHdr} w-[22%]`}>Device</th>
                <th className={`border-b border-r border-black ${padHdr} w-[10%]`}>Count</th>
                <th className={`border-b border-r border-black ${padHdr} w-[20%]`}>
                  MOH Number
                </th>
                <th className={`border-b border-black ${padHdr} w-[48%]`}>Comments</th>
              </tr>
            </thead>
            <tbody>
              {elecBeds.map((item, idx) => (
                <tr key={item.id} className="bg-white">
                  {idx === 0 && (
                    <td
                      rowSpan={elecBeds.length}
                      className="border-t border-r border-black px-1.5 py-1 text-center align-middle font-bold"
                    >
                      <div className="appendix2-vertical mx-auto whitespace-nowrap text-[9.5px]">
                        CCU and SD Electronic Beds
                      </div>
                    </td>
                  )}
                  <td
                    className={`border-t border-r border-black ${padCell} text-center tabular-nums`}
                  >
                    {item.otherCode || idx + 1}
                  </td>
                  <td
                    className={`border-t border-r border-black ${padCell} text-center font-semibold tabular-nums`}
                  >
                    {item.batchOrSerial}
                  </td>
                  <td
                    className={`border-t border-black ${padCell} text-center break-words ${getRowAlertClass(
                      item
                    )}`}
                  >
                    {getEffectiveComment(item)}
                  </td>
                </tr>
              ))}
              {otherBeds.map((item, idx) => (
                <tr key={item.id} className="bg-white">
                  <td
                    className={`border-t border-r border-black ${padCell} text-center font-bold`}
                  >
                    {item.name}
                  </td>
                  <td
                    className={`border-t border-r border-black ${padCell} text-center tabular-nums`}
                  >
                    {item.otherCode || idx + 1}
                  </td>
                  <td
                    className={`border-t border-r border-black ${padCell} text-center font-semibold tabular-nums`}
                  >
                    {item.batchOrSerial}
                  </td>
                  <td
                    className={`border-t border-black ${padCell} text-center break-words ${getRowAlertClass(
                      item
                    )}`}
                  >
                    {getEffectiveComment(item)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // Render Table 2 – CCU Cardiac Monitors and Accessories
  if (tableName === 'Table 2 – CCU Cardiac Monitors and Accessories') {
    return (
      <div className="flex border-[1.5px] border-black">
        <div
          className={`w-[32px] shrink-0 border-r border-black ${sidebarBg} flex items-center justify-center p-0.5`}
        >
          <div className="appendix2-vertical font-bold text-[8px] text-center leading-[1.15]">
            {sidebarTitle}
          </div>
        </div>
        <table className={`w-full border-collapse table-fixed ${textSz}`}>
          <thead>
            <tr className={`bg-white font-bold text-center ${hdrTextSz}`}>
              <th className={`border-b border-r border-black ${padHdr} w-[9%]`}>Bed No.</th>
              <th className={`border-b border-r border-black ${padHdr} w-[13%]`}>
                Monitor MOH No.
              </th>
              <th className={`border-b border-r border-black ${padHdr} w-[12%]`}>ECG Cable</th>
              <th className={`border-b border-r border-black ${padHdr} w-[19%]`}>
                BP Cable+ Cuff
              </th>
              <th className={`border-b border-r border-black ${padHdr} w-[13%]`}>
                SPO2 Cable
              </th>
              <th className={`border-b border-r border-black ${padHdr} w-[10%]`}>
                Temp Probe
              </th>
              <th className={`border-b border-r border-black ${padHdr} w-[11%]`}>CVP Cable</th>
              <th className={`border-b border-black ${padHdr} w-[13%]`}>
                Nebulizer Adapter
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => {
              const ex = item.extraColumns || {};
              return (
                <tr key={item.id} className="bg-white">
                  <td
                    className={`border-t border-r border-black ${padCell} text-center tabular-nums font-medium`}
                  >
                    {item.otherCode || idx + 1}
                  </td>
                  <td
                    className={`border-t border-r border-black ${padCell} text-center font-bold tabular-nums`}
                  >
                    {item.batchOrSerial}
                  </td>
                  <td className={`border-t border-r border-black ${padCell} text-center font-bold`}>
                    {isEquipmentAccessoryTicked(ex.ecgCable) ? '✓' : ''}
                  </td>
                  <td className={`border-t border-r border-black ${padCell} text-center font-bold`}>
                    {isEquipmentAccessoryTicked(ex.bpCuff) ? '✓' : ''}
                  </td>
                  <td className={`border-t border-r border-black ${padCell} text-center font-bold`}>
                    {isEquipmentAccessoryTicked(ex.spo2Cable) ? '✓' : ''}
                  </td>
                  <td className={`border-t border-r border-black ${padCell} text-center font-bold`}>
                    {isEquipmentAccessoryTicked(ex.tempProbe) ? '✓' : ''}
                  </td>
                  <td className={`border-t border-r border-black ${padCell} text-center font-bold`}>
                    {isEquipmentAccessoryTicked(ex.cvpCable) ? '✓' : ''}
                  </td>
                  <td className={`border-t border-black ${padCell} text-center font-bold`}>
                    {isEquipmentAccessoryTicked(ex.nebulizerAdapter) ? '✓' : ''}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  // Render Table 3 – CCU Central
  if (tableName === 'Table 3 – CCU Central') {
    return (
      <div className="flex border-[1.5px] border-black">
        <div
          className={`w-[26px] shrink-0 border-r border-black ${sidebarBg} flex items-center justify-center p-0.5`}
        >
          <div className="appendix2-vertical font-bold text-[8.5px] text-center whitespace-nowrap">
            {sidebarTitle}
          </div>
        </div>
        <table className={`w-full border-collapse table-fixed ${textSz}`}>
          <thead>
            <tr className={`bg-white font-bold text-center ${hdrTextSz}`}>
              <th className={`border-b border-r border-black ${padHdr} w-[22%]`}>Device</th>
              <th className={`border-b border-r border-black ${padHdr} w-[18%]`}>
                MOH Number
              </th>
              <th className={`border-b border-black ${padHdr} w-[60%]`}>Comments</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="bg-white">
                <td
                  className={`border-t border-r border-black ${padCell} text-center font-bold`}
                >
                  {item.name}
                </td>
                <td
                  className={`border-t border-r border-black ${padCell} text-center font-bold whitespace-pre-line tabular-nums`}
                >
                  {item.batchOrSerial}
                </td>
                <td
                  className={`border-t border-black ${padCell} text-left break-words ${getRowAlertClass(
                    item
                  )}`}
                >
                  {getEffectiveComment(item)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // Render Table 4 – Crash Cart Trolleys
  if (tableName === 'Table 4 – Crash Cart Trolleys') {
    return (
      <div className="flex border-[1.5px] border-black">
        <div
          className={`w-[28px] shrink-0 border-r border-black ${sidebarBg} flex items-center justify-center p-0.5`}
        >
          <div className="appendix2-vertical font-bold text-[8px] text-center leading-[1.15]">
            {sidebarTitle}
          </div>
        </div>
        <table className={`w-full border-collapse table-fixed ${textSz}`}>
          <thead>
            <tr className={`bg-white font-bold text-center ${hdrTextSz}`}>
              <th className={`border-b border-r border-black ${padHdr} w-[8%]`}>Device</th>
              <th className={`border-b border-r border-black ${padHdr} w-[12%]`}>
                Trolley MOH No
              </th>
              <th className={`border-b border-r border-black ${padHdr} w-[18%]`}>
                Defibrillator (Brand + MOH Number)
              </th>
              <th className={`border-b border-r border-black ${padHdr} w-[15%]`}>
                O2 Cylinder
              </th>
              <th className={`border-b border-r border-black ${padHdr} w-[13%]`}>
                Cylinder O2 Flowmeter
              </th>
              <th className={`border-b border-r border-black ${padHdr} w-[11%]`}>
                O2 Regulator
              </th>
              <th className={`border-b border-r border-black ${padHdr} w-[12%]`}>
                Suction Regulator
              </th>
              <th className={`border-b border-black ${padHdr} w-[11%]`}>Suction Bottle</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const ex = item.extraColumns || {};
              return (
                <tr key={item.id} className="bg-white">
                  <td
                    className={`border-t border-r border-black ${padCell} text-center font-bold`}
                  >
                    {item.otherCode || item.name}
                  </td>
                  <td
                    className={`border-t border-r border-black ${padCell} text-center font-bold tabular-nums`}
                  >
                    {item.batchOrSerial}
                  </td>
                  <td
                    className={`border-t border-r border-black ${padCell} text-center font-bold break-words`}
                  >
                    {ex.defibrillator || item.name}
                  </td>
                  <td className={`border-t border-r border-black ${padCell} text-center font-bold`}>
                    {isEquipmentAccessoryTicked(ex.o2Cylinder) ? '✓' : ''}
                  </td>
                  <td className={`border-t border-r border-black ${padCell} text-center font-bold`}>
                    {isEquipmentAccessoryTicked(ex.o2Flowmeter) ? '✓' : ''}
                  </td>
                  <td className={`border-t border-r border-black ${padCell} text-center font-bold`}>
                    {isEquipmentAccessoryTicked(ex.o2Regulator) ? '✓' : ''}
                  </td>
                  <td className={`border-t border-r border-black ${padCell} text-center font-bold`}>
                    {isEquipmentAccessoryTicked(ex.suctionRegulator) ? '✓' : ''}
                  </td>
                  <td className={`border-t border-black ${padCell} text-center font-bold`}>
                    {isEquipmentAccessoryTicked(ex.suctionBottle) ? '✓' : ''}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  // Render Table 5 – Suction and Oxygenation Items
  if (tableName === 'Table 5 – Suction and Oxygenation Items') {
    const table5Totals = computeTable5ColumnTotals(items);
    return (
      <div className="flex border-[1.5px] border-black">
        <div
          className={`w-[28px] shrink-0 border-r border-black ${sidebarBg} flex items-center justify-center p-1`}
        >
          <div className="appendix2-vertical font-bold text-[9px] text-center whitespace-nowrap">
            {sidebarTitle}
          </div>
        </div>
        <table className={`w-full border-collapse table-fixed ${textSz}`}>
          <thead>
            <tr className={`bg-white font-bold text-center ${hdrTextSz}`}>
              <th className={`border-b border-r border-black ${padHdr} w-[16%]`}>
                Bed Number – Cubic Number - Others
              </th>
              <th className={`border-b border-r border-black ${padHdr} w-[12%]`}>
                Suction Regulator
              </th>
              <th className={`border-b border-r border-black ${padHdr} w-[13%]`}>
                Canister for Suction Liner
              </th>
              <th className={`border-b border-r border-black ${padHdr} w-[14%]`}>
                Canister Hanger
              </th>
              <th className={`border-b border-r border-black ${padHdr} w-[11%]`}>
                O2 Regulator Single
              </th>
              <th className={`border-b border-r border-black ${padHdr} w-[11%]`}>
                O2 Regulator Double
              </th>
              <th className={`border-b border-black ${padHdr} w-[23%]`}>Comments</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const ex = item.extraColumns || {};
              const rowLabel = item.otherCode || item.name;
              const isStoreRow = rowLabel === 'Store';
              const isTotalRow = rowLabel === 'Total';
              return (
                <tr key={item.id} className="bg-white">
                  <td
                    className={`border-t border-r border-black ${padCell} text-center font-bold`}
                  >
                    {rowLabel}
                  </td>
                  <td className={`border-t border-r border-black ${padCell} text-center font-bold`}>
                    {isTotalRow
                      ? table5Totals.suctionRegulator
                      : isStoreRow
                        ? ex.suctionRegulator || ''
                        : isEquipmentAccessoryTicked(ex.suctionRegulator)
                          ? '✓'
                          : ''}
                  </td>
                  <td className={`border-t border-r border-black ${padCell} text-center font-bold`}>
                    {isTotalRow
                      ? table5Totals.canisterLiner
                      : isStoreRow
                        ? ex.canisterLiner || ''
                        : isEquipmentAccessoryTicked(ex.canisterLiner)
                          ? '✓'
                          : ''}
                  </td>
                  <td className={`border-t border-r border-black ${padCell} text-center font-bold`}>
                    {isTotalRow
                      ? table5Totals.canisterHanger
                      : isStoreRow
                        ? ex.canisterHanger || ''
                        : isEquipmentAccessoryTicked(ex.canisterHanger)
                          ? '✓'
                          : ''}
                  </td>
                  <td className={`border-t border-r border-black ${padCell} text-center font-bold`}>
                    {isTotalRow
                      ? table5Totals.o2RegSingle
                      : isStoreRow
                        ? ex.o2RegSingle || ''
                        : isEquipmentAccessoryTicked(ex.o2RegSingle)
                          ? '✓'
                          : ''}
                  </td>
                  <td className={`border-t border-r border-black ${padCell} text-center font-bold`}>
                    {isTotalRow
                      ? table5Totals.o2RegDouble
                      : isStoreRow
                        ? ex.o2RegDouble || ''
                        : isEquipmentAccessoryTicked(ex.o2RegDouble)
                          ? '✓'
                          : ''}
                  </td>
                  <td
                    className={`border-t border-black ${padCell} text-left break-words ${getRowAlertClass(
                      item
                    )}`}
                  >
                    {getEffectiveComment(item)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  // Render Table 6 – ECG Machines
  if (tableName === 'Table 6 – ECG Machines') {
    return (
      <div className="flex border-[1.5px] border-black">
        <div
          className={`w-[28px] shrink-0 border-r border-black ${sidebarBg} flex items-center justify-center p-0.5`}
        >
          <div className="appendix2-vertical font-bold text-[8.5px] text-center leading-[1.15]">
            {sidebarTitle}
          </div>
        </div>
        <table className={`w-full border-collapse table-fixed ${textSz}`}>
          <thead>
            <tr className={`bg-white font-bold text-center ${hdrTextSz}`}>
              <th className={`border-b border-r border-black ${padHdr} w-[13%]`}>Number</th>
              <th className={`border-b border-r border-black ${padHdr} w-[24%]`}>Brand</th>
              <th className={`border-b border-r border-black ${padHdr} w-[18%]`}>
                MOH Number
              </th>
              <th className={`border-b border-black ${padHdr} w-[45%]`}>Comments</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={item.id} className="bg-white">
                <td
                  className={`border-t border-r border-black ${padCell} text-center tabular-nums font-semibold`}
                >
                  {item.otherCode || idx + 1}
                </td>
                <td
                  className={`border-t border-r border-black ${padCell} text-center font-bold`}
                >
                  {item.name}
                </td>
                <td
                  className={`border-t border-r border-black ${padCell} text-center font-bold tabular-nums`}
                >
                  {item.batchOrSerial}
                </td>
                <td
                  className={`border-t border-black ${padCell} text-left break-words ${getRowAlertClass(
                    item
                  )}`}
                >
                  {getEffectiveComment(item)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // Render Table 8 & Table 9 Syringe (Number | MOH Number | Comments)
  if (
    tableName === 'Table 8 - Alaris GP IV Infusion Pumps' ||
    tableName === 'Table 9 - Alaris Syringe IV Infusion Pumps'
  ) {
    return (
      <div className="flex border-[1.5px] border-black">
        <div
          className={`w-[28px] shrink-0 border-r border-black ${sidebarBg} flex items-center justify-center p-1`}
        >
          <div className="appendix2-vertical font-bold text-[9.5px] text-center whitespace-nowrap">
            {sidebarTitle}
          </div>
        </div>
        <table className={`w-full border-collapse table-fixed ${textSz}`}>
          <thead>
            <tr className={`bg-white font-bold text-center ${hdrTextSz}`}>
              <th className={`border-b border-r border-black ${padHdr} w-[16%]`}>Number</th>
              <th className={`border-b border-r border-black ${padHdr} w-[22%]`}>
                MOH Number
              </th>
              <th className={`border-b border-black ${padHdr} w-[62%]`}>Comments</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={item.id} className="bg-white">
                <td
                  className={`border-t border-r border-black ${padCell} text-center tabular-nums font-medium`}
                >
                  {item.otherCode || idx + 1}
                </td>
                <td
                  className={`border-t border-r border-black ${padCell} text-center font-bold tabular-nums`}
                >
                  {item.batchOrSerial}
                </td>
                <td
                  className={`border-t border-black ${padCell} text-left break-words ${getRowAlertClass(
                    item
                  )}`}
                >
                  {getEffectiveComment(item)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // Render Table 7- Telemetry System, Table 9 - Others, or any custom table (Number | Device | MOH Number | Comments)
  const paddedSlots =
    padTo26 && items.length < 26
      ? Array.from({ length: 26 - items.length }, (_, k) => items.length + k + 1)
      : [];

  return (
    <div className="flex border-[1.5px] border-black">
      <div
        className={`w-[28px] shrink-0 border-r border-black ${sidebarBg} flex items-center justify-center p-1`}
      >
        <div className="appendix2-vertical font-bold text-[9px] text-center whitespace-nowrap">
          {sidebarTitle}
        </div>
      </div>
      <table className={`w-full border-collapse table-fixed ${textSz}`}>
        <thead>
          <tr className={`bg-white font-bold text-center ${hdrTextSz}`}>
            <th className={`border-b border-r border-black ${padHdr} w-[12%]`}>Number</th>
            <th className={`border-b border-r border-black ${padHdr} w-[30%]`}>Device</th>
            <th className={`border-b border-r border-black ${padHdr} w-[20%]`}>
              MOH Number
            </th>
            <th className={`border-b border-black ${padHdr} w-[38%]`}>Comments</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => (
            <tr key={item.id} className="bg-white">
              <td
                className={`border-t border-r border-black ${padCell} text-center tabular-nums font-medium`}
              >
                {item.otherCode || idx + 1}
              </td>
              <td
                className={`border-t border-r border-black ${padCell} text-center font-bold break-words`}
              >
                {item.name}
              </td>
              <td
                className={`border-t border-r border-black ${padCell} text-center font-bold tabular-nums`}
              >
                {item.batchOrSerial}
              </td>
              <td
                className={`border-t border-black ${padCell} text-left break-words ${getRowAlertClass(
                  item
                )}`}
              >
                {getEffectiveComment(item)}
              </td>
            </tr>
          ))}
          {paddedSlots.map((slotNo) => (
            <tr key={`pad-${slotNo}`} className="bg-white">
              <td
                className={`border-t border-r border-black ${padCell} text-center tabular-nums font-medium`}
              >
                {slotNo}
              </td>
              <td className={`border-t border-r border-black ${padCell}`}>&nbsp;</td>
              <td className={`border-t border-r border-black ${padCell}`}>&nbsp;</td>
              <td className={`border-t border-black ${padCell}`}>&nbsp;</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EquipmentMaintenancePdfTable({
  logs,
}: {
  logs: EquipmentMaintenanceLogEntry[];
}) {
  return (
    <div className="border-[1.5px] border-black">
      <div className="bg-[#0f3d56] text-white px-2.5 py-[3px] text-[9px] font-bold uppercase tracking-wide flex items-center justify-between">
        <span>Medical Equipment Maintenance, Repair Log &amp; Follow-Up</span>
        <span className="font-normal normal-case text-[8px] text-slate-200">
          {logs.filter((l) => l.status !== 'Repaired / Returned').length} Open / Active &middot;{' '}
          {logs.filter((l) => l.status === 'Repaired / Returned').length} Repaired
        </span>
      </div>
      <table className="w-full border-collapse table-fixed text-[8.3px] leading-[1.2]">
        <thead>
          <tr className="bg-[#e8eff5] text-black font-bold text-center">
            <th className="border-t border-r border-black px-1 py-[3px] w-[4%]">#</th>
            <th className="border-t border-r border-black px-1.5 py-[3px] w-[17%] text-left">
              Device &amp; Table (Unit)
            </th>
            <th className="border-t border-r border-black px-1 py-[3px] w-[9%]">MOH No.</th>
            <th className="border-t border-r border-black px-1.5 py-[3px] w-[21%] text-left">
              Fault / Maintenance Issue
            </th>
            <th className="border-t border-r border-black px-1 py-[3px] w-[12%]">
              Reported Date / By
            </th>
            <th className="border-t border-r border-black px-1 py-[3px] w-[12%]">
              Work Order # / Dept
            </th>
            <th className="border-t border-r border-black px-1.5 py-[3px] w-[15%] text-left">
              Action Taken &amp; Follow-Up
            </th>
            <th className="border-t border-black px-1 py-[3px] w-[10%]">
              Status / Resolved
            </th>
          </tr>
        </thead>
        <tbody>
          {logs.length === 0 ? (
            <tr className="bg-white">
              <td
                colSpan={8}
                className="border-t border-black px-2 py-4 text-center text-slate-500"
              >
                No medical equipment maintenance or repair entries recorded.
              </td>
            </tr>
          ) : (
            logs.map((entry, idx) => {
              const isOpen = entry.status !== 'Repaired / Returned';
              return (
                <tr key={entry.id} className="bg-white align-top">
                  <td className="border-t border-r border-black px-1 py-[3px] text-center font-mono">
                    {idx + 1}
                  </td>
                  <td className="border-t border-r border-black px-1.5 py-[3px] break-words">
                    <div className="font-bold">{entry.equipmentName}</div>
                    <div className="text-[7.5px] text-slate-600">
                      {entry.tableName} ({entry.unit})
                    </div>
                  </td>
                  <td className="border-t border-r border-black px-1 py-[3px] text-center font-mono font-semibold">
                    {entry.mohNumber}
                  </td>
                  <td className="border-t border-r border-black px-1.5 py-[3px] break-words">
                    {entry.issueDescription}
                  </td>
                  <td className="border-t border-r border-black px-1 py-[3px] text-center">
                    <div className="font-mono">{formatShortDate(entry.reportedDate)}</div>
                    <div className="text-[7.5px] text-slate-600 break-words">
                      {entry.reportedBy}
                    </div>
                  </td>
                  <td className="border-t border-r border-black px-1 py-[3px] text-center">
                    <div className="font-mono font-semibold">{entry.workOrderNo || '—'}</div>
                    <div className="text-[7.5px] text-slate-600 break-words">
                      {entry.serviceDepartment}
                    </div>
                  </td>
                  <td className="border-t border-r border-black px-1.5 py-[3px] break-words">
                    {entry.actionTaken || '—'}
                  </td>
                  <td
                    className={`border-t border-black px-1 py-[3px] text-center ${
                      isOpen ? 'bg-[#fee2e2] text-[#7f1d1d] font-bold' : 'bg-[#ecfdf5] text-[#065f46]'
                    }`}
                  >
                    <div>{entry.status}</div>
                    {entry.resolvedDate && (
                      <div className="text-[7.3px] font-mono mt-[1px]">
                        {formatShortDate(entry.resolvedDate)}
                      </div>
                    )}
                    {entry.verifiedBy && (
                      <div className="text-[7.2px] mt-[1px]">{entry.verifiedBy}</div>
                    )}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

function EquipmentStaffSignOffTable({
  staffAssignments,
  subtitle = 'Monthly Medical Equipment Inventory & Biomedical Status Check',
}: {
  staffAssignments: StoreStaffAssignment[];
  subtitle?: string;
}) {
  return (
    <div className="border-[1.5px] border-black">
      <div className="bg-[#0f3d56] text-white px-2.5 py-[2.5px] text-[8.5px] font-bold uppercase tracking-wide flex items-center justify-between">
        <span>Assigned Staff Verification &amp; Sign-Off</span>
        <span className="font-normal normal-case text-[8px] text-slate-200">{subtitle}</span>
      </div>
      <table className="w-full border-collapse text-[8.5px]">
        <thead>
          <tr className="bg-[#e8eff5] text-slate-900 font-bold">
            <th className="border-t border-r border-slate-500 px-2 py-[2px] text-left w-[24%]">
              Staff Name
            </th>
            <th className="border-t border-r border-slate-500 px-1.5 py-[2px] text-left w-[20%]">
              Role
            </th>
            <th className="border-t border-r border-slate-500 px-1.5 py-[2px] text-left w-[30%]">
              Assigned Equipment Tables / Scope
            </th>
            <th className="border-t border-r border-slate-500 px-1.5 py-[2px] text-center w-[12%]">
              Date
            </th>
            <th className="border-t border-slate-500 px-1.5 py-[2px] text-center w-[14%]">
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
