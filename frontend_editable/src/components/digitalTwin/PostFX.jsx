import { EffectComposer, N8AO, Bloom, Vignette, SMAA, ToneMapping } from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';
import { useVenueStore } from '../../store/useVenueStore';

/**
 * Screen-space effects that make the twin read as a place: ambient occlusion
 * where people and structures meet the ground, bloom on lamps, signs and
 * alert lights, ACES tone mapping, a light vignette and anti-aliasing.
 *
 * The composer switches the renderer's own tone mapping off while it runs, so
 * ACES is applied here explicitly; the low quality path keeps the renderer's
 * ACES and therefore the same colours. Disabled on the low setting (and by
 * `?quality=low`), which the headless check uses.
 *
 * @param {{night:boolean}} props bloom is stronger at night, when lamps carry the scene
 */
export default function PostFX({ night }) {
  const quality = useVenueStore((state) => state.quality);
  if (quality !== 'high') return null;
  return (
    <EffectComposer multisampling={0}>
      <N8AO aoRadius={night ? 2.2 : 1.8} intensity={night ? 2.6 : 2.0} distanceFalloff={1.2} quality="medium" halfRes />
      <Bloom luminanceThreshold={night ? 0.78 : 0.95} luminanceSmoothing={0.25} intensity={night ? 1.0 : 0.35} mipmapBlur />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      <Vignette eskil={false} offset={0.22} darkness={night ? 0.65 : 0.45} />
      <SMAA />
    </EffectComposer>
  );
}
