import { useZones } from '../../store/derived';
import { ProvenanceTag } from './primitives';
import { NEO, MONO } from '../../theme';

/**
 * Shown until the operator selects a zone in the twin.
 *
 * Lives apart from ZoneTelemetry on purpose: that component carries recharts,
 * and keeping the empty state here means the chart library is not downloaded
 * until a zone is actually selected.
 */
export default function ZoneEmptyState() {
  const zones = useZones();
  const count = zones.filter((entry) => entry.ratio != null).length;
  return (
    <div style={emptyStyle}>
      <svg
        width="56"
        height="56"
        viewBox="0 0 24 24"
        fill="none"
        stroke={NEO.grey}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ marginBottom: 20, opacity: 0.8 }}
      >
        <rect x="3" y="3" width="18" height="18" rx="1" />
        <path d="M9 3v18M15 3v18M3 9h18M3 15h18" />
        <circle cx="15" cy="15" r="2.6" strokeDasharray="3 3" />
      </svg>
      <div style={{ fontFamily: MONO, fontSize: 12, fontWeight: 'bold', color: NEO.ink, lineHeight: 1.6, maxWidth: 320 }}>
        Select a zone in the 3D digital twin to inspect its concentration evidence.
      </div>
      <div style={{ marginTop: 14 }}>
        <ProvenanceTag tone={count ? 'observed' : 'missing'}>
          {count ? `${count}/9 ZONES WITH A PROJECTION` : 'NO ZONE PROJECTION THIS INTERVAL'}
        </ProvenanceTag>
      </div>
    </div>
  );
}

const emptyStyle = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '44px 24px',
  textAlign: 'center',
  background: NEO.surface,
  border: `2px solid ${NEO.ink}`,
  boxShadow: `4px 4px 0px 0px ${NEO.ink}`,
  borderRadius: 4,
  marginBottom: 14,
};
