// Love Parade, Duisburg — 24 July 2010.
//
// A reconstruction of the ramp foot where the access tunnels met the single
// ramp to the festival ground, authored from published accounts and the
// Helbing & Mukerji analysis, driven by the crowd-flow model. Nothing here is
// footage or a measurement of the real site.

import { egressFieldToward } from '../venueModel.js';

const W = 8; // metres across the ramp, per column — 24 m in all
const D = 16; // metres along the ramp, per row
const GRAVEL = '#D5CFC4';
const CONCRETE = '#9EA3A8';

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
  camera: { position: [-44, 34, 50], target: [0, 2, -4] },
  ground: { color: GRAVEL, size: 180 },
  trees: false,
  structures: [
    // Retaining walls either side of the ramp and plateau
    { type: 'box', x: -14.5, z: 0, w: 5, h: 7, d: 70, color: CONCRETE },
    { type: 'box', x: 14.5, z: 0, w: 5, h: 7, d: 70, color: CONCRETE },
    // The ramp itself, rising north to the festival ground on the old freight yard
    { type: 'ramp', x: 0, z: -34, w: 24, length: 36, rise: 7, axis: 'z', dir: -1, color: '#B9B3A8' },
    { type: 'plane', x: 0, z: -75, w: 120, d: 50, color: '#CFC7B8', y: 7 },
    // Access tunnels under the railway, entering the ramp foot from west and east
    { type: 'box', x: -30, z: 0, w: 28, h: 7.5, d: 20, color: '#7A7F86', y: 0 },
    { type: 'box', x: 30, z: 0, w: 28, h: 7.5, d: 20, color: '#7A7F86', y: 0 },
    { type: 'box', x: -30, z: 0, w: 27, h: 6, d: 16, color: '#1F2328', y: 0.2 },
    { type: 'box', x: 30, z: 0, w: 27, h: 6, d: 16, color: '#1F2328', y: 0.2 },
    // Railway embankment over the tunnels
    { type: 'box', x: -30, z: 0, w: 28, h: 1.2, d: 26, color: '#6B6E72', y: 7.5 },
    { type: 'box', x: 30, z: 0, w: 28, h: 1.2, d: 26, color: '#6B6E72', y: 7.5 },
    // South fence, the stairs and the lamp post people climbed
    { type: 'box', x: 0, z: 25, w: 26, h: 2.2, d: 0.2, color: '#9CA3AF' },
    { type: 'ramp', x: -9, z: 25, w: 3, length: 6, rise: 4, axis: 'z', dir: 1, color: '#6B7079' },
    { type: 'box', x: 6, z: 23, w: 0.3, h: 9, d: 0.3, color: '#374151' },
    // Police cordon line at the top of the ramp
    ...[-9, -3, 3, 9].map((x) => ({ type: 'box', x, z: -52, w: 4, h: 1.1, d: 0.15, color: '#D8D8D8', y: 7 })),
    // Containers used as a barrier line on the plateau
    { type: 'box', x: -11, z: 14, w: 6, h: 2.6, d: 2.4, color: '#1F4E8C' },
    { type: 'box', x: 11, z: 14, w: 6, h: 2.6, d: 2.4, color: '#B91C1C' },
  ],
  labels: [
    { text: 'FESTIVAL GROUND', x: 0, z: -70, y: 10 },
    { text: 'RAMP (THE ONLY WAY IN OR OUT)', x: 0, z: -34, y: 9 },
    { text: 'WEST TUNNEL', x: -30, z: -14, y: 10 },
    { text: 'EAST TUNNEL', x: 30, z: -14, y: 10 },
    { text: 'POLICE CORDON', x: 0, z: -52, y: 10 },
    { text: 'STAIRS AND LAMP POST', x: -4, z: 28, y: 5 },
  ],
  cameras: [
    { id: 'camera-1', label: 'CAM 01', x: -12, z: -22, rotation: Math.PI * 0.75, covers: ['R1C1', 'R1C2', 'R2C1', 'R2C2'] },
    { id: 'camera-2', label: 'CAM 02', x: 12, z: 22, rotation: -Math.PI * 0.25, covers: ['R3C2', 'R3C3', 'R2C3', 'R2C2'] },
  ],
  gates: [
    { id: 'RAMP-TOP', x: 0, z: -52, rotation: Math.PI, width: 12, zone: 'R1C2' },
    { id: 'WEST-TUNNEL', x: -17, z: 0, rotation: Math.PI / 2, width: 6, zone: 'R2C1' },
    { id: 'EAST-TUNNEL', x: 17, z: 0, rotation: -Math.PI / 2, width: 6, zone: 'R2C3' },
  ],
  gateLine: null,
  gateLabel: 'RAMP TOP AND TUNNELS',
  corridors: {
    inbound: [
      [-40, 1.6, 0],
      [-24, 3.4, 0],
      [-10, 3.0, 0],
      [0, 2.6, 0],
    ],
    egress: [
      [0, 2.6, 0],
      [0, 4.2, -14],
      [0, 7.0, -30],
      [0, 9.6, -50],
    ],
    lateral: [
      [40, 1.6, 0],
      [24, 3.4, 0.6],
      [10, 3.0, -0.6],
      [0, 2.6, 0],
    ],
    reversal: [
      [0, 9.6, -48],
      [0, 7.0, -28],
      [0, 4.4, -10],
      [0, 3.0, 10],
    ],
    sceneMotion: [
      [-8, 6.5, 30],
      [0, 7.0, 0],
      [8, 9.5, -30],
    ],
  },
  controlRoom: [46, -30],
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
