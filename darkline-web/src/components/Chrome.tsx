import { NavLink } from 'react-router-dom'
import { useState } from 'react'
import {
  Activity, EyeOff, GitBranch, TrendingUp, ShieldCheck,
  List, BarChart3, BookOpen, PanelLeftClose, PanelLeft,
} from 'lucide-react'
import { ProvenanceLegend } from './Value'
import { useBundle } from '../lib/BundleContext'

const NAV = [
  { to: '/', label: 'Line Overview', icon: Activity, end: true },
  { to: '/dark', label: 'Dark Stations', icon: EyeOff },
  { to: '/constraint', label: 'Constraint', icon: GitBranch },
  { to: '/drift', label: 'Drift & Evidence', icon: TrendingUp },
  { to: '/containment', label: 'Containment', icon: ShieldCheck },
  { to: '/ledger', label: 'Part Ledger', icon: List },
  { to: '/model', label: 'Model Report', icon: BarChart3 },
  { to: '/methodology', label: 'Methodology', icon: BookOpen },
]

export function TopBar() {
  const { bundle } = useBundle()
  const m = bundle?.manifest
  const placeholder = m?.source === 'PLACEHOLDER'
  return (
    <header className="h-14 shrink-0 border-b border-border bg-panel flex items-center px-4 gap-4">
      <div className="flex items-center gap-2.5">
        <div className="w-4 h-4 bg-accent rounded-[3px]" />
        <span className="font-semibold tracking-tight text-[15px]">DARKLINE</span>
      </div>
      <div className="h-5 w-px bg-border" />
      <span className="text-body text-text-2">{m?.dataset ?? '—'}</span>
      <span
        className={`text-label px-2 py-1 rounded-btn border ${
          placeholder
            ? 'border-amber/40 text-amber bg-amber/10'
            : 'border-green/40 text-green bg-green/10'
        }`}
        title={placeholder
          ? 'This bundle is placeholder data with the production schema.'
          : 'Figures derive from the Bosch Production Line Performance dataset.'}
      >
        {placeholder ? 'PLACEHOLDER DATA' : 'REAL DATA · BOSCH'}
      </span>
      <div className="ml-auto text-[11px] num text-text-3" title="manifest.json → generated_utc">
        {m?.generated_utc ?? '—'}
      </div>
    </header>
  )
}

export function Sidebar() {
  const [open, setOpen] = useState(true)
  return (
    <nav
      className={`${open ? 'w-[220px]' : 'w-[52px]'} shrink-0 border-r border-border bg-panel flex flex-col transition-[width] duration-150`}
    >
      <div className="flex-1 py-3">
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `relative flex items-center gap-2.5 px-3 py-2 mx-2 rounded-btn text-body transition-colors ${
                isActive
                  ? 'bg-card text-text-1 font-medium'
                  : 'text-text-2 hover:text-text-1 hover:bg-card/50'
              }`
            }
            title={open ? undefined : label}
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <span className="absolute left-0 top-1.5 bottom-1.5 w-[2px] bg-accent rounded-full" />
                )}
                <Icon className="w-4 h-4 shrink-0" />
                {open && <span className="truncate">{label}</span>}
              </>
            )}
          </NavLink>
        ))}
      </div>
      {open && <ProvenanceLegend />}
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 px-3 py-2.5 text-text-3 hover:text-text-1 border-t border-border text-[11px] transition-colors"
      >
        {open ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeft className="w-4 h-4" />}
        {open && <span>Collapse</span>}
      </button>
    </nav>
  )
}
