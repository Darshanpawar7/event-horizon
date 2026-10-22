# Event Horizon — working notes for Claude

Read `Deepscan_Playbook.md` before changing anything. It holds the project's discipline,
the map of the code, how this machine is set up, the decisions already taken and why, and
the traps that cost time in earlier sessions. `session_log.md` is the chronological record
of what each session did and verified.

At the end of every session: append a dated entry to `session_log.md` (request, state
found, what was done with paths, what was verified with commands and results, what is
open) and fold any new trap, decision or convention into `Deepscan_Playbook.md`.

## Non-negotiables

- Every number on screen is labelled observed, simulated or unavailable. Nothing is ever
  labelled "safe". Demo and simulated data never pose as backend evidence.
- The historic reconstructions are simulations authored from published accounts. They are
  not footage, findings or predictions, and the UI must keep saying so.
- No automatic security call, announcement, gate change or physical action anywhere.

## Commands that matter

```powershell
# Python: use the 3.12 venv (default python is 3.14 with no packages)
.\.venv\Scripts\python.exe -m unittest test_crowd_signals test_crowd_forecast
.\.venv\Scripts\python.exe -m unittest discover -s .\backend\api -p "test_*.py"
.\.venv\Scripts\python.exe -m unittest discover -s .\backend -p "test_*.py"
.\.venv\Scripts\python.exe -m uvicorn app:app --app-dir .\backend\api --host 127.0.0.1 --port 8000

# Console
cd frontend_editable
npm run dev            # http://127.0.0.1:3000, proxies /api to the API
npm run build          # dist/ with core/three/charts chunks and .gz/.br siblings
npm run check:venues   # lead times and peaks for every reconstruction, no browser needed
npm run preview        # then, in another terminal: npm run verify:console (installed Chrome, headless)
```

## Conventions

- Files are CRLF on disk (core.autocrlf=true); edit with newline-preserving tools.
- Data modules under `src/data` and `src/lib` import each other with explicit `.js`
  extensions so Node can run them directly (the venue check depends on it).
- Commit only when asked. No Claude co-author trailers (see the user's global CLAUDE.md).
