import {
  CartesianGrid, ComposedChart, Line, ReferenceArea, ReferenceLine,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { useChartTheme } from '../lib/theme'
import { CheckCircle2, SearchX, XCircle } from 'lucide-react'
import { useBundle } from '../lib/BundleContext'
import { Chip, Panel, ScreenHeader } from '../components/UI'
import { Measured } from '../components/Value'
import { EmptyState, Loading, MissingFile } from '../components/States'
import { asNum, fmt, fmtInt, TIME_UNITS_NOTE } from '../lib/format'


export default function Drift() {
  const { bundle, loading } = useBundle()
  const t = useChartTheme()
  if (loading) return <Loading what="drift analysis" />
  if (!bundle?.drift) {
    return (
      <MissingFile
        file="drift.json"
        would="a change-point in a per-station feature series with its independent corroboration and the resulting containment population"
        error={bundle?.errors['drift.json']}
      />
    )
  }

  const d = bundle.drift

  // Rule 4: the honest empty state, designed rather than broken.
  if (!d.found) {
    return (
      <>
        <ScreenHeader title="Drift & Evidence" />
        <EmptyState icon={<SearchX className="w-7 h-7" />} title="No clean drift event in this dataset">
          <p>{d.note}</p>
          <p className="mt-4 text-text-3 text-[12px]">
            A fabricated series is not shown in its place. The screen renders what the data supports
            and nothing further — the same standard applied to every other figure in this console.
          </p>
        </EmptyState>
      </>
    )
  }

  const series = d.t.map((t, i) => ({ t, v: d.v[i] }))

  return (
    <>
      <ScreenHeader
        title="Drift & Evidence"
        subtitle="A change-point is only actionable when a physically independent signal agrees that it is real."
      />

      <div className="grid grid-cols-[260px_1fr_320px] gap-4 mb-4">
        <Panel title="Drifting feature">
          <div className="num text-[15px] text-text-1 mb-3 break-all">{d.feature}</div>
          <dl className="space-y-2.5 text-[11px]">
            <div>
              <dt className="label mb-1">Drift magnitude</dt>
              <dd><Measured src="drift.json → drift_magnitude_sigma" className="text-[20px]">{fmt(d.drift_magnitude_sigma, 2)}σ</Measured></dd>
            </div>
            <div>
              <dt className="label mb-1">Change-point index</dt>
              <dd><Measured src="drift.json → cp_index" className="text-[15px]">{fmtInt(d.cp_index)}</Measured></dd>
            </div>
            <div>
              <dt className="label mb-1">Change-point time</dt>
              <dd><Measured src="drift.json → cp_time" title={TIME_UNITS_NOTE} className="text-[15px]">{fmt(d.cp_time, 2)}</Measured></dd>
            </div>
            <div>
              <dt className="label mb-1">Stable regime</dt>
              <dd>
                μ <Measured src="drift.json → mu">{fmt(d.mu, 3)}</Measured>{' · '}
                σ <Measured src="drift.json → sd">{fmt(d.sd, 3)}</Measured>
              </dd>
            </div>
          </dl>
        </Panel>

        <Panel title="Feature series with statistical control limits">
          <ResponsiveContainer width="100%" height={290}>
            <ComposedChart data={series} margin={{ top: 8, right: 16, bottom: 22, left: 0 }}>
              <CartesianGrid stroke={t.grid} />
              <XAxis dataKey="t" type="number" domain={['dataMin', 'dataMax']} tick={t.axis}
                axisLine={t.axisLine} tickLine={false}
                label={{ value: TIME_UNITS_NOTE, position: 'insideBottom', offset: -14, ...t.label }} />
              <YAxis tick={t.axis} axisLine={t.axisLine} tickLine={false} />
              <Tooltip contentStyle={t.tooltip}
                formatter={(v) => [fmt(asNum(v), 4), d.feature]}
                labelFormatter={(l) => `t = ${fmt(Number(l), 2)}`} />
              <ReferenceArea x1={d.t[0]} x2={d.cp_time} fill={t.c.accent} fillOpacity={0.06} />
              <ReferenceLine y={d.ucl} stroke={t.c.red} strokeDasharray="5 4" strokeWidth={1}
                label={{ value: 'UCL +3σ', position: 'right', fill: t.c.red, fontSize: 10 }} />
              <ReferenceLine y={d.lcl} stroke={t.c.red} strokeDasharray="5 4" strokeWidth={1}
                label={{ value: 'LCL −3σ', position: 'right', fill: t.c.red, fontSize: 10 }} />
              <ReferenceLine x={d.cp_time} stroke={t.c.accent} strokeWidth={2}
                label={{ value: 'CHANGE-POINT', position: 'top', fill: t.c.accentLt, fontSize: 10 }} />
              <Line type="monotone" dataKey="v" stroke={t.c.seriesInk} strokeWidth={1.2} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
          <p className="text-[11px] text-text-3">
            Dashed red lines are <strong className="text-text-2">statistical control limits (±3σ of the
            stable regime)</strong> — derived from the data, not engineering specification limits.
            Bosch's real tolerances are not published in this dataset.
          </p>
        </Panel>

        <Panel title="Independent corroboration">
          <div className="flex flex-col gap-2 mb-3">
            {d.corroboration.map((c) => (
              <div key={c.signal} className="flex items-start gap-2 p-2 rounded-btn border border-border">
                {c.stable
                  ? <CheckCircle2 className="w-4 h-4 text-green shrink-0 mt-0.5" />
                  : <XCircle className="w-4 h-4 text-red shrink-0 mt-0.5" />}
                <div className="min-w-0 flex-1">
                  <div className="num text-[11px] text-text-1 break-all">{c.signal}</div>
                  <div className="flex items-center justify-between mt-0.5">
                    <span className="num text-[10px] text-text-3">{c.station}</span>
                    <span className="num text-[10px] text-text-2">{fmt(c.shift_sigma, 2)}σ</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="pt-3 border-t border-border">
            <div className="flex items-center justify-between mb-2">
              <span className="label">Independent stable signals</span>
              <Measured src="drift.json → independent_stable_signals" className="text-[18px]">
                {d.independent_stable_signals}
              </Measured>
            </div>
            <div className={`p-2 rounded-btn border ${d.boundary_may_move ? 'border-green/40 bg-green/10' : 'border-red/40 bg-red/10'}`}>
              <span className={`text-[11px] font-semibold uppercase tracking-[0.05em] ${d.boundary_may_move ? 'text-green' : 'text-red'}`}>
                {d.boundary_may_move ? 'Boundary may move' : 'Boundary locked'}
              </span>
              <p className="text-[11px] text-text-2 mt-1">
                {d.boundary_may_move
                  ? 'At least one physically independent signal is verified stable across the window.'
                  : 'No independent signal corroborates the window. The suspect boundary stays where it is.'}
              </p>
            </div>
          </div>
          <p className="text-[11px] text-text-3 mt-3 italic leading-relaxed">
            A tool's own readings cannot certify its own past. The suspect boundary moves only when a
            physically independent signal agrees.
          </p>
        </Panel>
      </div>

      <Panel title="Containment population">
        <div className="flex items-baseline gap-3 mb-3">
          <Measured src="drift.json → containment.reduction_pct" className="text-[34px] text-green">
            {fmt(d.containment.reduction_pct, 1)}%
          </Measured>
          <span className="text-body text-text-2">reduction in quarantined parts</span>
          <Chip tone="green">Corroborated</Chip>
        </div>
        <div className="relative h-9 rounded-btn overflow-hidden border border-border bg-red/25 mb-2">
          <div
            className="absolute inset-y-0 left-0 bg-amber/50 border-r border-amber flex items-center px-2"
            style={{ width: `${(d.containment.darkline_population / d.containment.naive_population) * 100}%` }}
          >
            <span className="num text-[11px] text-text-1 whitespace-nowrap">
              {fmtInt(d.containment.darkline_population)}
            </span>
          </div>
          <span className="absolute right-2 inset-y-0 flex items-center num text-[11px] text-text-1">
            {fmtInt(d.containment.naive_population)}
          </span>
        </div>
        <div className="flex justify-between text-[11px] text-text-3">
          <span>DARKLINE population (corroborated boundary)</span>
          <span>Naive population (everything since last known-good)</span>
        </div>
      </Panel>
    </>
  )
}
