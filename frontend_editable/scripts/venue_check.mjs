// Builds every venue timeline and prints the numbers that matter when tuning a
// reconstruction: when the projection warns, when the crowd reaches onset
// density, the lead time between them, the peak density and how long the
// model spends above the crush and critical bands — for the "as reported" run
// and for the counterfactual branch at the venue's default threshold.
//
//   node scripts/venue_check.mjs            headline numbers at the +2 s horizon
//   node scripts/venue_check.mjs 3          at the +3 s horizon
//   node scripts/venue_check.mjs 2 --verbose  plus a density table every ~1/12 of each timeline
//
// Pure Node (ESM); needs no browser and no build. The data modules import each
// other with explicit `.js` extensions for exactly this reason.
import { VENUES } from '../src/data/venues/index.js';
import { getTimeline, timelineLeadTime, sampleTimeline, formatClock } from '../src/data/crowdTimeline.js';

const horizon = Number(process.argv[2] || 2);
const verbose = process.argv.includes('--verbose');

for (const venue of Object.values(VENUES)) {
  console.log(`\n=== ${venue.id} (${venue.cellArea} m² cells) ===`);
  for (const scenario of Object.keys(venue.timelines)) {
    const spec = venue.timelines[scenario];
    const timeline = getTimeline(venue, scenario, spec.threshold, horizon);
    const lead = timelineLeadTime(timeline, spec.threshold, horizon);
    const s = timeline.stats;
    const line = [
      `${scenario.padEnd(13)} thr=${spec.threshold}`,
      `warn=${lead.warnAt == null ? 'never' : formatClock(lead.warnAt)}`,
      `onset=${lead.onsetAt == null ? 'never' : formatClock(lead.onsetAt)}`,
      `lead=${lead.leadSeconds == null ? '—' : `${lead.leadSeconds}s`}`,
      `peak=${s.peakDensity}/m² @${s.peakCell} ${formatClock(s.peakAt)}`,
      `above: cong=${s.secondsAbove.congested}s crush=${s.secondsAbove.crush}s crit=${s.secondsAbove.critical}s`,
      `outsideMax=${s.outsideMax}`,
    ];
    if (timeline.intervention) {
      line.push(`action=${timeline.intervention.at == null ? 'none' : formatClock(timeline.intervention.at)}`);
    }
    console.log(`  ${line.join(' | ')}`);
    if (verbose) {
      const start = timeline.keyframes[0].t;
      const end = timeline.keyframes[timeline.keyframes.length - 1].t;
      for (let t = start; t <= end; t += Math.round((end - start) / 12)) {
        const sample = sampleTimeline(timeline, t);
        const densities = sample.counts.map((count, i) => (count / timeline.areas[i]).toFixed(1));
        console.log(
          `     ${formatClock(t).padEnd(9)} ${densities.join(' ')}  cf=${sample.counterflow.toFixed(2)} out=${sample.outside}  [${sample.phase.label}]`,
        );
      }
    }
  }
}
