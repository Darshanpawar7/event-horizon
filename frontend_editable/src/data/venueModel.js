// Grid conventions for the digital twin, plus the explicitly simulated zone
// grid used when the backend supplies no forecast.
//
// Zone naming follows crowd_forecast.py exactly: R{row}C{col}, rows top to
// bottom and columns left to right within the analysed region. Everything
// that depends on a venue's real-world geometry — cell size, floor area,
// labels, gates, cameras — is read from the active venue (see ./venues) rather
// than hard-coded here, so the same console can stand over a plaza, a railway
// platform or a three-metre alley.

export const GRID_SIZE = 3;

/** @type {string[]} R1C1 … R3C3 in reading order. */
export const ZONE_IDS = Array.from(
  { length: GRID_SIZE * GRID_SIZE },
  (_, index) => `R${Math.floor(index / GRID_SIZE) + 1}C${(index % GRID_SIZE) + 1}`,
);

/**
 * The generic plaza cell, in square metres. The five evidence-state scenarios
 * were authored against it; on any other venue their populations and
 * thresholds are scaled by floor area so the densities stay the same.
 */
export const REFERENCE_CELL_AREA = 144;

/** Reference density (persons/m²) at which walking speed collapses to a shuffle. */
export const JAM_DENSITY = 5.4;

/**
 * @param {number|null} count people in one zone
 * @param {number} area floor area of that zone in m²
 * @returns {number|null} persons/m²
 */
export function densityOf(count, area) {
  return count == null || !Number.isFinite(count) || !(area > 0) ? null : count / area;
}

/**
 * Fraction of free walking speed still available at a given density. A crowd
 * slows as it packs; past JAM_DENSITY nobody chooses their own pace.
 * @param {number} density persons/m²
 * @returns {number} 0..1
 */
export function speedFactor(density) {
  return Math.min(1, Math.max(0.04, 1 - density / JAM_DENSITY));
}

/** Fraction of tracks below the slow-motion threshold, rising with density. */
export function slowFractionFor(density) {
  return Math.round(Math.min(0.97, Math.max(0.05, (density - 0.6) / 3.4)) * 100) / 100;
}

/**
 * Compass bearing per zone-to-zone movement, used to orient flow tubes.
 * Values are image-space directions, matching how the backend reports them.
 */
export const DIRECTION_VECTORS = {
  north: [0, -1],
  'north-east': [0.7, -0.7],
  east: [1, 0],
  'south-east': [0.7, 0.7],
  south: [0, 1],
  'south-west': [-0.7, 0.7],
  west: [-1, 0],
  'north-west': [-0.7, -0.7],
};

/**
 * Resolve a backend `dominant_direction` string to a unit vector.
 * Returns null when the direction is absent or unparseable — the twin then
 * renders no flow rather than inventing one.
 * @param {string|null|undefined} value
 * @returns {[number, number]|null}
 */
export function directionVector(value) {
  if (typeof value !== 'string') return null;
  const normalized = value.toLowerCase();
  const match = Object.keys(DIRECTION_VECTORS)
    .sort((a, b) => b.length - a.length)
    .find((key) => normalized.includes(key));
  return match ? DIRECTION_VECTORS[match] : null;
}

/**
 * Default concentration threshold per evidence-state scenario, in projected
 * tracks for a REFERENCE_CELL_AREA cell, with the slider bounds that make it
 * adjustable. The threshold is an operator setting; these are simply the
 * values that make each simulated scenario legible.
 */
export const SCENARIO_THRESHOLDS = {
  clear: { threshold: 300, range: [40, 600] },
  tracking: { threshold: 300, range: [40, 600] },
  visibility: { threshold: 300, range: [40, 600] },
  camera: { threshold: 300, range: [40, 600] },
  collective: { threshold: 340, range: [40, 600] },
};

/** Rounds a scaled count to a figure an operator can read off a slider. */
function nice(value) {
  if (value >= 1000) return Math.round(value / 50) * 50;
  if (value >= 200) return Math.round(value / 10) * 10;
  if (value >= 50) return Math.round(value / 5) * 5;
  return Math.max(1, Math.round(value));
}

/** Scales a reference-cell population to the active venue's cell area. */
export function scaleCount(value, venue) {
  return Math.round(value * (venue.cellArea / REFERENCE_CELL_AREA));
}

/**
 * Threshold and slider bounds for an evidence-state scenario on this venue.
 * @param {string} scenario
 * @param {{cellArea:number}} venue
 * @returns {{threshold:number, range:[number, number]}}
 */
export function scenarioThreshold(scenario, venue) {
  const base = SCENARIO_THRESHOLDS[scenario] || SCENARIO_THRESHOLDS.clear;
  const factor = venue.cellArea / REFERENCE_CELL_AREA;
  return {
    threshold: nice(base.threshold * factor),
    range: [nice(base.range[0] * factor), nice(base.range[1] * factor)],
  };
}

/**
 * @typedef {object} ZoneCell
 * @property {string} id
 * @property {number} row 1..3
 * @property {number} col 1..3
 * @property {number} x world centre, metres
 * @property {number} z world centre, metres
 * @property {number} width metres across (x)
 * @property {number} depth metres along (z)
 * @property {number} area m² the cell stands for
 * @property {string} label venue-specific name
 */

const layouts = new Map();

/**
 * The nine cells of a venue laid out in world space, one unit per metre.
 * Memoised per venue id — the result is identity-stable so it can feed hooks.
 * @param {object} venue
 * @returns {ZoneCell[]}
 */
export function layoutZones(venue) {
  if (layouts.has(venue.id)) return layouts.get(venue.id);
  const pitchX = venue.cell.width + venue.gap.x;
  const pitchZ = venue.cell.depth + venue.gap.z;
  const zones = ZONE_IDS.map((id, index) => {
    const row = Math.floor(index / GRID_SIZE);
    const col = index % GRID_SIZE;
    return {
      id,
      row: row + 1,
      col: col + 1,
      x: (col - 1) * pitchX,
      z: (row - 1) * pitchZ,
      width: venue.cell.width,
      depth: venue.cell.depth,
      area: venue.cellAreas?.[index] ?? venue.cell.width * venue.cell.depth,
      label: venue.zoneLabels?.[id] || id,
    };
  });
  layouts.set(venue.id, zones);
  return zones;
}

/**
 * Unit direction each zone's crowd walks toward a target zone, in world space,
 * with the target itself pointing in `exitDirection`.
 * @param {object} venue
 * @param {string} targetId
 * @param {[number, number]} exitDirection
 * @returns {Record<string, [number, number]>}
 */
export function egressFieldToward(venue, targetId, exitDirection) {
  const zones = layoutZones(venue);
  const target = zones.find((zone) => zone.id === targetId) || zones[4];
  const field = {};
  for (const zone of zones) {
    if (zone.id === target.id) {
      field[zone.id] = exitDirection;
      continue;
    }
    const dx = target.x - zone.x;
    const dz = target.z - zone.z;
    const length = Math.hypot(dx, dz) || 1;
    field[zone.id] = [dx / length, dz / length];
  }
  return field;
}

/**
 * Explicitly simulated zone grids, one per evidence-state scenario.
 *
 * These mirror the gating rules in crowd_forecast.py: a projection is only
 * produced when visibility is reference-like, the motion signals agree, and
 * enough continuous tracks are eligible. Every other scenario yields
 * UNAVAILABLE with the same reason text the Python baseline would emit.
 *
 * Populations are authored for the 144 m² reference cell — 90–290 people is
 * roughly 0.6–2.0 persons/m², the range an occupied plaza actually sits in —
 * and scaled to the venue's cell area. `clear` stays below its threshold at
 * every horizon, while `collective` drains the northern zones and concentrates
 * on R3C2.
 */
const COUNTS = {
  clear: [86, 120, 92, 104, 155, 110, 95, 132, 98],
  collective: [90, 128, 88, 150, 240, 155, 165, 290, 170],
};

/** Change in eligible tracks per second of projection, reference cell. */
const DRIFT = {
  clear: [4, -5, 2, 6, -3, -4, 3, 5, -2],
  collective: [-14, -20, -12, 4, 16, 12, 22, 30, 18],
};

/**
 * Build a forecast payload shaped exactly like CrowdForecast.update()'s return
 * value, so a real backend forecast can be dropped in without UI changes.
 *
 * @param {string} scenario one of the evidence-state scenario keys
 * @param {number} threshold concentration threshold in projected tracks
 * @param {object} venue the active venue, for cell areas
 * @returns {{status:string, reason:string, coverage:number, cells:object[], advice:string, origin:string}}
 */
export function simulatedForecast(scenario, threshold, venue) {
  const unavailable = (reason) => ({
    status: 'UNAVAILABLE',
    reason,
    coverage: 0,
    cells: [],
    advice: 'Check the view and track continuity before interpreting crowd movement.',
    origin: 'simulated',
  });

  if (scenario === 'visibility') {
    return unavailable('Visibility changed or the motion signals disagree.');
  }
  if (scenario === 'tracking' || scenario === 'camera') {
    return unavailable('Too few continuous tracks: need at least 3 and 60% of current detections.');
  }

  const zones = layoutZones(venue);
  const base = (COUNTS[scenario] || COUNTS.clear).map((value) => scaleCount(value, venue));
  const drift = (DRIFT[scenario] || DRIFT.clear).map((value) => scaleCount(value, venue));
  const cells = [];

  for (const horizon of [1, 2, 3]) {
    for (let index = 0; index < base.length; index += 1) {
      const projected = Math.max(0, base[index] + drift[index] * horizon);
      const density = projected / zones[index].area;
      cells.push({
        cell: ZONE_IDS[index],
        horizon_s: horizon,
        current_eligible: base[index],
        projected_tracks: projected,
        change: projected - base[index],
        slow_fraction: slowFractionFor(density),
        density_per_m2: Math.round(density * 100) / 100,
        concentration_flag: projected >= threshold,
      });
    }
  }

  const hotspots = cells.filter((cell) => cell.concentration_flag);
  const peak = hotspots.length
    ? hotspots.reduce((best, cell) =>
        cell.projected_tracks > best.projected_tracks ||
        (cell.projected_tracks === best.projected_tracks && cell.horizon_s < best.horizon_s)
          ? cell
          : best,
      )
    : null;

  return {
    status: hotspots.length ? 'REVIEW CONCENTRATION' : 'PROJECTION AVAILABLE',
    reason: 'Constant-velocity projection of eligible observed tracks only.',
    coverage: scenario === 'collective' ? 0.76 : 0.82,
    cells,
    advice: peak
      ? `Inspect ${peak.cell}: ${peak.projected_tracks} eligible tracks projected at +${peak.horizon_s} s. ` +
        'Review bottlenecks and entry rate. Check venue conditions before considering another route; ' +
        'this model does not establish route safety.'
      : 'No configured concentration threshold exceeded in this projection. This is not an all-clear.',
    origin: 'simulated',
  };
}

/**
 * Collapse a forecast payload into one record per zone at the chosen horizon.
 *
 * @param {{cells?: object[]}|null} forecast
 * @param {number} horizon 1, 2 or 3 seconds
 * @param {number} threshold concentration threshold
 * @param {object} venue the active venue, for geometry and labels
 * @returns {Array<ZoneCell & {current:number|null, projected:number|null, change:number|null,
 *   slowFraction:number|null, density:number|null, currentDensity:number|null, flagged:boolean, ratio:number|null}>}
 */
export function zoneRows(forecast, horizon, threshold, venue) {
  const byId = new Map();
  for (const cell of forecast?.cells || []) {
    if (cell.horizon_s === horizon) byId.set(cell.cell, cell);
  }
  return layoutZones(venue).map((zone) => {
    const cell = byId.get(zone.id);
    const projected = cell ? cell.projected_tracks : null;
    return {
      ...zone,
      current: cell ? cell.current_eligible : null,
      projected,
      change: cell ? cell.change : null,
      slowFraction: cell ? cell.slow_fraction : null,
      // Present only for simulated grids, where the zone's floor area is known.
      // A backend forecast counts tracks in image cells and supplies no area,
      // so both of these stay null rather than inventing one.
      density: cell?.density_per_m2 ?? null,
      currentDensity: cell?.density_per_m2 == null ? null : densityOf(cell.current_eligible, zone.area),
      flagged: Boolean(cell?.concentration_flag),
      ratio: projected == null || threshold <= 0 ? null : projected / threshold,
    };
  });
}
