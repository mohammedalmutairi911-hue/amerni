import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

export type Page = 'landing' | 'dashboard' | 'worker' | 'admin' | 'admin-enterprises' | 'support' | 'browse' | 'bounties' | 'earn' | 'referral' | 'worker-profile' | 'join' | 'enterprises' | 'provider-dashboard' | 'lead-detail' | 'notification-settings'

const VALID_PAGES: Page[] = ['landing', 'dashboard', 'worker', 'admin', 'admin-enterprises', 'support', 'browse', 'bounties', 'earn', 'referral', 'worker-profile', 'join', 'enterprises', 'provider-dashboard', 'lead-detail', 'notification-settings']

function getPageFromHash(): Page {
  const hash = window.location.hash.replace('#/', '').replace('#', '').trim()
  // المسار الكامل (مثل lead-detail/uuid) — خذ الجزء الأول
  const basePage = hash.split('/')[0]
  if (basePage && VALID_PAGES.includes(basePage as Page)) return basePage as Page
  // لا يوجد hash صالح ⇒ الدومين الرئيسي "/" ⇒ بوابة الاختيار دائماً.
  // (لا نسترجع صفحة محفوظة هنا: ذلك كان يفتح الـ dashboard مباشرة
  //  ويكسر زر الرجوع عند العودة للجذر)
  return 'landing'
}

function setHash(p: string, replace = false) {
  const hash = p === 'landing' ? window.location.pathname : `#/${p}`
  // pushState يضيف entry جديد في history — عشان زر رجوع في المتصفح يشتغل داخل الموقع
  // replaceState فقط في التحميل الأولي أو الـ redirects التلقائية عشان ما يضيف entries زيادة
  if (replace) {
    window.history.replaceState({ page: p }, '', hash)
  } else {
    // ما نضيف entry جديد لو نفس الصفحة الحالية
    const currentHash = window.location.hash
    const newHash = p === 'landing' ? '' : `#/${p}`
    if (currentHash !== newHash) {
      window.history.pushState({ page: p }, '', hash)
    }
  }
}

interface AppCtx {
  page: Page
  navigate: (p: Page | string, options?: { replace?: boolean }) => void
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
    const onPopState = () => setPage(getPageFromHash())
    window.addEventListener('hashchange', onHashChange)
    window.addEventListener('popstate', onPopState)
    return () => {
      window.removeEventListener('hashchange', onHashChange)
      window.removeEventListener('popstate', onPopState)
    }
  }, [])

  const navigate = (p: string, options?: { replace?: boolean }) => {
    const basePage = p.split('/')[0] as Page
    setHash(p, options?.replace)
    setPage(VALID_PAGES.includes(basePage) ? basePage : 'landing')
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
