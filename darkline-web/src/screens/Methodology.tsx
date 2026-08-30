import { Panel, ScreenHeader } from '../components/UI'
import { useBundle } from '../lib/BundleContext'
import { Inferred, Measured } from '../components/Value'

const H = ({ children }: { children: React.ReactNode }) => (
  <h3 className="text-[14px] font-semibold text-text-1 mb-2 mt-5 first:mt-0">{children}</h3>
)
const P = ({ children }: { children: React.ReactNode }) => (
  <p className="text-body text-text-2 leading-[1.7] mb-3 max-w-3xl">{children}</p>
)

export default function Methodology() {
  const { bundle } = useBundle()
  const lo = bundle?.lineOverview

  return (
    <>
      <ScreenHeader
        title="Methodology"
        subtitle="What the system computes, how it is validated, and what it cannot claim."
      />

      <div className="grid grid-cols-[1fr_320px] gap-4">
        <div className="flex flex-col gap-4">
          <Panel title="Dark stations">
            <H>Definition</H>
            <P>
              A station is <strong className="text-text-1">dark</strong> when it appears in the
              dataset's timing columns — so we know parts passed through it and when — but carries no
              numeric measurement columns. It is observed in time and unobserved in measurement.
            </P>
            {lo && (
              <P>
                In this bundle,{' '}
                <Inferred src="line_overview.json → n_dark">{lo.n_dark}</Inferred> of{' '}
                <Measured src="line_overview.json → n_stations">{lo.n_stations}</Measured> stations
                meet that definition. That count comes from the station catalog, not from a figure
                asserted anywhere else.
              </P>
            )}

            <H>Dwell reconstruction</H>
            <P>
              The interval between two observed timestamps is not a station's processing time. It
              contains transit, queueing, processing and blocking. We decompose it into a transit
              floor taken from the low-traffic behaviour of that transition, a queueing term derived
              from the work-in-progress in the segment at that moment, and a residual treated as
              processing. Work-in-progress is computed with a sorted event sweep — entries and exits
              accumulated in one pass — rather than a per-part scan.
            </P>
            <P>
              Uncertainty is not a point estimate with an assumed error bar. A quantile model is fit
              at the 5th, 50th and 95th percentiles, so every reconstructed value carries a genuine
              prediction interval.
            </P>

            <H>Validation: withhold and recover</H>
            <P>
              The reconstruction would be unfalsifiable if it were only ever applied where no truth
              exists. So we take stations that <em>are</em> instrumented, hide their timing column,
              reconstruct them with the identical estimator, and score against the truth we hid. We
              report per-station absolute error and, critically, the fraction of true values that
              fall inside the 90% prediction interval. Coverage far from 0.90 means the intervals are
              lying, whatever the error looks like.
            </P>

            <H>Constraint detection</H>
            <P>
              The bottleneck is located with the <strong className="text-text-1">Active Period
              Method</strong> (Roser, Nakano &amp; Tanaka, 2001). A station is in an active period
              while working without interruption, and the station with the longest average
              uninterrupted active period is the momentary constraint.
            </P>
            <P>
              This method was chosen deliberately: it needs only working-versus-waiting states, not
              utilisation ratios or cycle-time targets. Working-versus-waiting is exactly what dwell
              reconstruction recovers, which is what makes it possible to locate a constraint inside
              the unmeasured zone at all.
            </P>

            <H>Drift and corroboration</H>
            <P>
              Per-station feature series are ordered in time, a stable regime is learned, and control
              limits are set at ±3σ of that regime. These are{' '}
              <strong className="text-text-1">statistical control limits derived from the data</strong>,
              never engineering specification limits — Bosch's real tolerances are not in this
              dataset. Monotonic drift is tested with Mann–Kendall under the Hamed–Rao correction for
              autocorrelation; the change-point is located with PELT.
            </P>
            <P>
              The suspect-window boundary may only move when at least one physically separate signal
              — a feature at a different station, the rolling failure rate, or the routing mix — is
              verified stable across the window. A tool's own readings cannot certify its own past.
            </P>
          </Panel>

          <Panel title="Limitations">
            <ul className="space-y-3 max-w-3xl">
              {[
                ['Segment granularity', 'Where two or more unmeasured stations sit inside a single observed segment, only their combined dwell is recoverable. Those estimates are reported at segment level with the pooled stations named, never as a single-station value.'],
                ['Anonymised units', 'Bosch measurements are scaled and unitless. No physical unit is attached to any value in this console, because none can be justified.'],
                ['Anonymised time', 'Timestamps are relative, anonymised units — not wall-clock. Durations are comparable to each other and to nothing outside the dataset.'],
                ['Single-dataset validation', 'Every result here comes from one dataset from one manufacturer. Nothing has been shown to transfer to another line.'],
                ['Drift availability', 'A clean drift event requires a stable pre-regime, a detected change-point, and independent corroboration. When no candidate meets all three, the drift and containment screens say so rather than showing a fabricated event.'],
                ['Observational data', 'These are historical records, not a controlled experiment. Associations between dwell, routing and failure are not causal claims.'],
              ].map(([k, v]) => (
                <li key={k}>
                  <div className="text-[13px] font-medium text-text-1 mb-0.5">{k}</div>
                  <div className="text-body text-text-2 leading-relaxed">{v}</div>
                </li>
              ))}
            </ul>
          </Panel>
        </div>

        <div className="flex flex-col gap-4">
          <Panel title="References">
            <ul className="space-y-3 text-[12px] text-text-2 leading-relaxed">
              <li>
                Roser, C., Nakano, M. &amp; Tanaka, M. (2001). <em>A practical bottleneck detection
                method.</em> Proceedings of the 2001 Winter Simulation Conference, 949–953.
              </li>
              <li>
                Killick, R., Fearnhead, P. &amp; Eckley, I. A. (2012). <em>Optimal detection of
                changepoints with a linear computational cost.</em> Journal of the American
                Statistical Association, 107(500), 1590–1598. (PELT)
              </li>
              <li>
                Hamed, K. H. &amp; Rao, A. R. (1998). <em>A modified Mann–Kendall trend test for
                autocorrelated data.</em> Journal of Hydrology, 204(1–4), 182–196.
              </li>
              <li>
                Bosch (2016). <em>Bosch Production Line Performance.</em> Kaggle competition dataset.
              </li>
            </ul>
          </Panel>

          <Panel title="Reading the numbers">
            <div className="space-y-3 text-[12px] text-text-2 leading-relaxed">
              <p>
                <Measured src="convention">Measured values</Measured> render in white. They come
                directly from the dataset.
              </p>
              <p>
                <Inferred src="convention">Inferred values</Inferred> render in cyan with a dotted
                underline. They are reconstructed, carry a prediction interval, and are never
                presented as measurements.
              </p>
              <p>
                Every number on every screen carries a provenance tooltip naming the file and field
                it came from. If a figure is not in the data bundle, it does not appear.
              </p>
            </div>
          </Panel>
        </div>
      </div>
    </>
  )
}
