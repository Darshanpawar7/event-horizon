// A small macroscopic crowd-flow model: nine cells, directed links between
// them, arrivals from outside the analysed region and exits out of it.
//
// It is a cell-transmission model (Daganzo) for pedestrians. A cell sends
// what its movers can carry to the boundary at free walking speed, capped by
// the capacity of the opening (width times the peak specific flow of the
// Weidmann fundamental diagram, about 1.3 persons per metre per second); a
// cell can only receive what its floor area still holds, and a cell already
// past jam density releases people more slowly than it took them. That is
// enough to
// reproduce the mechanics every crowd disaster shares — arrivals exceeding
// exit throughput, a queue backing up through the cells behind the
// bottleneck, speed collapsing to a shuffle, and density climbing past the
// band where people are no longer in control of their own movement.
//
// What it is: a transparent, documented simulation that produces per-cell
// counts the twin can render and the constant-velocity projection can
// extrapolate. What it is not: a model of any real event. Every reconstruction
// built on it is labelled SIMULATED, its parameters are authored from
// published accounts, and nothing it outputs is evidence about a real venue.
//
// References
//   Weidmann, U. (1993) Transporttechnik der Fussgänger, ETH Zürich, Schriftenreihe
//     des IVT Nr. 90 — free walking speed 1.34 m/s, jam density 5.4 P/m².
//   Daganzo, C. (1994) The cell transmission model, Transportation Research B 28(4).
//   Helbing, D. & Mukerji, P. (2012) Crowd disasters as systemic failures: analysis of
//     the Love Parade disaster, EPJ Data Science 1:7 — crowd turbulence above ~6 P/m².
//   Fruin, J. (1971) Pedestrian Planning and Design — level-of-service density bands.

/** Free walking speed, metres per second. */
export const FREE_SPEED = 1.34;
/** Weidmann's shape parameter. */
export const WEIDMANN_GAMMA = 1.913;
/** Density at which voluntary movement stops, persons per square metre. */
export const JAM_DENSITY = 5.4;
/**
 * Density a cell can be pushed to by pressure from behind. Above the jam
 * density people are no longer walking in; they are compressed. Analyses of
 * the Itaewon and Love Parade crushes put the peak well beyond 6 P/m².
 */
export const CRUSH_CAP = 9;
/** Share of demand that still squeezes into a cell already past jam density. */
export const PRESSURE_FACTOR = 0.35;
/** Movement never stops entirely; survivors describe waves and a trickle. */
export const MIN_SPEED = 0.06;
/** Peak specific flow of the fundamental diagram, persons per metre per second. */
export const CAPACITY_FLOW = 1.3;
/** Bidirectional movement costs throughput: full counterflow roughly halves it. */
export const COUNTERFLOW_FRICTION = 0.55;

/**
 * Weidmann's speed–density relation.
 * @param {number} density persons per square metre
 * @returns {number} metres per second, never below MIN_SPEED
 */
export function weidmannSpeed(density) {
  if (!(density > 0)) return FREE_SPEED;
  if (density >= JAM_DENSITY) return MIN_SPEED;
  const speed = FREE_SPEED * (1 - Math.exp(-WEIDMANN_GAMMA * (1 / density - 1 / JAM_DENSITY)));
  return Math.max(MIN_SPEED, Math.min(FREE_SPEED, speed));
}

/**
 * Specific flow (persons per metre of width per second) at a density. Peaks
 * near 1.2–1.3 P/m/s around 1.75 P/m² and collapses toward jam density.
 * @param {number} density
 */
export function specificFlow(density) {
  return density * weidmannSpeed(density);
}

/**
 * A schedule is a list of `[t, value]` pairs; a plain value (number, boolean
 * or an array of numbers such as static fractions) is used as is.
 */
export function isSchedule(value) {
  return Array.isArray(value) && value.length > 0 && Array.isArray(value[0]) && typeof value[0][0] === 'number';
}

/**
 * Piecewise-constant schedule lookup: `[[t, value], ...]` sorted by t. Before
 * the first entry the first value holds.
 * @template T
 * @param {Array<[number, T]>|T} schedule
 * @param {number} t
 * @returns {T}
 */
export function stepAt(schedule, t) {
  if (!isSchedule(schedule)) return schedule;
  let value = schedule[0][1];
  for (const [time, next] of schedule) {
    if (time <= t) value = next;
    else break;
  }
  return value;
}

/** Piecewise-linear schedule lookup, for quantities that ramp rather than jump. */
export function rampAt(schedule, t) {
  if (!isSchedule(schedule)) return schedule;
  if (t <= schedule[0][0]) return schedule[0][1];
  for (let i = 1; i < schedule.length; i += 1) {
    const [t0, v0] = schedule[i - 1];
    const [t1, v1] = schedule[i];
    if (t <= t1) return t1 > t0 ? v0 + ((v1 - v0) * (t - t0)) / (t1 - t0) : v1;
  }
  return schedule[schedule.length - 1][1];
}

/**
 * @typedef {object} ModelSpec
 * @property {number} start      first second (relative to T0)
 * @property {number} end        last second
 * @property {number[]} areas    floor area per cell, m², ZONE_IDS order
 * @property {number[]} lengths  cell length along the travel axis, m
 * @property {number[]} initial  occupants per cell at `start`
 * @property {number[]|Array<[number, number[]]>} [statics] fraction of each cell's
 *   occupants who are not moving (seated, sleeping, waiting) and therefore neither
 *   leave nor make room; a schedule lets a waiting crowd get up at a given time
 * @property {Array<{from:string,to:string,width:number,share:number,length?:number}>} links
 *   directed movement between cells: `share` is the fraction of movers in
 *   `from` heading down this link; `width` the opening in metres. Either may
 *   be a `[[t, value], ...]` schedule (a barricade that fails, a route that opens).
 *   `length` is the distance crossed, metres; the timeline builder fills it from
 *   the venue's cell width or depth when absent
 * @property {Array<{id:string,cell:string,rate:Array<[number,number]>|number}>} sources
 *   arrivals from outside the analysed region, persons per second
 * @property {Array<{id:string,cell:string,width:number,share:number,open:Array<[number,boolean]>|boolean}>} sinks
 *   exits out of the region: gates, stairs, the water's edge
 * @property {Array<[number,number]>|number} counterflow share of the crowd moving
 *   against the main direction, 0–1, ramped between entries
 */

/**
 * @typedef {object} Action one operator intervention, applied from `at` onward
 * @property {'meter'|'close'|'open'|'closeSink'|'link'|'counterflow'|'release'} type
 * @property {string} [source]  for meter/close
 * @property {string} [sink]    for open/closeSink
 * @property {number} [rate]    persons per second, for meter
 * @property {number} [width]   metres, for open (widen) or link
 * @property {string} [from]    for link
 * @property {string} [to]      for link
 * @property {number} [share]   for link
 * @property {number} [fraction] for counterflow
 * @property {number[]} [statics] for release: new static fractions (e.g. sleepers woken and moved)
 * @property {string} label     what the operator did, shown in the console
 */

/**
 * Run the model and return one keyframe per second.
 *
 * @param {ModelSpec} spec
 * @param {{at:number|null, actions:Action[]}} [intervention] applied from `at`
 * @returns {{keyframes:Array<{t:number,counts:number[],counterflow:number,outside:number}>,
 *   stats:ReturnType<typeof summarise>}}
 */
export function runModel(spec, intervention = { at: null, actions: [] }) {
  const n = spec.areas.length;
  const count = spec.initial.map((value) => value);
  const noStatics = new Array(n).fill(0);
  let staticsOverride = null;
  const index = Object.fromEntries(spec.ids.map((id, i) => [id, i]));

  // Mutable copies of the parts an intervention may change.
  const sources = spec.sources.map((source) => ({ ...source, queue: 0 }));
  const sinks = spec.sinks.map((sink) => ({ ...sink }));
  const links = spec.links.map((link) => ({ ...link }));
  let counterflowOverride = null;
  let applied = false;

  const keyframes = [];
  const dt = 1;

  for (let t = spec.start; t <= spec.end; t += dt) {
    if (!applied && intervention.at != null && t >= intervention.at) {
      applied = true;
      for (const action of intervention.actions) {
        if (action.type === 'meter' || action.type === 'close') {
          const source = sources.find((item) => item.id === action.source);
          if (source) source.rate = action.type === 'close' ? 0 : action.rate;
        } else if (action.type === 'open' || action.type === 'closeSink') {
          const sink = sinks.find((item) => item.id === action.sink);
          if (sink) {
            sink.open = action.type === 'open';
            if (action.width) sink.width = action.width;
            if (action.share != null) sink.share = action.share;
          }
        } else if (action.type === 'link') {
          const link = links.find((item) => item.from === action.from && item.to === action.to);
          if (link) {
            if (action.share != null) link.share = action.share;
            if (action.width != null) link.width = action.width;
          } else if (action.share != null) {
            links.push({ from: action.from, to: action.to, width: action.width || 3, share: action.share });
          }
        } else if (action.type === 'counterflow') {
          counterflowOverride = action.fraction;
        } else if (action.type === 'release' && action.statics) {
          staticsOverride = action.statics;
        }
      }
    }

    const counterflow = counterflowOverride != null ? counterflowOverride : rampAt(spec.counterflow, t);
    const friction = 1 - COUNTERFLOW_FRICTION * counterflow;
    const statics = staticsOverride || (spec.statics ? stepAt(spec.statics, t) : noStatics);

    const density = count.map((value, i) => value / spec.areas[i]);
    // Sending follows the cell-transmission rule: movers advance toward the
    // boundary at free speed and the opening caps the flow. A cell past jam
    // density is compressed rather than walking, so it releases more slowly.
    const release = density.map((value) => (value > JAM_DENSITY ? JAM_DENSITY / value : 1));
    const advance = FREE_SPEED * friction;
    const capacity = CAPACITY_FLOW * friction;

    // --- demand: what each cell would like to send down each link and exit
    const outflow = new Array(n).fill(0); // total leaving each cell
    const inflowDemand = new Array(n).fill(0); // total wanting to enter each cell
    const linkFlow = links.map((link) => {
      const i = index[link.from];
      const movers = count[i] * (1 - statics[i]);
      const share = stepAt(link.share, t);
      const width = stepAt(link.width, t);
      const byMovement = (movers * share * advance) / (link.length ?? spec.lengths[i]);
      const byWidth = width * capacity * release[i];
      const flow = Math.max(0, Math.min(byMovement, byWidth)) * dt;
      inflowDemand[index[link.to]] += flow;
      return flow;
    });

    // --- supply: how much each cell can still take
    const accepted = links.map((link, k) => {
      const j = index[link.to];
      const room = Math.max(0, CRUSH_CAP * spec.areas[j] - count[j]);
      const pressure = density[j] >= JAM_DENSITY ? PRESSURE_FACTOR : 1;
      const supply = room * pressure;
      const demand = inflowDemand[j];
      return demand > supply ? (linkFlow[k] * supply) / demand : linkFlow[k];
    });

    const next = [...count];
    accepted.forEach((flow, k) => {
      const i = index[links[k].from];
      const j = index[links[k].to];
      const allowed = Math.min(flow, Math.max(0, next[i] - outflow[i]));
      outflow[i] += allowed;
      next[i] -= allowed;
      next[j] += allowed;
    });

    // --- exits
    for (const sink of sinks) {
      if (!stepAt(sink.open, t)) continue;
      const i = index[sink.cell];
      const movers = count[i] * (1 - statics[i]);
      const share = stepAt(sink.share, t);
      const width = stepAt(sink.width, t);
      const byMovement = (movers * share * advance) / (sink.length ?? spec.lengths[i]);
      const byWidth = width * capacity * release[i];
      const flow = Math.min(Math.max(0, Math.min(byMovement, byWidth)) * dt, Math.max(0, next[i]));
      next[i] -= flow;
    }

    // --- arrivals from outside, queued when the entry cell cannot take them
    let outside = 0;
    for (const source of sources) {
      const i = index[source.cell];
      const arriving = stepAt(source.rate, t) * dt + source.queue;
      const room = Math.max(0, CRUSH_CAP * spec.areas[i] - next[i]);
      const pressure = next[i] / spec.areas[i] >= JAM_DENSITY ? PRESSURE_FACTOR : 1;
      const admitted = Math.min(arriving, room * pressure);
      next[i] += admitted;
      source.queue = arriving - admitted;
      outside += source.queue;
    }

    for (let i = 0; i < n; i += 1) count[i] = Math.max(0, next[i]);

    keyframes.push({
      t,
      counts: count.map((value) => Math.round(value)),
      counterflow: Math.round(counterflow * 100) / 100,
      outside: Math.round(outside),
    });
  }

  return { keyframes, stats: summarise(keyframes, spec) };
}

/**
 * Headline numbers for comparing a reconstruction with its counterfactual.
 * Bands follow the console's DENSITY_BANDS: congested ≥ 2, crush risk ≥ 3.5,
 * critical ≥ 5 persons per square metre.
 */
export function summarise(keyframes, spec) {
  let peakDensity = 0;
  let peakCell = null;
  let peakAt = null;
  const secondsAbove = { congested: 0, crush: 0, critical: 0 };
  let personSecondsCritical = 0;
  let outsideMax = 0;

  for (const frame of keyframes) {
    let frameMax = 0;
    frame.counts.forEach((value, i) => {
      const density = value / spec.areas[i];
      if (density > frameMax) frameMax = density;
      if (density > peakDensity) {
        peakDensity = density;
        peakCell = spec.ids[i];
        peakAt = frame.t;
      }
      if (density >= 5) personSecondsCritical += value;
    });
    if (frameMax >= 2) secondsAbove.congested += 1;
    if (frameMax >= 3.5) secondsAbove.crush += 1;
    if (frameMax >= 5) secondsAbove.critical += 1;
    if (frame.outside > outsideMax) outsideMax = frame.outside;
  }

  return {
    peakDensity: Math.round(peakDensity * 100) / 100,
    peakCell,
    peakAt,
    secondsAbove,
    personSecondsCritical: Math.round(personSecondsCritical),
    outsideMax,
  };
}
