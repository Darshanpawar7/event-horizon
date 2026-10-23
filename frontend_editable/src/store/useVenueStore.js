import { create } from 'zustand';
import { api } from '../api';
import { scenarios, sampleSop, signalScripts } from '../demo';
import {
  ZONE_IDS,
  directionVector,
  scenarioThreshold,
  simulatedForecast,
  zoneRows,
} from '../data/venueModel';
import {
  formatClock,
  getTimeline,
  isTimelineScenario,
  sampleTimeline,
  timelineBounds,
  timelineForecast,
} from '../data/crowdTimeline';
import { DEFAULT_VENUE_ID, getVenue } from '../data/venues';

const POLL_INTERVAL_MS = 2000;
const STALE_AFTER_MS = 10000;
const SIGNAL_LIMIT = 12;
const CLOCK_TICK_MS = 200;

/** Densities (persons/m²) at which a simulated incident escalates. Match DENSITY_BANDS in theme.js. */
const CRUSH_RISK_DENSITY = 3.5;
const CRITICAL_DENSITY = 5.0;
/** Share of the crowd moving against the main direction that the collective-movement rule reacts to. */
const COUNTERFLOW_ALERT = 0.2;

let pollTimer = null;
let pollController = null;
let signalTimers = [];
let clockTimer = null;

/** Render tiers from cheapest to richest; see PostFX and SceneEffects for what each draws. */
export const RENDER_TIERS = ['low', 'medium', 'high'];

/**
 * Render quality: 'auto' (the default) lets the twin step between tiers to
 * hold a smooth frame rate on the machine it runs on; 'high', 'medium' and
 * 'low' pin one. `?quality=` in the URL picks it, which the headless checks
 * use to pin a tier.
 */
function initialQuality() {
  if (typeof window === 'undefined') return 'auto';
  const asked = new URLSearchParams(window.location.search).get('quality');
  return asked === 'auto' || RENDER_TIERS.includes(asked) ? asked : 'auto';
}

/** The tier drawn first: a pinned one, or medium for 'auto', which then climbs or drops. */
function initialTier(quality) {
  return quality === 'auto' ? 'medium' : quality;
}

/**
 * Default concentration threshold and slider bounds for a scenario on a
 * venue. Timelines carry their own; evidence states scale with cell area so
 * the same density reads the same on a plaza and in an alley.
 * @param {string} scenario
 * @param {object} venue
 * @returns {{threshold:number, range:[number, number]}}
 */
export function thresholdConfig(scenario, venue) {
  const spec = venue.timelines?.[scenario];
  if (spec) return { threshold: spec.threshold, range: spec.thresholdRange };
  return scenarioThreshold(scenario, venue);
}

/**
 * The scenario name the backend understands. Plaza timelines keep their
 * historic plain ids; other venues' timelines are namespaced so the server can
 * report the right headline state and the console can recognise the source.
 */
export function backendScenarioId(venue, scenario) {
  if (!isTimelineScenario(venue, scenario) || venue.id === DEFAULT_VENUE_ID) return scenario;
  return `${venue.id}:${scenario}`;
}

/** The built timeline for a selection, or null for a single-state scenario. */
function timelineFor(venue, scenario, threshold, horizon) {
  return isTimelineScenario(venue, scenario) ? getTimeline(venue, scenario, threshold, horizon) : null;
}

function currentTimeline(state) {
  return timelineFor(getVenue(state.venueId), state.scenario, state.threshold, state.horizon);
}

function stopClockTimer() {
  if (clockTimer) clearInterval(clockTimer);
  clockTimer = null;
}

const clock = () => new Date().toLocaleTimeString([], { hour12: false });

function clearSignalTimers() {
  signalTimers.forEach(clearTimeout);
  signalTimers = [];
}

function abortPolling() {
  if (pollController) pollController.abort();
  if (pollTimer) clearTimeout(pollTimer);
  pollController = null;
  pollTimer = null;
}

export const useVenueStore = create((set, get) => ({
  // ---- session -----------------------------------------------------------
  mode: 'demo',
  venueId: DEFAULT_VENUE_ID,
  scenario: 'clear',

  // ---- backend payloads --------------------------------------------------
  snapshot: null,
  status: null,
  sop: null,
  error: '',
  updatedAt: null,

  // ---- selection ---------------------------------------------------------
  cameraId: '',
  incidentId: '',
  selectedZone: null,

  // ---- twin view controls ------------------------------------------------
  horizon: 2,
  threshold: scenarioThreshold('clear', getVenue(DEFAULT_VENUE_ID)).threshold,
  overlays: { density: true, trajectories: true, flow: true, gates: true, cameras: true, heat: true },
  /** 'auto', 'high', 'medium' or 'low', as the operator chose it. */
  quality: initialQuality(),
  /** The tier actually drawn: the pinned one, or whatever 'auto' settled on. */
  renderTier: initialTier(initialQuality()),
  /** A camera move asked for by a control (view preset, double-click); `seq` makes each request new. */
  cameraRequest: null,
  /** Slowly circle the current point of interest, for presenting. */
  autoOrbit: false,
  /** Zone the camera is flown to and held on; null returns to the venue's vantage point. */
  focusZone: null,

  // ---- timeline playback -------------------------------------------------
  // Only meaningful while a timeline scenario is selected; `clockT` is seconds
  // relative to that timeline's T0.
  clockT: 0,
  playing: false,
  playbackRate: 4,
  phaseIndex: -1,
  /** When set, the video's own playhead drives the timeline instead of the clock. */
  syncVideo: false,

  // ---- operator state ----------------------------------------------------
  checks: {},
  /** Incident id the operator acknowledged in this session, if any. */
  acknowledgedId: null,
  signals: [],
  assistantBusy: false,
  answer: null,

  setMode: (mode) => {
    if (get().mode === mode) return;
    abortPolling();
    clearSignalTimers();
    stopClockTimer();
    set({
      mode,
      snapshot: null,
      status: null,
      sop: null,
      error: '',
      updatedAt: null,
      cameraId: '',
      incidentId: '',
      selectedZone: null,
      checks: {},
      acknowledgedId: null,
      answer: null,
      signals: [],
    });
    if (mode === 'backend') {
      // Bring the server onto the scenario already on screen, otherwise the
      // console can show one story while the backend reports another.
      const venue = getVenue(get().venueId);
      api.setScenario(backendScenarioId(venue, get().scenario)).catch((cause) => set({ error: cause.message }));
      get().startPolling();
    } else {
      get().replayDemoSignals();
    }
    if (currentTimeline(get())) get().startClock();
  },

  /**
   * Stand the console over a different venue. The venue's default scenario is
   * selected (a reconstruction opens on its "as reported" timeline) and every
   * per-scenario setting is reset through setScenario.
   */
  setVenue: (venueId) => {
    if (get().venueId === venueId) return;
    const venue = getVenue(venueId);
    stopClockTimer();
    set({ venueId, selectedZone: null, focusZone: null, checks: {}, acknowledgedId: null, answer: null, signals: [] });
    get().setScenario(venue.defaultScenario || 'clear');
    get().pushSignal(
      'Venue',
      `Twin now stands over ${venue.name}. Geometry, counts and timings are simulated${
        venue.incident ? ' from published accounts of the incident' : ''
      }.`,
      'simulated',
    );
  },

  setScenario: (scenario) => {
    stopClockTimer();
    const venue = getVenue(get().venueId);
    const { threshold } = thresholdConfig(scenario, venue);
    const timeline = timelineFor(venue, scenario, threshold, get().horizon);

    set({
      scenario,
      threshold,
      selectedZone: null,
      checks: {},
      acknowledgedId: null,
      answer: null,
      signals: [],
      clockT: timeline ? timelineBounds(timeline).start : 0,
      phaseIndex: -1,
      playing: Boolean(timeline),
    });

    // The threshold is an operator setting, so a change made on the operator's
    // behalf is logged rather than applied silently.
    get().pushSignal(
      'Operator',
      `Concentration threshold set to ${threshold} projected tracks for ${
        timeline ? `“${timeline.title}”` : `the ${scenario.toUpperCase()} simulation`
      }.`,
      'simulated',
    );

    if (get().mode === 'demo') {
      get().replayDemoSignals();
      if (timeline) get().startClock();
      return;
    }
    // Backend mode drives the server's own scenario switch; the next poll
    // reports whatever the backend actually returns.
    api.setScenario(backendScenarioId(venue, scenario)).catch((cause) => set({ error: cause.message }));
    if (timeline) get().startClock();
  },

  /**
   * Move between two timelines of the same venue — typically the reconstruction
   * and its counterfactual — without resetting the clock, so the operator can
   * compare the same moment on both. Falls back to setScenario for anything else.
   */
  switchBranch: (scenario) => {
    const state = get();
    if (state.scenario === scenario) return;
    const venue = getVenue(state.venueId);
    const next = timelineFor(venue, scenario, state.threshold, state.horizon);
    const current = currentTimeline(state);
    if (!next || !current) {
      get().setScenario(scenario);
      return;
    }
    set({ scenario, phaseIndex: -1, answer: null });
    get().setClock(state.clockT);
    get().pushSignal(
      'Operator',
      `Switched to “${next.title}” at ${formatClock(state.clockT)}. Same model and clock; everything after the operator action is counterfactual.`,
      'simulated',
    );
    if (state.mode === 'backend') {
      api.setScenario(backendScenarioId(venue, scenario)).catch((cause) => set({ error: cause.message }));
    }
  },

  // ---- timeline playback -------------------------------------------------

  /**
   * Move the timeline clock, emitting one signal-feed line each time playback
   * crosses into a new phase.
   * @param {number} clockT seconds relative to the timeline's T0
   */
  setClock: (clockT) => {
    const state = get();
    const timeline = currentTimeline(state);
    if (!timeline) {
      set({ clockT });
      return;
    }
    const { start, end } = timelineBounds(timeline);
    const bounded = Math.min(end, Math.max(start, clockT));
    const { phaseIndex, phase } = sampleTimeline(timeline, bounded);
    set({ clockT: bounded });

    if (phaseIndex === state.phaseIndex) return;
    set({ phaseIndex });
    if (phase?.signal) {
      get().pushSignal(phase.signal.source, `${formatClock(phase.t)} · ${phase.signal.message}`, 'simulated');
    }
  },

  startClock: () => {
    stopClockTimer();
    if (!currentTimeline(get())) return;
    clockTimer = setInterval(() => {
      const state = get();
      const timeline = currentTimeline(state);
      if (!state.playing || !timeline) return;
      const { start, end } = timelineBounds(timeline);
      const next = state.clockT + (CLOCK_TICK_MS / 1000) * state.playbackRate;
      // Loop the rehearsal rather than freezing on the last frame.
      if (next >= end) {
        set({ phaseIndex: -1 });
        get().setClock(start);
        return;
      }
      get().setClock(next);
    }, CLOCK_TICK_MS);
  },

  stopClock: () => {
    stopClockTimer();
    set({ playing: false });
  },

  togglePlay: () => {
    const playing = !get().playing;
    set({ playing });
    if (playing) get().startClock();
    else stopClockTimer();
  },

  setPlaybackRate: (playbackRate) => set({ playbackRate }),

  /**
   * Hand the timeline over to the video playhead, or take it back. The two are
   * mutually exclusive: a running clock and a scrubbing video would fight.
   */
  toggleSyncVideo: () => {
    const syncVideo = !get().syncVideo;
    set({ syncVideo });
    if (syncVideo) {
      stopClockTimer();
      set({ playing: false });
      get().pushSignal(
        'Operator',
        'Timeline handed to the video playhead. Counts remain simulated; the clip is not being analysed for people.',
        'simulated',
      );
    }
  },

  /**
   * Map a position in the clip onto the timeline. The clip's length stands in
   * for the whole rehearsal, so a short video still plays the full scenario.
   * @param {number} currentTime seconds into the clip
   * @param {number} duration clip length in seconds
   */
  syncFromVideo: (currentTime, duration) => {
    const state = get();
    const timeline = currentTimeline(state);
    if (!state.syncVideo || !timeline) return;
    if (!Number.isFinite(duration) || duration <= 0) return;
    const { start, end } = timelineBounds(timeline);
    const ratio = Math.min(1, Math.max(0, currentTime / duration));
    get().setClock(start + ratio * (end - start));
  },

  setCameraId: (cameraId) => {
    if (get().cameraId === cameraId) return;
    set({ cameraId, status: null, selectedZone: null });
    if (get().mode === 'backend') get().startPolling();
  },

  setIncidentId: (incidentId) => set({ incidentId, checks: {}, acknowledgedId: null, answer: null }),

  setSelectedZone: (zoneId) =>
    set((state) => ({ selectedZone: state.selectedZone === zoneId ? null : zoneId })),

  setHorizon: (horizon) => set({ horizon }),
  setQuality: (quality) => set((state) => ({ quality, renderTier: quality === 'auto' ? state.renderTier : quality })),
  setRenderTier: (renderTier) => set({ renderTier }),
  /**
   * Fly the camera somewhere: `{ position, target }` in world coordinates.
   * Leaves any zone focus, since the operator chose a new view.
   */
  requestCamera: (view) =>
    set((state) => ({ focusZone: null, cameraRequest: { ...view, seq: (state.cameraRequest?.seq ?? 0) + 1 } })),
  setAutoOrbit: (autoOrbit) => set({ autoOrbit }),
  /** Fly the twin camera to a zone, or back to the venue's vantage point with null. */
  focusOn: (zoneId) => set((state) => ({ focusZone: state.focusZone === zoneId ? null : zoneId })),
  setThreshold: (threshold) => set({ threshold }),
  toggleOverlay: (key) =>
    set((state) => ({ overlays: { ...state.overlays, [key]: !state.overlays[key] } })),
  toggleCheck: (key) =>
    set((state) => ({ checks: { ...state.checks, [key]: !state.checks[key] } })),

  pushSignal: (source, message, origin) =>
    set((state) => ({
      signals: [{ source, message, origin, timestamp: clock() }, ...state.signals].slice(0, SIGNAL_LIMIT),
    })),

  /** Replays the scripted demo feed so the overlay reads like a live log. */
  replayDemoSignals: () => {
    clearSignalTimers();
    const state = get();
    if (state.mode !== 'demo') return;
    const timeline = currentTimeline(state);
    const script = timeline
      ? [
          {
            source: timeline.kind === 'model' ? 'Model' : 'Timeline',
            message: `${timeline.kind === 'model' ? 'Crowd-flow model' : 'Authored timeline'} loaded: ${timeline.title}. Playback drives every count below; all of it is simulated.`,
          },
          { source: 'Forecast', message: 'Constant-velocity projection running at +1, +2 and +3 s.' },
        ]
      : signalScripts[state.scenario] || [];
    script.forEach((entry, index) => {
      signalTimers.push(
        setTimeout(() => get().pushSignal(entry.source, entry.message, 'simulated'), index * 750),
      );
    });
  },

  // ---- backend polling ---------------------------------------------------
  startPolling: () => {
    abortPolling();
    if (get().mode !== 'backend') return;

    const controller = new AbortController();
    pollController = controller;

    const poll = async () => {
      try {
        const snapshot = await api.snapshot(controller.signal);
        const cameraId = get().cameraId || snapshot.cameras[0]?.camera_id || '';
        const status = cameraId ? await api.status(cameraId, controller.signal) : null;
        if (controller.signal.aborted) return;
        get().ingest(snapshot, status);
      } catch (cause) {
        if (controller.signal.aborted) return;
        // Never silently substitute demo data for a failed backend read.
        set({ error: cause.message, snapshot: null, status: null, updatedAt: null });
      } finally {
        if (!controller.signal.aborted) pollTimer = setTimeout(poll, POLL_INTERVAL_MS);
      }
    };

    poll();
  },

  stopPolling: () => {
    abortPolling();
    clearSignalTimers();
    stopClockTimer();
  },

  /** Applies a successful backend read and logs any observation state change. */
  ingest: (snapshot, status) => {
    const previous = get().status?.observation;
    const current = status?.observation;
    const changed =
      current &&
      (previous?.tracking_state !== current.tracking_state ||
        previous?.visibility_status !== current.visibility_status ||
        previous?.motion_state !== current.motion_state);

    set({ snapshot, status, updatedAt: new Date(), error: '' });

    if (changed) {
      get().pushSignal('Observation', `${current.tracking_state} · ${current.motion_state}`, 'observed');
    }
  },

  loadSop: async (sopId) => {
    if (!sopId) {
      set({ sop: null });
      return;
    }
    try {
      set({ sop: await api.sop(sopId) });
    } catch {
      set({ sop: null });
    }
  },

  acknowledge: async () => {
    const state = get();
    const incident = currentIncident(state);
    if (!incident) return;
    if (state.mode === 'demo') {
      set({ acknowledgedId: incident.incident_id });
      get().pushSignal('Operator', 'Incident acknowledged locally. Demo only; nothing was persisted.', 'simulated');
      return;
    }
    try {
      await api.acknowledge(incident.incident_id);
      set({ acknowledgedId: incident.incident_id });
      get().pushSignal('Operator', `Acknowledged ${incident.incident_id}.`, 'observed');
    } catch (cause) {
      set({ error: cause.message });
    }
  },

  ask: async (question) => {
    const state = get();
    const incident = currentIncident(state);
    const procedure = selectProcedure(state);
    set({ assistantBusy: true, answer: null });
    try {
      if (state.mode === 'demo') {
        set({
          answer: {
            response_origin: 'scripted_demo',
            text:
              `${incident?.title || 'No active incident'} — this is a simulated example. ` +
              `${procedure ? procedure.reactive.join(' ') : 'No incident procedure selected.'} ` +
              'Live observations and an LLM are not connected.',
            incident_id: incident?.incident_id,
            sop_version: procedure?.version,
          },
        });
        return;
      }
      const answer = await api.ask({
        question,
        incident_id: incident?.incident_id || null,
        observation_timestamp: state.status?.observation?.received_at || null,
        sop_version: procedure?.version || null,
      });
      set({ answer });
    } catch (cause) {
      set({ answer: { response_origin: 'unavailable', text: cause.message } });
    } finally {
      set({ assistantBusy: false });
    }
  },
}));

// ---------------------------------------------------------------------------
// Identity-stable selectors — safe to pass straight to useVenueStore().
// Anything that builds a new array or object lives in the compute* functions
// below and is memoised by the hooks in ./derived.js instead.
// ---------------------------------------------------------------------------

export const isDemo = (state) => state.mode === 'demo';

/** The active venue object. Venues are module constants, so this is identity-stable. */
export const selectVenue = (state) => getVenue(state.venueId);

/** @returns {object|null} the current camera observation, or null in demo mode. */
export const selectObservation = (state) => (isDemo(state) ? null : state.status?.observation || null);

/** Backend observations older than ten seconds are treated as unusable. */
export function selectStale(state) {
  if (isDemo(state)) return false;
  const receivedAt = state.status?.observation?.received_at;
  const parsed = Date.parse(receivedAt);
  return !receivedAt || !Number.isFinite(parsed) || Date.now() - parsed > STALE_AFTER_MS;
}

export const selectProcedure = (state) =>
  isDemo(state) ? (currentIncident(state) ? sampleSop : null) : state.sop;

/** Unit flow vector in image space, or null when no direction is established. */
export function selectFlowVector(state) {
  if (!isDemo(state)) return directionVector(selectObservation(state)?.dominant_direction);
  const timeline = currentTimeline(state);
  return directionVector(timeline ? timeline.direction : scenarios[state.scenario]?.direction);
}

// ---------------------------------------------------------------------------
// Pure derivations. Call these through the hooks in ./derived.js from React.
// ---------------------------------------------------------------------------

/**
 * @typedef {object} ForecastSlice
 * @property {string} mode
 * @property {string} scenario
 * @property {string} venueId
 * @property {object|null} status
 * @property {number} threshold
 * @property {number} horizon
 * @property {number} clockT
 */

/**
 * The forecast payload driving the 3D zone grid. Prefers a real backend
 * forecast; otherwise returns the simulated grid tagged as such.
 * @param {ForecastSlice} slice
 */
export function computeForecast(slice) {
  const venue = getVenue(slice.venueId);
  const observation = slice.mode === 'demo' ? null : slice.status?.observation || null;
  if (observation?.forecast?.cells) {
    return { ...observation.forecast, origin: 'observed' };
  }
  const scenario = slice.mode === 'demo' ? slice.scenario : backendScenarioKey(observation, venue);
  const timeline = timelineFor(venue, scenario, slice.threshold, slice.horizon);
  if (timeline) return timelineForecast(timeline, slice.clockT, slice.threshold);
  return simulatedForecast(scenario, slice.threshold, venue);
}

/** Maps a live observation onto the closest demo scenario for the simulated grid. */
function backendScenarioKey(observation, venue) {
  if (!observation) return 'tracking';
  // The backend names its demo source `demo-<scenario>`, so a timeline the
  // server is running stays a timeline here rather than collapsing to a state.
  const source = String(observation.source_id || '').replace(/^demo-/, '');
  const scenario = source.includes(':') ? source.split(':')[1] : source;
  if (isTimelineScenario(venue, scenario)) return scenario;
  if (observation.visibility_status === 'degraded') return 'visibility';
  if (observation.motion_state === 'CAMERA MOVEMENT SUSPECTED') return 'camera';
  if (observation.tracking_state === 'TRACKING UNAVAILABLE') return 'tracking';
  if (observation.tracking_state === 'INSUFFICIENT TRACK SUPPORT') return 'camera';
  if (observation.motion_state === 'UNUSUAL COLLECTIVE MOVEMENT') return 'collective';
  return 'clear';
}

/** One record per zone at the chosen horizon, with venue geometry attached. */
export const computeZones = zoneRows;

/**
 * What the simulated scene is doing right now: the evidence-state fields for
 * a single-state scenario, or fields derived from the timeline at the current
 * clock. Everything here is simulated and the UI labels it so.
 *
 * @param {ForecastSlice} slice
 * @param {ReturnType<typeof computeForecast>} forecast
 * @returns {{title:string, count:number|null, direction:string, visibility:string, tracking:string,
 *   motion:string, fps:number, issue:string|null, severity:string, evidence:string[], timeline:boolean,
 *   peakDensity:number|null, peakZone:string|null}}
 */
export function computeScene(slice, forecast) {
  const venue = getVenue(slice.venueId);
  const timeline = timelineFor(venue, slice.scenario, slice.threshold, slice.horizon);
  if (!timeline) {
    const scene = scenarios[slice.scenario] || scenarios.clear;
    return {
      ...scene,
      severity: 'caution',
      evidence: ['Simulated scenario; no model assessment.'],
      timeline: false,
      peakDensity: null,
      peakZone: null,
    };
  }

  const sample = sampleTimeline(timeline, slice.clockT);
  let peakIndex = 0;
  let peakDensity = 0;
  sample.counts.forEach((count, index) => {
    const density = count / timeline.areas[index];
    if (density > peakDensity) {
      peakDensity = density;
      peakIndex = index;
    }
  });
  const peakZone = ZONE_IDS[peakIndex];
  const counterflow = sample.counterflow;
  const flagged = forecast.cells?.some((cell) => cell.concentration_flag) ?? false;
  const kind = timeline.kind === 'model' ? 'crowd-flow model' : 'authored timeline';

  let issue = null;
  let severity = 'caution';
  if (peakDensity >= CRITICAL_DENSITY) {
    issue = `Critical density at ${peakZone} — verify`;
    severity = 'high';
  } else if (peakDensity >= CRUSH_RISK_DENSITY) {
    issue = `Crush-risk density at ${peakZone} — verify`;
    severity = 'high';
  } else if (counterflow >= COUNTERFLOW_ALERT) {
    issue = 'Unusual collective movement — verify';
    severity = 'medium';
  } else if (flagged) {
    issue = `Concentration building at ${peakZone}`;
  }

  return {
    title: timeline.title,
    count: timelineHeads(forecast),
    direction: timeline.direction,
    visibility: 'Reference-like',
    tracking: 'TRACK MOTION AVAILABLE',
    motion: counterflow >= COUNTERFLOW_ALERT ? 'UNUSUAL COLLECTIVE MOVEMENT' : 'OBSERVED MOTION',
    // Processing slows as the detector works harder on a packed frame.
    fps: Math.round((17.2 - 6 * Math.min(1, peakDensity / 6)) * 10) / 10,
    issue,
    severity,
    evidence: [
      `Simulated ${kind}; no model assessment of any real venue.`,
      `Peak simulated density ${peakDensity.toFixed(2)} persons/m² in ${peakZone} at ${formatClock(slice.clockT)}; ${Math.round(
        counterflow * 100,
      )}% of the crowd moving against the main direction.`,
    ],
    timeline: true,
    peakDensity,
    peakZone,
  };
}

/**
 * Incidents for the current mode. Demo incidents are synthesised from the
 * selected scenario and are never presented as backend findings.
 * @param {ForecastSlice & {snapshot:object|null, acknowledgedId:string|null}} slice
 */
export function computeIncidents(slice) {
  if (slice.mode !== 'demo') return slice.snapshot?.incidents || [];
  const scene = computeScene(slice, computeForecast(slice));
  if (!scene.issue) return [];
  const kind = scene.issue.toLowerCase().split(' ')[0];
  const incidentId = `DEMO-${slice.venueId}-${slice.scenario}-${kind}`;
  return [
    {
      incident_id: incidentId,
      title: scene.issue,
      severity: scene.severity,
      status: slice.acknowledgedId === incidentId ? 'acknowledged' : 'active',
      sop_id: sampleSop.sop_id,
      evidence: scene.evidence,
    },
  ];
}

/** Store-internal incident lookup for actions (not for render). */
function currentIncident(state) {
  const incidents = computeIncidents(state);
  return incidents.find((item) => item.incident_id === state.incidentId) || incidents[0] || null;
}

/**
 * The six headline metrics, each paired with its provenance.
 * @param {ForecastSlice} slice
 * @param {{status:string, origin:string}} forecast
 */
export function computeMetrics(slice, forecast) {
  const demo = slice.mode === 'demo';
  const observation = demo ? null : slice.status?.observation || null;
  const source = demo ? 'simulated' : observation ? 'observed' : 'missing';

  const rows = demo
    ? (() => {
        const scene = computeScene(slice, forecast);
        return [
          ['Detected heads', scene.count],
          ['Tracking support', scene.tracking],
          ['Visibility', scene.visibility],
          ['Image motion', scene.direction],
          ['Processing FPS', scene.fps],
        ];
      })()
    : [
        ['Detected heads', observation?.detected_heads],
        ['Tracking support', observation?.tracking_state],
        ['Visibility', observation?.visibility_status],
        ['Image motion', observation?.dominant_direction],
        ['Processing FPS', observation?.processing_fps],
      ];

  return [
    ...rows.map(([label, value]) => ({ label, value, source })),
    { label: 'Forecast', value: forecast.status, source: forecast.origin },
  ];
}

/**
 * Detections implied by a timeline frame: eligible tracks across the analysed
 * region, divided back out by the track coverage the frame reports. Detections
 * are always the larger number — a track is a detection that survived.
 * @param {{cells?: object[], coverage?: number}} forecast
 * @returns {number|null}
 */
function timelineHeads(forecast) {
  const cells = (forecast.cells || []).filter((cell) => cell.horizon_s === 1);
  if (!cells.length || !forecast.coverage) return null;
  const tracks = cells.reduce((total, cell) => total + cell.current_eligible, 0);
  return Math.round(tracks / forecast.coverage);
}
