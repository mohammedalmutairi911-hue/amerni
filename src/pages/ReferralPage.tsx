import { useState, useEffect } from 'react'
import { Copy, CheckCircle, Users, DollarSign, Share2, Gift, TrendingUp } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { getAvatar } from '../lib/supabase'

export function ReferralPage() {
  const { user, profile } = useAuth()
  const [copied, setCopied] = useState(false)
  const [referrals, setReferrals] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ total: 0, earned: 0, pending: 0 })

  const referralLink = `${window.location.origin}?ref=${user?.id?.slice(0, 8)}`

  useEffect(() => {
    if (user) fetchReferrals()
  }, [user?.id])

  const fetchReferrals = async () => {
    // جيب الطلبات اللي جاءت من رابط الإحالة
    const { data } = await supabase.from('tasks')
      .select('*, profiles(full_name)')
      .eq('referred_by', user!.id)
      .order('created_at', { ascending: false })
    
    const list = data || []
    const earned = list.filter(t => t.status === 'completed').reduce((s: number, t: any) => s + ((t.price_final || t.price_suggested || 0) * 0.05), 0)
    const pending = list.filter(t => t.status === 'in_progress').reduce((s: number, t: any) => s + ((t.price_final || t.price_suggested || 0) * 0.05), 0)
    
    setReferrals(list)
    setStats({ total: list.length, earned, pending })
    setLoading(false)
  }

  const copyLink = () => {
    navigator.clipboard.writeText(referralLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  const shareLink = () => {
    if (navigator.share) {
      navigator.share({ title: 'أمرني', text: 'انضم لأمرني واطلب أي خدمة!', url: referralLink })
    } else copyLink()
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-14">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="w-16 h-16 rounded-2xl bg-primary-500/10 border border-primary-500/20 flex items-center justify-center mx-auto mb-4">
            <Gift size={28} className="text-primary-500" />
          </div>
          <h1 className="text-3xl font-black mb-2">نظام الإحالة</h1>
          <p className="text-gray-400">شارك رابطك وأكسب <span className="text-primary-400 font-bold">5%</span> من قيمة كل طلب يأتي عن طريقك</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          {[
            { label: 'إجمالي الإحالات', value: stats.total, icon: Users, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
            { label: 'مكتسب', value: `${stats.earned.toFixed(1)} ر`, icon: DollarSign, color: 'text-secondary-400', bg: 'bg-secondary-500/10 border-secondary-500/20' },
            { label: 'قيد التنفيذ', value: `${stats.pending.toFixed(1)} ر`, icon: TrendingUp, color: 'text-primary-400', bg: 'bg-primary-500/10 border-primary-500/20' },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className={`border rounded-2xl p-4 text-center ${bg}`}>
              <Icon size={18} className={`${color} mx-auto mb-2`} />
              <div className={`text-xl font-black ${color}`}>{value}</div>
              <div className="text-xs text-gray-400 mt-1">{label}</div>
            </div>
          ))}
        </div>

        {/* Referral link */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-6">
          <p className="text-sm font-semibold mb-3">رابط الإحالة الخاص بك</p>
          <div className="flex items-center gap-2 bg-gray-100 border border-gray-300 rounded-xl px-4 py-3 mb-4">
            <span className="flex-1 text-sm text-gray-500 truncate">{referralLink}</span>
            <button onClick={copyLink} className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-all flex-shrink-0 ${copied ? 'bg-secondary-500/20 text-secondary-400' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
              {copied ? <><CheckCircle size={13} /> نُسخ!</> : <><Copy size={13} /> نسخ</>}
            </button>
          </div>
          <div className="flex gap-2">
            <button onClick={shareLink}
              className="flex-1 flex items-center justify-center gap-2 bg-primary-500 hover:bg-primary-400 text-gray-900 font-bold py-3 rounded-xl text-sm transition-colors">
              <Share2 size={16} /> شارك الرابط
            </button>
            <button onClick={copyLink}
              className="flex items-center justify-center gap-2 border border-gray-300 text-gray-700 hover:border-gray-300 px-5 py-3 rounded-xl text-sm transition-colors">
              <Copy size={16} />
            </button>
          </div>
        </div>

        {/* How it works */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-6">
          <h3 className="font-semibold mb-4">كيف يشتغل نظام الإحالة؟</h3>
          <div className="space-y-4">
            {[
              { n: '١', text: 'شارك رابطك مع أصدقائك وعائلتك' },
              { n: '٢', text: 'لما يسجلون عن طريق رابطك وينشرون طلب' },
              { n: '٣', text: 'لما الطلب يكتمل — تكسب 5% من قيمته تلقائياً' },
              { n: '٤', text: 'ما في حد أقصى — كلما أحلت أكثر كسبت أكثر' },
            ].map(({ n, text }) => (
              <div key={n} className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-primary-500 flex items-center justify-center flex-shrink-0 text-gray-900 text-xs font-black">{n}</div>
                <p className="text-sm text-gray-700">{text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Referrals list */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6">
          <h3 className="font-semibold mb-4">إحالاتك ({referrals.length})</h3>
          {loading ? <p className="text-gray-400 text-sm text-center py-4">جاري التحميل...</p>
          : referrals.length === 0 ? (
            <div className="text-center py-8">
              <Users size={28} className="text-zinc-700 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">ما أحلت أحد بعد</p>
              <p className="text-zinc-700 text-xs mt-1">شارك رابطك وابدأ الكسب</p>
            </div>
          ) : referrals.map(r => (
            <div key={r.id} className="flex items-center justify-between py-3 border-b border-gray-200 last:border-0">
              <div className="flex items-center gap-3">
                <img src={getAvatar(r.profiles?.full_name || 'م')} className="w-8 h-8 rounded-lg" alt="" />
                <div>
                  <p className="text-sm font-medium">{r.title}</p>
                  <p className="text-xs text-gray-400">{r.profiles?.full_name}</p>
                </div>
              </div>
              <div className="text-left">
                <p className="text-sm font-bold text-primary-400">
                  {((r.price_final || r.price_suggested || 0) * 0.05).toFixed(1)} ر
                </p>
                <p className="text-xs text-gray-400">{r.status === 'completed' ? '✅ مكتسب' : '⏳ معلق'}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
