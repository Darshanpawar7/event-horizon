import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useVenueStore, RENDER_TIERS } from '../../store/useVenueStore';

/**
 * GPUs that cannot hold the top tier's ambient occlusion at a smooth rate,
 * by the renderer name WebGL reports: integrated Intel (not Arc), mobile
 * parts and software renderers. AUTO skips its top-tier trial on these.
 */
const MODEST_GPU = /mali|adreno|powervr|swiftshader|llvmpipe|basic render|intel(?!.*arc)/i;

function modestGpu(renderer) {
  try {
    const context = renderer.getContext();
    const info = context.getExtension('WEBGL_debug_renderer_info');
    const name = info ? context.getParameter(info.UNMASKED_RENDERER_WEBGL) : '';
    return MODEST_GPU.test(String(name));
  } catch {
    return false;
  }
}

/** Frame-rate bounds for AUTO: below the first it steps down, above the second it may step up. */
const TOO_SLOW = 40;
const SMOOTH = 56;
/** Seconds of frames per measurement, and settling time after any change. */
const WINDOW = 1.5;
const SETTLE = 2;
/** Measurements in a row above SMOOTH before trying a richer tier. */
const PATIENCE = 3;
/** A step up that falls back within this many seconds makes the lower tier the ceiling. */
const REGRET = 10;
/** AUTO may try the top tier only once, and only this soon after the page loads. */
const HIGH_TRIAL = 45;

/**
 * Keeps AUTO render quality smooth on whatever machine runs the console.
 *
 * It measures the frame rate over short windows, skipping the first couple
 * of seconds after a venue or tier change (shaders compile, the camera
 * flies). Under 40 frames a second it steps down a tier at once; after a
 * few windows over 56 it may step up. A tier it had to leave right after
 * climbing to it becomes the ceiling for the session, and the top tier is
 * tried at most once, in the first seconds after loading, so a demo in
 * progress never stutters through a trial. Pinned qualities (HIGH, MED,
 * LOW) are left alone.
 */
export default function QualityGovernor() {
  const gl = useThree((state) => state.gl);
  const quality = useVenueStore((state) => state.quality);
  const tier = useVenueStore((state) => state.renderTier);
  const venueId = useVenueStore((state) => state.venueId);

  const measure = useRef({
    frames: 0,
    time: 0,
    settle: SETTLE,
    good: 0,
    ceiling: RENDER_TIERS.length - 1,
    raisedAt: -Infinity,
    triedTop: false,
    born: typeof performance === 'undefined' ? 0 : performance.now() / 1000,
  });

  // An integrated GPU never gets the top-tier trial; it would only stutter.
  useEffect(() => {
    if (modestGpu(gl)) measure.current.triedTop = true;
  }, [gl]);

  useEffect(() => {
    const state = measure.current;
    state.frames = 0;
    state.time = 0;
    state.good = 0;
    state.settle = SETTLE;
  }, [venueId, tier, quality]);

  useFrame((_, delta) => {
    if (quality !== 'auto') return;
    const state = measure.current;
    // A hidden tab or a breakpoint is not slowness.
    if (delta > 0.5) {
      state.frames = 0;
      state.time = 0;
      return;
    }
    if (state.settle > 0) {
      state.settle -= delta;
      return;
    }
    state.frames += 1;
    state.time += delta;
    if (state.time < WINDOW) return;

    const fps = state.frames / state.time;
    state.frames = 0;
    state.time = 0;
    const index = RENDER_TIERS.indexOf(tier);
    const now = performance.now() / 1000;
    const { setRenderTier } = useVenueStore.getState();

    if (fps < TOO_SLOW && index > 0) {
      if (now - state.raisedAt < REGRET) state.ceiling = index - 1;
      setRenderTier(RENDER_TIERS[index - 1]);
      return;
    }
    const next = index + 1;
    const top = next === RENDER_TIERS.length - 1;
    const allowed = next <= state.ceiling && (!top || (!state.triedTop && now - state.born < HIGH_TRIAL));
    if (fps > SMOOTH && allowed) {
      state.good += 1;
      if (state.good >= PATIENCE) {
        if (top) state.triedTop = true;
        state.raisedAt = now;
        setRenderTier(RENDER_TIERS[next]);
      }
      return;
    }
    state.good = 0;
  });

  return null;
}
