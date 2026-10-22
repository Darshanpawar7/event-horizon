import { useRef, useState, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { useVenueStore } from '../../store/useVenueStore';
import { NEO, MONO, densityStep, densityBand, UNKNOWN_COLOR } from '../../theme';

const MIN_HEIGHT = 0.45;
const MAX_HEIGHT = 9;
/** Simulated density (persons/m²) from which a tile shows the crush ring. */
const CRUSH_RISK_DENSITY = 3.5;

// Reused every frame rather than allocated sixty times a second per tile.
const scratchScale = new THREE.Vector3();

/**
 * One cell of the 3x3 concentration grid. The column height encodes projected
 * occupancy relative to the configured threshold; a zone with no projection
 * renders as a flat unknown slab rather than a zero-height reading. Tiles take
 * their footprint from the venue — twelve metres square on the plaza, a metre
 * wide in the alley.
 *
 * @param {{zone: {id:string,label:string,x:number,z:number,width:number,depth:number,projected:number|null,
 *   current:number|null,ratio:number|null,flagged:boolean,density:number|null,currentDensity:number|null}}} props
 */
export default function ZoneTile({ zone }) {
  const groupRef = useRef(null);
  const columnRef = useRef(null);
  const glowRef = useRef(null);
  const crushRef = useRef(null);
  const [hovered, setHovered] = useState(false);

  const selectedZone = useVenueStore((state) => state.selectedZone);
  const setSelectedZone = useVenueStore((state) => state.setSelectedZone);
  const showDensity = useVenueStore((state) => state.overlays.density);

  const isSelected = selectedZone === zone.id;
  const known = zone.ratio != null;
  const { color, label } = densityStep(zone.ratio);
  const crush = zone.currentDensity != null && zone.currentDensity >= CRUSH_RISK_DENSITY;

  // Leave a margin inside the cell, proportionally smaller on narrow cells.
  const margin = Math.min(0.6, 0.12 * Math.min(zone.width, zone.depth));
  const insetW = zone.width - margin;
  const insetD = zone.depth - margin;
  const column = Math.min(insetW, insetD) * 0.34;
  const ringOuter = Math.min(insetW, insetD) * 0.48;

  // One edge geometry per tile footprint, disposed when the footprint changes.
  const edges = useMemo(() => new THREE.EdgesGeometry(new THREE.PlaneGeometry(insetW, insetD)), [insetW, insetD]);
  useEffect(() => () => edges.dispose(), [edges]);

  const targetHeight = useMemo(() => {
    if (!known || !showDensity) return MIN_HEIGHT;
    return THREE.MathUtils.clamp(MIN_HEIGHT + zone.ratio * 3.4, MIN_HEIGHT, MAX_HEIGHT);
  }, [known, showDensity, zone.ratio]);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();

    if (groupRef.current) {
      const targetScale = isSelected ? 1.04 : hovered ? 1.02 : 1.0;
      groupRef.current.scale.lerp(scratchScale.set(targetScale, 1, targetScale), 0.15);
    }

    if (columnRef.current) {
      // Grow the column toward its target so threshold changes read as motion.
      const wobble = zone.flagged ? Math.sin(time * 3 + zone.x) * 0.12 : 0;
      const next = THREE.MathUtils.lerp(columnRef.current.scale.y, targetHeight + wobble, 0.08);
      columnRef.current.scale.y = next;
      columnRef.current.position.y = next / 2 - 0.55;
    }

    if (glowRef.current && zone.flagged) {
      const pulse = 1.0 + Math.sin(time * 4) * 0.08;
      glowRef.current.scale.set(pulse, pulse, pulse);
      glowRef.current.material.opacity = 0.22 + Math.sin(time * 4) * 0.1;
    }

    if (crushRef.current && crush) {
      const pulse = 1.0 + Math.sin(time * 7) * 0.12;
      crushRef.current.scale.set(pulse, pulse, pulse);
      crushRef.current.material.opacity = 0.35 + Math.sin(time * 7) * 0.2;
    }
  });

  const select = (event) => {
    event.stopPropagation();
    setSelectedZone(zone.id);
  };

  const enter = (event) => {
    event.stopPropagation();
    setHovered(true);
    document.body.style.cursor = 'pointer';
  };

  const leave = (event) => {
    event.stopPropagation();
    setHovered(false);
    document.body.style.cursor = 'auto';
  };

  const band = crush ? densityBand(zone.currentDensity) : null;

  return (
    <group ref={groupRef} position={[zone.x, 0, zone.z]}>
      {/* Floor tile — the click target for the whole zone */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.57, 0]}
        receiveShadow
        onClick={select}
        onPointerOver={enter}
        onPointerOut={leave}
      >
        <planeGeometry args={[insetW, insetD]} />
        <meshStandardMaterial
          color={known ? '#FFFFFF' : '#DEE1E4'}
          roughness={1.0}
          metalness={0}
          flatShading
          emissive={crush ? band.color : color}
          emissiveIntensity={crush ? 0.3 : isSelected ? 0.22 : hovered ? 0.1 : 0.04}
        />
      </mesh>

      {/* Tile border */}
      <lineSegments geometry={edges} position={[0, -0.565, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <lineBasicMaterial color={isSelected ? NEO.ink : known ? color : UNKNOWN_COLOR} />
      </lineSegments>

      {/* Density column */}
      <mesh
        ref={columnRef}
        position={[0, 0, 0]}
        castShadow
        onClick={select}
        onPointerOver={enter}
        onPointerOut={leave}
      >
        <boxGeometry args={[column, 1, column]} />
        <meshStandardMaterial
          color={known ? color : UNKNOWN_COLOR}
          transparent
          opacity={known ? 0.66 : 0.28}
          roughness={0.85}
          flatShading
          emissive={known ? color : '#000000'}
          emissiveIntensity={isSelected ? 0.35 : 0.12}
        />
      </mesh>

      {/* Concentration pulse ring */}
      {zone.flagged && (
        <mesh ref={glowRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.54, 0]}>
          <ringGeometry args={[ringOuter * 0.83, ringOuter, 48]} />
          <meshBasicMaterial color={NEO.red} transparent opacity={0.3} side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* Crush-risk ring — simulated density past the band where movement becomes involuntary */}
      {crush && (
        <mesh ref={crushRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.535, 0]}>
          <ringGeometry args={[ringOuter * 0.6, ringOuter * 0.8, 48]} />
          <meshBasicMaterial color={band.color} transparent opacity={0.4} side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* Selection base ring */}
      {isSelected && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.545, 0]}>
          <ringGeometry args={[ringOuter * 1.04, ringOuter * 1.12, 48]} />
          <meshBasicMaterial color={NEO.ink} side={THREE.DoubleSide} />
        </mesh>
      )}

      {(isSelected || hovered) && (
        <Html position={[0, targetHeight + 1.2, 0]} center distanceFactor={42} pointerEvents="none">
          <div style={badgeStyle}>
            <span style={{ ...dotStyle, background: known ? color : UNKNOWN_COLOR }} />
            {zone.id} · {known ? `${zone.projected} @ HORIZON` : 'NO PROJECTION'}
            {zone.density != null && <span style={{ color: NEO.grey }}>{zone.density.toFixed(1)}/m² SIM</span>}
            <span style={{ color: crush ? band.color : NEO.grey }}>{crush ? band.label : known ? label : 'UNVERIFIED'}</span>
          </div>
        </Html>
      )}
    </group>
  );
}

const badgeStyle = {
  background: NEO.surface,
  color: NEO.ink,
  border: `2px solid ${NEO.ink}`,
  padding: '4px 8px',
  fontFamily: MONO,
  fontSize: '9px',
  fontWeight: 900,
  whiteSpace: 'nowrap',
  borderRadius: '2px',
  boxShadow: `2px 2px 0px 0px ${NEO.ink}`,
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
};

const dotStyle = {
  width: '6px',
  height: '6px',
  borderRadius: '50%',
  display: 'inline-block',
};
