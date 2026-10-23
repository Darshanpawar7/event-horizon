import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { useVenueStore } from '../../store/useVenueStore';
import { useForecast, useVenue, useZones } from '../../store/derived';
import { NEO, MONO, densityBand } from '../../theme';

/** Densities (persons/m²) at which the marker appears and turns into a beacon. */
const CONGESTED = 2.0;
const CRUSH_RISK = 3.5;
/** Beam height in metres past crush risk, unless the venue sets `overlay.beaconHeight`. */
const BEAM_HEIGHT = 34;
/** The label never floats higher than this above the zone, so it stays near the crowd. */
const LABEL_MAX = 14;
/**
 * Horizontal camera distance (m) over which the beam fades in. Up close, or looking
 * straight down it, a light column only hides the crowd it marks; the ring stays.
 */
const BEAM_FADE = [12, 40];
/** Widest the beam gets (m at its base), however large the zone. */
const BEAM_RADIUS_MAX = 2.2;

/**
 * Marks the worst zone so the incident is visible from anywhere in the scene:
 * a light column and an expanding ground ring over the densest zone, with a
 * small fixed-size label. Amber and short while the zone is congested; red,
 * tall and fast once it passes the crush-risk band. The beam fades out as the
 * camera comes close, and the beam and label step aside while the twin is
 * focused on a zone, so a close-up shows the people rather than the marker
 * (the strip above the twin keeps the reading).
 *
 * Under a simulated grid the marker follows simulated density and says
 * SIMULATED. Under a backend forecast there is no floor area, so it marks the
 * most loaded zone whose projection crosses the threshold and claims nothing
 * about density.
 */
export default function IncidentBeacon() {
  const venue = useVenue();
  const zones = useZones();
  const forecast = useForecast();
  const visible = useVenueStore((state) => state.overlays.heat);
  const focused = useVenueStore((state) => Boolean(state.focusZone));
  // Eases to 0 in focus mode and back to 1 after, at the camera flight's pace.
  const presence = useRef(1);
  const beamRef = useRef(null);
  const coreRef = useRef(null);
  const ringRef = useRef(null);

  const peak = useMemo(() => {
    let best = null;
    for (const zone of zones) {
      if (zone.currentDensity == null) continue;
      if (!best || zone.currentDensity > best.currentDensity) best = zone;
    }
    if (best) return best.currentDensity >= CONGESTED ? best : null;
    const flagged = zones.filter((zone) => zone.flagged && zone.ratio != null).sort((a, b) => b.ratio - a.ratio);
    return flagged[0] || null;
  }, [zones]);

  const density = peak?.currentDensity ?? null;
  const severe = density != null && density >= CRUSH_RISK;
  const band = density != null ? densityBand(density) : null;
  const colour = severe ? '#FF2D2D' : band ? band.color : NEO.orange;
  const radius = peak
    ? THREE.MathUtils.clamp(Math.min(peak.width, peak.depth) * (severe ? 0.3 : 0.2), 0.35, BEAM_RADIUS_MAX)
    : 1;
  const tall = venue.overlay?.beaconHeight ?? BEAM_HEIGHT;
  const height = severe ? tall : tall * 0.5;
  const labelY = Math.min(height, LABEL_MAX) + 1.2;

  useFrame(({ clock, camera }, delta) => {
    const time = clock.getElapsedTime();
    const speed = severe ? 5 : 2.5;
    const ease = 1 - Math.exp(-Math.min(delta, 0.1) * 4);
    presence.current += ((focused ? 0 : 1) - presence.current) * ease;
    const across = peak ? Math.hypot(camera.position.x - peak.x, camera.position.z - peak.z) : 0;
    const fade = THREE.MathUtils.smoothstep(across, BEAM_FADE[0], BEAM_FADE[1]) * presence.current;
    if (beamRef.current) {
      beamRef.current.material.opacity = ((severe ? 0.22 : 0.14) + Math.sin(time * speed) * 0.06) * fade;
      beamRef.current.visible = fade > 0.01;
    }
    if (coreRef.current) {
      coreRef.current.material.opacity = ((severe ? 0.55 : 0.35) + Math.sin(time * speed) * 0.15) * fade;
      coreRef.current.visible = fade > 0.01;
    }
    if (ringRef.current) {
      const cycle = (time * (severe ? 0.9 : 0.5)) % 1;
      const scale = 1 + cycle * 2.4;
      ringRef.current.scale.set(scale, scale, scale);
      ringRef.current.material.opacity = 0.7 * (1 - cycle);
    }
  });

  // Stays mounted and hides instead of unmounting, so its HTML label is not
  // torn down and rebuilt every time the crowd crosses the marker threshold.
  const shown = Boolean(peak) && visible;
  const tag = forecast.origin === 'observed' ? 'BACKEND' : 'SIMULATED';
  const bandWord = band ? band.label.replace(/ DENSITY$/, '') : 'PROJECTION ABOVE THRESHOLD';
  const reading = density != null ? `${density.toFixed(1)} P/m²` : null;

  return (
    <group position={peak ? [peak.x, peak.y - 0.55, peak.z] : [0, -50, 0]} visible={shown}>
      <mesh ref={beamRef} position={[0, height / 2, 0]} renderOrder={4}>
        <cylinderGeometry args={[radius * 0.55, radius, height, 32, 1, true]} />
        <meshBasicMaterial
          color={colour}
          transparent
          opacity={0.2}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          side={THREE.DoubleSide}
          toneMapped={false}
        />
      </mesh>
      <mesh ref={coreRef} position={[0, height / 2, 0]} renderOrder={4}>
        <cylinderGeometry args={[radius * 0.08, radius * 0.14, height, 12, 1, true]} />
        <meshBasicMaterial
          color={colour}
          transparent
          opacity={0.5}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]} renderOrder={4}>
        <ringGeometry args={[radius * 1.5, radius * 1.75, 64]} />
        <meshBasicMaterial color={colour} transparent opacity={0.6} side={THREE.DoubleSide} depthWrite={false} toneMapped={false} />
      </mesh>
      {/* Fixed size on screen: the strip above the twin carries the full reading. */}
      <Html position={[0, labelY, 0]} center pointerEvents="none" zIndexRange={[9, 0]}>
        <div style={{ ...labelStyle, display: shown && !focused ? 'flex' : 'none', borderColor: colour, boxShadow: `0 0 0 2px ${NEO.ink}, 0 0 14px ${colour}` }}>
          <span style={{ color: colour, fontSize: 12 }}>⚠</span>
          <span style={{ color: colour }}>{bandWord}</span>
          <span>{peak ? peak.id : ''}</span>
          {reading && <span>{reading}</span>}
          <span style={{ color: tag === 'SIMULATED' ? '#B45309' : '#166534' }}>{tag}</span>
        </div>
      </Html>
    </group>
  );
}

const labelStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  background: NEO.surface,
  color: NEO.ink,
  border: '2px solid',
  padding: '3px 7px',
  fontFamily: MONO,
  fontSize: 10,
  fontWeight: 900,
  letterSpacing: '0.06em',
  whiteSpace: 'nowrap',
  borderRadius: 2,
};
