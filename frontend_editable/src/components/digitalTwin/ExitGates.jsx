import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { useZones, useVenue } from '../../store/derived';
import { useVenueStore } from '../../store/useVenueStore';
import { NEO, MONO, densityStep } from '../../theme';

/**
 * One exit. The ring pulses faster as the feeding zone's projected occupancy
 * rises; it reflects the zone reading only and does not model throughput,
 * opening width or actual queueing.
 */
function Gate({ gate, ratio, index }) {
  const ringRef = useRef(null);
  const known = ratio != null;
  const { color } = densityStep(ratio);
  const pulseSpeed = known ? 1.4 + Math.min(ratio, 2) * 1.6 : 0;
  const halfWidth = gate.width / 2;
  const padWidth = gate.width + 1.2;
  const ring = Math.max(0.6, Math.min(2.0, gate.width * 0.45));

  useFrame(({ clock }) => {
    if (!ringRef.current || !known) return;
    const time = clock.getElapsedTime() * pulseSpeed + index * 0.4;
    ringRef.current.scale.setScalar(1 + Math.sin(time) * 0.2);
    ringRef.current.material.opacity = 0.4 + Math.sin(time) * 0.3;
  });

  return (
    <group position={[gate.x, gate.y ?? 0, gate.z]} rotation={[0, gate.rotation || 0, 0]}>
      {/* Gate pad */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.56, 0]} receiveShadow>
        <planeGeometry args={[padWidth, Math.min(5, padWidth)]} />
        <meshStandardMaterial color={known ? '#3f4448' : '#5a5f63'} roughness={0.95} />
      </mesh>

      {/* Posts */}
      {[-halfWidth - 0.2, halfWidth + 0.2].map((x) => (
        <mesh key={x} castShadow position={[x, 0.05, 0]}>
          <boxGeometry args={[0.34, 1.2, 0.34]} />
          <meshStandardMaterial color={NEO.ink} metalness={0.7} roughness={0.3} />
        </mesh>
      ))}

      {/* Status bar spanning the opening */}
      <mesh position={[0, 0.62, 0]}>
        <boxGeometry args={[gate.width + 0.4, 0.18, 0.18]} />
        <meshStandardMaterial
          color={known ? color : NEO.grey}
          emissive={known ? color : '#000000'}
          emissiveIntensity={known ? 0.9 : 0}
        />
      </mesh>

      {known && (
        <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]}>
          <ringGeometry args={[ring * 0.75, ring, 32]} />
          <meshBasicMaterial color={color} transparent opacity={0.45} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
}

/**
 * The venue's exits — gates on a plaza, a stair flight, the ends of an alley,
 * the water's edge — each pulsing with the projected occupancy of the zone
 * that feeds it. A venue with a `gateLine` also gets the canopy and columns;
 * `gateLabelAt` moves the label off the crowd when the default spot is busy.
 */
export default function ExitGates() {
  const venue = useVenue();
  const zones = useZones();
  const visible = useVenueStore((state) => state.overlays.gates);
  const byId = new Map(zones.map((zone) => [zone.id, zone]));

  const feeding = new Set(venue.gates.map((gate) => gate.zone));
  const open = zones.filter((zone) => feeding.has(zone.id) && zone.ratio != null).length;
  const known = open > 0;

  const label = venue.gateLabelAt
    ? venue.gateLabelAt
    : venue.gateLine
    ? [venue.gateLine.x, 6.1, venue.gateLine.z]
    : [
        venue.gates.reduce((sum, gate) => sum + gate.x, 0) / Math.max(1, venue.gates.length),
        4.2 + venue.gates.reduce((sum, gate) => sum + (gate.y ?? 0), 0) / Math.max(1, venue.gates.length),
        venue.gates.reduce((sum, gate) => sum + gate.z, 0) / Math.max(1, venue.gates.length),
      ];

  // Stays mounted and hides instead of unmounting, so its HTML label is not
  // torn down and rebuilt on every overlay toggle or venue switch.
  const shown = visible && venue.gates.length > 0;

  return (
    <group visible={shown}>
      {venue.gateLine && (
        <group position={[venue.gateLine.x, 0, venue.gateLine.z]} rotation={[0, venue.gateLine.rotation || 0, 0]}>
          {/* Canopy */}
          <mesh position={[0, 4.4, 0]} castShadow>
            <boxGeometry args={[venue.gateLine.length, 0.22, 5]} />
            <meshStandardMaterial color="#3A4046" metalness={0.6} roughness={0.4} />
          </mesh>
          {Array.from({ length: 5 }, (_, i) => (i - 2) * (venue.gateLine.length / 4.3)).map((x) => (
            <mesh key={x} position={[x, 2.2, 0]} castShadow>
              <cylinderGeometry args={[0.16, 0.16, 4.6, 8]} />
              <meshStandardMaterial color={NEO.ink} metalness={0.95} roughness={0.1} />
            </mesh>
          ))}
        </group>
      )}

      {venue.gates.map((gate, index) => (
        <Gate key={gate.id} gate={gate} index={index} ratio={byId.get(gate.zone)?.ratio ?? null} />
      ))}

      <Html position={label} center pointerEvents="none" zIndexRange={[9, 0]}>
        <div style={{ ...labelStyle, display: shown ? 'block' : 'none' }}>
          {venue.gateLabel || 'EXITS'} — {known ? `${venue.gates.length} MONITORED` : 'NO ZONE PROJECTION'}
        </div>
      </Html>
    </group>
  );
}

const labelStyle = {
  background: NEO.surface,
  border: `2px solid ${NEO.ink}`,
  padding: '3px 8px',
  fontFamily: MONO,
  fontSize: '10px',
  fontWeight: 'bold',
  color: NEO.ink,
  whiteSpace: 'nowrap',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  boxShadow: `2px 2px 0px 0px ${NEO.ink}`,
};
