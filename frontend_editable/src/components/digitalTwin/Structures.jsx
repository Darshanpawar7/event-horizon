import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useVenue } from '../../store/derived';
import TextSprite from './TextSprite';
import { NEO } from '../../theme';
import { asphalt, ballast, concrete, facadeTextures, surfaceTexture, textTexture } from '../../lib/textures';

/** World height of the venue floor; every primitive sits on it. */
export const GROUND_Y = -0.6;

function surface(item, fallbackRoughness = 0.95) {
  const map = surfaceTexture(item.texture, item.repeat);
  return (
    <meshStandardMaterial
      color={item.color}
      map={map || null}
      roughness={item.roughness ?? fallbackRoughness}
      metalness={item.metalness ?? 0}
      emissive={item.emissive || '#000000'}
      emissiveIntensity={item.emissiveIntensity ?? 0}
    />
  );
}

/**
 * Perimeter geometry for the active venue: platforms, rails and trains; a
 * curved stadium stand and its floodlights; river water, pontoon bridges and
 * tents; alley buildings with lit windows and signs; a ramp, its tunnels and
 * a railway embankment. Each venue describes itself as a list of plain
 * primitives (see the `Structure` switch below), so a new reconstruction needs
 * data, not a new component.
 *
 * None of this is survey geometry. It is a schematic of the published
 * accounts, drawn so the zone grid can be read against recognisable features.
 */
export default function Structures() {
  const venue = useVenue();
  const night = venue.lighting?.mode === 'night';
  return (
    <group>
      {venue.structures.map((item, index) => (
        <Structure key={item.id || `${item.type}-${index}`} item={item} night={night} />
      ))}
      {venue.labels.map((label) => (
        <TextSprite key={label.text} text={label.text} position={[label.x, GROUND_Y + (label.y ?? 2), label.z]} height={label.size ?? 1.1} />
      ))}
    </group>
  );
}

function Structure({ item, night }) {
  switch (item.type) {
    case 'plane':
      return (
        <mesh rotation={[-Math.PI / 2, 0, item.rotationY ?? 0]} position={[item.x, GROUND_Y + (item.y ?? 0.01), item.z]} receiveShadow>
          <planeGeometry args={[item.w, item.d]} />
          {surface(item, 1)}
        </mesh>
      );

    case 'box':
      return (
        <mesh
          position={[item.x, GROUND_Y + (item.y ?? 0) + item.h / 2, item.z]}
          rotation={[item.rotationX ?? 0, item.rotationY ?? 0, item.rotationZ ?? 0]}
          castShadow={item.castShadow !== false}
          receiveShadow
        >
          <boxGeometry args={[item.w, item.h, item.d]} />
          {surface(item, 0.9)}
        </mesh>
      );

    case 'ramp': {
      const angle = Math.atan2(item.rise, item.length);
      const slant = Math.hypot(item.rise, item.length);
      const y = GROUND_Y + (item.y ?? 0) + item.rise / 2;
      const alongZ = item.axis !== 'x';
      return (
        <mesh
          position={[item.x, y, item.z]}
          rotation={alongZ ? [-item.dir * angle, 0, 0] : [0, 0, item.dir * angle]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={alongZ ? [item.w, 0.3, slant] : [slant, 0.3, item.w]} />
          {surface(item, 0.95)}
        </mesh>
      );
    }

    case 'stairs':
      return <Stairs item={item} />;
    case 'road':
      return <Road item={item} />;
    case 'rails':
      return <Rails item={item} />;
    case 'train':
      return <Train item={item} night={night} />;
    case 'building':
      return <Building item={item} night={night} />;
    case 'sign':
      return <Sign item={item} night={night} />;
    case 'lamp':
      return <Lamp item={item} night={night} />;
    case 'flood':
      return <Flood item={item} night={night} />;
    case 'barrier':
      return <Barrier item={item} />;
    case 'fence':
      return <Fence item={item} />;
    case 'vehicle':
      return <Vehicle item={item} night={night} />;
    case 'tent':
      return <Tent item={item} night={night} />;
    case 'pontoon':
      return <Pontoon item={item} />;
    case 'water':
      return <Water item={item} night={night} />;
    case 'tree':
      return <Tree item={item} />;
    case 'stand':
      return <Stand item={item} />;
    case 'container':
      return <Container item={item} />;
    case 'buoys':
      return <Buoys item={item} />;
    case 'flag':
      return <Flag item={item} />;
    case 'tower':
      return <Watchtower item={item} night={night} />;
    case 'stage':
      return <Stage item={item} night={night} />;
    case 'forest':
      return <Forest item={item} />;

    case 'pillar':
      return (
        <mesh position={[item.x, GROUND_Y + item.h / 2, item.z]} castShadow>
          <cylinderGeometry args={[item.r ?? 0.3, item.r ?? 0.3, item.h, 12]} />
          <meshStandardMaterial color={item.color || '#6B7079'} roughness={0.8} metalness={0.2} />
        </mesh>
      );

    case 'canopy':
      return (
        <group>
          <mesh position={[item.x, GROUND_Y + item.y, item.z]} castShadow={!item.opacity} receiveShadow>
            <boxGeometry args={[item.w, 0.3, item.d]} />
            <meshStandardMaterial
              color={item.color || '#8C8F94'}
              roughness={0.7}
              metalness={0.3}
              transparent={Boolean(item.opacity)}
              opacity={item.opacity ?? 1}
              depthWrite={!item.opacity}
            />
          </mesh>
          {/* Roof purlins, so a translucent roof still reads as a structure */}
          {item.opacity &&
            Array.from({ length: Math.max(2, Math.round(item.d / 6)) + 1 }, (_, i) => (
              <mesh key={`purlin-${i}`} position={[item.x, GROUND_Y + item.y - 0.05, item.z - item.d / 2 + (i * item.d) / Math.max(2, Math.round(item.d / 6))]}>
                <boxGeometry args={[item.w, 0.12, 0.12]} />
                <meshStandardMaterial color="#4B5563" metalness={0.6} roughness={0.4} />
              </mesh>
            ))}
          {(item.columns || []).map(([cx, cz]) => (
            <mesh key={`${cx}-${cz}`} position={[cx, GROUND_Y + item.y / 2, cz]} castShadow>
              <cylinderGeometry args={[0.18, 0.22, item.y, 10]} />
              <meshStandardMaterial color="#5B5F66" roughness={0.6} metalness={0.4} />
            </mesh>
          ))}
          {(item.lights || []).map(([lx, lz]) => (
            <group key={`l-${lx}-${lz}`}>
              <mesh position={[lx, GROUND_Y + item.y - 0.25, lz]}>
                <boxGeometry args={[1.2, 0.1, 0.3]} />
                <meshStandardMaterial color="#FFF7D6" emissive="#FFF2C2" emissiveIntensity={night ? 3 : 0.2} />
              </mesh>
              {night && (
                <pointLight
                  position={[lx, GROUND_Y + item.y - 0.6, lz]}
                  color="#FFF0C9"
                  intensity={item.lightIntensity ?? 60}
                  distance={22}
                  decay={2}
                />
              )}
            </group>
          ))}
        </group>
      );

    case 'kiosk': {
      const height = 2.4 * item.scale;
      return (
        <group position={[item.x, height / 2 + GROUND_Y, item.z]}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[2.6, height, 2.6]} />
            <meshStandardMaterial color={NEO.surface} roughness={0.9} metalness={0} />
          </mesh>
          <mesh position={[0, height / 2 + 0.15, 0]} castShadow>
            <boxGeometry args={[2.9, 0.3, 2.9]} />
            <meshStandardMaterial color={item.z >= 0 ? NEO.roofSouth : NEO.roofNorth} roughness={0.9} />
          </mesh>
        </group>
      );
    }

    default:
      return null;
  }
}

// ---------------------------------------------------------------------------

/** A flight of steps: `steps` boxes rising `rise` over `run`, toward +z (dir 1) or -z (dir -1). */
function Stairs({ item }) {
  const steps = item.steps ?? 12;
  const treadDepth = item.run / steps;
  const riser = item.rise / steps;
  return (
    <group position={[item.x, GROUND_Y + (item.y ?? 0), item.z]} rotation={[0, item.rotationY ?? 0, 0]}>
      {Array.from({ length: steps }, (_, i) => (
        <mesh key={i} position={[0, riser * (i + 0.5), item.dir * (treadDepth * (i + 0.5) - item.run / 2)]} castShadow receiveShadow>
          <boxGeometry args={[item.w, riser, treadDepth]} />
          <meshStandardMaterial color={item.color || '#8E9299'} roughness={0.9} />
        </mesh>
      ))}
      {[-item.w / 2 - 0.05, item.w / 2 + 0.05].map((x) => (
        <mesh key={x} position={[x, item.rise / 2 + 0.95, 0]} rotation={[item.dir * Math.atan2(item.rise, item.run), 0, 0]} castShadow>
          <boxGeometry args={[0.06, 0.06, Math.hypot(item.rise, item.run)]} />
          <meshStandardMaterial color="#C0C4C9" metalness={0.8} roughness={0.3} />
        </mesh>
      ))}
      {/* Side walls (stringers) carrying the flight */}
      {item.parapet &&
        [-item.w / 2 - 0.12, item.w / 2 + 0.12].map((x) => (
          <mesh
            key={`p-${x}`}
            position={[x, item.rise / 2 + 0.2, 0]}
            rotation={[item.dir * Math.atan2(item.rise, item.run), 0, 0]}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[0.2, 1.2, Math.hypot(item.rise, item.run)]} />
            <meshStandardMaterial color={item.parapetColor || '#9A9EA5'} roughness={0.9} />
          </mesh>
        ))}
    </group>
  );
}

/** Asphalt with edge lines, a dashed centre line and an optional crossing. */
function Road({ item }) {
  const dashes = useMemo(() => {
    const marks = [];
    for (let z = -item.d / 2 + 2; z < item.d / 2 - 1; z += 4) marks.push(z);
    return marks;
  }, [item.d]);
  return (
    <group position={[item.x, GROUND_Y, item.z]} rotation={[0, item.rotationY ?? 0, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]} receiveShadow>
        <planeGeometry args={[item.w, item.d]} />
        <meshStandardMaterial map={asphalt([item.w / 6, item.d / 6])} color="#9A9DA2" roughness={1} />
      </mesh>
      {[-item.w / 2 + 0.3, item.w / 2 - 0.3].map((x) => (
        <mesh key={x} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.018, 0]}>
          <planeGeometry args={[0.16, item.d]} />
          <meshBasicMaterial color="#E5E7EB" />
        </mesh>
      ))}
      {item.centre !== false &&
        dashes.map((z) => (
          <mesh key={z} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.018, z]}>
            <planeGeometry args={[0.16, 2]} />
            <meshBasicMaterial color="#E5E7EB" />
          </mesh>
        ))}
      {item.crossing != null &&
        Array.from({ length: Math.floor(item.w / 1.2) }, (_, i) => (
          <mesh key={`c-${i}`} rotation={[-Math.PI / 2, 0, 0]} position={[-item.w / 2 + 0.9 + i * 1.2, 0.02, item.crossing]}>
            <planeGeometry args={[0.6, 3]} />
            <meshBasicMaterial color="#F3F4F6" />
          </mesh>
        ))}
    </group>
  );
}

/** Twin rails on sleepers over ballast, running along z. */
function Rails({ item }) {
  const sleepers = useMemo(() => {
    const list = [];
    for (let z = -item.length / 2; z <= item.length / 2; z += 0.7) list.push(z);
    return list;
  }, [item.length]);
  return (
    <group position={[item.x, GROUND_Y + (item.y ?? 0), item.z]} rotation={[0, item.rotationY ?? 0, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
        <planeGeometry args={[3.4, item.length]} />
        <meshStandardMaterial map={ballast([1, item.length / 6])} color="#8A8886" roughness={1} />
      </mesh>
      {sleepers.map((z) => (
        <mesh key={z} position={[0, 0.06, z]} receiveShadow>
          <boxGeometry args={[2.5, 0.12, 0.26]} />
          <meshStandardMaterial color="#4A3B2E" roughness={0.95} />
        </mesh>
      ))}
      {[-0.72, 0.72].map((x) => (
        <mesh key={x} position={[x, 0.2, 0]} castShadow>
          <boxGeometry args={[0.08, 0.16, item.length]} />
          <meshStandardMaterial color="#B7BCC2" metalness={0.9} roughness={0.25} />
        </mesh>
      ))}
    </group>
  );
}

/** A standing passenger train: coaches with lit windows, doors and bogies. */
function Train({ item, night }) {
  const coaches = Math.max(1, Math.round(item.length / 22));
  const coachLength = item.length / coaches - 0.6;
  return (
    <group position={[item.x, GROUND_Y + (item.y ?? 0), item.z]} rotation={[0, item.rotationY ?? 0, 0]}>
      {Array.from({ length: coaches }, (_, i) => {
        const z = -item.length / 2 + (i + 0.5) * (item.length / coaches);
        return (
          <group key={i} position={[0, 0, z]}>
            <mesh position={[0, 2.35, 0]} castShadow>
              <boxGeometry args={[3.1, 3.3, coachLength]} />
              <meshStandardMaterial color={item.color} roughness={0.55} metalness={0.25} />
            </mesh>
            {[-1.57, 1.57].map((x) => (
              <mesh key={x} position={[x, 2.75, 0]}>
                <boxGeometry args={[0.02, 0.7, coachLength - 1.2]} />
                <meshStandardMaterial
                  color="#9FB4C7"
                  emissive="#FFE9B8"
                  emissiveIntensity={night && item.lit !== false ? 1.4 : 0.05}
                  roughness={0.2}
                  metalness={0.6}
                />
              </mesh>
            ))}
            {[-coachLength / 2 + 1.2, coachLength / 2 - 1.2].flatMap((dz) =>
              [-1.56, 1.56].map((x) => (
                <mesh key={`${dz}-${x}`} position={[x, 1.9, dz]}>
                  <boxGeometry args={[0.03, 2.4, 1.3]} />
                  <meshStandardMaterial color="#2F3A47" roughness={0.6} />
                </mesh>
              )),
            )}
            <mesh position={[0, 4.1, 0]}>
              <boxGeometry args={[2.9, 0.25, coachLength]} />
              <meshStandardMaterial color="#D1D5DB" roughness={0.8} />
            </mesh>
            {[-coachLength / 2 + 3, coachLength / 2 - 3].map((dz) => (
              <mesh key={dz} position={[0, 0.4, dz]}>
                <boxGeometry args={[2.4, 0.8, 2.6]} />
                <meshStandardMaterial color="#1F2328" roughness={0.9} />
              </mesh>
            ))}
          </group>
        );
      })}
    </group>
  );
}

/** A building block with a window grid; windows glow at night. */
function Building({ item, night }) {
  const { map, emissiveMap } = facadeTextures({
    wall: item.wall,
    cols: item.cols ?? Math.max(2, Math.round(item.w / 3)),
    rows: item.rows ?? Math.max(1, Math.round(item.h / 3)),
    lit: item.lit ?? 0.55,
    glow: item.glow || '#FFE9B8',
    seed: item.seed ?? 7,
  });
  return (
    <group position={[item.x, GROUND_Y + (item.y ?? 0), item.z]} rotation={[0, item.rotationY ?? 0, 0]}>
      <mesh position={[0, item.h / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[item.w, item.h, item.d]} />
        <meshStandardMaterial
          map={map}
          emissiveMap={emissiveMap}
          emissive={night ? '#FFFFFF' : '#000000'}
          emissiveIntensity={night ? 1.3 : 0}
          roughness={0.85}
        />
      </mesh>
      <mesh position={[0, item.h + 0.2, 0]} castShadow>
        <boxGeometry args={[item.w + 0.3, 0.4, item.d + 0.3]} />
        <meshStandardMaterial color={item.roof || '#4B5563'} roughness={0.9} />
      </mesh>
    </group>
  );
}

/** A signboard plate with text, lit from within at night unless `emissive: false`. */
function Sign({ item, night }) {
  const texture = textTexture(item.text, {
    background: item.background || '#1F2937',
    color: item.color || '#F9FAFB',
    width: Math.min(4096, Math.round(512 * Math.max(1, item.w / item.h))),
    height: 512,
    font: `bold ${Math.round(512 * 0.45)}px Arial, 'Nirmala UI', sans-serif`,
    border: item.border || null,
  });
  const lit = night && item.emissive !== false;
  return (
    <mesh position={[item.x, GROUND_Y + item.y, item.z]} rotation={[0, item.rotationY ?? 0, 0]} castShadow>
      <boxGeometry args={[item.w, item.h, 0.08]} />
      <meshStandardMaterial
        map={texture}
        emissiveMap={texture}
        emissive={lit ? '#FFFFFF' : '#000000'}
        emissiveIntensity={lit ? 1.6 : 0}
        roughness={0.5}
      />
    </mesh>
  );
}

/** A street lamp: pole, arm, luminaire; the light itself only at night. */
function Lamp({ item, night }) {
  const h = item.height ?? 7;
  const colour = item.color || '#FFE4B5';
  return (
    <group position={[item.x, GROUND_Y + (item.y ?? 0), item.z]} rotation={[0, item.rotationY ?? 0, 0]}>
      <mesh position={[0, h / 2, 0]} castShadow>
        <cylinderGeometry args={[0.08, 0.14, h, 10]} />
        <meshStandardMaterial color="#4B5563" metalness={0.7} roughness={0.4} />
      </mesh>
      <mesh position={[0.7, h - 0.1, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.05, 0.05, 1.4, 8]} />
        <meshStandardMaterial color="#4B5563" metalness={0.7} roughness={0.4} />
      </mesh>
      <mesh position={[1.4, h - 0.2, 0]}>
        <boxGeometry args={[0.9, 0.2, 0.4]} />
        <meshStandardMaterial color={colour} emissive={colour} emissiveIntensity={night ? 4 : 0.2} />
      </mesh>
      {night && (
        <pointLight position={[1.4, h - 0.6, 0]} color={colour} intensity={item.intensity ?? 120} distance={item.distance ?? 30} decay={2} />
      )}
    </group>
  );
}

/** A floodlight tower aimed at a point on the ground. */
function Flood({ item, night }) {
  const h = item.height ?? 18;
  const targetRef = useRef(null);
  const lightRef = useRef(null);
  useFrame(() => {
    if (lightRef.current && targetRef.current && lightRef.current.target !== targetRef.current) {
      lightRef.current.target = targetRef.current;
    }
  });
  const colour = item.color || '#FFF4DC';
  return (
    <group position={[item.x, GROUND_Y, item.z]}>
      <mesh position={[0, h / 2, 0]} castShadow>
        <cylinderGeometry args={[0.25, 0.5, h, 8]} />
        <meshStandardMaterial color="#6B7079" metalness={0.6} roughness={0.5} />
      </mesh>
      <mesh position={[0, h + 0.6, 0]} castShadow>
        <boxGeometry args={[3.2, 1.4, 0.6]} />
        <meshStandardMaterial color="#2F3A47" roughness={0.7} />
      </mesh>
      {[-1.1, 0, 1.1].map((x) => (
        <mesh key={x} position={[x, h + 0.6, 0.35]}>
          <circleGeometry args={[0.42, 16]} />
          <meshStandardMaterial color={colour} emissive={colour} emissiveIntensity={night ? 6 : 0.4} />
        </mesh>
      ))}
      <object3D ref={targetRef} position={[item.target[0] - item.x, -GROUND_Y, item.target[1] - item.z]} />
      {night && (
        <spotLight
          ref={lightRef}
          position={[0, h + 0.6, 0.4]}
          color={colour}
          intensity={item.intensity ?? 2600}
          angle={item.angle ?? 0.55}
          penumbra={0.5}
          distance={item.distance ?? 120}
          decay={2}
        />
      )}
    </group>
  );
}

/** A line of steel crowd-control barriers: rails, legs and a grille panel per section. */
function Barrier({ item }) {
  const count = Math.max(1, Math.round(item.length / 2.2));
  const colour = item.color || '#D1D5DB';
  const section = item.length / count;
  return (
    <group position={[item.x, GROUND_Y + (item.y ?? 0), item.z]} rotation={[0, item.rotationY ?? 0, 0]}>
      {Array.from({ length: count }, (_, i) => {
        const x = -item.length / 2 + (i + 0.5) * section;
        return (
          <group key={i} position={[x, 0, 0]}>
            <mesh position={[0, 1.05, 0]} castShadow>
              <boxGeometry args={[section - 0.1, 0.06, 0.06]} />
              <meshStandardMaterial color={colour} metalness={0.7} roughness={0.35} />
            </mesh>
            <mesh position={[0, 0.25, 0]}>
              <boxGeometry args={[section - 0.1, 0.05, 0.05]} />
              <meshStandardMaterial color={colour} metalness={0.7} roughness={0.35} />
            </mesh>
            <mesh position={[0, 0.65, 0]}>
              <boxGeometry args={[section - 0.2, 0.75, 0.02]} />
              <meshStandardMaterial color={colour} metalness={0.6} roughness={0.4} transparent opacity={0.45} />
            </mesh>
            {[-section / 2 + 0.08, section / 2 - 0.08].map((px) => (
              <mesh key={px} position={[px, 0.53, 0]} castShadow>
                <boxGeometry args={[0.06, 1.06, 0.5]} />
                <meshStandardMaterial color={colour} metalness={0.7} roughness={0.35} />
              </mesh>
            ))}
          </group>
        );
      })}
    </group>
  );
}

/** Posts and rails with a translucent mesh panel. */
function Fence({ item }) {
  const h = item.height ?? 2.2;
  const posts = Math.max(2, Math.round(item.length / 2.5) + 1);
  return (
    <group position={[item.x, GROUND_Y + (item.y ?? 0), item.z]} rotation={[0, item.rotationY ?? 0, 0]}>
      {Array.from({ length: posts }, (_, i) => (
        <mesh key={i} position={[-item.length / 2 + (i * item.length) / (posts - 1), h / 2, 0]} castShadow>
          <boxGeometry args={[0.08, h, 0.08]} />
          <meshStandardMaterial color="#6B7280" metalness={0.6} roughness={0.5} />
        </mesh>
      ))}
      {[h - 0.05, h * 0.5].map((y) => (
        <mesh key={y} position={[0, y, 0]}>
          <boxGeometry args={[item.length, 0.05, 0.05]} />
          <meshStandardMaterial color="#9CA3AF" metalness={0.6} roughness={0.5} />
        </mesh>
      ))}
      <mesh position={[0, h / 2, 0]}>
        <planeGeometry args={[item.length, h]} />
        <meshStandardMaterial color="#9CA3AF" transparent opacity={0.22} side={THREE.DoubleSide} roughness={0.9} />
      </mesh>
    </group>
  );
}

/** A bus, van or police vehicle as a simple body with wheels and lights. */
function Vehicle({ item, night }) {
  const kind = item.kind || 'van';
  const size = kind === 'bus' ? [2.6, 3.2, 11] : [2.1, 2.3, 5.2];
  const colour = item.color || (kind === 'police' ? '#F3F4F6' : '#C0392B');
  return (
    <group position={[item.x, GROUND_Y + (item.y ?? 0), item.z]} rotation={[0, item.rotationY ?? 0, 0]}>
      <mesh position={[0, size[1] / 2 + 0.35, 0]} castShadow>
        <boxGeometry args={size} />
        <meshStandardMaterial color={colour} roughness={0.4} metalness={0.3} />
      </mesh>
      <mesh position={[0, size[1] * 0.68 + 0.35, 0]}>
        <boxGeometry args={[size[0] + 0.02, size[1] * 0.3, size[2] - 0.8]} />
        <meshStandardMaterial color="#1F2937" roughness={0.2} metalness={0.6} emissive="#5B7DA8" emissiveIntensity={night ? 0.5 : 0} />
      </mesh>
      {[-size[2] / 2 + 1, size[2] / 2 - 1].flatMap((z) =>
        [-size[0] / 2, size[0] / 2].map((x) => (
          <mesh key={`${x}-${z}`} position={[x, 0.45, z]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.45, 0.45, 0.3, 14]} />
            <meshStandardMaterial color="#111827" roughness={0.9} />
          </mesh>
        )),
      )}
      {kind === 'police' && (
        <mesh position={[0, size[1] + 0.5, 0]}>
          <boxGeometry args={[1.2, 0.25, 0.4]} />
          <meshStandardMaterial color="#60A5FA" emissive="#3B82F6" emissiveIntensity={night ? 4 : 0.8} />
        </mesh>
      )}
    </group>
  );
}

/** A festival or camp tent: walls, pitched roof and a flag. */
function Tent({ item, night }) {
  const h = item.h ?? 2.6;
  const roofH = item.roofH ?? 1.4;
  return (
    <group position={[item.x, GROUND_Y + (item.y ?? 0), item.z]} rotation={[0, item.rotationY ?? 0, 0]}>
      <mesh position={[0, h / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[item.w, h, item.d]} />
        <meshStandardMaterial
          color={item.color || '#F3EFE4'}
          roughness={0.95}
          emissive={item.color || '#F3EFE4'}
          emissiveIntensity={night ? 0.25 : 0}
        />
      </mesh>
      <mesh position={[0, h + roofH / 2, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <coneGeometry args={[Math.hypot(item.w, item.d) / 2 + 0.2, roofH, 4]} />
        <meshStandardMaterial color={item.roof || '#D97706'} roughness={0.9} />
      </mesh>
      {item.flag && (
        <>
          <mesh position={[0, h + roofH + 1, 0]}>
            <cylinderGeometry args={[0.03, 0.03, 2, 6]} />
            <meshStandardMaterial color="#374151" />
          </mesh>
          <mesh position={[0.45, h + roofH + 1.7, 0]}>
            <planeGeometry args={[0.9, 0.5]} />
            <meshStandardMaterial color={item.flag} side={THREE.DoubleSide} />
          </mesh>
        </>
      )}
    </group>
  );
}

/** A pontoon bridge: barrels under a plank deck with rope posts. */
function Pontoon({ item }) {
  const width = item.w ?? 4;
  const barrels = Math.max(2, Math.round(item.length / 3));
  return (
    <group position={[item.x, GROUND_Y, item.z]} rotation={[0, item.rotationY ?? 0, 0]}>
      <mesh position={[0, 0.55, 0]} castShadow receiveShadow>
        <boxGeometry args={[item.length, 0.18, width]} />
        <meshStandardMaterial color="#8B6F47" roughness={0.95} />
      </mesh>
      {Array.from({ length: barrels }, (_, i) => (
        <mesh key={i} position={[-item.length / 2 + (i + 0.5) * (item.length / barrels), 0.1, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.6, 0.6, width - 0.4, 12]} />
          <meshStandardMaterial color="#374151" metalness={0.5} roughness={0.5} />
        </mesh>
      ))}
      {Array.from({ length: barrels + 1 }, (_, i) =>
        [-width / 2 + 0.15, width / 2 - 0.15].map((z) => (
          <mesh key={`${i}-${z}`} position={[-item.length / 2 + i * (item.length / barrels), 1.1, z]}>
            <cylinderGeometry args={[0.04, 0.04, 1.0, 6]} />
            <meshStandardMaterial color="#D1D5DB" />
          </mesh>
        )),
      )}
    </group>
  );
}

/** Slowly moving water with a sky-tinted sheen. */
function Water({ item, night }) {
  const materialRef = useRef(null);
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uColor: { value: new THREE.Color(item.color) },
      uSky: { value: new THREE.Color(night ? '#1B2740' : '#DCEBFA') },
      uNight: { value: night ? 1 : 0 },
    }),
    [item.color, night],
  );
  useFrame((_, delta) => {
    if (materialRef.current) materialRef.current.uniforms.uTime.value += delta;
  });
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[item.x, GROUND_Y + (item.y ?? -0.02), item.z]} receiveShadow>
      <planeGeometry args={[item.w, item.d, 48, 48]} />
      <shaderMaterial
        ref={materialRef}
        uniforms={uniforms}
        transparent
        vertexShader={`
          uniform float uTime;
          varying vec3 vWorld;
          varying float vWave;
          void main() {
            vec3 p = position;
            float w = sin(p.x * 0.35 + uTime * 0.8) * 0.08 + cos(p.y * 0.27 - uTime * 0.6) * 0.06;
            p.z += w;
            vWave = w;
            vec4 world = modelMatrix * vec4(p, 1.0);
            vWorld = world.xyz;
            gl_Position = projectionMatrix * viewMatrix * world;
          }
        `}
        fragmentShader={`
          uniform vec3 uColor;
          uniform vec3 uSky;
          uniform float uNight;
          uniform float uTime;
          varying vec3 vWorld;
          varying float vWave;
          void main() {
            vec3 toCamera = normalize(cameraPosition - vWorld);
            float fresnel = pow(1.0 - max(dot(toCamera, vec3(0.0, 1.0, 0.0)), 0.0), 2.2);
            float ripple = 0.5 + 0.5 * sin((vWorld.x + vWorld.z) * 1.6 + uTime * 1.4 + vWave * 20.0);
            vec3 base = mix(uColor, uSky, fresnel * 0.7);
            base += ripple * (uNight > 0.5 ? 0.02 : 0.05);
            gl_FragColor = vec4(base, 0.94);
          }
        `}
      />
    </mesh>
  );
}

/** A tree with a clustered canopy, rather than one sphere. */
export function Tree({ item }) {
  const s = item.scale ?? 1;
  return (
    <group position={[item.x, GROUND_Y + (item.y ?? 0), item.z]} scale={[s, s, s]}>
      <mesh position={[0, 1.1, 0]} castShadow>
        <cylinderGeometry args={[0.12, 0.18, 2.2, 8]} />
        <meshStandardMaterial color="#4A3728" roughness={0.95} />
      </mesh>
      {[
        [0, 3.0, 0, 1.4],
        [0.7, 2.6, 0.3, 1.0],
        [-0.6, 2.7, -0.4, 1.0],
        [0.1, 2.4, 0.8, 0.9],
      ].map(([x, y, z, r], i) => (
        <mesh key={i} position={[x, y, z]} castShadow>
          <sphereGeometry args={[r, 10, 10]} />
          <meshStandardMaterial color={item.color || (i % 2 ? '#3E7A3A' : '#4F8F45')} roughness={1} />
        </mesh>
      ))}
    </group>
  );
}

/** A curved stadium stand: outer wall, tiers of seating, roof. */
function Stand({ item }) {
  const tiers = item.tiers ?? 4;
  const tierH = item.height / tiers;
  const inner = item.radius;
  return (
    <group position={[item.x, GROUND_Y, item.z]}>
      <mesh position={[0, item.height / 2, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[inner + item.depth, inner + item.depth, item.height, 48, 1, true, item.thetaStart, item.thetaLength]} />
        <meshStandardMaterial map={concrete([6, 2])} color="#C9C4BA" side={THREE.DoubleSide} roughness={0.95} />
      </mesh>
      {Array.from({ length: tiers }, (_, i) => {
        const r = inner + (item.depth * (i + 1)) / tiers;
        return (
          <mesh key={i} position={[0, tierH * (i + 0.5) + item.height * 0.15, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[r, r, tierH, 48, 1, true, item.thetaStart, item.thetaLength]} />
            <meshStandardMaterial color={i % 2 ? item.seatA || '#B91C1C' : item.seatB || '#7F1D1D'} side={THREE.DoubleSide} roughness={0.9} />
          </mesh>
        );
      })}
      <mesh position={[0, item.height + 0.6, 0]} rotation={[-Math.PI / 2, 0, 0]} castShadow>
        <ringGeometry args={[inner - 2, inner + item.depth + 1.5, 48, 1, item.thetaStart, item.thetaLength]} />
        <meshStandardMaterial color="#6B7079" side={THREE.DoubleSide} roughness={0.6} metalness={0.4} />
      </mesh>
    </group>
  );
}

/** A shipping container with corrugation lines. */
function Container({ item }) {
  return (
    <group position={[item.x, GROUND_Y + (item.y ?? 0), item.z]} rotation={[0, item.rotationY ?? 0, 0]}>
      <mesh position={[0, 1.3, 0]} castShadow receiveShadow>
        <boxGeometry args={[6, 2.6, 2.4]} />
        <meshStandardMaterial color={item.color} roughness={0.7} metalness={0.4} />
      </mesh>
      {Array.from({ length: 11 }, (_, i) => (
        <mesh key={i} position={[-2.5 + i * 0.5, 1.3, 1.21]}>
          <boxGeometry args={[0.08, 2.4, 0.04]} />
          <meshStandardMaterial color="#111827" roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
}

/** A row of orange floats on a rope, marking the edge of a bathing area. */
function Buoys({ item }) {
  const count = Math.max(2, Math.round(item.length / 1.6));
  return (
    <group position={[item.x, GROUND_Y + (item.y ?? -0.1), item.z]} rotation={[0, item.rotationY ?? 0, 0]}>
      <mesh position={[0, 0.12, 0]}>
        <boxGeometry args={[item.length, 0.03, 0.03]} />
        <meshStandardMaterial color="#E5E7EB" roughness={0.8} />
      </mesh>
      {Array.from({ length: count }, (_, i) => (
        <mesh key={i} position={[-item.length / 2 + (i * item.length) / (count - 1), 0.12, 0]} castShadow>
          <sphereGeometry args={[0.22, 10, 10]} />
          <meshStandardMaterial color={item.color || '#F97316'} roughness={0.5} emissive={item.color || '#F97316'} emissiveIntensity={0.15} />
        </mesh>
      ))}
    </group>
  );
}

/** A pole with a cloth flag that ripples. */
function Flag({ item }) {
  const clothRef = useRef(null);
  const h = item.height ?? 6;
  useFrame(({ clock }) => {
    if (!clothRef.current) return;
    const time = clock.getElapsedTime() + item.x * 0.3;
    clothRef.current.rotation.y = Math.sin(time * 2.2) * 0.25;
    clothRef.current.scale.x = 1 + Math.sin(time * 3.1) * 0.06;
  });
  return (
    <group position={[item.x, GROUND_Y + (item.y ?? 0), item.z]} rotation={[0, item.rotationY ?? 0, 0]}>
      <mesh position={[0, h / 2, 0]} castShadow>
        <cylinderGeometry args={[0.04, 0.05, h, 6]} />
        <meshStandardMaterial color="#6B5B45" roughness={0.9} />
      </mesh>
      <group ref={clothRef} position={[0, h - 0.5, 0]}>
        <mesh position={[0.7, 0, 0]} castShadow>
          <planeGeometry args={[1.4, 0.9]} />
          <meshStandardMaterial color={item.color || '#F97316'} side={THREE.DoubleSide} roughness={0.9} />
        </mesh>
      </group>
    </group>
  );
}

/** A police watchtower: four legs, a cabin and a searchlight that is lit at night. */
function Watchtower({ item, night }) {
  const h = item.height ?? 8;
  return (
    <group position={[item.x, GROUND_Y + (item.y ?? 0), item.z]} rotation={[0, item.rotationY ?? 0, 0]}>
      {[
        [-1, -1],
        [1, -1],
        [-1, 1],
        [1, 1],
      ].map(([sx, sz]) => (
        <mesh key={`${sx}${sz}`} position={[sx * 0.9, h / 2, sz * 0.9]} castShadow>
          <boxGeometry args={[0.12, h, 0.12]} />
          <meshStandardMaterial color="#4B5563" metalness={0.5} roughness={0.6} />
        </mesh>
      ))}
      <mesh position={[0, h + 1, 0]} castShadow>
        <boxGeometry args={[2.6, 2, 2.6]} />
        <meshStandardMaterial color={item.color || '#E5E7EB'} roughness={0.8} />
      </mesh>
      <mesh position={[0, h + 1.15, 1.31]}>
        <planeGeometry args={[2.0, 0.8]} />
        <meshStandardMaterial color="#1F2937" emissive="#FDE68A" emissiveIntensity={night ? 0.8 : 0} />
      </mesh>
      <mesh position={[0, h + 2.15, 0]} castShadow>
        <boxGeometry args={[3, 0.3, 3]} />
        <meshStandardMaterial color="#374151" roughness={0.8} />
      </mesh>
      {night && <pointLight position={[0, h + 3, 0]} color="#F5F7FF" intensity={item.intensity ?? 260} distance={45} decay={2} />}
    </group>
  );
}

/** A festival stage: deck, truss roof, speaker stacks and coloured wash lights. */
function Stage({ item, night }) {
  return (
    <group position={[item.x, GROUND_Y + (item.y ?? 0), item.z]} rotation={[0, item.rotationY ?? 0, 0]}>
      <mesh position={[0, 0.8, 0]} castShadow receiveShadow>
        <boxGeometry args={[item.w, 1.6, item.d]} />
        <meshStandardMaterial color="#1F2937" roughness={0.8} />
      </mesh>
      {[
        [-item.w / 2, -item.d / 2],
        [item.w / 2, -item.d / 2],
        [-item.w / 2, item.d / 2],
        [item.w / 2, item.d / 2],
      ].map(([px, pz]) => (
        <mesh key={`${px}${pz}`} position={[px, 5, pz]} castShadow>
          <boxGeometry args={[0.4, 8, 0.4]} />
          <meshStandardMaterial color="#9CA3AF" metalness={0.8} roughness={0.3} />
        </mesh>
      ))}
      <mesh position={[0, 9, 0]} castShadow>
        <boxGeometry args={[item.w + 0.4, 0.5, item.d + 0.4]} />
        <meshStandardMaterial color="#6B7280" metalness={0.8} roughness={0.35} />
      </mesh>
      {[-item.w / 2 - 1.2, item.w / 2 + 1.2].map((px) => (
        <mesh key={px} position={[px, 3, item.d / 2 - 0.6]} castShadow>
          <boxGeometry args={[1.6, 6, 1.4]} />
          <meshStandardMaterial color="#111827" roughness={0.7} />
        </mesh>
      ))}
      {(item.washes || ['#EC4899', '#22D3EE', '#A3E635']).map((colour, i, list) => (
        <mesh key={colour} position={[-item.w / 2 + ((i + 0.5) * item.w) / list.length, 8.6, item.d / 2]}>
          <boxGeometry args={[0.6, 0.4, 0.4]} />
          <meshStandardMaterial color={colour} emissive={colour} emissiveIntensity={night ? 5 : 1.5} />
        </mesh>
      ))}
    </group>
  );
}

/**
 * Many trees in two draw calls: instanced trunks and instanced crown spheres.
 * `trees` is a list of [x, z, scale].
 */
function Forest({ item }) {
  const trunkRef = useRef(null);
  const crownRef = useRef(null);
  const crowns = useMemo(
    () =>
      item.trees.flatMap(([x, z, s]) => [
        [x, z, s, 0, 3.0, 0, 1.4, '#4F8F45'],
        [x, z, s, 0.7, 2.6, 0.3, 1.0, '#3E7A3A'],
        [x, z, s, -0.6, 2.7, -0.4, 1.0, '#467F3E'],
        [x, z, s, 0.1, 2.4, 0.8, 0.9, '#3A6F35'],
      ]),
    [item.trees],
  );

  useLayoutEffect(() => {
    const dummy = new THREE.Object3D();
    const colour = new THREE.Color();
    const base = GROUND_Y + (item.y ?? 0);
    if (trunkRef.current) {
      item.trees.forEach(([x, z, s], i) => {
        dummy.position.set(x, base + 1.1 * s, z);
        dummy.scale.set(s, s, s);
        dummy.updateMatrix();
        trunkRef.current.setMatrixAt(i, dummy.matrix);
      });
      trunkRef.current.instanceMatrix.needsUpdate = true;
    }
    if (crownRef.current) {
      crowns.forEach(([x, z, s, dx, dy, dz, r, c], i) => {
        dummy.position.set(x + dx * s, base + dy * s, z + dz * s);
        dummy.scale.setScalar(r * s);
        dummy.updateMatrix();
        crownRef.current.setMatrixAt(i, dummy.matrix);
        crownRef.current.setColorAt(i, colour.set(c));
      });
      crownRef.current.instanceMatrix.needsUpdate = true;
      if (crownRef.current.instanceColor) crownRef.current.instanceColor.needsUpdate = true;
    }
  }, [item, crowns]);

  return (
    <group>
      <instancedMesh ref={trunkRef} args={[undefined, undefined, item.trees.length]} castShadow>
        <cylinderGeometry args={[0.12, 0.18, 2.2, 8]} />
        <meshStandardMaterial color="#4A3728" roughness={0.95} />
      </instancedMesh>
      <instancedMesh ref={crownRef} args={[undefined, undefined, crowns.length]} castShadow>
        <sphereGeometry args={[1, 10, 10]} />
        <meshStandardMaterial roughness={1} />
      </instancedMesh>
    </group>
  );
}
