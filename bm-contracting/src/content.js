// All copy lives here. The live site could not be fetched while building this
// (network egress blocked), so the trade copy is written for a general
// contractor and should be swapped for the company's real wording.

export const SITE = {
  name: 'BM Contracting',
  url: 'https://bmcontracting-baqdv9bt.manus.space/',
  ctaLabel: 'Start a project',
};

export const FLOORS = 18;

// start/end are scroll progress (0..1). The 3D world is keyed to the same numbers.
export const CHAPTERS = [
  {
    id: 'arrival', label: 'Arrival', start: 0, end: 0.1, side: 'center',
    kicker: 'BM Contracting',
    title: ['We build', 'what’s next.'],
    body: 'One site. One scroll. Watch a project go from bare ground to lights-on, the way we actually deliver them.',
    tags: [],
  },
  {
    id: 'survey', label: 'Survey', start: 0.1, end: 0.24, side: 'left',
    kicker: '01 — Survey & Pre-construction',
    title: ['Every build starts', 'with ground truth.'],
    body: 'We walk the site, map the levels and lock down scope, budget and programme before a single shovel breaks ground.',
    tags: ['Site surveys', 'Feasibility', 'Budget & programme'],
  },
  {
    id: 'foundation', label: 'Groundworks', start: 0.24, end: 0.38, side: 'right',
    kicker: '02 — Groundworks & Foundations',
    title: ['Deep breath.', 'Deeper foundations.'],
    body: 'Excavation, drainage and reinforced concrete, poured right the first time. Everything above depends on what sits below.',
    tags: ['Excavation', 'Reinforced concrete', 'Drainage & utilities'],
  },
  {
    id: 'structure', label: 'Structure', start: 0.38, end: 0.62, side: 'left',
    kicker: '03 — Structure',
    title: ['Steel, concrete,', 'and a schedule', 'we keep.'],
    body: 'Floor by floor our crews and cranes raise the frame to plan: sequenced, safe and coordinated with every trade on site.',
    tags: ['Structural frame', 'Site safety', 'Trade coordination'],
    stat: 'floors',
  },
  {
    id: 'envelope', label: 'Envelope', start: 0.62, end: 0.78, side: 'right',
    kicker: '04 — Building Envelope',
    title: ['Skin, glass', 'and weather-tight.'],
    body: 'Facade, glazing and roofing close the building to the elements. The moment a frame becomes a place.',
    tags: ['Facade & glazing', 'Roofing', 'Waterproofing'],
  },
  {
    id: 'handover', label: 'Handover', start: 0.78, end: 0.92, side: 'left',
    kicker: '05 — Fit-out & Handover',
    title: ['Lights on.', 'Keys in hand.'],
    body: 'Interiors, systems commissioning and close-out, delivered complete, documented and ready for day one.',
    tags: ['Interior fit-out', 'Commissioning', 'Close-out & warranty'],
  },
  {
    id: 'contact', label: 'Your project', start: 0.92, end: 1, side: 'center', hold: true,
    kicker: '06 — Your project',
    title: ['Let’s build', 'something.'],
    body: 'Tell us what you’re planning. We’ll tell you how we’d build it.',
    tags: [],
    cta: true,
  },
];
