import type { ReactNode } from 'react'

export function Panel({ title, right, children, className = '' }: {
  title?: string; right?: ReactNode; children: ReactNode; className?: string
}) {
  return (
    <section className={`panel p-4 ${className}`}>
      {(title || right) && (
        <div className="flex items-center justify-between mb-3">
          {title && <h2 className="label">{title}</h2>}
          {right}
        </div>
      )}
      {children}
    </section>
  )
}

export function KPI({ label, value, sub, hint }: {
  label: string; value: ReactNode; sub?: ReactNode; hint?: string
}) {
  return (
    <div className="card-raised p-4" title={hint}>
      <div className="label mb-2">{label}</div>
      <div className="text-[28px] leading-none mb-1.5">{value}</div>
      {sub && <div className="text-[11px] text-text-3">{sub}</div>}
    </div>
  )
}

export function Chip({ tone = 'neutral', children, title }: {
  tone?: 'neutral' | 'dark' | 'amber' | 'red' | 'green' | 'cyan' | 'accent'
  children: ReactNode; title?: string
}) {
  const tones: Record<string, string> = {
    neutral: 'border-border text-text-2 bg-card',
    dark: 'border-border text-text-3 bg-transparent',
    amber: 'border-amber/40 text-amber bg-amber/10',
    red: 'border-red/40 text-red bg-red/10',
    green: 'border-green/40 text-green bg-green/10',
    cyan: 'border-cyan/40 text-cyan bg-cyan/10',
    accent: 'border-accent/50 text-accent-lt bg-accent/10',
  }
  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] uppercase tracking-[0.06em] font-medium whitespace-nowrap ${tones[tone]}`}
      title={title}
    >
      {children}
    </span>
  )
}

export function ScreenHeader({ title, subtitle, right }: {
  title: string; subtitle?: string; right?: ReactNode
}) {
  return (
    <div className="flex items-start justify-between mb-5 gap-4">
      <div>
        <h1 className="text-[20px] font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="text-body text-text-2 mt-1 max-w-3xl">{subtitle}</p>}
      </div>
      {right}
    </div>
  )
}

/** Prose note used for methodology / limitations blocks. */
export function Note({ children }: { children: ReactNode }) {
  return <p className="text-body text-text-2 leading-relaxed">{children}</p>
}
