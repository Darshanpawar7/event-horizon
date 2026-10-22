import { useMemo } from 'react';
import {
  useVenueStore,
  selectVenue,
  computeForecast,
  computeZones,
  computeIncidents,
  computeMetrics,
  computeScene,
} from './useVenueStore';
import {
  getTimeline,
  isTimelineScenario,
  sampleTimeline,
  timelineBounds,
  timelineLeadTime,
} from '../data/crowdTimeline';

// Zustand v5 caches the value a selector returns and compares it by identity.
// A selector that builds a fresh array or object on every call therefore never
// settles, so every derivation below selects only stable slices of state and
// memoises the computation in the component instead.

/** The active venue: geometry, labels, gates, cameras, incident brief and timelines. */
export function useVenue() {
  return useVenueStore(selectVenue);
}

/** The stable slice every forecast-derived hook depends on. */
function useForecastSlice() {
  const mode = useVenueStore((state) => state.mode);
  const scenario = useVenueStore((state) => state.scenario);
  const venueId = useVenueStore((state) => state.venueId);
  const status = useVenueStore((state) => state.status);
  const threshold = useVenueStore((state) => state.threshold);
  const horizon = useVenueStore((state) => state.horizon);
  const clockT = useVenueStore((state) => state.clockT);
  return useMemo(
    () => ({ mode, scenario, venueId, status, threshold, horizon, clockT }),
    [mode, scenario, venueId, status, threshold, horizon, clockT],
  );
}

/** @returns {ReturnType<typeof computeForecast>} */
export function useForecast() {
  const slice = useForecastSlice();
  return useMemo(() => computeForecast(slice), [slice]);
}

/**
 * What the simulated scene is doing at this moment (motion state, visibility,
 * peak density, the incident it implies). Simulated throughout.
 */
export function useScene() {
  const slice = useForecastSlice();
  const forecast = useForecast();
  return useMemo(() => computeScene(slice, forecast), [slice, forecast]);
}

/**
 * Playback state for the selected timeline scenario, or null when the active
 * scenario holds a single state instead of playing out over time.
 *
 * @returns {null|{id:string, title:string, summary:string, kind:string, start:number, end:number,
 *   clockT:number, phase:object, phaseIndex:number, phases:object[], counterflow:number, outside:number,
 *   areas:number[], intervention:object|null, stats:object, baseline:object|null,
 *   lead:{warnAt:number|null, onsetAt:number|null, leadSeconds:number|null, onsetDensity:number, onsetLabel:string}}}
 */
export function useTimeline() {
  const venue = useVenue();
  const scenario = useVenueStore((state) => state.scenario);
  const clockT = useVenueStore((state) => state.clockT);
  const threshold = useVenueStore((state) => state.threshold);
  const horizon = useVenueStore((state) => state.horizon);

  const timeline = useMemo(
    () => (isTimelineScenario(venue, scenario) ? getTimeline(venue, scenario, threshold, horizon) : null),
    [venue, scenario, threshold, horizon],
  );

  // Lead time scans the whole timeline, so it is kept off the playback tick.
  const lead = useMemo(
    () => (timeline ? timelineLeadTime(timeline, threshold, horizon) : null),
    [timeline, threshold, horizon],
  );

  return useMemo(() => {
    if (!timeline) return null;
    const { start, end } = timelineBounds(timeline);
    const { phase, phaseIndex, counterflow, outside } = sampleTimeline(timeline, clockT);
    return {
      id: timeline.id,
      title: timeline.title,
      summary: timeline.summary,
      kind: timeline.kind,
      phases: timeline.phases,
      areas: timeline.areas,
      intervention: timeline.intervention,
      stats: timeline.stats,
      baseline: timeline.baseline,
      start,
      end,
      clockT,
      phase,
      phaseIndex,
      counterflow,
      outside,
      lead,
    };
  }, [timeline, clockT, lead]);
}

/** @returns {ReturnType<typeof computeZones>} */
export function useZones() {
  const venue = useVenue();
  const forecast = useForecast();
  const horizon = useVenueStore((state) => state.horizon);
  const threshold = useVenueStore((state) => state.threshold);
  return useMemo(() => computeZones(forecast, horizon, threshold, venue), [forecast, horizon, threshold, venue]);
}

/** The zone currently selected in the twin, or null. */
export function useSelectedZone() {
  const zones = useZones();
  const selectedZone = useVenueStore((state) => state.selectedZone);
  return useMemo(
    () => (selectedZone ? zones.find((zone) => zone.id === selectedZone) || null : null),
    [zones, selectedZone],
  );
}

/** The six headline metrics, each paired with its provenance. */
export function useMetrics() {
  const slice = useForecastSlice();
  const forecast = useForecast();
  return useMemo(() => computeMetrics(slice, forecast), [slice, forecast]);
}

/** Incidents for the current mode; demo incidents are synthesised locally. */
export function useIncidents() {
  const slice = useForecastSlice();
  const snapshot = useVenueStore((state) => state.snapshot);
  const acknowledgedId = useVenueStore((state) => state.acknowledgedId);
  return useMemo(
    () => computeIncidents({ ...slice, snapshot, acknowledgedId }),
    [slice, snapshot, acknowledgedId],
  );
}

/** The incident under review: the explicit selection, else the first listed. */
export function useIncident() {
  const incidents = useIncidents();
  const incidentId = useVenueStore((state) => state.incidentId);
  return useMemo(
    () => incidents.find((item) => item.incident_id === incidentId) || incidents[0] || null,
    [incidents, incidentId],
  );
}
