import Papa from 'papaparse'
import type {
  Ablation, Bundle, Constraint, Drift, LineOverview, Manifest,
  ModelReport, PartRow, Paths, ReconstructionEval,
} from './types'

const BASE = `${import.meta.env.BASE_URL}data/`

/** Cache so each file is fetched at most once per session. */
const cache = new Map<string, unknown>()

async function loadJSON<T>(file: string): Promise<T> {
  if (cache.has(file)) return cache.get(file) as T
  const res = await fetch(BASE + file)
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${file}`)
  const json = (await res.json()) as T
  cache.set(file, json)
  return json
}

async function loadCSV<T>(file: string): Promise<T[]> {
  if (cache.has(file)) return cache.get(file) as T[]
  const res = await fetch(BASE + file)
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${file}`)
  const text = await res.text()
  const parsed = Papa.parse<T>(text, {
    header: true,
    dynamicTyping: true,
    skipEmptyLines: true,
  })
  if (parsed.errors.length) {
    const e = parsed.errors[0]
    throw new Error(`CSV parse error in ${file} at row ${e.row}: ${e.message}`)
  }
  cache.set(file, parsed.data)
  return parsed.data
}

export const loadManifest = () => loadJSON<Manifest>('manifest.json')
export const loadLineOverview = () => loadJSON<LineOverview>('line_overview.json')
export const loadReconstruction = () => loadJSON<ReconstructionEval>('reconstruction_eval.json')
export const loadConstraint = () => loadJSON<Constraint>('constraint.json')
export const loadModelReport = () => loadJSON<ModelReport>('model_report.json')
export const loadAblation = async (): Promise<Ablation> => {
  const a = await loadJSON<Ablation>('ablation.json')
  // Normalise the two field-name variants onto one shape for the UI.
  return {
    ...a,
    pr_auc_without_dark: a.pr_auc_without_dark ?? a.pr_auc_without_lowcov,
    pr_auc_with_dark: a.pr_auc_with_dark ?? a.pr_auc_with_lowcov,
    n_dark_features: a.n_dark_features ?? a.n_lowcov_features,
  }
}
export const loadDrift = () => loadJSON<Drift>('drift.json')
export const loadPaths = () => loadJSON<Paths>('paths.json')

export const loadParts = async (): Promise<PartRow[]> => {
  const rows = await loadCSV<Record<string, unknown>>('parts_sample.csv')
  // papaparse dynamicTyping leaves booleans as strings in some exports; normalise.
  return rows.map((r) => ({
    ...r,
    alert: r.alert === true || r.alert === 'True' || r.alert === 'true',
  })) as unknown as PartRow[]
}

/**
 * Load every file independently. A failure in one file is recorded in
 * `errors` and leaves that slice null — the app degrades honestly (Rule 4)
 * instead of crashing or inventing content.
 */
export async function loadBundle(): Promise<Bundle> {
  const errors: Record<string, string> = {}

  const settle = async <T>(file: string, fn: () => Promise<T>): Promise<T | null> => {
    try {
      return await fn()
    } catch (err) {
      errors[file] = err instanceof Error ? err.message : String(err)
      return null
    }
  }

  const [
    manifest, lineOverview, reconstruction, constraint,
    modelReport, ablation, drift, paths, parts,
  ] = await Promise.all([
    settle('manifest.json', loadManifest),
    settle('line_overview.json', loadLineOverview),
    settle('reconstruction_eval.json', loadReconstruction),
    settle('constraint.json', loadConstraint),
    settle('model_report.json', loadModelReport),
    settle('ablation.json', loadAblation),
    settle('drift.json', loadDrift),
    settle('paths.json', loadPaths),
    settle('parts_sample.csv', loadParts),
  ])

  return {
    manifest, lineOverview, reconstruction, constraint,
    modelReport, ablation, drift, paths, parts, errors,
  }
}
