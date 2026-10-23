import { useVenueStore } from '../../store/useVenueStore';
import { useScene, useTimeline, useZones } from '../../store/derived';
import { formatClock } from '../../data/crowdTimeline';
import { NEO, MONO, HARD, densityBand } from '../../theme';

/**
 * The incident, readable from across the room: the clock, the phase, the
 * densest zone and the band it is in, with a button that flies the camera to
 * it. Shown only while a timeline is playing. Every figure here is simulated
 * and the strip says so.
 */
export default function IncidentHud() {
  const timeline = useTimeline();
  const scene = useScene();
  const zones = useZones();
  const focusZone = useVenueStore((state) => state.focusZone);
  const focusOn = useVenueStore((state) => state.focusOn);

  if (!timeline) return null;

  const peak = zones.reduce(
    (best, zone) => (zone.currentDensity > (best?.currentDensity ?? -1) ? zone : best),
    null,
  );
  const density = peak?.currentDensity ?? null;
  const band = densityBand(density);
  const alarmed = band.key === 'crush' || band.key === 'critical';
  const focused = focusZone === peak?.id;

  return (
    <div style={{ ...shellStyle, borderColor: alarmed ? band.color : NEO.ink }}>
      <div style={rowStyle}>
        <span style={clockStyle}>{formatClock(timeline.clockT)}</span>
        <span style={phaseStyle}>{timeline.phase.label.toUpperCase()}</span>
        <span style={{ ...tagStyle, color: NEO.amber, borderColor: NEO.amber }}>SIMULATED</span>
      </div>

      <div style={{ ...bandStyle, background: band.color, color: band.key === 'free' || band.key === 'restricted' ? NEO.ink : NEO.surface }}>
        <span style={{ fontSize: 20, fontWeight: 900 }}>{density == null ? '—' : `${density.toFixed(1)}`}</span>
        <span style={{ fontSize: 9, opacity: 0.9 }}>persons/m²</span>
        <span style={{ fontSize: 10, fontWeight: 900, letterSpacing: '0.1em', marginLeft: 6 }}>{band.label}</span>
        <span style={{ fontSize: 9, opacity: 0.9, marginLeft: 'auto' }}>{peak ? `${peak.id} · ${peak.label}` : ''}</span>
      </div>

      <div style={rowStyle}>
        <span style={{ fontSize: 9, color: alarmed ? NEO.red : NEO.grey, fontWeight: 900, flex: 1, minWidth: 0 }}>
          {scene.issue ? `⚠ ${scene.issue.toUpperCase()}` : 'NO THRESHOLD EXCEEDED · NOT AN ALL-CLEAR'}
        </span>
        {peak && (
          <button type="button" onClick={() => focusOn(peak.id)} style={{ ...buttonStyle, background: focused ? NEO.ink : NEO.surface, color: focused ? NEO.surface : NEO.ink }}>
            {focused ? 'RESET VIEW' : `FOCUS ${peak.id}`}
          </button>
        )}
      </div>
    </div>
  );
}

const shellStyle = {
  position: 'absolute',
  top: 86,
  left: '50%',
  transform: 'translateX(-50%)',
  zIndex: 10,
  width: 330,
  pointerEvents: 'auto',
  background: NEO.surface,
  border: '2px solid',
  boxShadow: HARD.shadowSm,
  borderRadius: 2,
  fontFamily: MONO,
  color: NEO.ink,
  padding: 8,
  display: 'grid',
  gap: 6,
};

const rowStyle = { display: 'flex', alignItems: 'center', gap: 8 };

const clockStyle = { fontSize: 16, fontWeight: 900, letterSpacing: '0.04em' };

const phaseStyle = { fontSize: 9, fontWeight: 900, letterSpacing: '0.08em', color: NEO.grey, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' };

const tagStyle = { fontSize: 7, fontWeight: 900, letterSpacing: '0.1em', border: '1px solid', padding: '1px 5px' };

const bandStyle = { display: 'flex', alignItems: 'baseline', gap: 6, padding: '6px 9px', borderRadius: 2 };

const buttonStyle = {
  border: `2px solid ${NEO.ink}`,
  fontFamily: MONO,
  fontSize: 8,
  fontWeight: 900,
  letterSpacing: '0.08em',
  padding: '4px 8px',
  cursor: 'pointer',
  borderRadius: 2,
};
