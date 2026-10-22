// New Delhi Railway Station, platforms 14/15 — 15 February 2025.
//
// A reconstruction authored from published accounts, driven by the crowd-flow
// model. Nothing here is footage, an official finding or a measurement of the
// real platform; cell sizes, counts and timings are approximations chosen so
// the mechanics reported by the inquiry and the press play out on screen.

import { egressFieldToward } from '../venueModel.js';

const W = 3.5; // metres across the island platform, per column
const D = 24; // metres along the platform, per row
const FOB_Z = -18; // the footbridge deck crosses above the north row
const CONCRETE = '#D9D4CC';
const TRACK = '#4A4A4A';
const CANOPY = '#8C8F94';

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
  camera: { position: [-40, 30, 48], target: [0, 1, -2] },
  ground: { color: '#BFBAB2', size: 160 },
  trees: false,
  structures: [
    // Island platform 14/15 and its neighbours
    { type: 'plane', x: 0, z: 0, w: 3 * W + 1, d: 110, color: CONCRETE, y: 0.01 },
    { type: 'plane', x: -24, z: 0, w: 10, d: 110, color: '#CFCAC2', y: 0.01 }, // platforms 12/13
    { type: 'plane', x: 24, z: 0, w: 10, d: 110, color: '#CFCAC2', y: 0.01 }, // platform 16
    // Tracks either side
    { type: 'plane', x: -9.5, z: 0, w: 7, d: 120, color: TRACK, y: -0.01 },
    { type: 'plane', x: 9.5, z: 0, w: 7, d: 120, color: TRACK, y: -0.01 },
    // Prayagraj Express standing at platform 14; platform 16 waiting for the Special
    { type: 'train', x: -9.5, z: 6, length: 96, color: '#1F4E8C' },
    // Platform canopy on columns
    { type: 'box', x: 0, z: 0, w: 3 * W + 2, h: 0.3, d: 104, color: CANOPY, y: 5.6 },
    ...[-45, -30, -15, 0, 15, 30, 45].flatMap((z) => [
      { type: 'box', x: -5, z, w: 0.35, h: 5.6, d: 0.35, color: '#5B5F66' },
      { type: 'box', x: 5, z, w: 0.35, h: 5.6, d: 0.35, color: '#5B5F66' },
    ]),
    // Foot-over-bridge deck crossing all platforms, with the stair flight down to R2C2
    { type: 'box', x: 0, z: FOB_Z, w: 66, h: 0.5, d: 5, color: '#6B7079', y: 7.2 },
    { type: 'box', x: 0, z: FOB_Z - 2.6, w: 66, h: 1.1, d: 0.15, color: '#9AA0A8', y: 7.7 },
    { type: 'box', x: 0, z: FOB_Z + 2.6, w: 66, h: 1.1, d: 0.15, color: '#9AA0A8', y: 7.7 },
    { type: 'ramp', x: 0, z: FOB_Z + 2.6 + 6, w: 5.6, length: 12, rise: 7.2, axis: 'z', dir: -1, color: '#7C828B' },
    ...[-33, -22, 22, 33].map((x) => ({ type: 'box', x, z: FOB_Z, w: 0.6, h: 7.2, d: 0.6, color: '#5B5F66' })),
    // Second footbridge further south, the route the Special's passengers were meant to take
    { type: 'box', x: 0, z: 52, w: 66, h: 0.5, d: 5, color: '#6B7079', y: 7.2 },
    { type: 'ramp', x: 0, z: 52 - 2.6 - 6, w: 5.6, length: 12, rise: 7.2, axis: 'z', dir: 1, color: '#7C828B' },
  ],
  labels: [
    { text: 'PLATFORM 14 · PRAYAGRAJ EXPRESS', x: -7, z: -40, y: 5 },
    { text: 'PLATFORM 15', x: 7, z: -40, y: 2.4 },
    { text: 'FOOT-OVER-BRIDGE', x: 0, z: FOB_Z, y: 10 },
    { text: 'PLATFORM 16 · "PRAYAGRAJ SPECIAL"', x: 24, z: -30, y: 2.4 },
    { text: 'SOUTH FOOTBRIDGE', x: 0, z: 52, y: 10 },
  ],
  cameras: [
    { id: 'camera-1', label: 'CAM 01', x: 0, z: -46, rotation: Math.PI, covers: ['R1C1', 'R1C2', 'R1C3', 'R2C2'] },
    { id: 'camera-2', label: 'CAM 02', x: 0, z: 46, rotation: 0, covers: ['R3C1', 'R3C2', 'R3C3', 'R2C2'] },
  ],
  gates: [
    { id: 'STAIR-A', x: -1.5, z: FOB_Z + 2.6 + 12.5, rotation: Math.PI, width: 2.8, zone: 'R2C2' },
    { id: 'STAIR-B', x: 1.5, z: FOB_Z + 2.6 + 12.5, rotation: Math.PI, width: 2.8, zone: 'R2C2' },
  ],
  gateLine: null,
  gateLabel: 'FOOTBRIDGE STAIRS',
  corridors: {
    inbound: [
      [0, 1.6, 40],
      [0, 3.2, 24],
      [0, 2.8, 12],
      [0, 2.4, 0],
    ],
    egress: [
      [0, 2.4, 0],
      [0, 3.4, -6],
      [0, 6.0, -12],
      [0, 8.4, -18],
    ],
    lateral: [
      [-4.5, 2.2, 0],
      [-1.5, 3.4, 0.4],
      [1.5, 3.4, -0.4],
      [4.5, 2.2, 0],
    ],
    reversal: [
      [0, 8.6, -20],
      [0, 6.2, -10],
      [0, 4.0, 2],
      [0, 3.0, 14],
    ],
    sceneMotion: [
      [-5, 6.5, 30],
      [0, 7.0, 0],
      [5, 6.5, -30],
    ],
  },
  controlRoom: [-26, -60],
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
