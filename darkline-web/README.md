# DARKLINE

**A behavioural digital twin for vehicle assembly lines — built and validated on 1.18M real production parts.**

Team **CORTEX** · IIT Kanpur · Accenture Innovation Challenge 2026 · Problem Statement 4: `DigitalTwin.ai`

`Live demo` → *(deployment URL)* · `Dataset` → [Bosch Production Line Performance](https://www.kaggle.com/competitions/bosch-production-line-performance) · `Stack` → Python · LightGBM · React 19 · TypeScript · Vite

---

## The idea in one paragraph

A production line loses money in two ways nobody can see. The constraint moves during a shift, so yesterday's fix points at the wrong station today. And when a process drifts, quality cannot prove which units are clean — so the plant quarantines hundreds of parts to find a handful of real defects. **DARKLINE is a behavioural twin, not a geometric one.** No 3D model, no physics engine, no new hardware. It reconstructs station timing from scan data the plant already collects, locates the constraint while it is still forming, and produces part-level evidence that shrinks a quarantine population by an order of magnitude.

Every number below is computed on real Bosch data, on a held-out temporal split, and traces to a machine-generated artifact in `darkline-web/public/data/`.

---

## Headline results

| Result | Value | Evidence |
|---|---|---|
| **Quarantine population reduced** | **66,495 → 20,016 parts (−69.9%)** on a corroborated drift event at `L1_S24` | [`drift.json`](darkline-web/public/data/drift.json) |
| **Constraint migration detected** | **7 distinct bottleneck stations across 24 time windows** — the constraint genuinely moves | [`constraint.json`](darkline-web/public/data/constraint.json) |
| **Dwell reconstruction skill** | **+47.8% error reduction** vs. median baseline on stations where dwell varies; **+91.8% at `L3_S37`** | [`reconstruction_eval.json`](darkline-web/public/data/reconstruction_eval.json) |
| **Routing-path confound quantified** | Failure rate varies **3.15×** across routing paths (0.25% → 0.78%) | [`paths.json`](darkline-web/public/data/paths.json) |
| **Defect risk model** | PR-AUC **0.00939** [CI 0.0073–0.0127] against a 0.377% base rate — **2.49× lift**, held-out test | [`model_report.json`](darkline-web/public/data/model_report.json) |

Scale: **1,183,747 parts · 52 stations · 4 production lines · 14,382,158 station visits**.

---

## What this is not

It is worth being direct about this, because the obvious solution to a manufacturing dataset is a defect classifier, and that is not what we built.

A classifier tells you a part is probably bad. It cannot tell you **which** parts are provably good — and that distinction is where the money is. When a torque tool is found to have drifted, the plant does not quarantine 200 parts because 200 are defective. It quarantines 200 because it **cannot prove 188 of them are clean**. DARKLINE attacks that: change-point localisation plus independent corroboration moves the suspect boundary forward in time, and the released population comes with a per-part evidence trail.

Our classifier is the weakest component in this repository, and deliberately so. The containment engine is the product.

---

## Architecture

```
Bosch raw (14 GB)
   │
   ├── Notebook A · extraction ──────────────────────────────┐
   │     1,157 date columns → 1 first-touch timestamp/station │
   │     52-station catalog · routing DAG · temporal split    │  checkpointed,
   │                                                          │  crash-resumable
   ├── Notebook B · engines ─────────────────────────────────┤
   │     E1 measurement coverage    E4 drift + change-point   │
   │     E2 dwell reconstruction    E5 containment            │
   │     E3 Active Period Method    E6 calibrated risk model  │
   │                                                          │
   └── JSON bundle (9 files, ~200 KB) ───────────────────────┘
             │
             ▼
   Static React 19 console — no backend, no database, no API
```

**The absence of a backend is a design decision, not a shortcut.** The console reads pre-computed JSON from `public/data/`. It deploys as static files, loads instantly, works offline, and has no server that can fail during evaluation. All heavy computation happens once, offline, and is reproducible from the notebooks.

---

## The engines

### 1 · Dwell reconstruction — recovering a station you cannot observe

For a station with no scan point, the observed interval between its neighbours is not its processing time; it contains transit, queue wait, processing and blocking. We decompose it: a transit floor from the p5 of the transition under low traffic, a queue term derived from segment work-in-progress via a sorted event sweep (O(n log n), never a row-wise scan over 1.18M parts), and processing as the residual. Uncertainty comes from **LightGBM quantile regression at α = 0.05 / 0.50 / 0.95** — a real prediction interval, not a point estimate with an assumed error bar.

**Validation is withhold-and-recover.** We take stations we *can* observe, hide their timestamps, reconstruct them with the identical estimator, and score against the truth we hid from ourselves.

A note on how we report this. Bosch timestamps quantise at 0.01 units, and at 30 of 52 stations the true dwell collapses to exactly zero — the target is degenerate and predicting zero is trivially correct. Reporting a pooled average across all stations would inflate our result, so we segment:

| Station group | n | Mean skill vs. baseline | 90% coverage | Mean MAE |
|---|---|---|---|---|
| **Dwell has real variance** (`baseline_mae > 0.01`) | 7 | **+0.478** | 0.969 | 0.0140 |
| Dwell quantises to ~0 (trivial) | 7 | +0.294 | 0.988 | 0.0027 |

The strongest case is `L3_S37`: a median-predictor baseline gives MAE 0.4503; reconstruction gives **0.0367** — a **91.8% error reduction** across 32,523 held-out parts. `L0_S1` reaches +0.761 and `L0_S8` +0.591.

### 2 · Constraint detection — Active Period Method

We use the **Active Period Method** (Roser, Nakano & Tanaka, 2001): the station with the longest average uninterrupted active period is the momentary bottleneck. This method was chosen for a specific reason — it requires only working-versus-waiting states, which is precisely what dwell reconstruction recovers. A utilisation-ratio approach would need measurement data that an unobserved station does not have.

Across 24 time windows the constraint lands on **7 different stations**: `L1_S25` (11 windows), `L2_S26` (4), `L2_S27` (3), `L1_S24` (3), and single windows at `L0_S9`, `L0_S10`, `L2_S28`. The shifting bottleneck is not a hypothesis here; it is measured.

### 3 · Drift, corroboration and containment

Control limits are set at ±3σ of each feature's own early stable regime. They are **statistical control limits derived from data — not engineering specification limits.** Bosch measurements are anonymised and scaled; we do not know the real specs and never claim to.

Detection: Mann–Kendall for monotonic trend, PELT change-point detection on the rolling median. The strongest event found is `L1_S24_F1581`, change-point at t = 405.22, magnitude **1.65σ**.

Then the part that matters most:

> **A tool's own readings can never certify its own past.** Using a drifting sensor's history to prove when it was still healthy is circular. The suspect boundary may only move when a **physically independent** signal confirms stability across the window.

This is enforced in code, not documented as an intention: `boundary_may_move` is set from `independent_stable_signals >= 1`, and the containment query is gated on it. With corroboration satisfied, the quarantine population falls from **66,495 to 20,016 parts — 46,479 units released with evidence**, a 69.9% reduction.

### 4 · Defect risk model — rebuilt to be leak-free

An earlier iteration of this project reported 33.2% precision. That number came from scoring the entire dataset — including training rows — with a threshold tuned on validation. We found it, and rebuilt the model with five controls:

- Temporal split by `first_timestamp` (70 / 15 / 15) — **never random**, because manufacturing data is time-ordered and a random split leaks the future
- Numeric feature screening computed on **training rows only**
- Operating threshold selected on validation, applied **unchanged** to test
- Isotonic calibration fitted on validation, so scores are probabilities rather than `scale_pos_weight`-distorted margins
- Test split scored **exactly once**

Held out on 177,563 parts: PR-AUC **0.00939** [CI 0.0073–0.0127], MCC 0.0659, precision 7.00%, recall 6.88% — **2.49× lift over random** at a 0.377% base rate.

We also report a **cost curve**, because a plant manager decides on expected cost, not PR-AUC. At an inspection:escape cost ratio of 1:60, the optimum sits at threshold 0.0150 — 840 alerts, 618 escapes, total cost 37,920 — meaningfully better than the MCC-optimal point.

---

## Findings that changed our approach

Research that only confirms its own premise is not research. Three findings redirected this project mid-build, and each is reported here rather than quietly absorbed.

**1 · Bosch has almost no unmonitored stations, so we changed what we were measuring.**
We began from the industry observation that a large share of stations on brownfield lines are unmonitored, and set out to quantify it. The data disagreed: only **2 of 52 stations** have zero numeric features, and just **19 of 14,382,158 station visits** (0.00013%) produce no measurement.

Rather than adjust the claim, we adjusted the study. Bosch turns out to be close to an **ideal validation set for reconstruction precisely because it is fully instrumented** — every station is ground truth we can hide and recover. So we separated two claims that had been tangled together. *Prevalence* — that brownfield lines have unmonitored stations — is an industry characteristic we cite, not one we measured. *Capability* — that dwell at an unobserved station is recoverable, with a measured error and a calibrated interval — is what this repository establishes. We validated the method where we can check ourselves, so it can be deployed where we cannot.

**2 · Our own withhold experiment was leaking, and we caught it.**
The first reconstruction run produced an MAE of 0.009 against a timestamp granularity of 0.01 — suspiciously perfect. It was. The feature set included the previous station's dwell, `t_hidden − t_prev`, alongside the observed interval `t_next − t_prev`. Their difference is the target, exactly. When you hide a station's timestamp, the preceding station's dwell also becomes unknowable. We removed the feature and re-ran; the numbers reported above are from the corrected experiment.

**3 · Failure rate varies 3.15× across routing paths.**
Paths range from 0.25% to 0.78% failure. Any pass/fail comparison of dwell time that does not control for routing path is confounded by path, not explained by dwell. This invalidated an earlier station-gap "finding" of ours and is surfaced prominently in the console's Part Ledger so no reader repeats the mistake.

---

---

## Business case and rollout

**Value comes from avoided loss, not new capex.** Automotive line stoppage costs up to **$2.3M per hour** (Siemens/Senseye, *True Cost of Downtime* 2024 — roughly double the 2019 figure), and unplanned downtime costs Fortune Global 500 manufacturers ~$1.4T annually, about 11% of revenue. On the quality side, Ford's Q2 FY24 warranty costs spiked $800M in a single quarter against $1.2B of Ford Blue operating profit — recall exposure is a P&L event, not an operational footnote.

DARKLINE monetises four things: recall containment (the ~70% quarantine reduction measured above), recovered throughput from naming the constraint while it forms, avoided retrofit capex via the Coverage Advisor, and engineering hours returned by replacing cold-trail root-cause investigation with a per-part ledger.

*These monetary translations are illustrative models on published benchmarks, not a measured client result. The 69.9% containment figure is measured; its dollar value is a model.*

## Deployment: read-only by architecture

The fastest way to lose a plant's trust is to touch line control. DARKLINE never does — **no control writes exist in the codebase.** It consumes a historian export, an OPC-UA subscription, or a nightly CSV drop. Worst case, the twin goes offline and the line runs exactly as before.

| Phase | Window | What happens |
|---|---|---|
| 1 | Week 1–2 | Historical export only. Zero plant involvement beyond an IT dump. |
| 2 | Week 3–4 | Backtest offline. Success test: the twin finds a constraint the plant already knows about. |
| 3 | Week 5–8 | Shadow mode. Live read-only feed; predictions logged, nobody acts on them. |
| 4 | Week 9–12 | Supervised action. Supervisor decides; accepted-vs-overridden is tracked. |
| 5 | Quarter 2 | First scan point added — only where the Coverage Advisor ranked it first, during a scheduled window. |

Shadow mode is the trust mechanism. A plant burned by false alarms will not act on a new system until it has watched it be right for a month.

## Three users, one model

| User | Horizon | Needs | Sees |
|---|---|---|---|
| Floor supervisor | Seconds–minutes | Keep the line moving this shift | Line strip, one ranked action, slow-vs-starved-vs-blocked |
| Plant manager | Days–weeks | Plan capacity and quality | Bottleneck migration, drift watchlist, coverage advisor |
| Leadership | Quarters | Decide the rollout | Cost curve, model report, payback per line |

The supervisor never sees a PR-AUC; leadership never sees a station code. Same engines, three vocabularies.

## Where this sits in the market

Accenture's **Physical AI Orchestrator** (launched Oct 2025, built on NVIDIA Omniverse and AI Refinery) delivers live geometric twins for automated plants — its own warehouse deployment reported a 20% throughput improvement and 15% capex saving. Brownfield lines cannot buy that yet: they fail the entry condition, because a geometric twin needs instrumentation that has not been retrofitted.

DARKLINE is the on-ramp, not the competitor. It runs where a physics-grade twin cannot, produces the evidence that justifies instrumentation, and hands a now-qualified line onward. That widens the addressable base rather than contesting it.

## Limitations

Stated plainly, because a system whose failure modes are undocumented cannot be trusted in a plant.

**Prediction intervals over-cover.** Mean 90% interval coverage is **0.978** against a target band of [0.85, 0.95], so our stated gate fails and the console renders a red `INTERVALS MISCALIBRATED` badge rather than hiding it. The direction matters: the intervals are **conservative, not optimistic** — they are wider than necessary rather than claiming precision they do not have. For an operational decision-support tool this is the safe failure mode, but it is a failure and we report it as one. The likely cause is the degenerate-dwell issue above; tightening it requires either finer timestamp resolution or a mixture model separating the zero-inflated component.

**Corroboration rests on a single independent signal.** The change-point at `L1_S24` is corroborated by the rolling line failure rate (shift 0.137σ, stable), but our cross-station feature checks returned no usable second signal. One corroborator satisfies our coded rule; a production deployment should require at least two from physically distinct measurement chains. This is the weakest link in an otherwise conservative design, and we would not ship it as-is.

**The dark-station ablation is a null result with a trivial cause.** Removing dark-station timing features changed PR-AUC by exactly 0.00000. The two structurally dark stations, `L3_S42` and `L3_S46`, are visited by 15 and 1 parts respectively — 16 visits out of 14.38 million. There was never enough traffic for an ablation to be meaningful. We report the null rather than removing the experiment.

**Model performance is modest.** 2.49× lift over random is a real signal but a weak one. Bosch is a famously difficult benchmark — competition-winning solutions reached MCC ≈ 0.49 using the full 968-feature numeric matrix with extensive engineering; we screened 60 features by in-fold correlation and added timing features. The remaining headroom is feature engineering, not method. Notably, calibrated probabilities are coarsely binned, which is why `precision@50`, `@100` and `@500` are identical and the cost curve renders as a step function.

**Anonymised units.** Bosch timestamps are relative floats, not wall-clock; measurements are scaled and unitless. The console therefore shows no clock times, no engineering units, and no VINs — parts have IDs, stations are `L3_S32`. Nothing in this repository invents a unit it cannot source.

**Single-dataset validation.** Every result here is from one dataset from one manufacturer. Generalisation is untested.

---

## Design integrity: inferred vs. measured

The console renders **every inferred value in cyan with a dotted underline**, and every measured value in white. This is enforced through two components rather than by convention, and verified mechanically — a DOM check across all eight routes confirms every `data-inferred` element resolves to `rgb(55, 211, 232)`. A permanent legend sits in the sidebar.

The rule exists because a twin that presents an estimate as a measurement is worse than no twin at all. Every number also carries a provenance tooltip naming the artifact file and field it came from. There are no hardcoded metrics in any component: if a figure is not in `public/data/`, it does not appear on screen.

The console also **degrades honestly**. We tested this by deleting artifact files from a production build: missing data produces a named, explained empty state, never a placeholder chart and never a fabricated series.

---

## Repository

```
darkline/
├── notebooks/
│   ├── darkline_A_extraction.ipynb    # checkpointed, crash-resumable
│   └── darkline_B_engines.ipynb       # all six engines + bundle export
├── darkline-web/
│   ├── public/data/                   # the 9-file artifact bundle
│   └── src/                           # React 19 + TS + Vite + Tailwind
├── legacy/streamlit_explorer/         # superseded exploration tool
└── docs/
```

`legacy/streamlit_explorer/` holds the earlier Streamlit prototype. It reported in-sample metrics and has been superseded by the console, which reports held-out test metrics only. It is retained for provenance rather than deleted.

## Reproducing

```bash
# Console
cd darkline-web && npm install && npm run dev        # → localhost:5173
npm run build                                        # → dist/ (220 KB gzipped)
```

```
# Pipeline (Kaggle, CPU, internet on, persistence on)
1. Join the Bosch competition and attach the dataset
2. Run notebooks/darkline_A_extraction.ipynb  (~30 min, checkpointed)
3. Save Version → Save & Run All
4. In Notebook B: Add Input → Your Work → Notebook A's output
5. Run notebooks/darkline_B_engines.ipynb     (~40 min)
6. Download darkline_bundle.zip → darkline-web/public/data/
```

Dependencies: `numpy · pandas · pyarrow · scikit-learn · lightgbm · ruptures` (Python 3.11); `react@19 · react-router@7 · recharts@3 · tailwindcss · papaparse` (Node 20).

## References

Roser, Nakano & Tanaka (2001), *A Practical Bottleneck Detection Method* — Active Period Method · Killick, Fearnhead & Eckley (2012), *Optimal Detection of Changepoints* — PELT · Hamed & Rao (1998), modified Mann–Kendall for autocorrelated data · Bosch Production Line Performance, Kaggle, 2016

---

<sub>Team CORTEX · Muskan Kumari · Kartik Raj · Shivanee Shrivas · IIT Kanpur</sub>