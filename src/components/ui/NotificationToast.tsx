import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useApp } from '../../contexts/AppContext'
import { getHomePage } from '../../lib/homePage'

interface Notif { id: string; title: string; body: string }

// بانر منبثق أعلى الصفحة عند وصول إشعار جديد (رد في المحادثة، قبول طلب، طلب جديد...)
// يُركَّب مرة واحدة فقط في App.
export function NotificationToast() {
  const { user, profile } = useAuth()
  const { navigate } = useApp()
  const [item, setItem] = useState<Notif | null>(null)
  const timer = useRef<number | undefined>(undefined)

  useEffect(() => {
    if (!user) return
    const ch = supabase.channel(`toast_${user.id}_${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        (payload) => {
          const n = payload.new as Notif
          setItem(n)
          try { navigator.vibrate?.(120) } catch { /* ignore */ }
          window.clearTimeout(timer.current)
          timer.current = window.setTimeout(() => setItem(null), 7000)
        })
      .subscribe()
    return () => { window.clearTimeout(timer.current); supabase.removeChannel(ch) }
  }, [user?.id])

  if (!item) return null

  const open = async () => {
    const id = item.id
    setItem(null)
    try { await supabase.from('notifications').update({ read: true }).eq('id', id) } catch { /* ignore */ }
    navigate(getHomePage(profile as any))
  }

  return (
    <div className="fixed inset-x-0 z-[100] px-3 pointer-events-none" style={{ top: 'calc(env(safe-area-inset-top) + 8px)' }} dir="rtl">
      <div role="alert" className="pointer-events-auto max-w-md mx-auto bg-slate-900 text-white rounded-2xl shadow-2xl flex items-start gap-3 p-3 animate-fade-in">
        <button onClick={open} className="flex-1 min-w-0 text-right">
          <p className="text-sm font-bold truncate">{item.title}</p>
          {item.body && <p className="text-xs text-white/70 mt-0.5 line-clamp-2 break-words">{item.body}</p>}
        </button>
        <button onClick={() => setItem(null)} aria-label="إغلاق" className="text-white/60 p-1 flex-shrink-0"><X size={16} /></button>
      </div>
    </div>
  )
}
