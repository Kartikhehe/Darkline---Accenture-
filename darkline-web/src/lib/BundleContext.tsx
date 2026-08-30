import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { loadBundle } from './data'
import type { Bundle } from './types'

interface Ctx { bundle: Bundle | null; loading: boolean }
const BundleCtx = createContext<Ctx>({ bundle: null, loading: true })

export function BundleProvider({ children }: { children: ReactNode }) {
  const [bundle, setBundle] = useState<Bundle | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    loadBundle().then((b) => {
      if (alive) { setBundle(b); setLoading(false) }
    })
    return () => { alive = false }
  }, [])

  return <BundleCtx.Provider value={{ bundle, loading }}>{children}</BundleCtx.Provider>
}

export const useBundle = () => useContext(BundleCtx)
