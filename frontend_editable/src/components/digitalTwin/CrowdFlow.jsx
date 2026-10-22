import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useVenueStore, selectObservation, isDemo } from '../../store/useVenueStore';
import { useForecast, useScene, useVenue } from '../../store/derived';
import { NEO } from '../../theme';

/**
 * A single animated dashed tube. Dashes scroll along the curve to show
 * direction of travel; the tube is hidden entirely when the flow is inactive
 * so that "no established direction" reads as nothing, not as a still tube.
 */
function FlowTube({ curve, color, thickness, speed, active }) {
  const materialRef = useRef(null);

  const dashTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 16;
    const context = canvas.getContext('2d');
    context.fillStyle = '#000000';
    context.fillRect(0, 0, 512, 16);
    context.fillStyle = '#ffffff';
    for (let x = 0; x < 512; x += 48) {
      context.fillRect(x, 3, 30, 10); // hard edges, no feathering
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(10, 1);
    return texture;
  }, []);

  // The canvas texture lives on the GPU; free it when the overlay is toggled off.
  useEffect(() => () => dashTexture.dispose(), [dashTexture]);

  useFrame((_, delta) => {
    if (!materialRef.current || !active) return;
    dashTexture.offset.x -= speed * delta * 60;
  });

  const safeThickness = thickness > 0 ? thickness : 0.01;

  return (
    <group visible={active && thickness > 0}>
      <mesh>
        <tubeGeometry args={[curve, 90, safeThickness * 2.8, 8, false]} />
        <meshBasicMaterial color={color} transparent opacity={0.08} side={THREE.BackSide} />
      </mesh>
      <mesh>
        <tubeGeometry args={[curve, 90, safeThickness, 8, false]} />
        <meshBasicMaterial ref={materialRef} color={color} map={dashTexture} transparent />
      </mesh>
    </group>
  );
}

/**
 * Crowd movement corridors across the venue. Nothing is drawn unless the
 * evidence establishes a direction: scene-motion-only states render a single
 * violet corridor labelled as optical flow rather than person movement. The
 * corridor paths are part of each venue's description.
 */
export default function CrowdFlow() {
  const venue = useVenue();
  const forecast = useForecast();
  const scene = useScene();
  const observation = useVenueStore(selectObservation);
  const demo = useVenueStore(isDemo);
  const visible = useVenueStore((state) => state.overlays.flow);

  const curves = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(venue.corridors).map(([name, points]) => [
          name,
          new THREE.CatmullRomCurve3(points.map(([x, y, z]) => new THREE.Vector3(x, y, z))),
        ]),
      ),
    [venue],
  );

  // Read the scene's own motion state rather than a second mapping, so a new
  // scenario cannot silently fall through to UNRELIABLE.
  const motionState = demo ? scene.motion : observation?.motion_state;

  const projected = forecast.status !== 'UNAVAILABLE';
  const reversing = motionState === 'UNUSUAL COLLECTIVE MOVEMENT';
  const sceneMotionOnly = motionState === 'FLOW AVAILABLE; PERSON MOTION UNAVAILABLE';
  // Thin tubes on venues whose corridors are a few metres wide.
  const scale = Math.min(1, Math.max(0.35, venue.cell.width / 12));

  const config = {
    inbound: { active: projected && !reversing, thickness: 0.14 * scale, speed: 0.024, color: NEO.orange },
    egress: {
      active: projected,
      thickness: (reversing ? 0.08 : 0.16) * scale,
      speed: reversing ? 0.01 : 0.028,
      color: reversing ? NEO.amber : NEO.green,
    },
    lateral: { active: projected, thickness: 0.09 * scale, speed: 0.02, color: NEO.violet },
    reversal: { active: projected && reversing, thickness: 0.2 * scale, speed: 0.042, color: NEO.red },
    sceneMotion: { active: sceneMotionOnly, thickness: 0.07 * scale, speed: 0.03, color: NEO.violet },
  };

  if (!visible) return null;

  return (
    <group>
      {Object.entries(config).map(([name, settings]) =>
        curves[name] ? <FlowTube key={`${venue.id}-${name}`} curve={curves[name]} {...settings} /> : null,
      )}
    </group>
  );
}
