// Procedural textures for the digital twin, drawn once on a canvas and cached.
//
// Nothing is downloaded: asphalt grain, concrete paving, sand, grass, gravel,
// signboard text and lit building windows are all generated here. That keeps
// the demo self-contained and offline while giving surfaces the small-scale
// variation that flat colours lack.

import * as THREE from 'three';

const cache = new Map();

function cached(key, make) {
  if (!cache.has(key)) cache.set(key, make());
  return cache.get(key);
}

/** Deterministic pseudo-random so a texture looks the same on every load. */
function mulberry(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function canvasTexture(canvas, repeat) {
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeat[0], repeat[1]);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

function hexToRgb(hex) {
  const value = parseInt(hex.replace('#', ''), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

/**
 * Fine grain over a base colour: asphalt, concrete, sand, soil.
 * @param {{base:string, grain?:number, size?:number, repeat?:[number,number], seed?:number, speckle?:string}} options
 */
export function grainTexture({ base, grain = 18, size = 256, repeat = [8, 8], seed = 1, speckle = null }) {
  return cached(`grain|${base}|${grain}|${size}|${repeat}|${seed}|${speckle}`, () => {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext('2d');
    const image = context.createImageData(size, size);
    const [r, g, b] = hexToRgb(base);
    const random = mulberry(seed);
    for (let i = 0; i < image.data.length; i += 4) {
      const n = (random() - 0.5) * 2 * grain;
      image.data[i] = Math.max(0, Math.min(255, r + n));
      image.data[i + 1] = Math.max(0, Math.min(255, g + n));
      image.data[i + 2] = Math.max(0, Math.min(255, b + n));
      image.data[i + 3] = 255;
    }
    context.putImageData(image, 0, 0);
    if (speckle) {
      context.fillStyle = speckle;
      for (let i = 0; i < size * 2; i += 1) {
        context.globalAlpha = 0.25 + random() * 0.4;
        context.fillRect(random() * size, random() * size, 1 + random() * 2, 1 + random() * 2);
      }
      context.globalAlpha = 1;
    }
    return canvasTexture(canvas, repeat);
  });
}

/**
 * Paving: grained tiles separated by thin joints.
 * @param {{base:string, joint:string, tiles?:number, size?:number, repeat?:[number,number], grain?:number}} options
 */
export function pavingTexture({ base, joint, tiles = 4, size = 256, repeat = [10, 10], grain = 10, seed = 3 }) {
  return cached(`paving|${base}|${joint}|${tiles}|${size}|${repeat}|${grain}`, () => {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext('2d');
    const random = mulberry(seed);
    const [r, g, b] = hexToRgb(base);
    const step = size / tiles;
    for (let y = 0; y < tiles; y += 1) {
      for (let x = 0; x < tiles; x += 1) {
        const n = (random() - 0.5) * 2 * grain;
        context.fillStyle = `rgb(${r + n},${g + n},${b + n})`;
        context.fillRect(x * step, y * step, step, step);
      }
    }
    context.strokeStyle = joint;
    context.lineWidth = Math.max(1, size / 128);
    for (let i = 0; i <= tiles; i += 1) {
      context.beginPath();
      context.moveTo(i * step, 0);
      context.lineTo(i * step, size);
      context.moveTo(0, i * step);
      context.lineTo(size, i * step);
      context.stroke();
    }
    return canvasTexture(canvas, repeat);
  });
}

/** A signboard: text on a coloured plate, sized to the plate's aspect ratio. */
export function textTexture(text, { background = '#1F2937', color = '#F9FAFB', width = 512, height = 128, font = 'bold 64px Arial', border = null } = {}) {
  return cached(`text|${text}|${background}|${color}|${width}|${height}|${font}|${border}`, () => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    context.fillStyle = background;
    context.fillRect(0, 0, width, height);
    if (border) {
      context.strokeStyle = border;
      context.lineWidth = height / 16;
      context.strokeRect(context.lineWidth / 2, context.lineWidth / 2, width - context.lineWidth, height - context.lineWidth);
    }
    context.fillStyle = color;
    context.font = font;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(text, width / 2, height / 2 + height * 0.04, width * 0.92);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 8;
    return texture;
  });
}

/**
 * A building facade with a grid of windows. Returns a colour map and an
 * emissive map in which a share of the windows are lit, for night scenes.
 * @param {{wall:string, cols:number, rows:number, lit?:number, glow?:string, seed?:number}} options
 */
export function facadeTextures({ wall, cols, rows, lit = 0.55, glow = '#FFE9B8', seed = 7, repeat = [1, 1] }) {
  return cached(`facade|${wall}|${cols}|${rows}|${lit}|${glow}|${seed}|${repeat}`, () => {
    const size = 512;
    const colour = document.createElement('canvas');
    const emissive = document.createElement('canvas');
    colour.width = colour.height = size;
    emissive.width = emissive.height = size;
    const c = colour.getContext('2d');
    const e = emissive.getContext('2d');
    const random = mulberry(seed);
    c.fillStyle = wall;
    c.fillRect(0, 0, size, size);
    e.fillStyle = '#000000';
    e.fillRect(0, 0, size, size);
    const cellW = size / cols;
    const cellH = size / rows;
    for (let y = 0; y < rows; y += 1) {
      for (let x = 0; x < cols; x += 1) {
        const px = x * cellW + cellW * 0.22;
        const py = y * cellH + cellH * 0.2;
        const w = cellW * 0.56;
        const h = cellH * 0.55;
        const isLit = random() < lit;
        c.fillStyle = isLit ? '#E7D9B0' : '#243042';
        c.fillRect(px, py, w, h);
        c.fillStyle = 'rgba(0,0,0,0.35)';
        c.fillRect(px, py, w, h * 0.08);
        if (isLit) {
          e.fillStyle = glow;
          e.globalAlpha = 0.6 + random() * 0.4;
          e.fillRect(px, py, w, h);
          e.globalAlpha = 1;
        }
      }
    }
    const map = canvasTexture(colour, repeat);
    const emissiveMap = canvasTexture(emissive, repeat);
    return { map, emissiveMap };
  });
}

// ---- presets ---------------------------------------------------------------

export const asphalt = (repeat = [10, 10]) => grainTexture({ base: '#4B4F55', grain: 14, repeat, seed: 11, speckle: '#9AA0A6' });
export const concrete = (repeat = [8, 8]) => grainTexture({ base: '#B9B6AF', grain: 10, repeat, seed: 5 });
export const platformPaving = (repeat = [6, 24]) => pavingTexture({ base: '#B8B2A6', joint: '#8E887C', tiles: 4, repeat, grain: 8 });
export const plazaPaving = (repeat = [12, 12]) => pavingTexture({ base: '#D8D4CC', joint: '#B9B4AA', tiles: 4, repeat, grain: 6 });
export const sand = (repeat = [14, 14]) => grainTexture({ base: '#D9C9A3', grain: 16, repeat, seed: 17, speckle: '#B89A6A' });
export const grass = (repeat = [16, 16]) => grainTexture({ base: '#5E8A4A', grain: 22, repeat, seed: 23, speckle: '#3E6A32' });
export const gravel = (repeat = [12, 12]) => grainTexture({ base: '#A8A197', grain: 20, repeat, seed: 29, speckle: '#6F695F' });
export const ballast = (repeat = [4, 40]) => grainTexture({ base: '#6B6A66', grain: 26, repeat, seed: 31, speckle: '#3A3936' });
export const soil = (repeat = [12, 12]) => grainTexture({ base: '#8A6E4B', grain: 18, repeat, seed: 37 });

/** Named surfaces a venue can ask for on a plane, box, ramp or its ground. */
export const SURFACES = {
  asphalt,
  concrete,
  platform: platformPaving,
  plaza: plazaPaving,
  sand,
  grass,
  gravel,
  ballast,
  soil,
};

/** @param {string|undefined} name @param {[number, number]} [repeat] */
export function surfaceTexture(name, repeat) {
  return name && SURFACES[name] ? SURFACES[name](repeat) : null;
}
