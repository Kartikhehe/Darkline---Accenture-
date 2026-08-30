# DARKLINE Console

Behavioural digital twin for a vehicle assembly line.
**Team CORTEX · IIT Kanpur · Accenture Innovation Challenge 2026 · PS4: DigitalTwin.ai**

A large fraction of stations on a real production line are **timed but not measured** — we know a
part passed through and when, but nothing about what happened to it there. DARKLINE reconstructs
those blind stations from neighbouring timestamps, locates the line's constraint including inside
the blind zone, and produces part-level evidence that shrinks a quality quarantine.

Data source: **Bosch Production Line Performance** (1.18M parts, 4 lines, ~52 stations, 0.58%
failure rate).

## Running

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # -> dist/
npm run preview
```

Static output. No backend, no API, no database — deploys to Vercel or GitHub Pages as-is.

## The data bundle

Every figure in the UI is read from `public/data/`. Nothing is hardcoded in a component.

| File | Contents |
|---|---|
| `manifest.json` | dataset name, `generated_utc`, `source` |
| `line_overview.json` | station catalog, instrumentation status, dwell distribution |
| `reconstruction_eval.json` | withhold-and-recover results, per-station MAE and interval coverage |
| `constraint.json` | bottleneck per rolling window, migration, dark constraint share |
| `model_report.json` | held-out test metrics, PR curve, calibration, cost curve, leakage controls |
| `ablation.json` | PR-AUC with and without reconstructed dark-station features |
| `drift.json` | change-point with corroboration, **or** `{"found": false, "note": ...}` |
| `paths.json` | routing paths with per-path failure rate |
| `parts_sample.csv` | per-part ledger |

`npm run placeholder` regenerates a schema-correct **placeholder** bundle. The real bundle drops
into `public/data/` unchanged; set `manifest.source` to `REAL` and the top bar switches from the
amber `PLACEHOLDER DATA` badge to `REAL DATA · BOSCH`.

## Four rules

1. **Inferred vs measured is visible everywhere.** Inferred values render in cyan `#37D3E8` with a
   dotted underline; measured values render white. Enforced by the `<Measured>` / `<Inferred>`
   components in `src/components/Value.tsx` — every numeric value in the app goes through one of
   them. Permanent legend in the sidebar footer.
2. **No invented labels.** Stations are `L3_S32`, never "Welding". Rows are **Parts** with an `Id`,
   never "Vehicles". Timestamps are anonymised relative Bosch time units, not wall-clock, and are
   labelled as such wherever they appear. Measurements are scaled and unitless — no unit is ever
   appended.
3. **Every number traces to a file.** Both value components require a `src` prop naming the file and
   field, which becomes a provenance tooltip.
4. **Degrade honestly.** A missing file names itself and states what it would have shown. When
   `drift.json` is `{"found": false}`, the Drift and Containment screens render a designed empty
   state rather than a fabricated series.

## Theming

The console is **dark-only**. There is no theme switcher: the theme is fixed in
`src/lib/theme.tsx` and stamped onto the document before first paint, so neither a stale stored
preference nor a light OS setting can put a viewer into a mode they have no control to leave.

The token plumbing is kept underneath. Every colour — including chart colours, since recharts takes
literal strings rather than classes — resolves through a CSS variable via `useChartTheme()`, and no
component hardcodes a hex value. The light palette still exists in `src/index.css` and was
contrast-verified, so restoring a switcher later is a UI change rather than a re-plumbing job.

Contrast against the background: cyan 10.81:1, amber 9.43:1, green 10.23:1, red 5.99:1, and
`text-3` (11px uppercase micro-labels) 5.33:1 — all clearing WCAG AA. The one token below AA is the
accent purple at 3.68:1, used for fills and large text only; chart legend labels use the lighter
`accent-lt` at 8.00:1 instead.

## Methods

- **Dark station** — appears in the timing columns but carries no numeric measurement columns:
  observed in time, unobserved in measurement.
- **Dwell reconstruction** — the interval between two observed timestamps contains transit, queue,
  processing and blocking. Decomposed into a transit floor, a queueing term from segment WIP
  (computed by sorted event sweep, not a per-part scan), and a residual treated as processing.
  Uncertainty comes from a quantile model at α = 0.05 / 0.50 / 0.95, so every inferred value carries
  a real prediction interval.
- **Validation** — withhold-and-recover: hide an instrumented station, reconstruct it with the
  identical estimator, score against the hidden truth. The gate is 90% interval coverage in
  [0.85, 0.95]; outside that range the intervals are not trustworthy and the screen says so.
- **Constraint** — Active Period Method (Roser, Nakano & Tanaka, 2001). Chosen because it needs only
  working-versus-waiting states, which is exactly what dwell reconstruction recovers — that is what
  makes locating a constraint inside the unmeasured zone possible at all.
- **Drift** — Mann–Kendall with the Hamed–Rao correction for autocorrelation; PELT for the
  change-point; control limits at ±3σ of the learned stable regime, labelled as **statistical
  control limits derived from data**, never engineering spec limits.
- **Corroboration** — the suspect-window boundary may only move when at least one physically
  independent signal is verified stable across the window. A tool's own readings cannot certify its
  own past.

## Limitations

- Where two or more unmeasured stations share one observed segment, only their combined dwell is
  recoverable; those estimates are reported at segment granularity, never as a single station.
- Bosch measurements are scaled and unitless; timestamps are anonymised and relative.
- Single-dataset validation — nothing here is shown to transfer to another line.
- Observational data, not a controlled experiment: associations are not causal claims.

## References

- Roser, C., Nakano, M. & Tanaka, M. (2001). *A practical bottleneck detection method.* Proc. 2001
  Winter Simulation Conference, 949–953.
- Killick, R., Fearnhead, P. & Eckley, I. A. (2012). *Optimal detection of changepoints with a linear
  computational cost.* JASA 107(500), 1590–1598.
- Hamed, K. H. & Rao, A. R. (1998). *A modified Mann–Kendall trend test for autocorrelated data.*
  J. Hydrology 204(1–4), 182–196.
- Bosch (2016). *Bosch Production Line Performance.* Kaggle.

## Stack

React 19 + TypeScript + Vite + Tailwind 3 + recharts + lucide-react + papaparse + react-router.
Guided demo mode at `?demo=1`.
