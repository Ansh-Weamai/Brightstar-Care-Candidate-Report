# BrightStar Deal Screen Console

A guided, 5-step demo that shows what happens when a franchise deal's two
existing data sources — FranConnect's Lead Heat Index and GbBis's
territory data — are read together and combined with signals neither
system tracks today (competing agencies, caregiver labor market,
licensure/moratorium status, comparable-territory history). The result
is a single Suitability Score with a transparent factor breakdown and a
band-specific recommendation, not a replacement for either existing tool.

Steps 1–3 collect/display candidate and territory inputs (Steps 2 and 3
are deliberately styled like the existing FranConnect/GbBis screens
they're reading from — not our brand — to make the contrast obvious).
Step 4 is the fusion moment where the real scoring API is called. Step 5
shows the full result and a recommendation panel that branches by score
band.

The scoring engine (`app/scoring/`) is real, tested Python served by
FastAPI — not a client-side mock. The frontend is plain HTML/CSS/JS
calling that API; there's no build step.

See `docs/demo-paths.md` for the 5 quick-select demo scenarios on Step 1,
each engineered to deterministically hit one of the five possible Step 5
outcomes (High / Medium-candidate-driven / Medium-territory-driven /
Low-candidate-driven / Low-territory-driven).

## Running it

From the project root, with the virtual environment already created
(`.venv/`) and dependencies installed:

```
.venv\Scripts\activate
uvicorn app.main:app --reload
```

Then open **http://127.0.0.1:8000/** in a browser.

First-time setup, if `.venv/` doesn't exist yet:

```
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

## Running the tests

```
.venv\Scripts\activate
python -m unittest app.scoring.test_engine app.scoring.test_api -v
```

`test_engine.py` tests the scoring logic directly; `test_api.py` hits
`/api/territory` and `/api/score` over HTTP (FastAPI's TestClient),
including the 5 demo-zip scenarios that lock in each Step 5 outcome path.

## Project layout

```
app/
  main.py              FastAPI app: serves the tour + /api/territory, /api/score
  scoring/
    engine.py           Candidate Readiness / Territory Viability / overall scoring
    rules.py             Weights, thresholds, and banding — the actual business rules
    mockdata.py          The one place zip-seeded GbBis mock data is generated
    test_engine.py        Unit tests (in-process)
    test_api.py            Integration tests (real HTTP, via TestClient)
  templates/tour.html   The live app page
  static/
    css/                 One stylesheet per step/component
    js/
      lib/                Shared helpers (API client, seeded random, scoring client)
      steps/               One file per tour step
logos/                  Drop BrightStar logo assets here
docs/demo-paths.md      Which zip + Step 1 defaults hit which Step 5 outcome
design-tokens.html      Standalone style-guide / swatch page (open directly, no server)
