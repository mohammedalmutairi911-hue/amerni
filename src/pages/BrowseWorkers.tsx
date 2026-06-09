import { useState, useEffect } from 'react'
import { Search, Star, MapPin, CheckCircle, ArrowLeft, MessageSquare, Filter } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useApp } from '../contexts/AppContext'
import { useAuth } from '../contexts/AuthContext'
import { WorkerProfile } from '../types'
import { getAvatar } from '../lib/supabase'

const SKILLS = ['الكل', 'توصيل ومشاوير', 'تحقق ومتابعة', 'تصوير ومحتوى', 'مساعدة إدارية', 'تسوق', 'تعليم وشرح', 'صيانة وتركيب']
const CITIES = ['الكل', 'الرياض', 'جدة', 'مكة', 'المدينة', 'الدمام', 'الخبر', 'تبوك', 'أبها']

export function BrowseWorkers() {
  const { navigate } = useApp()
  const { user } = useAuth()
  const [workers, setWorkers] = useState<WorkerProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [skillFilter, setSkillFilter] = useState('الكل')
  const [cityFilter, setCityFilter] = useState('الكل')
  const [selectedWorker, setSelectedWorker] = useState<WorkerProfile | null>(null)

  useEffect(() => { fetchWorkers() }, [])

  const fetchWorkers = async () => {
    const { data } = await supabase.from('worker_profiles').select('*').eq('is_approved', true).order('rating', { ascending: false })
    setWorkers(data || [])
    setLoading(false)
  }

  const filtered = workers.filter(w => {
    const matchSearch = !search || w.full_name.includes(search) || (w.skills || []).some(s => s.includes(search))
    const matchSkill = skillFilter === 'الكل' || (w.skills || []).includes(skillFilter)
    const matchCity = cityFilter === 'الكل' || w.city === cityFilter
    return matchSearch && matchSkill && matchCity
  })

  // Worker profile modal
  if (selectedWorker) return (
    <div className="min-h-screen bg-[#080808] pt-14 px-4 py-8">
      <div className="max-w-lg mx-auto">
        <button onClick={() => setSelectedWorker(null)} className="flex items-center gap-1.5 text-zinc-400 hover:text-white text-sm mb-6 transition-colors">
          <ArrowLeft size={14} /> رجوع للعمال
        </button>

        {/* Profile header */}
        <div className="bg-[#0d0d0d] border border-zinc-800 rounded-2xl p-6 mb-4">
          <div className="flex items-start gap-4 mb-5">
            <img src={getAvatar(selectedWorker.full_name)} className="w-16 h-16 rounded-2xl" alt="" />
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h2 className="font-bold text-xl">{selectedWorker.full_name}</h2>
                {selectedWorker.id_verified && <span className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">✓ موثق</span>}
              </div>
              <p className="text-zinc-500 text-sm flex items-center gap-1"><MapPin size={12} /> {selectedWorker.city}</p>
              <div className="flex items-center gap-3 mt-2">
                <div className="flex items-center gap-1">
                  {[1,2,3,4,5].map(s => <Star key={s} size={13} className={s <= Math.round(selectedWorker.rating || 0) ? 'text-amber-400 fill-amber-400' : 'text-zinc-700'} />)}
                  <span className="text-sm text-white mr-1">{selectedWorker.rating ? selectedWorker.rating.toFixed(1) : '—'}</span>
                </div>
                <span className="text-xs text-zinc-500">{selectedWorker.total_tasks || 0} طلب مكتمل</span>
              </div>
            </div>
            <div className={`w-3 h-3 rounded-full flex-shrink-0 mt-1 ${selectedWorker.is_online ? 'bg-emerald-500' : 'bg-zinc-600'}`} />
          </div>

          {selectedWorker.bio && (
            <div className="border-t border-zinc-800 pt-4 mb-4">
              <p className="text-sm text-zinc-400 leading-relaxed">{selectedWorker.bio}</p>
            </div>
          )}

          {/* Skills */}
          <div>
            <p className="text-xs text-zinc-500 mb-2 font-medium">المهارات</p>
            <div className="flex flex-wrap gap-2">
              {(selectedWorker.skills || []).map(s => (
                <span key={s} className="text-xs bg-amber-500/10 text-amber-400 border border-amber-500/20 px-3 py-1 rounded-full">{s}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Schedule */}
        {selectedWorker.schedule && Object.keys(selectedWorker.schedule).length > 0 && (
          <div className="bg-[#0d0d0d] border border-zinc-800 rounded-2xl p-5 mb-4">
            <p className="text-sm font-semibold mb-3">أوقات التوفر</p>
            <div className="space-y-1.5">
              {Object.entries(selectedWorker.schedule).filter(([,s]: [string, any]) => s.active).map(([day, s]: [string, any]) => (
                <div key={day} className="flex items-center justify-between text-sm">
                  <span className="text-zinc-400">{day}</span>
                  <span className="text-amber-400 text-xs">{s.from} — {s.to}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CTA */}
        <button onClick={() => { if (user) navigate('dashboard'); else navigate('landing') }}
          className="w-full bg-amber-500 text-black font-bold py-4 rounded-2xl text-base hover:bg-amber-400 transition-colors flex items-center justify-center gap-2">
          <MessageSquare size={18} /> اطلب من {selectedWorker.full_name.split(' ')[0]}
        </button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#080808] pt-14">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-black mb-2">تصفح العمال</h1>
          <p className="text-zinc-500">اختار الشخص المناسب مباشرة</p>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col gap-3 mb-6">
          <div className="relative">
            <Search size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="ابحث باسم العامل أو المهارة..."
              className="w-full bg-[#111] border border-zinc-800 rounded-xl pr-10 pl-4 py-3 text-sm outline-none focus:border-amber-500/50 transition-colors" />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            <div className="flex items-center gap-1 flex-shrink-0">
              <Filter size={13} className="text-zinc-600" />
            </div>
            {SKILLS.map(s => (
              <button key={s} onClick={() => setSkillFilter(s)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all flex-shrink-0 ${skillFilter === s ? 'bg-amber-500 text-black' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}>
                {s}
              </button>
            ))}
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {CITIES.map(c => (
              <button key={c} onClick={() => setCityFilter(c)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all flex-shrink-0 ${cityFilter === c ? 'bg-zinc-600 text-white' : 'bg-zinc-900 text-zinc-500 hover:bg-zinc-800'}`}>
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Workers grid */}
        {loading ? (
          <div className="text-center py-20 text-zinc-600">جاري التحميل...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-zinc-600 mb-3">ما في عمال بهذا الفلتر</p>
            <button onClick={() => { setSkillFilter('الكل'); setCityFilter('الكل'); setSearch('') }} className="text-amber-400 text-sm">إزالة الفلاتر</button>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(w => (
              <button key={w.id} onClick={() => setSelectedWorker(w)}
                className="bg-[#0d0d0d] border border-zinc-800 hover:border-amber-500/30 rounded-2xl p-5 text-right transition-all">
                <div className="flex items-start gap-3 mb-4">
                  <div className="relative flex-shrink-0">
                    <img src={getAvatar(w.full_name)} className="w-12 h-12 rounded-xl" alt="" />
                    <div className={`absolute -bottom-1 -left-1 w-3.5 h-3.5 rounded-full border-2 border-[#0d0d0d] ${w.is_online ? 'bg-emerald-500' : 'bg-zinc-600'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <p className="font-semibold text-sm truncate">{w.full_name}</p>
                      {w.id_verified && <CheckCircle size={12} className="text-emerald-500 flex-shrink-0" />}
                      {(w.total_tasks || 0) >= 10 && <span className="text-[10px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded-full">⭐ محترف</span>}
                      {(w.total_tasks || 0) >= 50 && <span className="text-[10px] bg-purple-500/20 text-purple-400 px-1.5 py-0.5 rounded-full">🏆 خبير</span>}
                    </div>
                    <p className="text-xs text-zinc-500 flex items-center gap-1"><MapPin size={10} /> {w.city}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 mb-3">
                  <div className="flex items-center gap-0.5">
                    {[1,2,3,4,5].map(s => <Star key={s} size={11} className={s <= Math.round(w.rating || 0) ? 'text-amber-400 fill-amber-400' : 'text-zinc-700'} />)}
                  </div>
                  <span className="text-xs text-zinc-400">{w.rating ? w.rating.toFixed(1) : '—'}</span>
                  <span className="text-xs text-zinc-600">({w.total_tasks || 0})</span>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {(w.skills || []).slice(0, 2).map(s => (
                    <span key={s} className="text-xs bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full">{s}</span>
                  ))}
                  {(w.skills || []).length > 2 && <span className="text-xs text-zinc-600">+{(w.skills || []).length - 2}</span>}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
