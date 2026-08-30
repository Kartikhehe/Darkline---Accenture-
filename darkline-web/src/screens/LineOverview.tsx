import { useBundle } from '../lib/BundleContext'
import { KPI, Panel, ScreenHeader, Chip } from '../components/UI'
import { Inferred, Measured } from '../components/Value'
import { Loading, MissingFile } from '../components/States'
import { StationStrip } from '../components/StationStrip'
import { asNum, fmt, fmtInt, fmtPct, fmtPctRaw } from '../lib/format'
import {
  Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { useChartTheme } from '../lib/theme'

export default function LineOverview() {
  const { bundle, loading } = useBundle()
  const t = useChartTheme()
  if (loading) return <Loading what="line overview" />
  if (!bundle?.lineOverview) {
    return (
      <MissingFile
        file="line_overview.json"
        would="the station catalog, instrumentation status and dwell distribution for every station on the line"
        error={bundle?.errors['line_overview.json']}
      />
    )
  }

  const lo = bundle.lineOverview
  const constraint = bundle.constraint
  const ablation = bundle.ablation

  // Most frequent constraint station across all windows.
  let topConstraint: string | undefined
  if (constraint?.windows.length) {
    const counts = new Map<string, number>()
    for (const w of constraint.windows) counts.set(w.bottleneck, (counts.get(w.bottleneck) ?? 0) + 1)
    topConstraint = [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0]
  }

  // Bottleneck share, averaged across windows, top 10.
  const shareData = (() => {
    if (!constraint?.windows.length) return []
    const acc = new Map<string, number>()
    for (const w of constraint.windows) {
      for (const [st, v] of Object.entries(w.shares)) acc.set(st, (acc.get(st) ?? 0) + v)
    }
    const darkSet = new Set(lo.stations.filter((s) => s.is_dark).map((s) => s.station))
    return [...acc.entries()]
      .map(([station, total]) => ({
        station, share: total / constraint.windows.length, is_dark: darkSet.has(station),
      }))
      .sort((a, b) => b.share - a.share)
      .slice(0, 10)
  })()

  return (
    <>
      <ScreenHeader
        title="Line Overview"
        subtitle="Every station on the line, and which of them the plant can actually see. Dwell at unmeasured stations is reconstructed from neighbouring timestamps and rendered as an inferred value."
      />

      <div className="grid grid-cols-4 gap-3 mb-5">
        <KPI
          label="Line observability"
          value={
            <>
              <Inferred src="line_overview.json → n_dark">{lo.n_dark}</Inferred>
              <span className="text-text-3 text-[20px]"> / </span>
              <Measured src="line_overview.json → n_stations" className="text-[28px]">{lo.n_stations}</Measured>
            </>
          }
          sub="stations unmeasured of total"
          hint="Count of dark stations against the full station catalog."
        />
        <KPI
          label="Dark stations"
          value={<Inferred src="line_overview.json → dark_pct" className="text-[28px]">{fmtPctRaw(lo.dark_pct)}</Inferred>}
          sub="of the line has no measurement"
        />
        <KPI
          label="Parts tracked"
          value={<Measured src="line_overview.json → n_parts" className="text-[28px]">{fmtInt(lo.n_parts)}</Measured>}
          sub={lo.source === 'REAL' ? 'Bosch production records' : 'placeholder bundle'}
        />
        <KPI
          label="Base failure rate"
          value={<Measured src="line_overview.json → failure_rate" className="text-[28px]">{fmtPct(lo.failure_rate, 2)}</Measured>}
          sub="across all tracked parts"
        />
      </div>

      <Panel
        title="Station catalog"
        right={
          <div className="flex items-center gap-2">
            <Chip tone="green">Measured</Chip>
            <Chip tone="cyan">Dark · inferred dwell</Chip>
            {topConstraint && <Chip tone="amber">Constraint</Chip>}
          </div>
        }
        className="mb-5"
      >
        <StationStrip stations={lo.stations} constraintStation={topConstraint} />
        <p className="text-[11px] text-text-3 mt-3">
          {lo.time_units_note} · Dwell values shown are medians; dark stations additionally print their p25–p75 interval.
        </p>
      </Panel>

      <div className="grid grid-cols-2 gap-4">
        <Panel title="Active Period Method — bottleneck share">
          {shareData.length === 0 ? (
            <MissingFile
              file="constraint.json"
              would="the share of rolling windows in which each station was the line's momentary constraint"
              error={bundle.errors['constraint.json']}
            />
          ) : (
            <>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={shareData} layout="vertical" margin={{ left: 8, right: 16, top: 4, bottom: 4 }}>
                  <XAxis type="number" tick={t.axis} axisLine={t.axisLine} tickLine={false} tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} />
                  <YAxis type="category" dataKey="station" width={72} tick={{ ...t.axis, fill: t.c.text2 }} axisLine={t.axisLine} tickLine={false} />
                  <Tooltip
                    cursor={t.cursorFill}
                    contentStyle={t.tooltip}
                    formatter={(v, _n, item) => [
                      `${(asNum(v) * 100).toFixed(1)}%${item?.payload?.is_dark ? ' (inferred)' : ''}`, 'Bottleneck share',
                    ]}
                  />
                  <Bar dataKey="share" radius={[0, 3, 3, 0]}>
                    {shareData.map((d) => (
                      <Cell
                        key={d.station}
                        fill={d.station === topConstraint ? t.c.amber : d.is_dark ? t.c.cyan : t.c.accent}
                        fillOpacity={d.is_dark ? 0.75 : 0.6}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <p className="text-[11px] text-text-3 mt-2">
                constraint.json → windows[].shares, averaged across {constraint?.windows.length} windows.
                Cyan bars are stations with no measurement.
              </p>
            </>
          )}
        </Panel>

        <Panel title="Dark stations carry signal">
          {!ablation ? (
            <MissingFile
              file="ablation.json"
              would="the held-out PR-AUC with and without reconstructed dark-station features"
              error={bundle.errors['ablation.json']}
            />
          ) : (
            <>
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div>
                  <div className="label mb-1.5">Without dark</div>
                  <Measured src="ablation.json → pr_auc_without_dark" className="text-[22px]">
                    {fmt(ablation.pr_auc_without_dark, 3)}
                  </Measured>
                </div>
                <div>
                  <div className="label mb-1.5">With dark</div>
                  <Measured src="ablation.json → pr_auc_with_dark" className="text-[22px]">
                    {fmt(ablation.pr_auc_with_dark, 3)}
                  </Measured>
                </div>
                <div>
                  <div className="label mb-1.5">Delta</div>
                  <span className="num text-[22px] text-green">
                    +{fmt(ablation.delta, 3)}
                  </span>
                  <div className="text-[11px] text-green/80 num mt-0.5">
                    +{fmt(ablation.relative_pct, 1)}% rel.
                  </div>
                </div>
              </div>
              <div className="h-px bg-border mb-3" />
              <p className="text-body text-text-2 leading-relaxed">{ablation.verdict}</p>
              <p className="text-[11px] text-text-3 mt-3">
                Derived from{' '}
                <Measured src="ablation.json → n_dark_features">{ablation.n_dark_features}</Measured>{' '}
                reconstructed features · ablation.json
              </p>
            </>
          )}
        </Panel>
      </div>
    </>
  )
}
