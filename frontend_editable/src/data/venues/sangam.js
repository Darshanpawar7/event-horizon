// Sangam nose, Maha Kumbh Mela, Prayagraj — 29 January 2025 (Mauni Amavasya).
//
// A reconstruction of the approach to the bathing edge at the confluence,
// authored from published accounts and driven by the crowd-flow model.
// Nothing here is footage, an official finding or a measurement of the real
// ghat; the death toll itself is disputed, and the brief says so.

import { egressFieldToward } from '../venueModel.js';

const W = 18; // metres across the spit, per column
const D = 20; // metres along the approach, per row
const SAND = '#CDBD94';
const GANGA = '#6F6A52'; // silty and brown
const YAMUNA = '#2F5E66'; // greener and darker: the two colours meet at the Sangam
const CONFLUENCE = '#4B6660';
const BAMBOO = '#B08D57';

/** Akhara camps along the approach: tents with saffron flags. */
const TENTS = (() => {
  const tents = [];
  for (const side of [-1, 1]) {
    for (let z = -72; z >= -122; z -= 10) {
      for (const dx of [15, 22]) {
        const odd = Math.abs(Math.round(z / 10)) % 2 === 1;
        tents.push({ type: 'tent', id: `tent-${side}-${z}-${dx}`, x: side * dx, z, w: 6, d: 6, h: 2.6, color: '#EFE6D2', roof: odd ? '#E8731A' : '#B45309', flag: '#F97316' });
      }
    }
  }
  return tents;
})();

/** Saffron flags lining the Akhara route. */
const FLAGS = (() => {
  const flags = [];
  for (let z = -40; z >= -124; z -= 12) {
    for (const x of [-7.5, 7.5]) flags.push({ type: 'flag', id: `flag-${x}-${z}`, x, z, height: 7, color: '#F97316' });
  }
  return flags;
})();

/** The barricade line between the approach and the holding area, with its three gaps. */
const BARRICADE_LINE = [
  [-23.1, 7.8],
  [-9, 15.5],
  [9, 15.5],
  [23.1, 7.8],
].map(([x, length]) => ({ type: 'barrier', id: `barricade-${x}`, x, z: -10, length, color: BAMBOO }));

const venue = {
  id: 'sangam',
  name: 'Sangam nose, Maha Kumbh Mela',
  short: 'SANGAM NOSE',
  place: 'Prayagraj, India',
  kind: 'historic',
  cell: { width: W, depth: D },
  gap: { x: 0, z: 0 },
  cellArea: W * D,
  zoneLabels: {
    R1C1: 'Approach · Ganga bank side',
    R1C2: 'Approach from the Akhara route',
    R1C3: 'Approach · Yamuna bank side',
    R2C1: 'Barricade line · Ganga side',
    R2C2: 'Holding area at the barricade line',
    R2C3: 'Barricade line · Yamuna side',
    R3C1: 'Bathing edge · Ganga side',
    R3C2: 'Sangam nose bathing edge',
    R3C3: 'Bathing edge · Yamuna side',
  },
  camera: { position: [-50, 46, 70], target: [0, 0, 2] },
  lighting: {
    // Mauni Amavasya is a new-moon night: no moonlight, only the mela's own lights.
    mode: 'night',
    background: '#05070F',
    sun: [-30, 50, -20],
    sunColor: '#8EA2C8',
    sunIntensity: 0.25,
    hemisphere: { sky: '#1F2B4A', ground: '#30291E', intensity: 0.45 },
    ambient: 0.1,
    fog: { color: '#121826', density: 0.0065 },
    exposure: 1.2,
  },
  ground: { color: '#283232', size: 340, y: -0.5 },
  overlay: { columnMax: 9 },
  crowd: {
    // Pilgrims on a January night: saffron, white, red, yellow, brown and maroon shawls.
    palette: ['#F97316', '#EA580C', '#FDBA74', '#F5F5F4', '#E7E5E4', '#FACC15', '#B91C1C', '#7F1D1D', '#92400E', '#78716C', '#57534E', '#DC2626', '#FDE68A', '#FFFFFF'],
  },
  trees: false,
  structures: [
    // The sand spit, the far banks and the two rivers meeting beyond the nose
    { type: 'plane', id: 'spit', x: 0, z: -67, w: 56, d: 206, y: 0.01, texture: 'sand', repeat: [10, 36], color: SAND },
    { type: 'plane', id: 'west-bank', x: -128, z: -20, w: 62, d: 320, y: 0.01, texture: 'sand', repeat: [10, 50], color: '#B9A982' },
    { type: 'plane', id: 'east-bank', x: 128, z: -20, w: 62, d: 320, y: 0.01, texture: 'sand', repeat: [10, 50], color: '#B9A982' },
    { type: 'water', id: 'ganga', x: -62.5, z: -62, w: 69, d: 196, y: -0.2, color: GANGA },
    { type: 'water', id: 'yamuna', x: 62.5, z: -62, w: 69, d: 196, y: -0.2, color: YAMUNA },
    { type: 'water', id: 'confluence', x: 0, z: 93, w: 320, d: 114, y: -0.2, color: CONFLUENCE },
    // The bathing edge: wooden platforms, a rope of floats marking the bathing area
    { type: 'box', id: 'ghat-west', x: -18, z: 34, w: 14, h: 0.3, d: 4, color: '#8B6F47' },
    { type: 'box', id: 'ghat-centre', x: 0, z: 34, w: 14, h: 0.3, d: 4, color: '#8B6F47' },
    { type: 'box', id: 'ghat-east', x: 18, z: 34, w: 14, h: 0.3, d: 4, color: '#8B6F47' },
    { type: 'buoys', id: 'bathing-rope', x: 0, z: 46, length: 56 },
    { type: 'buoys', id: 'bathing-rope-w', x: -28, z: 41, length: 10, rotationY: Math.PI / 2 },
    { type: 'buoys', id: 'bathing-rope-e', x: 28, z: 41, length: 10, rotationY: Math.PI / 2 },
    // Pontoon bridges, closed at the landings that night
    { type: 'pontoon', id: 'pontoon-ganga', x: -62.5, z: -30, length: 69, w: 5 },
    { type: 'pontoon', id: 'pontoon-yamuna', x: 62.5, z: -30, length: 69, w: 5 },
    { type: 'pontoon', id: 'pontoon-ganga-2', x: -62.5, z: -100, length: 69, w: 5 },
    { type: 'pontoon', id: 'pontoon-yamuna-2', x: 62.5, z: -100, length: 69, w: 5 },
    { type: 'barrier', id: 'pontoon-closed-w', x: -28.6, z: -30, length: 6, rotationY: Math.PI / 2, color: '#DC2626' },
    { type: 'barrier', id: 'pontoon-closed-e', x: 28.6, z: -30, length: 6, rotationY: Math.PI / 2, color: '#DC2626' },
    // The barricade line with three gaps, and the channelling fences along the spit
    ...BARRICADE_LINE,
    { type: 'fence', id: 'channel-west', x: -27.6, z: -80, length: 100, height: 1.3, rotationY: Math.PI / 2 },
    { type: 'fence', id: 'channel-east', x: 27.6, z: -80, length: 100, height: 1.3, rotationY: Math.PI / 2 },
    // The steel-plate road of the Akhara route, the camps and their flags
    { type: 'plane', id: 'steel-road', x: 0, z: -100, w: 12, d: 136, y: 0.02, color: '#8A9098', metalness: 0.55, roughness: 0.45 },
    ...TENTS,
    ...FLAGS,
    // Light masts and police watchtowers
    { type: 'flood', id: 'mast-nw', x: -31, z: -42, height: 22, target: [0, -8], intensity: 3200 },
    { type: 'flood', id: 'mast-ne', x: 31, z: -42, height: 22, target: [0, -8], intensity: 3200 },
    { type: 'flood', id: 'mast-sw', x: -31, z: 22, height: 22, target: [0, 20], intensity: 3200 },
    { type: 'flood', id: 'mast-se', x: 31, z: 22, height: 22, target: [0, 20], intensity: 3200 },
    { type: 'lamp', id: 'route-lamp-e', x: 7.5, z: -60, height: 9, color: '#F0F4FF', intensity: 160, rotationY: Math.PI },
    { type: 'lamp', id: 'route-lamp-w', x: -7.5, z: -95, height: 9, color: '#F0F4FF', intensity: 160 },
    { type: 'tower', id: 'watchtower-w', x: -31, z: -64, height: 8 },
    { type: 'tower', id: 'watchtower-e', x: 31, z: -64, height: 8 },
  ],
  labels: [
    { text: 'GANGA', x: -62, z: -70, y: 2.5 },
    { text: 'YAMUNA', x: 62, z: -70, y: 2.5 },
    { text: 'SANGAM — THE CONFLUENCE', x: 0, z: 70, y: 3 },
    { text: 'BARRICADE LINE', x: -20, z: -12, y: 3.5 },
    { text: 'PONTOON BRIDGE (CLOSED)', x: -62, z: -35, y: 3 },
    { text: 'AKHARA ROUTE', x: 0, z: -66, y: 4 },
    { text: 'BATHING EDGE', x: 0, z: 39, y: 3 },
  ],
  cameras: [
    { id: 'camera-1', label: 'TOWER 01', x: -29, z: -40, rotation: 0.5, covers: ['R1C1', 'R1C2', 'R2C1', 'R2C2'] },
    { id: 'camera-2', label: 'TOWER 02', x: 29, z: -40, rotation: -0.5, covers: ['R1C3', 'R1C2', 'R2C3', 'R2C2'] },
  ],
  gates: [
    { id: 'GHAT-W', x: -18, z: 33, rotation: 0, width: 12, zone: 'R3C1' },
    { id: 'GHAT-C', x: 0, z: 33, rotation: 0, width: 12, zone: 'R3C2' },
    { id: 'GHAT-E', x: 18, z: 33, rotation: 0, width: 12, zone: 'R3C3' },
  ],
  gateLine: null,
  gateLabel: 'BATHING EDGE',
  corridors: {
    inbound: [
      [0, 1.6, -56],
      [0, 4.0, -36],
      [0, 3.4, -20],
      [0, 2.6, 0],
    ],
    egress: [
      [0, 2.6, 0],
      [0, 3.4, 14],
      [0, 2.4, 26],
      [0, 1.4, 34],
    ],
    lateral: [
      [-24, 2.4, 10],
      [-10, 4.2, 12],
      [10, 4.2, 8],
      [24, 2.4, 10],
    ],
    reversal: [
      [0, 2.4, 24],
      [0, 5.2, 12],
      [0, 5.6, -4],
      [0, 4.0, -18],
    ],
    sceneMotion: [
      [-30, 6.5, -10],
      [0, 7.5, -6],
      [30, 6.5, -2],
    ],
  },
  // People outside the analysed region, drawn muted and not counted
  ambient: [
    { x: 0, z: -48, w: 52, d: 34, count: 1500, heading: 0, spread: 0.8 },
    { x: 0, z: 40, w: 52, d: 7, y: -0.85, count: 320 },
  ],
  // Where the model's held arrivals wait, upstream of the camps
  holding: {
    'akhara-route': { x: 0, z: -140, w: 16, d: 24, front: '+z', label: 'AKHARA ROUTE · UPSTREAM BARRICADE' },
    'ganga-side': { x: -20, z: -140, w: 12, d: 24, front: '+z', label: 'GANGA-SIDE APPROACH' },
    'yamuna-side': { x: 20, z: -140, w: 12, d: 24, front: '+z', label: 'YAMUNA-SIDE APPROACH' },
  },
  controlRoom: null,
  incident: {
    date: '29 January 2025',
    time: '≈ 01:00–02:00 IST',
    title: 'Crowd crush at the Sangam nose before the Mauni Amavasya bathing hour',
    deaths: '30 by the first official statement; 37 as later listed officially; independent investigations counted 79 or more',
    injured: '60 (official)',
    crowd: 'Tens of millions of pilgrims over the day; the Sangam nose is a narrow spit where every route converges on the water',
    summary:
      'In the small hours of the most auspicious bathing day, pilgrims who had slept at the barricade line to be ' +
      'first into the water were surrounded by a growing crowd pressing toward the nose. Barricades gave way ' +
      '— the festival\'s executive officer said a barrier broke, the state said devotees crossed the barricades ' +
      '— and the surge ran over people resting on the ground. A second crush followed at an exit when the crowd ' +
      'found the pontoon bridges had been closed.',
    factors: [
      'Every approach route funnelled to one narrow spit of land at the hour the whole festival wanted to bathe.',
      'Pilgrims rested and slept on the ground at the barricade line, so the first surge met people who could not move.',
      'Pontoon bridges that would have carried people across the rivers had been closed, removing the exits.',
      'VIP movement restrictions and one-way routes had narrowed the space available; VIP privileges were suspended for the remaining bathing days.',
    ],
    consoleWouldShow: [
      'The holding-area cell (R2C2) already in the congested band from resting pilgrims, with the approach cells rising behind it — a static crowd with inflow is the console\'s clearest danger pattern.',
      'The projection crossing threshold on the approach cells before the barricades gave way, while the holding area was still passable.',
      'A sudden change in the rate of the holding-area cell when the barricade line failed, which the constant-velocity projection carries straight forward.',
      'Falling track coverage as the crowd packed, so the count was displayed as a floor rather than a figure to trust.',
    ],
    prevention: [
      'Hold the inflow at the upstream barricades on the Akhara route once the approach projection crosses threshold — the nose cannot take more.',
      'Reopen the pontoon bridges so the holding area has an exit that does not run through the water\'s edge.',
      'Wake and move the pilgrims resting at the barricade line before the inflow reaches them; a static crowd in a surge path is the first thing to clear.',
    ],
    caveats: [
      'The death toll is disputed: 30 in the first official statement, 37 as later listed, 79 by a Newslaundry investigation and at least 82 by the BBC.',
      'The spit, barricade line and ghats are schematic; a 54 m by 60 m region stands in for a much larger bathing area.',
      'Inflow rates and the fraction of resting pilgrims are authored estimates.',
    ],
    sources: [
      {
        label: 'Wikipedia — 2025 Prayag Maha Kumbh Mela crowd crush',
        url: 'https://en.wikipedia.org/wiki/2025_Prayag_Maha_Kumbh_Mela_crowd_crush',
      },
      {
        label: 'Scroll — 30 dead, 60 injured after stampede at Maha Kumbh',
        url: 'https://scroll.in/latest/1078492/stampede-breaks-out-at-maha-kumbh-mela-in-prayagraj-casualties-feared',
      },
      {
        label: 'Deccan Herald — what caused the stampede at Maha Kumbh',
        url: 'https://www.deccanherald.com/india/uttar-pradesh/what-caused-the-stampede-at-maha-kumbh-that-killed-dozens-3378604',
      },
    ],
  },
  defaultScenario: 'incident',
  timelines: {
    incident: {
      id: 'incident',
      kind: 'model',
      title: 'As reported — the barricades give way',
      summary:
        'Pilgrims rest at the barricade line while the approach fills behind them toward the bathing hour. ' +
        'When the barricades fail, the surge runs into the holding area; the pontoon bridges are closed, so ' +
        'the only way out is through the water\'s edge. T0 is the reported time the barricades gave way.',
      threshold: 790,
      thresholdRange: [100, 3000],
      onsetDensity: 3.5,
      onsetLabel: 'involuntary movement at crush-risk density',
      mood: 'crush',
      direction: 'South · toward the Sangam nose',
      model: {
        start: -900,
        end: 600,
        lengths: [20, 20, 20, 20, 20, 20, 20, 20, 20],
        initial: [300, 400, 300, 500, 650, 500, 250, 300, 250],
        // The holding area is largely people resting on the ground; bathing is slow.
        statics: [0.1, 0.1, 0.1, 0.65, 0.65, 0.65, 0.3, 0.3, 0.3],
        links: [
          // Barricade gaps until the line fails, then the full width.
          { from: 'R1C1', to: 'R2C1', width: [[-900, 2.5], [0, 18]], share: [[-900, 0.45], [0, 0.9]] },
          { from: 'R1C2', to: 'R2C2', width: [[-900, 2.5], [0, 18]], share: [[-900, 0.45], [0, 0.9]] },
          { from: 'R1C3', to: 'R2C3', width: [[-900, 2.5], [0, 18]], share: [[-900, 0.45], [0, 0.9]] },
          { from: 'R2C1', to: 'R3C1', width: 6, share: 0.4 },
          { from: 'R2C2', to: 'R3C2', width: 6, share: 0.4 },
          { from: 'R2C3', to: 'R3C3', width: 6, share: 0.4 },
          // Spreading along the approach and the barricade line.
          { from: 'R1C2', to: 'R1C1', width: 20, share: 0.2 },
          { from: 'R1C2', to: 'R1C3', width: 20, share: 0.2 },
          { from: 'R1C1', to: 'R1C2', width: 20, share: 0.1 },
          { from: 'R1C3', to: 'R1C2', width: 20, share: 0.1 },
          { from: 'R2C1', to: 'R2C2', width: 20, share: 0.1 },
          { from: 'R2C2', to: 'R2C1', width: 20, share: 0.1 },
          { from: 'R2C2', to: 'R2C3', width: 20, share: 0.1 },
          { from: 'R2C3', to: 'R2C2', width: 20, share: 0.1 },
        ],
        sources: [
          { id: 'akhara-route', cell: 'R1C2', rate: [[-900, 7], [-600, 10], [-300, 10], [300, 4]] },
          { id: 'ganga-side', cell: 'R1C1', rate: 2 },
          { id: 'yamuna-side', cell: 'R1C3', rate: 2 },
        ],
        sinks: [
          // Bathing is slow: a wide edge carries far fewer people per second than a corridor of the same width.
          { id: 'ghat-w', cell: 'R3C1', width: 3, share: 0.5, open: true },
          { id: 'ghat-c', cell: 'R3C2', width: 3, share: 0.5, open: true },
          { id: 'ghat-e', cell: 'R3C3', width: 3, share: 0.5, open: true },
          { id: 'exit-route', cell: 'R3C1', width: 4, share: 0.5, open: true },
          { id: 'pontoon-bridge', cell: 'R2C3', width: 6, share: 0.5, open: false },
        ],
        counterflow: [
          [-900, 0.05],
          [-180, 0.12],
          [0, 0.3],
          [60, 0.4],
          [300, 0.3],
        ],
      },
      phases: [
        {
          t: -900,
          label: 'Waiting for the bathing hour',
          note: 'Pilgrims rest on the ground at the barricade line. Behind them the Akhara route keeps delivering people toward the nose.',
          signal: { source: 'Model', message: 'Crowd-flow model loaded for the Sangam nose. Counts below are simulated from published accounts.' },
        },
        {
          t: -300,
          label: 'Approach filling',
          note: 'Arrivals rise toward the auspicious hour. The holding area is already in the congested band and cannot drain through the water\'s edge fast enough.',
          signal: { source: 'Forecast', message: 'R1C2 projected above threshold at +3 s. Holding area in front of it is static and congested.' },
        },
        {
          t: -60,
          label: 'Pressure on the barricades',
          note: 'The approach cells are in the crush-risk band against the barricade line; the resting crowd beyond it cannot move away.',
          signal: { source: 'Tracker', message: 'Slow fraction in R1C2 above 90%. The approach has stopped walking.' },
        },
        {
          t: 0,
          label: 'Barricades give way',
          note: 'The line fails along its length. The surge runs into the holding area and over people on the ground. Counts here are least reliable exactly when they matter most.',
          signal: { source: 'Forecast', message: 'Rate of change in R2C2 jumps as the barricade line fails. Critical band projected at +1 s.' },
        },
        {
          t: 60,
          label: 'No way out',
          note: 'The crowd turns toward the exits and finds the pontoon bridges closed; counterflow builds against the inflow still arriving.',
          signal: { source: 'Flow', message: 'Opposed motion across the holding area. Collective-movement rule raised for verification.' },
        },
        {
          t: 300,
          label: 'Held',
          note: 'The condition persists until the inflow is stopped upstream. Nothing in this console resolves it.',
        },
      ],
    },
    intervention: {
      id: 'intervention',
      kind: 'model',
      branchOf: 'incident',
      title: 'With the warning acted on — inflow held, bridges reopened',
      summary:
        'The same model until the projection first crosses the operator threshold. Two minutes later the inflow is ' +
        'held at the upstream barricades, the pontoon bridges are reopened as exits and the resting pilgrims are ' +
        'woken and moved. Everything after the action is a counterfactual.',
      threshold: 790,
      thresholdRange: [100, 3000],
      onsetDensity: 3.5,
      onsetLabel: 'involuntary movement at crush-risk density',
      mood: 'egress',
      direction: 'South · toward the Sangam nose',
      model: 'incident',
      intervention: {
        reactionSeconds: 120,
        title: 'Mela control acts on the approach projection',
        note: 'Two minutes allows for the radio call to the upstream barricade teams and the bridge pickets.',
        actions: [
          { type: 'meter', source: 'akhara-route', rate: 1.2, label: 'Hold the inflow at the upstream barricades on the Akhara route' },
          { type: 'meter', source: 'ganga-side', rate: 0.4, label: 'Hold the Ganga-side approach' },
          { type: 'meter', source: 'yamuna-side', rate: 0.4, label: 'Hold the Yamuna-side approach' },
          { type: 'open', sink: 'pontoon-bridge', width: 10, label: 'Reopen the pontoon bridges as an exit from the holding area' },
          { type: 'open', sink: 'exit-route', width: 10, label: 'Open the one-way exit along the bank fully' },
          { type: 'link', from: 'R2C2', to: 'R2C3', share: 0.5, label: 'Direct the holding area toward the bridges' },
          { type: 'link', from: 'R2C1', to: 'R2C2', share: 0.3, label: null },
          { type: 'link', from: 'R2C2', to: 'R3C2', share: 0.2, label: 'Bathing continues at the pace the edge allows, not faster' },
          { type: 'release', statics: [0.1, 0.1, 0.1, 0.15, 0.15, 0.15, 0.3, 0.3, 0.3], label: 'Wake and move the pilgrims resting at the barricade line' },
          { type: 'counterflow', fraction: 0.1, label: 'One-way movement toward the ghats and the bridges' },
        ],
        phases: [
          { dt: 0, label: 'Operator acts', note: 'Upstream barricades hold the inflow; the bridges open; the holding area is woken and moving. The approach stops loading.', signal: { source: 'Operator', message: 'Inflow held upstream, bridges reopened and holding area cleared after the projection crossed threshold (simulated action).' } },
          { dt: 180, label: 'Holding area draining', note: 'With exits on three sides and no fresh inflow, the barricade line never carries the load that broke it.' },
          { dt: 420, label: 'Bathing at the ghats\' pace', note: 'The remaining crowd reaches the water at the rate the edge allows. Held pilgrims wait upstream, outside the camera view.' },
        ],
      },
    },
  },
};

venue.egressField = egressFieldToward(venue, 'R3C2', [0, 1]);

export default venue;
