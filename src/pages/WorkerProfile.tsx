import { useState, useEffect } from 'react'
import { Star, MapPin, CheckCircle, MessageSquare, ArrowLeft } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useApp } from '../contexts/AppContext'
import { getAvatar } from '../lib/supabase'

interface Props { workerId: string }

export function WorkerProfile({ workerId }: Props) {
  const { navigate } = useApp()
  const [worker, setWorker] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('worker_profiles').select('*').eq('user_id', workerId).single()
      .then(({ data }) => { setWorker(data); setLoading(false) })
  }, [workerId])

  if (loading) return (
    <div className="min-h-screen bg-gray-50 pt-14 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-primary-400 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (!worker) return (
    <div className="min-h-screen bg-gray-50 pt-14 flex items-center justify-center">
      <div className="text-center">
        <p className="text-gray-400 mb-4">الصفحة غير موجودة</p>
        <button onClick={() => navigate('browse')} className="text-primary-400">← تصفح العمال</button>
      </div>
    </div>
  )

  const shareUrl = `${window.location.origin}?worker=${workerId}`

  return (
    <div className="min-h-screen bg-gray-50 pt-14">
      <div className="max-w-lg mx-auto px-4 py-8">
        <button onClick={() => navigate('browse')} className="flex items-center gap-1.5 text-gray-500 hover:text-gray-900 text-sm mb-6 transition-colors">
          <ArrowLeft size={14} /> رجوع
        </button>

        {/* Header */}
        <div className="bg-primary-50 border border-primary-500/20 rounded-2xl p-6 mb-4">
          <div className="flex items-start gap-4 mb-4">
            <img src={getAvatar(worker.full_name)} className="w-20 h-20 rounded-2xl" alt="" />
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-xl font-black text-gray-900">{worker.full_name}</h1>
                {worker.id_verified && <CheckCircle size={16} className="text-secondary-500" />}
              </div>
              <p className="text-gray-400 text-sm flex items-center gap-1 mb-2">
                <MapPin size={12} /> {worker.city} · {worker.nationality}
              </p>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-0.5">
                  {[1,2,3,4,5].map(s => <Star key={s} size={14} className={s <= Math.round(worker.rating || 0) ? 'text-primary-400 fill-primary-400' : 'text-zinc-700'} />)}
                </div>
                <span className="text-sm text-gray-900 font-bold">{worker.rating ? worker.rating.toFixed(1) : '—'}</span>
                <span className="text-xs text-gray-400">({worker.total_tasks || 0} طلب مكتمل)</span>
              </div>
            </div>
            <div className={`w-3 h-3 rounded-full flex-shrink-0 mt-1 ${worker.is_online ? 'bg-secondary-500' : 'bg-gray-300'}`} />
          </div>
          {worker.bio && <p className="text-sm text-gray-500 leading-relaxed">{worker.bio}</p>}
        </div>

        {/* Skills */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5 mb-4">
          <h3 className="font-semibold mb-3 text-sm text-gray-500">المهارات</h3>
          <div className="flex flex-wrap gap-2">
            {(worker.skills || []).map((s: string) => (
              <span key={s} className="bg-primary-500/10 text-primary-400 border border-primary-500/20 text-xs px-3 py-1.5 rounded-full">{s}</span>
            ))}
          </div>
        </div>

        {/* Schedule */}
        {worker.schedule && Object.values(worker.schedule).some((s: any) => s.active) && (
          <div className="bg-white border border-gray-200 rounded-2xl p-5 mb-6">
            <h3 className="font-semibold mb-3 text-sm text-gray-500">أوقات التوفر</h3>
            <div className="space-y-1.5">
              {Object.entries(worker.schedule).filter(([,s]: [string, any]) => s.active).map(([day, s]: [string, any]) => (
                <div key={day} className="flex justify-between text-sm">
                  <span className="text-gray-500">{day}</span>
                  <span className="text-primary-400 text-xs">{s.from} — {s.to}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CTA */}
        <button onClick={() => navigate('dashboard')}
          className="w-full bg-primary-500 text-gray-900 font-bold py-4 rounded-2xl text-base hover:bg-primary-400 transition-colors flex items-center justify-center gap-2 mb-3">
          <MessageSquare size={18} /> اطلب من {worker.full_name.split(' ')[0]}
        </button>

        <button onClick={() => navigator.share ? navigator.share({ title: worker.full_name, url: shareUrl }) : navigator.clipboard.writeText(shareUrl)}
          className="w-full border border-gray-300 text-gray-500 font-medium py-3 rounded-xl text-sm hover:border-gray-300 transition-colors">
          🔗 شارك البروفايل
        </button>
      </div>
    </div>
  )
}
