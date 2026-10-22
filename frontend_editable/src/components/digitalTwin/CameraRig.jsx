import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useVenue } from '../../store/derived';

/**
 * Flies the camera to each venue's vantage point when the venue changes.
 *
 * OrbitControls owns the camera between venue switches, so this only takes
 * over for the move: it eases position and look-at target toward the venue's
 * values and hands control back once it arrives. A venue switch therefore
 * reads as travelling to a new place rather than the ground changing under a
 * fixed camera.
 */
export default function CameraRig() {
  const venue = useVenue();
  const camera = useThree((state) => state.camera);
  const controls = useThree((state) => state.controls);
  const flying = useRef(false);
  const previous = useRef(venue.id);

  const targetPosition = useMemo(() => new THREE.Vector3(...venue.camera.position), [venue]);
  const targetLook = useMemo(() => new THREE.Vector3(...venue.camera.target), [venue]);

  useEffect(() => {
    if (previous.current !== venue.id) {
      previous.current = venue.id;
      flying.current = true;
    }
  }, [venue.id]);

  useFrame((_, delta) => {
    if (!flying.current) return;
    // Time-based easing: about a second to arrive whether the machine renders
    // sixty frames a second or five (software WebGL in a headless check).
    const k = 1 - Math.exp(-Math.min(delta, 0.1) * 4);
    camera.position.lerp(targetPosition, k);
    if (controls) {
      controls.target.lerp(targetLook, k);
      controls.update();
    } else {
      camera.lookAt(targetLook);
    }
    if (camera.position.distanceTo(targetPosition) < 0.05) flying.current = false;
  });

  return null;
}
