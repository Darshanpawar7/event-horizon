import { useVenueStore, isDemo, thresholdConfig } from '../../store/useVenueStore';
import { useForecast, useVenue, useZones } from '../../store/derived';
import { overviewView, topView, incidentZone } from '../../data/cameraViews';
import OverlayPanel from '../digitalTwin/OverlayPanel';
import { NEO, MONO, densityBand } from '../../theme';

const HORIZONS = [1, 2, 3];

const QUALITIES = [
  { value: 'auto', label: 'AUTO', title: 'Steps between tiers to keep the view smooth on this machine' },
  { value: 'high', label: 'HIGH', title: 'Ambient occlusion, bloom, anti-aliasing and full resolution' },
  { value: 'medium', label: 'MED', title: 'Bloom and anti-aliasing, no ambient occlusion' },
  { value: 'low', label: 'LOW', title: 'No screen effects, reduced resolution' },
];
const TIER_LABELS = { high: 'HIGH', medium: 'MED', low: 'LOW' };

function toggleStyle(active) {
  return {
    border: `2px solid ${NEO.ink}`,
    background: active ? NEO.ink : NEO.surface,
    color: active ? NEO.surface : NEO.ink,
    fontFamily: MONO,
    fontSize: '8px',
    fontWeight: 900,
    padding: '5px 0',
    cursor: 'pointer',
    borderRadius: '2px',
    letterSpacing: '0.02em',
  };
}

const OVERLAYS = [
  { key: 'heat', label: 'HEAT', color: NEO.crimson },
  { key: 'density', label: 'COLUMNS', color: NEO.orange },
  { key: 'trajectories', label: 'TRACKS', color: NEO.violet },
  { key: 'flow', label: 'FLOW', color: NEO.amber },
  { key: 'gates', label: 'EGRESS', color: NEO.green },
  { key: 'cameras', label: 'CAMERAS', color: NEO.red },
];

/**
 * Floating controls over the twin: which projection horizon to render, the
 * concentration threshold, and which overlays are drawn. These change the
 * view only — they never alter the underlying evidence.
 */
export default function ViewControls() {
  const demo = useVenueStore(isDemo);
  const horizon = useVenueStore((state) => state.horizon);
  const threshold = useVenueStore((state) => state.threshold);
  const overlays = useVenueStore((state) => state.overlays);
  const setHorizon = useVenueStore((state) => state.setHorizon);
  const setThreshold = useVenueStore((state) => state.setThreshold);
  const toggleOverlay = useVenueStore((state) => state.toggleOverlay);
  const quality = useVenueStore((state) => state.quality);
  const renderTier = useVenueStore((state) => state.renderTier);
  const setQuality = useVenueStore((state) => state.setQuality);
  const focusZone = useVenueStore((state) => state.focusZone);
  const focusOn = useVenueStore((state) => state.focusOn);
  const requestCamera = useVenueStore((state) => state.requestCamera);
  const autoOrbit = useVenueStore((state) => state.autoOrbit);
  const setAutoOrbit = useVenueStore((state) => state.setAutoOrbit);
  const scenario = useVenueStore((state) => state.scenario);
  const venue = useVenue();
  const zones = useZones();
  const forecast = useForecast();

  const available = forecast.status !== 'UNAVAILABLE';
  // Scenarios differ by an order of magnitude in occupancy, so the slider
  // rescales with the one selected rather than pinning a single fixed range.
  const [thresholdMin, thresholdMax] = thresholdConfig(scenario, venue).range;
  const filled = ((threshold - thresholdMin) / (thresholdMax - thresholdMin)) * 100;
  const band = densityBand(threshold / venue.cellArea);

  return (
    <OverlayPanel
      title="Twin controls"
      width={218}
      // Projection state stays visible in the bar, so minimising the panel
      // never hides whether a projection is running.
      badge={
        <span
          style={{ width: 7, height: 7, borderRadius: '50%', background: available ? NEO.green : NEO.grey }}
          title={available ? 'Projection on' : 'No projection'}
        />
      }
    >
      <div style={bodyStyle}>
      {/* Projection horizon */}
      <div style={{ marginBottom: '12px' }}>
        <div style={captionStyle}>PROJECTION HORIZON</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px' }}>
          {HORIZONS.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setHorizon(value)}
              style={{
                border: `2px solid ${NEO.ink}`,
                background: horizon === value ? NEO.orange : NEO.surface,
                color: horizon === value ? NEO.surface : NEO.ink,
                fontFamily: MONO,
                fontSize: '10px',
                fontWeight: 900,
                padding: '6px 0',
                cursor: 'pointer',
                borderRadius: '2px',
              }}
            >
              +{value}s
            </button>
          ))}
        </div>
      </div>

      {/* Concentration threshold */}
      <div style={{ marginBottom: '12px' }}>
        <div style={{ ...captionStyle, display: 'flex', justifyContent: 'space-between' }}>
          <span>CONCENTRATION THRESHOLD</span>
          <span style={{ color: NEO.orange, fontWeight: 900 }}>{threshold}</span>
        </div>
        <input
          type="range"
          min={thresholdMin}
          max={thresholdMax}
          step={thresholdMax > 1000 ? 50 : thresholdMax > 200 ? 10 : 1}
          value={threshold}
          onChange={(event) => setThreshold(Number(event.target.value))}
          aria-label="Concentration threshold in projected tracks"
          style={{
            width: '100%',
            height: '6px',
            appearance: 'none',
            background: `linear-gradient(to right, ${NEO.orange} 0%, ${NEO.orange} ${filled}%, ${NEO.bg} ${filled}%, ${NEO.bg} 100%)`,
            border: `1px solid ${NEO.ink}`,
            outline: 'none',
            cursor: 'pointer',
            borderRadius: '10px',
          }}
        />
        <div style={{ fontSize: '8px', color: NEO.grey, marginTop: '4px', lineHeight: 1.5 }}>
          {demo ? (
            <>
              ≈{' '}
              <span style={{ color: band.color, fontWeight: 900 }}>
                {(threshold / venue.cellArea).toFixed(2)} /m²
              </span>{' '}
              over a simulated {Math.round(venue.cellArea)} m² zone. Illustrative count threshold, not a risk
              probability.
            </>
          ) : (
            'Illustrative count threshold, not a risk probability.'
          )}
        </div>
      </div>

      {/* Overlay toggles */}
      <div style={{ marginBottom: '10px' }}>
        <div style={captionStyle}>OVERLAYS</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
          {OVERLAYS.map((overlay) => {
            const on = overlays[overlay.key];
            return (
              <button
                key={overlay.key}
                type="button"
                onClick={() => toggleOverlay(overlay.key)}
                style={{
                  border: `2px solid ${on ? overlay.color : NEO.ink}`,
                  background: on ? overlay.color : NEO.surface,
                  color: on ? NEO.surface : NEO.grey,
                  fontFamily: MONO,
                  fontSize: '8px',
                  fontWeight: 900,
                  letterSpacing: '0.06em',
                  padding: '4px 7px',
                  cursor: 'pointer',
                  borderRadius: '2px',
                }}
              >
                {overlay.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Render quality: AUTO keeps the frame rate smooth; the others pin a tier */}
      <div style={{ marginBottom: '10px' }}>
        <div style={captionStyle}>
          RENDER QUALITY{quality === 'auto' && <span style={{ color: NEO.grey }}> · AUTO CHOSE {TIER_LABELS[renderTier]}</span>}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px' }}>
          {QUALITIES.map(({ value, label, title }) => (
            <button
              key={value}
              type="button"
              title={title}
              onClick={() => setQuality(value)}
              aria-pressed={quality === value}
              style={toggleStyle(quality === value)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Camera presets for presenting; the same views are on keys 1, 2, 3 and O */}
      <div style={{ marginBottom: '10px' }}>
        <div style={captionStyle}>CAMERA</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px' }}>
          <button type="button" title="The venue's vantage point (key 1)" onClick={() => requestCamera(overviewView(venue))} style={toggleStyle(false)}>
            OVERVIEW
          </button>
          <button
            type="button"
            title="Close-up of the densest zone (key 2)"
            onClick={() => {
              const id = incidentZone(zones);
              if (id && focusZone !== id) focusOn(id);
            }}
            style={toggleStyle(Boolean(focusZone))}
          >
            INCIDENT
          </button>
          <button type="button" title="Plan view straight down (key 3)" onClick={() => requestCamera(topView(venue))} style={toggleStyle(false)}>
            TOP
          </button>
          <button
            type="button"
            title="Slowly circle the point in view (key O)"
            onClick={() => setAutoOrbit(!autoOrbit)}
            aria-pressed={autoOrbit}
            style={toggleStyle(autoOrbit)}
          >
            ORBIT
          </button>
        </div>
      </div>

      <div style={footerStyle}>
        <span
          style={{
            width: 7,
            height: 7,
            borderRadius: '50%',
            flexShrink: 0,
            background: available ? NEO.green : NEO.grey,
          }}
        />
        <span style={{ fontSize: '8px', color: NEO.grey, letterSpacing: '0.08em' }}>
          {demo ? 'DEMO DATA' : 'BACKEND MODE'} · {available ? 'PROJECTION ON' : 'NO PROJECTION'}
        </span>
      </div>
      </div>
    </OverlayPanel>
  );
}

const bodyStyle = { padding: '12px', fontFamily: MONO, color: NEO.ink };

const captionStyle = {
  fontSize: '8px',
  fontWeight: 'bold',
  letterSpacing: '0.1em',
  color: NEO.grey,
  textTransform: 'uppercase',
  marginBottom: '6px',
};

const footerStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '5px',
  borderTop: `1px solid ${NEO.bg}`,
  paddingTop: '8px',
};
