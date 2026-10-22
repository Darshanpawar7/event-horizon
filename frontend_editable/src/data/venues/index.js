// Venue registry for the digital twin.
//
// A venue is the geometry the console stands over — cell size and floor area,
// zone names, gates, camera masts, perimeter structures — plus the timelines
// that can play out on it. `plaza` is the generic concourse the project
// started with. The others are reconstructions of real crowd disasters,
// authored from published accounts and driven by the crowd-flow model in
// ../../lib/crowdModel.js.
//
// Every number those reconstructions produce is SIMULATED. They are not
// replays of footage, not official findings and not predictions; their
// purpose is to show what an evidence-bounded console would have put in
// front of an operator, and how much warning the projection would have
// given. Each venue's `incident` block carries the sources it was authored
// from and says so.
//
// Venue shape (JSDoc rather than a schema, so the data files stay plain):
//
//   id, name, short, place, kind ('generic' | 'historic')
//   cell {width, depth}  metres per grid cell; gap {x, z} walkway between cells
//   cellArea             m² one cell stands for (cellAreas[] may override per cell)
//   zoneLabels           R1C1 … R3C3 → venue-specific names
//   camera {position, target}  initial twin camera
//   ground {color, size}, trees (boolean)
//   structures []        boxes, planes, ramps, kiosks drawn by Structures.jsx
//   labels []            floating landmark labels
//   cameras []           masts: id, label, x, z, rotation, covers[]
//   gates [] / gateLine / gateLabel   exits drawn by ExitGates.jsx
//   corridors {}         flow-tube polylines: inbound, egress, lateral, reversal, sceneMotion
//   egressField {}       unit direction per zone during a timeline
//   controlRoom [x, z] | null
//   incident | null      date, time, title, deaths, injured, crowd, summary,
//                        factors[], consoleWouldShow[], prevention[], sources[]
//   defaultScenario      what to show when the venue is selected
//   timelines {}         see ../crowdTimeline.js

import plaza from './plaza.js';
import ndls from './ndls.js';
import chinnaswamy from './chinnaswamy.js';
import sangam from './sangam.js';
import itaewon from './itaewon.js';
import loveparade from './loveparade.js';

/** @type {Record<string, object>} in the order the venue picker shows them */
export const VENUES = { plaza, ndls, chinnaswamy, sangam, itaewon, loveparade };

export const VENUE_IDS = Object.keys(VENUES);

export const DEFAULT_VENUE_ID = 'plaza';

/** @param {string} id @returns {object} the venue, falling back to the plaza */
export function getVenue(id) {
  return VENUES[id] || VENUES[DEFAULT_VENUE_ID];
}

/** Venues that reconstruct a real incident, for the brief panel and the walkthrough. */
export const HISTORIC_VENUE_IDS = VENUE_IDS.filter((id) => VENUES[id].kind === 'historic');
