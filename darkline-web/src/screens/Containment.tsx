import { useState } from 'react'
import { Play, ShieldAlert, ShieldCheck, X, Ban } from 'lucide-react'
import { useBundle } from '../lib/BundleContext'
import { Chip, Panel, ScreenHeader } from '../components/UI'
import { Measured } from '../components/Value'
import { EmptyState, Loading, MissingFile } from '../components/States'
import { fmt, fmtInt, TIME_UNITS_NOTE } from '../lib/format'
import type { PartRow } from '../lib/types'

/** Deterministic short hash for the evidence certificate. */
function contentHash(s: string): string {
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0 }
  return h.toString(16).padStart(8, '0')
}

export default function Containment() {
  const { bundle, loading } = useBundle()
  const [ran, setRan] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [cert, setCert] = useState<PartRow | null>(null)

  if (loading) return <Loading what="containment" />
  if (!bundle?.drift) {
    return (
      <MissingFile file="drift.json"
        would="the containment query and the parts inside the corroborated suspect window"
        error={bundle?.errors['drift.json']} />
    )
  }

  const d = bundle.drift
  if (!d.found) {
    return (
      <>
        <ScreenHeader title="Containment" />
        <EmptyState icon={<Ban className="w-7 h-7" />} title="Containment unavailable — no drift event">
          <p>
            Containment narrows a quarantine around a corroborated change-point. No statistically
            clean drift event was found in this dataset, so there is no suspect window to contain and
            this screen has nothing real to operate on.
          </p>
          <p className="mt-3 text-text-3 text-[12px]">{d.note}</p>
        </EmptyState>
      </>
    )
  }

  const cont = d.containment
  const parts = bundle.parts ?? []
  const idSet = new Set(cont.sample_part_ids)
  const rows = parts.filter((p) => idSet.has(p.Id))

  const query = [
    'SELECT part_id, cycle_time, n_stations, split, risk_score',
    'FROM   parts',
    `WHERE  first_timestamp >= ${fmt(d.cp_time, 2)}   -- corroborated change-point`,
    `  AND  station_path CONTAINS '${d.corroboration[0]?.station ?? '—'}'`,
    `  AND  corroborating_signals >= 1              -- ${d.independent_stable_signals} verified stable`,
    'ORDER BY risk_score DESC;',
  ].join('\n')

  const run = () => {
    setScanning(true)
    setTimeout(() => { setScanning(false); setRan(true) }, 400)
  }

  return (
    <>
      <ScreenHeader
        title="Containment"
        subtitle="Narrow a quarantine from everything-since-last-known-good down to the parts the evidence actually implicates."
      />

      <Panel title="Containment query" className="mb-4">
        <pre className="num text-[11px] leading-relaxed text-text-2 bg-bg border border-border rounded-btn p-3 overflow-x-auto whitespace-pre">
{query}
        </pre>
        <button
          onClick={run}
          disabled={scanning}
          className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-btn bg-accent/15 border border-accent/50 text-accent-lt text-[12px] font-medium hover:bg-accent/25 transition-colors disabled:opacity-60"
        >
          <Play className="w-3.5 h-3.5" />
          {scanning ? 'Scanning…' : ran ? 'Re-run containment' : 'Run containment'}
        </button>
      </Panel>

      {scanning && (
        <Panel><div className="py-6 text-center text-body text-text-2 num">scanning part ledger…</div></Panel>
      )}

      {ran && !scanning && (
        <>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="card-raised p-4">
              <div className="label mb-2">Naive population</div>
              <Measured src="drift.json → containment.naive_population" className="text-[28px] text-red">
                {fmtInt(cont.naive_population)}
              </Measured>
              <div className="text-[11px] text-text-3 mt-1">everything since last known-good</div>
            </div>
            <div className="card-raised p-4">
              <div className="label mb-2">DARKLINE population</div>
              <Measured src="drift.json → containment.darkline_population" className="text-[28px] text-amber">
                {fmtInt(cont.darkline_population)}
              </Measured>
              <div className="text-[11px] text-text-3 mt-1">inside the corroborated boundary</div>
            </div>
            <div className="card-raised p-4">
              <div className="label mb-2">Reduction</div>
              <Measured src="drift.json → containment.reduction_pct" className="text-[28px] text-green">
                {fmt(cont.reduction_pct, 1)}%
              </Measured>
              <div className="text-[11px] text-text-3 mt-1">fewer parts held</div>
            </div>
          </div>

          <Panel title={`Implicated parts · sample of ${cont.sample_part_ids.length}`}>
            {rows.length === 0 ? (
              <p className="text-body text-text-2 py-4">
                None of the sampled part IDs are present in{' '}
                <span className="num">parts_sample.csv</span>, so their details cannot be shown.
                The sample is a subset of the full ledger.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-[12px]">
                  <thead>
                    <tr className="text-left border-b border-border">
                      {['Part ID', 'Cycle time', 'Stations', 'Split', 'Risk score', ''].map((h) => (
                        <th key={h} className="label py-2 font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((p) => (
                      <tr key={p.Id} className="border-b border-border/60 hover:bg-card/50">
                        <td className="py-2"><Measured src="parts_sample.csv → Id">{p.Id}</Measured></td>
                        <td><Measured src="parts_sample.csv → total_cycle_time" title={TIME_UNITS_NOTE}>{fmt(p.total_cycle_time)}</Measured></td>
                        <td><Measured src="parts_sample.csv → n_stations_visited">{p.n_stations_visited}</Measured></td>
                        <td><Chip tone={p.split === 'test' ? 'green' : 'neutral'}>{p.split}</Chip></td>
                        <td><Measured src="parts_sample.csv → risk_score">{fmt(p.risk_score, 4)}</Measured></td>
                        <td className="text-right">
                          <button onClick={() => setCert(p)} className="text-[11px] text-accent-lt hover:underline">
                            certificate
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex gap-2 mt-4 pt-3 border-t border-border">
              <button className="inline-flex items-center gap-2 px-3 py-1.5 rounded-btn bg-red/15 border border-red/50 text-red text-[12px] font-medium hover:bg-red/25 transition-colors">
                <ShieldAlert className="w-3.5 h-3.5" /> Quarantine {fmtInt(cont.darkline_population)} parts
              </button>
              <button
                onClick={() => rows[0] && setCert(rows[0])}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-btn bg-green/15 border border-green/50 text-green text-[12px] font-medium hover:bg-green/25 transition-colors"
              >
                <ShieldCheck className="w-3.5 h-3.5" /> Release with certificate
              </button>
            </div>
          </Panel>
        </>
      )}

      {cert && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-6" onClick={() => setCert(null)}>
          <div className="panel max-w-lg w-full p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="label mb-1">Evidence certificate</div>
                <div className="num text-[16px]">Part {cert.Id}</div>
              </div>
              <button onClick={() => setCert(null)} className="text-text-3 hover:text-text-1"><X className="w-4 h-4" /></button>
            </div>
            <dl className="space-y-2.5 text-[12px]">
              {[
                ['Path signature', <span className="num text-[10px] break-all">{cert.path_signature}</span>],
                ['Split', cert.split],
                ['Cycle time', fmt(cert.total_cycle_time)],
                ['Risk score', fmt(cert.risk_score, 4)],
                ['Change-point', `${fmt(d.cp_time, 2)} (index ${d.cp_index})`],
                ['Drifting feature', <span className="num text-[10px] break-all">{d.feature}</span>],
                ['Corroborating signals', `${d.independent_stable_signals} verified stable`],
                ['Boundary status', d.boundary_may_move ? 'may move — corroborated' : 'locked'],
              ].map(([k, v]) => (
                <div key={String(k)} className="flex justify-between gap-4 border-b border-border/60 pb-2">
                  <dt className="text-text-3">{k}</dt>
                  <dd className="text-right text-text-1">{v}</dd>
                </div>
              ))}
              <div className="flex justify-between gap-4 pt-1">
                <dt className="text-text-3">Content hash</dt>
                <dd className="num text-text-2">
                  {contentHash(`${cert.Id}|${cert.path_signature}|${d.cp_time}|${d.feature}`)}
                </dd>
              </div>
            </dl>
            <p className="text-[11px] text-text-3 mt-4">
              Derived from drift.json and parts_sample.csv. The hash covers the part identity, its
              routing path, and the change-point it was evaluated against.
            </p>
          </div>
        </div>
      )}
    </>
  )
}
