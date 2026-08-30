import type { ReactNode } from 'react'

/**
 * Rule 1 + Rule 3, enforced in one place.
 *
 * <Measured> renders white. <Inferred> renders cyan with a dotted underline.
 * Both require a `src` describing the file and field the number came from,
 * which becomes the provenance tooltip. Every numeric value in the app goes
 * through one of these two components.
 */

interface ValueProps {
  children: ReactNode
  /** Provenance: "line_overview.json → stations[].median_dwell" */
  src: string
  className?: string
  title?: string
}

export function Measured({ children, src, className = '', title }: ValueProps) {
  return (
    <span
      className={`measured ${className}`}
      title={title ? `${title}\nSource: ${src}` : `Source: ${src}`}
      data-provenance={src}
    >
      {children}
    </span>
  )
}

export function Inferred({ children, src, className = '', title }: ValueProps) {
  const base = 'Inferred value — reconstructed, not measured.'
  return (
    <span
      className={`inferred ${className}`}
      title={`${base}\n${title ? title + '\n' : ''}Source: ${src}`}
      data-provenance={src}
      data-inferred="true"
    >
      {children}
    </span>
  )
}

/** Switches on a flag so callers can stay declarative. */
export function AutoValue({
  inferred, children, src, className, title,
}: ValueProps & { inferred: boolean }) {
  const C = inferred ? Inferred : Measured
  return <C src={src} className={className} title={title}>{children}</C>
}

/** The permanent legend that lives in the sidebar footer. */
export function ProvenanceLegend() {
  return (
    <div className="px-3 py-3 border-t border-border">
      <div className="label mb-2">Value provenance</div>
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <span className="measured text-[12px]">0.00</span>
          <span className="text-[11px] text-text-2">Measured</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inferred text-[12px]">0.00</span>
          <span className="text-[11px] text-text-2">Inferred</span>
        </div>
      </div>
    </div>
  )
}
