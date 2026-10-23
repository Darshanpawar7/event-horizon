# Deepscan Playbook — Event Horizon

Read this before changing anything. It is the distilled understanding of the project: what
it is, how the code fits together, how this machine is set up, the decisions already
taken (with reasons), and the traps that cost time before. `session_log.md` is the
chronology; this is the map. When you learn something that would have saved you an hour,
put it here.

## 1. What this project is, in one paragraph

A crowd-safety prototype whose whole discipline is provenance. A React Three Fiber venue
twin and an operator console show a 3×3 grid of zones; every number is labelled observed
(from the FastAPI backend), simulated (authored or model-driven demo data) or unavailable.
A constant-velocity projection flags zones whose track count will cross an operator
threshold in 1–3 s. The Python side holds the real analytics (YOLO head tracking,
optical flow, the `CrowdForecast` baseline, an offline Random Forest) that cannot run on
this machine. Nothing is ever labelled safe, and no automatic physical action exists.

Since 2026-10-22 the twin can also stand over five historic crowd disasters. These are
simulations authored from published accounts and driven by a small crowd-flow model; the
UI says so everywhere, and the incident brief carries sources, disputed figures and the
model's simplifications. Keep it that way.

## 2. Map of the repository

| Path | What it is |
| --- | --- |
| `crowd_signals.py`, `crowd_forecast.py` | Pure-Python reasoning layer; tests beside them |
| `dashboard_live.py`, `dashboard_worker.py` | Streamlit video dashboard (needs CUDA/Ultralytics; cannot run here) |
| `backend/api/` | FastAPI demo API: scenarios, incidents, SOPs, assistant, video library |
| `backend/*.py` | Offline pipeline CLI, flow field, training features |
| `frontend_editable/src/data/venues/` | One file per venue: geometry primitives, labels, cameras, exits, corridors, egress field, incident brief, timelines |
| `frontend_editable/src/data/venueModel.js` | Grid conventions (`ZONE_IDS`), per-venue layout, threshold scaling, simulated forecast, `zoneRows` |
| `frontend_editable/src/data/crowdTimeline.js` | Builds/caches timelines (authored keyframes or model runs), sampling, lead time, forecast payloads |
| `frontend_editable/src/lib/crowdModel.js` | The cell-transmission crowd-flow model |
| `frontend_editable/src/store/useVenueStore.js` | zustand store: mode, venue, scenario, playback, polling, pure `compute*` derivations |
| `frontend_editable/src/store/derived.js` | Memoised hooks over the derivations (never pass object-building selectors to zustand) |
| `frontend_editable/src/components/digitalTwin/` | The 3D scene, all venue-driven: `Structures` (primitive library), `ZoneTile` (heat overlay + column), `CrowdParticles` (analysed crowd), `SceneryCrowd` (muted ambient and held crowds), `IncidentBeacon`, `IncidentHud`, `SceneEffects` (sky, sun or moon, fog), `PostFX` (AO, bloom, ACES, SMAA), `TextSprite`, `CameraRig` |
| `frontend_editable/src/lib/textures.js` | Procedural canvas textures: asphalt, concrete, paving, sand, grass, gravel, ballast, signs, lit facades |
| `frontend_editable/src/components/dashboard/` | Console panels |
| `frontend_editable/scripts/` | `venue_check.mjs` (tuning numbers, Node only), `verify_console.cjs` (headless walkthrough, errors and labels), `review_scenes.cjs` (screenshots of every venue at T0: wide, focus, acted-on) |
| `docs/screenshots/*.png` | README images; `docs/deck/photos/*.jpg` deck photos with `credits.json` |

## 3. This machine

- `python` = 3.14, no packages, scikit-learn blocked by Application Control. Use
  `.venv\Scripts\python.exe` (3.12, created with `--system-site-packages`, so Pillow,
  NumPy and scikit-learn come from the global 3.12). It has fastapi, uvicorn, dotenv,
  pyflakes.
- Node 24, npm 11. No ffmpeg, ImageMagick, cwebp or pngquant; image work uses Pillow.
- Google Chrome and Edge are installed; Playwright's own Chromium builds are also present
  under `%LOCALAPPDATA%\ms-playwright`. `playwright-core` + `channel: 'chrome'` with
  SwiftShader renders the WebGL twin headless in about 5 s.
- Working tree is CRLF (`core.autocrlf=true`, LF in the index). Write files with CRLF or
  let git normalise; never produce mixed endings inside one file.
- The repo lives under `Downloads`; `.venv` and `node_modules` are gitignored.

## 4. How the pieces fit

### Store → hooks → components
`useVenueStore` holds only stable primitives/objects. Anything that builds a new array or
object is a `compute*` function, consumed through `derived.js` hooks with `useMemo`.
Passing such a function straight to `useVenueStore()` loops the renderer (zustand v5
snapshot caching). `selectVenue` is safe because venues are module constants.

### Venues
A venue is data (see the JSDoc in `src/data/venues/index.js`). `layoutZones(venue)` turns
`cell {width, depth}` and `gap` into nine positioned cells with areas; the world is metres.
`egressFieldToward(venue, zoneId, exitDir)` gives the per-zone direction crowds walk during
timelines. Components read `useVenue()` and never hard-code geometry. Adding a venue is one
file plus one line in `index.js`.

### Timelines
`venue.timelines[id]` is either `kind: 'authored'` (keyframes with counts) or
`kind: 'model'` with a `model` spec. A branch has `branchOf` and `intervention`
(`reactionSeconds`, `actions`, `phases` with `dt` offsets) and names its parent's model by
string. `getTimeline(venue, id, threshold, horizon)` builds and caches; branches are keyed
by threshold and horizon because the action time is the parent's first threshold crossing
plus the reaction time. `sampleTimeline` interpolates counts and derives per-second rates;
the constant-velocity projection extrapolates those rates exactly as it would tracks.

### The crowd model (`crowdModel.js`)
Per second: density per cell; a link sends `min(movers × share × 1.34 m/s × friction /
length, width × 1.3 P/m/s × friction × release)` where `release = 5.4/ρ` above jam
density; a cell receives up to `9 P/m² × area − N`, times 0.35 once past 5.4 P/m²; exits
work the same way; arrivals that do not fit queue outside the view (`outside`). Operator
`meter`/`close` actions cap admission (`source.cap`) rather than deleting demand, so held
people accumulate in the per-source queue (`keyframe.held`) and the comparison reports
them.
Counterflow fraction (authored schedule) reduces speed and capacity by up to 55 %. Static
fractions model seated/sleeping/waiting people. Shares, widths, rates and statics can be
`[[t, value], …]` schedules; interventions override them from `at` onward.
References: Weidmann 1993; Daganzo 1994; Helbing & Mukerji 2012.

### Rendering
`SceneEffects` reads the venue's `lighting` (`mode` day or night, `sun` position and
colour, `hemisphere`, `ambient`, `fog`, `sky`, `background`, `exposure`) and modulates it
by evidence state (fog thickens when visibility is lost, light cools when tracking is
gone). Day venues get drei `Sky`, night venues `Stars`. `PostFX` (lazy chunk `postfx`)
adds N8AO, Bloom, ACES ToneMapping, Vignette and SMAA; the composer switches the
renderer's own tone mapping off, which is why ACES is an explicit pass. `quality: 'low'`
(twin controls or `?quality=low`) skips PostFX entirely. Lamps, canopy lights, floods and
watchtowers only create real lights at night; keep a venue under about 12 point lights.

### Terrain, scenery and labels
`venue.floor` ({low, high, rise, xMin, xMax}) slopes the floor along z; `stairs` marked
`walkable` (optionally limited to `zones`) lift figures onto their treads.
`surfaceHeight()` in `venueModel.js` answers both; `layoutZones` gives each zone `y` and
`tilt`, and `ZoneTile` tilts its floor overlay but keeps its column vertical.
`venue.ambient` rectangles hold muted scenery figures (never counted); `venue.holding`
maps model source ids to rectangles where held arrivals queue, filled from the `front`
edge and clipped to the rectangle (the label carries the full number). Static labels are
`TextSprite`s; the only drei `Html` overlays left (zone badge, beacon label, gate label,
a three-slot held-label pool) stay mounted and hide with CSS.
Labels keep a readable size at any distance: a `TextSprite` is world-sized but never
taller than 24 px on screen, and the `Html` overlays have a fixed CSS size (no
`distanceFactor`). Markers get out of the way up close: the beacon beam fades in between
12 and 40 m of horizontal camera distance, projection columns between 16 and 40 m,
and while FOCUS is on the beam, columns and beacon label ease out altogether.
`overlay.beaconHeight` shortens the beam where the camera looks along it (Itaewon), and
`gateLabelAt` moves the exits label off the crowd.

### Backend scenario contract
`POST /api/demo/scenario` accepts the five evidence states, `surge`, `crush`, or
`<venue>:<incident|intervention|surge|crush>`. The server only reports the headline state
and echoes `source_id: demo-<scenario>`; the console plays the timeline itself and
recognises the id in `backendScenarioKey`.

## 5. Decisions and why

| Decision | Why |
| --- | --- |
| Keep docs images as the original JPEG/PNG; only byte-identical duplicates were removed | The user wants the best quality and does not care about repo size; a WebP conversion done earlier in the session was reversed the same day |
| No history rewrite | Destructive; the user did not ask; the pack is only 7.7 MB |
| Explicit `core` chunk list instead of a catch-all vendor chunk | Rollup hoists modules shared with a manual chunk into that chunk; a catch-all would drag lazy-only libraries into the eager download |
| `three` and `charts` lazy via `React.lazy`, not just manual chunks | Lazy boundaries keep them off the critical path; naming them keeps hashes stable |
| No `dpr` cap on the twin's canvas | A 1.5 cap was tried and removed: the user prefers full render quality on high-DPI screens over GPU savings |
| JSON-only gzip in the API | Gzipping Range video responses breaks seeking and saves nothing |
| Precompression plugin written in-repo with `node:zlib` | No new dependency; servers that cannot serve `.br`/`.gz` ignore them |
| Did not emit `observation.forecast` from the API (README roadmap item) | No tracker runs in the API; a demo forecast would be labelled BACKEND EVIDENCE and violate the provenance discipline |
| Crowd model uses the cell-transmission sending rule, not a fundamental-diagram sending rule | FD sending (flow falls with upstream density) gridlocks: a barricade failure or opened gate could not release a packed cell. CTM sends at capacity when there is room; the `release` factor keeps a compressed crowd slower than a walking one |
| Reaction times 90 s | Generous for a control room with the number in front of it; two of five venues still dip into the crush band, which is reported rather than hidden |
| Thresholds set near 2.2 P/m² per cell, except NDLS at 1.67 | A threshold placed at the dangerous density warns on arrival; the platform case warns on pre-conditions (a full platform with inflow) |
| Reconstructions labelled everywhere; tolls given with disputes; sources in-app | Real victims; the console's claim is evidence and lead time, not "we would have prevented it" |
| Kept `.jsx`, no TypeScript migration | Out of scope; the codebase convention is JSDoc |
| Procedural textures, no downloaded models or images | Works offline, nothing to license, no asset weight; realism comes from lighting, post-processing, scale-correct geometry and people |
| React Three Fiber 9.6 → 9.8 | `@react-three/postprocessing` 3.1+ needs fiber ≥ 9.7; a minor bump within 9.x, React 19.2 is inside its range |
| Each incident at its hour (night at NDLS, the Sangam, Itaewon; day at Chinnaswamy, Duisburg) | Accuracy; night scenes rely on authored lights and bloom, so they are brighter than reality to stay readable |
| Translucent canopy over the analysed NDLS island | An opaque roof hid the very crowd the scene is about |
| Muted colours for scenery and held crowds | Realism without breaking provenance: only the analysed crowd is in full colour and counted |
| Held arrivals stay in the model | A hold that makes people vanish overstates the counterfactual; the held count is its cost |
| Commits only on request, never with a co-author trailer | The user's global CLAUDE.md overrides any harness attribution reminder |

## 6. Traps — do not repeat

- **Do not re-encode, downscale or delete source assets (photos, screenshots) to save
  space without asking.** The user's "compression and storage" meant deployment storage
  (Supabase), not the repo, and their stated priority is quality. If a request could mean
  either, ask first; lossless changes and true duplicates are fine.
- **`git rm` stages the deletion as well as deleting the file.** If you use it to remove
  tracked files, say so in the summary; the user noticed the staged state before anything
  else.
- **Long inline shell scripts truncate** (~8 KB heredoc limit in this tool). Write scripts
  to the scratchpad with the Write tool and run them. Two batches silently failed before
  this was understood.
- **Parallel Bash calls share one shell and cwd.** A `cd` in one call broke relative paths
  in the others. Use absolute paths or `git -C`.
- **`Path.read_text(newline=)` does not exist on Python 3.12.** Use `open(..., newline='')`.
- **The auto-mode classifier blocks scripts that delete tracked files.** Write new files
  non-destructively, then `git rm` the old ones (reversible).
- **Rollup manual chunks swallow shared dependencies.** Verify with the entry chunk's
  `import … from "./three-…"` line and `<link rel="modulepreload">` in `dist/index.html`.
- **Model lateral flow needs its own length.** With one length per cell, moving to the
  neighbouring column was computed over the cell's long dimension and arrivals piled into
  one column. `crowdTimeline.js` now fills `link.length` from cell width/depth.
- **Initial counts next to the threshold warn at T+1 s.** Start below threshold so the
  warning is earned.
- **A venue camera can end up behind a building** (Itaewon's hotel). Check the headless
  screenshot of every new venue.
- **three r184 deprecates `PCFSoftShadowMap`** (the bare `shadows` flag); use
  `shadows="percentage"`. R3F's `THREE.Clock` warning is third-party; ignore.
- **`.js` files in `frontend_editable` are ESM** (`"type": "module"`); CommonJS scripts
  must be `.cjs`.
- **`npm install --no-save <pkg>` reshuffled 27 packages in `node_modules`** without
  touching the lockfile. Add tooling as a real devDependency instead, and run `npm ci`
  if the tree looks drifted.
- **drei `Html` mount/unmount churn throws** `Failed to execute 'removeChild' on 'Node'`
  (each overlay is its own React root, torn down synchronously). Use `TextSprite` for
  static labels; keep dynamic `Html` mounted and hide it with CSS.
- **A shadowed `const` crashes only in the browser.** `const base` declared inside a loop
  after an outer `base` was read in the same block gave a TDZ error in the minified
  bundle ("Cannot access 'ye' before initialization"); the build and the Node check passed.
  Run the headless review after touching render loops.
- **Tall structures hide the incident.** The NDLS canopy hid the platform crowd and
  Itaewon's hotel hid the alley; look at `npm run review:scenes` output for every venue.
- **In a narrow street, keep the camera inside the street's width.** A camera whose x lies
  within the Itaewon alley's 3.4 m, looking along it, cannot have the floor hidden by
  either side's buildings; one offset by a few metres sees mostly facades, and one looking
  straight down sees a dark slot.
- **Distance-scaled labels balloon in close-ups.** A world-sized sprite, or an `Html` with
  `distanceFactor`, filled half the view when the camera came near (Itaewon's beacon label,
  the New Delhi stair label). Cap sprites in screen pixels and give `Html` a fixed size.
- **Markers become walls up close.** A camera next to a projection column, or looking
  along the beacon beam, saw red instead of people. Fade markers by camera distance.
- **Hanging signs block frontal close-ups.** The New Delhi LED boards hang across the
  crush site, so its close-up looks at the stair flight from the side.
- **A headless screenshot can catch the camera mid-flight.** Software WebGL draws a
  frame or two a second and the flight eases per frame, so a shot taken 6 s after
  FOCUS showed markers the landed view hides. `review_scenes.cjs` waits 14 s after
  FOCUS; judge close-ups only from shots taken after the flight lands.
- **Installing `@react-three/postprocessing` failed with ERESOLVE** until fiber was ≥ 9.7.
- **`sed` one-liners that insert multi-line strings mangle files.** Use the Edit tool or a
  Python script with explicit `\n`.
- **The `data/` gitignore rule** is unanchored and only `frontend_editable/src/data/` is
  re-included; check `git check-ignore -v` when adding data folders elsewhere.

## 7. Checklists

### Before claiming anything is done
1. `.venv\Scripts\python.exe -m unittest …` for the three suites (48 tests).
2. `.venv\Scripts\python.exe -m pyflakes *.py backend/*.py backend/api/*.py`.
3. `npm run build` in `frontend_editable`; confirm the entry chunk imports only `core`.
4. `npm run check:venues` if any venue or model file changed; every venue should still
   warn before onset and the branch should still improve on the baseline.
5. `npm run preview`, then `npm run verify:console` (playwright-core is a devDependency;
   it drives the installed Chrome); zero page errors; look at the screenshots.
6. After any scene or venue change, `npm run review:scenes` (about a minute per venue at
   high quality) and look at every image: is the incident visible, is anything hiding it,
   are labels readable?
7. Append to `session_log.md`; update this file.

### Adding a venue
1. Copy the closest venue file in `src/data/venues/`; keep `id`, `short`, `kind`.
2. Set `cell`, `gap`, `zoneLabels`, `camera` (check it is not behind a structure),
   `structures`/`labels`, `cameras`, `gates`, `corridors`, `egressField`, `controlRoom`.
3. Write `incident` from sources you have actually read; state disputes and simplifications.
4. Author the `model`: initial counts below threshold, sources in P/s, exits as widths,
   schedules for the day's events, counterflow ramp. Add the `intervention` branch.
5. Register in `index.js`; run `npm run check:venues 2 --verbose` and tune until the
   reconstruction reaches its documented band around T0 and the branch improves it.
6. Give it `lighting`, `ground`, a crowd `palette`, `ambient` and `holding` rectangles and
   `views` for its crush zones; keep night venues under about 12 lights. Set
   `overlay.beaconHeight` or `gateLabelAt` if the beam or the exits label stands in front
   of the crowd from the venue camera.
7. Add the venue's title to `VENUES` in `scripts/verify_console.cjs` and
   `scripts/review_scenes.cjs`, run both, view the shots.

### Tuning a timeline (what moves what)
- Warning time ← threshold vs the density of the cell that fills first.
- Onset time ← arrivals minus exit capacity in the bottleneck cell.
- Lead ← the gap between those two; a sudden rush makes it short by nature.
- Branch outcome ← reaction time and the actions' capacity (`open` widths, `meter` rates).

## 8. Facts already verified (2026-10-22), so nobody re-researches them

| Incident | Date / time | Toll | Key mechanics | Primary source |
| --- | --- | --- | --- | --- |
| New Delhi Railway Station, platforms 14/15 | 15 Feb 2025, ≈21:15–21:30 IST | 18 dead, 15 injured | Delayed trains, similar train names (Prayagraj Express at 14, Special at 16), ≈2,600 extra tickets, rush for the footbridge stairs, falls on the stairs | en.wikipedia.org/wiki/2025_New_Delhi_railway_station_crowd_crush |
| M. Chinnaswamy Stadium, Bengaluru | 4 Jun 2025, 15:30 onward | 11 dead, 56 injured | 250,000 on the streets (state) / 50,000 within 1 km (police) for a 32,000-seat venue; free-pass announcement at 15:14; crush across eight gates, deaths near gates 6, 7, 1 and 17–21; D'Cunha commission blamed policing, RCB, KSCA, DNA | en.wikipedia.org/wiki/2025_Bengaluru_stampede |
| Sangam nose, Maha Kumbh, Prayagraj | 29 Jan 2025, 01:00–02:00 IST | 30 dead/60 injured first official; 37 later official; 79 (Newslaundry) / ≥82 (BBC) | Barricades gave way onto resting pilgrims; second crush at an exit with pontoon bridges closed; judicial inquiry | en.wikipedia.org/wiki/2025_Prayag_Maha_Kumbh_Mela_crowd_crush |
| Itaewon alley, Seoul | 29 Oct 2022, ≈22:08–22:20 KST | 159 dead, 196 injured | 45 m alley, 3.2 m at narrowest (iron wall), filled from both ends; first call 18:34, ≥79 calls by 22:00; 137 officers; no plan | en.wikipedia.org/wiki/Seoul_Halloween_crowd_crush |
| Love Parade, Duisburg | 24 Jul 2010, ≈16:40–17:10 | 21 dead, 500+ injured | One ramp as entrance and exit fed by two tunnels; cordons at the top; crowd turbulence | en.wikipedia.org/wiki/Love_Parade_disaster; arXiv:1206.5856 |

## 9. Open items for later sessions

- Commit the visual upgrade (second half of 2026-10-22) when the user asks.
- Phone-width review of the console; the twin overlays are dense below ~1080 px.
- A trained model or real analytics adapter behind the API remains the real roadmap.
- The deck photos in `docs/deck/photos/` have no deck yet.
- Consider a Vitest suite for `crowdModel.js` and `crowdTimeline.js` (pure functions);
  today they are exercised by `scripts/venue_check.mjs` and the headless walkthrough.
