import React from 'react'
import { useState, useEffect } from 'react'
import { useAuth } from './contexts/AuthContext'
import { useApp } from './contexts/AppContext'
import { supabase } from './lib/supabase'
import { Navbar } from './components/layout/Navbar'
import { AuthModal } from './pages/AuthModal'
import { LandingPage } from './pages/LandingPage'
import { UserDashboard } from './pages/UserDashboard'
import { WorkerDashboard } from './pages/WorkerDashboard'
import { WorkerRegister } from './pages/WorkerRegister'
import { InstallPrompt } from './components/InstallPrompt'
import { PageLoader } from './components/PageLoader'
import { NotFoundPage } from './pages/NotFoundPage'

// Lazy-loaded pages — code splitting لتسريع التحميل الأول
const AdminPanel = React.lazy(() => import('./pages/AdminPanel').then(m => ({ default: m.AdminPanel })))
const SupportPage = React.lazy(() => import('./pages/SupportPage').then(m => ({ default: m.SupportPage })))
const BrowseWorkers = React.lazy(() => import('./pages/BrowseWorkers').then(m => ({ default: m.BrowseWorkers })))
const BountiesPage = React.lazy(() => import('./pages/BountiesPage').then(m => ({ default: m.BountiesPage })))
const ReferralPage = React.lazy(() => import('./pages/ReferralPage').then(m => ({ default: m.ReferralPage })))
const JoinPage = React.lazy(() => import('./pages/JoinPage').then(m => ({ default: m.JoinPage })))
const WorkerProfile = React.lazy(() => import('./pages/WorkerProfile').then(m => ({ default: m.WorkerProfile })))
const EnterprisesPage = React.lazy(() => import('./pages/EnterprisesPage').then(m => ({ default: m.EnterprisesPage })))
const ProviderDashboard = React.lazy(() => import('./pages/ProviderDashboard').then(m => ({ default: m.ProviderDashboard })))
import { ToastProvider } from './components/Toast'

// Handle worker profile URL param
const urlParams = new URLSearchParams(window.location.search)
const workerParam = urlParams.get('worker')
if (workerParam) {
  ;(window as any).__workerProfileId = workerParam
}

// التقاط رابط الإحالة (?ref=xxxxxxxx) وحفظه محلياً —
// كان هذا الجزء مفقوداً بالكامل، مما يجعل نظام الإحالة في ReferralPage.tsx
// لا يعمل أبداً لأن referred_by لا يُحفظ في أي مكان عند التسجيل
const refParam = urlParams.get('ref')
if (refParam) {
  localStorage.setItem('amerni_referred_by', refParam)
}

export class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean}> {
  state = { hasError: false }
  static getDerivedStateFromError(error: Error) { return { hasError: true, error } }
  componentDidCatch(error: Error) {
    console.error('ErrorBoundary caught:', error.message, error.stack)
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
          <div className="text-center max-w-sm">
            <div className="text-4xl font-black text-primary-400 mb-4">أمرني</div>
            <p className="text-slate-500 mb-2">حدث خطأ</p>
            <p className="text-red-400 text-xs mb-4 bg-red-950/30 p-2 rounded-lg" dir="ltr">
              {(this.state as any).error?.message || 'Unknown error'}
            </p>
            <button onClick={() => window.location.reload()}
              className="bg-primary-500 text-white font-bold px-6 py-3 rounded-xl">
              تحديث
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

export default function App() {
  const { user, profile, loading, refreshProfile } = useAuth()
  const { page, navigate, authOpen } = useApp()
  const [workerApproved, setWorkerApproved] = useState<boolean | null>(null)
  const [workerExists, setWorkerExists] = useState<boolean | null>(null)
  const [checking, setChecking] = useState(false)

  useEffect(() => {
    if (!user || !profile) { setWorkerApproved(null); setWorkerExists(null); return }
    if (profile.role === 'admin' && page !== 'landing' && page !== 'admin' && page !== 'enterprises' && page !== 'provider-dashboard') { navigate('admin'); return }
    if (profile.role === 'worker') {
      setChecking(true)
      supabase.from('worker_profiles').select('id, is_approved').eq('user_id', user.id).maybeSingle()
        .then(({ data }) => {
          setWorkerExists(!!data)
          setWorkerApproved(data?.is_approved || false)
          if (data?.is_approved && page === 'landing') navigate('worker')
          setChecking(false)
        })
    }
  }, [user?.id, profile?.role])

  if (loading || (profile?.role === 'worker' && checking)) return <PageLoader />

  const renderContent = () => {
    if (page === 'enterprises') return <><Navbar /><EnterprisesPage /></>

    if (!user || !profile) return <><Navbar /><LandingPage />{authOpen && <AuthModal />}<InstallPrompt /></>
    if (page === 'landing') return <><Navbar /><LandingPage />{authOpen && <AuthModal />}</>
    if (page === 'provider-dashboard') return <ProviderDashboard />
    if (page === 'support') return <><Navbar /><SupportPage /></>
    if (page === 'browse') return <><Navbar /><BrowseWorkers /></>
    if (page === 'bounties') return <><Navbar /><BountiesPage /></>
    if (page === 'referral') return <><Navbar /><ReferralPage /></>
    if (page === 'join') return <JoinPage />
    if (page === 'earn') return <><Navbar /><JoinPage /></>
    if (page === 'worker-profile') return <><Navbar /><WorkerProfile workerId={(window as any).__workerProfileId || ''} /></>

    if (profile.role === 'admin') {
      if (page === 'landing') return <><Navbar /><LandingPage /></>
      return <><Navbar /><AdminPanel /></>
    }

    if (profile.role === 'worker') {
      if (!workerExists) return <><Navbar /><WorkerRegister onSuccess={async () => { await refreshProfile(); setWorkerExists(true); setWorkerApproved(false) }} /></>
      if (!workerApproved) return (
        <div className="min-h-screen bg-slate-50 pt-14 flex items-center justify-center px-4">
          <div className="max-w-sm text-center bg-white border border-slate-200 rounded-2xl p-10 shadow-sm">
            <div className="text-5xl mb-5">⏳</div>
            <h2 className="text-xl font-bold text-slate-900 mb-3">طلبك قيد المراجعة</h2>
            <p className="text-slate-400 text-sm leading-relaxed mb-6">فريق آمرني سيراجع بياناتك ويوافق عليك قريباً.</p>
            <div className="flex flex-col gap-2">
              <button onClick={async () => {
                setChecking(true)
                const { data } = await supabase.from('worker_profiles').select('is_approved').eq('user_id', user.id).single()
                setWorkerApproved(data?.is_approved || false)
                if (data?.is_approved) navigate('worker')
                setChecking(false)
              }} className="text-sm text-primary-500 border border-primary-200 px-5 py-2 rounded-xl hover:bg-primary-50 transition-colors">
                {checking ? 'جاري التحقق...' : 'تحقق من الحالة'}
              </button>
              <button onClick={() => navigate('landing')}
                className="text-sm text-slate-500 border border-slate-200 px-5 py-2 rounded-xl hover:bg-slate-50 transition-colors">
                الصفحة الرئيسية
              </button>
            </div>
          </div>
        </div>
      )
      if (page === 'dashboard') return <><Navbar /><UserDashboard /></>
      return <><Navbar /><WorkerDashboard /></>
    }

    if (page === 'landing') return <><Navbar /><LandingPage />{authOpen && <AuthModal />}</>
    if (page === 'dashboard') return <><Navbar /><UserDashboard />{authOpen && <AuthModal />}</>
    return <><Navbar /><NotFoundPage /></>
  }

  return <ErrorBoundary><ToastProvider><React.Suspense fallback={<PageLoader />}>{renderContent()}</React.Suspense></ToastProvider></ErrorBoundary>
}
