import { useState } from 'react';
import { useVenueStore } from '../../store/useVenueStore';
import { useTimeline, useVenue } from '../../store/derived';
import { getTimeline, timelineLeadTime, formatClock, formatDuration } from '../../data/crowdTimeline';
import { getVenue } from '../../data/venues';
import OverlayPanel from './OverlayPanel';
import { NEO, MONO } from '../../theme';

/**
 * A guided walk through the console for a live presentation.
 *
 * Each step drives the same store actions the operator would click, then
 * shows the talking points for what is now on screen. It changes nothing
 * about the evidence or how it is labelled — it only sequences the existing
 * views so a presenter never has to hunt for the next button.
 *
 * The first six steps are the product walkthrough on the generic plaza. The
 * rest are the prevention demo: a historic reconstruction, its warning, and
 * the counterfactual in which someone acts on it.
 */
const STEPS = [
  {
    id: 'problem',
    group: 'WALKTHROUGH',
    title: 'The problem',
    run: (store) => {
      store.setMode('demo');
      store.setVenue('plaza');
      store.setScenario('clear');
    },
    say: [
      'A concert ends. Twenty thousand people head for the exits. One operator watches a screen.',
      'A lens gets sprayed, or the tracker loses everyone. Most dashboards keep showing a confident number.',
      'The operator reads a calm screen. The concourse is not calm.',
    ],
  },
  {
    id: 'crush',
    group: 'WALKTHROUGH',
    title: 'Crush conditions',
    run: (store) => {
      store.setVenue('plaza');
      store.setScenario('crush');
    },
    say: [
      'End-of-event egress. Watch the exit funnel, R3C2, fill up.',
      'People slow from walking to shuffling as it packs — that is the real crowd-flow relationship.',
      'At T-01:30 two of six gates stop. Then read the warning number in the timeline panel.',
    ],
  },
  {
    id: 'zone',
    group: 'WALKTHROUGH',
    title: 'Zone evidence',
    run: (store) => {
      if (store.selectedZone !== 'R3C2') store.setSelectedZone('R3C2');
    },
    say: [
      'Five people per square metre. That is the band where crowd-collapse incidents are documented.',
      'Track coverage falls as the crowd packs — heads block each other. A crush is the worst moment to trust a count, and we show that.',
    ],
  },
  {
    id: 'footage',
    group: 'WALKTHROUGH',
    title: 'Real footage',
    run: () => scrollTo('camera-panel'),
    say: [
      'Pick the sample clip and press play.',
      'The green checks are genuinely measured from these frames, live in the browser.',
      'No detector is running. The counts stay labelled SIMULATED. We refuse to draw boxes we did not compute.',
    ],
  },
  {
    id: 'assistant',
    group: 'WALKTHROUGH',
    title: 'The assistant',
    run: (store) => {
      store.setMode('backend');
      scrollTo('assistant-panel');
    },
    say: [
      'Now on the real API. Ask the assistant what to do first.',
      'It is a live LLM, allowed to use only the incident and the written procedure. It cannot invent a step.',
      'If the model fails, a scripted answer takes over. The operator always gets the procedure.',
    ],
  },
  {
    id: 'missing',
    group: 'WALKTHROUGH',
    title: 'Missing evidence',
    run: (store) => store.setScenario('tracking'),
    say: [
      'Tracking lost. Everything goes grey. The forecast stops. The console says so in words.',
      'Any dashboard can show a red alert. Ours shows a grey one — that is the harder problem.',
      'Nothing in this system is ever labelled safe.',
    ],
  },
  {
    id: 'delhi',
    group: 'PREVENTION DEMO',
    title: 'New Delhi station',
    run: (store) => {
      store.setMode('demo');
      store.setVenue('ndls');
      scrollTo('incident-brief');
    },
    say: [
      '15 February 2025. Platforms 14 and 15 at New Delhi station; eighteen people died on the footbridge stairs.',
      'This is a simulation authored from the published accounts, driven by a crowd-flow model. Not footage, not a finding.',
      'The platform is already full before anything happens. Watch R2C2, the foot of the stairs.',
    ],
  },
  {
    id: 'warning',
    group: 'PREVENTION DEMO',
    title: 'The warning',
    run: (store, context) => {
      if (context.warnAt == null) return;
      store.stopClock();
      store.setClock(context.warnAt);
    },
    say: [
      'The projection crosses the operator’s threshold here, minutes before anyone fell.',
      'That number — the lead time in the timeline panel — is what this console exists to produce.',
      'It is produced from simulated tracks tonight. On a real camera it would be produced from real ones, and labelled accordingly.',
    ],
  },
  {
    id: 'acted',
    group: 'PREVENTION DEMO',
    title: 'Acting on it',
    run: (store) => {
      store.switchBranch('intervention');
      store.togglePlay();
    },
    say: [
      'Same model, same clock, one difference: ninety seconds after the warning, station control holds the platform and makes the stairs one-way.',
      'Read the comparison in the timeline panel: peak density, time above crush risk, people held outside the camera’s view.',
      'That is the whole argument — not a smarter alarm, but evidence early enough for an ordinary decision.',
    ],
  },
  {
    id: 'venues',
    group: 'PREVENTION DEMO',
    title: 'Other venues',
    run: (store) => {
      store.setVenue('itaewon');
    },
    say: [
      'Itaewon, Bengaluru, the Kumbh, Duisburg. The geometry differs; the mechanics do not.',
      'Every venue has its as-reported run and its counterfactual, and every count is labelled simulated.',
      'Change the threshold and the warning moves. Change the horizon and so does the lead.',
    ],
  },
  {
    id: 'limits',
    group: 'PREVENTION DEMO',
    title: 'What this is not',
    run: () => scrollTo('incident-brief'),
    say: [
      'Real people died in these places. The brief carries the sources, the disputed figures and the simplifications.',
      'The console’s claim is narrower than prevention: show the evidence, label where it came from, and surface the warning in time.',
      'Whether a warning is usable depends on who can act and how fast. That is a venue’s decision, never this screen’s.',
    ],
  },
];

function scrollTo(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

export default function PitchGuide() {
  const [index, setIndex] = useState(-1);
  const timeline = useTimeline();
  const venue = useVenue();

  const go = (next) => {
    const step = STEPS[next];
    if (!step) return;
    const store = useVenueStore.getState();
    step.run(store, { warnAt: warningFor(store) });
    setIndex(next);
  };

  const current = index >= 0 ? STEPS[index] : null;
  const lead = timeline?.lead;
  const showLead = current && (current.id === 'crush' || current.id === 'warning') && lead?.leadSeconds > 0;

  return (
    <OverlayPanel
      title="Pitch walkthrough"
      width={310}
      badge={
        <span style={{ fontFamily: MONO, fontSize: 9, color: NEO.grey }}>
          {current ? `${index + 1}/${STEPS.length}` : 'START'}
        </span>
      }
    >
      <div style={bodyStyle}>
        <div style={stepRowStyle}>
          {STEPS.map((step, i) => (
            <button
              key={step.id}
              type="button"
              onClick={() => go(i)}
              style={{
                ...stepButtonStyle,
                background: i === index ? NEO.orange : NEO.surface,
                color: i === index ? NEO.surface : step.group === 'PREVENTION DEMO' ? NEO.crimson : NEO.ink,
                borderColor: i === index ? NEO.orange : step.group === 'PREVENTION DEMO' ? NEO.crimson : NEO.ink,
              }}
              title={`${step.group} · ${step.title}`}
            >
              {i + 1}
            </button>
          ))}
          <button
            type="button"
            onClick={() => go(index + 1)}
            disabled={index >= STEPS.length - 1}
            style={{ ...nextButtonStyle, opacity: index >= STEPS.length - 1 ? 0.4 : 1 }}
          >
            {index < 0 ? 'START ▸' : 'NEXT ▸'}
          </button>
        </div>

        {current ? (
          <>
            <div style={groupStyle}>{current.group}</div>
            <div style={titleStyle}>
              {index + 1} · {current.title.toUpperCase()}
            </div>
            <ul style={listStyle}>
              {current.say.map((line) => (
                <li key={line} style={lineStyle}>
                  {line}
                </li>
              ))}
            </ul>
            {showLead && (
              <div style={calloutStyle}>
                <strong style={{ fontSize: 18 }}>{formatDuration(lead.leadSeconds)}</strong> of warning on this
                simulated timeline — the projection crosses the threshold at {formatClock(lead.warnAt)}, before the
                crowd reaches {lead.onsetLabel} at {formatClock(lead.onsetAt)}.
              </div>
            )}
            {current.group === 'PREVENTION DEMO' && venue.incident && (
              <div style={{ ...lineStyle, color: NEO.grey, marginTop: 8 }}>
                Standing over: {venue.name}. Simulated from published accounts; sources in the incident brief.
              </div>
            )}
          </>
        ) : (
          <div style={{ ...lineStyle, color: NEO.grey }}>
            Eleven steps, one click each: six for the console, five for the prevention demo on a historic
            reconstruction. Every step runs the same controls an operator would use; nothing here changes the
            evidence or how it is labelled.
          </div>
        )}
      </div>
    </OverlayPanel>
  );
}

/** When the projection first crosses the threshold on the current venue's reconstruction. */
function warningFor(store) {
  const venue = getVenue(store.venueId);
  const spec = venue.timelines[store.scenario];
  const target = spec ? spec.branchOf || store.scenario : 'incident';
  const timeline = getTimeline(venue, target, store.threshold, store.horizon);
  if (!timeline) return null;
  return timelineLeadTime(timeline, store.threshold, store.horizon).warnAt;
}

const bodyStyle = { padding: 10, fontFamily: MONO };

const stepRowStyle = { display: 'flex', gap: 4, alignItems: 'center', marginBottom: 10, flexWrap: 'wrap' };

const stepButtonStyle = {
  width: 22,
  height: 22,
  border: '2px solid',
  borderRadius: 2,
  fontFamily: MONO,
  fontSize: 9,
  fontWeight: 900,
  cursor: 'pointer',
  padding: 0,
};

const nextButtonStyle = {
  marginLeft: 'auto',
  border: `2px solid ${NEO.ink}`,
  background: NEO.ink,
  color: NEO.surface,
  fontFamily: MONO,
  fontSize: 9,
  fontWeight: 900,
  letterSpacing: '0.08em',
  padding: '6px 10px',
  cursor: 'pointer',
  borderRadius: 2,
};

const groupStyle = {
  fontSize: 8,
  fontWeight: 900,
  letterSpacing: '0.12em',
  color: NEO.grey,
  marginBottom: 3,
};

const titleStyle = {
  fontSize: 10,
  fontWeight: 900,
  letterSpacing: '0.1em',
  color: NEO.orange,
  marginBottom: 6,
};

const listStyle = { margin: 0, padding: '0 0 0 14px', display: 'grid', gap: 5 };

const lineStyle = { fontSize: 10, lineHeight: 1.55, color: NEO.ink };

const calloutStyle = {
  marginTop: 10,
  padding: '8px 10px',
  background: '#FEF3C7',
  border: `2px solid ${NEO.amber}`,
  borderRadius: 2,
  fontSize: 9,
  lineHeight: 1.5,
  color: NEO.ink,
};
