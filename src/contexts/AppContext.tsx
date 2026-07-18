import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

export type Page = 'landing' | 'dashboard' | 'worker' | 'admin' | 'support' | 'browse' | 'bounties' | 'earn' | 'referral' | 'worker-profile' | 'join' | 'enterprises'

const VALID_PAGES: Page[] = ['landing', 'dashboard', 'worker', 'admin', 'support', 'browse', 'bounties', 'earn', 'referral', 'worker-profile', 'join', 'enterprises']

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
  openAuth: (tab?: 'login' | 'signup') => void
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
      openAuth: (tab = 'login') => { setAuthTab(tab); setAuthOpen(true) },
      closeAuth: () => setAuthOpen(false)
    }}>
      {children}
    </AppContext.Provider>
  )
}
