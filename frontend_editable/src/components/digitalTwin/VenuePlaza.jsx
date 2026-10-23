import { useMemo } from 'react';
import { useZones, useVenue } from '../../store/derived';
import ZoneTile from './ZoneTile';
import Structures, { GROUND_Y, Tree } from './Structures';
import { asphalt, surfaceTexture } from '../../lib/textures';
import { NEO } from '../../theme';

/**
 * The venue floor: a textured ground plane, the walkways between zones when
 * the venue has them, foliage, the venue's structures and the 3×3 analysed
 * grid drawn as heat overlays. Every dimension comes from the active venue.
 */
export default function VenuePlaza() {
  const venue = useVenue();
  const zones = useZones();

  const pitchX = venue.cell.width + venue.gap.x;
  const pitchZ = venue.cell.depth + venue.gap.z;
  const edgeX = pitchX * 1.5 + 1.2;
  const edgeZ = pitchZ * 1.5 + 1.2;
  const hasWalkways = venue.gap.x > 0 && venue.gap.z > 0;
  const ground = venue.ground || {};
  const groundSize = ground.size ?? 140;
  const groundMap = useMemo(
    () => surfaceTexture(ground.texture, ground.repeat || [groundSize / 6, groundSize / 6]),
    [ground.texture, ground.repeat, groundSize],
  );

  const dashes = useMemo(() => {
    const marks = [];
    const edge = Math.max(edgeX, edgeZ);
    for (let step = -edge + 2; step <= edge - 2; step += 3.2) marks.push(step);
    return marks;
  }, [edgeX, edgeZ]);

  // Trees line the walkways on venues that have them; a reconstruction places its own.
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

  const walkwayMap = useMemo(() => asphalt([2, edgeZ / 3]), [edgeZ]);

  return (
    <group>
      {/* Ground plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, GROUND_Y + (ground.y ?? 0) - 0.005, 0]} receiveShadow>
        <planeGeometry args={[groundSize, groundSize]} />
        <meshStandardMaterial color={ground.color || NEO.ground} map={groundMap} roughness={1.0} metalness={0.0} />
      </mesh>

      {hasWalkways && (
        <>
          {/* Cross walkways between zone tiles */}
          {[-1, 1].map((side) => (
            <group key={`lane-${side}`}>
              <mesh rotation={[-Math.PI / 2, 0, 0]} position={[(side * pitchX) / 2, GROUND_Y + 0.004, 0]} receiveShadow>
                <planeGeometry args={[venue.gap.x, edgeZ * 2]} />
                <meshStandardMaterial color="#8A8D92" map={walkwayMap} roughness={0.95} />
              </mesh>
              <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, GROUND_Y + 0.004, (side * pitchZ) / 2]} receiveShadow>
                <planeGeometry args={[edgeX * 2, venue.gap.z]} />
                <meshStandardMaterial color="#8A8D92" map={walkwayMap} roughness={0.95} />
              </mesh>
            </group>
          ))}

          {/* Centre dashes */}
          {[-1, 1].map((side) =>
            dashes.map((step) => (
              <group key={`dash-${side}-${step}`}>
                <mesh rotation={[-Math.PI / 2, 0, Math.PI / 2]} position={[(side * pitchX) / 2, GROUND_Y + 0.008, step]}>
                  <planeGeometry args={[1.3, 0.09]} />
                  <meshBasicMaterial color={NEO.dash} />
                </mesh>
                <mesh rotation={[-Math.PI / 2, 0, 0]} position={[step, GROUND_Y + 0.008, (side * pitchZ) / 2]}>
                  <planeGeometry args={[1.3, 0.09]} />
                  <meshBasicMaterial color={NEO.dash} />
                </mesh>
              </group>
            )),
          )}
        </>
      )}

      <Structures />

      {/* Analysed zone grid, drawn over the floor */}
      {zones.map((zone) => (
        <ZoneTile key={zone.id} zone={zone} />
      ))}

      {trees.map(([x, , z], index) => (
        <Tree key={`tree-${index}`} item={{ x, z, scale: 0.55 }} />
      ))}
    </group>
  );
}
