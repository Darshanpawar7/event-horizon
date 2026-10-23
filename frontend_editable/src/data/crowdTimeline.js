// Time-evolving crowd scenarios for the digital twin.
//
// Everything in this file is an explicitly authored or simulated sequence. It
// is not a model output of the backend, not a replay of a real incident, and
// not a prediction. Its purpose is to let an operator rehearse what the
// console looks like while a space fills, congests and reaches the densities
// associated with crowd crush — and to show how much warning the +1/+2/+3 s
// projection gives, and what acting on that warning changes.
//
// Two kinds of timeline exist:
//   * authored — hand-written keyframes (the generic plaza's surge and crush);
//   * model    — produced by the cell-transmission crowd model in
//                ../lib/crowdModel.js from a venue's authored parameters. The
//                historic reconstructions use this kind, and each has a
//                counterfactual branch in which an operator acts on the
//                projection's warning after a stated reaction time.

import { runModel, summarise } from '../lib/crowdModel.js';
import { ZONE_IDS, layoutZones, slowFractionFor } from './venueModel.js';

/** @param {object} venue @param {string} scenario */
export function isTimelineScenario(venue, scenario) {
  return Boolean(venue?.timelines && Object.prototype.hasOwnProperty.call(venue.timelines, scenario));
}

/**
 * @typedef {object} Timeline
 * @property {string} id            scenario id within the venue
 * @property {string} venueId
 * @property {string} title
 * @property {string} summary
 * @property {'authored'|'model'} kind
 * @property {number} threshold     default concentration threshold, projected tracks
 * @property {[number, number]} thresholdRange slider bounds
 * @property {number} onsetDensity  persons/m² the headline condition begins at
 * @property {string} onsetLabel
 * @property {'egress'|'crush'} mood scene lighting
 * @property {string} direction     dominant direction text, image-space wording
 * @property {number[]} areas       m² per cell, ZONE_IDS order
 * @property {Array<{t:number, counts:number[], counterflow:number, outside?:number}>} keyframes
 * @property {Array<{t:number, label:string, note:string, signal?:{source:string,message:string}}>} phases
 * @property {null|{at:number|null, warnAt:number|null, reactionSeconds:number, title:string,
 *   note:string, actions:string[]}} intervention
 * @property {object} stats         summarise() of this timeline
 * @property {object|null} baseline summarise() of the branch this diverged from
 */

const cache = new Map();

/**
 * Resolve a venue scenario to a built timeline. Branches that act on the
 * projection's warning depend on the operator's threshold and horizon, so
 * those are part of the cache key; everything else is built once.
 *
 * @param {object} venue
 * @param {string} scenario
 * @param {number} threshold
 * @param {number} horizon
 * @returns {Timeline|null}
 */
export function getTimeline(venue, scenario, threshold, horizon) {
  const spec = venue?.timelines?.[scenario];
  if (!spec) return null;
  const key = spec.branchOf ? `${venue.id}|${scenario}|${threshold}|${horizon}` : `${venue.id}|${scenario}`;
  if (cache.has(key)) return cache.get(key);
  const built = build(venue, spec, threshold, horizon);
  cache.set(key, built);
  return built;
}

function build(venue, spec, threshold, horizon) {
  const areas = layoutZones(venue).map((zone) => zone.area);
  const common = {
    id: spec.id,
    venueId: venue.id,
    title: spec.title,
    summary: spec.summary,
    kind: spec.kind,
    threshold: spec.threshold,
    thresholdRange: spec.thresholdRange,
    onsetDensity: spec.onsetDensity,
    onsetLabel: spec.onsetLabel,
    mood: spec.mood || 'egress',
    direction: spec.direction || 'South · image space',
    areas,
    intervention: null,
    baseline: null,
  };

  if (spec.kind === 'authored') {
    const keyframes = spec.keyframes;
    return {
      ...common,
      keyframes,
      phases: keyframes.map(({ t, label, note, signal }) => ({ t, label, note, signal })),
      stats: summarise(keyframes, { areas, ids: ZONE_IDS }),
    };
  }

  // A branch names the timeline whose model it reuses rather than repeating it.
  const source = typeof spec.model === 'string' ? venue.timelines[spec.model].model : spec.model;
  const row = (id) => id.charAt(1);
  const model = {
    ids: ZONE_IDS,
    areas,
    lengths: areas.map(() => venue.cell.depth),
    ...source,
    // Moving to a neighbouring column crosses the cell's width; to a
    // neighbouring row, its depth. A link may still state its own length.
    links: source.links.map((link) => ({
      ...link,
      length: link.length ?? (row(link.from) === row(link.to) ? venue.cell.width : venue.cell.depth),
    })),
  };

  if (!spec.branchOf) {
    const run = runModel(model);
    return { ...common, keyframes: run.keyframes, phases: spec.phases, stats: run.stats };
  }

  // A counterfactual: the same model, with the operator acting a fixed
  // reaction time after the projection first crosses the threshold.
  const parent = getTimeline(venue, spec.branchOf, threshold, horizon);
  const lead = timelineLeadTime(parent, threshold, horizon);
  const plan = spec.intervention;
  const at = lead.warnAt == null ? null : lead.warnAt + plan.reactionSeconds;
  const run = runModel(model, { at, actions: at == null ? [] : plan.actions });

  const phases = [
    ...parent.phases.filter((phase) => at == null || phase.t < at),
    ...(at == null
      ? [
          {
            t: parent.phases[0]?.t ?? model.start,
            label: 'No warning at this threshold',
            note: 'The projection never crosses the configured threshold, so there is nothing for an operator to act on and this branch is identical to the reconstruction.',
          },
        ]
      : plan.phases.map((phase) => ({ ...phase, t: at + phase.dt }))),
  ].sort((a, b) => a.t - b.t);

  return {
    ...common,
    keyframes: run.keyframes,
    phases,
    stats: run.stats,
    baseline: parent.stats,
    intervention: {
      at,
      warnAt: lead.warnAt,
      reactionSeconds: plan.reactionSeconds,
      title: plan.title,
      note: plan.note,
      actions: plan.actions.map((action) => action.label),
    },
  };
}

/** @param {Timeline} timeline @returns {{start:number, end:number}} */
export function timelineBounds(timeline) {
  const frames = timeline.keyframes;
  return { start: frames[0].t, end: frames[frames.length - 1].t };
}

/** Index of the last keyframe at or before `t`, never the final one. */
function frameIndex(frames, t) {
  let low = 0;
  let high = frames.length - 2;
  while (low < high) {
    const mid = (low + high + 1) >> 1;
    if (frames[mid].t <= t) low = mid;
    else high = mid - 1;
  }
  return Math.max(0, low);
}

/**
 * Linear sample of a timeline at time `t`.
 *
 * `rates` is the per-second change of each zone across the surrounding
 * keyframes. It is what the constant-velocity projection extrapolates, so a
 * projection built from it behaves the way the Python baseline does on real
 * tracks: it carries the current trend forward and nothing else.
 *
 * @param {Timeline} timeline
 * @param {number} t seconds relative to T0
 * @returns {{counts:number[], rates:number[], counterflow:number, outside:number,
 *   held:Record<string, number>, phase:object, phaseIndex:number}}
 */
export function sampleTimeline(timeline, t) {
  const frames = timeline.keyframes;
  const clamped = clamp(t, frames[0].t, frames[frames.length - 1].t);
  const index = frameIndex(frames, clamped);
  const from = frames[index];
  const to = frames[Math.min(index + 1, frames.length - 1)];
  const span = to.t - from.t;
  const ratio = span > 0 ? (clamped - from.t) / span : 0;

  let phaseIndex = 0;
  for (let i = 0; i < timeline.phases.length; i += 1) {
    if (timeline.phases[i].t <= clamped) phaseIndex = i;
    else break;
  }

  const held = {};
  for (const key of Object.keys({ ...(from.held || {}), ...(to.held || {}) })) {
    const a = from.held?.[key] || 0;
    held[key] = Math.round(a + ((to.held?.[key] || 0) - a) * ratio);
  }

  return {
    counts: from.counts.map((value, i) => Math.round(value + (to.counts[i] - value) * ratio)),
    rates: from.counts.map((value, i) => (span > 0 ? (to.counts[i] - value) / span : 0)),
    counterflow: from.counterflow + (to.counterflow - from.counterflow) * ratio,
    outside: Math.round((from.outside || 0) + ((to.outside || 0) - (from.outside || 0)) * ratio),
    held,
    phase: timeline.phases[phaseIndex],
    phaseIndex,
  };
}

/**
 * Build a forecast payload for a timeline at time `t`, shaped exactly like
 * `CrowdForecast.update()` so the console renders it through the same path a
 * real backend forecast takes.
 *
 * @param {Timeline} timeline
 * @param {number} t seconds relative to T0
 * @param {number} threshold concentration threshold in projected tracks
 * @returns {object} forecast payload tagged `origin: 'simulated'`
 */
export function timelineForecast(timeline, t, threshold) {
  const { counts, rates, counterflow, outside, held, phase } = sampleTimeline(timeline, t);
  const { areas } = timeline;
  const peakDensity = Math.max(...counts.map((count, i) => count / areas[i]));

  // Tracking degrades as the crowd packs: heads occlude one another, so fewer
  // detections survive as continuous tracks. Real trackers fail in the same
  // direction, which is why a crush is the worst moment to trust a count.
  const coverage = clamp(0.86 - 0.055 * peakDensity, 0.45, 0.86);

  const cells = [];
  for (const horizon of [1, 2, 3]) {
    for (let i = 0; i < counts.length; i += 1) {
      const projected = Math.max(0, Math.round(counts[i] + rates[i] * horizon));
      const density = projected / areas[i];
      cells.push({
        cell: ZONE_IDS[i],
        horizon_s: horizon,
        current_eligible: counts[i],
        projected_tracks: projected,
        change: projected - counts[i],
        slow_fraction: slowFractionFor(density),
        density_per_m2: round2(density),
        concentration_flag: projected >= threshold,
      });
    }
  }

  const flagged = cells.filter((cell) => cell.concentration_flag);
  const peak = flagged.length
    ? flagged.reduce((best, cell) =>
        cell.projected_tracks > best.projected_tracks ||
        (cell.projected_tracks === best.projected_tracks && cell.horizon_s < best.horizon_s)
          ? cell
          : best,
      )
    : null;
  const peakArea = peak ? areas[ZONE_IDS.indexOf(peak.cell)] : null;

  return {
    status: flagged.length ? 'REVIEW CONCENTRATION' : 'PROJECTION AVAILABLE',
    reason:
      timeline.kind === 'model'
        ? 'Constant-velocity projection of a simulated crowd-flow model.'
        : 'Constant-velocity projection of a simulated egress timeline.',
    coverage: round2(coverage),
    counterflow: round2(counterflow),
    outside,
    held,
    cells,
    advice: peak
      ? `Inspect ${peak.cell}: ${peak.projected_tracks} eligible tracks projected at +${peak.horizon_s} s, ` +
        `about ${round2(peak.projected_tracks / peakArea)} persons/m² over the simulated ${Math.round(peakArea)} m² ` +
        'zone. Check throughput at the exit and hold inbound before the space loads further. This is a simulated ' +
        'timeline, not a prediction, and it does not establish that any route is safe.'
      : `Phase: ${phase.label}. No configured concentration threshold exceeded in this projection. ` +
        'This is not an all-clear.',
    origin: 'simulated',
  };
}

/**
 * How much warning the projection gives on this timeline: the first time the
 * +horizon projection crosses the threshold, against the first time the crowd
 * actually reaches the onset density.
 *
 * @param {Timeline} timeline
 * @param {number} threshold projected tracks
 * @param {number} horizon 1, 2 or 3 seconds
 * @returns {{warnAt:number|null, onsetAt:number|null, leadSeconds:number|null,
 *   onsetDensity:number, onsetLabel:string}}
 */
export function timelineLeadTime(timeline, threshold, horizon) {
  const { onsetDensity, onsetLabel, areas } = timeline;
  const { start, end } = timelineBounds(timeline);
  let warnAt = null;
  let onsetAt = null;

  for (let t = start; t <= end; t += 1) {
    const { counts, rates } = sampleTimeline(timeline, t);
    if (warnAt === null && counts.some((count, i) => count + rates[i] * horizon >= threshold)) {
      warnAt = t;
    }
    if (onsetAt === null && counts.some((count, i) => count / areas[i] >= onsetDensity)) onsetAt = t;
    if (warnAt !== null && onsetAt !== null) break;
  }

  return {
    warnAt,
    onsetAt,
    leadSeconds: warnAt !== null && onsetAt !== null ? onsetAt - warnAt : null,
    onsetDensity,
    onsetLabel,
  };
}

/** Formats a timeline clock as an operator-readable offset, e.g. `T-01:30`. */
export function formatClock(t) {
  const sign = t < 0 ? '-' : '+';
  const total = Math.abs(Math.round(t));
  const minutes = String(Math.floor(total / 60)).padStart(2, '0');
  const seconds = String(total % 60).padStart(2, '0');
  return `T${sign}${minutes}:${seconds}`;
}

/** Formats seconds as `m:ss` for durations rather than clock offsets. */
export function formatDuration(seconds) {
  const total = Math.max(0, Math.round(seconds));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

function clamp(value, low, high) {
  return Math.min(high, Math.max(low, value));
}

function round2(value) {
  return Math.round(value * 100) / 100;
}
