# Session log

One entry per working session, oldest first. Each entry records the request, the state
found, what was done (with paths), what was verified (commands and results) and what was
left open. Decisions and their reasons live in `Deepscan_Playbook.md`; this file is the
chronology. Append, do not rewrite.

---

## 2026-10-22 — First Claude session: build, bugs, load time, compression, historic reconstructions

### Request

1. Check the project state, build everything pending, make the console load faster, use
   compression to save storage, fix bugs and issues, and create `session_log.md` and
   `Deepscan_Playbook.md` so later sessions have full context.
2. Mid-session: add several historic stampede locations (Kumbh Mela, the New Delhi
   station crush, the RCB Bengaluru stampede, "etc."), run a demo of how the software
   could have helped prevent them, and make the simulation realistic, using free
   open-source tools as needed.

### State found

- Clean checkout at commit `8417590` ("pitch walkthrough, warning headline and evidence
  log export"). Nothing installed: no `node_modules`, no `dist`, no `.venv`.
- `python` on PATH is 3.14 with no packages; scikit-learn DLLs blocked there (as the
  README noted). Python 3.12 is installed separately with Pillow, NumPy and scikit-learn.
- `docs/` was 11 MB: `docs/deck/shots/` held 12 PNGs byte-identical to
  `docs/screenshots/`, and `docs/deck/photos/` held 4.9 MB of JPEGs for a pitch deck that
  does not exist in the repo (credits in `credits.json`). Nothing referenced `docs/deck`.
- Frontend built to a single 1.73 MB JavaScript chunk (496 kB gzip); Vite warned about it.
- All 16 reasoning-layer tests and 4 API tests passed on both Pythons; the 24 backend
  tests (including the 6 in `backend/test_backend.py` the README said could not run)
  passed on Python 3.12.
- Python lint (pyflakes) found two unused imports in `backend/backend.py`, one in
  `backend/align_roi_baseline.py` and two dead assignments in `backend/extract_flow.py`.

### What was done

#### Environment and build
- `frontend_editable/npm install` (170 packages), `frontend_editable/.env` copied from
  the example.
- `.venv` created from Python 3.12 with `--system-site-packages`; fastapi 0.116.1,
  uvicorn 0.35.0, python-dotenv and pyflakes installed into it.
- `npm run build` produces `frontend_editable/dist/`.

#### Bugs and quality fixes
- `src/hooks/useVideoAnalysis.js`: on a tainted canvas the interval now stops instead of
  throwing and re-rendering six times a second (the comment claimed it stopped; it did not).
- `src/components/digitalTwin/ZoneTile.jsx`: a `PlaneGeometry` was constructed on every
  render (five times a second during playback) and a `Vector3` allocated every frame per
  tile; both replaced with shared/memoised objects.
- `src/components/digitalTwin/CrowdFlow.jsx`: the dash `CanvasTexture` is disposed when a
  tube unmounts.
- `src/components/dashboard/ZoneTelemetry.jsx`: redundant ternary for the provenance tone.
- `backend/api/app.py`: `camera_status` built two observations with two timestamps per
  response; now one. Removed unused imports and dead code flagged by pyflakes (lint clean).
- Playwright run surfaced a three.js warning from the default shadow map; `VenueScene`
  now uses `shadows="percentage"`.

#### Load time
- `vite.config.js`: manual chunks `core` (react, react-dom, scheduler, zustand,
  framer-motion, tslib, Vite's preload helper), `three` (three, @react-three/*,
  three-stdlib, maath) and `charts` (recharts and its redux/d3 dependencies). Rollup
  hoists modules shared between a manual chunk and the entry *into the manual chunk*,
  which is why zustand first landed in `three` and put 900 kB on the critical path; the
  explicit `core` list prevents that.
- `App.jsx`: `VenueScene` and `ZoneTelemetry` are `React.lazy`; the empty zone state moved
  to `ZoneEmptyState.jsx` so recharts is only downloaded once a zone is selected.
- `index.html`: static splash card inside `#root`, meta description, theme colour.
- `VenueScene.jsx`: `powerPreference: 'high-performance'`. A `dpr` cap of 1.5 was added
  and later removed (correction below): the user wants full quality on high-DPI screens.
- Result: entry chunk 1,726 kB → 144 kB; `core` 330 kB is modulepreloaded; `three`
  911 kB and `charts` 372 kB load lazily. Headless Chrome with software WebGL reaches a
  rendered canvas in about 5 s.

#### Storage and compression
- Zero-dependency Vite plugin (`precompress` in `vite.config.js`) writes `.gz` and `.br`
  siblings for every text asset: 1.77 MB raw → 510 kB gzip / 429 kB brotli.
- API: `JsonGZip` middleware (Starlette's GZipMiddleware, bypassed for `/video` so Range
  requests keep working) compresses JSON responses over 512 bytes.
- `docs/`: the 12 byte-identical duplicate screenshots in `docs/deck/shots/` were removed
  via `git rm` and `docs/deck/README.md` points at `docs/screenshots/`. An earlier step in
  the session also re-encoded the deck photos and README screenshots to WebP; that was
  reversed the same day (see the correction below), so the photos and screenshots are
  the original JPEG and PNG files. `docs/` is 8.6 MB including two new PNG screenshots
  of the reconstructions.

#### Historic reconstructions and prevention demo
- New crowd-flow model `src/lib/crowdModel.js`: nine-cell cell-transmission model
  (Daganzo sending/receiving, Weidmann fundamental diagram, 1.3 P/m/s capacity, 9 P/m²
  receiving cap with a 35 % pressure factor above jam density, counterflow friction).
  Supports time schedules on arrivals, exits, link shares/widths and static fractions, and
  operator actions (meter/close sources, open/close exits, redirect links, release static
  crowds, set counterflow).
- Venue registry `src/data/venues/`: `plaza` (the original geometry and its two authored
  timelines) plus `ndls` (New Delhi station platforms 14/15, 15 Feb 2025), `chinnaswamy`
  (gate 6/7 approach, 4 Jun 2025), `sangam` (Maha Kumbh Sangam nose, 29 Jan 2025),
  `itaewon` (29 Oct 2022) and `loveparade` (24 Jul 2010). Each carries geometry
  primitives, labels, cameras, exits, corridors, an egress field, an incident brief with
  sources and caveats, an "as reported" model timeline and an "intervention" branch that
  acts 90 s after the projection's first threshold crossing.
- `src/data/crowdTimeline.js` rewritten: builds and caches timelines (authored or model),
  branches keyed by threshold and horizon, dense-keyframe sampling by binary search.
- `src/data/venueModel.js` rewritten venue-aware (cell size, areas, scaled thresholds).
- Store (`useVenueStore.js`) gained `venueId`, `setVenue`, `switchBranch` (keeps the
  clock), per-incident `acknowledgedId`, scene derivation (`computeScene`) that turns the
  timeline state into motion state, incidents and metrics; `derived.js` gained `useVenue`,
  `useScene`, venue-aware hooks.
- All twin components rewritten venue-driven: `VenuePlaza`, new `Structures`, `ZoneTile`,
  `CrowdParticles` (per-axis wrap, rectangular cells, egress field), `CrowdFlow`,
  `ExitGates`, `CameraMasts`, `SceneEffects`, new `CameraRig` (flies to each venue),
  `VenueScene` (venue banner).
- Console: `ScenarioControls` (venue picker, per-venue timelines), `TimelineControls`
  (branch switch, operator-action block, as-reported vs acted-on comparison, people held
  outside the view, warning and action ticks), new `IncidentBrief`, `PitchGuide` extended
  to eleven steps (six walkthrough, five prevention demo).
- API accepts `<venue>:<timeline>` scenarios (`backend/api/app.py`, README, new
  `backend/api/test_scenarios.py`).
- Facts verified by web search and Wikipedia fetches on 2026-10-22; tolls and disputes
  recorded in each venue's `incident` block.
- Tooling kept in the repo: `frontend_editable/scripts/venue_check.mjs`
  (`npm run check:venues`) and `scripts/verify_console.cjs` (`npm run verify:console`; `playwright-core` is a
  devDependency and drives the installed Chrome headless). `package.json` and `package-lock.json` gained
  only that devDependency and the two scripts; the tree was restored with `npm ci` first.
- `CameraRig` eases by elapsed time, not by frame, so a venue switch lands in about a second even
  under software WebGL (the first headless screenshots caught Itaewon mid-flight).

#### Documentation
- `README.md`: reconstructions section with sources and the lead-time table, capability
  row, layout, testing table (48 tests, Python 3.12 note), limitations, roadmap.
- `frontend_editable/README.md`: build output, venues section, layout.
- `backend/api/README.md`: scenario names.
- New `CLAUDE.md`, `session_log.md`, `Deepscan_Playbook.md` at the root.

### Verification

| Check | Command | Result |
| --- | --- | --- |
| Reasoning tests | `python -m unittest test_crowd_signals test_crowd_forecast` (3.14 and 3.12) | 16 pass |
| API tests | `.venv\Scripts\python.exe -m unittest discover -s backend/api -p "test_*.py"` | 8 pass |
| Backend tests | `.venv\Scripts\python.exe -m unittest discover -s backend -p "test_*.py"` | 24 pass (65 s) |
| Lint | `.venv\Scripts\python.exe -m pyflakes *.py backend/*.py backend/api/*.py` | clean |
| Build | `npm run build` | chunks core 330 kB, three 911 kB, charts 372 kB, app 144 kB; precompress 8 files |
| API smoke | uvicorn on 8765; curl healthz, scenario, incidents (gzip), status, assistant, sources, video 404 | all as expected |
| Model tuning | `npm run check:venues` | see table in README; every venue warns before onset |
| Headless console | `npm run verify:console` against `vite preview` (final run after `npm ci`) | all six venues render; brief, warning and comparison present; no page errors; walkthrough clicks through all eleven steps |

Lead times at the default +2 s horizon: NDLS 251 s, Chinnaswamy 54 s, Sangam 246 s,
Itaewon 143 s, Love Parade 70 s. Interventions keep NDLS, Sangam and Itaewon below the
crush band entirely; Chinnaswamy and Love Parade dip into it briefly (92 s and 33 s) with
no time in the critical band.

### Correction after review (same day)

The user asked why the photos had been deleted and staged. Two things came out of it:

- "Compression and storage" in the request meant storage at deployment time (Supabase),
  not shrinking repository assets, and the user said it is not necessary. Their priority
  is the best quality.
- The staging was a side effect of `git rm` (which deletes and records the deletion in
  one step), not an intended pre-commit.

Reversed: the 12 deck photos and 12 README screenshots were restored from `HEAD` as the
original JPEG/PNG files, `credits.json` returned to its original keys, the 26 WebP copies
were deleted, the README links point at `.png` again, the two new reconstruction
screenshots were saved as PNG, and the render-resolution cap (`dpr`) was removed so
high-DPI screens render at full resolution. Kept: the duplicate removal (no quality cost),
the chunking, lazy loading, pre-compressed build assets and JSON gzip (none affect quality).
Lesson recorded in the playbook: do not re-encode or downscale source assets without
asking; a request mentioning compression may be about deployment, not the repo.

### Open items

- Committed on request as ten logical commits (backend lint; API gzip and venue scenarios;
  duplicate deck screenshots; console performance; crowd model and venues; 3D scene; console
  panels; verification scripts; READMEs; CLAUDE.md, log and playbook) and pushed to
  `origin/main`. Commits carry no co-author trailer, per the user's global instructions.
- The `README` roadmap item "emit `observation.forecast` from the API" was deliberately
  not done: without a real tracker it would label demo data as backend evidence.
- `docs/deck/photos/` are for a pitch deck that is not in the repo.
- Remaining console warning in headless runs: `THREE.Clock` deprecation from React Three
  Fiber internals, not from this code.
- A Playwright screenshot review of every venue at phone width has not been done.

---

## 2026-10-22 (continued) — Commit and push, local run, realistic rendering of every venue

### Requests

1. "Commit and push everything separately in multiple commits." Done as eleven commits
   pushed to `origin/main` (ten feature commits and one log note), no co-author trailers.
2. "Run it locally so I can see the simulation of all the locations." The API ran on
   127.0.0.1:8000 and the Vite dev server on 127.0.0.1:3000, opened in the default browser.
3. "The simulation looks too basic. Make it very realistic, use good graphics, make all the
   locations better and very accurate, and make the incident easily visible."

### What was done for the visual upgrade

#### Rendering
- `SceneEffects.jsx` rewritten around each venue's `lighting` block: drei `Sky` by day,
  `Stars` by night, hemisphere and ambient light, a sun or moon with 2048-px shadows, venue
  fog, and the existing evidence-state moods layered on top.
- New `PostFX.jsx`: N8AO ambient occlusion, Bloom, ACES tone mapping (explicit, because the
  composer turns the renderer's off), Vignette and SMAA, in its own lazily loaded `postfx`
  chunk. RENDER QUALITY HIGH/LOW in the twin controls; `?quality=low` in the URL.
- Dependencies: `@react-three/fiber` ~9.6.1 → ~9.8.2 (needed by the post-processing
  package), new `@react-three/postprocessing` ~3.2.2 and `postprocessing` ^6.39.5.
- New `src/lib/textures.js`: procedural asphalt, concrete, paving, sand, grass, gravel,
  ballast, sign plates and lit building facades. Nothing is downloaded.

#### People
- `CrowdParticles.jsx`: instanced human figures (legs, body, head) with per-venue clothing
  palettes, a walking bob, sway and lean once crushed, and heights from the terrain.
- New `SceneryCrowd.jsx`: muted crowds outside the analysed region (`venue.ambient`) and the
  model's held arrivals queued where they wait (`venue.holding`), never counted.

#### Model
- `crowdModel.js`: `meter` and `close` now cap admission instead of deleting demand; held
  people accumulate per source (`keyframe.held`). Lead times and peaks are unchanged; the
  counterfactuals now report how many people were held (NDLS 1,384; Chinnaswamy 11,111;
  Sangam 9,330; Itaewon 2,614; Love Parade 20,082).

#### Terrain and venues
- `venueModel.js`: `floorHeight`, `floorTilt`, `surfaceHeight`; zones carry `y` and `tilt`.
  Floor slopes for the Itaewon alley (about 4 m over 45 m) and the Love Parade ramp; walkable
  stairs for the three New Delhi footbridge flights and the Love Parade staircase.
- `Structures.jsx` became a primitive library: rails, trains, stairs with parapets,
  canopies (lit, optionally translucent), buildings with lit windows, signs, lamps,
  floodlights, lighter barriers, fences, vehicles, tents, pontoons, a water shader, trees,
  an instanced forest, containers, buoys, flags, watchtowers and a stage.
- Every venue rebuilt (incidents and timelines untouched): New Delhi at night with three
  island/side platforms, sunken tracks, the Prayagraj Express at 14, a translucent canopy over
  the analysed island, the footbridge with three stair flights, the yellow station board and
  two near-identical LED train boards; Chinnaswamy by afternoon with Cubbon Road, the pavement
  and forecourt, the stadium facade, stand, roof, floodlights, gates 6 and 7, Cubbon Park,
  police vehicles and a red-and-gold crowd; the Sangam on a new-moon night with the brown
  Ganga and green Yamuna meeting, the sand spit, ghats, buoy rope, closed pontoon bridges,
  bamboo barricades, Akhara camps, saffron flags, light masts and watchtowers, pilgrims and
  bathers; Itaewon at night with the sloping alley, Hamilton Hotel, the iron wall, bars with
  neon, World Food Street a level up, Itaewon-ro and Station Exit 1; the Love Parade ramp by
  afternoon with the walled ramp, both tunnel halves under the railway, the festival ground,
  stage and floats, the police cordon, the narrow staircase and the lamp post.

#### Making the incident visible
- `ZoneTile.jsx`: translucent floor heat overlay by density band (pulsing past crush risk),
  slim glowing projection column, crush and threshold rings; follows slopes.
- New `IncidentBeacon.jsx`: a light column and expanding ring over the densest zone, amber
  when congested and red past crush risk, with a short fixed-size label. The beam fades
  out as the camera comes close (12 to 40 m away, measured across the ground) and the
  projection columns do the same (16 to 40 m), so a close-up shows people, not markers.
  While FOCUS is on, the beam, the columns and the beacon label ease out altogether;
  the strip above the twin keeps the reading.
- New `IncidentHud.jsx`: clock, phase, density band and a FOCUS button over the twin.
- `CameraRig.jsx`: flies to the focused zone; venues may author close-ups (`views`).

#### Bugs found and fixed during the visual review
- A shadowed `const base` inside the crowd loop threw a TDZ error only in the minified
  bundle ("Cannot access 'ye' before initialization"). Renamed to `floorY`.
- drei `Html` overlays threw `removeChild` errors when many unmounted at once on a venue
  switch. Static labels became `TextSprite`s; dynamic overlays stay mounted and hide.
- Floating labels drew over the control panels: `zIndexRange` lowered below the panels.
- The NDLS canopy hid the analysed crowd (now translucent). Itaewon's buildings hid the
  alley: a first fix looked straight down into a dark slot; the final camera looks up the
  alley from Itaewon-ro from inside the alley's width, and the close-ups follow its axis.
- Labels ballooned in close-ups: the Itaewon beacon label filled the view and the New
  Delhi stair label covered the stairs. Sprites are capped at 24 px on screen, the HTML
  labels have a fixed size, and the beacon label is short (band, zone, density, SIMULATED).
- Close-ups were walled off by markers: the beacon beam and the projection columns now
  fade as the camera approaches and step aside in focus mode, and the beam is at most
  4.4 m across (it had scaled with the zone to 11 m at the Sangam). The New Delhi
  close-up moved to the side of the stair flight, because from the front the two LED
  boards hang across the crush site.
- The first review after these fixes still showed red columns in two close-ups: the
  screenshot was taken before the camera flight landed (software WebGL draws a frame
  or two a second). The review now waits 14 s after FOCUS.
- The exits overlay unmounted its HTML label on every toggle; it now stays mounted and
  hides, and a venue can move it (`gateLabelAt`, used at Itaewon).
- Night scenes were too dark: brighter hemisphere, ambient, exposure and canopy lights.

#### Tooling and docs
- `scripts/review_scenes.cjs` (`npm run review:scenes`): screenshots of every venue at T0,
  focused, and on the counterfactual. `review-shots/` is ignored.
- README screenshots 13 (New Delhi) and 14 (Sangam counterfactual) replaced with renders of
  the new scene, saved as full-size PNG.
- README: "What you see" and the held-arrivals column; frontend README: venue styling,
  rendering and layout; playbook: rendering, terrain and scenery, decisions and new traps.

### Verification

| Check | Result |
| --- | --- |
| `npm run check:venues` | Lead times and peaks identical to before; held counts as above |
| `npm run build` | Entry imports only `core`; `three` 948 kB, `postfx` 330 kB and `charts` 372 kB load later; 697 kB gzip and 600 kB brotli for all nine files |
| Python suites and pyflakes | 48 tests pass; lint clean (no Python changed) |
| `review_scenes.cjs` at high quality | All six venues, three shots each (wide at T0, FOCUS close-up, acted-on); no page errors. Every image checked: the incident is marked and visible, nothing stands in front of it, labels are readable |
| `verify_console.cjs` | Every venue shows its banner, timeline panel, brief, warning and branch comparison; the walkthrough clicks through; no page errors. One warning: React Three Fiber's own `THREE.Clock` deprecation (third-party, known) |

### Open items

- This visual upgrade is not committed yet; commit when the user asks.
- Geometry stays schematic: gate numbering at Chinnaswamy, the ramp grade at Duisburg and the
  alley gradient at Itaewon are drawn from descriptions, and the caveats say so.
- Software rendering in the headless review runs at a few frames a second; a real GPU is
  needed to judge smoothness. Weaker machines can use RENDER QUALITY: LOW.

---

## 2026-10-23 — Commit and push, a smooth twin, a camera that goes anywhere

### Requests

1. "Can you run it again? Also please commit and push to origin."
2. "The simulation now looks good but it's getting stuck/lagging a lot and its point of
   reference is fixed at one place. Please make it smooth and easily movable, so we can
   easily demonstrate."

### State found

- The API (:8000) and the dev server (:3000) were already running again, started at 16:34
  outside this session; they were left as they were.
- 37 uncommitted paths: the whole visual upgrade of 2026-10-22.
- `.venv` had been recreated at 16:34 (`pyvenv.cfg` now says
  `include-system-site-packages = false`, command `python -m venv .venv`), so NumPy and
  scikit-learn from the global 3.12 are no longer visible inside it.

### What was done

#### Commit and push
- Eight commits `c5122f3..754c59d` pushed to `origin/main`: held arrivals (model); post-
  processing, lighting, textures and structures; human figures and scenery crowds; heat
  overlay, beacon and focus close-ups; the six venues; the scene review script; READMEs;
  session log and playbook. Each feature commit was built on its own in a temporary worktree
  (node_modules linked by a junction, unlinked before the worktree was removed).
  `package.json` was staged from an index blob without the `review:scenes` line so that line
  lands with its script. No co-author lines.

#### Measured before changing anything
- Headless Chrome on this machine's Intel Iris Xe (ANGLE Direct3D 11, vsync off, device
  pixel ratio 1.25): 14–25 fps at the old default (high), 21–60 with effects off. The main
  thread was 100 % busy: up to 1,061 draw calls a frame (New Delhi's 1,540 rail sleepers
  were separate meshes), full 7,200-instance buffer uploads every frame, and per figure per
  frame three Euler-to-matrix builds and three colour strings parsed.

#### Smoothness (details in the playbook, "Performance and render tiers")
- `lib/figures.js` + `CrowdParticles.jsx`: one merged figure per person, one instanced mesh
  per zone, matrices written straight into the buffer, only the used range uploaded, colours
  as static per-instance attributes, per-zone culling spheres, flat zones skip the height
  lookup, Lambert shading, soft contact shadows that share the figures' matrices.
- `SceneryCrowd.jsx`: placed once per venue; held groups change only their draw count.
- `StaticMerge.jsx` around a memoised static venue: about 1,060 → 130 draw calls at New Delhi;
  the five-a-second playback ticks re-render only the zone tiles.
- Night venues: five real lights (`LIGHT_BUDGET`, floods first) and no moon shadow.
- Render tiers high / medium / low and `QualityGovernor` (AUTO, the new default, starting at
  medium; high tried at most once, never on integrated GPUs). Ambient occlusion only on high
  (even N8AO "performance" halved medium). Day shadows redrawn every frame, 12 or 5 a second.
- The composer stays mounted on every tier and the canvas is `flat`: an early build froze
  for seconds when AUTO dropped to low, because unmounting the composer recompiled every
  material.
- High keeps the device's full pixel ratio (the user's earlier preference); only medium and
  low lower it.

#### A camera that goes anywhere
- Map-style orbit controls (pan along the ground, zoom toward the pointer, min 3 m).
- `CameraInput.jsx`: W A S D / arrows, Q E, + −, Shift; 1 overview, 2 incident, 3 plan view,
  O orbit; double-click flies to the point under the pointer; keys typed into fields ignored.
- `CameraRig.jsx`: flights for venue, FOCUS and requests; any drag, wheel or movement key
  cancels a flight; flights land within 3.5 s.
- CAMERA buttons (OVERVIEW, INCIDENT, TOP, ORBIT) and RENDER QUALITY (AUTO, HIGH, MED, LOW,
  with the tier AUTO chose) in the twin controls; a two-line navigation hint on the twin.

#### Bugs found on the way
- three r184's `vColor` is a vec4; the first figure shader assigned a vec3 and failed to
  compile, so the crowd vanished in that build (caught by the probe's console capture).
- Sharing attribute buffers between disposable geometries would free buffers still in use;
  each mesh now owns a copy of the few-KB figure shape.
- A Playwright `textContent()` on a missing element waited 30 s per venue; probes pass a
  short timeout.

#### Tools and docs
- `npm run demo` (build, then preview on :4173 with the same `/api` proxy, opening the
  browser) and `npm run perf:scenes` (`scripts/perf_scenes.cjs`, the GPU frame-rate check).
- README: quality tiers, "Moving around", measured frame rates, the corrected note that
  `vite preview` does proxy `/api`; frontend README: tiers, what keeps it smooth, camera,
  layout; playbook: this machine's GPU, performance and camera sections, decisions, traps,
  checklists, open items.

### Verification

| Check | Result |
| --- | --- |
| `npm run build` | Passes; entry imports only `core` |
| `npm run check:venues` | Lead times, peaks and held counts identical |
| `perf_scenes.cjs`, AUTO, Iris Xe, ratio 1.25 | Settles on medium; 90–100 fps in every venue; no frame over 50 ms; longest frame after a venue switch 16–34 ms (258 ms on the first switch after loading) |
| Pinned tiers, same machine | medium 62–78 fps, low 69–145, high 19–26 |
| Contact shadows, alternated back to back with a build without them | Within noise (plaza 78/80 vs 76/78 fps) |
| Camera controls on the GPU (held keys, 1 2 3 O, double-click, right-drag, wheel) | Every control moved the view (9–46 % of pixels changed); no page errors |
| Scene review on the GPU: every venue at medium, New Delhi and Chinnaswamy at high | No page errors; every image checked |
| `verify_console.cjs` | Every venue shows its banner, timeline panel, brief, warning and branch comparison; the walkthrough clicks through; no page errors; only React Three Fiber's known `THREE.Clock` warning |
| Python suites | 47 of 48 pass with the global 3.12 site-packages on `PYTHONPATH`; the 48th (offline training) cannot load scikit-learn's DLL, which Windows Application Control now blocks. No Python changed |
| Dev server, the way the user runs it (vsync on, GPU, two venue switches) | Previous commit `754c59d` on :3001: 12 fps. This work on :3000: 58 fps, AUTO chose MED. Both log the same 14 development-only React warnings ("Attempted to synchronously unmount a root"), one per drei `Html` overlay under StrictMode; the production build logs none |
| Each code commit built on its own | `dc850bf`, `157af3c`, `f12c977`, `b159f04` all build in a clean worktree |

### Open items

- `.venv` was recreated without system site-packages at 16:34, outside this session. Setting
  `include-system-site-packages = true` in `.venv\pyvenv.cfg` restores the documented setup;
  not changed here because someone else made the change.
- scikit-learn's DLL is now blocked by Application Control (it loaded this morning).
- High tier runs 20–26 fps on the Iris Xe; a cheaper ambient occlusion would help medium.
- The first visit to a venue compiles its shaders; `renderer.compileAsync` could hide it.
- Development-only React warnings from drei `Html` under StrictMode (14 on load); they
  predate this work and do not appear in the production build.

### Commits

`dc850bf` crowd as one mesh per zone · `157af3c` static merge and the light budget ·
`f12c977` render tiers and AUTO · `b159f04` free camera and controls · `f74ae2c` GPU
frame-rate check and `npm run demo` · `44fbf15` READMEs · `d43548f` session log and
playbook; pushed to `origin/main` as `754c59d..d43548f`, plus this note.
