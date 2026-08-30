import { useMemo, useState } from 'react'
import { useBundle } from '../lib/BundleContext'
import { Chip, Panel, ScreenHeader } from '../components/UI'
import { Measured } from '../components/Value'
import { Loading, MissingFile } from '../components/States'
import { fmt, fmtInt, fmtPct, TIME_UNITS_NOTE } from '../lib/format'
import { useChartTheme } from '../lib/theme'

export default function PartLedger() {
  const { bundle, loading } = useBundle()
  const t = useChartTheme()
  const [q, setQ] = useState('')
  const [split, setSplit] = useState<'all' | 'train' | 'val' | 'test'>('all')
  const [alertsOnly, setAlertsOnly] = useState(false)
  const [sel, setSel] = useState<number | null>(null)

  const parts = bundle?.parts ?? []
  const filtered = useMemo(() => {
    const needle = q.trim()
    return parts.filter((p) => {
      if (split !== 'all' && p.split !== split) return false
      if (alertsOnly && !p.alert) return false
      if (needle && !String(p.Id).includes(needle)) return false
      return true
    })
  }, [parts, q, split, alertsOnly])

  if (loading) return <Loading what="part ledger" />
  if (!bundle?.parts) {
    return (
      <MissingFile file="parts_sample.csv"
        would="the per-part ledger with risk score, split, routing path and outcome"
        error={bundle?.errors['parts_sample.csv']} />
    )
  }

  const active = filtered.find((p) => p.Id === sel) ?? filtered[0]
  const gaugeR = 46
  const circ = 2 * Math.PI * gaugeR
  const risk = active?.risk_score ?? 0

  return (
    <>
      <ScreenHeader
        title="Part Ledger"
        subtitle={`${fmtInt(parts.length)} parts in the sampled ledger. Ground-truth outcomes are shown only for the held-out test split.`}
      />

      <div className="grid grid-cols-[340px_1fr] gap-4 mb-4">
        <Panel title={`Parts · ${fmtInt(filtered.length)}`}>
          <input
            value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search part ID…"
            className="w-full bg-bg border border-border rounded-btn px-2.5 py-1.5 num text-[12px] text-text-1 placeholder:text-text-3 focus:outline-none focus:border-accent/60 mb-2"
          />
          <div className="flex gap-1 mb-2 flex-wrap">
            {(['all', 'train', 'val', 'test'] as const).map((s) => (
              <button key={s} onClick={() => setSplit(s)}
                className={`px-2 py-1 rounded-btn border text-[10px] uppercase tracking-[0.06em] transition-colors ${
                  split === s ? 'border-accent/60 bg-accent/15 text-accent-lt' : 'border-border text-text-3 hover:text-text-2'
                }`}>{s}</button>
            ))}
            <button onClick={() => setAlertsOnly((a) => !a)}
              className={`px-2 py-1 rounded-btn border text-[10px] uppercase tracking-[0.06em] transition-colors ${
                alertsOnly ? 'border-red/50 bg-red/15 text-red' : 'border-border text-text-3 hover:text-text-2'
              }`}>alerts</button>
          </div>
          {/* Windowed render: the sampled ledger is long, so cap the DOM. */}
          <div className="max-h-[520px] overflow-y-auto -mx-1 px-1 flex flex-col gap-1">
            {filtered.slice(0, 300).map((p) => (
              <button key={p.Id} onClick={() => setSel(p.Id)}
                className={`flex items-center justify-between gap-2 p-2 rounded-btn border text-left transition-colors ${
                  active?.Id === p.Id ? 'bg-card border-accent/50' : 'border-border hover:border-text-3'
                }`}>
                <span className="num text-[12px]">{p.Id}</span>
                <span className="flex items-center gap-2">
                  <span className="num text-[11px] text-text-2">{fmt(p.risk_score, 3)}</span>
                  {p.alert && <Chip tone="red">Alert</Chip>}
                </span>
              </button>
            ))}
            {filtered.length > 300 && (
              <div className="text-[11px] text-text-3 py-2 text-center">
                showing first 300 of {fmtInt(filtered.length)} — narrow the filters to see more
              </div>
            )}
          </div>
        </Panel>

        <Panel title={active ? `Part ${active.Id}` : 'No part selected'}>
          {!active ? (
            <p className="text-body text-text-2 py-8 text-center">No parts match the current filters.</p>
          ) : (
            <div className="grid grid-cols-[1fr_200px] gap-6">
              <div>
                <dl className="grid grid-cols-2 gap-x-6 gap-y-3 mb-4">
                  {[
                    ['Part ID', <Measured src="parts_sample.csv → Id">{active.Id}</Measured>],
                    ['Split', <Chip tone={active.split === 'test' ? 'green' : 'neutral'}>{active.split}</Chip>],
                    ['First timestamp', <Measured src="parts_sample.csv → first_timestamp" title={TIME_UNITS_NOTE}>{fmt(active.first_timestamp)}</Measured>],
                    ['Last timestamp', <Measured src="parts_sample.csv → last_timestamp" title={TIME_UNITS_NOTE}>{fmt(active.last_timestamp)}</Measured>],
                    ['Total cycle time', <Measured src="parts_sample.csv → total_cycle_time" title={TIME_UNITS_NOTE}>{fmt(active.total_cycle_time)}</Measured>],
                    ['Stations visited', <Measured src="parts_sample.csv → n_stations_visited">{active.n_stations_visited}</Measured>],
                  ].map(([k, v]) => (
                    <div key={String(k)}>
                      <dt className="label mb-1">{k}</dt>
                      <dd className="text-[13px]">{v}</dd>
                    </div>
                  ))}
                </dl>

                <div className="label mb-1.5">Routing path</div>
                <div className="flex flex-wrap gap-1 mb-4">
                  {active.path_signature.split('|').map((st, i) => (
                    <span key={`${st}-${i}`} className="num text-[10px] px-1.5 py-0.5 rounded border border-border bg-card text-text-2">
                      {st}
                    </span>
                  ))}
                </div>

                <div className="label mb-1.5">Ground truth</div>
                {active.split === 'test' ? (
                  <Chip tone={active.Response === 1 ? 'red' : 'green'}>
                    {active.Response === 1 ? 'Failed' : 'Passed'} · held-out truth
                  </Chip>
                ) : (
                  <p className="text-[11px] text-text-3">
                    Withheld — outcomes are shown only for the test split, so the ledger cannot be used
                    to inspect labels the model was fit on.
                  </p>
                )}
              </div>

              <div className="flex flex-col items-center justify-center">
                <svg width="120" height="120" viewBox="0 0 120 120">
                  <circle cx="60" cy="60" r={gaugeR} fill="none" stroke={t.c.border} strokeWidth="9" />
                  <circle
                    cx="60" cy="60" r={gaugeR} fill="none"
                    stroke={active.alert ? t.c.red : t.c.accent} strokeWidth="9" strokeLinecap="round"
                    strokeDasharray={`${circ * risk} ${circ}`} transform="rotate(-90 60 60)"
                  />
                  <text x="60" y="58" textAnchor="middle" fill={t.c.text1} fontSize="20" fontFamily="JetBrains Mono">
                    {(risk * 100).toFixed(1)}
                  </text>
                  <text x="60" y="74" textAnchor="middle" fill={t.c.text3} fontSize="9" fontFamily="Inter">
                    RISK %
                  </text>
                </svg>
                <div className="mt-2">
                  {active.alert ? <Chip tone="red">Alert raised</Chip> : <Chip tone="neutral">Below threshold</Chip>}
                </div>
                <p className="text-[10px] text-text-3 mt-2 text-center">parts_sample.csv → risk_score</p>
              </div>
            </div>
          )}
        </Panel>
      </div>

      <Panel title="Routing paths">
        {!bundle.paths ? (
          <MissingFile file="paths.json"
            would="the failure rate and share of parts per routing path"
            error={bundle.errors['paths.json']} />
        ) : (
          <>
            <div className="p-3 mb-3 rounded-btn border border-amber/40 bg-amber/10">
              <p className="text-body text-text-1">{bundle.paths.note}</p>
            </div>
            <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
              <table className="w-full text-[12px]">
                <thead className="sticky top-0 bg-panel">
                  <tr className="text-left border-b border-border">
                    {['Path signature', 'Parts', 'Share', 'Failure rate', 'Median cycle'].map((h) => (
                      <th key={h} className="label py-2 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const tot = bundle.paths.paths.reduce((a, p) => a + p.n, 0)
                    const maxFail = Math.max(...bundle.paths.paths.map((p) => p.fail_rate))
                    return bundle.paths.paths.map((p) => (
                      <tr key={p.path_signature} className="border-b border-border/60 hover:bg-card/50">
                        <td className="py-2 num text-[10px] text-text-2 max-w-[320px] truncate" title={p.path_signature}>
                          {p.path_signature}
                        </td>
                        <td><Measured src="paths.json → paths[].n">{fmtInt(p.n)}</Measured></td>
                        <td><Measured src="paths.json → paths[].n">{fmtPct(p.n / tot)}</Measured></td>
                        <td>
                          <span className="flex items-center gap-2">
                            <Measured src="paths.json → paths[].fail_rate">{fmtPct(p.fail_rate, 2)}</Measured>
                            <span className="h-1 rounded-full bg-red/60" style={{ width: `${(p.fail_rate / maxFail) * 48}px` }} />
                          </span>
                        </td>
                        <td><Measured src="paths.json → paths[].median_cycle" title={TIME_UNITS_NOTE}>{fmt(p.median_cycle)}</Measured></td>
                      </tr>
                    ))
                  })()}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Panel>
    </>
  )
}
