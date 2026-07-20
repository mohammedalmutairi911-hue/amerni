import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

export type Page = 'landing' | 'dashboard' | 'worker' | 'admin' | 'admin-enterprises' | 'support' | 'browse' | 'bounties' | 'earn' | 'referral' | 'worker-profile' | 'join' | 'enterprises' | 'provider-dashboard'

const VALID_PAGES: Page[] = ['landing', 'dashboard', 'worker', 'admin', 'admin-enterprises', 'support', 'browse', 'bounties', 'earn', 'referral', 'worker-profile', 'join', 'enterprises', 'provider-dashboard']

function getPageFromHash(): Page {
  const hash = window.location.hash.replace('#/', '').replace('#', '').trim()
  if (!hash || hash === '/') return 'landing'
  return VALID_PAGES.includes(hash as Page) ? (hash as Page) : 'landing'
}

function setHash(p: Page) {
  const hash = p === 'landing' ? '' : `#/${p}`
  window.history.replaceState(null, '', hash || window.location.pathname)
}

interface AppCtx {
  page: Page
  navigate: (p: Page) => void
  authOpen: boolean
  authTab: 'login' | 'signup'
  authPlatform: 'individuals' | 'enterprises'
  authPrefill: { name?: string; email?: string } | null
  openAuth: (tab?: 'login' | 'signup', platform?: 'individuals' | 'enterprises', prefill?: { name?: string; email?: string }) => void
  closeAuth: () => void
}

const AppContext = createContext<AppCtx>(null!)
export const useApp = () => useContext(AppContext)

export function AppProvider({ children }: { children: ReactNode }) {
  const [page, setPage] = useState<Page>(getPageFromHash)
  const [theme, setTheme] = useState<'dark'|'light'>(() => (localStorage.getItem('theme') as any) || 'dark')
  const toggleTheme = () => setTheme(t => { const n = t==='dark'?'light':'dark'; localStorage.setItem('theme', n); return n })
  const [authOpen, setAuthOpen] = useState(false)
  const [authTab, setAuthTab] = useState<'login' | 'signup'>('login')
  const [authPlatform, setAuthPlatform] = useState<'individuals' | 'enterprises'>('individuals')
  const [authPrefill, setAuthPrefill] = useState<{ name?: string; email?: string } | null>(null)

  // Sync page when browser back/forward buttons used
  useEffect(() => {
    const onHashChange = () => setPage(getPageFromHash())
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  const navigate = (p: Page) => {
    setHash(p)
    setPage(p)
  }

  return (
    <AppContext.Provider value={{
      page,
      navigate,
      authOpen,
      authTab,
      authPlatform,
      authPrefill,
      openAuth: (tab = 'login', platform = 'individuals', prefill = null) => { setAuthTab(tab); setAuthPlatform(platform); setAuthPrefill(prefill); setAuthOpen(true) },
      closeAuth: () => setAuthOpen(false)
    }}>
      {children}
    </AppContext.Provider>
  )
}
