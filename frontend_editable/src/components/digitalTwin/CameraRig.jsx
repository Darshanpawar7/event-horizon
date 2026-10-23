import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useVenueStore } from '../../store/useVenueStore';
import { useVenue, useZones } from '../../store/derived';

/**
 * Flies the camera to each venue's vantage point when the venue changes, and
 * down to a zone when the operator asks the twin to focus on it.
 *
 * OrbitControls owns the camera in between: this only takes over for the
 * move, easing position and look-at target with time-based damping so the
 * flight takes about a second whether the machine renders sixty frames a
 * second or five, then hands control back once it arrives.
 */
export default function CameraRig() {
  const venue = useVenue();
  const zones = useZones();
  const focusZone = useVenueStore((state) => state.focusZone);
  const camera = useThree((state) => state.camera);
  const controls = useThree((state) => state.controls);
  const flying = useRef(false);
  const previous = useRef(`${venue.id}|`);

  const { targetPosition, targetLook } = useMemo(() => {
    const zone = focusZone ? zones.find((entry) => entry.id === focusZone) : null;
    // A venue may author the close-up for a zone (the New Delhi stair flight, say).
    const authored = zone && venue.views?.[zone.id];
    if (authored) {
      return {
        targetPosition: new THREE.Vector3(...authored.position),
        targetLook: new THREE.Vector3(...authored.target),
      };
    }
    if (!zone) {
      return {
        targetPosition: new THREE.Vector3(...venue.camera.position),
        targetLook: new THREE.Vector3(...venue.camera.target),
      };
    }
    // Close enough to read individual figures, high enough to see the whole cell.
    const reach = Math.min(40, Math.max(12, 1.1 * Math.max(zone.width, zone.depth)));
    return {
      targetPosition: new THREE.Vector3(zone.x - reach * 0.45, zone.y + reach * 0.62, zone.z + reach * 0.85),
      targetLook: new THREE.Vector3(zone.x, zone.y + 0.5, zone.z),
    };
  }, [venue, zones, focusZone]);

  useEffect(() => {
    const key = `${venue.id}|${focusZone || ''}`;
    if (previous.current !== key) {
      previous.current = key;
      flying.current = true;
    }
  }, [venue.id, focusZone]);

  useFrame((_, delta) => {
    if (!flying.current) return;
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
