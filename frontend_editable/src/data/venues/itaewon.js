// The alley beside the Hamilton Hotel, Itaewon, Seoul — 29 October 2022.
//
// A reconstruction authored from published accounts and the official
// investigation, driven by the crowd-flow model. Nothing here is footage or
// a measurement of the real alley; it is the geometry of a narrow, sloping
// passage filled from both ends, which is the geometry of the disaster.

import { egressFieldToward } from '../venueModel.js';

const W = 1.1; // metres across the alley, per column — 3.3 m in all
const D = 15; // metres along the alley, per row — 45 m in all
const RISE = 4.0; // the alley climbs about 4 m from Itaewon-ro to World Food Street
const TOP = RISE; // World Food Street level above Itaewon-ro

/** Floor height along the alley, for placing fixtures on the slope. */
const floorAt = (z) => RISE * Math.min(1, Math.max(0, (22.5 - z) / 45));

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
  // From above Itaewon-ro, looking up the alley the way most photographs of the
  // night were taken. The camera stays inside the alley's 3.4 m width (x within
  // ±1.7), so neither the hotel nor the bars can hide any part of the floor.
  camera: { position: [1.5, 21, 52], target: [0, 2.2, 2] },
  floor: { low: 22.5, high: -22.5, rise: RISE, xMin: -2.2, xMax: 2.2 },
  lighting: {
    mode: 'night',
    background: '#05070F',
    sun: [30, 60, 40],
    sunColor: '#94A3C8',
    sunIntensity: 0.25,
    hemisphere: { sky: '#202A44', ground: '#2E2722', intensity: 0.5 },
    ambient: 0.11,
    fog: { color: '#0D1220', density: 0.006 },
    exposure: 1.2,
  },
  ground: { color: '#4A4D52', size: 200, texture: 'asphalt', repeat: [36, 36] },
  // A short beacon: the camera looks along the alley, so a tall one would stand
  // in front of the crowd further up.
  overlay: { columnMax: 4, beaconHeight: 12 },
  // Close-ups for the FOCUS button, each looking up the slope along the alley's
  // axis from a few storeys up, so the walls frame the crowd instead of hiding it.
  views: {
    R3C1: { position: [1.2, 10, 38], target: [0, 1.4, 14] },
    R3C2: { position: [1.2, 10, 38], target: [0, 1.4, 14] },
    R3C3: { position: [1.2, 10, 38], target: [0, 1.4, 14] },
    R2C1: { position: [0.4, 11, 21], target: [0, 2.6, 0] },
    R2C2: { position: [0.4, 11, 21], target: [0, 2.6, 0] },
    R2C3: { position: [0.4, 11, 21], target: [0, 2.6, 0] },
    R1C1: { position: [0.4, 13, 5], target: [0, 4.2, -15] },
    R1C2: { position: [0.4, 13, 5], target: [0, 4.2, -15] },
    R1C3: { position: [0.4, 13, 5], target: [0, 4.2, -15] },
  },
  crowd: {
    // Halloween costumes: black, purple, orange, white and red.
    palette: ['#111827', '#0F172A', '#4C1D95', '#7C3AED', '#EA580C', '#F97316', '#F3F4F6', '#B91C1C', '#1F2937', '#374151', '#065F46', '#111111', '#DB2777'],
  },
  trees: false,
  structures: [
    // The alley floor, climbing toward World Food Street
    { type: 'ramp', id: 'alley-floor', x: 0, z: 0, w: 3.4, length: 45, rise: RISE, axis: 'z', dir: -1, y: -0.15, texture: 'asphalt', repeat: [1, 12], color: '#8A8D92' },
    // World Food Street a level higher, and Itaewon-ro with its pavements
    { type: 'box', id: 'world-food-street', x: 0, z: -41.25, w: 140, h: TOP, d: 37.5, texture: 'plaza', repeat: [30, 8], color: '#8F8B84' },
    { type: 'road', id: 'itaewon-ro', x: 0, z: 36, w: 16, d: 180, rotationY: Math.PI / 2, crossing: -14 },
    { type: 'plane', id: 'north-pavement', x: 0, z: 25.25, w: 180, d: 5.5, y: 0.01, texture: 'plaza', repeat: [40, 2], color: '#A29E97' },
    { type: 'plane', id: 'south-pavement', x: 0, z: 47, w: 180, d: 6, y: 0.01, texture: 'plaza', repeat: [40, 2], color: '#A29E97' },
    // Hamilton Hotel on the west, the temporary iron wall, bars and shops on the east
    { type: 'building', id: 'hamilton-hotel', x: -9.7, z: 0.5, w: 16, h: 24, d: 43, wall: '#B59F82', cols: 8, rows: 8, lit: 0.62, seed: 11, roof: '#5B5148' },
    { type: 'sign', id: 'hotel-sign', text: 'HAMILTON HOTEL', x: -9.7, z: 22.1, y: 20.5, w: 12, h: 1.8, background: '#161616', color: '#F2E3B3' },
    { type: 'box', id: 'iron-wall', x: -1.82, z: 0, w: 0.14, h: 2.9, d: 10, y: floorAt(0) - 0.3, color: '#4B5563', metalness: 0.5, roughness: 0.6 },
    { type: 'building', id: 'bars-north', x: 6.2, z: -14, w: 9, h: 9, d: 16, wall: '#6D6A80', cols: 4, rows: 3, lit: 0.8, glow: '#FFB4E6', seed: 21 },
    { type: 'building', id: 'bars-middle', x: 6.2, z: 3, w: 9, h: 12, d: 17, wall: '#585D66', cols: 4, rows: 4, lit: 0.7, seed: 22 },
    { type: 'building', id: 'bars-south', x: 6.2, z: 17.5, w: 9, h: 10, d: 10, wall: '#7A6455', cols: 4, rows: 3, lit: 0.75, seed: 23 },
    { type: 'sign', id: 'neon-bar', text: 'BAR', x: 1.62, z: -12, y: floorAt(-12) + 2.6, w: 2.2, h: 0.9, background: '#1B0B2E', color: '#FF4FD8', rotationY: -Math.PI / 2 },
    { type: 'sign', id: 'neon-pub', text: 'PUB 24H', x: 1.62, z: 2, y: floorAt(2) + 2.6, w: 2.6, h: 0.8, background: '#04202A', color: '#22D3EE', rotationY: -Math.PI / 2 },
    { type: 'sign', id: 'neon-halloween', text: 'HALLOWEEN', x: 1.62, z: 14, y: floorAt(14) + 2.6, w: 3.6, h: 0.9, background: '#1F0D02', color: '#FB923C', rotationY: -Math.PI / 2 },
    // The surrounding blocks
    { type: 'building', id: 'west-block', x: -32, z: 2, w: 28, h: 15, d: 40, wall: '#6B6460', cols: 10, rows: 5, lit: 0.55, seed: 31 },
    { type: 'building', id: 'east-block', x: 23, z: 3, w: 24, h: 16, d: 38, wall: '#5D6470', cols: 8, rows: 5, lit: 0.6, seed: 32 },
    { type: 'building', id: 'south-block-w', x: -24, z: 58, w: 30, h: 17, d: 12, wall: '#5C5F66', cols: 10, rows: 5, lit: 0.6, seed: 33 },
    { type: 'building', id: 'south-block-e', x: 14, z: 58, w: 34, h: 21, d: 12, wall: '#4B5563', cols: 11, rows: 6, lit: 0.55, seed: 34 },
    { type: 'building', id: 'north-block-w', x: -18, z: -44, w: 30, h: 12, d: 14, y: TOP, wall: '#6E6A62', cols: 10, rows: 4, lit: 0.7, seed: 35 },
    { type: 'building', id: 'north-block-e', x: 16, z: -44, w: 28, h: 10, d: 14, y: TOP, wall: '#5F5A70', cols: 9, rows: 3, lit: 0.75, glow: '#FFC6A8', seed: 36 },
    // Itaewon Station exit 1, beside the hotel
    { type: 'box', id: 'exit-1', x: -10, z: 25.6, w: 4, h: 2.6, d: 3, color: '#2B2F36' },
    { type: 'box', id: 'exit-1-canopy', x: -10, z: 25.6, w: 4.4, h: 0.15, d: 3.4, y: 2.6, color: '#9CC3F0', metalness: 0.3, roughness: 0.2 },
    { type: 'sign', id: 'exit-1-sign', text: 'ITAEWON STN · EXIT 1', x: -10, z: 27.35, y: 3.25, w: 4.2, h: 0.6, background: '#9A5B13', color: '#FFFFFF' },
    // Street lights, a light in the alley, a police car and a taxi on Itaewon-ro
    { type: 'lamp', id: 'lamp-1', x: -30, z: 28.5, height: 8, rotationY: -Math.PI / 2, intensity: 140 },
    { type: 'lamp', id: 'lamp-2', x: -6, z: 28.5, height: 8, rotationY: -Math.PI / 2, intensity: 140 },
    { type: 'lamp', id: 'lamp-3', x: 14, z: 28.5, height: 8, rotationY: -Math.PI / 2, intensity: 140 },
    { type: 'lamp', id: 'lamp-4', x: 34, z: 28.5, height: 8, rotationY: -Math.PI / 2, intensity: 140 },
    { type: 'lamp', id: 'alley-lamp', x: 1.55, z: 6, y: floorAt(6), height: 4.5, rotationY: Math.PI, intensity: 80, distance: 16 },
    { type: 'lamp', id: 'alley-lamp-upper', x: -1.55, z: -12, y: floorAt(-12), height: 4.5, rotationY: 0, intensity: 70, distance: 16 },
    { type: 'vehicle', id: 'police-car', kind: 'police', x: 18, z: 33, rotationY: Math.PI / 2 },
    { type: 'vehicle', id: 'taxi', kind: 'van', x: -24, z: 39, rotationY: Math.PI / 2, color: '#F59E0B' },
  ],
  labels: [
    { text: 'ITAEWON-RO', x: -40, z: 36, y: 2.5 },
    { text: 'WORLD FOOD STREET', x: 0, z: -30, y: TOP + 3 },
    { text: 'HAMILTON HOTEL', x: -9.7, z: 0.5, y: 26.5 },
    { text: 'NARROWEST POINT · 3.2 m', x: -4.2, z: 0, y: 6 },
    { text: 'ITAEWON STATION EXIT 1', x: -10, z: 25.6, y: 5.2 },
  ],
  cameras: [
    { id: 'camera-1', label: 'CCTV 01', x: 2.3, z: -23.5, y: TOP, rotation: 0, covers: ['R1C1', 'R1C2', 'R1C3', 'R2C2'] },
    { id: 'camera-2', label: 'CCTV 02', x: 2.3, z: 24, rotation: Math.PI, covers: ['R3C1', 'R3C2', 'R3C3', 'R2C2'] },
  ],
  gates: [
    { id: 'TOP', x: 0, z: -23.6, y: TOP, rotation: Math.PI, width: 3.3, zone: 'R1C2' },
    { id: 'BOTTOM', x: 0, z: 23.6, rotation: 0, width: 3.3, zone: 'R3C2' },
  ],
  gateLine: null,
  gateLabel: 'ALLEY ENDS',
  // Beside the alley mouth rather than over the alley itself.
  gateLabelAt: [4.5, 7, 25.5],
  corridors: {
    inbound: [
      [0, 5.6, -30],
      [0, 4.9, -15],
      [0, 4.0, -5],
      [0, 3.5, 0],
    ],
    egress: [
      [0, 3.5, 0],
      [0, 2.7, 10],
      [0, 2.0, 20],
      [0, 1.4, 30],
    ],
    lateral: [
      [-1.4, 3.2, -2],
      [-0.5, 3.8, 0],
      [0.5, 3.8, 0.5],
      [1.4, 3.2, 2],
    ],
    reversal: [
      [0, 1.6, 28],
      [0, 3.0, 14],
      [0, 4.2, 0],
      [0, 5.6, -16],
    ],
    sceneMotion: [
      [-3, 7, 26],
      [0, 8, 0],
      [3, 9, -26],
    ],
  },
  // People outside the analysed region, drawn muted and not counted
  ambient: [
    { x: -19, z: -28, w: 30, d: 7, y: TOP, count: 300 },
    { x: 25, z: -28, w: 20, d: 7, y: TOP, count: 200 },
    { x: -22, z: 25.3, w: 38, d: 4.6, count: 170 },
    { x: 22, z: 25.3, w: 38, d: 4.6, count: 170 },
    { x: 0, z: 47, w: 90, d: 5, count: 240 },
  ],
  // Where the model's held arrivals wait
  holding: {
    'bottom-entry': { x: 0, z: 33, w: 14, d: 8, front: '-z', label: 'ITAEWON-RO' },
    // East of the alley top, so its label stays clear of the twin controls from the street camera.
    'top-entry': { x: 8.5, z: -28.5, w: 12, d: 6, y: TOP, front: '-x', label: 'WORLD FOOD STREET' },
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
      'Three 1.1 m columns stand in for a passage reported as about 4 m wide and 3.2 m at the narrowest. The slope is drawn as about 4 m over the 45 m alley (roughly 9 %); published descriptions of the gradient vary.',
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
