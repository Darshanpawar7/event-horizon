import { useLayoutEffect, useRef } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const relative = new THREE.Matrix4();

/** Material properties that decide whether two meshes can share one draw call. */
function materialKey(material) {
  if (!material || Array.isArray(material)) return null;
  // Shader materials animate their own uniforms; transparent ones must sort per object.
  if (material.isShaderMaterial || material.transparent || material.userData.noMerge) return null;
  const parts = [material.type, material.side, material.vertexColors, material.toneMapped, material.fog, material.depthWrite, material.flatShading];
  for (const key of ['color', 'emissive']) parts.push(material[key] ? material[key].getHexString() : '-');
  for (const key of ['emissiveIntensity', 'roughness', 'metalness', 'opacity']) parts.push(material[key] ?? '-');
  for (const key of ['map', 'emissiveMap', 'normalMap', 'roughnessMap', 'metalnessMap', 'alphaMap', 'aoMap']) {
    parts.push(material[key] ? material[key].uuid : '-');
  }
  return parts.join('|');
}

/** Geometries merge only with the same attribute layout. */
function geometryKey(geometry) {
  const names = Object.keys(geometry.attributes).sort().join(',');
  return `${names}|${geometry.index ? 'indexed' : 'flat'}|${Object.keys(geometry.morphAttributes).length}`;
}

/** Left alone: anything that moves, opts out, or is hidden on purpose. */
function isDynamic(object, root) {
  for (let node = object; node && node !== root; node = node.parent) {
    if (node.userData.dynamic || node.userData.noMerge || node.visible === false) return true;
  }
  return false;
}

/**
 * Draws a static subtree in a handful of draw calls.
 *
 * After its children mount, every mesh that never moves is grouped by
 * material and geometry layout, baked into world space and merged into one
 * mesh per group; the originals are detached from the scene (React keeps
 * them, so nothing is torn down) and reattached on unmount. A rail line of
 * 250 sleepers becomes one mesh; a station of a thousand parts, a few dozen.
 * Meshes marked `userData.dynamic` (or under such a group), instanced meshes,
 * shader and transparent materials are left as they are.
 *
 * Mount it with a `key` that changes when its content does (the venue id), so
 * it merges again for a new venue. The merged meshes are tagged
 * `userData.pickable` for the camera's double-click.
 */
export default function StaticMerge({ children }) {
  const rootRef = useRef(null);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;
    root.updateMatrixWorld(true);
    const inverse = root.matrixWorld.clone().invert();

    const buckets = new Map();
    root.traverse((object) => {
      if (!object.isMesh || object.isInstancedMesh || object.isSkinnedMesh) return;
      if (isDynamic(object, root)) return;
      const material = materialKey(object.material);
      if (!material) return;
      const key = `${material}#${geometryKey(object.geometry)}#${object.castShadow ? 1 : 0}${object.receiveShadow ? 1 : 0}#${object.renderOrder}`;
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key).push(object);
    });

    const merged = [];
    const detached = [];
    for (const meshes of buckets.values()) {
      if (meshes.length < 2) continue;
      const parts = meshes.map((mesh) => mesh.geometry.clone().applyMatrix4(relative.multiplyMatrices(inverse, mesh.matrixWorld)));
      const geometry = mergeGeometries(parts, false);
      for (const part of parts) part.dispose();
      if (!geometry) continue;
      geometry.computeBoundingSphere();
      const first = meshes[0];
      const mesh = new THREE.Mesh(geometry, first.material);
      mesh.castShadow = first.castShadow;
      mesh.receiveShadow = first.receiveShadow;
      mesh.renderOrder = first.renderOrder;
      mesh.matrixAutoUpdate = false;
      mesh.userData.pickable = true;
      root.add(mesh);
      merged.push(mesh);
      for (const original of meshes) {
        detached.push([original, original.parent]);
        original.parent.remove(original);
      }
    }

    return () => {
      for (const mesh of merged) {
        root.remove(mesh);
        mesh.geometry.dispose();
      }
      for (const [original, parent] of detached) parent.add(original);
    };
  }, []);

  return <group ref={rootRef}>{children}</group>;
}
