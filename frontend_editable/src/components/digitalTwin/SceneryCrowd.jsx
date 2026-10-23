import { useMemo, useRef, useLayoutEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { useVenueStore } from '../../store/useVenueStore';
import { useForecast, useVenue } from '../../store/derived';
import { surfaceHeight } from '../../data/venueModel';
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

const dummy = new THREE.Object3D();
const tint = new THREE.Color();

/**
 * People outside the analysed region: the crowd on the next platform, the
 * street beyond the camera's view, the festival ground. Also the people the
 * model holds outside the view — arrivals that could not get in, or that an
 * operator held at a junction or on a bridge — drawn where they wait.
 *
 * None of these are counted by the console, and they are drawn in muted
 * colours so they cannot be mistaken for the analysed crowd. Held figures
 * appear and disappear with the model's per-source queue.
 */
export default function SceneryCrowd() {
  const venue = useVenue();
  const forecast = useForecast();
  const visible = useVenueStore((state) => state.overlays.trajectories);
  const legsRef = useRef(null);
  const bodyRef = useRef(null);
  const headRef = useRef(null);

  const layout = useMemo(() => buildLayout(venue), [venue]);
  const held = forecast.held || {};

  useLayoutEffect(() => {
    for (const ref of [legsRef, bodyRef, headRef]) {
      if (!ref.current) continue;
      ref.current.frustumCulled = false;
      ref.current.count = 0;
    }
  }, [layout]);

  useFrame(({ clock }) => {
    const legs = legsRef.current;
    const body = bodyRef.current;
    const head = headRef.current;
    if (!legs || !body || !head || !visible) return;
    const time = clock.getElapsedTime();
    let cursor = 0;

    const draw = (figure) => {
      const sway = Math.sin(time * 1.3 + figure.phase) * 0.03;
      const base = GROUND_Y + figure.y;
      dummy.rotation.set(0, figure.heading, 0);
      dummy.scale.set(1, figure.build, 1);

      dummy.position.set(figure.x, base + 0.42 * figure.build, figure.z);
      dummy.updateMatrix();
      legs.setMatrixAt(cursor, dummy.matrix);
      legs.setColorAt(cursor, figure.trouser);

      dummy.rotation.set(sway, figure.heading, 0);
      dummy.position.set(figure.x, base + 1.12 * figure.build, figure.z);
      dummy.updateMatrix();
      body.setMatrixAt(cursor, dummy.matrix);
      body.setColorAt(cursor, figure.cloth);

      dummy.rotation.set(0, figure.heading, 0);
      dummy.scale.set(figure.build, figure.build, figure.build);
      dummy.position.set(figure.x, base + 1.63 * figure.build, figure.z);
      dummy.updateMatrix();
      head.setMatrixAt(cursor, dummy.matrix);
      head.setColorAt(cursor, figure.skin);
      cursor += 1;
    };

    for (const figure of layout.ambient) draw(figure);
    for (const group of layout.held) {
      const active = Math.min(group.figures.length, held[group.source] || 0);
      for (let i = 0; i < active; i += 1) draw(group.figures[i]);
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
      <instancedMesh ref={legsRef} args={[undefined, undefined, Math.max(1, layout.total)]}>
        <boxGeometry args={[0.3, 0.84, 0.22]} />
        <meshStandardMaterial roughness={0.95} />
      </instancedMesh>
      <instancedMesh ref={bodyRef} args={[undefined, undefined, Math.max(1, layout.total)]} castShadow>
        <capsuleGeometry args={[0.2, 0.46, 4, 8]} />
        <meshStandardMaterial roughness={0.9} />
      </instancedMesh>
      <instancedMesh ref={headRef} args={[undefined, undefined, Math.max(1, layout.total)]}>
        <sphereGeometry args={[0.13, 8, 8]} />
        <meshStandardMaterial roughness={0.8} />
      </instancedMesh>

      {/* A fixed pool of labels, reused by whichever venue is active, so no
          HTML overlay is created or destroyed when the venue changes. */}
      {Array.from({ length: LABEL_SLOTS }, (_, slot) => {
        const group = layout.held[slot];
        const count = group ? held[group.source] || 0 : 0;
        return (
          <Html key={slot} position={group ? group.labelAt : [0, -50, 0]} center pointerEvents="none" zIndexRange={[9, 0]}>
            <div style={{ ...heldLabelStyle, display: count >= 1 ? 'block' : 'none' }}>
              HELD OUTSIDE THE VIEW · {count.toLocaleString()} · {group?.label}
              <span style={{ color: '#F59E0B' }}> SIMULATED</span>
            </div>
          </Html>
        );
      })}
    </group>
  );
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
      labelAt: [rect.x, GROUND_Y + (rect.y ?? 0) + 4, rect.z],
    };
  });

  const total = ambient.length + held.reduce((sum, group) => sum + group.figures.length, 0);
  return { ambient, held, total };
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
