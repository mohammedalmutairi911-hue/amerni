import { useState, useEffect } from 'react'
import { Bell, BellOff, Check, Loader2, ArrowRight, Smartphone, ShieldAlert } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useApp } from '../contexts/AppContext'
import { goToUserHome } from '../lib/homePage'
import { useToast } from '../components/Toast'
import { enablePushNotifications, disablePushNotifications, isSubscribed, isPushSupported, getPermissionState } from '../lib/push'

type Prefs = {
  notify_orders: boolean
  notify_messages: boolean
  notify_offers: boolean
  notify_ratings: boolean
  notify_marketing: boolean
  admin_new_user: boolean
  admin_new_task: boolean
  admin_task_accepted: boolean
  admin_task_completed: boolean
  admin_task_cancelled: boolean
  admin_new_dispute: boolean
  admin_new_review: boolean
  admin_new_verification: boolean
  admin_new_enterprise: boolean
  admin_new_worker: boolean
}

const DEFAULT_PREFS: Prefs = {
  notify_orders: true, notify_messages: true, notify_offers: true,
  notify_ratings: true, notify_marketing: false,
  admin_new_user: true, admin_new_task: true, admin_task_accepted: true,
  admin_task_completed: true, admin_task_cancelled: true, admin_new_dispute: true,
  admin_new_review: true, admin_new_verification: true,
  admin_new_enterprise: true, admin_new_worker: true,
}

export function NotificationSettings() {
  const { user, profile } = useAuth()
  const { navigate } = useApp()
  const { toast } = useToast()
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [pushOn, setPushOn] = useState(false)
  const [enabling, setEnabling] = useState(false)
  const [permission, setPermission] = useState<string>('default')

  const isAdmin = profile?.role === 'admin'

  useEffect(() => {
    if (!user) return
    ;(async () => {
      const { data } = await supabase.from('notification_preferences')
        .select('*').eq('user_id', user.id).maybeSingle()
      if (data) setPrefs({ ...DEFAULT_PREFS, ...data })
      const sub = await isSubscribed()
      setPushOn(sub)
      setPermission(getPermissionState())
      setLoading(false)
    })()
  }, [user?.id])

  const savePref = async (key: keyof Prefs, value: boolean) => {
    setPrefs(p => ({ ...p, [key]: value }))
    setSaving(true)
    const { error } = await supabase.from('notification_preferences')
      .upsert({ user_id: user!.id, [key]: value, updated_at: new Date().toISOString() },
              { onConflict: 'user_id' })
    setSaving(false)
    if (error) {
      setPrefs(p => ({ ...p, [key]: !value }))
      toast('لم يُحفظ التغيير — حاول مرة ثانية', 'error')
    }
  }

  const togglePush = async () => {
    setEnabling(true)
    if (pushOn) {
      await disablePushNotifications()
      setPushOn(false)
      toast('تم إيقاف إشعارات Push', 'info')
    } else {
      const res = await enablePushNotifications()
      if (res.success) {
        setPushOn(true)
        setPermission('granted')
        toast('✅ الإشعارات مفعّلة — راح تصلك على جوالك', 'success')
      } else if (res.reason === 'denied') {
        setPermission('denied')
        toast('رفضت الإذن — فعّله من إعدادات المتصفح', 'error')
      } else if (res.reason === 'unsupported') {
        toast('متصفحك ما يدعم الإشعارات Push', 'error')
      } else {
        toast('حصل خطأ — حاول مرة ثانية', 'error')
      }
    }
    setEnabling(false)
  }

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <Loader2 size={28} className="animate-spin text-primary-500" />
    </div>
  )

  const UserPrefs = [
    { key: 'notify_orders' as const,   label: 'الطلبات',       desc: 'تحديثات على طلباتك ونشاطها' },
    { key: 'notify_messages' as const, label: 'الرسائل',       desc: 'رسائل جديدة في المحادثات' },
    { key: 'notify_offers' as const,   label: 'عروض الأسعار',  desc: 'مقترحات مقدمي الخدمة' },
    { key: 'notify_ratings' as const,  label: 'التقييمات',     desc: 'تقييمات جديدة على أعمالك' },
    { key: 'notify_marketing' as const,label: 'العروض التسويقية', desc: 'خصومات وإشعارات ترويجية' },
  ]

  const AdminPrefs = [
    { key: 'admin_new_user' as const,         label: 'مستخدم جديد',       desc: 'تسجيل عميل جديد' },
    { key: 'admin_new_worker' as const,       label: 'عامل جديد',         desc: 'تسجيل عامل ينتظر التحقق' },
    { key: 'admin_new_enterprise' as const,   label: 'منشأة جديدة',       desc: 'تسجيل منشأة جديدة' },
    { key: 'admin_new_task' as const,         label: 'طلب جديد',          desc: 'أي طلب جديد على المنصة' },
    { key: 'admin_task_accepted' as const,    label: 'قبول طلب',          desc: 'عامل قبل طلبًا' },
    { key: 'admin_task_completed' as const,   label: 'اكتمال طلب',        desc: 'طلب اكتمل — العمولة مستحقة' },
    { key: 'admin_task_cancelled' as const,   label: 'إلغاء طلب',         desc: 'طلب أُلغي' },
    { key: 'admin_new_dispute' as const,      label: 'نزاع/شكوى',         desc: 'رُفع نزاع يحتاج مراجعة' },
    { key: 'admin_new_review' as const,       label: 'تقييم جديد',        desc: 'إرسال تقييم على طلب' },
    { key: 'admin_new_verification' as const, label: 'طلب تحقق',          desc: 'مستند تحقق أو اعتماد عامل' },
  ]

  return (
    <div className="min-h-screen bg-slate-50 pt-14 pb-24" dir="rtl">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <button onClick={() => goToUserHome(navigate, profile)}
          className="flex items-center gap-1.5 text-slate-500 hover:text-slate-900 text-sm mb-4 transition-colors">
          <ArrowRight size={14} /> رجوع
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 rounded-2xl bg-primary-500 flex items-center justify-center text-white">
            <Bell size={20} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900">الإشعارات</h1>
            <p className="text-slate-500 text-sm">تحكّم في ما يصلك ومتى</p>
          </div>
        </div>

        {/* Push toggle master */}
        <div className={`border rounded-2xl p-5 mb-5 transition-colors ${
          pushOn ? 'bg-green-50 border-green-200' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-start gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
              pushOn ? 'bg-green-500 text-white' : 'bg-slate-100 text-slate-500'
            }`}>
              {pushOn ? <Bell size={18} /> : <BellOff size={18} />}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-slate-900 mb-0.5">
                إشعارات Push على الجوال
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                استقبل إشعارات فورية على جوالك حتى وأنت خارج التطبيق
              </p>
              {permission === 'denied' && (
                <div className="mt-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 flex items-start gap-2">
                  <ShieldAlert size={14} className="text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-700 leading-relaxed">
                    الإذن مرفوض في متصفحك — فعّله من: الإعدادات ← إعدادات الموقع ← الإشعارات
                  </p>
                </div>
              )}
              {!isPushSupported() && (
                <div className="mt-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 flex items-start gap-2">
                  <Smartphone size={14} className="text-slate-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-slate-600 leading-relaxed">
                    متصفحك ما يدعم Push — على iPhone تحتاج تضيف الموقع للشاشة الرئيسية أولاً
                  </p>
                </div>
              )}
            </div>
            <button onClick={togglePush} disabled={enabling || !isPushSupported() || permission === 'denied'}
              className={`flex-shrink-0 text-xs font-bold px-4 py-2 rounded-xl transition-all disabled:opacity-40 ${
                pushOn ? 'bg-white border border-green-300 text-green-700 hover:bg-green-50'
                       : 'bg-primary-500 text-white hover:bg-primary-600'
              }`}>
              {enabling ? <Loader2 size={13} className="animate-spin" /> :
               pushOn ? 'إيقاف' : 'تفعيل'}
            </button>
          </div>
        </div>

        {/* User prefs */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden mb-5">
          <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-sm">أنواع الإشعارات</h3>
            {saving && <Loader2 size={12} className="animate-spin text-slate-400" />}
          </div>
          <div className="divide-y divide-slate-100">
            {UserPrefs.map(({ key, label, desc }) => (
              <PrefRow key={key} label={label} desc={desc} value={prefs[key]}
                onChange={(v) => savePref(key, v)} />
            ))}
          </div>
        </div>

        {/* Admin prefs */}
        {isAdmin && (
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 bg-purple-50 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">إشعارات الإدارة</h3>
                <p className="text-xs text-slate-500">تحديد الأحداث التي تصلك كأدمن</p>
              </div>
              <span className="text-xs bg-purple-500 text-white font-bold px-2 py-0.5 rounded-full">Admin</span>
            </div>
            <div className="divide-y divide-slate-100">
              {AdminPrefs.map(({ key, label, desc }) => (
                <PrefRow key={key} label={label} desc={desc} value={prefs[key]}
                  onChange={(v) => savePref(key, v)} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function PrefRow({ label, desc, value, onChange }: {
  label: string; desc: string; value: boolean; onChange: (v: boolean) => void
}) {
  return (
    <div className="px-5 py-3 flex items-center gap-4">
      <div className="flex-1 min-w-0">
        <p className="font-medium text-slate-900 text-sm">{label}</p>
        <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
      </div>
      <button onClick={() => onChange(!value)}
        role="switch" aria-checked={value} aria-label={label}
        className={`relative w-11 h-6 rounded-full flex-shrink-0 transition-colors ${
          value ? 'bg-primary-500' : 'bg-slate-200'
        }`}>
        <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${
          value ? 'right-0.5' : 'right-[calc(100%-1.375rem)]'
        }`}>
          {value && <Check size={12} className="text-primary-500 m-auto mt-1" />}
        </span>
      </button>
    </div>
  )
}
