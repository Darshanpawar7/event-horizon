# Event Horizon editable frontend

Operator console with a 3D venue digital twin. The visual language (neo-brutalist
panels, hard borders and drop shadows, monospace labels, flat-shaded isometric scene)
and the twin architecture are ported from the FlowState prototype in `Bit_N_Build`,
re-domained from residential energy to crowd safety.

Left pane: the 3D twin. Right pane: the operator console.

## Windows setup

```powershell
cd frontend_editable
npm install
Copy-Item .env.example .env
npm run dev
```

Open <http://127.0.0.1:3000>. Node 20+ required (built and tested on Node 24).
`npm run build` produces `dist`; serve it behind a reverse proxy that routes `/api`
to the Python API. `vite preview` does not supply the Python API.

The build is split so the console paints before the heavy libraries arrive: a `three`
chunk (three.js + React Three Fiber, loaded when the twin mounts), a `charts` chunk
(recharts, loaded the first time a zone is selected), a `react` chunk and the
application code. Every text asset also gets `.gz` and `.br` siblings so a static
server can serve pre-compressed files; the plain files remain for servers that do not.

## What the twin shows

The scene is the 3x3 analysed region from `crowd_forecast.py`, laid out as a venue
plaza. Zone naming matches the Python baseline exactly: `R{row}C{col}`, rows top to
bottom and columns left to right.

| Scene element | Backs onto |
| --- | --- |
| Zone tile + density column | one forecast cell; column height is projected tracks / threshold |
| Column colour | sparse → building → dense → concentration, or grey when no projection exists |
| Pulse ring under a zone | `concentration_flag` is set for that cell at the selected horizon |
| Crowd markers | `current_eligible` per zone, capped at 26 markers; illustrative positions only |
| Flow corridors | the reported dominant direction; a reversal renders as a red counter-flow |
| Violet corridor alone | optical flow available but person motion is not |
| Camera masts + cones | venue camera geometry; the console's selected camera is highlighted |
| Egress gates | ring pulse rate follows the feeding R3 zone's projected occupancy |
| Fog, light, camera shake | visibility degraded, tracking unavailable, camera movement suspected |

Clicking a zone opens its telemetry: current eligible tracks, projection at the
selected horizon, change, slow fraction, share of region occupancy and the projection
curve against the threshold.

## Provenance

The backend currently reports `forecast_available: false`, so **the zone grid is
simulated** and is labelled that way in the twin banner, the footer and every panel
tag. When `GET /api/cameras/{id}/status` starts returning `observation.forecast` in
the shape `CrowdForecast.update()` already produces — `{status, reason, coverage,
cells[], advice}` — the twin switches to it automatically and the banner flips to
`ZONE GRID FROM BACKEND`. No UI change is needed.

Observed, simulated and missing evidence are styled distinctly throughout
(`PROVENANCE` in `src/theme.js`). Backend mode never falls back to demo data: a failed
read shows DISCONNECTED, and an observation older than ten seconds shows STALE.

## Venues and reconstructions

The twin stands over whichever venue is selected in the console (`src/data/venues/`). A
venue is plain data: cell size and floor area, zone names, gates, camera masts, perimeter
structures as primitives, flow-corridor paths, an egress field, an optional incident brief,
and the timelines that can play on it. The plaza keeps its two authored timelines; the five
historic venues each carry an "as reported" timeline and a counterfactual branch, both
produced by `src/lib/crowdModel.js` from authored parameters. `getTimeline()` in
`src/data/crowdTimeline.js` builds and caches them; a branch depends on the operator's
threshold and horizon because it acts at the projection's first crossing.

Adding a venue means adding one file to `src/data/venues/` and registering it in
`index.js`. Nothing in the components is venue-specific.

A venue file also sets how its scene looks: `lighting` (day or night, sun or moon, haze,
exposure), `ground`, `structures` drawn from a small library of primitives in
`Structures.jsx` (platforms, rails and trains, stairs, canopies, a stadium facade, water,
pontoons, tents, flags, watchtowers, buildings with lit windows, signs, lamps, floodlights,
barriers, instanced forests, a stage), a `floor` slope and `walkable` stairs that figures
stand on, a crowd `palette`, muted `ambient` crowds outside the analysed region,
`holding` areas where the model's held arrivals wait, authored close-up `views` for
the FOCUS button, and `overlay.beaconHeight` or `gateLabelAt` where the beacon or the
exits label would stand in front of the crowd. Textures are procedural
(`src/lib/textures.js`).

Rendering: `PostFX.jsx` adds ambient occlusion, bloom, ACES tone mapping and SMAA via
`@react-three/postprocessing`, in its own lazily loaded chunk. RENDER QUALITY defaults to
AUTO: `QualityGovernor.jsx` measures the frame rate and steps between three tiers (high:
everything at the screen's full resolution; medium: no ambient occlusion, 1×, shadows at 12 Hz;
low: tone mapping only, 0.75×, shadows at 5 Hz). `?quality=high|medium|low` pins one.

What keeps it smooth on an integrated GPU: `CrowdParticles.jsx` draws each zone's people
as one instanced mesh of a merged figure (`src/lib/figures.js`) with one matrix per person
and colours written once; `SceneryCrowd.jsx` places its muted figures once per venue;
`StaticMerge.jsx` merges every static structure that shares a material into one mesh
(mark anything animated `userData.dynamic`); night venues get five real lights
(`LIGHT_BUDGET` in `Structures.jsx`) and no moon shadows; and the effect composer stays
mounted on every tier, because removing it would recompile every material.

Camera: `CameraRig.jsx` flies to venue views, FOCUS close-ups and requests from the
CAMERA buttons and the double-click, and stops the moment the operator drags or presses
a movement key. `CameraInput.jsx` adds W A S D / arrows, Q E, + −, Shift, the 1 2 3 O
views (`src/data/cameraViews.js`) and double-click to fly.

Two scripts keep the reconstructions honest. `npm run check:venues` runs every timeline
in Node and prints when the projection warns, when the crowd reaches onset density, the
lead between them and the peaks of both branches. `npm run verify:console` (with
`npm run preview` serving `dist/`) drives the installed Chrome
headless through every venue and both branches, fails on page errors and writes a
screenshot per state to `verify-shots/`.

## Modes

- **demo** — scripted scenarios from `src/demo.js`, nothing polled.
- **backend** — polls `/api/healthz`, `/api/cameras`, `/api/incidents` and the selected
  camera's status every two seconds. The evidence-state buttons drive
  `POST /api/demo/scenario`, so the backend decides what the next poll reports. Venue
  timelines are sent as `<venue>:<timeline>`; the server reports their headline state and
  the console plays the timeline itself.

## Layout

```text
src/
  theme.js                    design tokens; never hardcode these hex values
  api.js                      backend requests
  demo.js                     explicitly simulated scenarios, sample SOP, signal scripts
  styles.css                  shell layout and base styling
  data/venueModel.js          grid conventions, scaling, the simulated forecast grid
  data/crowdTimeline.js       timelines: authored or model-driven, lead time, branches
  data/venues/                plaza + ndls, chinnaswamy, sangam, itaewon, loveparade
  lib/crowdModel.js           cell-transmission crowd-flow model
  store/useVenueStore.js      state, polling, actions, pure derivations
  store/derived.js            memoised hooks over those derivations
  components/digitalTwin/     VenueScene, VenuePlaza, StaticMerge, Structures, ZoneTile,
                              CrowdParticles, SceneryCrowd, IncidentBeacon, IncidentHud,
                              TextSprite, CrowdFlow, CameraMasts, ExitGates, SceneEffects,
                              PostFX, QualityGovernor, CameraRig, CameraInput,
                              SignalOverlay, PitchGuide, OverlayPanel
  lib/textures.js             procedural surface, sign and facade textures
  lib/figures.js              the merged crowd figure, its material and matrix writer
  data/cameraViews.js         overview, plan and incident views
  components/dashboard/       ForecastPanel, ScenarioControls, TimelineControls,
                              IncidentBrief, ZoneTelemetry, ZoneEmptyState, CameraPanel,
                              SourcePicker, VideoStage, ResponsePanel, AssistantPanel,
                              ViewControls, primitives
```

Derivations that build new arrays or objects live in `useVenueStore.js` as `compute*`
functions and are consumed through the hooks in `derived.js`. Passing them straight to
`useVenueStore()` would break zustand v5's snapshot caching and loop the renderer.

## Backend contract

Unchanged from the previous build, plus two additions:

- `POST /api/demo/scenario` with `{"scenario": "clear|tracking|visibility|camera|collective"}`
  is now called when the evidence state changes in backend mode.
- `observation.forecast` is read when present (optional; see Provenance).

Timestamps must describe observation delivery, not fabricate fresh capture time.
Structured runtime schema validation, authentication, browser-stream rendering, video
overlay synchronisation and incident lifecycle persistence remain integration work.
No API keys in this frontend.

## Limits

Local video selection previews video only; it starts no analysis, and the video
overlay toggles stay disabled until synchronised overlay data exists. SOP checkboxes
are local session notes. Demo acknowledgement is not persisted. Equal image cells
cover unequal physical areas; no people-per-square-metre claim is made. Nothing in
this console establishes crowd safety, and no public announcement or physical
operation is triggered from it.
