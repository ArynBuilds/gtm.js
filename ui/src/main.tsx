import './index.css'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Shell } from '@/components/Shell'
import { useSetup } from '@/lib/api'
import { Home } from '@/views/Home'
import { Inbox } from '@/views/Inbox'
import { People } from '@/views/People'
import { Signals } from '@/views/Signals'
import { Problems } from '@/views/Problems'
import { Insights } from '@/views/Insights'
import { Brain } from '@/views/Brain'
import { Connections } from '@/views/Connections'
import { Onboarding } from '@/views/onboarding/Onboarding'

const client = new QueryClient({ defaultOptions: { queries: { staleTime: 2000, retry: 1 } } })

// A workspace that was never set up opens on the setup. Once the setup has
// started it stays until its last screen, even after the workspace is written.
function App() {
  const { data, isError } = useSetup()
  const [setup, setSetup] = useState<boolean | null>(null)
  useEffect(() => { if (data && setup === null) setSetup(!data.ready) }, [data, setup])
  if (isError && setup === null) {
    return <div className="grid h-full place-items-center text-sm text-muted-foreground">The gtm.js service is not running. Start it with npm start, then reload.</div>
  }
  if (setup === null) return null
  if (setup) return <Onboarding onDone={() => setSetup(false)} />
  return (
    <HashRouter>
      <Routes>
        <Route element={<Shell />}>
          <Route index element={<Home />} />
          <Route path="inbox" element={<Inbox />} />
          <Route path="people" element={<People />} />
          <Route path="signals" element={<Signals />} />
          <Route path="problems" element={<Problems />} />
          <Route path="insights" element={<Insights />} />
          <Route path="brain" element={<Brain />} />
          <Route path="connections" element={<Connections />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={client}>
      <TooltipProvider delayDuration={300}>
        <App />
        <Toaster position="bottom-center" />
      </TooltipProvider>
    </QueryClientProvider>
  </StrictMode>,
)
