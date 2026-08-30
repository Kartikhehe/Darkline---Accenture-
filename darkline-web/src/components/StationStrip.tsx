import { useState } from 'react'
import { EyeOff } from 'lucide-react'
import type { StationRow } from '../lib/types'
import { Inferred, Measured } from './Value'
import { Chip } from './UI'
import { fmt, fmtPctRaw, TIME_UNITS_NOTE } from '../lib/format'

const SRC = 'line_overview.json → stations[]'

function Popover({ s }: { s: StationRow }) {
  return (
    <div className="absolute z-20 left-1/2 -translate-x-1/2 top-full mt-2 w-64 panel p-3 shadow-xl pointer-events-none">
      <div className="flex items-center justify-between mb-2">
        <span className="num text-text-1 font-medium">{s.station}</span>
        {s.is_dark
          ? <Chip tone="cyan">Dark</Chip>
          : <Chip tone="green">Measured</Chip>}
      </div>
      <dl className="text-[11px] space-y-1">
        <Row k="Numeric features">
          <Measured src={`${SRC}.n_numeric`}>{s.n_numeric}</Measured>
        </Row>
        <Row k="Date columns">
          <Measured src={`${SRC}.n_date`}>{s.n_date}</Measured>
        </Row>
        <Row k={`Median dwell`}>
          {s.is_dark
            ? <Inferred src={`${SRC}.median_dwell`} title={TIME_UNITS_NOTE}>{fmt(s.median_dwell)}</Inferred>
            : <Measured src={`${SRC}.median_dwell`} title={TIME_UNITS_NOTE}>{fmt(s.median_dwell)}</Measured>}
        </Row>
        <Row k="p25–p75">
          {s.is_dark
            ? <Inferred src={`${SRC}.p25_dwell / p75_dwell`} title={TIME_UNITS_NOTE}>{fmt(s.p25_dwell)}–{fmt(s.p75_dwell)}</Inferred>
            : <Measured src={`${SRC}.p25_dwell / p75_dwell`} title={TIME_UNITS_NOTE}>{fmt(s.p25_dwell)}–{fmt(s.p75_dwell)}</Measured>}
        </Row>
        <Row k="Dwell coverage">
          <Measured src={`${SRC}.coverage_pct`}>{fmtPctRaw(s.coverage_pct)}</Measured>
        </Row>
        {s.reconstruction_mae !== null && (
          <Row k="Recon. MAE">
            <Measured src={`${SRC}.reconstruction_mae`}>{fmt(s.reconstruction_mae, 3)}</Measured>
          </Row>
        )}
        {s.reconstruction_coverage !== null && (
          <Row k="90% interval coverage">
            <Measured src={`${SRC}.reconstruction_coverage`}>{fmt(s.reconstruction_coverage, 3)}</Measured>
          </Row>
        )}
      </dl>
    </div>
  )
}

const Row = ({ k, children }: { k: string; children: React.ReactNode }) => (
  <div className="flex justify-between gap-2">
    <dt className="text-text-3">{k}</dt>
    <dd>{children}</dd>
  </div>
)

export function StationStrip({ stations, constraintStation }: {
  stations: StationRow[]; constraintStation?: string
}) {
  const [hover, setHover] = useState<string | null>(null)

  // Shared dwell domain so every station's p25-p75 bar is on the same scale.
  const dwellMax = Math.max(...stations.map((s) => s.p75_dwell ?? 0), 1)
  const pos = (v: number | null) => ((v ?? 0) / dwellMax) * 100

  const byLine = stations.reduce<Record<number, StationRow[]>>((acc, s) => {
    (acc[s.line] ??= []).push(s)
    return acc
  }, {})
  const lines = Object.keys(byLine).map(Number).sort((a, b) => a - b)

  return (
    <div className="overflow-x-auto pb-2">
      <div className="flex gap-6 min-w-max">
        {lines.map((ln) => (
          <div key={ln}>
            <div className="label sticky left-0 mb-2 text-accent-lt">Line {ln}</div>
            <div className="flex gap-1.5">
              {byLine[ln]
                .sort((a, b) => a.station_no - b.station_no)
                .map((s) => {
                  const isConstraint = s.station === constraintStation
                  return (
                    <div
                      key={s.station}
                      className="relative"
                      onMouseEnter={() => setHover(s.station)}
                      onMouseLeave={() => setHover(null)}
                    >
                      <div
                        className={`w-[104px] h-[92px] rounded-card p-2 flex flex-col justify-between transition-colors cursor-default ${
                          s.is_dark
                            ? 'border border-dashed border-border bg-transparent hover:border-cyan/50'
                            : 'bg-card border border-border hover:border-text-3'
                        } ${isConstraint ? '!border-amber !border-solid' : ''}`}
                      >
                        <div className="flex items-start justify-between gap-1">
                          <span className="num text-[11px] text-text-1">{s.station}</span>
                          {s.is_dark && <EyeOff className="w-3 h-3 text-text-3 shrink-0" />}
                        </div>

                        {s.is_dark ? (
                          <div>
                            <div className="text-[9px] uppercase tracking-[0.06em] text-text-3 mb-0.5">
                              No measurement
                            </div>
                            <Inferred src={`${SRC}.median_dwell`} title={TIME_UNITS_NOTE} className="text-[15px]">
                              {fmt(s.median_dwell)}
                            </Inferred>
                            <div className="text-[9px] text-cyan/70 num mt-0.5">
                              {fmt(s.p25_dwell)}–{fmt(s.p75_dwell)}
                            </div>
                          </div>
                        ) : (
                          <div>
                            <Measured src={`${SRC}.median_dwell`} title={TIME_UNITS_NOTE} className="text-[15px]">
                              {fmt(s.median_dwell)}
                            </Measured>
                            {/* p25-p75 range, scaled to the line-wide dwell range so
                                widths are comparable across stations. */}
                            <div
                              className="mt-1 h-[3px] bg-border rounded-full relative overflow-hidden"
                              title={`p25-p75: ${fmt(s.p25_dwell)}-${fmt(s.p75_dwell)}`}
                            >
                              <span
                                className="absolute inset-y-0 bg-text-3 rounded-full"
                                style={{
                                  left: `${pos(s.p25_dwell)}%`,
                                  width: `${Math.max(4, pos(s.p75_dwell) - pos(s.p25_dwell))}%`,
                                }}
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      {isConstraint && (
                        <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 whitespace-nowrap z-10">
                          <span className="px-1.5 py-0.5 rounded border border-amber bg-bg text-amber text-[8px] uppercase tracking-[0.06em] font-semibold">
                            Constraint
                          </span>
                        </div>
                      )}
                      {hover === s.station && <Popover s={s} />}
                    </div>
                  )
                })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
