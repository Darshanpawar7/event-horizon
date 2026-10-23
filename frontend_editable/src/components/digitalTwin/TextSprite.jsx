import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const cache = new Map();
const FONT = '"Consolas", "Menlo", "DejaVu Sans Mono", monospace';
/** Tallest a label may appear on screen, in CSS pixels, however close the camera gets. */
const MAX_PIXELS = 24;

// Reused every frame rather than allocated per label.
const scratch = new THREE.Vector3();

/** One canvas texture per distinct label, shared by every sprite that shows it. */
function labelTexture(text, background, color, border) {
  const key = `${text}|${background}|${color}|${border}`;
  if (cache.has(key)) return cache.get(key);
  const fontSize = 48;
  const font = `900 ${fontSize}px ${FONT}`;
  const measure = document.createElement('canvas').getContext('2d');
  measure.font = font;
  const width = Math.ceil(measure.measureText(text).width) + 44;
  const height = fontSize + 30;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  context.fillStyle = background;
  context.fillRect(0, 0, width, height);
  if (border) {
    context.strokeStyle = border;
    context.lineWidth = 6;
    context.strokeRect(3, 3, width - 6, height - 6);
  }
  context.font = font;
  context.fillStyle = color;
  context.textBaseline = 'middle';
  context.fillText(text, 22, height / 2 + 2);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  const entry = { texture, aspect: width / height };
  cache.set(key, entry);
  return entry;
}

/**
 * A text label that lives in the scene as a sprite: always facing the camera,
 * shrinking with distance, drawn over geometry so it stays readable. Unlike
 * an HTML overlay it creates no DOM, so dozens can come and go when the venue
 * changes without any cost to the page.
 *
 * Up close a world-sized label would fill the view, so its height is capped
 * at `maxPixels` on screen; from further away it shrinks like the scene.
 *
 * @param {{text:string, position:[number,number,number], height?:number, background?:string,
 *   color?:string, border?:string|null, visible?:boolean, maxPixels?:number}} props
 */
export default function TextSprite({
  text,
  position,
  height = 1.0,
  background = 'rgba(17, 24, 39, 0.9)',
  color = '#D9DDE3',
  border = null,
  visible = true,
  maxPixels = MAX_PIXELS,
}) {
  const spriteRef = useRef(null);
  const { texture, aspect } = useMemo(() => labelTexture(text, background, color, border), [text, background, color, border]);

  useFrame(({ camera, size }) => {
    const sprite = spriteRef.current;
    if (!sprite || !sprite.visible || !camera.isPerspectiveCamera) return;
    const distance = camera.position.distanceTo(sprite.getWorldPosition(scratch));
    // The world height that spans `maxPixels` at this distance.
    const cap = (maxPixels * 2 * distance * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2)) / size.height;
    const shown = Math.min(height, cap);
    sprite.scale.set(shown * aspect, shown, 1);
  });

  return (
    <sprite ref={spriteRef} position={position} scale={[height * aspect, height, 1]} renderOrder={10} visible={visible}>
      <spriteMaterial map={texture} depthTest={false} depthWrite={false} transparent toneMapped={false} />
    </sprite>
  );
}
