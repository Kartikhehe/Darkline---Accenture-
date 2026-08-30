import { HashRouter, Route, Routes } from 'react-router-dom'
import { BundleProvider } from './lib/BundleContext'
import { ThemeProvider } from './lib/theme'
import { Sidebar, TopBar } from './components/Chrome'
import LineOverview from './screens/LineOverview'
import DarkStations from './screens/DarkStations'
import Constraint from './screens/Constraint'
import Drift from './screens/Drift'
import Containment from './screens/Containment'
import PartLedger from './screens/PartLedger'
import ModelReport from './screens/ModelReport'
import Methodology from './screens/Methodology'
import { DemoMode } from './components/DemoMode'

export default function App() {
  return (
    <ThemeProvider>
      <BundleProvider>
        <HashRouter>
          <div className="h-full flex flex-col min-w-[1280px]">
            <TopBar />
            <div className="flex-1 flex min-h-0">
              <Sidebar />
              <main className="flex-1 overflow-y-auto p-5">
                <Routes>
                  <Route path="/" element={<LineOverview />} />
                  <Route path="/dark" element={<DarkStations />} />
                  <Route path="/constraint" element={<Constraint />} />
                  <Route path="/drift" element={<Drift />} />
                  <Route path="/containment" element={<Containment />} />
                  <Route path="/ledger" element={<PartLedger />} />
                  <Route path="/model" element={<ModelReport />} />
                  <Route path="/methodology" element={<Methodology />} />
                </Routes>
              </main>
            </div>
            <DemoMode />
          </div>
        </HashRouter>
      </BundleProvider>
    </ThemeProvider>
  )
}
