// M. Chinnaswamy Stadium, Bengaluru — 4 June 2025.
//
// A reconstruction of the approach to one gate cluster on the stadium's
// west side, authored from published accounts and driven by the crowd-flow
// model. Nothing here is footage, an official finding or a measurement of
// the real streets.

import { egressFieldToward } from '../venueModel.js';

const W = 10; // metres from the road toward the stadium wall, per column
const D = 15; // metres along the wall, per row
const WALL_X = 15 + 6; // stadium wall centre
const ASPHALT = '#8E9094';
const PAVEMENT = '#CFCFCA';

const venue = {
  id: 'chinnaswamy',
  name: 'M. Chinnaswamy Stadium — gate 6/7 approach',
  short: 'CHINNASWAMY GATES',
  place: 'Bengaluru, India',
  kind: 'historic',
  cell: { width: W, depth: D },
  gap: { x: 0, z: 0 },
  cellArea: W * D,
  zoneLabels: {
    R1C1: 'Cubbon Road carriageway · north',
    R1C2: 'Pavement and barricades · north',
    R1C3: 'Gate 6 forecourt',
    R2C1: 'Cubbon Road carriageway',
    R2C2: 'Pavement between the gates',
    R2C3: 'Wall between gates 6 and 7',
    R3C1: 'Cubbon Road carriageway · south',
    R3C2: 'Pavement and barricades · south',
    R3C3: 'Gate 7 forecourt',
  },
  camera: { position: [-50, 34, 44], target: [4, 2, 0] },
  ground: { color: PAVEMENT, size: 180 },
  trees: false,
  treePositions: [
    [-36, 0, -40],
    [-36, 0, -24],
    [-36, 0, -8],
    [-36, 0, 8],
    [-36, 0, 24],
    [-36, 0, 40],
    [-44, 0, -32],
    [-44, 0, -16],
    [-44, 0, 0],
    [-44, 0, 16],
    [-44, 0, 32],
  ],
  structures: [
    // Cubbon Road and the park beyond it
    { type: 'plane', x: -14, z: 0, w: 14, d: 150, color: ASPHALT, y: 0.01 },
    { type: 'plane', x: -40, z: 0, w: 30, d: 150, color: '#B7C7A6', y: 0.005 },
    // Pavement barricade line (gaps where the police let people through)
    ...[-32, -20, -8, 4, 16, 28].map((z) => ({ type: 'box', x: -5.2, z, w: 0.12, h: 1.1, d: 8, color: '#D8D8D8' })),
    // Stadium stand: outer wall, tier and roof
    { type: 'box', x: WALL_X, z: 0, w: 12, h: 11, d: 120, color: '#C9C4BA' },
    { type: 'box', x: WALL_X + 8, z: 0, w: 10, h: 16, d: 120, color: '#B8B2A6' },
    { type: 'box', x: WALL_X + 6, z: 0, w: 26, h: 0.6, d: 124, color: '#6B7079', y: 16 },
    // Gate openings: frames with a shutter
    ...[-15, 15].flatMap((z) => [
      { type: 'box', x: WALL_X - 6.2, z, w: 0.6, h: 4.2, d: 4.6, color: '#2E3238' },
      { type: 'box', x: WALL_X - 6.5, z, w: 0.2, h: 3.6, d: 3.4, color: '#FF6600' },
    ]),
    // Floodlight pylons
    ...[-50, 50].map((z) => ({ type: 'box', x: WALL_X + 14, z, w: 1.4, h: 44, d: 1.4, color: '#6B7079' })),
    ...[-50, 50].map((z) => ({ type: 'box', x: WALL_X + 14, z, w: 6, h: 2.2, d: 6, color: '#F3F4F6', y: 44 })),
  ],
  labels: [
    { text: 'CUBBON ROAD', x: -14, z: -56, y: 2.5 },
    { text: 'CUBBON PARK', x: -40, z: -56, y: 2.5 },
    { text: 'GATE 6', x: WALL_X - 7, z: -15, y: 6 },
    { text: 'GATE 7', x: WALL_X - 7, z: 15, y: 6 },
    { text: 'STADIUM STAND', x: WALL_X + 6, z: 0, y: 19 },
    { text: 'FROM MG ROAD →', x: -14, z: 60, y: 2.5 },
  ],
  cameras: [
    { id: 'camera-1', label: 'CAM 01', x: 6, z: -36, rotation: Math.PI, covers: ['R1C2', 'R1C3', 'R2C3'] },
    { id: 'camera-2', label: 'CAM 02', x: 6, z: 36, rotation: 0, covers: ['R3C2', 'R3C3', 'R2C3'] },
  ],
  gates: [
    { id: 'GATE-06', x: WALL_X - 7.5, z: -15, rotation: -Math.PI / 2, width: 3, zone: 'R1C3' },
    { id: 'GATE-07', x: WALL_X - 7.5, z: 15, rotation: -Math.PI / 2, width: 3, zone: 'R3C3' },
  ],
  gateLine: null,
  gateLabel: 'STADIUM GATES',
  corridors: {
    inbound: [
      [-16, 1.6, 44],
      [-14, 3.4, 20],
      [-8, 3.2, 8],
      [0, 2.6, 0],
    ],
    egress: [
      [0, 2.6, 0],
      [6, 3.6, -6],
      [10, 3.0, -12],
      [13, 2.2, -15],
    ],
    lateral: [
      [-14, 2.4, -30],
      [-13, 4.0, -10],
      [-13, 4.0, 10],
      [-14, 2.4, 30],
    ],
    reversal: [
      [12, 2.4, 14],
      [6, 5.0, 8],
      [-4, 5.4, 2],
      [-12, 4.0, -6],
    ],
    sceneMotion: [
      [-20, 6.5, -40],
      [-14, 7.0, 0],
      [-20, 6.5, 40],
    ],
  },
  controlRoom: [WALL_X + 6, -70],
  incident: {
    date: '4 June 2025',
    time: '≈ 15:30 onward IST',
    title: 'Crowd crush at the stadium gates during the RCB victory celebration',
    deaths: '11',
    injured: '56',
    crowd: 'About 250,000 people on the surrounding streets by the state\'s account to the High Court; roughly 50,000 within a kilometre by the police count; a stadium of about 32,000 seats',
    summary:
      'A day after Royal Challengers Bengaluru won their first IPL title, a felicitation was announced at the ' +
      'stadium with an open-top bus parade that was cancelled hours before. At 15:14 the team\'s account ' +
      'announced free passes, and crowds already massed since 14:00 pressed toward gates that were opened and ' +
      'closed in turn. The crush developed across eight entry gates; most deaths were near gates 6 and 7 and ' +
      'between gates 17 and 21.',
    factors: [
      'A venue of about 32,000 seats drew a crowd estimated in the hundreds of thousands, with no standard operating procedure in place.',
      'The free-pass announcement at 15:14 sent people without tickets toward gates that could not admit them.',
      'Gates opening and closing created surges toward each opening and counterflow away from each closure.',
      'The inquiry commission found policing failure to be the main cause and also blamed the franchise, the cricket association and the event organiser.',
    ],
    consoleWouldShow: [
      'Every forecourt cell (the C3 column) loading faster than the gates could ever drain it, with the projection flagging the first cell long before the gates were rushed.',
      'The pavement and carriageway cells behind the forecourt filling in turn: the queue backing up away from the wall, which is the signature of an exit that cannot cope.',
      'Counterflow each time a gate closed, raised by the collective-movement rule as a verification alert rather than a surge probability.',
      'A falling track-coverage figure as the forecourt packed, so no one could read the count as confident.',
    ],
    prevention: [
      'Hold the crowd at the MG Road and Cubbon Road junctions once the forecourt projection crosses threshold, instead of letting arrivals reach the wall.',
      'Open all gates for controlled dispersal into the stands rather than opening and closing them — or, with no passes checked, announce the cancellation and relocation plainly.',
      'Treat the free-pass announcement as a crowd-control event: no message goes out while the forecourts are above the congested band.',
    ],
    caveats: [
      'Only one gate cluster is modelled; the real crush ran along eight gates around the stadium.',
      'Arrival rates are inferred from crowd estimates that themselves range from 50,000 to 250,000.',
      'The road, pavement and forecourt widths are schematic.',
    ],
    sources: [
      { label: 'Wikipedia — 2025 Bengaluru stampede', url: 'https://en.wikipedia.org/wiki/2025_Bengaluru_stampede' },
      {
        label: 'The News Minute — commission finds fault with police, RCB, organisers',
        url: 'https://www.thenewsminute.com/karnataka/bengaluru-stampede-commission-finds-fault-with-police-rcb-organisers',
      },
      {
        label: 'The Week (PTI) — inquiry commission blames organisers and senior police officials',
        url: 'https://www.theweek.in/wire-updates/national/2025/07/24/mds21-ka-stampede-panel-report.html',
      },
    ],
  },
  defaultScenario: 'incident',
  timelines: {
    incident: {
      id: 'incident',
      kind: 'model',
      title: 'As reported — the gates open and close',
      summary:
        'Fans arrive along Cubbon Road from both directions while the gates admit a few hundred at a time and then ' +
        'shut. The forecourts pass the crush-risk band; the pavement and carriageway behind them follow. T0 is ' +
        'the reported time the crush began.',
      threshold: 330,
      thresholdRange: [60, 1200],
      onsetDensity: 3.5,
      onsetLabel: 'involuntary movement at crush-risk density',
      mood: 'crush',
      direction: 'East · toward the stadium wall',
      model: {
        start: -1500,
        end: 900,
        lengths: [10, 10, 10, 10, 10, 10, 10, 10, 10],
        initial: [80, 100, 140, 80, 110, 160, 90, 110, 150],
        statics: [
          [-1500, [0.3, 0.4, 0.55, 0.3, 0.4, 0.55, 0.3, 0.4, 0.55]],
          [-960, [0.2, 0.3, 0.45, 0.2, 0.3, 0.45, 0.2, 0.3, 0.45]],
          [-840, [0.1, 0.2, 0.35, 0.1, 0.2, 0.35, 0.1, 0.2, 0.35]],
        ],
        links: [
          // Toward the wall, with some drift back and along it.
          { from: 'R1C1', to: 'R1C2', width: 15, share: [[-1500, 0.06], [-960, 0.15], [-840, 0.3]] },
          { from: 'R2C1', to: 'R2C2', width: 15, share: [[-1500, 0.06], [-960, 0.15], [-840, 0.3]] },
          { from: 'R3C1', to: 'R3C2', width: 15, share: [[-1500, 0.06], [-960, 0.15], [-840, 0.3]] },
          { from: 'R1C2', to: 'R1C3', width: 15, share: [[-1500, 0.05], [-960, 0.18], [-840, 0.35]] },
          { from: 'R2C2', to: 'R2C3', width: 15, share: [[-1500, 0.05], [-960, 0.18], [-840, 0.35]] },
          { from: 'R3C2', to: 'R3C3', width: 15, share: [[-1500, 0.05], [-960, 0.18], [-840, 0.35]] },
          { from: 'R1C3', to: 'R1C2', width: 15, share: 0.06 },
          { from: 'R2C3', to: 'R2C2', width: 15, share: 0.06 },
          { from: 'R3C3', to: 'R3C2', width: 15, share: 0.06 },
          { from: 'R1C2', to: 'R1C1', width: 15, share: 0.04 },
          { from: 'R2C2', to: 'R2C1', width: 15, share: 0.04 },
          { from: 'R3C2', to: 'R3C1', width: 15, share: 0.04 },
          { from: 'R2C3', to: 'R1C3', width: 10, share: 0.25 },
          { from: 'R2C3', to: 'R3C3', width: 10, share: 0.25 },
          { from: 'R1C2', to: 'R2C2', width: 10, share: 0.08 },
          { from: 'R3C2', to: 'R2C2', width: 10, share: 0.08 },
          { from: 'R2C2', to: 'R1C2', width: 10, share: 0.08 },
          { from: 'R2C2', to: 'R3C2', width: 10, share: 0.08 },
          { from: 'R1C1', to: 'R2C1', width: 10, share: 0.08 },
          { from: 'R3C1', to: 'R2C1', width: 10, share: 0.08 },
          { from: 'R2C1', to: 'R1C1', width: 10, share: 0.08 },
          { from: 'R2C1', to: 'R3C1', width: 10, share: 0.08 },
        ],
        sources: [
          { id: 'from-mg-road', cell: 'R3C1', rate: [[-1500, 1.0], [-960, 2.5], [-840, 4.5], [-300, 5.5], [600, 2.0]] },
          { id: 'from-cubbon-north', cell: 'R1C1', rate: [[-1500, 0.6], [-960, 1.6], [-840, 3.0], [-300, 3.5], [600, 1.5]] },
        ],
        sinks: [
          {
            id: 'gate-6',
            cell: 'R1C3',
            width: 3,
            share: 0.8,
            open: [[-1500, false], [-1200, true], [-1080, false], [-420, true], [-300, false], [300, true]],
          },
          {
            id: 'gate-7',
            cell: 'R3C3',
            width: 3,
            share: 0.8,
            open: [[-1500, false], [-1140, true], [-1020, false], [-360, true], [-240, false], [360, true]],
          },
        ],
        counterflow: [
          [-1500, 0.04],
          [-900, 0.1],
          [-240, 0.25],
          [0, 0.35],
          [600, 0.25],
        ],
      },
      phases: [
        {
          t: -1500,
          label: 'Crowds massing since 14:00',
          note: 'The parade is cancelled; fans gather at the gates for the felicitation. Gates are shut.',
          signal: { source: 'Model', message: 'Crowd-flow model loaded for the gate 6/7 approach. Counts below are simulated from published accounts.' },
        },
        {
          t: -960,
          label: '15:14 — free passes announced',
          note: 'The team\'s account announces free entry. Arrivals along Cubbon Road jump; many have no pass.',
          signal: { source: 'Tracker', message: 'Arrival rate on the carriageway cells roughly doubles within two minutes of the announcement.' },
        },
        {
          t: -420,
          label: 'Gates opened, then shut',
          note: 'A gate admits a few hundred people and closes again. Each opening pulls the crowd toward it; each closure sends a wave back.',
          signal: { source: 'Flow', message: 'Opposed motion at the forecourt as a gate closes. Collective-movement rule raised for verification.' },
        },
        {
          t: -240,
          label: 'Forecourts past the congested band',
          note: 'The forecourt cells are in the crush-risk band with inflow unchanged; the pavement behind them is now loading.',
          signal: { source: 'Forecast', message: 'R3C3 and R1C3 both above threshold at +3 s. Pavement cells rising behind them.' },
        },
        {
          t: 0,
          label: 'The crush begins',
          note: 'The reported onset. People fall at the gates; the crowd behind cannot see it and keeps pressing. Counts here are least reliable exactly when they matter most.',
          signal: { source: 'Forecast', message: 'Forecourt cells in the critical band. Track coverage below 50%; the count is a floor, not a measurement.' },
        },
        {
          t: 300,
          label: 'Gates opened',
          note: 'The gates are opened; the forecourt drains into the stands but the pavement and road remain congested.',
        },
      ],
    },
    intervention: {
      id: 'intervention',
      kind: 'model',
      branchOf: 'incident',
      title: 'With the warning acted on — approaches held, gates open',
      summary:
        'The same model until the projection first crosses the operator threshold. Ninety seconds later the police ' +
        'hold the crowd at the road junctions, the gates are opened for controlled dispersal and the message to ' +
        'the crowd is made plain. Everything after the action is a counterfactual.',
      threshold: 330,
      thresholdRange: [60, 1200],
      onsetDensity: 3.5,
      onsetLabel: 'involuntary movement at crush-risk density',
      mood: 'egress',
      direction: 'East · toward the stadium wall',
      model: 'incident',
      intervention: {
        reactionSeconds: 90,
        title: 'Police act on the forecourt projection',
        note: 'Ninety seconds allows for a radio call to the junction cordons and the gate teams already at the wall.',
        actions: [
          { type: 'meter', source: 'from-mg-road', rate: 0.6, label: 'Hold the crowd at the MG Road junction; no further approach to the wall' },
          { type: 'meter', source: 'from-cubbon-north', rate: 0.4, label: 'Hold the crowd at the Cubbon Road junction' },
          { type: 'open', sink: 'gate-6', width: 6, label: 'Open gate 6 fully for controlled dispersal into the stands' },
          { type: 'open', sink: 'gate-7', width: 6, label: 'Open gate 7 fully for controlled dispersal into the stands' },
          { type: 'counterflow', fraction: 0.08, label: 'Plain public address: gates stay open, no passes checked, move forward slowly' },
        ],
        phases: [
          { dt: 0, label: 'Operator acts', note: 'Junction cordons hold arrivals; both gates open and stay open. The forecourts stop loading.', signal: { source: 'Operator', message: 'Approaches held and gates opened after the projection crossed threshold (simulated action).' } },
          { dt: 120, label: 'Forecourts draining', note: 'Open gates drain the forecourt cells; the pavement behind them follows. Held arrivals wait at the junctions, outside the camera view.' },
          { dt: 360, label: 'Controlled admission', note: 'The remaining crowd enters at the pace the gates allow. No cell is above the congested band.' },
        ],
      },
    },
  },
};

venue.egressField = egressFieldToward(venue, 'R2C3', [1, 0]);
// The forecourt cells walk straight at their gates rather than toward the wall between them.
venue.egressField.R1C3 = [1, 0];
venue.egressField.R3C3 = [1, 0];

export default venue;
