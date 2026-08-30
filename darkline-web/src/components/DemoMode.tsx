import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'

const STEPS = [
  { to: '/', title: 'The blind line', body: 'A large share of stations are timed but not measured. The strip shows every station; the dotted ones report no measurement at all, and their dwell is inferred.' },
  { to: '/dark', title: 'The reconstruction proof', body: 'We hide stations we can observe, rebuild them with the identical estimator, and score against the truth we hid. The gate badge checks that the 90% intervals actually cover 90%.' },
  { to: '/constraint', title: 'The constraint in the dark', body: 'The Active Period Method needs only working-versus-waiting states — which is what reconstruction recovers. That is how the constraint can be located inside the blind zone.' },
  { to: '/model', title: 'The model, honestly measured', body: 'A temporal split, a threshold fixed on validation, and a test split scored once. Every figure here is held-out, and the leakage controls are stated explicitly.' },
  { to: '/drift', title: 'Drift and corroboration', body: 'A change-point only counts when a physically independent signal agrees. Where the data yields no clean event, the screen says so rather than showing a fabricated one.' },
  { to: '/containment', title: 'Containment', body: 'The payoff: a quarantine narrowed from everything-since-last-known-good to the parts the evidence actually implicates, each with its own certificate.' },
]

export function DemoMode() {
  const [params, setParams] = useSearchParams()
  const nav = useNavigate()
  const [i, setI] = useState(0)

  // Accept ?demo=1 either inside the hash (#/?demo=1) or before it (?demo=1#/),
  // since HashRouter only sees the former.
  const [on, setOn] = useState(
    () => params.get('demo') === '1' ||
      new URLSearchParams(window.location.search).get('demo') === '1',
  )

  // Navigating between steps must not drop the demo flag from the URL.
  useEffect(() => {
    if (on) nav({ pathname: STEPS[i].to, search: '?demo=1' })
  }, [i, on, nav])

  if (!on) return null
  const s = STEPS[i]

  return (
    <div className="fixed bottom-5 right-5 w-[380px] panel p-4 z-50 shadow-2xl border-accent/40">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="w-5 h-5 rounded bg-accent/20 border border-accent/50 flex items-center justify-center num text-[11px] text-accent-lt">
            {i + 1}
          </span>
          <span className="text-[13px] font-semibold">{s.title}</span>
        </div>
        <button
          onClick={() => {
            setOn(false)
            const p = new URLSearchParams(params); p.delete('demo'); setParams(p)
          }}
          className="text-text-3 hover:text-text-1"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <p className="text-body text-text-2 leading-relaxed mb-3">{s.body}</p>
      <div className="flex items-center justify-between">
        <div className="flex gap-1">
          {STEPS.map((_, n) => (
            <button key={n} onClick={() => setI(n)}
              className={`h-1 rounded-full transition-all ${n === i ? 'w-5 bg-accent' : 'w-1.5 bg-border hover:bg-text-3'}`} />
          ))}
        </div>
        <div className="flex gap-1">
          <button onClick={() => setI((v) => Math.max(0, v - 1))} disabled={i === 0}
            className="p-1 rounded-btn border border-border text-text-2 hover:text-text-1 disabled:opacity-40">
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => setI((v) => Math.min(STEPS.length - 1, v + 1))} disabled={i === STEPS.length - 1}
            className="p-1 rounded-btn border border-border text-text-2 hover:text-text-1 disabled:opacity-40">
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}
