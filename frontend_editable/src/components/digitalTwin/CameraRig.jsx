import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useVenueStore } from '../../store/useVenueStore';
import { useVenue } from '../../store/derived';
import { layoutZones } from '../../data/venueModel';
import { overviewView } from '../../data/cameraViews';

/** Longest a flight may take, in seconds, before it simply lands. */
const FLIGHT_LIMIT = 3.5;
/** OrbitControls' auto-rotate speed while ORBIT is on: one slow turn a minute. */
const ORBIT_SPEED = 1.0;

/** Where FOCUS takes the camera for a zone: the venue's authored close-up, else a generic one. */
function focusView(venue, zoneId) {
  const authored = venue.views?.[zoneId];
  if (authored) return authored;
  const zone = layoutZones(venue).find((entry) => entry.id === zoneId);
  if (!zone) return overviewView(venue);
  // Close enough to read individual figures, high enough to see the whole cell.
  const reach = Math.min(40, Math.max(12, 1.1 * Math.max(zone.width, zone.depth)));
  return {
    position: [zone.x - reach * 0.45, zone.y + reach * 0.62, zone.z + reach * 0.85],
    target: [zone.x, zone.y + 0.5, zone.z],
  };
}

/**
 * Moves the camera when something asks it to: a new venue (its vantage
 * point), FOCUS on a zone (its close-up), or a view control or double-click
 * (`cameraRequest`). The newest request wins.
 *
 * OrbitControls owns the camera the rest of the time. A flight eases the
 * camera and the orbit target with time-based damping, and ends the moment
 * the operator drags, scrolls or presses a movement key, so the view never
 * fights the hand on it. It also lands after a few seconds at most, however
 * slowly the machine renders. ORBIT turns auto-rotation on between flights.
 */
export default function CameraRig() {
  const venue = useVenue();
  const focusZone = useVenueStore((state) => state.focusZone);
  const request = useVenueStore((state) => state.cameraRequest);
  const autoOrbit = useVenueStore((state) => state.autoOrbit);
  const camera = useThree((state) => state.camera);
  const controls = useThree((state) => state.controls);
  const flight = useRef(null);

  useEffect(() => {
    const view = focusZone ? focusView(venue, focusZone) : overviewView(venue);
    flight.current = { position: new THREE.Vector3(...view.position), target: new THREE.Vector3(...view.target), elapsed: 0 };
  }, [venue, focusZone]);

  useEffect(() => {
    if (!request) return;
    flight.current = { position: new THREE.Vector3(...request.position), target: new THREE.Vector3(...request.target), elapsed: 0 };
  }, [request]);

  // Any drag, scroll or touch by the operator ends a flight at once.
  useEffect(() => {
    if (!controls) return undefined;
    const cancel = () => {
      flight.current = null;
    };
    controls.addEventListener('start', cancel);
    return () => controls.removeEventListener('start', cancel);
  }, [controls]);

  useFrame((_, delta) => {
    if (controls) {
      controls.autoRotate = autoOrbit && !flight.current;
      controls.autoRotateSpeed = ORBIT_SPEED;
    }
    const current = flight.current;
    if (!current) return;
    const step = Math.min(delta, 0.1);
    current.elapsed += step;
    const k = 1 - Math.exp(-step * 4);
    camera.position.lerp(current.position, k);
    if (controls) controls.target.lerp(current.target, k);
    else camera.lookAt(current.target);
    if (camera.position.distanceTo(current.position) < 0.05 || current.elapsed > FLIGHT_LIMIT) {
      camera.position.copy(current.position);
      if (controls) controls.target.copy(current.target);
      else camera.lookAt(current.target);
      flight.current = null;
    }
    if (controls) controls.update();
  });

  return null;
}
