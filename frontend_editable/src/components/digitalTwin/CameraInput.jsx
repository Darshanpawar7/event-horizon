import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useVenueStore } from '../../store/useVenueStore';
import { useVenue, useZones } from '../../store/derived';
import { overviewView, topView, incidentZone } from '../../data/cameraViews';

/** Held keys: [ahead, sideways] in the ground plane, relative to the view. */
const MOVES = {
  KeyW: [1, 0],
  ArrowUp: [1, 0],
  KeyS: [-1, 0],
  ArrowDown: [-1, 0],
  KeyA: [0, -1],
  ArrowLeft: [0, -1],
  KeyD: [0, 1],
  ArrowRight: [0, 1],
};
const TURNS = { KeyQ: 1, KeyE: -1 };
const ZOOMS = { Equal: -1, NumpadAdd: -1, Minus: 1, NumpadSubtract: 1 };
const HELD = new Set([...Object.keys(MOVES), ...Object.keys(TURNS), ...Object.keys(ZOOMS), 'ShiftLeft', 'ShiftRight']);

const UP = new THREE.Vector3(0, 1, 0);
const ahead = new THREE.Vector3();
const across = new THREE.Vector3();
const offset = new THREE.Vector3();
const shift = new THREE.Vector3();

/** Keys typed into a field belong to the field, not the camera. */
function typing(target) {
  if (!target || !target.tagName) return false;
  return ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable;
}

/**
 * Free movement for presenting the twin, on top of the orbit controls:
 *
 * - W A S D or the arrow keys glide across the ground relative to the view,
 *   Q and E turn around the point being looked at, + and − zoom, and Shift
 *   goes faster. Speed scales with distance, so it suits close-ups and
 *   overviews alike.
 * - 1 is the venue overview, 2 the incident close-up, 3 the plan view
 *   straight down, O toggles a slow orbit.
 * - Double-click anywhere on the ground or a structure to fly there.
 *
 * Every movement key ends a camera flight, like a drag does.
 */
export default function CameraInput() {
  const camera = useThree((state) => state.camera);
  const controls = useThree((state) => state.controls);
  const gl = useThree((state) => state.gl);
  const scene = useThree((state) => state.scene);
  const venue = useVenue();
  const zones = useZones();
  const pressed = useRef(new Set());
  const latest = useRef({ venue, zones });
  latest.current = { venue, zones };

  useEffect(() => {
    const onDown = (event) => {
      if (event.ctrlKey || event.metaKey || event.altKey || typing(event.target)) return;
      const store = useVenueStore.getState();
      if (!event.repeat) {
        const { venue: active, zones: current } = latest.current;
        if (event.code === 'Digit1' || event.code === 'Numpad1') return store.requestCamera(overviewView(active));
        if (event.code === 'Digit2' || event.code === 'Numpad2') {
          const id = incidentZone(current);
          if (id && store.focusZone !== id) store.focusOn(id);
          return undefined;
        }
        if (event.code === 'Digit3' || event.code === 'Numpad3') return store.requestCamera(topView(active));
        if (event.code === 'KeyO') return store.setAutoOrbit(!store.autoOrbit);
      }
      if (!HELD.has(event.code)) return undefined;
      pressed.current.add(event.code);
      if (event.code.startsWith('Arrow')) event.preventDefault();
      if (!event.code.startsWith('Shift')) controls?.dispatchEvent({ type: 'start' });
      return undefined;
    };
    const onUp = (event) => pressed.current.delete(event.code);
    const onBlur = () => pressed.current.clear();
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
      window.removeEventListener('blur', onBlur);
    };
  }, [controls]);

  // Double-click: fly to the point under the pointer, keeping the viewing angle.
  useEffect(() => {
    const element = gl.domElement;
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const floor = new THREE.Plane(UP, 0);
    const onDouble = (event) => {
      if (!controls) return;
      const rect = element.getBoundingClientRect();
      pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
      raycaster.setFromCamera(pointer, camera);
      const pickable = [];
      scene.traverse((object) => {
        if (object.userData.pickable) pickable.push(object);
      });
      let point = raycaster.intersectObjects(pickable, false)[0]?.point ?? null;
      if (!point) {
        floor.constant = -controls.target.y;
        point = raycaster.ray.intersectPlane(floor, new THREE.Vector3());
      }
      if (!point) return;
      const view = offset.subVectors(camera.position, controls.target);
      const distance = THREE.MathUtils.clamp(view.length() * 0.55, 10, 90);
      const position = point.clone().add(view.setLength(distance));
      useVenueStore.getState().requestCamera({ position: position.toArray(), target: point.toArray() });
    };
    element.addEventListener('dblclick', onDouble);
    return () => element.removeEventListener('dblclick', onDouble);
  }, [gl, camera, scene, controls]);

  useFrame((_, delta) => {
    const keys = pressed.current;
    if (!controls || keys.size === 0) return;
    const step = Math.min(delta, 0.1);
    let forward = 0;
    let sideways = 0;
    let turn = 0;
    let zoom = 0;
    for (const code of keys) {
      if (MOVES[code]) {
        forward += MOVES[code][0];
        sideways += MOVES[code][1];
      }
      if (TURNS[code]) turn += TURNS[code];
      if (ZOOMS[code]) zoom += ZOOMS[code];
    }
    const fast = keys.has('ShiftLeft') || keys.has('ShiftRight') ? 2.5 : 1;
    offset.subVectors(camera.position, controls.target);
    const distance = offset.length();

    if (forward || sideways) {
      // "Ahead" is the view direction on the ground; straight down, it is screen-up.
      camera.getWorldDirection(ahead).setY(0);
      if (ahead.lengthSq() < 1e-4) ahead.set(0, 1, 0).applyQuaternion(camera.quaternion).setY(0);
      ahead.normalize();
      across.crossVectors(ahead, UP).normalize();
      const speed = Math.max(6, distance * 0.8) * fast * step;
      shift.copy(ahead).multiplyScalar(forward * speed).addScaledVector(across, sideways * speed);
      camera.position.add(shift);
      controls.target.add(shift);
    }
    if (turn) {
      offset.applyAxisAngle(UP, turn * 1.2 * fast * step);
      camera.position.copy(controls.target).add(offset);
    }
    if (zoom) {
      const next = THREE.MathUtils.clamp(distance * Math.exp(zoom * 1.1 * fast * step), controls.minDistance, controls.maxDistance);
      offset.setLength(next);
      camera.position.copy(controls.target).add(offset);
    }
    controls.update();
  });

  return null;
}
