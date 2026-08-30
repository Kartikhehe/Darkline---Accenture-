import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend,
} from 'recharts'
import { useChartTheme } from '../lib/theme'
import { useBundle } from '../lib/BundleContext'
import { Chip, Panel, ScreenHeader } from '../components/UI'
import { Inferred, Measured } from '../components/Value'
import { Loading, MissingFile } from '../components/States'
import { TIME_UNITS_NOTE, asNum, fmt, fmtPct } from '../lib/format'

export default function Constraint() {
  const { bundle, loading } = useBundle()
  const t = useChartTheme()
  if (loading) return <Loading what="constraint analysis" />
  if (!bundle?.constraint) {
    return (
      <MissingFile
        file="constraint.json"
        would="the momentary bottleneck per rolling window, its migration over time, and the share of windows where the constraint sits in an unmeasured station"
        error={bundle?.errors['constraint.json']}
      />
    )
  }

  const c = bundle.constraint
  const darkSet = new Set(bundle.lineOverview?.stations.filter((s) => s.is_dark).map((s) => s.station) ?? [])

  // Top 8 stations by total share across all windows.
  const totals = new Map<string, number>()
  for (const w of c.windows) for (const [st, v] of Object.entries(w.shares)) totals.set(st, (totals.get(st) ?? 0) + v)
  const top = [...totals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([s]) => s)

  const counts = new Map<string, number>()
  for (const w of c.windows) counts.set(w.bottleneck, (counts.get(w.bottleneck) ?? 0) + 1)
  const mostFrequent = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0]

  const data = c.windows.map((w) => {
    const row: Record<string, number> = { t_start: w.t_start }
    for (const st of top) row[st] = w.shares[st] ?? 0
    return row
  })

  const colorFor = (st: string) =>
    st === mostFrequent ? t.c.amber : darkSet.has(st) ? t.c.cyan : t.c.accent
  // Legend labels are 10px: use the lighter accent so purple clears AA on dark.
  const legendColorFor = (st: string) =>
    st === mostFrequent ? t.c.amber : darkSet.has(st) ? t.c.cyan : t.c.accentLt

  return (
    <>
      <ScreenHeader
        title="Constraint"
        subtitle="The line's momentary bottleneck, tracked over rolling windows. The constraint moves during a shift — and it frequently sits in a station nobody measures."
      />

      <div className="grid grid-cols-[1fr_300px] gap-4">
        <div className="flex flex-col gap-4">
          <Panel
            title="Bottleneck share over time"
            right={
              <div className="flex gap-2">
                <Chip tone="amber">Most frequent</Chip>
                <Chip tone="cyan">Dark station</Chip>
                <Chip tone="accent">Measured</Chip>
              </div>
            }
          >
            <ResponsiveContainer width="100%" height={340}>
              <AreaChart data={data} margin={{ top: 8, right: 16, bottom: 22, left: 0 }}>
                <CartesianGrid stroke={t.grid} />
                <XAxis
                  dataKey="t_start" tick={t.axis}
                  axisLine={t.axisLine} tickLine={false}
                  label={{ value: `Window start · ${TIME_UNITS_NOTE}`, position: 'insideBottom', offset: -14, ...t.label }}
                />
                <YAxis
                  tick={t.axis}
                  axisLine={t.axisLine} tickLine={false}
                  tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
                  label={{ value: 'Bottleneck share', angle: -90, position: 'insideLeft', ...t.label }}
                />
                <Tooltip
                  contentStyle={t.tooltip}
                  formatter={(v, n) => [`${(asNum(v) * 100).toFixed(1)}%${darkSet.has(String(n)) ? ' (dark)' : ''}`, n]}
                  labelFormatter={(l) => `t = ${fmt(Number(l), 1)}`}
                />
                <Legend
                  wrapperStyle={{ fontSize: 10, fontFamily: 'JetBrains Mono' }}
                  formatter={(value) => (
                    <span style={{ color: legendColorFor(String(value)) }}>{String(value)}</span>
                  )}
                />
                {top.map((st) => (
                  <Area
                    key={st} type="monotone" dataKey={st} stackId="1"
                    stroke={colorFor(st)} fill={colorFor(st)} fillOpacity={0.35} strokeWidth={1.5}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
            <p className="text-[11px] text-text-3 mt-1">
              constraint.json → windows[].shares · top 8 stations by total share across{' '}
              <Measured src="constraint.json → windows[]">{c.windows.length}</Measured> windows.
            </p>
          </Panel>

          <Panel title="Method">
            <p className="text-body text-text-2 leading-relaxed">
              {c.method}. A station is in an <em>active period</em> while it works without
              interruption; the station with the longest average uninterrupted active period is the
              momentary bottleneck.
            </p>
            <p className="text-body text-text-2 leading-relaxed mt-3">
              This method needs only working-versus-waiting states — not utilisation ratios, not
              cycle-time targets. That is precisely what dwell reconstruction recovers, which is why
              a constraint can be located inside the blind zone at all.
            </p>
          </Panel>
        </div>

        <div className="flex flex-col gap-4">
          <Panel title="Constraint in the dark">
            <Inferred src="constraint.json → dark_constraint_share" className="text-[34px]">
              {fmtPct(c.dark_constraint_share)}
            </Inferred>
            <p className="text-body text-text-2 mt-2 leading-relaxed">
              share of windows where the constraint sits in a station nobody measures.
            </p>
          </Panel>

          <Panel title="Bottleneck migration">
            <div className="relative max-h-[420px] overflow-y-auto pr-1">
              <div className="absolute left-[7px] top-1 bottom-1 w-px bg-border" />
              <div className="flex flex-col gap-2">
                {c.migration.map((m, i) => {
                  const changed = i === 0 || c.migration[i - 1].station !== m.station
                  return (
                    <div key={m.window} className="flex gap-2.5 items-start relative">
                      <span
                        className={`w-[15px] h-[15px] rounded-full border-2 shrink-0 z-10 ${
                          changed ? 'bg-panel' : 'bg-panel'
                        }`}
                        style={{ borderColor: m.is_dark ? t.c.cyan : changed ? t.c.accent : t.c.border }}
                      />
                      <div className="min-w-0 pb-0.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="num text-[11px] text-text-3">w{m.window}</span>
                          <span className="num text-[12px]">{m.station}</span>
                          {m.is_dark && <Chip tone="cyan">Dark</Chip>}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
            <p className="text-[11px] text-text-3 mt-3 pt-2 border-t border-border">
              constraint.json → migration
            </p>
          </Panel>
        </div>
      </div>
    </>
  )
}
