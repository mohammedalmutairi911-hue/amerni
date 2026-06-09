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
import { AdminPanel } from './pages/AdminPanel'
import { SupportPage } from './pages/SupportPage'
import { BrowseWorkers } from './pages/BrowseWorkers'
import { BountiesPage } from './pages/BountiesPage'
import { ReferralPage } from './pages/ReferralPage'
import { WorkerProfile } from './pages/WorkerProfile'
import { InstallPrompt } from './components/InstallPrompt'
import { PageLoader } from './components/PageLoader'
import { NotFoundPage } from './pages/NotFoundPage'

// Handle worker profile URL param
const urlParams = new URLSearchParams(window.location.search)
const workerParam = urlParams.get('worker')
if (workerParam) {
  ;(window as any).__workerProfileId = workerParam
}

export default function App() {
  const { user, profile, loading, refreshProfile } = useAuth()
  const { page, navigate, authOpen } = useApp()
  const [workerApproved, setWorkerApproved] = useState<boolean | null>(null)
  const [workerExists, setWorkerExists] = useState<boolean | null>(null)
  const [checking, setChecking] = useState(false)

  useEffect(() => {
    if (!user || !profile) { setWorkerApproved(null); setWorkerExists(null); return }
    
    // أدمن — روح للوحة الإدارة تلقائياً
    if (profile.role === 'admin' && page === 'landing') {
      navigate('admin')
      return
    }
    
    // عامل — تحقق من البروفايل
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

  if (!user || !profile) return <><Navbar /><LandingPage />{authOpen && <AuthModal />}<InstallPrompt /></>

  // صفحات مشتركة
  if (page === 'support') return <><Navbar /><SupportPage /></>
  if (page === 'browse') return <><Navbar /><BrowseWorkers /></>
  if (page === 'bounties') return <><Navbar /><BountiesPage /></>
  if (page === 'referral') return <><Navbar /><ReferralPage /></>
  if (page === 'worker-profile') return <><Navbar /><WorkerProfile workerId={(window as any).__workerProfileId || ''} /></>
  if (page === 'worker-profile') return <><Navbar /><WorkerProfile workerId={''} /></>

  // أدمن
  if (profile.role === 'admin') {
    if (page === 'landing') return <><Navbar /><LandingPage /></>
    if (page === 'dashboard') return <><Navbar /><UserDashboard /></>
    return <><Navbar /><AdminPanel /></>
  }

  // عامل
  if (profile.role === 'worker') {
    if (!workerExists) return (
      <><Navbar /><WorkerRegister onSuccess={async () => {
        await refreshProfile()
        setWorkerExists(true)
        setWorkerApproved(false)
      }} /></>
    )
    if (!workerApproved) return (
      <div className="min-h-screen bg-[#080808] pt-14 flex items-center justify-center px-4">
        <div className="max-w-sm text-center bg-[#0d0d0d] border border-zinc-800 rounded-2xl p-10">
          <div className="text-5xl mb-5">⏳</div>
          <h2 className="text-xl font-bold mb-3">طلبك قيد المراجعة</h2>
          <p className="text-zinc-500 text-sm leading-relaxed mb-6">فريق أمرني راح يراجع بياناتك ويوافق عليك قريباً.</p>
          <button onClick={async () => {
            setChecking(true)
            const { data } = await supabase.from('worker_profiles').select('is_approved').eq('user_id', user.id).single()
            setWorkerApproved(data?.is_approved || false)
            if (data?.is_approved) navigate('worker')
            setChecking(false)
          }} className="text-sm text-amber-400 border border-amber-500/30 px-5 py-2 rounded-xl hover:bg-amber-500/10 transition-colors">
            {checking ? 'جاري التحقق...' : 'تحقق من الحالة'}
          </button>
        </div>
      </div>
    )
    if (page === 'dashboard') return <><Navbar /><UserDashboard /></>
    return <><Navbar /><WorkerDashboard /></>
  }

  // عميل
  if (page === 'landing') return <><Navbar /><LandingPage />{authOpen && <AuthModal />}</>
  return <><Navbar /><UserDashboard />{authOpen && <AuthModal />}</>
}
