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

export default function App() {
  const { user, profile, loading, refreshProfile } = useAuth()
  const { page, authOpen, navigate } = useApp()
  const [workerReady, setWorkerReady] = useState<boolean | null>(null)
  const [checking, setChecking] = useState(false)

  useEffect(() => {
    if (!user || !profile) { setWorkerReady(null); return }
    if (profile.role !== 'worker') { setWorkerReady(true); return }
    setChecking(true)
    supabase.from('worker_profiles').select('id').eq('user_id', user.id).maybeSingle()
      .then(({ data }) => { setWorkerReady(!!data); setChecking(false) })
      .catch(() => { setWorkerReady(false); setChecking(false) })
  }, [user?.id, profile?.role])

  // Loading spinner
  if (loading || (profile?.role === 'worker' && checking)) {
    return (
      <div className="min-h-screen bg-[#080808] flex items-center justify-center">
        <div className="text-center">
          <div className="text-3xl font-black text-amber-400 mb-4">أمرني</div>
          <div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      </div>
    )
  }

  // Not logged in
  if (!user || !profile) {
    return (
      <>
        <Navbar />
        <LandingPage />
        {authOpen && <AuthModal />}
      </>
    )
  }

  // Support page - any role
  if (page === 'support') {
    return <><Navbar /><SupportPage /></>
  }

  // Admin
  if (profile.role === 'admin') {
    if (page === 'admin' || page === 'landing') return <><Navbar /><AdminPanel /></>
    return <><Navbar /><UserDashboard />{authOpen && <AuthModal />}</>
  }

  // Worker - needs registration first
  if (profile.role === 'worker') {
    if (!workerReady) {
      return (
        <>
          <Navbar />
          <WorkerRegister onSuccess={async () => {
            await refreshProfile()
            setWorkerReady(true)
            navigate('worker')
          }} />
        </>
      )
    }
    if (page === 'dashboard') return <><Navbar /><UserDashboard /></>
    return <><Navbar /><WorkerDashboard /></>
  }

  // Client
  return (
    <>
      <Navbar />
      <UserDashboard />
      {authOpen && <AuthModal />}
    </>
  )
}
