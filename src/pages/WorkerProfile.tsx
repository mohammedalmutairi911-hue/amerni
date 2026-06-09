import { useState, useEffect } from 'react'
import { Star, MapPin, CheckCircle, Copy, Share2, MessageSquare } from 'lucide-react'
import { supabase, getAvatar } from '../lib/supabase'
import { useApp } from '../contexts/AppContext'
import { WorkerProfile as WP } from '../types'

interface Props { workerId: string }

export function WorkerProfilePage({ workerId }: Props) {
  const { navigate } = useApp()
  const [worker, setWorker] = useState<WP | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    supabase.from('worker_profiles').select('*').eq('user_id', workerId).single()
      .then(({ data }) => { setWorker(data); setLoading(false) })
  }, [workerId])

  const shareLink = `${window.location.origin}/worker/${workerId}`

  const copyLink = () => {
    navigator.clipboard.writeText(shareLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) return (
    <div className="min-h-screen bg-[#080808] pt-14 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (!worker) return (
    <div className="min-h-screen bg-[#080808] pt-14 flex items-center justify-center">
      <p className="text-zinc-500">الصفحة غير موجودة</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#080808] pt-14">
      <div className="max-w-lg mx-auto px-4 py-8">
        {/* Header */}
        <div className="bg-[#0d0d0d] border border-zinc-800 rounded-2xl p-6 mb-4">
          <div className="flex items-start gap-4 mb-5">
            <div className="relative">
              <img src={getAvatar(worker.full_name)} className="w-20 h-20 rounded-2xl" alt="" />
              <div className={`absolute -bottom-1 -left-1 w-4 h-4 rounded-full border-2 border-[#0d0d0d] ${worker.is_online ? 'bg-emerald-500' : 'bg-zinc-600'}`} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-xl font-bold">{worker.full_name}</h1>
                {worker.id_verified && <CheckCircle size={16} className="text-emerald-500" />}
              </div>
              <p className="text-zinc-500 text-sm flex items-center gap-1"><MapPin size={12} /> {worker.city}</p>
              <div className="flex items-center gap-2 mt-2">
                <div className="flex items-center gap-0.5">
                  {[1,2,3,4,5].map(s => <Star key={s} size={14} className={s <= Math.round(worker.rating || 0) ? 'text-amber-400 fill-amber-400' : 'text-zinc-700'} />)}
                </div>
                <span className="text-sm text-white">{worker.rating ? worker.rating.toFixed(1) : '—'}</span>
                <span className="text-xs text-zinc-500">({worker.total_tasks || 0} طلب)</span>
              </div>
            </div>
          </div>

          {worker.bio && <p className="text-zinc-400 text-sm leading-relaxed border-t border-zinc-800 pt-4 mb-4">{worker.bio}</p>}

          <div className="flex flex-wrap gap-2">
            {(worker.skills || []).map(s => (
              <span key={s} className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs px-3 py-1.5 rounded-full">{s}</span>
            ))}
          </div>
        </div>

        {/* Schedule */}
        {worker.schedule && Object.values(worker.schedule).some((d: any) => d.active) && (
          <div className="bg-[#0d0d0d] border border-zinc-800 rounded-2xl p-5 mb-4">
            <h3 className="font-semibold mb-3">أوقات التوفر</h3>
            <div className="space-y-2">
              {Object.entries(worker.schedule).filter(([, s]: [string, any]) => s.active).map(([day, s]: [string, any]) => (
                <div key={day} className="flex items-center justify-between text-sm">
                  <span className="text-zinc-400">{day}</span>
                  <span className="text-amber-400 text-xs">{s.from} — {s.to}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-3">
          <button onClick={() => navigate('dashboard')}
            className="w-full bg-amber-500 hover:bg-amber-400 text-black font-bold py-4 rounded-2xl text-base transition-colors flex items-center justify-center gap-2">
            <MessageSquare size={18} /> اطلب من {worker.full_name.split(' ')[0]}
          </button>
          <div className="flex gap-3">
            <button onClick={copyLink}
              className="flex-1 flex items-center justify-center gap-2 border border-zinc-700 text-zinc-300 hover:border-zinc-600 py-3 rounded-xl text-sm transition-colors">
              <Copy size={15} /> {copied ? 'تم النسخ!' : 'نسخ الرابط'}
            </button>
            <button onClick={() => navigator.share?.({ title: worker.full_name, url: shareLink }) || copyLink()}
              className="flex-1 flex items-center justify-center gap-2 border border-zinc-700 text-zinc-300 hover:border-zinc-600 py-3 rounded-xl text-sm transition-colors">
              <Share2 size={15} /> مشاركة
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
