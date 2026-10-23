import { useEffect, useMemo, useRef, useLayoutEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { useVenueStore } from '../../store/useVenueStore';
import { useForecast, useVenue } from '../../store/derived';
import { surfaceHeight } from '../../data/venueModel';
import { figureGeometry, figureMaterial, disposeFigureGeometry, writeFigure } from '../../lib/figures';
import { NEO, MONO } from '../../theme';

const GROUND_Y = -0.6;
/** Most figures drawn for one holding area; the label always gives the full number. */
const HELD_CAP = 1400;
/** Most holding areas any venue defines. */
const LABEL_SLOTS = 3;
/** Queue spacing: about 2.6 people per square metre, a dense but standing queue. */
const QUEUE_SPACING = 0.62;
/** Figures outside the analysed region are drawn in muted colours. */
const MUTE = 0.5;
const MUTED = new THREE.Color('#6B7280');

const DEFAULT_PALETTE = ['#1F2937', '#374151', '#4B5563', '#6B7280', '#9CA3AF', '#7F1D1D', '#1E3A8A', '#065F46', '#92400E'];
const SKIN = ['#8D5524', '#C68642', '#E0AC69', '#F1C27D', '#5C3A21', '#A1665E'];

/**
 * People outside the analysed region: the crowd on the next platform, the
 * street beyond the camera's view, the festival ground. Also the people the
 * model holds outside the view — arrivals that could not get in, or that an
 * operator held at a junction or on a bridge — drawn where they wait.
 *
 * None of these are counted by the console, and they are drawn in muted
 * colours so they cannot be mistaken for the analysed crowd. Held figures
 * appear and disappear with the model's per-source queue.
 *
 * They stand still, so every figure is placed once per venue: one instanced
 * mesh for the ambient crowd and one per holding area, whose draw count
 * follows the held number. Nothing is rewritten or uploaded per frame.
 */
export default function SceneryCrowd() {
  const venue = useVenue();
  const forecast = useForecast();
  const visible = useVenueStore((state) => state.overlays.trajectories);

  const layout = useMemo(() => buildLayout(venue), [venue]);
  const held = forecast.held || {};
  const heldRef = useRef(held);
  heldRef.current = held;

  const material = useMemo(() => figureMaterial(), []);
  useEffect(() => () => material.dispose(), [material]);
  const geometries = useMemo(() => layout.groups.map((group) => groupGeometry(group.figures)), [layout]);
  useEffect(() => () => geometries.forEach(disposeFigureGeometry), [geometries]);

  const meshes = useRef([]);
  const setters = useMemo(
    () =>
      layout.groups.map((_, index) => (mesh) => {
        meshes.current[index] = mesh;
      }),
    [layout],
  );

  // Place every figure once; only the held groups' draw counts change later.
  useLayoutEffect(() => {
    layout.groups.forEach((group, index) => {
      const mesh = meshes.current[index];
      if (!mesh) return;
      const array = mesh.instanceMatrix.array;
      group.figures.forEach((figure, i) => {
        writeFigure(array, i * 16, figure.x, GROUND_Y + figure.y, figure.z, Math.cos(figure.heading), Math.sin(figure.heading), 0, 1, figure.build);
      });
      mesh.instanceMatrix.needsUpdate = true;
      mesh.boundingSphere = group.sphere;
      mesh.count = group.source ? 0 : group.figures.length;
    });
  }, [layout, geometries]);

  useFrame(() => {
    layout.groups.forEach((group, index) => {
      const mesh = meshes.current[index];
      if (!mesh || !group.source) return;
      mesh.count = Math.min(group.figures.length, Math.round(heldRef.current[group.source] || 0));
    });
  });

  return (
    <group visible={visible}>
      {layout.groups.map((group, index) => (
        <instancedMesh
          key={`${venue.id}-${index}`}
          ref={setters[index]}
          args={[geometries[index], material, Math.max(1, group.figures.length)]}
          dispose={null}
        />
      ))}

      {/* A fixed pool of labels, reused by whichever venue is active, so no
          HTML overlay is created or destroyed when the venue changes. */}
      {Array.from({ length: LABEL_SLOTS }, (_, slot) => {
        const group = layout.held[slot];
        const count = group ? held[group.source] || 0 : 0;
        return (
          <Html key={slot} position={group ? group.labelAt : [0, -50, 0]} center pointerEvents="none" zIndexRange={[9, 0]}>
            <div style={{ ...heldLabelStyle, display: visible && count >= 1 ? 'block' : 'none' }}>
              HELD OUTSIDE THE VIEW · {Math.round(count).toLocaleString()} · {group?.label}
              <span style={{ color: '#F59E0B' }}> SIMULATED</span>
            </div>
          </Html>
        );
      })}
    </group>
  );
}

/** The figure geometry for one group, carrying its muted colours. */
function groupGeometry(figures) {
  const size = Math.max(1, figures.length);
  const trousers = new Float32Array(size * 3);
  const clothes = new Float32Array(size * 3);
  const skin = new Float32Array(size * 3);
  figures.forEach((figure, i) => {
    figure.trouser.toArray(trousers, i * 3);
    figure.cloth.toArray(clothes, i * 3);
    figure.skin.toArray(skin, i * 3);
  });
  return figureGeometry(trousers, clothes, skin);
}

/** A sphere around a group's figures, so three can skip it when out of view. */
function boundingSphere(figures) {
  if (figures.length === 0) return new THREE.Sphere(new THREE.Vector3(0, -50, 0), 1);
  const box = new THREE.Box3();
  for (const figure of figures) {
    box.expandByPoint(new THREE.Vector3(figure.x, GROUND_Y + figure.y, figure.z));
    box.expandByPoint(new THREE.Vector3(figure.x, GROUND_Y + figure.y + 2, figure.z));
  }
  const sphere = box.getBoundingSphere(new THREE.Sphere());
  sphere.radius += 1;
  return sphere;
}

/** Deterministic positions and colours for every scenery figure of a venue. */
function buildLayout(venue) {
  const palette = venue.crowd?.palette || DEFAULT_PALETTE;
  const random = mulberry(hash(venue.id));
  const mutedColour = (hex, amount = MUTE) => new THREE.Color(hex).lerp(MUTED, amount);

  const figure = (x, z, y, heading) => ({
    x,
    z,
    y,
    heading,
    build: 0.9 + random() * 0.22,
    phase: random() * Math.PI * 2,
    cloth: mutedColour(palette[Math.floor(random() * palette.length)]),
    trouser: mutedColour(['#111827', '#1F2937', '#374151', '#4B5563'][Math.floor(random() * 4)], 0.3),
    skin: mutedColour(SKIN[Math.floor(random() * SKIN.length)], 0.25),
  });

  const ambient = [];
  for (const rect of venue.ambient || []) {
    for (let i = 0; i < rect.count; i += 1) {
      const x = rect.x + (random() - 0.5) * rect.w;
      const z = rect.z + (random() - 0.5) * rect.d;
      const y = rect.y ?? surfaceHeight(venue, x, z);
      const heading = rect.heading == null ? random() * Math.PI * 2 : rect.heading + (random() - 0.5) * (rect.spread ?? 0.8);
      ambient.push(figure(x, z, y, heading));
    }
  }

  // Holding areas fill as a queue from the edge nearest the venue backward.
  const held = Object.entries(venue.holding || {}).map(([source, rect]) => {
    const alongZ = rect.front === '+z' || rect.front === '-z';
    const across = alongZ ? rect.w : rect.d;
    const depth = alongZ ? rect.d : rect.w;
    const perRow = Math.max(1, Math.floor(across / QUEUE_SPACING));
    // Never draw a queue beyond its rectangle; the label carries the full number.
    const fits = perRow * Math.max(1, Math.floor(depth / QUEUE_SPACING));
    const cap = Math.min(HELD_CAP, rect.cap ?? HELD_CAP, fits);
    const sign = rect.front === '+z' || rect.front === '+x' ? 1 : -1;
    const frontEdge = alongZ ? rect.z + (sign * rect.d) / 2 : rect.x + (sign * rect.w) / 2;
    const figures = [];
    for (let i = 0; i < cap; i += 1) {
      const row = Math.floor(i / perRow);
      const col = i % perRow;
      const back = frontEdge - sign * (row + 0.5) * QUEUE_SPACING;
      const side = -across / 2 + (col + 0.5) * (across / perRow) + (random() - 0.5) * 0.25;
      const x = alongZ ? rect.x + side : back + (random() - 0.5) * 0.2;
      const z = alongZ ? back + (random() - 0.5) * 0.2 : rect.z + side;
      const y = rect.y ?? surfaceHeight(venue, x, z);
      const heading = (rect.heading ?? (alongZ ? (sign > 0 ? 0 : Math.PI) : sign > 0 ? Math.PI / 2 : -Math.PI / 2)) + (random() - 0.5) * 0.6;
      figures.push(figure(x, z, y, heading));
    }
    return {
      source,
      label: rect.label || source,
      figures,
      sphere: boundingSphere(figures),
      labelAt: [rect.x, GROUND_Y + (rect.y ?? 0) + 4, rect.z],
    };
  });

  const groups = [{ source: null, figures: ambient, sphere: boundingSphere(ambient) }, ...held];
  return { groups, held };
}

function hash(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

function mulberry(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const heldLabelStyle = {
  background: 'rgba(17, 24, 39, 0.88)',
  color: NEO.surface,
  border: `1px solid ${NEO.amber}`,
  padding: '3px 8px',
  fontFamily: MONO,
  fontSize: 10,
  fontWeight: 900,
  letterSpacing: '0.06em',
  whiteSpace: 'nowrap',
  borderRadius: 2,
};
