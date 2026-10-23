import { EffectComposer, N8AO, Bloom, Vignette, SMAA, ToneMapping } from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';
import { useVenueStore } from '../../store/useVenueStore';

/**
 * Screen-space effects that make the twin read as a place, by render tier:
 *
 * - high: ambient occlusion where people and structures meet the ground,
 *   bloom on lamps, signs and alert lights, ACES tone mapping, a light
 *   vignette and SMAA anti-aliasing.
 * - medium: the same without ambient occlusion, which even at its cheapest
 *   setting halves the frame rate on an integrated GPU.
 * - low: tone mapping and vignette only.
 *
 * The composer stays mounted on every tier. Mounting or unmounting it
 * switches the renderer's own tone mapping, and that recompiles every
 * material in the scene: seconds of frozen picture on an integrated GPU, in
 * the middle of an AUTO tier change. The canvas is created `flat` (no
 * renderer tone mapping) for the same reason, so this chunk arriving after
 * the first frames recompiles nothing either. ACES is therefore applied here.
 *
 * @param {{night:boolean}} props bloom is stronger at night, when lamps carry the scene
 */
export default function PostFX({ night }) {
  const tier = useVenueStore((state) => state.renderTier);
  const rich = tier !== 'low';
  return (
    <EffectComposer multisampling={0}>
      {tier === 'high' && (
        <N8AO aoRadius={night ? 2.2 : 1.8} intensity={night ? 2.6 : 2.0} distanceFalloff={1.2} quality="medium" halfRes />
      )}
      {rich && <Bloom luminanceThreshold={night ? 0.78 : 0.95} luminanceSmoothing={0.25} intensity={night ? 1.0 : 0.35} mipmapBlur />}
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      <Vignette eskil={false} offset={0.22} darkness={night ? 0.65 : 0.45} />
      {rich && <SMAA />}
    </EffectComposer>
  );
}
