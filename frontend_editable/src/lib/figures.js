import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/**
 * Human figures for the crowd, built for drawing thousands of people every
 * frame on an integrated GPU.
 *
 * A figure is one mesh: legs, body and head merged into a single geometry,
 * with a `part` attribute (0 legs, 1 body, 2 head) so each part takes its own
 * colour from three per-instance colour attributes. One matrix per figure
 * per frame instead of three, and colours that are written once per venue
 * instead of every frame.
 */

/** Metres from the feet to the centre of each part, for a figure of build 1. */
const LEGS_Y = 0.42;
const BODY_Y = 1.12;
const HEAD_Y = 1.63;

let baseGeometry = null;

function tagged(geometry, part, y) {
  geometry.translate(0, y, 0);
  const tags = new Float32Array(geometry.attributes.position.count).fill(part);
  geometry.setAttribute('part', new THREE.BufferAttribute(tags, 1));
  return geometry;
}

/** The shared figure shape: about 190 triangles, feet at the origin, facing +z. */
function figureBase() {
  if (baseGeometry) return baseGeometry;
  const parts = [
    tagged(new THREE.BoxGeometry(0.3, 0.84, 0.22), 0, LEGS_Y),
    tagged(new THREE.CapsuleGeometry(0.2, 0.46, 3, 7), 1, BODY_Y),
    tagged(new THREE.SphereGeometry(0.13, 7, 5), 2, HEAD_Y),
  ];
  baseGeometry = mergeGeometries(parts, false);
  for (const part of parts) part.dispose();
  return baseGeometry;
}

/**
 * A geometry for one instanced crowd mesh: its own copy of the figure shape
 * (a few kilobytes, so disposing one mesh can never free buffers another is
 * drawing with) plus this mesh's per-instance colours.
 *
 * @param {Float32Array} trousers rgb per instance
 * @param {Float32Array} clothes rgb per instance
 * @param {Float32Array} skin rgb per instance
 */
export function figureGeometry(trousers, clothes, skin) {
  const geometry = figureBase().clone();
  geometry.setAttribute('trouserColor', new THREE.InstancedBufferAttribute(trousers, 3));
  geometry.setAttribute('clothColor', new THREE.InstancedBufferAttribute(clothes, 3));
  geometry.setAttribute('skinColor', new THREE.InstancedBufferAttribute(skin, 3));
  return geometry;
}

export function disposeFigureGeometry(geometry) {
  geometry.dispose();
}

/**
 * Lambert shading (people are matte; no specular term to pay for under every
 * lamp) with each part coloured from its per-instance attribute.
 */
export function figureMaterial() {
  const material = new THREE.MeshLambertMaterial({ vertexColors: true });
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        '#include <common>\nattribute float part;\nattribute vec3 trouserColor;\nattribute vec3 clothColor;\nattribute vec3 skinColor;',
      )
      // three's own chunk first (it sets alpha to 1 whether vColor is a vec3 or,
      // as in r184, a vec4), then the part's colour over the rgb.
      .replace(
        '#include <color_vertex>',
        '#include <color_vertex>\nvColor.rgb = part < 0.5 ? trouserColor : ( part < 1.5 ? clothColor : skinColor );',
      );
  };
  material.customProgramCacheKey = () => 'event-horizon-figure';
  return material;
}

/**
 * Writes one figure's matrix straight into an instance buffer: stand at
 * (x, y, z), face `yaw` (given as its cosine and sine), lean `lean` radians
 * toward the heading, scale `width` across and `height` up. Small-angle
 * maths for the lean, which never exceeds a few degrees.
 */
export function writeFigure(array, offset, x, y, z, cosYaw, sinYaw, lean, width, height) {
  const cl = 1 - 0.5 * lean * lean;
  array[offset] = cosYaw * width;
  array[offset + 1] = 0;
  array[offset + 2] = -sinYaw * width;
  array[offset + 3] = 0;
  array[offset + 4] = sinYaw * lean * height;
  array[offset + 5] = cl * height;
  array[offset + 6] = cosYaw * lean * height;
  array[offset + 7] = 0;
  array[offset + 8] = sinYaw * cl * width;
  array[offset + 9] = -lean * width;
  array[offset + 10] = cosYaw * cl * width;
  array[offset + 11] = 0;
  array[offset + 12] = x;
  array[offset + 13] = y;
  array[offset + 14] = z;
  array[offset + 15] = 1;
}

let contactShape = null;
let contactMap = null;

/**
 * A soft dark disc under each figure's feet: the contact shadow that grounds
 * a crowd when there is no real shadow (every night scene) or no ambient
 * occlusion (below the top render tier). Drawn as a second instanced mesh
 * that shares the figures' instance matrices, so it costs no extra upload.
 */
export function contactGeometry() {
  if (!contactShape) contactShape = new THREE.PlaneGeometry(0.85, 0.85).rotateX(-Math.PI / 2).translate(0, 0.03, 0);
  return contactShape;
}

export function contactMaterial(opacity) {
  if (!contactMap) {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const context = canvas.getContext('2d');
    const gradient = context.createRadialGradient(32, 32, 2, 32, 32, 31);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.55, 'rgba(255, 255, 255, 0.55)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, 64, 64);
    contactMap = new THREE.CanvasTexture(canvas);
  }
  return new THREE.MeshBasicMaterial({
    color: 0x000000,
    map: contactMap,
    transparent: true,
    opacity,
    depthWrite: false,
    toneMapped: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });
}

/** Uploads only the first `count` instances of a matrix buffer this frame. */
export function markMatrices(mesh, count) {
  const attribute = mesh.instanceMatrix;
  attribute.clearUpdateRanges();
  attribute.addUpdateRange(0, Math.max(1, count) * 16);
  attribute.needsUpdate = true;
}

/** Fills an rgb array from a list of hex colours chosen per index. */
export function fillColours(target, count, pick) {
  const colour = new THREE.Color();
  for (let i = 0; i < count; i += 1) {
    colour.set(pick(i));
    target[i * 3] = colour.r;
    target[i * 3 + 1] = colour.g;
    target[i * 3 + 2] = colour.b;
  }
  return target;
}
