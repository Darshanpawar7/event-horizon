import { useRef, useMemo, useLayoutEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useVenueStore, selectFlowVector } from '../../store/useVenueStore';
import { useZones, useForecast, useVenue, useTimeline } from '../../store/derived';
import { speedFactor } from '../../data/venueModel';
import { densityBand, densityStep } from '../../theme';

/**
 * Instances shown per zone. One instance is one eligible track, so this caps
 * how dense a zone can *look*, never what it reports: counts above the cap
 * saturate the render while the telemetry keeps the real number.
 */
const PER_ZONE_CAP = 800;
const MAX_INSTANCES = 9 * PER_ZONE_CAP;

/** Free walking speed in world units (metres) per second. */
const FREE_SPEED = 1.34;
/** How fast the rendered population catches up with a changing count. */
const POPULATION_LERP = 2.2;

const dummy = new THREE.Object3D();
const tint = new THREE.Color();

/**
 * Instanced markers standing in for tracked people.
 *
 * Positions are illustrative — the backend supplies per-cell counts, not
 * per-person coordinates, so these show occupancy, direction and pace, never
 * individual identities. What *is* modelled is the relationship every crowd
 * obeys and every operator needs to see: as a zone packs, walking speed falls
 * toward a shuffle, lateral jostle grows, and the mass compresses against the
 * downstream edge instead of spreading out evenly. Markers are human-sized
 * (0.44 m across), so a three-abreast alley looks like one.
 */
export default function CrowdParticles() {
  const meshRef = useRef(null);
  const venue = useVenue();
  const zones = useZones();
  const forecast = useForecast();
  const timeline = useTimeline();
  const flow = useVenueStore(selectFlowVector);
  const visible = useVenueStore((state) => state.overlays.trajectories);

  const onTimeline = Boolean(timeline);
  const counterflow = onTimeline ? forecast.counterflow || 0 : 0;

  // One slot per possible instance, seeded deterministically so the scene does
  // not reshuffle on every render. Each slot carries its own pace, phase and
  // build so the crowd reads as people rather than a lattice of identical pins.
  const slots = useMemo(
    () =>
      Array.from({ length: MAX_INSTANCES }, (_, index) => {
        const a = fract(Math.sin(index * 12.9898) * 43758.5453);
        const b = fract(Math.sin(index * 78.233) * 24634.6345);
        const c = fract(Math.sin(index * 39.425) * 17231.1234);
        const d = fract(Math.sin(index * 93.989) * 51237.8765);
        return {
          ox: a * 2 - 1, // start position as a fraction of the cell's half-extents
          oz: b * 2 - 1,
          pace: 0.78 + c * 0.44, // personal walking speed, ±22% of free speed
          phase: d * Math.PI * 2, // jostle phase, so nobody sways in unison
          build: 0.86 + c * 0.3, // marker height variation
          rand: d, // decides who turns first in a counterflow
        };
      }),
    [],
  );

  const progress = useRef(new Float32Array(MAX_INSTANCES));
  const population = useRef(new Float32Array(9));

  useLayoutEffect(() => {
    if (!meshRef.current) return;
    meshRef.current.frustumCulled = false;
    // Start empty so unfilled slots never flash at the world origin.
    meshRef.current.count = 0;
  }, []);

  useFrame(({ clock }, delta) => {
    const mesh = meshRef.current;
    if (!mesh || !visible) return;

    const time = clock.getElapsedTime();
    const step = Math.min(delta, 0.1); // a backgrounded tab must not teleport the crowd
    const [globalX, globalZ] = flow || [0, 0];
    const moving = Boolean(flow);
    let cursor = 0;

    for (let zoneIndex = 0; zoneIndex < zones.length; zoneIndex += 1) {
      const zone = zones[zoneIndex];
      // Only render slots backed by an actual eligible-track count.
      const target = zone?.current == null ? 0 : Math.min(PER_ZONE_CAP, Math.round(zone.current));
      population.current[zoneIndex] +=
        (target - population.current[zoneIndex]) * Math.min(1, step * POPULATION_LERP);
      const count = Math.round(population.current[zoneIndex]);
      if (!zone || count <= 0) continue;

      // Area density exists only for a simulated grid. Under a backend forecast
      // there is no area, so the markers fall back to the threshold ramp the
      // zone columns already use rather than implying a density nobody measured.
      const density = zone.currentDensity ?? 0;
      // Walking speed falls as the crowd packs, which is the single most
      // legible sign of a concourse in trouble.
      const pace = speedFactor(density);
      // Packed crowds sway against each other; free-flowing ones barely do.
      const jostle = (0.05 + (1 - pace) * 0.5) * Math.min(1, zone.width / 4);
      // And they compress toward the edge they are trying to leave through
      // instead of staying evenly spread across the zone.
      const compression = Math.min(0.55, Math.max(0, (density - 1.6) / 6));

      const [fieldX, fieldZ] = onTimeline ? venue.egressField[zone.id] || [0, 1] : [globalX, globalZ];
      const margin = Math.min(0.6, 0.15 * Math.min(zone.width, zone.depth));
      const halfW = zone.width / 2 - margin;
      const halfD = zone.depth / 2 - margin;
      // Travel wraps once a marker has crossed the cell along its line of travel.
      const span = 2 * (Math.abs(fieldX) * halfW + Math.abs(fieldZ) * halfD) || 1;
      const heading = Math.atan2(fieldX, fieldZ);
      const band = zone.currentDensity == null ? densityStep(zone.ratio) : densityBand(density);
      const base = zoneIndex * PER_ZONE_CAP;
      const drifting = moving || onTimeline;

      for (let n = 0; n < count; n += 1) {
        // Travel is stored against the slot, not the draw order, so people do
        // not jump when the population around them changes.
        const slotIndex = base + n;
        const slot = slots[slotIndex];
        cursor += 1;

        // Counterflow: part of the crowd turns back into the people behind it.
        const reversed = counterflow > 0 && slot.rand < counterflow;
        const direction = reversed ? -1 : 1;

        if (drifting) {
          const moved = progress.current[slotIndex] + step * FREE_SPEED * pace * slot.pace * direction;
          progress.current[slotIndex] = Math.abs(moved) > span ? moved % span : moved;
        }
        const travel = progress.current[slotIndex];
        const sway = Math.sin(time * 2.4 + slot.phase) * jostle;

        // Position along the field, wrapped inside the cell on each axis, then
        // squeezed toward the downstream edge as density rises.
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

        dummy.position.set(zone.x + px, -0.24, zone.z + pz);
        dummy.rotation.set(0, reversed ? heading + Math.PI : heading, 0);
        dummy.scale.set(1, slot.build, 1);
        dummy.updateMatrix();
        mesh.setMatrixAt(cursor - 1, dummy.matrix);
        mesh.setColorAt(cursor - 1, tint.set(band.color));
      }
    }

    mesh.count = cursor;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });

  if (!visible) return null;

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, MAX_INSTANCES]} castShadow>
      <cylinderGeometry args={[0.22, 0.22, 0.72, 6]} />
      <meshStandardMaterial roughness={0.9} flatShading />
    </instancedMesh>
  );
}

/** Keeps a drifting marker inside its zone by wrapping at the cell edge. */
function wrap(value, half) {
  if (half <= 0) return 0;
  const span = half * 2;
  return ((((value + half) % span) + span) % span) - half;
}

function fract(value) {
  return value - Math.floor(value);
}
