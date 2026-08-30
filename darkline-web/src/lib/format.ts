/** Number formatting. Rule 2: never append a unit that the data does not carry. */

export const fmt = (v: number | null | undefined, dp = 2): string =>
  v === null || v === undefined || Number.isNaN(v) ? '—' : v.toFixed(dp)

export const fmtInt = (v: number | null | undefined): string =>
  v === null || v === undefined || Number.isNaN(v) ? '—' : Math.round(v).toLocaleString('en-US')

export const fmtPct = (v: number | null | undefined, dp = 1): string =>
  v === null || v === undefined || Number.isNaN(v) ? '—' : `${(v * 100).toFixed(dp)}%`

/** For values already expressed as a percentage (e.g. dark_pct = 34.6). */
export const fmtPctRaw = (v: number | null | undefined, dp = 1): string =>
  v === null || v === undefined || Number.isNaN(v) ? '—' : `${v.toFixed(dp)}%`

/** Bosch timestamps are anonymised relative units — render bare, never as a date. */
export const fmtTime = (v: number | null | undefined, dp = 2): string =>
  v === null || v === undefined || Number.isNaN(v) ? '—' : v.toFixed(dp)

export const TIME_UNITS_NOTE = 'Bosch time units (anonymised, not wall-clock)'

/** Parse "L3_S32" into its parts for display. Never renames a station. */
export const stationParts = (code: string): { line: string; station: string } => {
  const m = /^L(\d+)_S(\d+)$/.exec(code)
  return m ? { line: `L${m[1]}`, station: `S${m[2]}` } : { line: '', station: code }
}

/**
 * recharts v3 types tooltip formatter values as `ValueType | undefined`.
 * Coerce once here so call sites stay readable and type-safe.
 */
export const asNum = (v: unknown): number =>
  typeof v === 'number' ? v : Number(v ?? NaN)
