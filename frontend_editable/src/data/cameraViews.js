// Camera views for presenting a venue: the venue's own vantage point, a plan
// view straight down onto the analysed grid, and the zone the incident is in.
// Plain data so the scene, the controls and the keyboard all agree.

import { layoutZones } from './venueModel.js';

const GROUND_Y = -0.6;

/** The venue's authored vantage point. */
export function overviewView(venue) {
  return { position: venue.camera.position, target: venue.camera.target };
}

/** Straight down onto the analysed grid, high enough to see all nine cells. */
export function topView(venue) {
  const zones = layoutZones(venue);
  const xs = zones.map((zone) => zone.x);
  const zs = zones.map((zone) => zone.z);
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
  const cz = (Math.min(...zs) + Math.max(...zs)) / 2;
  const cy = GROUND_Y + zones.reduce((sum, zone) => sum + zone.y, 0) / zones.length;
  const width = Math.max(...xs) - Math.min(...xs) + venue.cell.width;
  const depth = Math.max(...zs) - Math.min(...zs) + venue.cell.depth;
  const height = Math.max(width, depth) * 1.25 + 12;
  // A hair south of vertical, so the orbit controls keep north at the top.
  return { position: [cx, cy + height, cz + 0.05], target: [cx, cy, cz] };
}

/**
 * The zone to show when asked for the incident: the densest under a
 * simulated grid, else the most loaded zone above threshold, else the centre.
 * @param {Array<{id:string,currentDensity:number|null,ratio:number|null,flagged:boolean}>} zones
 */
export function incidentZone(zones) {
  let best = null;
  for (const zone of zones) {
    if (zone.currentDensity == null) continue;
    if (!best || zone.currentDensity > best.currentDensity) best = zone;
  }
  if (best) return best.id;
  const flagged = zones.filter((zone) => zone.flagged && zone.ratio != null).sort((a, b) => b.ratio - a.ratio);
  return flagged[0]?.id ?? zones[4]?.id ?? null;
}
