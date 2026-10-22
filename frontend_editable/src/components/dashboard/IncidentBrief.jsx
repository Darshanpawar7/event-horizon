import { useVenue } from '../../store/derived';
import { Panel, Callout, ProvenanceTag } from './primitives';
import { NEO, MONO } from '../../theme';

/**
 * The published account behind a historic reconstruction: what happened, what
 * this console would have shown, what acting on its warning changes in the
 * model, and the sources. Shown only for venues that reconstruct an incident.
 *
 * These are real disasters with real victims. The brief keeps three things
 * apart on purpose: the reported facts (with their sources and disputes), the
 * simulation built from them, and the narrow claim the console makes.
 */
export default function IncidentBrief() {
  const venue = useVenue();
  const incident = venue.incident;
  if (!incident) return null;

  return (
    <Panel title={`Incident brief — ${venue.short}`} tag="RECONSTRUCTION" tone="simulated">
      <div style={headerStyle}>
        <div>
          <div style={eyebrowStyle}>
            {incident.date} · {incident.time} · {venue.place}
          </div>
          <h3 style={titleStyle}>{incident.title}</h3>
        </div>
      </div>

      <div style={figuresStyle}>
        <Figure label="Deaths" value={incident.deaths} />
        <Figure label="Injured" value={incident.injured} />
      </div>
      <div style={{ ...captionStyle, marginTop: 8 }}>CROWD</div>
      <p style={paragraphStyle}>{incident.crowd}.</p>

      <div style={{ ...captionStyle, marginTop: 12 }}>WHAT HAPPENED · FROM PUBLISHED ACCOUNTS</div>
      <p style={paragraphStyle}>{incident.summary}</p>
      <ul style={listStyle}>
        {incident.factors.map((line) => (
          <li key={line} style={lineStyle}>
            {line}
          </li>
        ))}
      </ul>

      <div style={{ ...captionStyle, marginTop: 12, color: NEO.orange }}>WHAT THIS CONSOLE WOULD HAVE SHOWN</div>
      <ul style={listStyle}>
        {incident.consoleWouldShow.map((line) => (
          <li key={line} style={lineStyle}>
            {line}
          </li>
        ))}
      </ul>

      <div style={{ ...captionStyle, marginTop: 12, color: '#14532D' }}>WHAT ACTING ON THE WARNING CHANGES IN THE MODEL</div>
      <ul style={listStyle}>
        {incident.prevention.map((line) => (
          <li key={line} style={lineStyle}>
            {line}
          </li>
        ))}
      </ul>
      <p style={{ ...paragraphStyle, color: NEO.grey }}>
        Play the “as reported” timeline, then switch the timeline panel to “with the warning acted on”. The
        clock stays where it is, so the same moment can be read on both branches.
      </p>

      <Callout>
        <strong>Real people died here.</strong> This reconstruction is a simulation authored from the accounts
        linked below, built to show what an evidence-bounded console could have put in front of an operator
        and how much warning the projection would have given. It is not footage, not an official finding and
        not a prediction; the causes are for the inquiries to determine, and nothing here claims that software
        alone would have prevented any death.
      </Callout>

      <div style={{ ...captionStyle, marginTop: 12 }}>WHERE THE MODEL SIMPLIFIES</div>
      <ul style={listStyle}>
        {incident.caveats.map((line) => (
          <li key={line} style={{ ...lineStyle, color: NEO.grey }}>
            {line}
          </li>
        ))}
      </ul>

      <div style={{ ...captionStyle, marginTop: 12 }}>SOURCES</div>
      <ul style={listStyle}>
        {incident.sources.map((source) => (
          <li key={source.url} style={lineStyle}>
            <a href={source.url} target="_blank" rel="noopener noreferrer" style={linkStyle}>
              {source.label}
            </a>
          </li>
        ))}
      </ul>
      <div style={{ marginTop: 10 }}>
        <ProvenanceTag tone="simulated">EVERY COUNT IN THIS RECONSTRUCTION IS SIMULATED</ProvenanceTag>
      </div>
    </Panel>
  );
}

function Figure({ label, value }) {
  return (
    <div style={figureStyle}>
      <div style={captionStyle}>{label}</div>
      <div style={{ fontFamily: MONO, fontSize: 13, fontWeight: 900, color: NEO.ink, lineHeight: 1.4 }}>{value}</div>
    </div>
  );
}

const headerStyle = { marginBottom: 10 };

const eyebrowStyle = {
  fontFamily: MONO,
  fontSize: 9,
  fontWeight: 900,
  letterSpacing: '0.1em',
  color: NEO.crimson,
  marginBottom: 4,
};

const titleStyle = { fontSize: 14, margin: 0, lineHeight: 1.45 };

const figuresStyle = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 };

const figureStyle = {
  border: `2px solid ${NEO.ink}`,
  padding: '8px 10px',
  background: NEO.surface,
};

const captionStyle = {
  fontFamily: MONO,
  fontSize: 8,
  fontWeight: 900,
  letterSpacing: '0.12em',
  color: NEO.grey,
  textTransform: 'uppercase',
  marginBottom: 4,
};

const paragraphStyle = {
  fontFamily: MONO,
  fontSize: 10,
  lineHeight: 1.7,
  color: '#374151',
  margin: '0 0 6px',
};

const listStyle = { margin: 0, padding: '0 0 0 16px', display: 'grid', gap: 4 };

const lineStyle = { fontFamily: MONO, fontSize: 9.5, lineHeight: 1.6, color: '#374151' };

const linkStyle = { color: NEO.ink, textDecorationColor: NEO.orange };
