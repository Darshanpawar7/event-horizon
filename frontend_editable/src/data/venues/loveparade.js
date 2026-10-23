// Love Parade, Duisburg — 24 July 2010.
//
// A reconstruction of the ramp foot where the access tunnels met the single
// ramp to the festival ground, authored from published accounts and the
// Helbing & Mukerji analysis, driven by the crowd-flow model. Nothing here is
// footage or a measurement of the real site.

import { egressFieldToward } from '../venueModel.js';

const W = 8; // metres across the ramp, per column — 24 m in all
const D = 16; // metres along the ramp, per row
const RISE = 5; // the ramp climbs about 5 m from the tunnel level to the festival ground
const TUNNEL_Y = 7.2; // clearance of the road tunnel under the railway

/** Trees on the railway embankment south of the plateau, as [x, z, scale]. */
const EMBANKMENT_TREES = (() => {
  const trees = [];
  let seed = 5;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  for (let x = -36; x <= 36; x += 6) {
    for (const z of [50, 58, 66]) trees.push([x + (rand() - 0.5) * 3, z + (rand() - 0.5) * 3, 0.9 + rand() * 0.6]);
  }
  return trees;
})();

/** One half of the Karl-Lehr-Strasse road tunnel, from the ramp foot outward. */
function tunnel(name, side) {
  const x = side * 42;
  return [
    { type: 'plane', id: `tunnel-${name}-road`, x, z: 0, w: 58, d: 18, y: 0.01, texture: 'asphalt', repeat: [10, 3], color: '#7C7E82' },
    { type: 'box', id: `tunnel-${name}-wall-n`, x, z: -9.5, w: 58, h: TUNNEL_Y, d: 1, texture: 'concrete', repeat: [10, 1], color: '#9C9A93' },
    { type: 'box', id: `tunnel-${name}-wall-s`, x, z: 9.5, w: 58, h: TUNNEL_Y, d: 1, texture: 'concrete', repeat: [10, 1], color: '#9C9A93' },
    { type: 'box', id: `tunnel-${name}-roof`, x, z: 0, w: 58, h: 1.2, d: 20, y: TUNNEL_Y, texture: 'concrete', repeat: [10, 3], color: '#8F8D86' },
    { type: 'box', id: `tunnel-${name}-lights`, x, z: 0, w: 50, h: 0.08, d: 0.4, y: TUNNEL_Y - 0.1, color: '#FFB25E', emissive: '#FFB25E', emissiveIntensity: 2.5, castShadow: false },
    { type: 'box', id: `tunnel-${name}-embankment`, x, z: 0, w: 58, h: 1.6, d: 28, y: TUNNEL_Y + 1.2, texture: 'gravel', repeat: [10, 4], color: '#6B665C' },
    { type: 'rails', id: `railway-${name}-1`, x, z: -3.5, length: 58, y: TUNNEL_Y + 2.8, rotationY: Math.PI / 2 },
    { type: 'rails', id: `railway-${name}-2`, x, z: 3.5, length: 58, y: TUNNEL_Y + 2.8, rotationY: Math.PI / 2 },
  ];
}

const venue = {
  id: 'loveparade',
  name: 'Love Parade — the ramp and the tunnels',
  short: 'LOVE PARADE RAMP',
  place: 'Duisburg, Germany',
  kind: 'historic',
  cell: { width: W, depth: D },
  gap: { x: 0, z: 0 },
  cellArea: W * D,
  zoneLabels: {
    R1C1: 'Ramp rising to the grounds · west',
    R1C2: 'Ramp rising to the festival ground',
    R1C3: 'Ramp rising to the grounds · east',
    R2C1: 'West tunnel mouth',
    R2C2: 'Ramp foot — where the tunnels meet',
    R2C3: 'East tunnel mouth',
    R3C1: 'South plateau · west fence',
    R3C2: 'South plateau · stairs and lamp post',
    R3C3: 'South plateau · east fence',
  },
  camera: { position: [-46, 36, 52], target: [0, 2, -6] },
  floor: { low: -8, high: -52, rise: RISE, xMin: -12.6, xMax: 12.6 },
  lighting: {
    mode: 'day',
    sun: [-60, 50, 45],
    sunColor: '#FFE9C7',
    sunIntensity: 2.5,
    hemisphere: { sky: '#BFD8F2', ground: '#8B806E', intensity: 0.9 },
    ambient: 0.22,
    fog: { color: '#D9E1E8', density: 0.0017 },
    sky: { turbidity: 4, rayleigh: 1.8, mieCoefficient: 0.004, mieDirectionalG: 0.82 },
  },
  ground: { color: '#8C877C', texture: 'gravel', size: 260, repeat: [50, 50] },
  overlay: { columnMax: 7 },
  crowd: {
    // A summer rave: white, neon pink, lime, cyan, orange and black.
    palette: ['#F3F4F6', '#EC4899', '#A3E635', '#111827', '#3B82F6', '#F97316', '#FDE047', '#6B7280', '#22D3EE', '#DC2626', '#FFFFFF', '#1F2937'],
  },
  trees: false,
  structures: [
    // Ramp foot and south plateau at tunnel level
    { type: 'plane', id: 'ramp-foot', x: 0, z: 8, w: 26, d: 32, y: 0.01, texture: 'asphalt', repeat: [5, 6], color: '#8E8C86' },
    // The ramp, the only way up to the festival ground, between high retaining walls
    { type: 'ramp', id: 'ramp', x: 0, z: -30, w: 26, length: 44, rise: RISE, axis: 'z', dir: -1, y: -0.15, texture: 'asphalt', repeat: [5, 9], color: '#8E8C86' },
    { type: 'box', id: 'ramp-wall-west', x: -13.6, z: -31, w: 1.2, h: 7.5, d: 42, texture: 'concrete', repeat: [8, 2], color: '#A7A39A' },
    { type: 'box', id: 'ramp-wall-east', x: 13.6, z: -31, w: 1.2, h: 7.5, d: 42, texture: 'concrete', repeat: [8, 2], color: '#A7A39A' },
    // Festival ground on the former freight yard
    { type: 'box', id: 'festival-ground', x: 0, z: -100, w: 240, h: RISE, d: 96, texture: 'gravel', repeat: [40, 16], color: '#A39C8D' },
    // The road tunnel under the railway, entering the ramp foot from west and east
    ...tunnel('west', -1),
    ...tunnel('east', 1),
    // South plateau: fence, embankment, the narrow staircase and the lamp post
    { type: 'fence', id: 'plateau-fence', x: 3.5, z: 26, length: 19, height: 2 },
    { type: 'stairs', id: 'narrow-staircase', x: -9.5, z: 30.5, w: 2.2, run: 9, rise: 6, steps: 30, dir: 1, color: '#7C8088', parapet: true, walkable: true },
    { type: 'ramp', id: 'embankment-slope', x: 3, z: 30.5, w: 20, length: 9, rise: 6, axis: 'z', dir: 1, texture: 'grass', repeat: [4, 2], color: '#6F8F55' },
    { type: 'ramp', id: 'embankment-slope-west', x: -11.9, z: 30.5, w: 2.2, length: 9, rise: 6, axis: 'z', dir: 1, texture: 'grass', repeat: [1, 2], color: '#6F8F55' },
    { type: 'box', id: 'embankment', x: 0, z: 52.5, w: 80, h: 6, d: 35, texture: 'grass', repeat: [16, 7], color: '#6F8F55' },
    { type: 'forest', id: 'embankment-trees', y: 6, trees: EMBANKMENT_TREES },
    { type: 'lamp', id: 'lamp-post', x: 6, z: 22, height: 9, rotationY: Math.PI },
    // Police cordon at the top of the ramp, floats and a stage on the ground
    { type: 'barrier', id: 'cordon', x: 0, z: -52.6, y: RISE, length: 24, color: '#E5E7EB' },
    { type: 'vehicle', id: 'police-west', kind: 'police', x: -18, z: -58, y: RISE, rotationY: 0 },
    { type: 'vehicle', id: 'police-east', kind: 'police', x: 18, z: -58, y: RISE, rotationY: 0 },
    { type: 'stage', id: 'stage', x: -46, z: -122, y: RISE, w: 26, d: 10 },
    { type: 'vehicle', id: 'float-1', kind: 'bus', x: 24, z: -92, y: RISE, rotationY: Math.PI / 2, color: '#EC4899' },
    { type: 'vehicle', id: 'float-2', kind: 'bus', x: 52, z: -114, y: RISE, rotationY: 0.4, color: '#22D3EE' },
    { type: 'flag', id: 'flag-west', x: -20, z: -55, y: RISE, color: '#EC4899' },
    { type: 'flag', id: 'flag-east', x: 20, z: -55, y: RISE, color: '#A3E635' },
  ],
  labels: [
    { text: 'FESTIVAL GROUND (FORMER FREIGHT YARD)', x: 0, z: -96, y: RISE + 6 },
    { text: 'RAMP — THE ONE WAY IN AND OUT', x: 0, z: -36, y: 9 },
    { text: 'TUNNEL (WEST)', x: -34, z: 0, y: 12.5 },
    { text: 'TUNNEL (EAST)', x: 34, z: 0, y: 12.5 },
    { text: 'POLICE CORDON', x: 0, z: -53, y: RISE + 3.5 },
    { text: 'NARROW STAIRCASE', x: -9.5, z: 30, y: 8.5 },
    { text: 'LAMP POST', x: 6, z: 22, y: 10.5 },
  ],
  cameras: [
    { id: 'camera-1', label: 'CAM 01', x: -12.4, z: -20, y: 1.4, rotation: 0.6, covers: ['R1C1', 'R1C2', 'R2C1', 'R2C2'] },
    { id: 'camera-2', label: 'CAM 02', x: 12.4, z: 22, rotation: Math.PI + 0.6, covers: ['R3C2', 'R3C3', 'R2C3', 'R2C2'] },
  ],
  gates: [
    { id: 'RAMP-TOP', x: 0, z: -52, y: RISE, rotation: Math.PI, width: 12, zone: 'R1C2' },
    { id: 'WEST-TUNNEL', x: -12.6, z: 0, rotation: Math.PI / 2, width: 6, zone: 'R2C1' },
    { id: 'EAST-TUNNEL', x: 12.6, z: 0, rotation: -Math.PI / 2, width: 6, zone: 'R2C3' },
  ],
  gateLine: null,
  gateLabel: 'RAMP TOP AND TUNNELS',
  corridors: {
    inbound: [
      [-40, 1.6, 0],
      [-24, 3.0, 0],
      [-10, 2.8, 0],
      [0, 2.4, 0],
    ],
    egress: [
      [0, 2.4, 0],
      [0, 3.6, -14],
      [0, 5.4, -30],
      [0, 7.4, -50],
    ],
    lateral: [
      [40, 1.6, 0],
      [24, 3.0, 0.6],
      [10, 2.8, -0.6],
      [0, 2.4, 0],
    ],
    reversal: [
      [0, 7.6, -48],
      [0, 5.6, -28],
      [0, 3.6, -10],
      [0, 2.8, 10],
    ],
    sceneMotion: [
      [-8, 6, 30],
      [0, 6.5, 0],
      [8, 9, -30],
    ],
  },
  // People outside the analysed region, drawn muted and not counted
  ambient: [
    { x: 0, z: -102, w: 150, d: 70, y: RISE, count: 1600 },
    { x: 0, z: -38, w: 24, d: 27, count: 480, heading: Math.PI, spread: 1.2 },
    { x: -17, z: 0, w: 8, d: 15, count: 120, heading: Math.PI / 2, spread: 0.6 },
    { x: 17, z: 0, w: 8, d: 15, count: 120, heading: -Math.PI / 2, spread: 0.6 },
    { x: -9.5, z: 30.5, w: 2, d: 8.6, count: 22, heading: 0, spread: 0.3 },
    { x: 4, z: 44, w: 26, d: 8, y: 6, count: 120 },
  ],
  // Where the model's held arrivals wait
  holding: {
    'west-tunnel': { x: -82, z: 0, w: 16, d: 16, front: '+x', label: 'WEST TUNNEL ENTRANCE' },
    'east-tunnel': { x: 82, z: 0, w: 16, d: 16, front: '-x', label: 'EAST TUNNEL ENTRANCE' },
    'festival-outflow': { x: 0, z: -62, w: 30, d: 10, y: RISE, front: '+z', label: 'LEAVERS HELD ON THE GROUND' },
  },
  controlRoom: null,
  incident: {
    date: '24 July 2010',
    time: '≈ 16:40–17:10 CEST',
    title: 'Crowd crush at the foot of the only ramp into the festival ground',
    deaths: '21',
    injured: 'More than 500 (figures of 510 to 652 are reported)',
    crowd: 'Attendance estimates range from 200,000 to over a million; one ramp, fed by two tunnels, served as both entrance and exit',
    summary:
      'The festival ground on a former freight yard had a single access: two road tunnels under the railway ' +
      'leading to one wide ramp. Through the afternoon people arriving through the tunnels met people leaving ' +
      'down the ramp. Police cordons at the top of the ramp opened and closed to control the inflow; the crowd ' +
      'at the ramp foot compressed, and in the "crowd turbulence" that followed people stumbled and were ' +
      'piled upon. Helbing and Mukerji\'s analysis attributes the deaths to systemic failures of planning and ' +
      'crowd management, not to panic.',
    factors: [
      'A single ramp served as the entrance and the exit, so inflow and outflow met head-on at its foot.',
      'The ramp was fed by two tunnels whose combined inflow exceeded what the top of the ramp could pass.',
      'Cordons at the ramp top were opened and closed, compressing the crowd at the foot while the tunnels kept delivering people.',
      'Attempts to stop the inflow at the tunnel entrances came too late to relieve the pressure already in the system.',
    ],
    consoleWouldShow: [
      'The ramp-foot cell (R2C2) above threshold while the tunnel mouths were still delivering people, with the projection flagging it before the cordon closures compressed the crowd.',
      'Counterflow at the ramp as leavers met arrivals, held as a standing verification alert.',
      'Density rising past the band where movement becomes involuntary, in the cell the analysis identifies as the site of crowd turbulence.',
      'Track coverage collapsing in exactly that cell, so the operator saw a floor rather than a count to trust.',
    ],
    prevention: [
      'Stop the inflow at the tunnel entrances as soon as the ramp-foot projection crosses threshold — the plan\'s own measure, applied in time.',
      'Open the cordon at the top of the ramp fully and keep it one-way upward until the foot clears.',
      'Hold leavers inside the grounds until the ramp foot has drained, so arrivals and departures never share the ramp.',
    ],
    caveats: [
      'The ramp is modelled as 24 m wide and the plateau as three 16 m rows; published figures for the ramp and tunnels vary between about 18 and 26 m.',
      'Inflow and cordon timings are authored to reproduce the sequence described in the analysis, not taken from it.',
      'Attendance estimates differ by an order of magnitude; only the ramp foot is modelled.',
    ],
    sources: [
      { label: 'Wikipedia — Love Parade disaster', url: 'https://en.wikipedia.org/wiki/Love_Parade_disaster' },
      {
        label: 'Helbing & Mukerji (2012) — Crowd disasters as systemic failures: analysis of the Love Parade disaster',
        url: 'https://arxiv.org/abs/1206.5856',
      },
    ],
  },
  defaultScenario: 'incident',
  timelines: {
    incident: {
      id: 'incident',
      kind: 'model',
      title: 'As reported — the ramp foot compresses',
      summary:
        'Arrivals pour from both tunnels into the ramp foot while leavers come down the ramp. Cordons at the top ' +
        'narrow and reopen; the foot passes the crush-risk band and movement becomes involuntary. T0 is the ' +
        'reported start of the fatal compression.',
      threshold: 320,
      thresholdRange: [60, 1200],
      onsetDensity: 3.5,
      onsetLabel: 'involuntary movement at crush-risk density',
      mood: 'crush',
      direction: 'North with counterflow · up the ramp',
      model: {
        start: -1500,
        end: 900,
        lengths: [12, 12, 12, 12, 12, 12, 12, 12, 12],
        initial: [90, 120, 90, 60, 120, 60, 60, 90, 60],
        statics: [0.15, 0.1, 0.15, 0.1, 0.1, 0.1, 0.4, 0.4, 0.4],
        links: [
          { from: 'R2C1', to: 'R2C2', width: 16, share: 0.5 },
          { from: 'R2C3', to: 'R2C2', width: 16, share: 0.5 },
          { from: 'R2C2', to: 'R1C2', width: 8, share: 0.55 },
          { from: 'R1C2', to: 'R1C1', width: 16, share: 0.15 },
          { from: 'R1C2', to: 'R1C3', width: 16, share: 0.15 },
          { from: 'R1C1', to: 'R1C2', width: 16, share: 0.3 },
          { from: 'R1C3', to: 'R1C2', width: 16, share: 0.3 },
          // Leavers coming down the ramp into the foot, and out through the tunnels.
          { from: 'R1C2', to: 'R2C2', width: 8, share: 0.3 },
          { from: 'R2C2', to: 'R2C1', width: 16, share: 0.1 },
          { from: 'R2C2', to: 'R2C3', width: 16, share: 0.1 },
          // People pushed onto the south plateau try to get back.
          { from: 'R3C1', to: 'R2C2', width: 8, share: 0.3 },
          { from: 'R3C2', to: 'R2C2', width: 8, share: 0.3 },
          { from: 'R3C3', to: 'R2C2', width: 8, share: 0.3 },
          { from: 'R2C2', to: 'R3C2', width: 8, share: 0.1 },
        ],
        sources: [
          { id: 'west-tunnel', cell: 'R2C1', rate: [[-1500, 4], [-900, 6], [-300, 6], [300, 3]] },
          { id: 'east-tunnel', cell: 'R2C3', rate: [[-1500, 4], [-900, 6], [-300, 6], [300, 3]] },
          { id: 'festival-outflow', cell: 'R1C2', rate: [[-1500, 1.5], [-900, 2.5], [0, 3], [300, 2]] },
        ],
        sinks: [
          // The cordon at the top of the ramp narrows, closes and reopens.
          { id: 'ramp-top', cell: 'R1C2', width: [[-1500, 10], [-900, 4], [-480, 1.5], [-120, 6]], share: 0.5, open: true },
          { id: 'west-tunnel-exit', cell: 'R2C1', width: 4, share: 0.25, open: true },
          { id: 'east-tunnel-exit', cell: 'R2C3', width: 4, share: 0.25, open: true },
        ],
        counterflow: [
          [-1500, 0.15],
          [-900, 0.25],
          [-300, 0.4],
          [0, 0.5],
          [600, 0.4],
        ],
      },
      phases: [
        {
          t: -1500,
          label: 'Afternoon inflow through both tunnels',
          note: 'Arrivals walk through the west and east tunnels to the ramp foot and up to the grounds while early leavers come down.',
          signal: { source: 'Model', message: 'Crowd-flow model loaded for the Love Parade ramp. Counts below are simulated from published accounts.' },
        },
        {
          t: -900,
          label: 'Cordon narrows at the ramp top',
          note: 'Police chains reduce the passage at the top of the ramp to slow the inflow. The foot begins to load; the tunnels keep delivering.',
          signal: { source: 'Forecast', message: 'R2C2 projected above threshold at +3 s. Ramp-top throughput below tunnel inflow.' },
        },
        {
          t: -480,
          label: 'Cordon closes',
          note: 'The top is almost shut. Arrivals and leavers share the ramp foot; counterflow rises and the south plateau fills with people who cannot go back.',
          signal: { source: 'Flow', message: 'Opposed motion at the ramp foot. Collective-movement rule raised for verification.' },
        },
        {
          t: -120,
          label: 'Cordon reopens into a packed foot',
          note: 'The passage reopens, but the foot is in the crush-risk band and the inflow has not been stopped at the tunnels.',
          signal: { source: 'Tracker', message: 'Slow fraction above 90% in R2C2. Track coverage falling as the crowd packs.' },
        },
        {
          t: 0,
          label: 'Crowd turbulence',
          note: 'The compression the analysis describes: people lose their footing and are piled upon. Counts here are least reliable exactly when they matter most.',
          signal: { source: 'Forecast', message: 'R2C2 in the critical band. The count is a floor, not a measurement.' },
        },
        {
          t: 300,
          label: 'Inflow finally stopped',
          note: 'The tunnels are closed and the foot slowly drains up the ramp. Nothing in this console resolves what already happened.',
        },
      ],
    },
    intervention: {
      id: 'intervention',
      kind: 'model',
      branchOf: 'incident',
      title: 'With the warning acted on — tunnels closed, ramp one-way',
      summary:
        'The same model until the projection first crosses the operator threshold. Ninety seconds later the inflow is ' +
        'stopped at the tunnel entrances, the ramp-top cordon opens fully and leavers are held inside the grounds. ' +
        'Everything after the action is a counterfactual.',
      threshold: 320,
      thresholdRange: [60, 1200],
      onsetDensity: 3.5,
      onsetLabel: 'involuntary movement at crush-risk density',
      mood: 'egress',
      direction: 'North · up the ramp, one way',
      model: 'incident',
      intervention: {
        reactionSeconds: 90,
        title: 'Event control acts on the ramp-foot projection',
        note: 'Ninety seconds allows for the radio call to the tunnel pickets and the cordon at the top.',
        actions: [
          { type: 'close', source: 'west-tunnel', label: 'Stop the inflow at the west tunnel entrance' },
          { type: 'close', source: 'east-tunnel', label: 'Stop the inflow at the east tunnel entrance' },
          { type: 'open', sink: 'ramp-top', width: 12, label: 'Open the cordon at the top of the ramp fully, one-way upward' },
          { type: 'close', source: 'festival-outflow', label: 'Hold leavers inside the grounds until the ramp foot clears' },
          { type: 'counterflow', fraction: 0.1, label: 'Everyone on the ramp moves upward' },
        ],
        phases: [
          { dt: 0, label: 'Operator acts', note: 'Tunnel entrances closed, cordon opened, leavers held. The ramp foot stops loading.', signal: { source: 'Operator', message: 'Tunnels closed and ramp made one-way after the projection crossed threshold (simulated action).' } },
          { dt: 150, label: 'Ramp foot draining', note: 'With the top open and nothing arriving, the foot drains up the ramp through the congested band.' },
          { dt: 420, label: 'Controlled re-entry', note: 'The tunnels reopen at a metered pace once the foot is clear. Held arrivals wait outside, beyond the camera view.' },
        ],
      },
    },
  },
};

venue.egressField = egressFieldToward(venue, 'R2C2', [0, -1]);
// Once at the ramp foot the crowd heads up the ramp.
venue.egressField.R1C1 = [0, -1];
venue.egressField.R1C2 = [0, -1];
venue.egressField.R1C3 = [0, -1];

export default venue;
