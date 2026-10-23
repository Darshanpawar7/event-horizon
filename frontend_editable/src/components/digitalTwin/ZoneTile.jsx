import { useRef, useState, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { useVenueStore } from '../../store/useVenueStore';
import { useVenue } from '../../store/derived';
import { NEO, MONO, densityStep, densityBand, UNKNOWN_COLOR } from '../../theme';

const MIN_HEIGHT = 0.45;
/** Simulated density (persons/m²) from which a tile shows the crush ring. */
const CRUSH_RISK_DENSITY = 3.5;
/** Heat-overlay opacity per density band: faint while people move freely, strong once they cannot. */
const HEAT_OPACITY = { free: 0.1, restricted: 0.2, congested: 0.32, crush: 0.46, critical: 0.58, unknown: 0.08 };
const SELECTED = '#F9FAFB';
/**
 * Camera distance (m) over which the projection column fades in. In a close-up
 * the columns would wall off the crowd; the floor tint and the strip above the
 * twin carry the reading there. While the twin is focused on a zone the
 * columns step aside altogether.
 */
const COLUMN_FADE = [16, 40];

// Reused every frame rather than allocated sixty times a second per tile.
const scratchScale = new THREE.Vector3();

/**
 * One cell of the 3x3 concentration grid, drawn over the venue floor.
 *
 * The floor overlay is a translucent heat tint coloured by the simulated
 * density band (or, under a backend forecast with no area, by the threshold
 * ramp), so the platform, street or sand underneath stays visible. It follows
 * the venue's slope. The slim column encodes projected occupancy relative to
 * the configured threshold; a zone with no projection keeps a flat, grey,
 * unverified look rather than a zero reading.
 *
 * @param {{zone: {id:string,label:string,x:number,y:number,z:number,tilt:number,width:number,depth:number,
 *   projected:number|null,current:number|null,ratio:number|null,flagged:boolean,density:number|null,
 *   currentDensity:number|null}}} props
 */
export default function ZoneTile({ zone }) {
  const venue = useVenue();
  const groupRef = useRef(null);
  const columnRef = useRef(null);
  const capRef = useRef(null);
  const glowRef = useRef(null);
  const crushRef = useRef(null);
  const heatRef = useRef(null);
  const [hovered, setHovered] = useState(false);

  const selectedZone = useVenueStore((state) => state.selectedZone);
  const setSelectedZone = useVenueStore((state) => state.setSelectedZone);
  const showDensity = useVenueStore((state) => state.overlays.density);
  const showHeat = useVenueStore((state) => state.overlays.heat);
  const focused = useVenueStore((state) => Boolean(state.focusZone));
  // Eases to 0 in focus mode and back to 1 after, at the camera flight's pace.
  const presence = useRef(1);

  const isSelected = selectedZone === zone.id;
  const known = zone.ratio != null;
  const { color, label } = densityStep(zone.ratio);
  const band = zone.currentDensity != null ? densityBand(zone.currentDensity) : null;
  const heatColor = band ? band.color : known ? color : UNKNOWN_COLOR;
  const heatOpacity = band ? HEAT_OPACITY[band.key] : known ? 0.14 : HEAT_OPACITY.unknown;
  const crush = zone.currentDensity != null && zone.currentDensity >= CRUSH_RISK_DENSITY;
  const critical = band?.key === 'critical';

  // Leave a margin inside the cell, proportionally smaller on narrow cells.
  const margin = Math.min(0.6, 0.12 * Math.min(zone.width, zone.depth));
  const insetW = zone.width - margin;
  const insetD = zone.depth - margin;
  const short = Math.min(insetW, insetD);
  const column = Math.max(0.16, short * 0.16);
  const ringOuter = short * 0.48;
  const maxHeight = venue.overlay?.columnMax ?? 9;

  // One edge geometry per tile footprint, disposed when the footprint changes.
  const edges = useMemo(() => new THREE.EdgesGeometry(new THREE.PlaneGeometry(insetW, insetD)), [insetW, insetD]);
  useEffect(() => () => edges.dispose(), [edges]);

  const targetHeight = useMemo(() => {
    if (!known || !showDensity) return MIN_HEIGHT;
    return THREE.MathUtils.clamp(MIN_HEIGHT + zone.ratio * 3.4, MIN_HEIGHT, maxHeight);
  }, [known, showDensity, zone.ratio, maxHeight]);

  useFrame((state, delta) => {
    const time = state.clock.getElapsedTime();
    const ease = 1 - Math.exp(-Math.min(delta, 0.1) * 4);
    presence.current += ((focused ? 0 : 1) - presence.current) * ease;
    const near = state.camera.position.distanceTo(scratchScale.set(zone.x, zone.y, zone.z));
    const fade = THREE.MathUtils.smoothstep(near, COLUMN_FADE[0], COLUMN_FADE[1]) * presence.current;
    if (groupRef.current) groupRef.current.visible = fade > 0.01;
    if (columnRef.current) columnRef.current.material.opacity = (known ? 0.55 : 0.25) * fade;
    if (capRef.current) capRef.current.material.opacity = fade;

    if (groupRef.current) {
      const targetScale = isSelected ? 1.06 : hovered ? 1.03 : 1.0;
      groupRef.current.scale.lerp(scratchScale.set(targetScale, 1, targetScale), 0.15);
    }

    if (columnRef.current) {
      // Grow the column toward its target so threshold changes read as motion.
      const wobble = zone.flagged ? Math.sin(time * 3 + zone.x) * 0.12 : 0;
      const next = THREE.MathUtils.lerp(columnRef.current.scale.y, targetHeight + wobble, 0.08);
      columnRef.current.scale.y = next;
      columnRef.current.position.y = next / 2 - 0.55;
      if (capRef.current) capRef.current.position.y = next - 0.55 + 0.05;
    }

    if (heatRef.current) {
      const pulse = crush ? 0.14 * (0.5 + 0.5 * Math.sin(time * (critical ? 6.5 : 4))) : 0;
      heatRef.current.material.opacity = showHeat ? heatOpacity + pulse : 0;
    }

    if (glowRef.current && zone.flagged) {
      const pulse = 1.0 + Math.sin(time * 4) * 0.08;
      glowRef.current.scale.set(pulse, pulse, pulse);
      glowRef.current.material.opacity = 0.35 + Math.sin(time * 4) * 0.15;
    }

    if (crushRef.current && crush) {
      const pulse = 1.0 + Math.sin(time * 7) * 0.12;
      crushRef.current.scale.set(pulse, pulse, pulse);
      crushRef.current.material.opacity = 0.5 + Math.sin(time * 7) * 0.25;
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

  const lineColour = isSelected ? SELECTED : heatColor;

  return (
    <group>
      {/* Floor overlays, tilted with the venue's slope */}
      <group position={[zone.x, zone.y, zone.z]} rotation={[zone.tilt, 0, 0]}>
        <mesh
          ref={heatRef}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, -0.565, 0]}
          renderOrder={2}
          onClick={select}
          onPointerOver={enter}
          onPointerOut={leave}
        >
          <planeGeometry args={[insetW, insetD]} />
          <meshBasicMaterial
            color={heatColor}
            transparent
            opacity={heatOpacity}
            depthWrite={false}
            toneMapped={false}
            polygonOffset
            polygonOffsetFactor={-2}
          />
        </mesh>

        <lineSegments geometry={edges} position={[0, -0.555, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={3}>
          <lineBasicMaterial color={lineColour} transparent opacity={isSelected ? 1 : 0.85} toneMapped={false} />
        </lineSegments>

        {/* Concentration pulse ring — projection at the threshold */}
        {zone.flagged && (
          <mesh ref={glowRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.55, 0]} renderOrder={3}>
            <ringGeometry args={[ringOuter * 0.83, ringOuter, 64]} />
            <meshBasicMaterial color={NEO.red} transparent opacity={0.4} side={THREE.DoubleSide} depthWrite={false} toneMapped={false} />
          </mesh>
        )}

        {/* Crush-risk ring — simulated density past the band where movement becomes involuntary */}
        {crush && (
          <mesh ref={crushRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.548, 0]} renderOrder={3}>
            <ringGeometry args={[ringOuter * 0.58, ringOuter * 0.76, 64]} />
            <meshBasicMaterial color={critical ? '#FF1F3D' : band.color} transparent opacity={0.55} side={THREE.DoubleSide} depthWrite={false} toneMapped={false} />
          </mesh>
        )}

        {/* Selection ring */}
        {isSelected && (
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.546, 0]} renderOrder={3}>
            <ringGeometry args={[ringOuter * 1.04, ringOuter * 1.12, 64]} />
            <meshBasicMaterial color={SELECTED} side={THREE.DoubleSide} toneMapped={false} />
          </mesh>
        )}
      </group>

      {/* Projection column stays vertical even on a slope */}
      <group ref={groupRef} position={[zone.x, zone.y, zone.z]}>
        <mesh ref={columnRef} castShadow onClick={select} onPointerOver={enter} onPointerOut={leave}>
          <boxGeometry args={[column, 1, column]} />
          <meshStandardMaterial
            color={known ? color : UNKNOWN_COLOR}
            transparent
            opacity={known ? 0.55 : 0.25}
            roughness={0.25}
            metalness={0.1}
            emissive={known ? color : '#000000'}
            emissiveIntensity={isSelected ? 0.9 : 0.45}
          />
        </mesh>
        <mesh ref={capRef}>
          <boxGeometry args={[column * 1.2, 0.08, column * 1.2]} />
          <meshBasicMaterial color={known ? color : UNKNOWN_COLOR} transparent toneMapped={false} />
        </mesh>
      </group>

      {/* Kept mounted and shown on demand: mounting an HTML overlay per hover
          creates and destroys a React root each time. */}
      <Html position={[zone.x, zone.y + targetHeight + 1.2, zone.z]} center pointerEvents="none" zIndexRange={[9, 0]}>
          <div style={{ ...badgeStyle, display: isSelected || hovered ? 'flex' : 'none' }}>
            <span style={{ ...dotStyle, background: known ? color : UNKNOWN_COLOR }} />
            {zone.id} · {known ? `${zone.projected} @ HORIZON` : 'NO PROJECTION'}
            {zone.density != null && <span style={{ color: NEO.grey }}>{zone.density.toFixed(1)}/m² SIM</span>}
            <span style={{ color: crush ? band.color : NEO.grey }}>{crush ? band.label : known ? label : 'UNVERIFIED'}</span>
          </div>
      </Html>
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
