import { lazy, Suspense, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useVenueStore, selectStale, isDemo } from './store/useVenueStore';
import { useForecast, useSelectedZone, useVenue } from './store/derived';
import ForecastPanel from './components/dashboard/ForecastPanel';
import ScenarioControls from './components/dashboard/ScenarioControls';
import TimelineControls from './components/dashboard/TimelineControls';
import IncidentBrief from './components/dashboard/IncidentBrief';
import ZoneEmptyState from './components/dashboard/ZoneEmptyState';
import CameraPanel from './components/dashboard/CameraPanel';
import ResponsePanel from './components/dashboard/ResponsePanel';
import AssistantPanel from './components/dashboard/AssistantPanel';
import { NEO, MONO } from './theme';

const MODES = ['demo', 'backend'];

// The 3D twin (three.js) and the zone chart (recharts) are the two heavy
// libraries. Each loads in its own chunk: the console paints before the twin
// has downloaded, and recharts is only fetched the first time a zone is selected.
const VenueScene = lazy(() => import('./components/digitalTwin/VenueScene'));
const ZoneTelemetry = lazy(() => import('./components/dashboard/ZoneTelemetry'));

export default function App() {
  const mode = useVenueStore((state) => state.mode);
  const setMode = useVenueStore((state) => state.setMode);
  const error = useVenueStore((state) => state.error);
  const updatedAt = useVenueStore((state) => state.updatedAt);
  const stale = useVenueStore(selectStale);
  const zone = useSelectedZone();
  const venue = useVenue();
  const forecast = useForecast();
  const demo = useVenueStore(isDemo);
  const replayDemoSignals = useVenueStore((state) => state.replayDemoSignals);
  const stopPolling = useVenueStore((state) => state.stopPolling);

  // Seed the demo signal feed once, and tear down timers on unmount.
  useEffect(() => {
    replayDemoSignals();
    return () => stopPolling();
  }, [replayDemoSignals, stopPolling]);

  const degraded = !demo && (Boolean(error) || stale);
  const statusTone = demo ? 'amber' : error ? 'red' : stale ? 'amber' : '';
  const statusText = demo ? 'DEMO DATA' : error ? 'DISCONNECTED' : stale ? 'STALE' : 'BACKEND LIVE';

  return (
    <div className="shell">
      <div className="twin-pane">
        <Suspense fallback={<ChunkLoading label="LOADING 3D TWIN" fill />}>
          <VenueScene />
        </Suspense>
      </div>

      <div className="console-pane">
        <header className="console-head">
          <div>
            <div className="console-eyebrow">EVENT HORIZON / CROWD INTELLIGENCE</div>
            <div className="console-title">
              {zone
                ? `ZONE ${zone.id} TELEMETRY`
                : venue.kind === 'historic'
                  ? 'INCIDENT RECONSTRUCTION'
                  : 'VENUE RESILIENCE TWIN'}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <div className="segmented">
              {MODES.map((option) => (
                <button
                  key={option}
                  type="button"
                  className={mode === option ? 'selected' : ''}
                  onClick={() => setMode(option)}
                >
                  {option}
                </button>
              ))}
            </div>
            <div className={`status-pill ${statusTone}`}>
              <span className="status-dot" />
              {statusText}
            </div>
          </div>
        </header>

        <div className="console-body">
          {degraded && (
            <div className="warning-bar" role="status">
              {error
                ? `Backend disconnected. ${error}`
                : 'Observation stale or timestamp unavailable.'}{' '}
              No demo fallback is being used.
            </div>
          )}

          <ForecastPanel />
          <ScenarioControls />
          <TimelineControls />
          <div id="incident-brief">
            <IncidentBrief />
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={zone?.id || 'no-zone'}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -14 }}
              transition={{ duration: 0.16 }}
            >
              {zone ? (
                <Suspense fallback={<ChunkLoading label="LOADING ZONE TELEMETRY" />}>
                  <ZoneTelemetry />
                </Suspense>
              ) : (
                <ZoneEmptyState />
              )}
            </motion.div>
          </AnimatePresence>

          {/* Anchors let the pitch walkthrough scroll the console to a panel. */}
          <div id="camera-panel">
            <CameraPanel />
          </div>
          <ResponsePanel />
          <div id="assistant-panel">
            <AssistantPanel />
          </div>

          <p style={disclaimerStyle}>
            Observed, missing and simulated evidence are kept distinct throughout this console. Nothing here
            establishes crowd safety, and no public announcement or physical operation is triggered from this
            interface.
          </p>
        </div>

        <footer className="console-foot">
          <span style={{ color: NEO.grey }}>EVENT HORIZON OPERATOR CONSOLE v0.2.0</span>
          <span style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ color: forecast.origin === 'observed' ? NEO.green : NEO.amber }}>
              {forecast.origin === 'observed' ? '● GRID FROM BACKEND' : '○ GRID SIMULATED'}
            </span>
            <span style={{ color: demo ? NEO.amber : error ? NEO.red : NEO.green }}>
              {demo ? '○ DEMO MODE' : updatedAt ? `● ${updatedAt.toLocaleTimeString()}` : '○ NO UPDATE'}
            </span>
          </span>
        </footer>
      </div>
    </div>
  );
}

/** Placeholder while a lazy chunk downloads. Says what is loading, never what the evidence is. */
function ChunkLoading({ label, fill = false }) {
  return (
    <div role="status" aria-live="polite" style={fill ? loadingFillStyle : loadingPanelStyle}>
      <span style={loadingLabelStyle}>{label}…</span>
    </div>
  );
}

const loadingLabelStyle = {
  fontFamily: MONO,
  fontSize: 10,
  fontWeight: 900,
  letterSpacing: '0.12em',
  color: NEO.grey,
  border: `2px dashed ${NEO.line}`,
  padding: '10px 14px',
  background: NEO.surface,
};

const loadingFillStyle = {
  width: '100%',
  height: '100%',
  minHeight: 520,
  display: 'grid',
  placeItems: 'center',
  background: NEO.ground,
};

const loadingPanelStyle = {
  display: 'grid',
  placeItems: 'center',
  padding: '44px 24px',
  marginBottom: 14,
};

const disclaimerStyle = {
  fontFamily: MONO,
  fontSize: 9,
  lineHeight: 1.8,
  color: NEO.grey,
  border: `2px dashed ${NEO.line}`,
  padding: '10px 12px',
  marginBottom: 4,
};
