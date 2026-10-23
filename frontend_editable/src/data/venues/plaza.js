// The generic venue plaza: the 3×3 analysed region from crowd_forecast.py laid
// out as a stadium concourse with six egress gates along the south edge.
// Nothing here corresponds to a real place. Its two timelines are authored
// keyframes, not model output.

import { egressFieldToward } from '../venueModel.js';

const CELL = 12;
const GAP = 2.4;
const PITCH = CELL + GAP;
const EDGE = PITCH + 9.5;

/** Perimeter kiosks, stands and service blocks that frame the plaza. */
function kiosks() {
  const blocks = [];
  let serial = 0;
  for (let i = -3; i <= 3; i += 1) {
    if (Math.abs(i) < 1) continue;
    blocks.push({ type: 'kiosk', id: `S-${(serial += 1)}`, x: i * 5.6, z: -EDGE, scale: 1 + (Math.abs(i) % 2) * 0.25 });
    blocks.push({ type: 'kiosk', id: `S-${(serial += 1)}`, x: -EDGE, z: i * 5.6, scale: 1 + ((Math.abs(i) + 1) % 2) * 0.25 });
    blocks.push({ type: 'kiosk', id: `S-${(serial += 1)}`, x: EDGE, z: i * 5.6, scale: 1 + (Math.abs(i) % 2) * 0.25 });
  }
  return blocks;
}

/** Normal end-of-event egress that congests at the main exit funnel. */
const SURGE_KEYFRAMES = [
  {
    t: -300,
    label: 'Event running',
    note: 'Stands occupied, concourses light.',
    counts: [210, 120, 205, 90, 120, 95, 60, 70, 62],
    counterflow: 0.02,
    signal: { source: 'Tracker', message: 'Stands populated, concourses light. 82% of detections held as continuous tracks.' },
  },
  {
    t: -180,
    label: 'Early leavers',
    note: 'Arrivals at the concourses begin to exceed gate throughput.',
    counts: [180, 150, 175, 130, 185, 135, 95, 130, 98],
    counterflow: 0.03,
    signal: { source: 'Flow', message: 'Net track direction turning south toward the gate line.' },
  },
  {
    t: -120,
    label: 'Stands emptying',
    note: 'North gate approach and central concourse filling together.',
    counts: [120, 190, 118, 175, 260, 180, 140, 230, 145],
    counterflow: 0.04,
    signal: { source: 'Forecast', message: 'Central concourse and exit funnel rising together across consecutive windows.' },
  },
  {
    t: -60,
    label: 'Funnel loading',
    note: 'Six gates at capacity; arrivals still rising.',
    counts: [70, 210, 68, 205, 330, 210, 190, 350, 195],
    counterflow: 0.06,
    signal: { source: 'Forecast', message: 'Exit funnel arrivals exceeding gate throughput in the projection.' },
  },
  {
    t: -30,
    label: 'Queue backing up',
    note: 'Walking speed dropping across the exit funnel.',
    counts: [45, 205, 44, 215, 365, 222, 215, 430, 220],
    counterflow: 0.09,
    signal: { source: 'Tracker', message: 'Slow fraction rising in R3C2. Walking speed dropping, not stopping.' },
  },
  {
    t: 0,
    label: 'Funnel congested',
    note: 'Exit funnel in the congested band; movement is shuffling.',
    counts: [30, 190, 30, 210, 380, 215, 230, 470, 235],
    counterflow: 0.11,
    signal: { source: 'Forecast', message: 'R3C2 in the congested band. Inspect gate throughput before the queue deepens.' },
  },
  {
    t: 60,
    label: 'Gates clearing',
    note: 'Arrival rate falls below throughput; the queue starts to drain.',
    counts: [20, 150, 20, 180, 330, 185, 215, 445, 220],
    counterflow: 0.07,
    signal: { source: 'Flow', message: 'Arrival rate now below throughput. Projected change turning negative.' },
  },
  {
    t: 180,
    label: 'Recovering',
    note: 'Densities returning toward free movement.',
    counts: [12, 90, 12, 120, 220, 125, 150, 300, 155],
    counterflow: 0.03,
    signal: { source: 'Forecast', message: 'Densities returning toward free movement. This is not an all-clear.' },
  },
];

/** The same egress with two gates lost, driving the funnel into crush densities. */
const CRUSH_KEYFRAMES = [
  {
    t: -300,
    label: 'Event running',
    note: 'Identical opening conditions to the surge scenario.',
    counts: [210, 120, 205, 90, 120, 95, 60, 70, 62],
    counterflow: 0.02,
    signal: { source: 'Tracker', message: 'Stands populated, concourses light. 82% of detections held as continuous tracks.' },
  },
  {
    t: -180,
    label: 'Early leavers',
    note: 'Egress begins on schedule.',
    counts: [180, 150, 175, 130, 185, 138, 98, 135, 100],
    counterflow: 0.03,
    signal: { source: 'Flow', message: 'Net track direction turning south toward the gate line.' },
  },
  {
    t: -120,
    label: 'Stands emptying',
    note: 'Concourses loading normally.',
    counts: [125, 195, 122, 180, 270, 186, 145, 245, 150],
    counterflow: 0.05,
    signal: { source: 'Forecast', message: 'Concourses loading at the rate the surge scenario shows.' },
  },
  {
    t: -90,
    label: 'Two gates stop',
    note: 'Simulated loss of two of six gates. Throughput falls; arrivals do not.',
    counts: [95, 215, 92, 205, 320, 212, 175, 330, 180],
    counterflow: 0.08,
    signal: { source: 'Timeline', message: 'Simulated loss of two of six gates. Throughput falls; arrivals do not.' },
  },
  {
    t: -60,
    label: 'Funnel overloading',
    note: 'Exit funnel past the congested band with inflow unchanged.',
    counts: [70, 225, 68, 230, 375, 236, 205, 445, 210],
    counterflow: 0.14,
    signal: { source: 'Forecast', message: 'R3C2 past the congested band with inflow unchanged. Operator review required.' },
  },
  {
    t: -30,
    label: 'Crush-risk density',
    note: 'Involuntary contact; individuals no longer choose their own path.',
    counts: [52, 230, 50, 250, 425, 255, 230, 570, 235],
    counterflow: 0.24,
    signal: { source: 'Forecast', message: 'R3C2 in the crush-risk band. Movement is involuntary at this density.' },
  },
  {
    t: 0,
    label: 'Progressive compression',
    note: 'Counterflow at the front of the queue meets continued inflow behind it.',
    counts: [40, 225, 40, 262, 455, 266, 246, 690, 250],
    counterflow: 0.38,
    signal: { source: 'Tracker', message: 'Counterflow at the queue front. Track coverage falling as heads occlude.' },
  },
  {
    t: 30,
    label: 'Critical density',
    note: 'Densities in the band associated with crowd-collapse incidents.',
    counts: [36, 220, 36, 268, 470, 272, 252, 745, 256],
    counterflow: 0.46,
    signal: { source: 'Forecast', message: 'R3C2 in the critical band. Counts here are least reliable exactly when they matter most.' },
  },
  {
    t: 120,
    label: 'Held',
    note: 'Condition persisting. Nothing in this console resolves it.',
    counts: [34, 215, 34, 265, 465, 268, 250, 730, 254],
    counterflow: 0.42,
    signal: { source: 'Forecast', message: 'Condition persisting. Nothing in this console resolves it.' },
  },
];

const venue = {
  id: 'plaza',
  name: 'Venue plaza',
  short: 'GENERIC PLAZA',
  place: 'No real place — the generic 3×3 analysed region',
  kind: 'generic',
  cell: { width: CELL, depth: CELL },
  gap: { x: GAP, z: GAP },
  cellArea: CELL * CELL,
  zoneLabels: {
    R1C1: 'North-west stand',
    R1C2: 'North gate approach',
    R1C3: 'North-east stand',
    R2C1: 'West concourse',
    R2C2: 'Central concourse',
    R2C3: 'East concourse',
    R3C1: 'South-west ramp',
    R3C2: 'Main exit funnel',
    R3C3: 'South-east ramp',
  },
  camera: { position: [-48, 42, 55], target: [0, 0, -2] },
  lighting: {
    mode: 'day',
    sun: [-55, 45, 40],
    sunColor: '#FFE1B5',
    sunIntensity: 2.4,
    hemisphere: { sky: '#CFE0F5', ground: '#9C8B70', intensity: 0.85 },
    ambient: 0.2,
    fog: { color: '#DDE3E8', density: 0.0024 },
    sky: { turbidity: 6, rayleigh: 1.4, mieCoefficient: 0.004, mieDirectionalG: 0.8 },
  },
  ground: { color: '#7FA06A', texture: 'grass', size: 180, repeat: [36, 36] },
  overlay: { columnMax: 9 },
  trees: true,
  structures: [
    { type: 'plane', id: 'plaza-paving', x: 0, z: 0, w: PITCH * 3 + 6, d: PITCH * 3 + 6, y: 0.002, texture: 'plaza', repeat: [14, 14], color: '#E4E0D8' },
    { type: 'box', id: 'arena-facade', x: 0, z: -EDGE - 24, w: 96, h: 16, d: 10, texture: 'concrete', repeat: [12, 2], color: '#D9D3C7' },
    { type: 'box', id: 'arena-roof', x: 0, z: -EDGE - 31, w: 100, h: 0.4, d: 16, y: 17, rotationX: 0.1, color: '#F1F1EE' },
    { type: 'sign', id: 'arena-sign', text: 'EVENT ARENA', x: 0, z: -EDGE - 18.9, y: 12, w: 16, h: 2.2, background: '#1F2937', color: '#FFFFFF' },
    ...kiosks(),
  ],
  labels: [],
  cameras: [
    { id: 'camera-1', label: 'CAM 01', x: -PITCH, z: PITCH + 11, rotation: 0, covers: ['R3C1', 'R3C2', 'R2C1'] },
    { id: 'camera-2', label: 'CAM 02', x: PITCH, z: PITCH + 11, rotation: 0, covers: ['R3C3', 'R3C2', 'R2C3'] },
    { id: 'camera-3', label: 'CAM 03', x: -PITCH - 11, z: -PITCH, rotation: Math.PI / 2, covers: ['R1C1', 'R2C1'] },
    { id: 'camera-4', label: 'CAM 04', x: PITCH + 11, z: -PITCH, rotation: -Math.PI / 2, covers: ['R1C3', 'R2C3'] },
  ],
  gates: Array.from({ length: 6 }, (_, index) => ({
    id: `GATE-${String(index + 1).padStart(2, '0')}`,
    x: (index - 2.5) * 6.4,
    z: 27,
    rotation: 0,
    width: 3.4,
    zone: index < 2 ? 'R3C1' : index < 4 ? 'R3C2' : 'R3C3',
  })),
  gateLine: { x: 0, z: 27, length: 30, rotation: 0 },
  gateLabel: 'EGRESS LINE',
  corridors: {
    inbound: [
      [0, 1.4, -32],
      [0, 4.5, -20],
      [0, 3.4, -14.4],
      [0, 2.6, 0],
    ],
    egress: [
      [0, 2.6, 0],
      [0, 3.6, 14.4],
      [0, 2.2, 22],
      [0, 1.2, 28],
    ],
    lateral: [
      [-14.4, 2.4, 0],
      [-7, 4.4, 1.2],
      [7, 4.4, -1.2],
      [14.4, 2.4, 0],
    ],
    reversal: [
      [0, 2.2, 20],
      [0, 5.2, 12],
      [0, 5.6, 0],
      [0, 4.0, -12],
    ],
    sceneMotion: [
      [-22, 6.5, -6],
      [0, 7.5, -2],
      [22, 6.5, 2],
    ],
  },
  controlRoom: [0, -34],
  incident: null,
  defaultScenario: 'clear',
  timelines: {
    surge: {
      id: 'surge',
      kind: 'authored',
      title: 'Egress surge — concourse congests',
      summary:
        'End-of-event egress in which arrivals at the main exit funnel exceed gate throughput. ' +
        'The funnel reaches the congested band and then drains.',
      // Set well below the congested band so the projection has somewhere to
      // warn from: a threshold placed at the dangerous density warns on arrival.
      threshold: 240,
      thresholdRange: [60, 900],
      onsetDensity: 2.0,
      onsetLabel: 'congested movement',
      mood: 'egress',
      direction: 'South · toward the gate line',
      keyframes: SURGE_KEYFRAMES,
    },
    crush: {
      id: 'crush',
      kind: 'authored',
      title: 'Crush conditions — gates lost during egress',
      summary:
        'The same egress with two of six gates lost. Inflow continues, the funnel passes the ' +
        'crush-risk band, and counterflow appears at the front of the queue.',
      threshold: 300,
      thresholdRange: [60, 900],
      onsetDensity: 3.5,
      onsetLabel: 'involuntary movement at crush-risk density',
      mood: 'crush',
      direction: 'South with counterflow · image space',
      keyframes: CRUSH_KEYFRAMES,
    },
  },
};

venue.egressField = egressFieldToward(venue, 'R3C2', [0, 1]);

export default venue;
