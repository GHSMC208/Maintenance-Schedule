import type {
  EnvironmentalCheckItem,
  EnvironmentalFollowUpRow,
  EnvironmentalResponse,
  EnvironmentalRoundMeta,
  RoundCheckResult,
  StoreStaffAssignment,
} from '../types/ward';

export interface EnvironmentalSubQuestionDef {
  id: string;
  code: string;
  text: string;
  defaultResponse: EnvironmentalResponse;
}

export interface EnvironmentalGroupDef {
  id: string;
  domainHeading?: string;
  filterDomain: string;
  title: string;
  defaultComment: string;
  pageGroup: 1 | 2 | 3 | 4 | 5 | 6;
  questions: EnvironmentalSubQuestionDef[];
}

export const ENVIRONMENTAL_DOMAIN_FILTERS = [
  'Patient Safety',
  'FIRE SAFETY',
  'Safe Environment',
  'Infection Control',
  'Hazardous Materials and Waste',
  'Medical Equipment',
  'Utility Systems',
  'Security',
  'Equipment/Furniture/Fixture',
] as const;

export const ENVIRONMENTAL_GH0030_GROUPS: EnvironmentalGroupDef[] = [
  // PAGE 1 — Patient Safety
  {
    id: 'gh-corridors',
    domainHeading: 'Patient Safety',
    filterDomain: 'Patient Safety',
    title: 'Are Corridors Kept Clear To Allow Adequate Space?',
    defaultComment: '',
    pageGroup: 1,
    questions: [
      {
        id: 'gh-corr-a',
        code: 'A',
        text: 'To allow ambulation of patients and visitors to walk safely?',
        defaultResponse: 'yes',
      },
      {
        id: 'gh-corr-b',
        code: 'B',
        text: 'To allow carts, wheelchairs, and beds to pass with adequate clearance?',
        defaultResponse: 'yes',
      },
      {
        id: 'gh-corr-c',
        code: 'C',
        text: 'Are floors clear and slip-resistant?',
        defaultResponse: 'yes',
      },
    ],
  },
  {
    id: 'gh-medications',
    filterDomain: 'Patient Safety',
    title: 'Are Medications Secure & Locked?',
    defaultComment: '',
    pageGroup: 1,
    questions: [
      {
        id: 'gh-med-a',
        code: 'A',
        text: 'Are medication rooms / carts locked when not attended?',
        defaultResponse: 'yes',
      },
      {
        id: 'gh-med-b',
        code: 'B',
        text: 'Are all medications storage areas secured?',
        defaultResponse: 'yes',
      },
      {
        id: 'gh-med-c',
        code: 'C',
        text: 'Medications are within expiry date',
        defaultResponse: 'yes',
      },
      {
        id: 'gh-med-d',
        code: 'D',
        text: 'Open vials are labelled and dated.',
        defaultResponse: 'yes',
      },
      {
        id: 'gh-med-e',
        code: 'E',
        text: 'Food items are not stored with drugs.',
        defaultResponse: 'yes',
      },
      {
        id: 'gh-med-f',
        code: 'F',
        text: 'Food stored in refrigerators are labelled correctly.',
        defaultResponse: 'yes',
      },
      {
        id: 'gh-med-g',
        code: 'G',
        text: 'Formula and other nutritional products have current expiration dates.',
        defaultResponse: 'yes',
      },
    ],
  },

  // PAGE 2 — FIRE SAFETY
  {
    id: 'gh-egress',
    domainHeading: 'FIRE SAFETY',
    filterDomain: 'FIRE SAFETY',
    title: 'Are The Means Of Egress/Exit Doors?',
    defaultComment: '',
    pageGroup: 2,
    questions: [
      {
        id: 'gh-egr-a',
        code: 'A',
        text: 'Clearly & correctly marked?',
        defaultResponse: 'yes',
      },
      {
        id: 'gh-egr-b',
        code: 'B',
        text: 'Exit Sign lights working?',
        defaultResponse: 'yes',
      },
      {
        id: 'gh-egr-c',
        code: 'C',
        text: 'Clear of debris & equipment?',
        defaultResponse: 'yes',
      },
      {
        id: 'gh-egr-d',
        code: 'D',
        text: 'Is equipment all to one side of the hall?',
        defaultResponse: 'na',
      },
    ],
  },
  {
    id: 'gh-extinguishers',
    filterDomain: 'FIRE SAFETY',
    title: 'Do All Identified Fire Extinguisher Locations?',
    defaultComment: '',
    pageGroup: 2,
    questions: [
      {
        id: 'gh-ext-a',
        code: 'A',
        text: 'Is the location clearly marked?',
        defaultResponse: 'yes',
      },
      {
        id: 'gh-ext-b',
        code: 'B',
        text: 'Have current inspection tags?',
        defaultResponse: 'yes',
      },
      {
        id: 'gh-ext-c',
        code: 'C',
        text: 'Are safety seals present?',
        defaultResponse: 'yes',
      },
      {
        id: 'gh-ext-d',
        code: 'D',
        text: 'Have 3-foot access clearance? (i.e., all around the extinguisher)',
        defaultResponse: 'yes',
      },
    ],
  },
  {
    id: 'gh-pull-stations',
    filterDomain: 'FIRE SAFETY',
    title: 'Are The Fire Alarm Pull Stations?',
    defaultComment: '',
    pageGroup: 2,
    questions: [
      {
        id: 'gh-pull-a',
        code: 'A',
        text: 'Accessible with 3-foot clearance?',
        defaultResponse: 'yes',
      },
      {
        id: 'gh-pull-b',
        code: 'B',
        text: 'In good condition?',
        defaultResponse: 'yes',
      },
    ],
  },
  {
    id: 'gh-combustibles',
    filterDomain: 'FIRE SAFETY',
    title: 'Are Combustible Materials: (e.g., cardboard boxes, paper, linen, waste)?',
    defaultComment: '-',
    pageGroup: 2,
    questions: [
      {
        id: 'gh-comb-a',
        code: 'A',
        text: 'Stored in the proper type of containers?',
        defaultResponse: 'yes',
      },
      {
        id: 'gh-comb-b',
        code: 'B',
        text: 'Kept in minimum quantities necessary for daily use?',
        defaultResponse: 'yes',
      },
      {
        id: 'gh-comb-c',
        code: 'C',
        text: 'Properly labelled?',
        defaultResponse: 'yes',
      },
      {
        id: 'gh-comb-d',
        code: 'D',
        text: 'Kept in a safe, designated location?',
        defaultResponse: 'yes',
      },
    ],
  },
  {
    id: 'gh-fire-doors',
    filterDomain: 'FIRE SAFETY',
    title: 'Fire / Smoke / Stair Doors',
    defaultComment: '',
    pageGroup: 2,
    questions: [
      {
        id: 'gh-fd-a',
        code: 'A',
        text: 'Are the doors free of being propped / held / wedged open?',
        defaultResponse: 'yes',
      },
      {
        id: 'gh-fd-b',
        code: 'B',
        text: 'Are doorways clear to close? (i.e., nothing in the path of the door)',
        defaultResponse: 'yes',
      },
      {
        id: 'gh-fd-c',
        code: 'C',
        text: 'Do fire & stairwell doors latch firmly (& maintain closure)?',
        defaultResponse: 'yes',
      },
      {
        id: 'gh-fd-d',
        code: 'D',
        text: 'Are door interrupters working? (where installed)',
        defaultResponse: 'yes',
      },
      {
        id: 'gh-fd-e',
        code: 'E',
        text: 'Are door wedges present? (use of wedges are not allowed)',
        defaultResponse: 'yes',
      },
      {
        id: 'gh-fd-f',
        code: 'F',
        text: 'Are staff familiar with RACE and PASS protocol',
        defaultResponse: 'yes',
      },
    ],
  },

  // PAGE 3 — Fire Safety Cont. + Safe Environment
  {
    id: 'gh-fire-cont',
    filterDomain: 'FIRE SAFETY',
    title: 'Fire Safety, Cont.',
    defaultComment: '-',
    pageGroup: 3,
    questions: [
      {
        id: 'gh-fc-a',
        code: 'A',
        text: 'Are items stored at least 18” below sprinkler head?',
        defaultResponse: 'yes',
      },
      {
        id: 'gh-fc-b',
        code: 'B',
        text: 'Are portable space heaters present in any areas of the department?(All removed)',
        defaultResponse: 'yes',
      },
      {
        id: 'gh-fc-c',
        code: 'C',
        text: 'There is no indicators of smoking in the area?',
        defaultResponse: 'yes',
      },
    ],
  },
  {
    id: 'gh-floors',
    domainHeading: 'Safe Environment',
    filterDomain: 'Safe Environment',
    title: 'Are The Floors / Hallways: Tile Carpet?',
    defaultComment: '-',
    pageGroup: 3,
    questions: [
      {
        id: 'gh-fl-a',
        code: 'A',
        text: 'In good condition?',
        defaultResponse: 'yes',
      },
      {
        id: 'gh-fl-b',
        code: 'B',
        text: 'Clean & dry?',
        defaultResponse: 'yes',
      },
      {
        id: 'gh-fl-c',
        code: 'C',
        text: 'Free from tripping / fall hazards?',
        defaultResponse: 'yes',
      },
      {
        id: 'gh-fl-d',
        code: 'D',
        text: 'Wet floor signs used?',
        defaultResponse: 'yes',
      },
      {
        id: 'gh-fl-e',
        code: 'E',
        text: 'Carpet lying flat on floor?',
        defaultResponse: 'na',
      },
      {
        id: 'gh-fl-f',
        code: 'F',
        text: 'Wires or phone/computer cables across walkways?',
        defaultResponse: 'no',
      },
    ],
  },
  {
    id: 'gh-walls',
    filterDomain: 'Safe Environment',
    title: 'Are The Walls:',
    defaultComment: '',
    pageGroup: 3,
    questions: [
      {
        id: 'gh-wl-a',
        code: 'A',
        text: 'In good condition? (i.e., undamaged, free of holes or water damage)',
        defaultResponse: 'yes',
      },
      {
        id: 'gh-wl-b',
        code: 'B',
        text: 'There are no exposed wires/cables present?',
        defaultResponse: 'yes',
      },
      {
        id: 'gh-wl-c',
        code: 'C',
        text: 'Electrical boxes / outlets / covers are not damaged or missing?',
        defaultResponse: 'yes',
      },
    ],
  },
  {
    id: 'gh-ceiling-tiles',
    filterDomain: 'Safe Environment',
    title: 'Are Ceiling Tiles:',
    defaultComment: '',
    pageGroup: 3,
    questions: [
      {
        id: 'gh-ct-a',
        code: 'A',
        text: 'In place & in good condition (Ceiling tiles are not damaged or soiled)',
        defaultResponse: 'no',
      },
      {
        id: 'gh-ct-b',
        code: 'B',
        text: 'Clean and free of dirt, mold, and dust',
        defaultResponse: 'no',
      },
      {
        id: 'gh-ct-c',
        code: 'C',
        text: 'Free of evidence of water staining & dry?',
        defaultResponse: 'no',
      },
    ],
  },

  // PAGE 4 — Infection Control + Hazardous Chemicals
  {
    id: 'gh-infection-control',
    filterDomain: 'Infection Control',
    title: 'Are Safe / Proper Infection Control Practices Used By Staff?',
    defaultComment: '',
    pageGroup: 4,
    questions: [
      {
        id: 'gh-ic-a',
        code: 'A',
        text: 'Are needle boxes less than 75% full?',
        defaultResponse: 'yes',
      },
      {
        id: 'gh-ic-b',
        code: 'B',
        text: 'Is clean linen covered?',
        defaultResponse: 'yes',
      },
      {
        id: 'gh-ic-c',
        code: 'C',
        text: 'Is the clean linen kept separate from the dirty?',
        defaultResponse: 'yes',
      },
      {
        id: 'gh-ic-d',
        code: 'D',
        text: 'Is medication labelled & dated? (Any outdated items found?)',
        defaultResponse: 'yes',
      },
      {
        id: 'gh-ic-e',
        code: 'E',
        text: 'Are refrigerators appropriately labelled (e.g., “pt. Food only” / “meds only” / “staff food only”)?',
        defaultResponse: 'yes',
      },
      {
        id: 'gh-ic-f',
        code: 'F',
        text: 'Do refrigerators containing medications and nourishment have current temperature logs?',
        defaultResponse: 'yes',
      },
      {
        id: 'gh-ic-g',
        code: 'G',
        text: 'Are all cardboard boxes off of the floor & no shipping boxes on the unit?',
        defaultResponse: 'yes',
      },
      {
        id: 'gh-ic-h',
        code: 'H',
        text: 'Are blood borne pathogen precautions in evidence? (e.g., gloves, masks, gowns, separation of waste)',
        defaultResponse: 'yes',
      },
      {
        id: 'gh-ic-i',
        code: 'I',
        text: 'Is personal protective equipment readily available & in good condition?',
        defaultResponse: 'yes',
      },
      {
        id: 'gh-ic-j',
        code: 'J',
        text: 'Are the areas under the sinks free of patient contact items?',
        defaultResponse: 'yes',
      },
      {
        id: 'gh-ic-k',
        code: 'K',
        text: 'Are compressed gases stored / used in this area secured (where gas cylinders are required…they are locked and labelled)?',
        defaultResponse: 'yes',
      },
      {
        id: 'gh-ic-l',
        code: 'L',
        text: 'Are there less than (2-4) o2 tank stored in the surveyed area? (2-4 e tanks)',
        defaultResponse: 'yes',
      },
    ],
  },
  {
    id: 'gh-hazmat-chemicals',
    domainHeading: 'Hazardous Materials and Waste',
    filterDomain: 'Hazardous Materials and Waste',
    title: 'Are Hazardous Chemicals Used In This Area?',
    defaultComment: '',
    pageGroup: 4,
    questions: [
      {
        id: 'gh-hc-a',
        code: 'A',
        text: 'Are they stored correctly (e.g., flammable, corrosive storage areas)?',
        defaultResponse: 'na',
      },
      {
        id: 'gh-hc-b',
        code: 'B',
        text: 'Are they labelled correctly?',
        defaultResponse: 'na',
      },
      {
        id: 'gh-hc-c',
        code: 'C',
        text: 'Are they disposed of correctly?',
        defaultResponse: 'na',
      },
      {
        id: 'gh-hc-d',
        code: 'D',
        text: 'Eyewash station (where present) is functional and checked weekly.',
        defaultResponse: 'na',
      },
      {
        id: 'gh-hc-e',
        code: 'E',
        text: 'There is a current chemical inventory, corresponding MSDS sheets and staff are aware of location (where chemicals are held in the unit. Current MSDS sheet must be accessible)',
        defaultResponse: 'na',
      },
    ],
  },

  // PAGE 5 — Medical Wastes + Medical Equipment + Utility Systems
  {
    id: 'gh-medical-wastes',
    filterDomain: 'Hazardous Materials and Waste',
    title: 'Are Medical Wastes:',
    defaultComment: '',
    pageGroup: 5,
    questions: [
      {
        id: 'gh-mw-a',
        code: 'A',
        text: 'Is clinical waste placed in yellow bio hazardous bags?',
        defaultResponse: 'yes',
      },
      {
        id: 'gh-mw-b',
        code: 'B',
        text: 'Is infectious wastes placed in appropriate red biohazard bags (alginate bag, red linen bag)?',
        defaultResponse: 'yes',
      },
      {
        id: 'gh-mw-c',
        code: 'C',
        text: 'Properly stored & disposed of?',
        defaultResponse: 'yes',
      },
      {
        id: 'gh-mw-d',
        code: 'D',
        text: 'Properly separated & segregated? (Any inappropriate disposal found?)',
        defaultResponse: 'yes',
      },
    ],
  },
  {
    id: 'gh-medical-equipment',
    domainHeading: 'Medical Equipment',
    filterDomain: 'Medical Equipment',
    title: 'Is There Medical Equipment In Use Or Used In This Area?',
    defaultComment: '-',
    pageGroup: 5,
    questions: [
      {
        id: 'gh-me-a',
        code: 'A',
        text: 'Are inspection tags current?',
        defaultResponse: 'yes',
      },
    ],
  },
  {
    id: 'gh-emergency-power',
    domainHeading: 'Utility Systems',
    filterDomain: 'Utility Systems',
    title: 'Are Emergency Power Outlets:',
    defaultComment: '',
    pageGroup: 5,
    questions: [
      {
        id: 'gh-ep-a',
        code: 'A',
        text: 'Clearly marked with red covers / outlets?',
        defaultResponse: 'yes',
      },
      {
        id: 'gh-ep-b',
        code: 'B',
        text: 'Being used for critical equipment only?',
        defaultResponse: 'no',
      },
    ],
  },
  {
    id: 'gh-exposed-wiring',
    filterDomain: 'Utility Systems',
    title: 'Is There Any Exposed Wiring or Electrical Panels?',
    defaultComment: '-',
    pageGroup: 5,
    questions: [
      {
        id: 'gh-ew-a',
        code: 'A',
        text: 'Are circuit breakers labelled?',
        defaultResponse: 'yes',
      },
      {
        id: 'gh-ew-b',
        code: 'B',
        text: 'Are electricity panels kept locked?',
        defaultResponse: 'yes',
      },
      {
        id: 'gh-ew-c',
        code: 'C',
        text: 'Are any outlets / electrical box cover plates damaged or missing?',
        defaultResponse: 'no',
      },
    ],
  },
  {
    id: 'gh-med-gas-valves',
    filterDomain: 'Utility Systems',
    title: 'Medical Gas Zone Valves and Main Valves:',
    defaultComment: '',
    pageGroup: 5,
    questions: [
      {
        id: 'gh-mg-a',
        code: 'A',
        text: 'Are valves marked with identity & locations served?',
        defaultResponse: 'yes',
      },
      {
        id: 'gh-mg-b',
        code: 'B',
        text: 'Is the valve accessible & not blocked?',
        defaultResponse: 'yes',
      },
      {
        id: 'gh-mg-c',
        code: 'C',
        text: 'Do staff know how to shutoff oxygen valves in the case of a fire emergency?',
        defaultResponse: 'yes',
      },
    ],
  },

  // PAGE 6 — Security + Equipment/Furniture/Fixture
  {
    id: 'gh-security',
    domainHeading: 'Security',
    filterDomain: 'Security',
    title: 'Security',
    defaultComment: '',
    pageGroup: 6,
    questions: [
      {
        id: 'gh-sec-a',
        code: 'A',
        text: 'Are all employees wearing ID badges in plain view?',
        defaultResponse: 'yes',
      },
      {
        id: 'gh-sec-b',
        code: 'B',
        text: 'Can staff explain how to get help in a security emergency?',
        defaultResponse: 'yes',
      },
      {
        id: 'gh-sec-c',
        code: 'C',
        text: 'Are protective measures in sensitive areas (such as ICU, NICU, paediatric, OR) active & are staff able to explain their role in protecting the patients?',
        defaultResponse: 'yes',
      },
      {
        id: 'gh-sec-d',
        code: 'D',
        text: 'Can staff explain their role in a Code Pink (Alert for missing Baby)? (if any)',
        defaultResponse: 'na',
      },
    ],
  },
  {
    id: 'gh-furniture-fixture',
    domainHeading: 'Equipment/Furniture/Fixture',
    filterDomain: 'Equipment/Furniture/Fixture',
    title: 'Equipment/Furniture/Fixture',
    defaultComment: '',
    pageGroup: 6,
    questions: [
      {
        id: 'gh-ff-a',
        code: 'A',
        text: 'Refrigerators are clean',
        defaultResponse: 'yes',
      },
      {
        id: 'gh-ff-b',
        code: 'B',
        text: 'Patient furniture is undamaged with no visible hazards.',
        defaultResponse: 'yes',
      },
      {
        id: 'gh-ff-c',
        code: 'C',
        text: 'Office furniture is undamaged with no visible hazards.',
        defaultResponse: 'no',
      },
      {
        id: 'gh-ff-d',
        code: 'D',
        text: 'Ladders or stepping stools are not present in the area.',
        defaultResponse: 'yes',
      },
    ],
  },
];

export function responseToResult(response?: EnvironmentalResponse): RoundCheckResult {
  if (!response) return 'pending';
  return response === 'no' ? 'action-needed' : 'pass';
}

export function createInitialEnvironmentalStaff(today: string): StoreStaffAssignment[] {
  const [y, m, d] = today.split('-');
  const slashDate = y && m && d ? `${d}/${m}/${y}` : '';
  return [
    {
      id: 'env-staff-1',
      staffName: 'RN Sara Al-Mansoor',
      role: 'Safety Champion RN',
      assignedSections: 'Patient Safety, Fire Safety & Infection Control',
      checkedDate: slashDate,
      signature: '',
    },
    {
      id: 'env-staff-2',
      staffName: 'RN Khalid Hassan',
      role: 'Charge Nurse / Fire & Utility Lead',
      assignedSections: 'Safe Environment, HazMat, Utilities & Security',
      checkedDate: slashDate,
      signature: '',
    },
  ];
}

export function createInitialFollowUpRows(): EnvironmentalFollowUpRow[] {
  return [
    {
      id: 'env-fu-1',
      issue: 'NET BROKEN AND BOX TO PAINT ALSO, fan to be repaired',
      date: '20/9/2025',
      responsibleDept: 'MAINTENANCE INFORMED',
      workOrderSubmitted: true,
      dateCompleted: 'PENDING',
      highlightRed: true,
    },
    {
      id: 'env-fu-2',
      issue: 'BED 11 BEDSIDE SUCTION CATHETER BASKET BROKEN',
      date: '2/8/2026',
      responsibleDept: 'INFORMED',
      workOrderSubmitted: true,
      dateCompleted: 'PENDING',
    },
    {
      id: 'env-fu-3',
      issue: 'SD BED 1 HEADLIGHT NEED TO CHANGE',
      date: '30/07/2026',
      responsibleDept: 'INFORMED',
      workOrderSubmitted: true,
      dateCompleted: 'PENDING',
    },
    {
      id: 'env-fu-4',
      issue: 'SD BED 1 TOILET DOOR NEED REPAIR',
      date: '30/07/2026',
      responsibleDept: 'INFORMED',
      workOrderSubmitted: true,
      dateCompleted: 'PENDING',
    },
    {
      id: 'env-fu-5',
      issue: 'BED1 SOCKET BROKEN',
      date: '30/07/26',
      responsibleDept: 'INFORMED',
      workOrderSubmitted: false,
      dateCompleted: 'PENDING',
    },
    {
      id: 'env-fu-6',
      issue: 'STAFF TOILET DOOR LOCK TO FIX',
      date: '30/07/26',
      responsibleDept: 'INFORMED',
      workOrderSubmitted: false,
      dateCompleted: 'PENDING',
    },
    {
      id: 'env-fu-7',
      issue: 'SD BED 6 MAIN DOOR REPAIR',
      date: '30/07/2026',
      responsibleDept: 'INFORMED',
      workOrderSubmitted: true,
      dateCompleted: 'pending',
    },
  ];
}

export function createInitialEnvironmentalRoundMeta(today: string): EnvironmentalRoundMeta {
  const [y, m, d] = today.split('-');
  const dt = new Date(Number(y), Math.max(0, Number(m) - 1), Number(d));
  const monthYear = Number.isNaN(dt.getTime())
    ? ''
    : dt.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const groupComments: Record<string, string> = {};
  for (const grp of ENVIRONMENTAL_GH0030_GROUPS) {
    groupComments[grp.id] = grp.defaultComment;
  }

  return {
    departmentInspected: 'Ward 208 (CCU & Step-Down)',
    inspectionDateMonth: monthYear || 'November 2026',
    managerHead: 'Head Nurse / Ward 208 Manager',
    groupComments,
    followUpTableHeader: '30/07/',
    followUpRows: createInitialFollowUpRows(),
    followUpFooterNote: 'NOTE: ALL pending are informed and reminded to maintenance',
    staffAssignments: createInitialEnvironmentalStaff(today),
  };
}

export function createInitialEnvironmentalChecks(today: string): EnvironmentalCheckItem[] {
  const items: EnvironmentalCheckItem[] = [];
  for (const grp of ENVIRONMENTAL_GH0030_GROUPS) {
    for (const q of grp.questions) {
      items.push({
        id: q.id,
        section: grp.filterDomain,
        domainHeading: grp.domainHeading,
        groupId: grp.id,
        groupTitle: grp.title,
        questionCode: q.code,
        title: q.text,
        location: 'Ward 208 (CCU & SD)',
        frequency: 'monthly',
        response: q.defaultResponse,
        result: responseToResult(q.defaultResponse),
        measuredValue: q.defaultResponse.toUpperCase(),
        lastCheckedDate: today,
        inspector: 'RN Sara Al-Mansoor',
        notes: '',
      });
    }
  }
  return items;
}

export function migrateLegacyEnvironmentalChecks(
  checks: EnvironmentalCheckItem[] | undefined,
  today: string
): EnvironmentalCheckItem[] {
  if (!Array.isArray(checks) || checks.length === 0) {
    return createInitialEnvironmentalChecks(today);
  }
  const hasGhChecks = checks.some((c) => Boolean(c.groupId && c.groupId.startsWith('gh-')));
  if (!hasGhChecks) {
    return createInitialEnvironmentalChecks(today);
  }

  const byId = new Map(checks.map((c) => [c.id, c]));
  const seeded = createInitialEnvironmentalChecks(today).map((item) => {
    const existing = byId.get(item.id);
    if (!existing) return item;
    const response: EnvironmentalResponse =
      existing.response ||
      (existing.result === 'action-needed' ? 'no' : existing.result === 'pass' ? 'yes' : 'yes');
    return {
      ...item,
      response,
      result: responseToResult(response),
      lastCheckedDate: existing.lastCheckedDate || item.lastCheckedDate,
      inspector: existing.inspector || item.inspector,
      notes: existing.notes || '',
      measuredValue: existing.measuredValue || response.toUpperCase(),
    };
  });

  const officialIds = new Set(seeded.map((s) => s.id));
  const customExtras = checks.filter((c) => !officialIds.has(c.id));
  return [...seeded, ...customExtras];
}
