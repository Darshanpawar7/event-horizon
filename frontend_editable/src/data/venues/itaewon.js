// The alley beside the Hamilton Hotel, Itaewon, Seoul — 29 October 2022.
//
// A reconstruction authored from published accounts and the official
// investigation, driven by the crowd-flow model. Nothing here is footage or
// a measurement of the real alley; it is the geometry of a narrow, sloping
// passage filled from both ends, which is the geometry of the disaster.

import { egressFieldToward } from '../venueModel.js';

const W = 1.1; // metres across the alley, per column — 3.3 m in all
const D = 15; // metres along the alley, per row — 45 m in all
const ASPHALT = '#C9C9C9';
const HOTEL = '#B9AFA0';
const SHOPS = '#A9B2BD';

const venue = {
  id: 'itaewon',
  name: 'Itaewon alley beside the Hamilton Hotel',
  short: 'ITAEWON ALLEY',
  place: 'Seoul, South Korea',
  kind: 'historic',
  cell: { width: W, depth: D },
  gap: { x: 0, z: 0 },
  cellArea: W * D,
  zoneLabels: {
    R1C1: 'Alley top · hotel wall side',
    R1C2: 'Alley top · from World Food Street',
    R1C3: 'Alley top · shop side',
    R2C1: 'Narrowing · hotel wall side',
    R2C2: 'Narrowing at the iron wall',
    R2C3: 'Narrowing · shop side',
    R3C1: 'Alley bottom · hotel wall side',
    R3C2: 'Alley bottom · toward Itaewon-ro',
    R3C3: 'Alley bottom · shop side',
  },
  // Steeply down into the alley from above Itaewon-ro; from the side the hotel block hides it.
  camera: { position: [2, 32, 34], target: [0, 0, -2] },
  ground: { color: ASPHALT, size: 140 },
  trees: false,
  structures: [
    // Itaewon-ro, the main road at the bottom, and World Food Street at the top
    { type: 'plane', x: 0, z: 34, w: 120, d: 20, color: '#8E9094', y: 0.01 },
    { type: 'plane', x: 0, z: -31, w: 80, d: 10, color: '#B5B5B0', y: 0.01 },
    // Hamilton Hotel block on the west, shops and bars on the east
    { type: 'box', x: -8.2, z: -2, w: 13, h: 14, d: 48, color: HOTEL },
    { type: 'box', x: -8.2, z: -2, w: 13.4, h: 0.5, d: 48.4, color: '#7F7468', y: 14 },
    { type: 'box', x: 7.6, z: -8, w: 12, h: 9, d: 20, color: SHOPS },
    { type: 'box', x: 7.6, z: 12, w: 12, h: 12, d: 18, color: '#9AA3B0' },
    { type: 'box', x: 7.6, z: -26, w: 12, h: 7, d: 12, color: '#B0B7C0' },
    // The temporary iron wall that narrowed the passage
    { type: 'box', x: -1.85, z: -4, w: 0.25, h: 2.4, d: 10, color: '#4B5563' },
    // Shop signs and a lamp post
    { type: 'box', x: 1.8, z: 4, w: 0.3, h: 1.0, d: 2.4, color: '#FF6600', y: 3.6 },
    { type: 'box', x: 1.8, z: -12, w: 0.3, h: 1.0, d: 2.4, color: '#8B5CF6', y: 4.2 },
    { type: 'box', x: 2.3, z: 20, w: 0.2, h: 6, d: 0.2, color: '#374151' },
    // Station exit 1 on the far side of Itaewon-ro
    { type: 'box', x: -22, z: 42, w: 6, h: 3, d: 4, color: '#3A4046' },
  ],
  labels: [
    { text: 'ITAEWON-RO (MAIN ROAD)', x: 0, z: 40, y: 2.5 },
    { text: 'WORLD FOOD STREET', x: 0, z: -34, y: 2.5 },
    { text: 'HAMILTON HOTEL', x: -8, z: -2, y: 16 },
    { text: 'IRON WALL NARROWING · 3.2 m', x: -4.5, z: -4, y: 4 },
    { text: 'ITAEWON STATION EXIT 1', x: -22, z: 42, y: 5 },
  ],
  cameras: [
    { id: 'camera-1', label: 'CCTV 01', x: 2.2, z: -24, rotation: Math.PI, covers: ['R1C1', 'R1C2', 'R1C3', 'R2C2'] },
    { id: 'camera-2', label: 'CCTV 02', x: 2.2, z: 24, rotation: 0, covers: ['R3C1', 'R3C2', 'R3C3', 'R2C2'] },
  ],
  gates: [
    { id: 'TOP', x: 0, z: -24.5, rotation: Math.PI, width: 3.3, zone: 'R1C2' },
    { id: 'BOTTOM', x: 0, z: 24.5, rotation: 0, width: 3.3, zone: 'R3C2' },
  ],
  gateLine: null,
  gateLabel: 'ALLEY ENDS',
  corridors: {
    inbound: [
      [0, 1.4, -30],
      [0, 2.6, -18],
      [0, 2.4, -8],
      [0, 2.2, 0],
    ],
    egress: [
      [0, 2.2, 0],
      [0, 2.6, 10],
      [0, 2.0, 20],
      [0, 1.4, 30],
    ],
    lateral: [
      [-1.4, 1.8, -2],
      [-0.5, 2.6, 0],
      [0.5, 2.6, 0.5],
      [1.4, 1.8, 2],
    ],
    reversal: [
      [0, 1.6, 28],
      [0, 3.4, 14],
      [0, 3.8, 0],
      [0, 3.0, -16],
    ],
    sceneMotion: [
      [-3, 5.5, 26],
      [0, 6.0, 0],
      [3, 5.5, -26],
    ],
  },
  controlRoom: null,
  incident: {
    date: '29 October 2022',
    time: '≈ 22:08–22:20 KST',
    title: 'Crowd crush in a sloping alley filled from both ends',
    deaths: '159',
    injured: '196',
    crowd: 'About 100,000 people in Itaewon for Halloween; an alley about 45 m long and 3.2 m wide at its narrowest',
    summary:
      'Halloween crowds filled a steep alley between Itaewon-ro and World Food Street from both ends. A temporary ' +
      'iron wall narrowed it further. With no crowd-control plan and 137 officers in the district, people kept ' +
      'entering from the top and the bottom until nobody could move; the slope pushed the mass downhill and ' +
      'people fell onto one another. The first emergency call reporting a dangerous crowd came at 18:34, nearly ' +
      'four hours earlier; at least 79 followed before 22:00.',
    factors: [
      'A narrow, sloping passage fed from both ends, so every arrival reduced everyone else\'s ability to leave.',
      'No central organiser and therefore no crowd-control plan; Seoul\'s real-time crowd prediction system was not activated.',
      'Repeated emergency calls describing compressive crowding went unanswered for hours.',
      'A temporary wall narrowed the alley to 3.2 m at the point where the crush formed.',
    ],
    consoleWouldShow: [
      'All nine alley cells above the congested band for most of an hour, with inflow at both ends and almost no outflow — the opposite of an egress.',
      'A projection crossing threshold long before 22:00, on a night when the first call about the crowd came in at 18:34.',
      'Persistent counterflow — the two-way movement that is the alley\'s whole problem — held as a standing verification alert.',
      'Speed collapsing to a shuffle and track coverage falling as the alley packed, so the count read as a floor rather than a figure to trust.',
    ],
    prevention: [
      'Make the alley one-way: hold entry at the Itaewon-ro end and move people out of the bottom, so the slope works for the outflow instead of against it.',
      'Meter entry from World Food Street at the top once the projection crosses threshold.',
      'Keep the bottom of the alley clear so the outflow has somewhere to go — the standard measure crowd-safety experts said would have prevented it.',
    ],
    caveats: [
      'Three 1.1 m columns stand in for a passage reported as about 4 m wide and 3.2 m at the narrowest; the slope is described, not modelled.',
      'Inflow rates are authored to reproduce a filling that in reality built over hours; the timeline covers the last thirty minutes.',
      'The investigation\'s findings concern policing and preparation; the console models only the crowd mechanics.',
    ],
    sources: [
      { label: 'Wikipedia — Seoul Halloween crowd crush', url: 'https://en.wikipedia.org/wiki/Seoul_Halloween_crowd_crush' },
      {
        label: 'The Korea Times — how Itaewon turned into the epicentre of tragedy',
        url: 'https://www.koreatimes.co.kr/southkorea/society/20221030/how-itaewon-turned-into-epicenter-of-tragedy',
      },
      {
        label: 'WADEM — Itaewon crowd crush case presentation (alley dimensions)',
        url: 'https://wadem.org/wp-content/uploads/2023/11/Itaewon-Crowd-Crush.pdf',
      },
    ],
  },
  defaultScenario: 'incident',
  timelines: {
    incident: {
      id: 'incident',
      kind: 'model',
      title: 'As reported — filled from both ends',
      summary:
        'People enter the alley from the top and the bottom. Two-way movement in a passage three people wide ' +
        'throttles both exits; density climbs past the crush-risk band and movement stops. T0 is the reported ' +
        'onset of the crush.',
      threshold: 36,
      thresholdRange: [8, 150],
      onsetDensity: 3.5,
      onsetLabel: 'involuntary movement at crush-risk density',
      mood: 'crush',
      direction: 'South with counterflow · down the slope',
      model: {
        start: -1800,
        end: 600,
        lengths: [15, 15, 15, 15, 15, 15, 15, 15, 15],
        initial: [25, 25, 25, 25, 25, 25, 25, 25, 25],
        // A Halloween crowd stands, looks and photographs; a third is not walking at any moment.
        statics: [0.3, 0.3, 0.3, 0.3, 0.3, 0.3, 0.3, 0.3, 0.3],
        links: [
          // Down the slope, up the slope, and spreading across the width.
          ...['C1', 'C2', 'C3'].flatMap((c) => [
            { from: `R1${c}`, to: `R2${c}`, width: 1.1, share: 0.5 },
            { from: `R2${c}`, to: `R3${c}`, width: 1.1, share: 0.5 },
            { from: `R3${c}`, to: `R2${c}`, width: 1.1, share: 0.5 },
            { from: `R2${c}`, to: `R1${c}`, width: 1.1, share: 0.5 },
          ]),
          ...['R1', 'R2', 'R3'].flatMap((r) => [
            { from: `${r}C1`, to: `${r}C2`, width: 15, share: 0.3 },
            { from: `${r}C2`, to: `${r}C1`, width: 15, share: 0.3 },
            { from: `${r}C2`, to: `${r}C3`, width: 15, share: 0.3 },
            { from: `${r}C3`, to: `${r}C2`, width: 15, share: 0.3 },
          ]),
        ],
        sources: [
          { id: 'top-entry', cell: 'R1C2', rate: [[-1800, 1.0], [-1200, 1.1], [-600, 1.5], [0, 1.5], [300, 0.6]] },
          { id: 'bottom-entry', cell: 'R3C2', rate: [[-1800, 1.0], [-1200, 1.2], [-600, 1.7], [0, 1.7], [300, 0.6]] },
        ],
        sinks: [
          // Both ends open onto streets that are themselves crowded, so each carries less than its width.
          ...['C1', 'C2', 'C3'].map((c) => ({ id: `top-exit-${c}`, cell: `R1${c}`, width: 0.35, share: 0.5, open: true })),
          ...['C1', 'C2', 'C3'].map((c) => ({ id: `bottom-exit-${c}`, cell: `R3${c}`, width: 0.35, share: 0.5, open: true })),
        ],
        counterflow: [
          [-1800, 0.35],
          [-900, 0.45],
          [-300, 0.5],
          [300, 0.5],
        ],
      },
      phases: [
        {
          t: -1800,
          label: '21:40 — the alley is already busy',
          note: 'About two people per square metre along the whole alley, entering from both ends. Emergency calls about the crowd began at 18:34.',
          signal: { source: 'Model', message: 'Crowd-flow model loaded for the Itaewon alley. Counts below are simulated from published accounts.' },
        },
        {
          t: -1200,
          label: 'Two-way flow',
          note: 'People walk up from Itaewon-ro while others walk down from World Food Street. Both exits are throttled by the opposing stream.',
          signal: { source: 'Flow', message: 'Opposed motion along the whole alley. Collective-movement rule raised for verification and held.' },
        },
        {
          t: -600,
          label: 'Narrowing in the congested band',
          note: 'The iron-wall section (R2) passes two people per square metre; walking speed is dropping toward a shuffle.',
          signal: { source: 'Forecast', message: 'R2C2 projected above threshold at +3 s. Both ends still admitting people.' },
        },
        {
          t: -180,
          label: 'Movement stopping',
          note: 'The alley is in the crush-risk band. People at the top cannot see the bottom; the slope carries the pressure downhill.',
          signal: { source: 'Tracker', message: 'Slow fraction above 90% in every cell. Track coverage falling as heads occlude.' },
        },
        {
          t: 0,
          label: '22:08 — the crush',
          note: 'People fall near the narrowing and others fall onto them. The crowd behind does not know and keeps pressing. Counts here are least reliable exactly when they matter most.',
          signal: { source: 'Forecast', message: 'R2C2 and R3C2 in the critical band. The count is a floor, not a measurement.' },
        },
        {
          t: 300,
          label: 'Held',
          note: 'Until entry stops at both ends, nothing changes. Nothing in this console resolves it.',
        },
      ],
    },
    intervention: {
      id: 'intervention',
      kind: 'model',
      branchOf: 'incident',
      title: 'With the warning acted on — the alley made one-way',
      summary:
        'The same model until the projection first crosses the operator threshold. Ninety seconds later the police ' +
        'close entry at the Itaewon-ro end, meter the top and clear the bottom so the alley drains downhill. ' +
        'Everything after the action is a counterfactual.',
      threshold: 36,
      thresholdRange: [8, 150],
      onsetDensity: 3.5,
      onsetLabel: 'involuntary movement at crush-risk density',
      mood: 'egress',
      direction: 'South · down the slope, one way',
      model: 'incident',
      intervention: {
        reactionSeconds: 90,
        title: 'Police act on the alley projection',
        note: 'Ninety seconds is a modest reaction time for a district with officers already on the street.',
        actions: [
          { type: 'close', source: 'bottom-entry', label: 'Close entry at the Itaewon-ro end: the alley is one-way downhill' },
          { type: 'meter', source: 'top-entry', rate: 0.3, label: 'Meter entry from World Food Street at the top' },
          ...['C1', 'C2', 'C3'].map((c) => ({ type: 'closeSink', sink: `top-exit-${c}`, label: null })),
          ...['C1', 'C2', 'C3'].map((c, index) => ({
            type: 'open',
            sink: `bottom-exit-${c}`,
            width: 1.1,
            label: index === 0 ? 'Clear the bottom of the alley so the outflow has somewhere to go' : null,
          })),
          ...['C1', 'C2', 'C3'].flatMap((c) => [
            { type: 'link', from: `R1${c}`, to: `R2${c}`, share: 0.9, label: null },
            { type: 'link', from: `R2${c}`, to: `R3${c}`, share: 0.9, label: null },
            { type: 'link', from: `R3${c}`, to: `R2${c}`, share: 0.02, label: null },
            { type: 'link', from: `R2${c}`, to: `R1${c}`, share: 0.02, label: null },
          ]),
          { type: 'counterflow', fraction: 0.08, label: 'Everyone moves the same way' },
        ],
        phases: [
          { dt: 0, label: 'Operator acts', note: 'Bottom entry closed, top metered, bottom exit cleared. The alley starts to drain downhill within a minute.', signal: { source: 'Operator', message: 'Alley made one-way after the projection crossed threshold (simulated action).' } },
          { dt: 120, label: 'Alley draining', note: 'With one direction of movement the full width of the bottom exit carries the crowd out; density falls through the congested band.' },
          { dt: 360, label: 'Metered flow', note: 'The alley carries the metered inflow at walking pace. Held arrivals wait on Itaewon-ro, outside the camera view.' },
        ],
      },
    },
  },
};

venue.egressField = egressFieldToward(venue, 'R3C2', [0, 1]);

export default venue;
