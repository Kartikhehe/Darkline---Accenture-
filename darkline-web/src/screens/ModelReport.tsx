import {
  Bar, BarChart, CartesianGrid, Line, ReferenceDot, ResponsiveContainer,
  ComposedChart, Tooltip, XAxis, YAxis,
} from 'recharts'
import { useChartTheme } from '../lib/theme'
import { Check } from 'lucide-react'
import { useBundle } from '../lib/BundleContext'
import { KPI, Panel, ScreenHeader } from '../components/UI'
import { Measured } from '../components/Value'
import { Loading, MissingFile } from '../components/States'
import { asNum, fmt, fmtInt, fmtPct } from '../lib/format'


export default function ModelReport() {
  const { bundle, loading } = useBundle()
  const t = useChartTheme()
  if (loading) return <Loading what="model report" />
  if (!bundle?.modelReport) {
    return (
      <MissingFile
        file="model_report.json"
        would="held-out test metrics, the precision–recall curve, calibration, cost curve and the leakage controls"
        error={bundle?.errors['model_report.json']}
      />
    )
  }

  const m = bundle.modelReport
  const total = m.split_sizes.train + m.split_sizes.val + m.split_sizes.test
  const pct = (n: number) => (n / total) * 100

  const prData = m.pr_curve.recall.map((r, i) => ({ recall: r, precision: m.pr_curve.precision[i] }))
  const pak = [
    { k: '@50', v: m.precision_at_50 }, { k: '@100', v: m.precision_at_100 },
    { k: '@500', v: m.precision_at_500 }, { k: '@1000', v: m.precision_at_1000 },
  ]

  return (
    <>
      <ScreenHeader
        title="Model Report"
        subtitle="Every figure on this screen is computed on the held-out test split, which was scored exactly once."
      />

      <div className="inline-flex items-center gap-2 px-3 py-2 mb-5 rounded-btn border border-accent/50 bg-accent/10">
        <span className="text-[11px] uppercase tracking-[0.08em] font-semibold text-accent-lt">
          All metrics: held-out test split · N ={' '}
          <Measured src="model_report.json → split_sizes.test">{fmtInt(m.split_sizes.test)}</Measured>
        </span>
      </div>

      <Panel title="Temporal split" className="mb-5">
        <div className="flex h-11 rounded-btn overflow-hidden border border-border mb-2">
          {([
            ['train', m.split_sizes.train, t.c.accent, 0.55],
            ['val', m.split_sizes.val, t.c.accentLt, 0.4],
            ['test', m.split_sizes.test, t.c.green, 0.5],
          ] as const).map(([k, n, c, o]) => (
            <div
              key={k}
              className="flex items-center justify-center border-r border-border last:border-r-0 relative"
              // Mix toward the panel so the tint reads correctly in both themes.
              style={{
                width: `${pct(n)}%`,
                backgroundColor: `color-mix(in srgb, ${c} ${Math.round(o * 100)}%, ${t.c.panel})`,
              }}
              title={`${k}: ${fmtInt(n)} parts`}
            >
              <span
                className="text-[11px] font-semibold uppercase tracking-[0.06em]"
                style={{ color: t.c.text1 }}
              >
                {k} · {fmtInt(n)}
              </span>
            </div>
          ))}
        </div>
        <div className="flex justify-between text-[11px] text-text-3">
          <span>earliest first_timestamp</span>
          <span>70 / 15 / 15 by time order — never random</span>
          <span>latest first_timestamp</span>
        </div>
        <p className="text-[11px] text-text-3 mt-2">
          Parts are ordered by <span className="num">first_timestamp</span> and cut at the 70% and 85%
          marks. No shuffling, no stratification: the model never sees a part that came after the
          ones it is judged on.
        </p>
      </Panel>

      <div className="grid grid-cols-5 gap-3 mb-5">
        <KPI
          label="PR-AUC"
          value={<Measured src="model_report.json → pr_auc" className="text-[28px]">{fmt(m.pr_auc, 3)}</Measured>}
          sub={<>95% CI <Measured src="model_report.json → pr_auc_ci">{fmt(m.pr_auc_ci[0], 3)}–{fmt(m.pr_auc_ci[1], 3)}</Measured></>}
        />
        <KPI label="MCC" value={<Measured src="model_report.json → mcc" className="text-[28px]">{fmt(m.mcc, 3)}</Measured>} sub="at the validation-chosen threshold" />
        <KPI label="Precision" value={<Measured src="model_report.json → precision" className="text-[28px]">{fmtPct(m.precision)}</Measured>} sub={<>of <Measured src="model_report.json → n_alerts">{fmtInt(m.n_alerts)}</Measured> alerts</>} />
        <KPI label="Recall" value={<Measured src="model_report.json → recall" className="text-[28px]">{fmtPct(m.recall)}</Measured>} sub="of all test-split failures" />
        <KPI label="Lift over random" value={<Measured src="model_report.json → lift_over_random" className="text-[28px]">{fmt(m.lift_over_random, 1)}×</Measured>} sub={<>base rate <Measured src="model_report.json → test_failure_rate">{fmtPct(m.test_failure_rate, 2)}</Measured></>} />
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <Panel title="Precision–recall curve">
          <ResponsiveContainer width="100%" height={260}>
            <ComposedChart data={prData} margin={{ top: 8, right: 16, bottom: 20, left: 0 }}>
              <CartesianGrid stroke={t.grid} />
              <XAxis dataKey="recall" type="number" domain={[0, 1]} tick={t.axis} axisLine={t.axisLine} tickLine={false}
                label={{ value: 'Recall', position: 'insideBottom', offset: -12, ...t.label }} />
              <YAxis type="number" domain={[0, 'auto']} tick={t.axis} axisLine={t.axisLine} tickLine={false}
                label={{ value: 'Precision', angle: -90, position: 'insideLeft', ...t.label }} />
              <Tooltip contentStyle={t.tooltip} formatter={(v) => fmt(asNum(v), 4)} />
              <Line type="monotone" dataKey="precision" stroke={t.c.accent} strokeWidth={2} dot={false} />
              <ReferenceDot x={m.recall} y={m.precision} r={5} fill={t.c.amber} stroke={t.c.panel} strokeWidth={2} />
            </ComposedChart>
          </ResponsiveContainer>
          <p className="text-[11px] text-text-3">
            model_report.json → pr_curve · amber marks the chosen operating point
            (threshold <Measured src="model_report.json → threshold">{fmt(m.threshold, 3)}</Measured>, fixed on validation).
          </p>
        </Panel>

        <Panel title="Calibration">
          <ResponsiveContainer width="100%" height={260}>
            <ComposedChart data={m.calibration} margin={{ top: 8, right: 16, bottom: 20, left: 0 }}>
              <CartesianGrid stroke={t.grid} />
              <XAxis dataKey="predicted" type="number" domain={[0, 1]} tick={t.axis} axisLine={t.axisLine} tickLine={false}
                label={{ value: 'Predicted probability', position: 'insideBottom', offset: -12, ...t.label }} />
              <YAxis type="number" domain={[0, 1]} tick={t.axis} axisLine={t.axisLine} tickLine={false}
                label={{ value: 'Observed', angle: -90, position: 'insideLeft', ...t.label }} />
              <Tooltip contentStyle={t.tooltip} formatter={(v, n) => [fmt(asNum(v), 3), n]} />
              <Line data={[{ predicted: 0, observed: 0 }, { predicted: 1, observed: 1 }]} type="linear"
                dataKey="observed" stroke={t.c.text3} strokeDasharray="4 4" strokeWidth={1} dot={false} isAnimationActive={false} />
              <Line type="monotone" dataKey="observed" stroke={t.c.green} strokeWidth={2} dot={{ r: 3, fill: t.c.green }} />
            </ComposedChart>
          </ResponsiveContainer>
          <p className="text-[11px] text-text-3">
            Scores are isotonic-calibrated on the validation split, so they are probabilities rather
            than ranking scores. Dashed line is perfect calibration.
          </p>
        </Panel>
      </div>

      <div className="grid grid-cols-[1fr_320px] gap-4 mb-4">
        <Panel title="Cost curve">
          <ResponsiveContainer width="100%" height={230}>
            <ComposedChart data={m.cost_curve} margin={{ top: 8, right: 16, bottom: 20, left: 8 }}>
              <CartesianGrid stroke={t.grid} />
              <XAxis dataKey="threshold" type="number" domain={[0, 1]} tick={t.axis} axisLine={t.axisLine} tickLine={false}
                label={{ value: 'Alert threshold', position: 'insideBottom', offset: -12, ...t.label }} />
              <YAxis tick={t.axis} axisLine={t.axisLine} tickLine={false}
                label={{ value: 'Expected cost', angle: -90, position: 'insideLeft', ...t.label }} />
              <Tooltip contentStyle={t.tooltip}
                formatter={(v, n) => [fmtInt(asNum(v)), n === 'cost' ? 'Expected cost' : n]}
                labelFormatter={(l) => `threshold ${fmt(Number(l), 3)}`} />
              <Line type="monotone" dataKey="cost" stroke={t.c.amber} strokeWidth={2} dot={false} />
              <ReferenceDot x={m.cost_optimal.threshold} y={m.cost_optimal.cost} r={5} fill={t.c.green} stroke={t.c.panel} strokeWidth={2} />
            </ComposedChart>
          </ResponsiveContainer>
          <p className="text-[11px] text-text-3">
            What a plant manager actually decides: inspection cost against escape cost. Minimum at
            threshold <Measured src="model_report.json → cost_optimal.threshold">{fmt(m.cost_optimal.threshold, 3)}</Measured>{' '}
            (<Measured src="model_report.json → cost_optimal.n_alerts">{fmtInt(m.cost_optimal.n_alerts)}</Measured> alerts,{' '}
            <Measured src="model_report.json → cost_optimal.escapes">{fmtInt(m.cost_optimal.escapes)}</Measured> escapes).
          </p>
        </Panel>

        <Panel title="Precision @ k">
          <ResponsiveContainer width="100%" height={230}>
            <BarChart data={pak} margin={{ top: 8, right: 12, bottom: 8, left: 0 }}>
              <CartesianGrid stroke={t.grid} vertical={false} />
              <XAxis dataKey="k" tick={t.axis} axisLine={t.axisLine} tickLine={false} />
              <YAxis tick={t.axis} axisLine={t.axisLine} tickLine={false} tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} />
              <Tooltip cursor={t.cursorFill} contentStyle={t.tooltip} formatter={(v) => [fmtPct(asNum(v)), 'Precision']} />
              <Bar dataKey="v" fill={t.c.accent} fillOpacity={0.7} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <p className="text-[11px] text-text-3">model_report.json → precision_at_&#123;50,100,500,1000&#125;</p>
        </Panel>
      </div>

      <Panel title="Leakage controls">
        <ul className="grid grid-cols-2 gap-x-6 gap-y-2.5">
          {m.leakage_controls.map((c) => (
            <li key={c} className="flex gap-2.5 items-start">
              <span className="w-4 h-4 rounded-full bg-green/15 border border-green/40 flex items-center justify-center shrink-0 mt-0.5">
                <Check className="w-2.5 h-2.5 text-green" strokeWidth={3} />
              </span>
              <span className="text-body text-text-2">{c}</span>
            </li>
          ))}
        </ul>
        <p className="text-[11px] text-text-3 mt-4 pt-3 border-t border-border">
          model_report.json → leakage_controls. Stated explicitly because an in-sample metric is the
          single easiest way to overstate a model of a rare event.
        </p>
      </Panel>
    </>
  )
}
