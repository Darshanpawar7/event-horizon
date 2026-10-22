import { useVenueStore } from '../../store/useVenueStore';
import { useTimeline, useZones, useVenue } from '../../store/derived';
import { formatClock, formatDuration } from '../../data/crowdTimeline';
import { NEO, MONO, HARD, DENSITY_BANDS, densityBand } from '../../theme';

const RATES = [1, 4, 10];

/**
 * Playback for the timeline scenarios.
 *
 * The point of the panel is the lead time: the operator can watch the +1/+2/+3 s
 * projection cross the configured threshold, then keep watching until the crowd
 * actually reaches the densities crowd-safety literature associates with a
 * crush, and read off how much warning there was in between. On a historic
 * reconstruction the panel also switches to the counterfactual branch — the
 * same model with an operator acting on that warning — and compares the two.
 * Every number here is simulation; it says nothing about any real venue.
 */
export default function TimelineControls() {
  const venue = useVenue();
  const timeline = useTimeline();
  const zones = useZones();
  const playing = useVenueStore((state) => state.playing);
  const playbackRate = useVenueStore((state) => state.playbackRate);
  const horizon = useVenueStore((state) => state.horizon);
  const scenario = useVenueStore((state) => state.scenario);
  const setClock = useVenueStore((state) => state.setClock);
  const togglePlay = useVenueStore((state) => state.togglePlay);
  const setPlaybackRate = useVenueStore((state) => state.setPlaybackRate);
  const switchBranch = useVenueStore((state) => state.switchBranch);

  if (!timeline) return null;

  const peak = zones.reduce(
    (best, zone) => (zone.currentDensity > (best?.currentDensity ?? -1) ? zone : best),
    null,
  );
  const density = peak?.currentDensity ?? null;
  const band = densityBand(density);
  const progress = ((timeline.clockT - timeline.start) / (timeline.end - timeline.start)) * 100;

  // The reconstruction and its counterfactual, when this venue has them.
  const spec = venue.timelines[scenario];
  const rootId = spec?.branchOf || scenario;
  const branches = Object.values(venue.timelines).filter(
    (candidate) => candidate.id === rootId || candidate.branchOf === rootId,
  );
  const intervention = timeline.intervention;

  return (
    <div style={shellStyle}>
      <div style={{ ...headStyle, borderBottom: `2px solid ${band.color}` }}>
        <span style={{ color: band.color }}>◷</span>
        {timeline.kind === 'model' ? 'SIMULATED CROWD-FLOW MODEL' : 'SIMULATED CROWD TIMELINE'}
        <span style={{ marginLeft: 'auto', color: NEO.amber, fontSize: 8 }}>SIMULATED</span>
      </div>

      <div style={bodyStyle}>
        {branches.length > 1 && (
          <div style={branchRowStyle}>
            {branches.map((candidate) => {
              const active = candidate.id === scenario;
              const counterfactual = Boolean(candidate.branchOf);
              return (
                <button
                  key={candidate.id}
                  type="button"
                  onClick={() => switchBranch(candidate.id)}
                  aria-pressed={active}
                  style={{
                    ...branchButtonStyle,
                    background: active ? (counterfactual ? NEO.green : NEO.crimson) : NEO.surface,
                    color: active ? NEO.surface : NEO.ink,
                    borderColor: active ? (counterfactual ? NEO.green : NEO.crimson) : NEO.ink,
                  }}
                >
                  {counterfactual ? 'WITH THE WARNING ACTED ON' : 'AS REPORTED'}
                </button>
              );
            })}
          </div>
        )}

        <div style={{ fontSize: 10, fontWeight: 900, color: NEO.ink, marginBottom: 4 }}>{timeline.title}</div>
        <div style={{ fontSize: 9, color: NEO.grey, lineHeight: 1.6, marginBottom: 12 }}>{timeline.summary}</div>

        {/* Transport */}
        <div style={transportStyle}>
          <button type="button" onClick={togglePlay} style={playButtonStyle} aria-pressed={playing}>
            {playing ? '❚❚ PAUSE' : '▶ PLAY'}
          </button>
          <div style={{ display: 'flex', gap: 3 }}>
            {RATES.map((rate) => (
              <button
                key={rate}
                type="button"
                onClick={() => setPlaybackRate(rate)}
                style={{
                  ...rateButtonStyle,
                  background: playbackRate === rate ? NEO.ink : NEO.surface,
                  color: playbackRate === rate ? NEO.surface : NEO.ink,
                }}
              >
                {rate}×
              </button>
            ))}
          </div>
          <span style={{ marginLeft: 'auto', fontSize: 16, fontWeight: 900, color: NEO.ink }}>
            {formatClock(timeline.clockT)}
          </span>
        </div>

        {/* Scrubber with one tick per authored phase, the warning and the operator action */}
        <div style={{ position: 'relative', marginBottom: 10 }}>
          <div style={trackStyle}>
            <div style={{ width: `${progress}%`, background: band.color, height: '100%' }} />
          </div>
          <div style={ticksStyle}>
            {timeline.phases.map((phase, index) => (
              <span
                key={`${phase.t}-${phase.label}`}
                title={`${formatClock(phase.t)} — ${phase.label}`}
                style={{
                  ...tickStyle,
                  left: `${((phase.t - timeline.start) / (timeline.end - timeline.start)) * 100}%`,
                  background: index === timeline.phaseIndex ? NEO.ink : NEO.line,
                }}
              />
            ))}
            {timeline.lead?.warnAt != null && (
              <span
                title={`${formatClock(timeline.lead.warnAt)} — projection crosses threshold`}
                style={{
                  ...tickStyle,
                  height: 10,
                  left: `${((timeline.lead.warnAt - timeline.start) / (timeline.end - timeline.start)) * 100}%`,
                  background: NEO.amber,
                }}
              />
            )}
            {intervention?.at != null && (
              <span
                title={`${formatClock(intervention.at)} — operator acts`}
                style={{
                  ...tickStyle,
                  height: 10,
                  left: `${((intervention.at - timeline.start) / (timeline.end - timeline.start)) * 100}%`,
                  background: NEO.green,
                }}
              />
            )}
          </div>
          <input
            type="range"
            min={timeline.start}
            max={timeline.end}
            step={1}
            value={Math.round(timeline.clockT)}
            onChange={(event) => setClock(Number(event.target.value))}
            aria-label="Timeline position in seconds relative to T0"
            style={scrubberStyle}
          />
        </div>

        {/* Current phase */}
        <div style={{ ...phaseStyle, borderLeft: `3px solid ${band.color}` }}>
          <div style={{ fontSize: 10, fontWeight: 900, color: NEO.ink }}>
            {formatClock(timeline.phase.t)} · {timeline.phase.label.toUpperCase()}
          </div>
          <div style={{ fontSize: 9, color: NEO.grey, lineHeight: 1.6, marginTop: 3 }}>{timeline.phase.note}</div>
        </div>

        {/* Peak density, counterflow, people held outside the view */}
        <div style={{ display: 'grid', gridTemplateColumns: timeline.outside > 0 ? '1fr 1fr 1fr' : '1fr 1fr', gap: 8, marginTop: 10 }}>
          <Readout
            label={`Peak density · ${peak?.id || '—'}`}
            value={density == null ? '—' : `${density.toFixed(2)} /m²`}
            note={band.label}
            color={band.color}
          />
          <Readout
            label="Counterflow"
            value={`${Math.round(timeline.counterflow * 100)}%`}
            note="SIMULATED SHARE MOVING AGAINST THE MAIN DIRECTION"
            color={timeline.counterflow > 0.2 ? NEO.red : NEO.grey}
          />
          {timeline.outside > 0 && (
            <Readout
              label="Held outside view"
              value={`${timeline.outside}`}
              note="ARRIVALS WAITING BEYOND THE CAMERAS — NOT COUNTED"
              color={NEO.violet}
            />
          )}
        </div>

        {/* The preventive claim, stated with its limits */}
        <div style={leadStyle}>
          <LeadTime lead={timeline.lead} horizon={horizon} />
        </div>

        {intervention && <Intervention intervention={intervention} />}

        {timeline.baseline && <Comparison stats={timeline.stats} baseline={timeline.baseline} />}

        {/* Reference bands */}
        <div style={bandRowStyle}>
          {DENSITY_BANDS.map((entry) => (
            <span
              key={entry.key}
              style={{
                ...bandChipStyle,
                background: entry.key === band.key ? entry.color : NEO.surface,
                color: entry.key === band.key ? NEO.surface : NEO.grey,
                borderColor: entry.color,
              }}
            >
              {entry.label}
            </span>
          ))}
        </div>
        <div style={footnoteStyle}>
          Density is people ÷ the {Math.round(venue.cellArea)} m² a zone cell stands for in this simulated venue. The
          backend counts tracks in image cells and makes no area claim, so no persons-per-square-metre figure appears
          in backend mode. Band boundaries are published crowd-safety reference levels, not thresholds validated here,
          and nothing on this panel establishes that a crowd is safe.
        </div>
      </div>
    </div>
  );
}

/**
 * The whole point of the panel: how far ahead of the condition the projection
 * crossed the operator's threshold, and what that number does not mean.
 */
function LeadTime({ lead, horizon }) {
  const onset = `${lead.onsetDensity.toFixed(1)} persons/m² — ${lead.onsetLabel}`;

  if (lead.onsetAt == null) {
    return (
      <>
        This timeline never reaches {onset}, so there is no onset to measure warning against.
        {lead.warnAt != null && (
          <> The +{horizon}s projection still crosses the threshold at {formatClock(lead.warnAt)}.</>
        )}
      </>
    );
  }

  if (lead.warnAt == null) {
    return (
      <>
        The +{horizon}s projection never crosses the configured threshold, while the simulated crowd
        reaches {onset} at {formatClock(lead.onsetAt)}. Lower the threshold to get a warning at all.
      </>
    );
  }

  if (lead.leadSeconds <= 0) {
    return (
      <>
        <strong style={{ color: NEO.red }}>No usable warning.</strong> The threshold is set so high
        that the +{horizon}s projection does not cross it until {formatClock(lead.warnAt)}, after the
        crowd reaches {onset} at {formatClock(lead.onsetAt)}. Lower it.
      </>
    );
  }

  return (
    <>
      <strong style={{ color: NEO.ink }}>{formatDuration(lead.leadSeconds)} of warning.</strong> The +{horizon}s
      projection first crosses the configured threshold at {formatClock(lead.warnAt)}; this simulated
      crowd first reaches {onset} at {formatClock(lead.onsetAt)}. Whether that warning is usable
      depends on who can act on it and how fast, not on this console — and both numbers come from a
      simulation, so neither is evidence about any real venue.
    </>
  );
}

/** What the operator did in the counterfactual branch, and when. */
function Intervention({ intervention }) {
  if (intervention.at == null) {
    return (
      <div style={{ ...interventionStyle, borderColor: NEO.grey }}>
        <div style={interventionHeadStyle}>NO WARNING AT THIS THRESHOLD</div>
        <div style={{ fontSize: 9, color: NEO.grey, lineHeight: 1.6 }}>
          The projection never crosses the configured threshold on this timeline, so there is nothing for
          an operator to act on and this branch is identical to the reconstruction. Lower the threshold.
        </div>
      </div>
    );
  }
  const actions = intervention.actions.filter(Boolean);
  return (
    <div style={interventionStyle}>
      <div style={interventionHeadStyle}>
        OPERATOR ACTS AT {formatClock(intervention.at)} · {intervention.reactionSeconds}s AFTER THE WARNING AT{' '}
        {formatClock(intervention.warnAt)}
      </div>
      <div style={{ fontSize: 9, fontWeight: 900, color: NEO.ink, margin: '4px 0 6px' }}>{intervention.title}</div>
      <ul style={actionListStyle}>
        {actions.map((action) => (
          <li key={action} style={{ marginBottom: 3 }}>
            {action}
          </li>
        ))}
      </ul>
      <div style={{ fontSize: 8, color: NEO.grey, lineHeight: 1.6, marginTop: 6 }}>
        {intervention.note} Everything after this moment is a counterfactual: the same model, with the
        operator’s actions applied. It shows what the warning was worth, not what would have happened.
      </div>
    </div>
  );
}

/** The two branches side by side: what the warning, acted on, changed in the model. */
function Comparison({ stats, baseline }) {
  const rows = [
    ['Peak simulated density', `${baseline.peakDensity.toFixed(2)} /m²`, `${stats.peakDensity.toFixed(2)} /m²`],
    ['Time at or above crush risk (3.5/m²)', formatDuration(baseline.secondsAbove.crush), formatDuration(stats.secondsAbove.crush)],
    ['Time at or above critical (5/m²)', formatDuration(baseline.secondsAbove.critical), formatDuration(stats.secondsAbove.critical)],
    ['Most people held outside the view', `${baseline.outsideMax}`, `${stats.outsideMax}`],
  ];
  return (
    <div style={comparisonStyle}>
      <div style={comparisonHeadStyle}>
        <span />
        <span style={{ color: NEO.crimson }}>AS REPORTED</span>
        <span style={{ color: NEO.green }}>WARNING ACTED ON</span>
      </div>
      {rows.map(([label, before, after]) => (
        <div key={label} style={comparisonRowStyle}>
          <span style={{ color: NEO.grey }}>{label}</span>
          <span style={{ fontWeight: 900 }}>{before}</span>
          <span style={{ fontWeight: 900, color: NEO.ink }}>{after}</span>
        </div>
      ))}
      <div style={{ fontSize: 8, color: NEO.grey, lineHeight: 1.6, marginTop: 6 }}>
        Both columns are outputs of the same simulated model. They compare two runs of a simulation, not a
        real event with a hypothetical one, and they say nothing about whether any particular death was
        preventable.
      </div>
    </div>
  );
}

function Readout({ label, value, note, color }) {
  return (
    <div style={readoutStyle}>
      <div style={{ fontSize: 8, color: NEO.grey, letterSpacing: '0.08em', fontWeight: 900 }}>{label.toUpperCase()}</div>
      <div style={{ fontSize: 17, fontWeight: 900, color, lineHeight: 1.2 }}>{value}</div>
      <div style={{ fontSize: 7, color: NEO.grey, marginTop: 2 }}>{note}</div>
    </div>
  );
}

const shellStyle = {
  border: HARD.border,
  background: NEO.surface,
  borderRadius: 4,
  boxShadow: HARD.shadow,
  marginBottom: 14,
  overflow: 'hidden',
  fontFamily: MONO,
};

const headStyle = {
  background: NEO.inkDeep,
  color: NEO.surface,
  padding: '10px 14px',
  fontSize: 10,
  fontWeight: 900,
  letterSpacing: '0.12em',
  display: 'flex',
  alignItems: 'center',
  gap: 8,
};

const bodyStyle = { padding: 14 };

const branchRowStyle = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 12 };

const branchButtonStyle = {
  border: '2px solid',
  fontFamily: MONO,
  fontSize: 9,
  fontWeight: 900,
  letterSpacing: '0.08em',
  padding: '8px 6px',
  cursor: 'pointer',
  borderRadius: 2,
  boxShadow: HARD.shadowSm,
};

const transportStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  marginBottom: 12,
  flexWrap: 'wrap',
};

const playButtonStyle = {
  border: HARD.border,
  background: NEO.orange,
  color: NEO.surface,
  fontFamily: MONO,
  fontSize: 10,
  fontWeight: 900,
  letterSpacing: '0.08em',
  padding: '6px 12px',
  cursor: 'pointer',
  borderRadius: 2,
  boxShadow: HARD.shadowSm,
};

const rateButtonStyle = {
  border: HARD.border,
  fontFamily: MONO,
  fontSize: 9,
  fontWeight: 900,
  padding: '6px 8px',
  cursor: 'pointer',
  borderRadius: 2,
};

const trackStyle = {
  height: 8,
  border: HARD.border,
  background: NEO.bg,
  overflow: 'hidden',
};

const ticksStyle = { position: 'relative', height: 10, marginTop: 2 };

const tickStyle = { position: 'absolute', width: 2, height: 7, marginLeft: -1 };

const scrubberStyle = {
  width: '100%',
  marginTop: 4,
  accentColor: NEO.ink,
  cursor: 'pointer',
};

const phaseStyle = {
  background: NEO.bg,
  padding: '8px 10px',
  borderRadius: 2,
};

const readoutStyle = {
  border: `1px solid ${NEO.line}`,
  borderRadius: 4,
  padding: 8,
  background: NEO.surface,
  minWidth: 0,
};

const leadStyle = {
  marginTop: 10,
  padding: '9px 11px',
  border: `2px dashed ${NEO.line}`,
  borderRadius: 3,
  fontSize: 9,
  lineHeight: 1.7,
  color: NEO.grey,
};

const interventionStyle = {
  marginTop: 10,
  padding: '9px 11px',
  border: `2px solid ${NEO.green}`,
  borderRadius: 3,
  background: '#F3FBF5',
  fontSize: 9,
  lineHeight: 1.6,
  color: NEO.ink,
};

const interventionHeadStyle = {
  fontSize: 8,
  fontWeight: 900,
  letterSpacing: '0.1em',
  color: '#14532D',
};

const actionListStyle = { margin: 0, padding: '0 0 0 14px', fontSize: 9, lineHeight: 1.6, color: NEO.ink };

const comparisonStyle = {
  marginTop: 10,
  border: `2px solid ${NEO.ink}`,
  borderRadius: 3,
  padding: '8px 10px',
  fontSize: 9,
};

const comparisonHeadStyle = {
  display: 'grid',
  gridTemplateColumns: '1.6fr 1fr 1fr',
  gap: 6,
  fontSize: 7,
  fontWeight: 900,
  letterSpacing: '0.1em',
  paddingBottom: 4,
  borderBottom: `1px solid ${NEO.line}`,
};

const comparisonRowStyle = {
  display: 'grid',
  gridTemplateColumns: '1.6fr 1fr 1fr',
  gap: 6,
  padding: '4px 0',
  borderBottom: `1px dashed ${NEO.line}`,
};

const bandRowStyle = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 4,
  marginTop: 10,
};

const bandChipStyle = {
  border: '1px solid',
  borderRadius: 2,
  padding: '3px 6px',
  fontSize: 7,
  fontWeight: 900,
  letterSpacing: '0.06em',
};

const footnoteStyle = {
  marginTop: 8,
  fontSize: 8,
  lineHeight: 1.7,
  color: NEO.grey,
};
