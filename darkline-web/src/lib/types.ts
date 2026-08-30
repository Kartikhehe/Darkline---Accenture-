// Typed contract for the DARKLINE data bundle in public/data/.
// These types mirror the build spec exactly; the real bundle drops in unchanged.

export interface StationRow {
  station: string
  line: number
  station_no: number
  instrumentation: 'DARK' | 'MEASURED'
  is_dark: boolean
  n_numeric: number
  n_date: number
  median_dwell: number | null
  p25_dwell: number | null
  p75_dwell: number | null
  coverage_pct: number
  reconstruction_mae: number | null
  reconstruction_coverage: number | null
}

export interface LineOverview {
  stations: StationRow[]
  n_stations: number
  n_dark: number
  dark_pct: number
  n_parts: number
  failure_rate: number
  time_units_note: string
  source: 'REAL'
}

export interface PerStationRecon {
  station: string
  instrumentation: string
  n_test: number
  mae: number
  median_ae: number
  coverage_90: number
  baseline_mae: number
  skill_vs_baseline: number
}

export interface ReconstructionEval {
  summary: {
    mean_coverage_90: number
    mean_mae: number
    mean_skill: number
    gate_passed: boolean
  }
  per_station: PerStationRecon[]
  scatter: { station: string; truth: number[]; pred: number[] } | null
}

export interface ConstraintWindow {
  window: number
  t_start: number
  t_end: number
  bottleneck: string
  is_dark: boolean
  shares: Record<string, number>
}

export interface Constraint {
  windows: ConstraintWindow[]
  migration: Array<{ window: number; station: string; is_dark: boolean }>
  dark_constraint_share: number
  method: string
}

export interface ModelReport {
  split_sizes: { train: number; val: number; test: number }
  test_failure_rate: number
  pr_auc: number
  pr_auc_ci: [number, number]
  mcc: number
  threshold: number
  n_alerts: number
  precision: number
  recall: number
  lift_over_random: number
  precision_at_50: number
  precision_at_100: number
  precision_at_500: number
  precision_at_1000: number
  pr_curve: { precision: number[]; recall: number[] }
  calibration: Array<{ predicted: number; observed: number; n: number }>
  cost_curve: Array<{ threshold: number; n_alerts: number; escapes: number; cost: number }>
  cost_optimal: { threshold: number; n_alerts: number; escapes: number; cost: number }
  leakage_controls: string[]
}

export interface Ablation {
  pr_auc_without_dark: number
  pr_auc_with_dark: number
  delta: number
  relative_pct: number
  n_dark_features: number
  verdict: string
}

export interface DriftAbsent { found: false; note: string }

export interface DriftPresent {
  found: true
  feature: string
  cp_index: number
  cp_time: number
  t: number[]
  v: number[]
  z: number[]
  mu: number
  sd: number
  ucl: number
  lcl: number
  drift_magnitude_sigma: number
  corroboration: Array<{ signal: string; station: string; shift_sigma: number; stable: boolean }>
  independent_stable_signals: number
  boundary_may_move: boolean
  containment: {
    naive_population: number
    darkline_population: number
    reduction_pct: number
    sample_part_ids: number[]
  }
}

export type Drift = DriftAbsent | DriftPresent

export interface Paths {
  paths: Array<{ path_signature: string; n: number; fail_rate: number; median_cycle: number }>
  note: string
}

export interface PartRow {
  Id: number
  first_timestamp: number
  last_timestamp: number
  total_cycle_time: number
  n_stations_visited: number
  path_signature: string
  split: 'train' | 'val' | 'test'
  Response: number
  risk_score: number
  alert: boolean
}

export interface Manifest {
  generated_utc: string
  dataset: string
  source: string
  n_parts: number
  notes?: string
}

export interface Bundle {
  manifest: Manifest | null
  lineOverview: LineOverview | null
  reconstruction: ReconstructionEval | null
  constraint: Constraint | null
  modelReport: ModelReport | null
  ablation: Ablation | null
  drift: Drift | null
  paths: Paths | null
  parts: PartRow[] | null
  /** Per-file load errors, keyed by filename. Rule 4: surface, never fabricate. */
  errors: Record<string, string>
}
