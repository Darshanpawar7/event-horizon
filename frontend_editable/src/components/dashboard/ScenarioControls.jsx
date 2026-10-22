import { useVenueStore } from '../../store/useVenueStore';
import { useVenue } from '../../store/derived';
import { VENUES, VENUE_IDS } from '../../data/venues';
import { NEO, MONO, HARD } from '../../theme';

/**
 * The five evidence states the backend can report. In demo mode these switch
 * the simulated scenario; in backend mode they drive POST /api/demo/scenario
 * and the next poll reports whatever the backend actually returns.
 */
const EVIDENCE_STATES = [
  { id: 'clear', label: 'CLEAR', icon: '◉', accent: NEO.green },
  { id: 'tracking', label: 'NO TRACK', icon: '⊘', accent: NEO.grey },
  { id: 'visibility', label: 'DEGRADED', icon: '▩', accent: NEO.red },
  { id: 'camera', label: 'CAM MOVE', icon: '⇅', accent: NEO.amber },
  { id: 'collective', label: 'COLLECTIVE', icon: '⇄', accent: NEO.orange },
];

/** Button styling for the timelines a venue offers. Branches live in the timeline panel. */
const TIMELINE_STYLE = {
  surge: { label: 'EGRESS SURGE', icon: '▼', accent: NEO.orange },
  crush: { label: 'CRUSH CONDITIONS', icon: '⊗', accent: NEO.crimson },
  incident: { label: 'AS REPORTED', icon: '◷', accent: NEO.crimson },
};

export default function ScenarioControls() {
  const venue = useVenue();
  const scenario = useVenueStore((state) => state.scenario);
  const setScenario = useVenueStore((state) => state.setScenario);
  const setVenue = useVenueStore((state) => state.setVenue);
  const mode = useVenueStore((state) => state.mode);

  const timelines = Object.values(venue.timelines).filter((timeline) => !timeline.branchOf);
  const historic = venue.kind === 'historic';

  const renderButton = (entry, columns, active, onClick) => (
    <button
      key={entry.id}
      type="button"
      onClick={onClick}
      title={entry.title}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '4px',
        padding: '9px 2px',
        border: `2px solid ${active ? entry.accent : NEO.ink}`,
        background: active ? entry.accent : NEO.surface,
        color: active ? NEO.surface : NEO.ink,
        fontFamily: MONO,
        fontSize: '8px',
        fontWeight: 'bold',
        letterSpacing: '0.04em',
        cursor: 'pointer',
        textTransform: 'uppercase',
        transition: 'all 0.15s ease',
        borderRadius: '2px',
        gridColumn: `span ${columns}`,
        minWidth: 0,
      }}
    >
      <span style={{ fontSize: '16px', lineHeight: 1 }}>{entry.icon}</span>
      <span style={{ textAlign: 'center', lineHeight: 1.3 }}>{entry.label}</span>
    </button>
  );

  return (
    <div style={shellStyle}>
      <p style={captionStyle}>▸ VENUE {mode === 'backend' ? '(TWIN GEOMETRY · BACKEND EVIDENCE)' : '(SIMULATED)'}</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '6px' }}>
        {VENUE_IDS.map((id) => {
          const entry = VENUES[id];
          return renderButton(
            {
              id,
              label: entry.short,
              icon: entry.kind === 'historic' ? '▣' : '◫',
              accent: entry.kind === 'historic' ? NEO.crimson : NEO.ink,
              title: entry.name,
            },
            1,
            id === venue.id,
            () => setVenue(id),
          );
        })}
      </div>

      <p style={{ ...captionStyle, margin: '14px 0 12px' }}>
        ▸ EVIDENCE STATE {mode === 'backend' ? '(DRIVES BACKEND)' : '(SIMULATED)'}
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: '6px' }}>
        {EVIDENCE_STATES.map((entry) => renderButton(entry, 2, scenario === entry.id, () => setScenario(entry.id)))}
      </div>

      <p style={{ ...captionStyle, margin: '14px 0 12px' }}>
        ▸ {historic ? 'RECONSTRUCTION (SIMULATED FROM PUBLISHED ACCOUNTS)' : 'CROWD TIMELINE (SIMULATED)'}
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: '6px' }}>
        {timelines.map((timeline) => {
          const style = TIMELINE_STYLE[timeline.id] || { label: timeline.id.toUpperCase(), icon: '◷', accent: NEO.orange };
          const active = scenario === timeline.id || venue.timelines[scenario]?.branchOf === timeline.id;
          return renderButton(
            { id: timeline.id, ...style, title: timeline.title },
            Math.floor(10 / timelines.length),
            active,
            () => setScenario(timeline.id),
          );
        })}
      </div>

      <p style={noteStyle}>
        {historic
          ? 'The reconstruction replays the mechanics of a real disaster from published accounts through a crowd-flow ' +
            'model. It is not footage, not an official finding and not a prediction. Its counterfactual — the same ' +
            'model with an operator acting on the projection’s warning — is in the timeline panel below.'
          : 'Timelines run a scripted egress: the concourse fills, the exit funnel congests, and in the second one two ' +
            'gates are lost so the funnel reaches crush densities. Both are authored simulations for rehearsal, not ' +
            'recordings and not predictions.'}
      </p>
    </div>
  );
}

const shellStyle = {
  background: NEO.surface,
  border: HARD.border,
  boxShadow: HARD.shadow,
  borderRadius: '4px',
  padding: '14px',
  marginBottom: '14px',
};

const captionStyle = {
  fontFamily: MONO,
  fontSize: '10px',
  fontWeight: 'bold',
  letterSpacing: '0.12em',
  color: NEO.grey,
  textTransform: 'uppercase',
  margin: '0 0 12px 0',
};

const noteStyle = {
  fontFamily: MONO,
  fontSize: '8px',
  lineHeight: 1.7,
  color: NEO.grey,
  margin: '12px 0 0',
};
