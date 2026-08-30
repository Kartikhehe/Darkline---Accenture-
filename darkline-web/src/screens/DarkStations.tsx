import { useState } from 'react'
import {
  Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Scatter,
  ScatterChart, Tooltip, XAxis, YAxis, ZAxis,
} from 'recharts'
import { CheckCircle2, XCircle } from 'lucide-react'
import { useBundle } from '../lib/BundleContext'
import { Chip, KPI, Note, Panel, ScreenHeader } from '../components/UI'
import { Inferred, Measured } from '../components/Value'
import { Loading, MissingFile } from '../components/States'
import { TIME_UNITS_NOTE, asNum, fmt, fmtInt } from '../lib/format'
import { useChartTheme } from '../lib/theme'

export default function DarkStations() {
  const { bundle, loading } = useBundle()
  const t = useChartTheme()
  const [sel, setSel] = useState<string | null>(null)

  if (loading) return <Loading what="reconstruction results" />
  if (!bundle?.reconstruction) {
    return (
      <MissingFile
        file="reconstruction_eval.json"
        would="the withhold-and-recover results: per-station reconstruction error and 90% prediction-interval coverage"
        error={bundle?.errors['reconstruction_eval.json']}
      />
    )
  }

  const re = bundle.reconstruction
  const { summary } = re
  // Sort by distance from nominal 0.90 coverage — worst-calibrated first.
  const ranked = [...re.per_station].sort(
    (a, b) => Math.abs(b.coverage_90 - 0.9) - Math.abs(a.coverage_90 - 0.9),
  )
  const active = ranked.find((s) => s.station === sel) ?? ranked[0]
  const scatter = re.scatter && re.scatter.station === active?.station ? re.scatter : re.scatter

  const scatterData = scatter
    ? scatter.truth.map((t, i) => ({ truth: t, pred: scatter.pred[i] }))
    : []
  const lim = scatterData.length
    ? Math.ceil(Math.max(...scatterData.map((d) => Math.max(d.truth, d.pred))))
    : 1
  const refLine = [{ truth: 0, pred: 0 }, { truth: lim, pred: lim }]

  return (
    <>
      <ScreenHeader
        title="Dark Stations"
        subtitle="Stations that are timed but not measured. To show the reconstruction can be trusted, we hide stations we can observe, rebuild them with the identical estimator, and score against the truth we hid."
      />

      <div className="grid grid-cols-4 gap-3 mb-5">
        <KPI
          label="Mean interval coverage"
          value={<Measured src="reconstruction_eval.json → summary.mean_coverage_90" className="text-[28px]">{fmt(summary.mean_coverage_90, 3)}</Measured>}
          sub="nominal 0.90 · across withheld stations"
        />
        <KPI
          label="Mean absolute error"
          value={<Measured src="reconstruction_eval.json → summary.mean_mae" className="text-[28px]">{fmt(summary.mean_mae, 3)}</Measured>}
          sub={TIME_UNITS_NOTE}
        />
        <KPI
          label="Mean skill vs baseline"
          value={<Measured src="reconstruction_eval.json → summary.mean_skill" className="text-[28px]">{fmt(summary.mean_skill * 100, 1)}%</Measured>}
          sub="error reduction over segment-median baseline"
        />
        <div
          className={`card-raised p-4 flex flex-col justify-center items-start border ${
            summary.gate_passed ? 'border-green/40 bg-green/5' : 'border-red/40 bg-red/5'
          }`}
        >
          <div className="label mb-2">Calibration gate</div>
          <div className="flex items-center gap-2">
            {summary.gate_passed
              ? <CheckCircle2 className="w-5 h-5 text-green shrink-0" />
              : <XCircle className="w-5 h-5 text-red shrink-0" />}
            <span className={`text-[13px] font-semibold uppercase tracking-[0.04em] ${summary.gate_passed ? 'text-green' : 'text-red'}`}>
              {summary.gate_passed ? 'Intervals calibrated' : 'Intervals miscalibrated'}
            </span>
          </div>
          <p className="text-[11px] text-text-3 mt-2">
            {summary.gate_passed
              ? 'Coverage falls inside [0.85, 0.95]. Intervals mean what they claim.'
              : 'Coverage is outside [0.85, 0.95]. The intervals are not trustworthy and the reconstruction is not fit to report.'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-[300px_1fr] gap-4 mb-4">
        <Panel title="Withheld stations" right={<span className="text-[10px] text-text-3">by |cov − 0.90|</span>}>
          <div className="flex flex-col gap-1 max-h-[520px] overflow-y-auto -mx-1 px-1">
            {ranked.map((s) => {
              const on = s.station === active?.station
              const bad = s.coverage_90 < 0.85 || s.coverage_90 > 0.95
              return (
                <button
                  key={s.station}
                  onClick={() => setSel(s.station)}
                  className={`text-left p-2.5 rounded-btn border transition-colors ${
                    on ? 'bg-card border-accent/50' : 'bg-transparent border-border hover:border-text-3'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="num text-[12px]">{s.station}</span>
                    <Chip tone={s.instrumentation === 'DARK' ? 'cyan' : 'green'}>
                      {s.instrumentation}
                    </Chip>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-text-3">MAE <Measured src="reconstruction_eval.json → per_station[].mae">{fmt(s.mae, 3)}</Measured></span>
                    <span className={bad ? 'text-red' : 'text-text-3'}>
                      cov <Measured src="reconstruction_eval.json → per_station[].coverage_90">{fmt(s.coverage_90, 3)}</Measured>
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        </Panel>

        <div className="flex flex-col gap-4">
          <Panel
            title={`Withhold-and-recover · ${active?.station ?? '—'}`}
            right={
              <div className="flex gap-4 text-[11px]">
                <span className="text-text-3">MAE <Measured src="reconstruction_eval.json → per_station[].mae">{fmt(active?.mae ?? null, 3)}</Measured></span>
                <span className="text-text-3">Median AE <Measured src="reconstruction_eval.json → per_station[].median_ae">{fmt(active?.median_ae ?? null, 3)}</Measured></span>
                <span className="text-text-3">Coverage <Measured src="reconstruction_eval.json → per_station[].coverage_90">{fmt(active?.coverage_90 ?? null, 3)}</Measured></span>
                <span className="text-text-3">n <Measured src="reconstruction_eval.json → per_station[].n_test">{fmtInt(active?.n_test ?? null)}</Measured></span>
              </div>
            }
          >
            {scatterData.length === 0 ? (
              <p className="text-body text-text-2 py-8 text-center">
                reconstruction_eval.json → scatter is null. No per-part scatter was emitted for this station.
              </p>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={300}>
                  <ScatterChart margin={{ top: 8, right: 16, bottom: 24, left: 8 }}>
                    <CartesianGrid stroke={t.grid} />
                    <XAxis
                      type="number" dataKey="truth" domain={[0, lim]}
                      name="Withheld truth"
                      tick={t.axis} axisLine={t.axisLine} tickLine={false}
                      label={{ value: 'Withheld truth (dwell)', position: 'insideBottom', offset: -14, ...t.label }}
                    />
                    <YAxis
                      type="number" dataKey="pred" domain={[0, lim]}
                      name="Reconstructed"
                      tick={t.axis} axisLine={t.axisLine} tickLine={false}
                      label={{ value: 'Reconstructed', angle: -90, position: 'insideLeft', ...t.label }}
                    />
                    <ZAxis range={[26, 26]} />
                    <Tooltip
                      cursor={{ stroke: t.c.border }}
                      contentStyle={t.tooltip}
                      formatter={(v, n) => [fmt(asNum(v)), n]}
                    />
                    <Scatter data={scatterData} fill={t.c.cyan} fillOpacity={0.5} />
                    <Scatter data={refLine} line={{ stroke: t.c.text3, strokeDasharray: '4 4' }} shape={() => <g />} legendType="none" />
                  </ScatterChart>
                </ResponsiveContainer>
                <p className="text-[11px] text-text-3">
                  Each point is one withheld part: reconstructed dwell against the truth we hid.
                  The dashed line is perfect agreement. {TIME_UNITS_NOTE}.
                </p>
              </>
            )}
          </Panel>

          <Panel title="Skill versus baseline">
            <div className="grid grid-cols-[1fr_180px] gap-4 items-center">
              <ResponsiveContainer width="100%" height={130}>
                <BarChart
                  data={[
                    { k: 'Segment-median baseline', v: active?.baseline_mae ?? 0 },
                    { k: 'DARKLINE reconstruction', v: active?.mae ?? 0 },
                  ]}
                  layout="vertical"
                  margin={{ left: 8, right: 24, top: 4, bottom: 4 }}
                >
                  <XAxis type="number" tick={t.axis} axisLine={t.axisLine} tickLine={false} />
                  <YAxis type="category" dataKey="k" width={160} tick={{ ...t.axis, fill: t.c.text2 }} axisLine={t.axisLine} tickLine={false} />
                  <Tooltip
                    cursor={t.cursorFill}
                    contentStyle={t.tooltip}
                    formatter={(v) => [fmt(asNum(v), 3), 'MAE']}
                  />
                  <Bar dataKey="v" radius={[0, 3, 3, 0]}>
                    <Cell fill={t.c.text3} />
                    <Cell fill={t.c.accent} fillOpacity={0.8} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div>
                <div className="label mb-1.5">Skill</div>
                <Measured src="reconstruction_eval.json → per_station[].skill_vs_baseline" className="text-[26px]">
                  {fmt((active?.skill_vs_baseline ?? 0) * 100, 1)}%
                </Measured>
                <p className="text-[11px] text-text-3 mt-1">error reduction against predicting the segment median</p>
              </div>
            </div>
          </Panel>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Panel title="Method">
          <Note>
            A dark station sits between two points we can observe. The interval between those
            timestamps is not the station's processing time — it also contains transit, queueing
            and blocking. We decompose it: a transit floor from the low-traffic behaviour of that
            transition, a queueing term from the work-in-progress in the segment at that moment,
            and the residual as processing.
          </Note>
          <Note>
            <span className="block mt-3">
              To show this is not circular, we take stations that <em>are</em> instrumented, hide
              their timing column, reconstruct them with the identical estimator, and score against
              the truth we hid from ourselves. Every value carries a prediction interval from a
              quantile model, so it can be checked rather than believed.
            </span>
          </Note>
        </Panel>

        <Panel title="Limitations">
          <Note>
            Where two or more unmeasured stations sit inside a single observed segment, only their
            combined dwell is recoverable. In that case the estimate is reported at segment
            granularity with the pooled stations named, and never presented as a single-station
            measurement.
          </Note>
          <Note>
            <span className="block mt-3">
              Every inferred value carries a prediction interval and renders in{' '}
              <Inferred src="design convention">cyan</Inferred>. Nothing reconstructed is ever shown
              as though it were measured. Reported dwell is in {TIME_UNITS_NOTE.toLowerCase()}, and
              the underlying measurements are scaled and unitless.
            </span>
          </Note>
        </Panel>
      </div>
    </>
  )
}
