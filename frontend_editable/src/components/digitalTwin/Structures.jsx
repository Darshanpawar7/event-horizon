import { Html } from '@react-three/drei';
import { useVenue } from '../../store/derived';
import { NEO, MONO } from '../../theme';

/** World height of the venue floor; every primitive sits on it. */
export const GROUND_Y = -0.6;

/**
 * Perimeter geometry for the active venue: platforms and tracks, a stadium
 * wall, river banks, alley buildings, a ramp and its tunnels. Each venue
 * describes itself as a list of plain primitives (see data/venues/index.js),
 * so a new reconstruction needs data, not a new component.
 *
 * None of this is survey geometry. It is a schematic of the published
 * accounts, drawn so the zone grid can be read against recognisable features.
 */
export default function Structures() {
  const venue = useVenue();
  return (
    <group>
      {venue.structures.map((item, index) => (
        <Structure key={item.id || `${item.type}-${index}`} item={item} />
      ))}
      {venue.labels.map((label) => (
        <Html
          key={label.text}
          position={[label.x, GROUND_Y + (label.y ?? 2), label.z]}
          center
          distanceFactor={64}
          pointerEvents="none"
        >
          <div style={labelStyle}>{label.text}</div>
        </Html>
      ))}
    </group>
  );
}

function Structure({ item }) {
  switch (item.type) {
    case 'plane':
      return (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[item.x, GROUND_Y + (item.y ?? 0.01), item.z]} receiveShadow>
          <planeGeometry args={[item.w, item.d]} />
          <meshStandardMaterial color={item.color} roughness={1} metalness={0} flatShading />
        </mesh>
      );

    case 'box':
      return (
        <mesh
          position={[item.x, GROUND_Y + (item.y ?? 0) + item.h / 2, item.z]}
          rotation={[0, item.rotationY ?? 0, 0]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[item.w, item.h, item.d]} />
          <meshStandardMaterial color={item.color} roughness={0.9} metalness={0.05} flatShading />
        </mesh>
      );

    case 'ramp': {
      // A slab rising `rise` metres over `length` metres along `axis`, toward
      // +axis when dir is 1 and toward -axis when dir is -1.
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
          <meshStandardMaterial color={item.color} roughness={0.95} flatShading />
        </mesh>
      );
    }

    case 'train':
      return (
        <group position={[item.x, GROUND_Y + 0.4, item.z]}>
          <mesh position={[0, 1.9, 0]} castShadow>
            <boxGeometry args={[3.2, 3.8, item.length]} />
            <meshStandardMaterial color={item.color} roughness={0.6} metalness={0.2} flatShading />
          </mesh>
          <mesh position={[0, 2.5, 0]}>
            <boxGeometry args={[3.26, 0.7, item.length - 0.6]} />
            <meshStandardMaterial color="#9CA3AF" roughness={0.4} metalness={0.3} />
          </mesh>
          <mesh position={[0, 3.95, 0]}>
            <boxGeometry args={[3.0, 0.3, item.length]} />
            <meshStandardMaterial color="#D1D5DB" roughness={0.8} />
          </mesh>
        </group>
      );

    case 'kiosk': {
      // The plaza's stands, stalls and service blocks: a white block with a coloured roof.
      const height = 2.4 * item.scale;
      return (
        <group position={[item.x, height / 2 + GROUND_Y, item.z]}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[2.6, height, 2.6]} />
            <meshStandardMaterial color={NEO.surface} roughness={0.9} metalness={0} flatShading />
          </mesh>
          <mesh position={[0, height / 2 + 0.15, 0]} castShadow>
            <boxGeometry args={[2.9, 0.3, 2.9]} />
            <meshStandardMaterial color={item.z >= 0 ? NEO.roofSouth : NEO.roofNorth} roughness={0.9} flatShading />
          </mesh>
        </group>
      );
    }

    default:
      return null;
  }
}

const labelStyle = {
  background: NEO.ink,
  color: NEO.surface,
  padding: '3px 8px',
  fontFamily: MONO,
  fontSize: '9px',
  fontWeight: 900,
  letterSpacing: '0.08em',
  whiteSpace: 'nowrap',
  borderRadius: 2,
  opacity: 0.92,
};
