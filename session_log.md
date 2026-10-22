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
