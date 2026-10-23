import { useRef, useMemo, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Sky, Stars } from '@react-three/drei';
import * as THREE from 'three';
import { useVenueStore } from '../../store/useVenueStore';
import { useForecast, useTimeline, useVenue } from '../../store/derived';
import { NEO } from '../../theme';

/**
 * Lighting, sky and atmosphere for the active venue, plus the operations hub
 * and the alert light.
 *
 * Each venue states the time of day its incident happened: a sunlit afternoon
 * at the stadium and in Duisburg, night at New Delhi station, the Kumbh and
 * Itaewon. The venue's `lighting` block sets the base; the evidence state then
 * modulates it so a degraded view is legible before reading any text — fog
 * thickens when visibility is lost, the light cools when tracking is gone,
 * and a crush reconstruction leans warm and heavy.
 */

const DEFAULT_LIGHTING = {
  mode: 'day',
  sun: [60, 80, 40],
  sunColor: '#FFF4E0',
  sunIntensity: 2.4,
  hemisphere: { sky: '#CFE3FF', ground: '#8C7A62', intensity: 0.9 },
  ambient: 0.25,
  fog: { color: '#DCE3EA', density: 0.0022 },
  sky: { turbidity: 6, rayleigh: 1.6, mieCoefficient: 0.004, mieDirectionalG: 0.8 },
  exposure: 1.0,
};

/** Evidence-state modifiers applied on top of the venue's lighting. */
const MOODS = {
  clear: { fog: 1, ambient: 1, tint: '#FFFFFF' },
  tracking: { fog: 2.6, ambient: 0.75, tint: '#C9D4E3' },
  visibility: { fog: 5, ambient: 0.6, tint: '#B8BEC6' },
  camera: { fog: 2.2, ambient: 0.9, tint: '#FFE2A8' },
  collective: { fog: 1.6, ambient: 1.05, tint: '#FFB98A' },
  surge: { fog: 1.3, ambient: 1.0, tint: '#FFD3A0' },
  crush: { fog: 1.9, ambient: 0.95, tint: '#FF9C7A' },
};

/**
 * How often the sun's shadow map is redrawn at each render tier. Structures
 * never move, so only the crowd's shadows go stale between redraws; at
 * twelve a second that is invisible, and the shadow pass stops costing a
 * second render of the whole venue every frame.
 */
const SHADOW_INTERVAL = { high: 0, medium: 1 / 12, low: 1 / 5 };

export default function SceneEffects() {
  const { scene, gl } = useThree();
  const venue = useVenue();
  const tier = useVenueStore((state) => state.renderTier);
  const shadowClock = useRef(0);
  const forecast = useForecast();
  const timeline = useTimeline();
  const lighting = { ...DEFAULT_LIGHTING, ...(venue.lighting || {}) };
  const night = lighting.mode === 'night';

  const stateKey = useVenueStore((state) => {
    if (state.mode === 'demo') return state.scenario;
    const observation = state.status?.observation;
    if (!observation) return 'tracking';
    if (observation.visibility_status === 'degraded') return 'visibility';
    if (observation.motion_state === 'CAMERA MOVEMENT SUSPECTED') return 'camera';
    if (observation.tracking_state !== 'TRACK MOTION AVAILABLE') return 'tracking';
    if (observation.motion_state === 'UNUSUAL COLLECTIVE MOVEMENT') return 'collective';
    return 'clear';
  });
  const moodKey = timeline
    ? timeline.kind === 'authored'
      ? timeline.id
      : timeline.intervention
        ? 'surge'
        : 'crush'
    : stateKey;
  const mood = MOODS[moodKey] || MOODS.clear;

  const hemisphereRef = useRef(null);
  const ambientRef = useRef(null);
  const sunRef = useRef(null);
  const alertLightRef = useRef(null);

  const targets = useMemo(
    () => ({
      fogColor: new THREE.Color(lighting.fog.color),
      sunColor: new THREE.Color(lighting.sunColor).lerp(new THREE.Color(mood.tint), 0.35),
      background: new THREE.Color(night ? lighting.background || '#0B1020' : lighting.fog.color),
    }),
    [lighting.fog.color, lighting.sunColor, lighting.background, mood.tint, night],
  );

  useEffect(() => {
    scene.fog = new THREE.FogExp2(lighting.fog.color, lighting.fog.density);
    // At night a dark dome; by day the Sky component shows through.
    scene.background = night ? new THREE.Color(lighting.background || '#0B1020') : null;
    gl.toneMappingExposure = lighting.exposure * (night ? 1.15 : 1);
    return () => {
      scene.fog = null;
    };
  }, [scene, gl, lighting.fog.color, lighting.fog.density, lighting.background, lighting.exposure, night]);

  useEffect(() => {
    const interval = SHADOW_INTERVAL[tier] ?? 0;
    gl.shadowMap.autoUpdate = interval === 0;
    gl.shadowMap.needsUpdate = true;
    return () => {
      gl.shadowMap.autoUpdate = true;
    };
  }, [gl, tier, venue.id]);

  useFrame((state, delta) => {
    const time = state.clock.getElapsedTime();
    const ease = 0.04;

    const interval = SHADOW_INTERVAL[tier] ?? 0;
    if (interval > 0) {
      shadowClock.current += delta;
      if (shadowClock.current >= interval) {
        shadowClock.current = 0;
        gl.shadowMap.needsUpdate = true;
      }
    }

    if (hemisphereRef.current) {
      hemisphereRef.current.intensity = THREE.MathUtils.lerp(
        hemisphereRef.current.intensity,
        lighting.hemisphere.intensity * mood.ambient,
        ease,
      );
    }
    if (ambientRef.current) {
      ambientRef.current.intensity = THREE.MathUtils.lerp(ambientRef.current.intensity, lighting.ambient * mood.ambient, ease);
    }
    if (sunRef.current) {
      sunRef.current.intensity = THREE.MathUtils.lerp(sunRef.current.intensity, lighting.sunIntensity * mood.ambient, ease);
      sunRef.current.color.lerp(targets.sunColor, ease);
    }
    if (scene.fog instanceof THREE.FogExp2) {
      scene.fog.color.lerp(targets.fogColor, ease);
      scene.fog.density = THREE.MathUtils.lerp(scene.fog.density, lighting.fog.density * mood.fog, ease);
    }
    if (night && scene.background instanceof THREE.Color) {
      scene.background.lerp(targets.background, ease);
    }
    if (alertLightRef.current) {
      const reviewing = forecast.status === 'REVIEW CONCENTRATION';
      alertLightRef.current.intensity = reviewing ? (Math.sin(time * 6) * 0.4 + 0.6) * (night ? 40 : 18) : 0;
    }
  });

  const reviewing = forecast.status === 'REVIEW CONCENTRATION';
  const hubColor = forecast.status === 'UNAVAILABLE' ? NEO.grey : reviewing ? NEO.red : NEO.green;
  const hub = venue.controlRoom;
  const shadowExtent = Math.max(70, (venue.ground?.size ?? 140) / 2);

  return (
    <group>
      {night ? (
        <Stars radius={260} depth={60} count={2400} factor={3.2} saturation={0} fade speed={0.4} />
      ) : (
        <Sky
          distance={450000}
          sunPosition={lighting.sun}
          turbidity={lighting.sky.turbidity}
          rayleigh={lighting.sky.rayleigh}
          mieCoefficient={lighting.sky.mieCoefficient}
          mieDirectionalG={lighting.sky.mieDirectionalG}
        />
      )}

      <hemisphereLight
        ref={hemisphereRef}
        args={[lighting.hemisphere.sky, lighting.hemisphere.ground, lighting.hemisphere.intensity]}
      />
      <ambientLight ref={ambientRef} intensity={lighting.ambient} />
      {/* Shadows only by day: a dim moon casts none worth a second render of the venue. */}
      <directionalLight
        ref={sunRef}
        castShadow={!night}
        position={lighting.sun}
        color={lighting.sunColor}
        intensity={lighting.sunIntensity}
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-bias={-0.00025}
        shadow-normalBias={0.02}
        shadow-camera-near={1}
        shadow-camera-far={400}
        shadow-camera-left={-shadowExtent}
        shadow-camera-right={shadowExtent}
        shadow-camera-top={shadowExtent}
        shadow-camera-bottom={-shadowExtent}
      />

      {/* Operations hub — the physical counterpart of this console */}
      {hub && (
        <group position={[hub[0], 0, hub[1]]}>
          <mesh receiveShadow position={[0, -0.6, 0]}>
            <boxGeometry args={[9, 0.1, 6]} />
            <meshStandardMaterial color={NEO.metal} roughness={0.9} />
          </mesh>
          <mesh castShadow position={[0, 0.4, 0]}>
            <boxGeometry args={[3.2, 1.8, 2.2]} />
            <meshStandardMaterial color={NEO.ink} metalness={0.7} roughness={0.3} />
          </mesh>
          <mesh position={[0, 0.5, 1.11]}>
            <planeGeometry args={[2.4, 1.0]} />
            <meshStandardMaterial color="#9ECBFF" emissive="#9ECBFF" emissiveIntensity={night ? 1.6 : 0.3} />
          </mesh>
          <mesh position={[0, 1.5, 0]}>
            <sphereGeometry args={[0.16, 16, 16]} />
            <meshStandardMaterial color={hubColor} emissive={hubColor} emissiveIntensity={2} />
          </mesh>
          <mesh castShadow position={[2.4, 2.2, -1.4]}>
            <cylinderGeometry args={[0.07, 0.12, 5.2]} />
            <meshStandardMaterial color={NEO.ink} metalness={0.95} roughness={0.2} />
          </mesh>
          <mesh castShadow position={[2.4, 4.6, -1.4]}>
            <boxGeometry args={[2.6, 0.08, 0.08]} />
            <meshStandardMaterial color={NEO.ink} metalness={0.95} roughness={0.2} />
          </mesh>
        </group>
      )}

      <pointLight ref={alertLightRef} color={NEO.red} intensity={0} distance={48} decay={2} position={[0, 7, 0]} />
    </group>
  );
}
