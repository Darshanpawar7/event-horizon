// New Delhi Railway Station, platforms 14/15 — 15 February 2025.
//
// A reconstruction authored from published accounts, driven by the crowd-flow
// model. Nothing here is footage, an official finding or a measurement of the
// real platform; cell sizes, counts and timings are approximations chosen so
// the mechanics reported by the inquiry and the press play out on screen.

import { egressFieldToward } from '../venueModel.js';

const W = 3.5; // metres across the island platform, per column
const D = 24; // metres along the platform, per row
const DECK = 7.2; // footbridge walking surface above platform level
const FOB_Z = -18; // footbridge centre line
const BED = -1.0; // track bed below platform level
const LENGTH = 140; // platform length drawn

/** Island and side platforms as [centre x, width]; 14/15 is the analysed island. */
const PLATFORMS = [
  [-19.9, 11.2], // 12/13
  [0, 11.5], // 14/15
  [18.6, 8.6], // 16, the side platform toward the Ajmeri Gate entrance
];
/** Track centre lines serving platforms 13, 14, 15 and 16, plus two yard lines. */
const TRACKS = [-35.8, -30.6, -12.6, -7.4, 7.4, 12.6];
/** Canopy runs either side of the footbridge and its stairs. */
const CANOPY_RUNS = [
  [-60, -20.5],
  [-1.5, 60],
];
/** Canopies as [centre x, width, light positions along z]. */
const CANOPIES = [
  [0, 12.4, [-46, -30, 10, 30, 50]],
  [-19.9, 12.0, [-40, 30]],
  [18.6, 9.4, [-40, 30]],
];
/** Where the three stair flights reach the footbridge. */
const STAIR_X = [-19.9, 0, 18.6];

function platforms() {
  const items = [];
  for (const [x, w] of PLATFORMS) {
    items.push({
      type: 'box',
      id: `platform-${x}`,
      x,
      z: 0,
      w,
      h: -BED,
      d: LENGTH,
      y: BED,
      texture: 'platform',
      repeat: [w / 2.5, LENGTH / 4],
      color: '#C9C2B4',
    });
    // Yellow safety line half a metre in from each platform edge
    for (const edge of [x - w / 2 + 0.55, x + w / 2 - 0.55]) {
      items.push({ type: 'plane', id: `safety-${edge}`, x: edge, z: 0, w: 0.14, d: LENGTH, y: 0.012, color: '#E8B10A' });
    }
  }
  for (const x of TRACKS) items.push({ type: 'rails', id: `track-${x}`, x, z: 0, length: LENGTH + 40, y: BED });
  return items;
}

function canopies() {
  const items = [];
  for (const [x, w, lightZ] of CANOPIES) {
    CANOPY_RUNS.forEach(([z0, z1], run) => {
      const columns = [];
      for (let z = z0 + 5; z < z1 - 2; z += 12) columns.push([x, z]);
      items.push({
        type: 'canopy',
        id: `canopy-${x}-${run}`,
        x,
        z: (z0 + z1) / 2,
        w,
        d: z1 - z0,
        y: 5.4,
        color: '#737A84',
        columns,
        lights: lightZ.filter((z) => z > z0 && z < z1).map((z) => [x, z]),
        lightIntensity: 95,
        // The analysed island's roof is drawn translucent so its crowd stays visible.
        opacity: x === 0 ? 0.28 : undefined,
      });
    });
  }
  return items;
}

function footbridge() {
  const items = [
    { type: 'box', id: 'fob-deck', x: 0, z: FOB_Z, w: 62, h: 0.6, d: 5.2, y: DECK - 0.6, texture: 'concrete', repeat: [12, 1], color: '#8C9097' },
    { type: 'box', id: 'fob-wall-north', x: 0, z: FOB_Z - 2.5, w: 62, h: 1.2, d: 0.2, y: DECK, color: '#A3A8AF' },
    {
      type: 'canopy',
      id: 'fob-roof',
      x: 0,
      z: FOB_Z,
      w: 62,
      d: 6,
      y: DECK + 3.2,
      color: '#5B616B',
      columns: [],
      lights: [
        [-12, FOB_Z],
        [12, FOB_Z],
      ],
      lightIntensity: 55,
    },
  ];
  // South parapet, open where the three stair flights arrive
  for (const [x0, x1] of [
    [-31, -21.7],
    [-18.1, -2],
    [2, 16.8],
    [20.4, 31],
  ]) {
    items.push({ type: 'box', id: `fob-wall-south-${x0}`, x: (x0 + x1) / 2, z: FOB_Z + 2.5, w: x1 - x0, h: 1.2, d: 0.2, y: DECK, color: '#A3A8AF' });
  }
  // Roof posts on the deck (clear of the stair openings) and piers down to the track bed
  for (let x = -28; x <= 28; x += 8) {
    items.push({ type: 'box', id: `fob-post-n-${x}`, x, z: FOB_Z - 2.5, w: 0.18, h: 3.2, d: 0.18, y: DECK, color: '#6B7079' });
    if (STAIR_X.every((sx) => Math.abs(sx - x) > 2.5)) {
      items.push({ type: 'box', id: `fob-post-s-${x}`, x, z: FOB_Z + 2.5, w: 0.18, h: 3.2, d: 0.18, y: DECK, color: '#6B7079' });
    }
  }
  for (const x of [-27, -10, 10, 24]) {
    items.push({ type: 'box', id: `fob-pier-${x}`, x, z: FOB_Z, w: 0.9, h: DECK - BED, d: 0.9, y: BED, texture: 'concrete', color: '#80858D' });
  }
  return items;
}

const venue = {
  id: 'ndls',
  name: 'New Delhi Railway Station — platforms 14/15',
  short: 'NDLS PF 14/15',
  place: 'New Delhi, India',
  kind: 'historic',
  cell: { width: W, depth: D },
  gap: { x: 0, z: 0 },
  cellArea: W * D,
  zoneLabels: {
    R1C1: 'Platform 14 edge · north',
    R1C2: 'Stair landing from the footbridge',
    R1C3: 'Platform 15 edge · north',
    R2C1: 'Platform 14 edge · stairs',
    R2C2: 'Foot of the footbridge stairs',
    R2C3: 'Platform 15 edge · stairs',
    R3C1: 'Platform 14 edge · south',
    R3C2: 'Platform centre · south',
    R3C3: 'Platform 15 edge · south',
  },
  camera: { position: [-30, 22, 34], target: [0, 2, -6] },
  lighting: {
    mode: 'night',
    background: '#060A14',
    sun: [-40, 60, 30],
    sunColor: '#9FB3D9',
    sunIntensity: 0.35,
    hemisphere: { sky: '#22324F', ground: '#2E2922', intensity: 0.55 },
    ambient: 0.12,
    fog: { color: '#0E1422', density: 0.0055 },
    exposure: 1.2,
  },
  ground: { color: '#55524B', size: 240, y: BED, texture: 'ballast', repeat: [60, 60] },
  overlay: { columnMax: 4.4 },
  // Close-up for the FOCUS button: the stair flight in profile, from above the platform 16
  // track. Seen from the front, the two LED boards hang across the very spot that crushed;
  // from the side they are edge-on and the people coming down into the crowd show clearly.
  views: {
    R2C2: { position: [22, 10, -1], target: [0, 2.4, -6] },
  },
  crowd: {
    // Winter evening, pilgrims bound for the Kumbh: shawls, saris, saffron and dark wool.
    palette: ['#7F1D1D', '#B91C1C', '#F97316', '#FDE68A', '#F5F5F4', '#57534E', '#44403C', '#1E3A8A', '#065F46', '#92400E', '#D97706', '#9CA3AF', '#1F2937', '#BE185D'],
  },
  trees: false,
  structures: [
    ...platforms(),
    ...canopies(),
    ...footbridge(),
    // Stair flights from the footbridge. The one onto 14/15 is where the crush happened.
    { type: 'stairs', id: 'stairs-14-15', x: 0, z: -8.75, w: 4.0, run: 13.5, rise: DECK, steps: 42, dir: -1, color: '#9A9EA5', parapet: true, walkable: true, zones: ['R2C2'] },
    { type: 'stairs', id: 'stairs-12-13', x: -19.9, z: -8.75, w: 3.6, run: 13.5, rise: DECK, steps: 42, dir: -1, color: '#9A9EA5', parapet: true, walkable: true },
    { type: 'stairs', id: 'stairs-16', x: 18.6, z: -8.75, w: 3.6, run: 13.5, rise: DECK, steps: 42, dir: -1, color: '#9A9EA5', parapet: true, walkable: true },
    // The Prayagraj Express standing at platform 14; platform 16 waits for the Special
    { type: 'train', id: 'prayagraj-express', x: -7.4, z: 4, length: 110, y: BED, color: '#1D4F8F' },
    // Station building on the Ajmeri Gate side
    { type: 'building', id: 'ajmeri-gate-block', x: 34, z: 0, w: 18, h: 14, d: 96, y: BED, wall: '#B9876A', cols: 24, rows: 4, lit: 0.6, seed: 41, roof: '#6B4E3D' },
    // Signage: the yellow station board, platform numbers and the two near-identical train boards
    { type: 'sign', id: 'name-board-s', text: 'नई दिल्ली  NEW DELHI', x: 0, z: 40, y: 3.4, w: 7.5, h: 1.3, background: '#F2C200', color: '#111111' },
    { type: 'sign', id: 'name-board-n', text: 'नई दिल्ली  NEW DELHI', x: 0, z: -44, y: 3.4, w: 7.5, h: 1.3, background: '#F2C200', color: '#111111', rotationY: Math.PI },
    { type: 'sign', id: 'pf-14', text: '14', x: -3.6, z: 16, y: 4.6, w: 1.2, h: 0.9, background: '#0B3D91', color: '#FFFFFF' },
    { type: 'sign', id: 'pf-15', text: '15', x: 3.6, z: 16, y: 4.6, w: 1.2, h: 0.9, background: '#0B3D91', color: '#FFFFFF' },
    { type: 'sign', id: 'pf-16', text: '16', x: 18.6, z: 16, y: 4.6, w: 1.2, h: 0.9, background: '#0B3D91', color: '#FFFFFF' },
    { type: 'sign', id: 'led-express', text: 'PRAYAGRAJ EXPRESS  →  PF 14', x: 0, z: 0.4, y: 4.7, w: 6.6, h: 0.62, background: '#090909', color: '#FF8A1F' },
    { type: 'sign', id: 'led-special', text: 'PRAYAGRAJ SPECIAL  →  PF 16', x: 0, z: 0.4, y: 4.0, w: 6.6, h: 0.62, background: '#090909', color: '#FF8A1F' },
    { type: 'lamp', id: 'stair-lamp', x: 2.6, z: -1.5, height: 5, rotationY: Math.PI, intensity: 50, distance: 18 },
  ],
  labels: [
    { text: 'PLATFORM 14 · PRAYAGRAJ EXPRESS STANDING', x: -7.4, z: -56, y: 6.5 },
    { text: 'PLATFORM 16 · "PRAYAGRAJ SPECIAL" EXPECTED', x: 18.6, z: -56, y: 4 },
    { text: 'FOOTBRIDGE STAIRS TO PF 14/15 · CRUSH SITE', x: 0, z: -9, y: 10.5 },
    { text: 'FOOT-OVER-BRIDGE', x: -22, z: FOB_Z, y: 12 },
  ],
  cameras: [
    { id: 'camera-1', label: 'CAM 01', x: 4.6, z: -64, rotation: 0, covers: ['R1C1', 'R1C2', 'R1C3', 'R2C2'] },
    { id: 'camera-2', label: 'CAM 02', x: -4.6, z: 64, rotation: Math.PI, covers: ['R3C1', 'R3C2', 'R3C3', 'R2C2'] },
  ],
  gates: [
    { id: 'STAIR-FOOT-W', x: -1.1, z: -1.2, rotation: 0, width: 1.8, zone: 'R2C2' },
    { id: 'STAIR-FOOT-E', x: 1.1, z: -1.2, rotation: 0, width: 1.8, zone: 'R2C2' },
  ],
  gateLine: null,
  gateLabel: 'FOOTBRIDGE STAIRS',
  corridors: {
    inbound: [
      [0, 1.6, 40],
      [0, 3.0, 24],
      [0, 2.8, 10],
      [0, 2.4, 0],
    ],
    egress: [
      [0, 2.4, 0],
      [0, 4.5, -6],
      [0, 7.5, -12],
      [0, DECK + 1.4, -18],
    ],
    lateral: [
      [-4.5, 2.2, 0],
      [-1.5, 3.0, 0.4],
      [1.5, 3.0, -0.4],
      [4.5, 2.2, 0],
    ],
    reversal: [
      [0, DECK + 1.6, -20],
      [0, 7.0, -12],
      [0, 4.0, -4],
      [0, 3.0, 8],
    ],
    sceneMotion: [
      [-5, 4.4, 30],
      [0, 4.6, 0],
      [5, 4.4, -30],
    ],
  },
  // People outside the analysed region, drawn muted and not counted
  ambient: [
    { x: 0, z: -48, w: 10, d: 20, count: 190, heading: 0, spread: 2.5 },
    { x: 0, z: 47, w: 10, d: 20, count: 200, heading: Math.PI, spread: 2.5 },
    { x: 18.6, z: 2, w: 7.4, d: 100, count: 650 },
    { x: -19.9, z: 2, w: 10, d: 100, count: 600 },
    { x: 0, z: FOB_Z, w: 54, d: 4.2, y: DECK, count: 200 },
  ],
  // Where the model's held arrivals wait
  holding: {
    'fob-descent': { x: -9, z: FOB_Z, w: 13, d: 4.2, y: DECK, front: '+x', label: 'ON THE FOOTBRIDGE' },
    'south-platform': { x: 0, z: 64, w: 10, d: 10, front: '-z', label: 'PLATFORM ENTRY (SOUTH)' },
    'north-platform': { x: 0, z: -64, w: 10, d: 10, front: '+z', label: 'PLATFORM ENTRY (NORTH)' },
  },
  controlRoom: null,
  incident: {
    date: '15 February 2025',
    time: '≈ 21:15–21:30 IST',
    title: 'Crowd crush on the footbridge stairs to platforms 14 and 15',
    deaths: '18',
    injured: '15',
    crowd: 'Platforms built for about 3,000 waiting passengers; some 2,600 general tickets were sold that day beyond the usual daily limit',
    summary:
      'Thousands of pilgrims were waiting for Prayagraj-bound trains for the Maha Kumbh. Two trains were ' +
      'running late, so platforms 14 and 15 were already full when the similarly named "Prayagraj Special" ' +
      'was due at platform 16. Passengers who feared missing their train surged for the footbridge; on the ' +
      'stairs between platforms 14 and 15 people slipped and fell onto those below, and the crowd behind ' +
      'kept pressing.',
    factors: [
      'Two delayed trains kept earlier passengers on the platforms while new ticket holders kept arriving.',
      'Near-identical train names ("Prayagraj Express" at 14, "Prayagraj Special" at 16) sent one crowd across another.',
      'The footbridge stairs — a few metres wide — were the only link between the platforms being crossed.',
      'No rope dividers, holding areas or additional security were in place that evening.',
    ],
    consoleWouldShow: [
      'The stair-foot cell (R2C2) rising faster than any other zone from the moment the crowd began to move, well before anyone on the stairs fell.',
      'A projection crossing the operator threshold while the stair foot was still in the congested band — the warning number in the timeline panel.',
      'Counterflow between people descending the footbridge and the crowd climbing it, which the collective-movement rule turns into a verification alert.',
      'Track coverage collapsing as the crowd packed, shown as a falling confidence figure rather than a confident count.',
    ],
    prevention: [
      'Hold the platform: a clear announcement that the Special boards only via the south footbridge removes the reason to rush the stairs.',
      'Stop general ticket sales and hold entry in the concourse until the stair foot clears — the holding areas Indian Railways introduced after the event.',
      'Make the stairs one-way upward and open the second flight, so nobody is descending into the crowd.',
    ],
    caveats: [
      'The platform geometry is schematic: three 3.5 m lanes by three 24 m segments around one stair flight. The real platform is longer and its stairs are positioned differently.',
      'Wikipedia lists at least 18 deaths; early press reports gave the same figure, and the railway inquiry\'s final findings may differ.',
      'Arrival rates, waiting fractions and stair capacity are authored estimates, not measurements.',
    ],
    sources: [
      {
        label: 'Wikipedia — 2025 New Delhi railway station crowd crush',
        url: 'https://en.wikipedia.org/wiki/2025_New_Delhi_railway_station_crowd_crush',
      },
      {
        label: 'The Tribune — porters recall the stampede; 18 dead, 15 injured',
        url: 'https://www.tribuneindia.com/news/delhi/carried-bodies-on-handcarts-porters-recall-stampede-horror',
      },
      {
        label: 'Deccan Herald — death toll hits 18',
        url: 'https://www.deccanherald.com/india/delhi/new-delhi-stampede-a-husbands-desperate-search-for-wife-as-death-toll-hits-18-3408404',
      },
    ],
  },
  defaultScenario: 'incident',
  timelines: {
    incident: {
      id: 'incident',
      kind: 'model',
      title: 'As reported — the rush for the footbridge',
      summary:
        'Waiting passengers begin moving toward the footbridge stairs when the Prayagraj Special is expected at ' +
        'platform 16. Inflow along the platform continues, people are still descending the same stairs, and the ' +
        'stair foot (R2C2) passes the crush-risk band. T0 is the reported time of the crush.',
      threshold: 140,
      thresholdRange: [40, 600],
      onsetDensity: 3.5,
      onsetLabel: 'involuntary movement at crush-risk density',
      mood: 'crush',
      direction: 'North · toward the footbridge stairs',
      model: {
        start: -600,
        end: 300,
        lengths: [14, 14, 14, 14, 14, 14, 14, 14, 14],
        initial: [60, 90, 60, 90, 110, 90, 70, 90, 70],
        // Most of the crowd is seated with luggage until the Special is expected;
        // then people get up over about a minute rather than all at once.
        statics: [
          [-600, [0.6, 0.6, 0.6, 0.6, 0.4, 0.6, 0.6, 0.6, 0.6]],
          [-150, [0.4, 0.4, 0.4, 0.4, 0.3, 0.4, 0.4, 0.4, 0.4]],
          [-120, [0.25, 0.25, 0.25, 0.25, 0.2, 0.25, 0.25, 0.25, 0.25]],
          [-90, [0.1, 0.1, 0.1, 0.1, 0.05, 0.1, 0.1, 0.1, 0.1]],
        ],
        links: [
          // Waiting passengers spread along the platform; the rush is a share that ramps up.
          ...[
            ['R1C1', 'R1C2', 24], ['R1C2', 'R1C1', 24], ['R1C2', 'R1C3', 24], ['R1C3', 'R1C2', 24],
            ['R2C1', 'R2C2', 24], ['R2C2', 'R2C1', 24], ['R2C2', 'R2C3', 24], ['R2C3', 'R2C2', 24],
            ['R3C1', 'R3C2', 24], ['R3C2', 'R3C1', 24], ['R3C2', 'R3C3', 24], ['R3C3', 'R3C2', 24],
            ['R1C1', 'R2C1', 3.5], ['R2C1', 'R1C1', 3.5], ['R2C1', 'R3C1', 3.5], ['R3C1', 'R2C1', 3.5],
            ['R1C2', 'R2C2', 3.5], ['R2C2', 'R1C2', 3.5], ['R2C2', 'R3C2', 3.5], ['R3C2', 'R2C2', 3.5],
            ['R1C3', 'R2C3', 3.5], ['R2C3', 'R1C3', 3.5], ['R2C3', 'R3C3', 3.5], ['R3C3', 'R2C3', 3.5],
          ].map(([from, to, width]) => ({ from, to, width, share: [[-600, 0.15], [-150, 0.05]] })),
          ...[
            ['R1C1', 'R1C2', 24], ['R1C3', 'R1C2', 24], ['R1C2', 'R2C2', 3.5],
            ['R2C1', 'R2C2', 24], ['R2C3', 'R2C2', 24],
            ['R3C1', 'R3C2', 24], ['R3C3', 'R3C2', 24], ['R3C2', 'R2C2', 3.5],
          ].map(([from, to, width]) => ({ from, to, width, share: [[-600, 0], [-150, 0.25], [-120, 0.45], [-90, 0.7]] })),
        ],
        sources: [
          { id: 'south-platform', cell: 'R3C2', rate: [[-600, 1.0], [-150, 1.6], [120, 0.6]] },
          { id: 'north-platform', cell: 'R1C2', rate: [[-600, 0.6], [-150, 0.9], [120, 0.3]] },
          // People coming down the same stairs onto the platform.
          { id: 'fob-descent', cell: 'R2C2', rate: [[-600, 0.3], [-150, 2.0], [60, 0.6]] },
        ],
        sinks: [
          // One stair flight effectively carries the upward movement; stairs are slower than level ground.
          { id: 'stairs-up', cell: 'R2C2', width: 2.6, share: [[-600, 0.1], [-150, 0.65]], open: true },
          { id: 'doors-14-north', cell: 'R1C1', width: 1.0, share: 0.05, open: true },
          { id: 'doors-14-centre', cell: 'R2C1', width: 1.0, share: 0.05, open: true },
          { id: 'doors-14-south', cell: 'R3C1', width: 1.0, share: 0.05, open: true },
        ],
        counterflow: [
          [-600, 0.05],
          [-150, 0.15],
          [-60, 0.35],
          [0, 0.45],
          [120, 0.3],
        ],
      },
      phases: [
        {
          t: -600,
          label: 'Platforms full, trains late',
          note: 'Two Prayagraj-bound trains are running late. Most passengers are seated with luggage; general ticket sales continue in the concourse.',
          signal: { source: 'Model', message: 'Crowd-flow model loaded for platforms 14/15. Counts below are simulated from published accounts.' },
        },
        {
          t: -150,
          label: 'The Special is expected at platform 16',
          note: 'Passengers who fear missing the "Prayagraj Special" get up and move for the footbridge stairs while others are still coming down them.',
          signal: { source: 'Tracker', message: 'Net track direction swings north toward the stair foot across all three platform segments.' },
        },
        {
          t: -90,
          label: 'Stair foot loading',
          note: 'Inflow from both ends of the platform converges on the one stair flight; the projection crosses the threshold here at the default setting.',
          signal: { source: 'Forecast', message: 'R2C2 projected above threshold at +3 s. Stair throughput far below arrivals.' },
        },
        {
          t: -30,
          label: 'Counterflow on the stairs',
          note: 'People descending meet the crowd climbing. Walking stops; the queue compresses against the stair foot.',
          signal: { source: 'Flow', message: 'Opposed motion on the stairs. Collective-movement rule raised for verification.' },
        },
        {
          t: 0,
          label: 'People fall on the stairs',
          note: 'The reported crush: those descending slip and fall onto others; the crowd behind keeps pressing. Counts here are least reliable exactly when they matter most.',
          signal: { source: 'Forecast', message: 'R2C2 in the critical band. Track coverage below 50%; the count is a floor, not a measurement.' },
        },
        {
          t: 120,
          label: 'Held',
          note: 'The condition persists until arrivals stop. Nothing in this console resolves it.',
        },
      ],
    },
    intervention: {
      id: 'intervention',
      kind: 'model',
      branchOf: 'incident',
      title: 'With the warning acted on — platform held, stairs one-way',
      summary:
        'The same model until the projection first crosses the operator threshold. Ninety seconds later station ' +
        'control holds the platform with a clear announcement, stops entry and descent, and makes the stairs ' +
        'one-way upward. Everything after the action is a counterfactual.',
      threshold: 140,
      thresholdRange: [40, 600],
      onsetDensity: 3.5,
      onsetLabel: 'involuntary movement at crush-risk density',
      mood: 'egress',
      direction: 'North · toward the footbridge stairs',
      model: 'incident',
      intervention: {
        reactionSeconds: 90,
        title: 'Station control acts on the projection',
        note: 'Ninety seconds is a generous reaction time for a control room that already has the number in front of it.',
        actions: [
          ...[
            ['R1C1', 'R1C2'], ['R1C3', 'R1C2'], ['R1C2', 'R2C2'],
            ['R2C1', 'R2C2'], ['R2C3', 'R2C2'],
            ['R3C1', 'R3C2'], ['R3C3', 'R3C2'], ['R3C2', 'R2C2'],
          ].map(([from, to], index) => ({
            type: 'link',
            from,
            to,
            share: 0.06,
            label: index === 0 ? 'Announce that the Special boards only via the south footbridge; nobody needs these stairs' : null,
          })),
          { type: 'release', statics: [0.5, 0.5, 0.5, 0.5, 0.3, 0.5, 0.5, 0.5, 0.5], label: 'Passengers stay where they are; the platform is held' },
          { type: 'close', source: 'fob-descent', label: 'Stop descent onto platforms 14/15 until the stair foot clears' },
          { type: 'meter', source: 'south-platform', rate: 0.3, label: 'Stop general ticket sales; hold entry in the concourse' },
          { type: 'meter', source: 'north-platform', rate: 0.2, label: 'Hold entry at the north end' },
          { type: 'open', sink: 'stairs-up', width: 5.6, label: 'Open both stair flights, one-way upward' },
          { type: 'counterflow', fraction: 0.06, label: 'No opposed movement on the stairs' },
        ],
        phases: [
          { dt: 0, label: 'Operator acts', note: 'Announcement, entry hold and one-way stairs applied together. The stair foot stops loading within a minute.', signal: { source: 'Operator', message: 'Platform held and stairs made one-way after the projection crossed threshold (simulated action).' } },
          { dt: 90, label: 'Stair foot draining', note: 'With no descent and both flights carrying people up, density at the stair foot falls back toward the congested band.' },
          { dt: 240, label: 'Normal boarding', note: 'The remaining crowd boards from the platform it is on. Held passengers wait in the concourse, outside the camera view.' },
        ],
      },
    },
  },
};

venue.egressField = egressFieldToward(venue, 'R2C2', [0, -1]);

export default venue;
