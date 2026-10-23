import { lazy, Suspense, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { useVenueStore, selectObservation, isDemo } from '../../store/useVenueStore';
import { useForecast, useVenue } from '../../store/derived';
import { getVenue, DEFAULT_VENUE_ID } from '../../data/venues';
import VenuePlaza from './VenuePlaza';
import CameraMasts from './CameraMasts';
import ExitGates from './ExitGates';
import CrowdParticles from './CrowdParticles';
import SceneryCrowd from './SceneryCrowd';
import CrowdFlow from './CrowdFlow';
import SceneEffects from './SceneEffects';
import IncidentBeacon from './IncidentBeacon';
import SignalOverlay from './SignalOverlay';
import CameraRig from './CameraRig';
import IncidentHud from './IncidentHud';
import ViewControls from '../dashboard/ViewControls';
import OverlayPanel from './OverlayPanel';
import PitchGuide from './PitchGuide';
import { NEO, MONO, HARD, DENSITY_BANDS } from '../../theme';

// Ambient occlusion, bloom and tone mapping arrive after the scene has drawn
// its first frames; until then the renderer's own ACES tone mapping applies.
const PostFX = lazy(() => import('./PostFX'));

const LEGEND = [
  { color: NEO.green, label: 'SPARSE' },
  { color: NEO.amber, label: 'BUILDING' },
  { color: NEO.orange, label: 'DENSE' },
  { color: NEO.red, label: 'CONCENTRATION' },
  { color: '#9AA3AE', label: 'NO PROJECTION' },
];

/**
 * Wraps the world so a suspected camera-movement finding is visible as an
 * unstable view rather than only as text.
 */
function UnstableView({ children }) {
  const groupRef = useRef(null);
  const unstable = useVenueStore((state) =>
    state.mode === 'demo'
      ? state.scenario === 'camera'
      : state.status?.observation?.motion_state === 'CAMERA MOVEMENT SUSPECTED',
  );

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const time = clock.getElapsedTime();
    const amount = unstable ? 1 : 0;
    groupRef.current.position.x = Math.sin(time * 7.3) * 0.22 * amount;
    groupRef.current.position.y = Math.sin(time * 5.1) * 0.14 * amount;
    groupRef.current.rotation.z = Math.sin(time * 3.7) * 0.004 * amount;
  });

  return <group ref={groupRef}>{children}</group>;
}

/**
 * The 3D venue digital twin: the active venue's floor, structures and
 * lighting, the analysed zone grid as heat overlays, cameras, exits, the
 * crowd and the scenery crowd outside the analysed region, movement
 * corridors and the incident beacon, with floating operator overlays.
 */
export default function VenueScene() {
  const venue = useVenue();
  const forecast = useForecast();
  const observation = useVenueStore(selectObservation);
  const demo = useVenueStore(isDemo);
  const horizon = useVenueStore((state) => state.horizon);
  const night = venue.lighting?.mode === 'night';

  const simulatedGrid = forecast.origin !== 'observed';
  const sourceLabel = demo
    ? 'SIMULATED SCENARIO'
    : observation?.source_id
      ? `SOURCE ${observation.source_id}`
      : 'NO SOURCE';
  const initial = getVenue(DEFAULT_VENUE_ID).camera;

  return (
    <div style={{ ...stageStyle, background: night ? '#070B16' : NEO.ground }}>
      <div style={{ position: 'absolute', top: 16, left: 16, zIndex: 10, pointerEvents: 'none' }}>
        <ViewControls />
      </div>

      <div style={{ position: 'absolute', top: 16, left: 250, zIndex: 10, display: 'flex', gap: '8px' }}>
        <div style={compassStyle} title="North is toward the top of the analysed region">
          N
        </div>
      </div>

      {/* Which venue the twin stands over, and whether it is a reconstruction */}
      <div style={venueBannerStyle}>
        <div style={{ fontSize: 8, letterSpacing: '0.14em', color: venue.kind === 'historic' ? NEO.crimson : NEO.orange }}>
          {venue.kind === 'historic' ? 'RECONSTRUCTION · SIMULATED FROM PUBLISHED ACCOUNTS' : 'GENERIC VENUE · SIMULATED'}
        </div>
        <div style={{ fontSize: 12, fontWeight: 900, marginTop: 2 }}>{venue.name.toUpperCase()}</div>
        <div style={{ fontSize: 8, color: NEO.grey, marginTop: 2 }}>
          {venue.incident ? `${venue.place} · ${venue.incident.date} · ${venue.incident.time}` : venue.place}
        </div>
      </div>

      <IncidentHud />

      <Canvas
        shadows="percentage"
        camera={{ position: initial.position, fov: 42, near: 0.5, far: 1500 }}
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
      >
        {/* 'percentage' = PCFShadowMap; three r184 deprecated the soft variant the
            bare `shadows` flag selects. Device pixel ratio stays at React Three
            Fiber's default so high-DPI screens render at full resolution. */}
        <SceneEffects />
        <UnstableView>
          <VenuePlaza />
          <CameraMasts />
          <ExitGates />
          <CrowdParticles />
          <SceneryCrowd />
          <CrowdFlow />
          <IncidentBeacon />
        </UnstableView>
        <OrbitControls
          makeDefault
          enableDamping
          dampingFactor={0.05}
          maxPolarAngle={Math.PI / 2 - 0.05}
          minDistance={6}
          maxDistance={260}
          target={initial.target}
        />
        <CameraRig />
        <Suspense fallback={null}>
          <PostFX night={night} />
        </Suspense>
      </Canvas>

      {/* Legend and provenance banner share one column so neither can cover
          the other as the legend grows. */}
      <div style={rightColumnStyle}>
        <OverlayPanel
          title={`Legend @ +${horizon}s`}
          defaultOpen={false}
          badge={
            <span style={{ display: 'flex', gap: 3 }}>
              {LEGEND.slice(0, 4).map((entry) => (
                <span key={entry.label} style={{ ...swatchStyle, width: 7, height: 7, background: entry.color }} />
              ))}
            </span>
          }
        >
          <div style={legendBodyStyle}>
            <div style={legendCaptionStyle}>COLUMN · SHARE OF THRESHOLD</div>
            {LEGEND.map((entry) => (
              <div key={entry.label} style={legendRowStyle}>
                <span style={{ ...swatchStyle, background: entry.color }} />
                {entry.label}
              </div>
            ))}
            {demo && (
              <>
                <div style={{ ...legendCaptionStyle, marginTop: 8, borderTop: `1px solid ${NEO.line}`, paddingTop: 6 }}>
                  FLOOR HEAT · PERSONS/m² (SIMULATED, {venue.cellArea} m² CELLS)
                </div>
                {DENSITY_BANDS.map((band) => (
                  <div key={band.key} style={legendRowStyle}>
                    <span style={{ ...swatchStyle, background: band.color }} />
                    {band.label}
                  </div>
                ))}
              </>
            )}
            <div style={{ ...legendCaptionStyle, marginTop: 8, borderTop: `1px solid ${NEO.line}`, paddingTop: 6 }}>
              MUTED FIGURES · OUTSIDE THE ANALYSED REGION OR HELD OUTSIDE THE VIEW · NOT COUNTED
            </div>
          </div>
        </OverlayPanel>

        {/* Provenance banner — the grid must never be mistaken for model output */}
        <div style={{ ...bannerStyle, borderColor: simulatedGrid ? NEO.amber : NEO.green }}>
          <strong style={{ color: simulatedGrid ? '#92400E' : '#14532D' }}>
            {simulatedGrid ? '⚠ ZONE GRID SIMULATED' : '● ZONE GRID FROM BACKEND'}
          </strong>
          <span>{forecast.status}</span>
          <span style={{ color: NEO.grey }}>{sourceLabel}</span>
        </div>
      </div>

      <div style={{ position: 'absolute', bottom: 16, left: 16, zIndex: 10, width: 300 }}>
        <SignalOverlay />
      </div>

      <div style={{ position: 'absolute', bottom: 52, right: 16, zIndex: 10 }}>
        <PitchGuide />
      </div>

      <div style={tipStyle}>DRAG TO ROTATE • SCROLL TO ZOOM • RIGHT-CLICK DRAG TO PAN • CLICK A ZONE</div>
    </div>
  );
}

const stageStyle = {
  position: 'relative',
  width: '100%',
  height: '100%',
  minHeight: '520px',
  overflow: 'hidden',
};

const compassStyle = {
  width: 42,
  height: 42,
  borderRadius: '50%',
  border: HARD.border,
  background: NEO.surface,
  color: NEO.ink,
  fontFamily: MONO,
  fontSize: 14,
  fontWeight: 900,
  boxShadow: `3px 3px 0 ${NEO.ink}`,
  display: 'grid',
  placeItems: 'center',
};

const venueBannerStyle = {
  position: 'absolute',
  top: 16,
  left: '50%',
  transform: 'translateX(-50%)',
  zIndex: 10,
  pointerEvents: 'none',
  background: NEO.surface,
  border: HARD.border,
  boxShadow: HARD.shadowSm,
  padding: '7px 14px',
  fontFamily: MONO,
  color: NEO.ink,
  textAlign: 'center',
  borderRadius: 2,
  maxWidth: '38%',
};

const rightColumnStyle = {
  position: 'absolute',
  top: 16,
  right: 16,
  zIndex: 10,
  width: 210,
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  alignItems: 'stretch',
  // The column itself must not swallow clicks meant for the canvas behind it.
  pointerEvents: 'none',
};

const legendRowStyle = { display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 };

const swatchStyle = { width: 9, height: 9, border: `1px solid ${NEO.ink}`, flexShrink: 0 };

const legendBodyStyle = {
  padding: '8px 10px',
  fontFamily: MONO,
  fontSize: 9,
  fontWeight: 'bold',
  color: NEO.ink,
};

const legendCaptionStyle = {
  fontSize: 8,
  letterSpacing: '0.06em',
  color: NEO.grey,
  marginBottom: 5,
};

const bannerStyle = {
  pointerEvents: 'auto',
  background: NEO.surface,
  border: `2px solid ${NEO.amber}`,
  padding: '8px 10px',
  fontFamily: MONO,
  fontSize: 9,
  lineHeight: 1.5,
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
  boxShadow: `3px 3px 0 ${NEO.ink}`,
};

const tipStyle = {
  position: 'absolute',
  bottom: 16,
  right: 16,
  pointerEvents: 'none',
  background: NEO.surface,
  border: HARD.border,
  padding: '6px 12px',
  fontFamily: MONO,
  fontSize: 9,
  fontWeight: 'bold',
  color: NEO.ink,
  borderRadius: 4,
  letterSpacing: '0.05em',
  boxShadow: HARD.shadowSm,
};
