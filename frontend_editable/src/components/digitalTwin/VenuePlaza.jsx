import { useMemo } from 'react';
import { useZones, useVenue } from '../../store/derived';
import ZoneTile from './ZoneTile';
import Structures, { GROUND_Y } from './Structures';
import { NEO } from '../../theme';

/**
 * The venue floor: ground plane, the walkways between zones when the venue
 * has them, foliage, perimeter structures and the 3×3 analysed grid rendered
 * as clickable zone tiles. Every dimension comes from the active venue.
 */
export default function VenuePlaza() {
  const venue = useVenue();
  const zones = useZones();

  const pitchX = venue.cell.width + venue.gap.x;
  const pitchZ = venue.cell.depth + venue.gap.z;
  const edgeX = pitchX * 1.5 + 1.2;
  const edgeZ = pitchZ * 1.5 + 1.2;
  const hasWalkways = venue.gap.x > 0 && venue.gap.z > 0;
  const groundSize = venue.ground?.size ?? 140;
  const groundColor = venue.ground?.color || NEO.ground;

  const dashes = useMemo(() => {
    const marks = [];
    const edge = Math.max(edgeX, edgeZ);
    for (let step = -edge + 2; step <= edge - 2; step += 3.2) marks.push(step);
    return marks;
  }, [edgeX, edgeZ]);

  // Trees line the walkways on venues that have them; a reconstruction may
  // place its own instead (a park across the road, for instance).
  const trees = useMemo(() => {
    if (venue.treePositions) return venue.treePositions;
    if (!venue.trees) return [];
    const positions = [];
    for (const lane of [-pitchX / 2, pitchX / 2]) {
      for (let step = -22; step <= 22; step += 5.5) {
        positions.push([lane, 0, step]);
        positions.push([step, 0, lane]);
      }
    }
    return positions;
  }, [venue, pitchX]);

  return (
    <group>
      {/* Ground plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, GROUND_Y - 0.005, 0]} receiveShadow>
        <planeGeometry args={[groundSize, groundSize]} />
        <meshStandardMaterial color={groundColor} roughness={1.0} metalness={0.0} flatShading />
      </mesh>

      {hasWalkways && (
        <>
          {/* Cross walkways between zone tiles */}
          {[-1, 1].map((side) => (
            <group key={`lane-${side}`}>
              <mesh rotation={[-Math.PI / 2, 0, 0]} position={[(side * pitchX) / 2, GROUND_Y, 0]} receiveShadow>
                <planeGeometry args={[venue.gap.x, edgeZ * 2]} />
                <meshStandardMaterial color={NEO.walkway} roughness={0.9} flatShading />
              </mesh>
              <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, GROUND_Y, (side * pitchZ) / 2]} receiveShadow>
                <planeGeometry args={[edgeX * 2, venue.gap.z]} />
                <meshStandardMaterial color={NEO.walkway} roughness={0.9} flatShading />
              </mesh>
            </group>
          ))}

          {/* Perimeter approach roads */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, GROUND_Y, -edgeZ - 4]} receiveShadow>
            <planeGeometry args={[96, 3]} />
            <meshStandardMaterial color={NEO.walkway} roughness={0.9} flatShading />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, GROUND_Y, edgeZ + 4]} receiveShadow>
            <planeGeometry args={[96, 3]} />
            <meshStandardMaterial color={NEO.walkway} roughness={0.9} flatShading />
          </mesh>

          {/* Gold centre dashes */}
          {[-1, 1].map((side) =>
            dashes.map((step) => (
              <group key={`dash-${side}-${step}`}>
                <mesh rotation={[-Math.PI / 2, 0, Math.PI / 2]} position={[(side * pitchX) / 2, GROUND_Y + 0.005, step]}>
                  <planeGeometry args={[1.3, 0.09]} />
                  <meshBasicMaterial color={NEO.dash} />
                </mesh>
                <mesh rotation={[-Math.PI / 2, 0, 0]} position={[step, GROUND_Y + 0.005, (side * pitchZ) / 2]}>
                  <planeGeometry args={[1.3, 0.09]} />
                  <meshBasicMaterial color={NEO.dash} />
                </mesh>
              </group>
            )),
          )}
        </>
      )}

      {/* Analysed zone grid */}
      {zones.map((zone) => (
        <ZoneTile key={zone.id} zone={zone} />
      ))}

      <Structures />

      {/* Foliage */}
      {trees.map((position, index) => (
        <group key={`tree-${index}`} position={position}>
          <mesh position={[0, -0.1, 0]} castShadow>
            <cylinderGeometry args={[0.06, 0.06, 0.9, 8]} />
            <meshStandardMaterial color={NEO.ink} roughness={0.9} />
          </mesh>
          <mesh position={[0, 0.55, 0]} castShadow>
            <sphereGeometry args={[0.4, 12, 12]} />
            <meshStandardMaterial color={NEO.foliage} roughness={1.0} flatShading />
          </mesh>
        </group>
      ))}

      <gridHelper args={[groundSize, groundSize / 2, '#E0E0E0', groundColor]} position={[0, GROUND_Y + 0.002, 0]} />
    </group>
  );
}
