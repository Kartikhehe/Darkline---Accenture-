import { AlertTriangle, FileWarning, Loader2, Info } from 'lucide-react'
import type { ReactNode } from 'react'

export function Loading({ what = 'data' }: { what?: string }) {
  return (
    <div className="flex items-center gap-2 text-text-2 py-16 justify-center">
      <Loader2 className="w-4 h-4 animate-spin" />
      <span className="text-body">Loading {what}…</span>
    </div>
  )
}

/** Rule 4: name the missing file and what it would have shown. Never fabricate. */
export function MissingFile({ file, would, error }: { file: string; would: string; error?: string }) {
  return (
    <div className="panel p-6 flex gap-3 items-start max-w-2xl">
      <FileWarning className="w-5 h-5 text-amber shrink-0 mt-0.5" />
      <div>
        <div className="text-text-1 font-medium mb-1">Data file unavailable</div>
        <div className="text-body text-text-2 mb-2">
          This screen reads <span className="num text-amber">{file}</span>, which could not be loaded.
          It would have shown {would}.
        </div>
        {error && <div className="text-[11px] num text-text-3">{error}</div>}
        <div className="text-[11px] text-text-3 mt-2">
          No substitute content is displayed — figures appear only when they come from the bundle.
        </div>
      </div>
    </div>
  )
}

export function EmptyState({ icon, title, children }: { icon?: ReactNode; title: string; children: ReactNode }) {
  return (
    <div className="panel p-10 max-w-2xl mx-auto text-center">
      <div className="flex justify-center mb-4 text-text-2">
        {icon ?? <Info className="w-7 h-7" />}
      </div>
      <div className="text-text-1 text-[15px] font-medium mb-3">{title}</div>
      <div className="text-body text-text-2 leading-relaxed">{children}</div>
    </div>
  )
}

export function Warn({ children }: { children: ReactNode }) {
  return (
    <div className="flex gap-2 items-start text-[12px] text-amber">
      <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
      <div>{children}</div>
    </div>
  )
}
