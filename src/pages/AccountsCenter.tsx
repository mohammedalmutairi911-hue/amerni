import { useState, useEffect } from 'react'
import { supabase, getAvatar } from '../lib/supabase'
import { useApp } from '../contexts/AppContext'
import {
  Loader2, Search, X, Users, Building2, Shield, CheckCircle, Clock,
  Mail, Phone, MapPin, Calendar, LogIn, BadgeCheck, FileText, Star, RefreshCw,
} from 'lucide-react'

// ملاحظة: كل البيانات تأتي من دوال أدمن آمنة (SECURITY DEFINER + فحص أدمن) في Supabase.
interface Account {
  id: string
  full_name: string | null
  email: string | null
  phone: string | null
  city: string | null
  platform: 'individuals' | 'enterprises'
  role: string
  account_type: string
  created_at: string
  last_sign_in_at: string | null
  email_confirmed: boolean
  avatar_url: string | null
  has_worker: boolean
  has_company: boolean
  has_provider: boolean
  worker_approved: boolean
  provider_approved: boolean
  id_verified: boolean
  phone_verified: boolean
  verification_status: string
  profile_complete: boolean
  orders_total: number
  orders_completed: number
}

const fmtDate = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString('ar-SA', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'
const fmtDateTime = (d?: string | null) =>
  d ? new Date(d).toLocaleString('ar-SA', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'لم يسجّل دخول'

const shortId = (id: string) => id.slice(0, 8)

export function AccountsCenter({ view }: { view: 'accounts' | 'diagnostics' }) {
  const { navigate } = useApp()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [diag, setDiag] = useState<Record<string, number> | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const [q, setQ] = useState('')
  const [platformFilter, setPlatformFilter] = useState<'all' | 'individuals' | 'enterprises'>('all')
  const [selected, setSelected] = useState<string | null>(null)
  const [detail, setDetail] = useState<any>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const load = async () => {
    setErr(null)
    try {
      if (view === 'diagnostics') {
        const { data, error } = await supabase.rpc('admin_platform_diagnostics')
        if (error) throw error
        setDiag(data as any)
      } else {
        const { data, error } = await supabase.rpc('admin_list_accounts')
        if (error) throw error
        setAccounts((data as Account[]) || [])
      }
    } catch (e: any) {
      setErr(e?.message || 'تعذّر تحميل البيانات')
    } finally {
      setLoading(false); setRefreshing(false)
    }
  }

  useEffect(() => { setLoading(true); load() /* eslint-disable-next-line */ }, [view])

  // تحميل تفاصيل الحساب عند اختياره
  useEffect(() => {
    if (!selected) { setDetail(null); return }
    setDetailLoading(true)
    supabase.rpc('admin_account_detail', { p_id: selected })
      .then(({ data, error }) => { if (!error) setDetail(data); setDetailLoading(false) })
    // منع تمرير الخلفية أثناء فتح الـ drawer (جوال فقط)
    if (window.matchMedia('(max-width: 1023px)').matches) {
      const prev = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = prev }
    }
  }, [selected])

  const filtered = accounts.filter(a => {
    if (platformFilter !== 'all' && a.platform !== platformFilter) return false
    if (!q.trim()) return true
    const s = q.trim().toLowerCase()
    return [a.full_name, a.email, a.phone, a.id].some(v => (v || '').toLowerCase().includes(s))
  })

  // ─────────────────────────── DIAGNOSTICS VIEW ───────────────────────────
  if (view === 'diagnostics') {
    const cards: { label: string; key: string; hint?: string; warn?: boolean }[] = [
      { label: 'حسابات auth.users', key: 'auth_users' },
      { label: 'Profiles', key: 'profiles' },
      { label: 'حسابات بلا Profile', key: 'orphan_auth', hint: 'يجب أن يكون صفراً', warn: true },
      { label: 'حسابات أفراد', key: 'individuals' },
      { label: 'حسابات منشآت', key: 'enterprises' },
      { label: 'طالبو خدمة (client)', key: 'clients' },
      { label: 'مقدمو خدمة (worker)', key: 'worker_profiles' },
      { label: 'مقدمون بانتظار الاعتماد', key: 'workers_pending', warn: true },
      { label: 'مزودو المنشآت', key: 'providers' },
      { label: 'مزودون بانتظار الاعتماد', key: 'providers_pending', warn: true },
      { label: 'شركات (company_profiles)', key: 'companies' },
      { label: 'ملفات غير مكتملة', key: 'incomplete', warn: true },
      { label: 'بريد غير مؤكّد', key: 'unverified_email', warn: true },
      { label: 'إجمالي طلبات الأفراد', key: 'tasks' },
      { label: 'إجمالي طلبات المنشآت', key: 'leads' },
    ]
    return (
      <div className="space-y-6 animate-fade-in" dir="rtl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-2xl font-black text-slate-900">تشخيص المنصة</h2>
            <p className="text-slate-400 text-sm mt-0.5">أرقام فعلية من قاعدة البيانات لاكتشاف أي خلل في الحسابات والتسجيل.</p>
          </div>
          <button onClick={() => { setRefreshing(true); load() }}
            className="flex items-center gap-2 bg-white border border-slate-200 text-slate-600 font-medium px-4 py-2 rounded-xl text-sm hover:border-slate-300 transition-colors flex-shrink-0">
            <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} /> تحديث
          </button>
        </div>

        {loading ? (
          <div className="py-20 flex justify-center"><Loader2 className="animate-spin text-primary-500" size={28} /></div>
        ) : err ? (
          <div className="bg-red-50 border border-red-200 text-red-600 rounded-2xl p-4 text-sm">{err}</div>
        ) : (
          <>
            {diag && diag.orphan_auth === 0 && (
              <div className="bg-green-50 border border-green-200 text-green-700 rounded-2xl p-4 text-sm flex items-center gap-2">
                <CheckCircle size={16} /> مسار التسجيل سليم: كل حساب مسجّل له Profile مقابل (لا يوجد فقدان بيانات).
              </div>
            )}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {cards.map(c => {
                const v = diag?.[c.key] ?? 0
                const isWarn = c.warn && v > 0
                return (
                  <div key={c.key} className={`bg-white border rounded-2xl p-5 shadow-sm ${isWarn ? 'border-amber-200' : 'border-slate-200'}`}>
                    <p className={`text-3xl font-black ${isWarn ? 'text-amber-500' : 'text-slate-900'}`}>{v}</p>
                    <p className="text-xs text-slate-500 mt-1 font-medium">{c.label}</p>
                    {c.hint && <p className="text-[10px] text-slate-400 mt-0.5">{c.hint}</p>}
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    )
  }

  // ─────────────────────────── ACCOUNTS VIEW ───────────────────────────
  const platformBadge = (p: string) =>
    p === 'enterprises'
      ? <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-200"><Building2 size={10} /> منشآت</span>
      : <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-primary-50 text-primary-600 border border-primary-200"><Users size={10} /> أفراد</span>

  const verifBadge = (a: Account) => {
    const map: Record<string, string> = {
      'معتمد': 'bg-green-50 text-green-600 border-green-200',
      'قيد المراجعة': 'bg-amber-50 text-amber-600 border-amber-200',
      'مدير': 'bg-purple-50 text-purple-600 border-purple-200',
    }
    const cls = map[a.verification_status] || 'bg-slate-50 text-slate-500 border-slate-200'
    return <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border ${cls}`}>{a.verification_status}</span>
  }

  return (
    <div className="space-y-5 animate-fade-in" dir="rtl">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-2xl font-black text-slate-900">جميع الحسابات</h2>
          <p className="text-slate-400 text-sm mt-0.5">المرجع الرئيسي لكل من سجّل في المنصة — أفراد ومنشآت، طالبين ومقدمين.</p>
        </div>
        <button onClick={() => { setRefreshing(true); load() }}
          className="flex items-center gap-2 bg-white border border-slate-200 text-slate-600 font-medium px-4 py-2 rounded-xl text-sm hover:border-slate-300 transition-colors">
          <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} /> تحديث
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="ابحث بالاسم أو البريد أو الجوال أو رقم المستخدم"
            className="w-full bg-white border border-slate-200 rounded-xl pr-9 pl-3 py-2.5 text-sm outline-none focus:border-primary-400 transition-colors" />
        </div>
        <div className="flex border border-slate-200 rounded-xl overflow-hidden bg-white flex-shrink-0">
          {([
            { id: 'all', label: `الكل (${accounts.length})` },
            { id: 'individuals', label: `أفراد (${accounts.filter(a => a.platform === 'individuals').length})` },
            { id: 'enterprises', label: `منشآت (${accounts.filter(a => a.platform === 'enterprises').length})` },
          ] as const).map(({ id, label }) => (
            <button key={id} onClick={() => setPlatformFilter(id)}
              className={`px-3.5 py-2.5 text-sm font-medium transition-colors whitespace-nowrap ${platformFilter === id ? 'bg-primary-700 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>{label}</button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="py-20 flex justify-center"><Loader2 className="animate-spin text-primary-500" size={28} /></div>
      ) : err ? (
        <div className="bg-red-50 border border-red-200 text-red-600 rounded-2xl p-4 text-sm">{err}</div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden lg:block bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    {['المستخدم', 'المنصة', 'نوع الحساب', 'الجوال', 'المدينة', 'التسجيل', 'آخر دخول', 'التحقق', 'الطلبات', 'الملف'].map(h => (
                      <th key={h} className="px-4 py-3 text-right text-xs font-bold text-slate-400 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(a => (
                    <tr key={a.id} onClick={() => setSelected(a.id)}
                      className="border-b border-slate-50 hover:bg-primary-50/30 transition-colors cursor-pointer">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <img src={a.avatar_url || getAvatar(a.full_name || 'م')} className="w-9 h-9 rounded-xl flex-shrink-0" alt="" />
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900 truncate">{a.full_name || 'مستخدم بدون اسم'}</p>
                            <p className="text-xs text-slate-400 truncate dir-ltr text-left">{a.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">{platformBadge(a.platform)}</td>
                      <td className="px-4 py-3 whitespace-nowrap"><span className="text-xs font-medium text-slate-600">{a.account_type}</span></td>
                      <td className="px-4 py-3 text-xs text-slate-500 dir-ltr text-left whitespace-nowrap">{a.phone || '—'}</td>
                      <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{a.city || '—'}</td>
                      <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{fmtDate(a.created_at)}</td>
                      <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{a.last_sign_in_at ? fmtDate(a.last_sign_in_at) : '—'}</td>
                      <td className="px-4 py-3">{verifBadge(a)}</td>
                      <td className="px-4 py-3 text-xs text-slate-600 whitespace-nowrap">{a.orders_completed}/{a.orders_total}</td>
                      <td className="px-4 py-3">
                        {a.profile_complete
                          ? <CheckCircle size={16} className="text-green-500" />
                          : <Clock size={16} className="text-amber-400" />}
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr><td colSpan={10} className="px-4 py-12 text-center text-slate-400 text-sm">لا توجد حسابات مطابقة</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-2.5 border-t border-slate-100 text-xs text-slate-400">إجمالي: {filtered.length} حساب</div>
          </div>

          {/* Mobile cards */}
          <div className="lg:hidden space-y-3">
            {filtered.map(a => (
              <button key={a.id} onClick={() => setSelected(a.id)}
                className="w-full text-right bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:border-primary-300 transition-colors">
                <div className="flex items-center gap-3">
                  <img src={a.avatar_url || getAvatar(a.full_name || 'م')} className="w-11 h-11 rounded-xl flex-shrink-0" alt="" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-slate-900 truncate">{a.full_name || 'مستخدم بدون اسم'}</p>
                      {a.profile_complete ? <CheckCircle size={13} className="text-green-500 flex-shrink-0" /> : <Clock size={13} className="text-amber-400 flex-shrink-0" />}
                    </div>
                    <p className="text-xs text-slate-400 truncate dir-ltr text-left">{a.email}</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-1.5 mt-3">
                  {platformBadge(a.platform)}
                  <span className="text-[11px] font-medium text-slate-500 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-full">{a.account_type}</span>
                  {verifBadge(a)}
                  <span className="text-[11px] text-slate-500">الطلبات {a.orders_completed}/{a.orders_total}</span>
                </div>
              </button>
            ))}
            {filtered.length === 0 && <p className="text-center text-slate-400 text-sm py-12">لا توجد حسابات مطابقة</p>}
          </div>
        </>
      )}

      {/* ── Detail Drawer ── */}
      {selected && (
        <div className="fixed inset-0 z-[120]">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm animate-fade-in" onClick={() => setSelected(null)} />
          <aside className="absolute top-0 left-0 h-full w-full max-w-md bg-slate-50 shadow-2xl animate-slide-right overflow-y-auto safe-top" dir="rtl">
            <AccountDetail
              accountId={selected}
              base={accounts.find(a => a.id === selected)}
              detail={detail}
              loading={detailLoading}
              onClose={() => setSelected(null)}
              onNavigate={navigate}
              onChanged={load}
            />
          </aside>
        </div>
      )}
    </div>
  )
}

// ═══════════════════════ Detail sub-component ═══════════════════════
function AccountDetail({ accountId, base, detail, loading, onClose, onNavigate, onChanged }: {
  accountId: string
  base?: Account
  detail: any
  loading: boolean
  onClose: () => void
  onNavigate: (p: string) => void
  onChanged: () => void
}) {
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  const p = detail?.profile
  const wp = detail?.worker_profile
  const cp = detail?.company_profile
  const ep = detail?.enterprise_provider
  const auth = detail?.auth
  const tasks: any[] = detail?.tasks || []
  const leads: any[] = detail?.leads || []
  const ratings: any[] = detail?.ratings || []

  const Row = ({ label, value }: { label: string; value?: any }) => (
    <div className="flex items-start justify-between gap-3 py-1.5">
      <span className="text-xs text-slate-400 flex-shrink-0">{label}</span>
      <span className="text-sm text-slate-700 font-medium text-left break-words">{value || <span className="text-slate-300">غير متوفر</span>}</span>
    </div>
  )
  const Section = ({ title, icon: Icon, children }: any) => (
    <div className="bg-white border border-slate-200 rounded-2xl p-4">
      <h4 className="font-bold text-slate-800 text-sm mb-2 flex items-center gap-2"><Icon size={15} className="text-primary-500" /> {title}</h4>
      {children}
    </div>
  )

  const sendNotification = async () => {
    const title = window.prompt('عنوان الإشعار:')
    if (!title) return
    const body = window.prompt('نص الإشعار:') || ''
    setBusy(true)
    const { error } = await supabase.rpc('admin_send_notification', { p_user: accountId, p_title: title, p_body: body })
    setBusy(false)
    setMsg(error ? 'تعذّر الإرسال' : 'تم إرسال الإشعار ✓')
    setTimeout(() => setMsg(null), 2500)
  }

  const toggleApproval = async (kind: 'worker' | 'provider', next: boolean) => {
    setBusy(true)
    const table = kind === 'worker' ? 'worker_profiles' : 'enterprise_providers'
    const { error } = await supabase.from(table).update({ is_approved: next }).eq('user_id', accountId)
    setBusy(false)
    setMsg(error ? 'تعذّر التحديث' : 'تم التحديث ✓')
    setTimeout(() => setMsg(null), 2500)
    if (!error) onChanged()
  }

  return (
    <div className="p-4 space-y-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
      {/* Header */}
      <div className="flex items-center justify-between sticky top-0 bg-slate-50 -mx-4 px-4 py-2 z-10">
        <h3 className="font-black text-slate-900">تفاصيل الحساب</h3>
        <button onClick={onClose} aria-label="إغلاق" className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-400 hover:bg-slate-200">
          <X size={20} />
        </button>
      </div>

      {loading || !detail ? (
        <div className="py-16 flex justify-center"><Loader2 className="animate-spin text-primary-500" size={26} /></div>
      ) : (
        <>
          {/* Identity */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-3">
            <img src={p?.avatar_url || getAvatar(p?.full_name || 'م')} className="w-14 h-14 rounded-2xl" alt="" />
            <div className="min-w-0">
              <p className="font-black text-slate-900 truncate">{p?.full_name || 'مستخدم بدون اسم'}</p>
              <p className="text-xs text-slate-400 dir-ltr text-left truncate">{p?.email}</p>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{base?.account_type}</span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">#{shortId(accountId)}</span>
              </div>
            </div>
          </div>

          <Section title="المعلومات الأساسية" icon={Mail}>
            <Row label="الجوال" value={p?.phone} />
            <Row label="المدينة" value={p?.city} />
            <Row label="المنصة" value={p?.platform === 'enterprises' ? 'منشآت' : 'أفراد'} />
            <Row label="تاريخ التسجيل" value={fmtDateTime(auth?.created_at || p?.created_at)} />
            <Row label="آخر دخول" value={fmtDateTime(auth?.last_sign_in_at)} />
            <Row label="تأكيد البريد" value={auth?.email_confirmed_at ? 'مؤكّد ✓' : 'غير مؤكّد'} />
          </Section>

          {(wp || ep || cp) && (
            <Section title="الملف الشخصي" icon={FileText}>
              {cp && <>
                <Row label="اسم المنشأة" value={cp.company_name} />
                <Row label="حجم المنشأة" value={cp.company_size} />
                <Row label="مسؤول التواصل" value={cp.contact_name} />
              </>}
              {ep && <>
                <Row label="اسم الجهة" value={ep.company_name} />
                <Row label="التخصصات" value={Array.isArray(ep.categories) ? ep.categories.join('، ') : undefined} />
                <Row label="النبذة" value={ep.bio || ep.description} />
                <Row label="المدينة" value={ep.city} />
              </>}
              {wp && <>
                <Row label="النبذة" value={wp.bio} />
                <Row label="المهارات" value={Array.isArray(wp.skills) ? wp.skills.join('، ') : undefined} />
                <Row label="الجنسية" value={wp.nationality} />
                <Row label="العنوان الوطني" value={wp.national_address} />
              </>}
            </Section>
          )}

          {(wp || ep) && (
            <Section title="التحقق والوثائق" icon={BadgeCheck}>
              {wp && <>
                <Row label="نوع الهوية" value={wp.id_type} />
                <Row label="رقم الهوية" value={wp.id_number} />
                <Row label="حالة الهوية" value={wp.id_verified ? 'موثّقة ✓' : 'غير موثّقة'} />
                <Row label="مستوى الاعتماد" value={wp.verification_level} />
                {wp.id_image_url && <a href={wp.id_image_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs text-primary-600 font-bold mt-1 hover:underline"><FileText size={13} /> فتح صورة الهوية</a>}
              </>}
              {ep && <>
                <Row label="السجل التجاري" value={ep.cr_number} />
                <Row label="مستوى الاعتماد" value={ep.verification_level} />
                <Row label="حالة الاعتماد" value={ep.is_approved ? 'معتمد ✓' : 'قيد المراجعة'} />
              </>}
            </Section>
          )}

          <Section title="النشاط" icon={Star}>
            <Row label="إجمالي الطلبات" value={base?.orders_total ?? 0} />
            <Row label="الطلبات المكتملة" value={base?.orders_completed ?? 0} />
            <Row label="طلبات الأفراد" value={tasks.length} />
            <Row label="طلبات المنشآت" value={leads.length} />
            <Row label="عدد التقييمات" value={ratings.length} />
            {wp && <Row label="إجمالي الأرباح" value={wp.total_earnings ? `${wp.total_earnings} ﷼` : undefined} />}
          </Section>

          {/* Admin tools */}
          <Section title="أدوات الإدارة" icon={Shield}>
            {msg && <p className="text-xs font-bold text-green-600 mb-2">{msg}</p>}
            <div className="grid grid-cols-2 gap-2">
              {base?.has_worker && (
                <button onClick={() => { (window as any).__workerProfileId = accountId; onNavigate('worker-profile') }} disabled={busy}
                  className="text-xs font-bold px-3 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50">
                  عرض ملف المزود
                </button>
              )}
              <button onClick={sendNotification} disabled={busy}
                className="text-xs font-bold px-3 py-2 rounded-lg border border-primary-200 text-primary-600 hover:bg-primary-50 transition-colors disabled:opacity-50">
                إرسال إشعار
              </button>
              {base?.has_worker && (
                <button onClick={() => toggleApproval('worker', !base?.worker_approved)} disabled={busy}
                  className={`text-xs font-bold px-3 py-2 rounded-lg border transition-colors disabled:opacity-50 ${base?.worker_approved ? 'border-amber-200 text-amber-600 hover:bg-amber-50' : 'border-green-200 text-green-600 hover:bg-green-50'}`}>
                  {base?.worker_approved ? 'إلغاء اعتماد المزود' : 'اعتماد المزود'}
                </button>
              )}
              {base?.has_provider && (
                <button onClick={() => toggleApproval('provider', !base?.provider_approved)} disabled={busy}
                  className={`text-xs font-bold px-3 py-2 rounded-lg border transition-colors disabled:opacity-50 ${base?.provider_approved ? 'border-amber-200 text-amber-600 hover:bg-amber-50' : 'border-green-200 text-green-600 hover:bg-green-50'}`}>
                  {base?.provider_approved ? 'إلغاء اعتماد الجهة' : 'اعتماد الجهة'}
                </button>
              )}
            </div>
            <p className="text-[11px] text-slate-400 mt-3 leading-relaxed">
              إجراءات الحظر والحذف وإعادة تعيين كلمة المرور و«الدخول كمستخدم» تتطلّب صلاحية service_role عبر Edge Function آمن — لم تُفعّل هنا حفاظاً على أمان الحسابات وعدم حذف أي بيانات.
            </p>
          </Section>
        </>
      )}
    </div>
  )
}
