import { useRef, useMemo, useLayoutEffect, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useVenueStore, selectFlowVector } from '../../store/useVenueStore';
import { useZones, useForecast, useVenue, useTimeline } from '../../store/derived';
import { speedFactor, surfaceHeight, flatZoneHeight, layoutZones } from '../../data/venueModel';
import {
  figureGeometry,
  figureMaterial,
  disposeFigureGeometry,
  contactGeometry,
  contactMaterial,
  writeFigure,
  markMatrices,
  fillColours,
} from '../../lib/figures';

/**
 * Figures shown per zone. One figure is one eligible track, so this caps how
 * dense a zone can *look*, never what it reports: counts above the cap
 * saturate the render while the telemetry keeps the real number.
 */
const PER_ZONE_CAP = 800;
const ZONE_COUNT = 9;

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

/**
 * Instanced human figures standing in for tracked people, one instanced mesh
 * per zone so each zone's people keep their clothes as the counts change.
 *
 * Positions are illustrative — the backend supplies per-cell counts, not
 * per-person coordinates, so these show occupancy, direction and pace, never
 * individual identities. What *is* modelled is the relationship every crowd
 * obeys and every operator needs to see: as a zone packs, walking slows to a
 * shuffle and then stops, people sway against each other, and the mass
 * compresses toward the edge it is trying to leave through. Figures are
 * human-sized, so a three-abreast alley looks like one.
 *
 * Built to stay smooth on an integrated GPU: one matrix per figure written
 * straight into the instance buffer, only the figures in use uploaded,
 * colours written once per venue, and zones out of view culled.
 */
export default function CrowdParticles() {
  const venue = useVenue();
  const zones = useZones();
  const forecast = useForecast();
  const timeline = useTimeline();
  const flow = useVenueStore(selectFlowVector);
  const visible = useVenueStore((state) => state.overlays.trajectories);

  const onTimeline = Boolean(timeline);
  const counterflow = onTimeline ? forecast.counterflow || 0 : 0;
  const palette = venue.crowd?.palette || CLOTHES;
  // The moon casts no shadow worth drawing; by day the crowd does.
  const shadows = venue.lighting?.mode !== 'night';

  // One slot per possible figure, seeded deterministically so the crowd does
  // not reshuffle on every render. Each slot carries its own pace, phase,
  // build and clothes so the crowd reads as people rather than a lattice.
  const slots = useMemo(
    () =>
      Array.from({ length: ZONE_COUNT * PER_ZONE_CAP }, (_, index) => {
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
          cloth: Math.floor(e * 1000),
          skin: Math.floor(a * 1000),
          trouser: Math.floor(b * 1000),
        };
      }),
    [],
  );

  // Each zone's mesh carries its people's clothes; rebuilt when the venue's palette changes.
  const geometries = useMemo(
    () =>
      Array.from({ length: ZONE_COUNT }, (_, zoneIndex) => {
        const base = zoneIndex * PER_ZONE_CAP;
        const colours = (list, key) =>
          fillColours(new Float32Array(PER_ZONE_CAP * 3), PER_ZONE_CAP, (i) => list[slots[base + i][key] % list.length]);
        return figureGeometry(colours(TROUSERS, 'trouser'), colours(palette, 'cloth'), colours(SKIN, 'skin'));
      }),
    [palette, slots],
  );
  useEffect(() => () => geometries.forEach(disposeFigureGeometry), [geometries]);
  const material = useMemo(() => figureMaterial(), []);
  useEffect(() => () => material.dispose(), [material]);
  // Contact shadows are darker at night, when nothing else grounds the crowd.
  const contact = useMemo(() => contactMaterial(shadows ? 0.3 : 0.5), [shadows]);
  useEffect(() => () => contact.dispose(), [contact]);

  // Per-venue zone facts that never change during playback.
  const layout = useMemo(
    () =>
      layoutZones(venue).map((zone) => ({
        floor: flatZoneHeight(venue, zone),
        sphere: new THREE.Sphere(
          new THREE.Vector3(zone.x, GROUND_Y + zone.y + 2, zone.z),
          Math.hypot(zone.width / 2, zone.depth / 2, 4.5) + 1,
        ),
      })),
    [venue],
  );

  const meshes = useRef([]);
  const contacts = useRef([]);
  const setters = useMemo(
    () =>
      Array.from({ length: ZONE_COUNT }, (_, zoneIndex) => (mesh) => {
        meshes.current[zoneIndex] = mesh;
      }),
    [],
  );
  const contactSetters = useMemo(
    () =>
      Array.from({ length: ZONE_COUNT }, (_, zoneIndex) => (mesh) => {
        contacts.current[zoneIndex] = mesh;
      }),
    [],
  );
  const progress = useRef(new Float32Array(ZONE_COUNT * PER_ZONE_CAP));
  const population = useRef(new Float32Array(ZONE_COUNT));

  useLayoutEffect(() => {
    meshes.current.forEach((mesh, zoneIndex) => {
      if (!mesh) return;
      // A fixed sphere around the cell lets three skip zones out of view.
      mesh.boundingSphere = layout[zoneIndex].sphere;
      mesh.count = 0;
      const shadow = contacts.current[zoneIndex];
      if (shadow) {
        // The contact shadows ride on the figures' own matrices: one upload for both.
        shadow.instanceMatrix = mesh.instanceMatrix;
        shadow.boundingSphere = layout[zoneIndex].sphere;
        shadow.count = 0;
      }
    });
  }, [geometries, layout, contact]);

  useFrame(({ clock }, delta) => {
    if (!visible) return;
    const time = clock.getElapsedTime();
    const step = Math.min(delta, 0.1); // a backgrounded tab must not teleport the crowd
    const [globalX, globalZ] = flow || [0, 0];
    const drifting = Boolean(flow) || onTimeline;

    for (let zoneIndex = 0; zoneIndex < ZONE_COUNT; zoneIndex += 1) {
      const mesh = meshes.current[zoneIndex];
      const zone = zones[zoneIndex];
      if (!mesh) continue;
      const target = zone?.current == null ? 0 : Math.min(PER_ZONE_CAP, Math.round(zone.current));
      population.current[zoneIndex] += (target - population.current[zoneIndex]) * Math.min(1, step * POPULATION_LERP);
      const count = zone ? Math.round(population.current[zoneIndex]) : 0;
      mesh.count = Math.max(0, count);
      const shadow = contacts.current[zoneIndex];
      if (shadow) shadow.count = mesh.count;
      if (count <= 0) continue;

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
      const cosHeading = Math.cos(heading);
      const sinHeading = Math.sin(heading);
      const base = zoneIndex * PER_ZONE_CAP;
      const flatFloor = layout[zoneIndex].floor;
      const width = crushed ? 0.92 : 1;
      const edgeX = Math.sign(fieldX) * halfW;
      const edgeZ = Math.sign(fieldZ) * halfD;
      const squeezeX = 1 - compression * Math.abs(fieldX);
      const squeezeZ = 1 - compression * Math.abs(fieldZ);
      const array = mesh.instanceMatrix.array;

      for (let n = 0; n < count; n += 1) {
        const slotIndex = base + n;
        const slot = slots[slotIndex];
        const reversed = counterflow > 0 && slot.rand < counterflow;

        if (drifting) {
          const moved = progress.current[slotIndex] + step * FREE_SPEED * pace * slot.pace * (reversed ? -1 : 1);
          progress.current[slotIndex] = Math.abs(moved) > span ? moved % span : moved;
        }
        const travel = progress.current[slotIndex];
        const sway = Math.sin(time * 2.4 + slot.phase) * jostle;

        let px = wrap(slot.ox * halfW + fieldX * travel - fieldZ * sway, halfW);
        let pz = wrap(slot.oz * halfD + fieldZ * travel + fieldX * sway, halfD);
        if (compression > 0) {
          if (fieldX !== 0) px = edgeX - (edgeX - px) * squeezeX;
          if (fieldZ !== 0) pz = edgeZ - (edgeZ - pz) * squeezeZ;
        }

        // Walking bob while there is room to walk; a tighter, slower sway once packed.
        const stride = drifting && pace > 0.1 ? Math.abs(Math.sin(time * 5.5 * slot.pace + slot.phase)) * 0.05 * pace : 0;
        const lean = crushed ? Math.sin(time * 1.7 + slot.phase) * 0.12 : drifting ? 0.06 * pace : 0;
        const x = zone.x + px;
        const z = zone.z + pz;
        // Stand on the floor slope or the stair tread under this point.
        const floor = flatFloor ?? surfaceHeight(venue, x, z, zone.id);
        const build = slot.build * (crushed ? 0.96 : 1);
        const cosYaw = reversed ? -cosHeading : cosHeading;
        const sinYaw = reversed ? -sinHeading : sinHeading;
        writeFigure(array, n * 16, x, GROUND_Y + floor + stride, z, cosYaw, sinYaw, lean, width, build);
      }
      markMatrices(mesh, count);
    }
  });

  return (
    <group visible={visible}>
      {geometries.map((geometry, zoneIndex) => (
        <instancedMesh
          key={zoneIndex}
          ref={setters[zoneIndex]}
          args={[geometry, material, PER_ZONE_CAP]}
          castShadow={shadows}
          dispose={null}
        />
      ))}
      {geometries.map((_, zoneIndex) => (
        <instancedMesh
          key={`contact-${zoneIndex}`}
          ref={contactSetters[zoneIndex]}
          args={[contactGeometry(), contact, PER_ZONE_CAP]}
          renderOrder={1}
          dispose={null}
        />
      ))}
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
