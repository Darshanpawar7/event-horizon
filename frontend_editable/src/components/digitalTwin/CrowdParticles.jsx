import { useRef, useMemo, useLayoutEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useVenueStore, selectFlowVector } from '../../store/useVenueStore';
import { useZones, useForecast, useVenue, useTimeline } from '../../store/derived';
import { speedFactor, surfaceHeight } from '../../data/venueModel';

/**
 * Figures shown per zone. One figure is one eligible track, so this caps how
 * dense a zone can *look*, never what it reports: counts above the cap
 * saturate the render while the telemetry keeps the real number.
 */
const PER_ZONE_CAP = 800;
const MAX_INSTANCES = 9 * PER_ZONE_CAP;

/** Free walking speed in world units (metres) per second. */
const FREE_SPEED = 1.34;
/** How fast the rendered population catches up with a changing count. */
const POPULATION_LERP = 2.2;
/** Simulated density past which figures stop walking and start swaying. */
const CRUSH_RISK_DENSITY = 3.5;
/** The venue floor; figures stand on it. */
const GROUND_Y = -0.6;

/** Everyday clothing, when a venue does not name its own palette. */
const CLOTHES = [
  '#1F2937', '#111827', '#374151', '#4B5563', '#6B7280', '#9CA3AF', '#E5E7EB', '#F3F4F6',
  '#7F1D1D', '#B91C1C', '#1E3A8A', '#1D4ED8', '#065F46', '#92400E', '#D97706', '#4C1D95',
];
const SKIN = ['#8D5524', '#C68642', '#E0AC69', '#F1C27D', '#FFDBAC', '#5C3A21', '#A1665E', '#D9A066'];
const TROUSERS = ['#111827', '#1F2937', '#374151', '#1E3A8A', '#4B5563', '#78350F'];

const dummy = new THREE.Object3D();
const tint = new THREE.Color();

/**
 * Instanced human figures standing in for tracked people: legs, body and head
 * as three instanced meshes sharing one set of positions.
 *
 * Positions are illustrative — the backend supplies per-cell counts, not
 * per-person coordinates, so these show occupancy, direction and pace, never
 * individual identities. What *is* modelled is the relationship every crowd
 * obeys and every operator needs to see: as a zone packs, walking slows to a
 * shuffle and then stops, people sway against each other, and the mass
 * compresses toward the edge it is trying to leave through. Figures are
 * human-sized, so a three-abreast alley looks like one.
 */
export default function CrowdParticles() {
  const legsRef = useRef(null);
  const bodyRef = useRef(null);
  const headRef = useRef(null);
  const venue = useVenue();
  const zones = useZones();
  const forecast = useForecast();
  const timeline = useTimeline();
  const flow = useVenueStore(selectFlowVector);
  const visible = useVenueStore((state) => state.overlays.trajectories);

  const onTimeline = Boolean(timeline);
  const counterflow = onTimeline ? forecast.counterflow || 0 : 0;
  const palette = venue.crowd?.palette || CLOTHES;

  // One slot per possible figure, seeded deterministically so the crowd does
  // not reshuffle on every render. Each slot carries its own pace, phase,
  // build and clothes so the crowd reads as people rather than a lattice.
  const slots = useMemo(
    () =>
      Array.from({ length: MAX_INSTANCES }, (_, index) => {
        const a = fract(Math.sin(index * 12.9898) * 43758.5453);
        const b = fract(Math.sin(index * 78.233) * 24634.6345);
        const c = fract(Math.sin(index * 39.425) * 17231.1234);
        const d = fract(Math.sin(index * 93.989) * 51237.8765);
        const e = fract(Math.sin(index * 57.113) * 31861.2219);
        return {
          ox: a * 2 - 1,
          oz: b * 2 - 1,
          pace: 0.78 + c * 0.44,
          phase: d * Math.PI * 2,
          build: 0.9 + c * 0.22,
          rand: d,
          cloth: Math.floor(e * 1000) % palette.length,
          skin: Math.floor(a * 1000) % SKIN.length,
          trouser: Math.floor(b * 1000) % TROUSERS.length,
        };
      }),
    [palette.length],
  );

  const progress = useRef(new Float32Array(MAX_INSTANCES));
  const population = useRef(new Float32Array(9));

  useLayoutEffect(() => {
    for (const ref of [legsRef, bodyRef, headRef]) {
      if (!ref.current) continue;
      ref.current.frustumCulled = false;
      ref.current.count = 0;
    }
  }, []);

  useFrame(({ clock }, delta) => {
    const legs = legsRef.current;
    const body = bodyRef.current;
    const head = headRef.current;
    if (!legs || !body || !head || !visible) return;

    const time = clock.getElapsedTime();
    const step = Math.min(delta, 0.1); // a backgrounded tab must not teleport the crowd
    const [globalX, globalZ] = flow || [0, 0];
    const moving = Boolean(flow);
    let cursor = 0;

    for (let zoneIndex = 0; zoneIndex < zones.length; zoneIndex += 1) {
      const zone = zones[zoneIndex];
      const target = zone?.current == null ? 0 : Math.min(PER_ZONE_CAP, Math.round(zone.current));
      population.current[zoneIndex] += (target - population.current[zoneIndex]) * Math.min(1, step * POPULATION_LERP);
      const count = Math.round(population.current[zoneIndex]);
      if (!zone || count <= 0) continue;

      // Area density exists only for a simulated grid; under a backend forecast
      // figures simply stand at a comfortable spacing.
      const density = zone.currentDensity ?? 0;
      const pace = speedFactor(density);
      const crushed = density >= CRUSH_RISK_DENSITY;
      // Packed crowds sway against each other; free-flowing ones barely do.
      const jostle = (0.04 + (1 - pace) * 0.45) * Math.min(1, zone.width / 4);
      // And they compress toward the edge they are trying to leave through.
      const compression = Math.min(0.55, Math.max(0, (density - 1.6) / 6));

      const [fieldX, fieldZ] = onTimeline ? venue.egressField[zone.id] || [0, 1] : [globalX, globalZ];
      const margin = Math.min(0.6, 0.15 * Math.min(zone.width, zone.depth));
      const halfW = zone.width / 2 - margin;
      const halfD = zone.depth / 2 - margin;
      const span = 2 * (Math.abs(fieldX) * halfW + Math.abs(fieldZ) * halfD) || 1;
      const heading = Math.atan2(fieldX, fieldZ);
      const base = zoneIndex * PER_ZONE_CAP;
      const drifting = moving || onTimeline;

      for (let n = 0; n < count; n += 1) {
        const slotIndex = base + n;
        const slot = slots[slotIndex];
        cursor += 1;

        const reversed = counterflow > 0 && slot.rand < counterflow;
        const direction = reversed ? -1 : 1;

        if (drifting) {
          const moved = progress.current[slotIndex] + step * FREE_SPEED * pace * slot.pace * direction;
          progress.current[slotIndex] = Math.abs(moved) > span ? moved % span : moved;
        }
        const travel = progress.current[slotIndex];
        const sway = Math.sin(time * 2.4 + slot.phase) * jostle;

        let px = wrap(slot.ox * halfW + fieldX * travel - fieldZ * sway, halfW);
        let pz = wrap(slot.oz * halfD + fieldZ * travel + fieldX * sway, halfD);
        if (compression > 0) {
          if (fieldX !== 0) {
            const edge = Math.sign(fieldX) * halfW;
            px = edge - (edge - px) * (1 - compression * Math.abs(fieldX));
          }
          if (fieldZ !== 0) {
            const edge = Math.sign(fieldZ) * halfD;
            pz = edge - (edge - pz) * (1 - compression * Math.abs(fieldZ));
          }
        }

        // Walking bob while there is room to walk; a tighter, slower sway once packed.
        const stride = drifting && pace > 0.1 ? Math.abs(Math.sin(time * 5.5 * slot.pace + slot.phase)) * 0.05 * pace : 0;
        const lean = crushed ? Math.sin(time * 1.7 + slot.phase) * 0.12 : drifting ? 0.06 * pace : 0;
        const yaw = reversed ? heading + Math.PI : heading;
        const scaleXZ = crushed ? 0.92 : 1;
        const x = zone.x + px;
        const z = zone.z + pz;
        const build = slot.build * (crushed ? 0.96 : 1);
        // Stand on the floor slope or the stair tread under this point.
        const floorY = GROUND_Y + surfaceHeight(venue, x, z, zone.id);

        // Legs
        dummy.position.set(x, floorY + 0.42 * build + stride, z);
        dummy.rotation.set(0, yaw, 0);
        dummy.scale.set(scaleXZ, build, scaleXZ);
        dummy.updateMatrix();
        legs.setMatrixAt(cursor - 1, dummy.matrix);
        legs.setColorAt(cursor - 1, tint.set(TROUSERS[slot.trouser]));

        // Body
        dummy.position.set(x, floorY + 1.12 * build + stride, z);
        dummy.rotation.set(lean, yaw, 0);
        dummy.scale.set(scaleXZ, build, scaleXZ);
        dummy.updateMatrix();
        body.setMatrixAt(cursor - 1, dummy.matrix);
        body.setColorAt(cursor - 1, tint.set(palette[slot.cloth]));

        // Head
        dummy.position.set(x + Math.sin(yaw) * lean * 0.5, floorY + 1.63 * build + stride, z + Math.cos(yaw) * lean * 0.5);
        dummy.rotation.set(0, yaw, 0);
        dummy.scale.set(build, build, build);
        dummy.updateMatrix();
        head.setMatrixAt(cursor - 1, dummy.matrix);
        head.setColorAt(cursor - 1, tint.set(SKIN[slot.skin]));
      }
    }

    for (const mesh of [legs, body, head]) {
      mesh.count = cursor;
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
  });

  if (!visible) return null;

  return (
    <group>
      <instancedMesh ref={legsRef} args={[undefined, undefined, MAX_INSTANCES]}>
        <boxGeometry args={[0.3, 0.84, 0.22]} />
        <meshStandardMaterial roughness={0.95} />
      </instancedMesh>
      <instancedMesh ref={bodyRef} args={[undefined, undefined, MAX_INSTANCES]} castShadow>
        <capsuleGeometry args={[0.2, 0.46, 4, 8]} />
        <meshStandardMaterial roughness={0.85} />
      </instancedMesh>
      <instancedMesh ref={headRef} args={[undefined, undefined, MAX_INSTANCES]} castShadow>
        <sphereGeometry args={[0.13, 10, 10]} />
        <meshStandardMaterial roughness={0.7} />
      </instancedMesh>
    </group>
  );
}

/** Keeps a drifting figure inside its zone by wrapping at the cell edge. */
function wrap(value, half) {
  if (half <= 0) return 0;
  const span = half * 2;
  return ((((value + half) % span) + span) % span) - half;
}

function fract(value) {
  return value - Math.floor(value);
}
