import {
  createContext, useContext, useEffect, useMemo, type ReactNode,
} from 'react'

export type Theme = 'dark' | 'light'
const STORAGE_KEY = 'darkline.theme'

interface ThemeCtx { theme: Theme; toggle: () => void; set: (t: Theme) => void }
const Ctx = createContext<ThemeCtx>({ theme: 'dark', toggle: () => {}, set: () => {} })

/**
 * The console ships dark-only. There is no user-facing theme control, so the
 * theme is fixed here rather than read from storage or the OS preference —
 * without a toggle, a stale stored value or a light OS setting would strand a
 * viewer in a mode they cannot leave.
 *
 * The token plumbing below (CSS variables, useChartTheme) is intentionally kept:
 * light-mode tokens still exist in index.css and are verified, so re-enabling a
 * toggle is a UI change, not a re-plumbing job.
 */
const FIXED_THEME: Theme = 'dark'

export function ThemeProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', FIXED_THEME)
    // Clear any preference persisted by an earlier build that had a toggle.
    try { localStorage.removeItem(STORAGE_KEY) } catch { /* non-fatal */ }
  }, [])

  const value = useMemo<ThemeCtx>(
    () => ({ theme: FIXED_THEME, toggle: () => {}, set: () => {} }),
    [],
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export const useTheme = () => useContext(Ctx)

/**
 * Chart colours. recharts takes literal colour strings, not CSS classes, so the
 * palette is resolved from the live CSS variables and re-read on theme change.
 */
export interface ChartColors {
  bg: string; panel: string; card: string; border: string
  accent: string; accentLt: string; amber: string; red: string; green: string; cyan: string
  text1: string; text2: string; text3: string; seriesInk: string
}

const readVar = (name: string, fallback: string): string => {
  if (typeof window === 'undefined') return fallback
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return v || fallback
}

export function useChartColors(): ChartColors {
  const { theme } = useTheme()
  return useMemo(
    () => ({
      bg: readVar('--bg', '#0B0C14'),
      panel: readVar('--panel', '#12131F'),
      card: readVar('--card', '#1A1B2B'),
      border: readVar('--border', '#252639'),
      accent: readVar('--accent', '#A100FF'),
      accentLt: readVar('--accent-lt', '#C98BFF'),
      amber: readVar('--amber', '#FF9E1B'),
      red: readVar('--red', '#FF4D57'),
      green: readVar('--green', '#00D68F'),
      cyan: readVar('--cyan', '#37D3E8'),
      text1: readVar('--text-1', '#F2F2F7'),
      text2: readVar('--text-2', '#9A9BB0'),
      text3: readVar('--text-3', '#5E5F75'),
      seriesInk: readVar('--series-ink', '#F2F2F7'),
    }),
    // Re-resolve whenever the theme attribute changes.
    [theme],
  )
}

/** Shared recharts furniture, themed. */
export function useChartTheme() {
  const c = useChartColors()
  return useMemo(
    () => ({
      c,
      axis: { fill: c.text3, fontSize: 10, fontFamily: 'JetBrains Mono' },
      grid: c.border,
      axisLine: { stroke: c.border },
      tooltip: {
        background: c.panel,
        border: `1px solid ${c.border}`,
        borderRadius: 8,
        fontSize: 11,
        color: c.text1,
      },
      cursorFill: { fill: c.text1, fillOpacity: 0.05 },
      label: { fill: c.text2, fontSize: 11 },
    }),
    [c],
  )
}
