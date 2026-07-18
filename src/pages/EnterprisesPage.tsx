import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useApp } from '../contexts/AppContext'
import {
  Building2, ChevronDown, ChevronUp, CheckCircle2, ArrowLeft,
  ShieldCheck, Scale, FileText, BadgeDollarSign, Award,
  Cpu, Megaphone, ShoppingCart, BarChart2, Landmark,
  Languages, Flame, Home, GraduationCap, FolderKanban,
  Leaf, Umbrella, ClipboardCheck, Send, X
} from 'lucide-react'

const CATEGORIES = [
  { id: 'governance', icon: ShieldCheck, label: 'الحوكمة والامتثال', desc: 'سياسات، هياكل تنظيمية، إطار GRC' },
  { id: 'saudization', icon: Award, label: 'نطاقات والسعودة', desc: 'رفع نسب التوطين، حلول نطاقات المطوّر' },
  { id: 'legal', icon: Scale, label: 'الاستشارات القانونية', desc: 'عقود، نزاعات، قانون عمل' },
  { id: 'finance', icon: BadgeDollarSign, label: 'المالية والزكاة', desc: 'ضريبة القيمة المضافة، الزكاة، التدقيق المالي' },
  { id: 'quality', icon: ClipboardCheck, label: 'الجودة وISO', desc: 'ISO 9001، ISO 14001، تحسين العمليات' },
  { id: 'tech', icon: Cpu, label: 'التقنية والأمن السيبراني', desc: 'تحول رقمي، حماية بيانات، بنية تحتية' },
  { id: 'marketing', icon: Megaphone, label: 'التسويق والعلامة التجارية', desc: 'هوية بصرية، رقمي، محتوى' },
  { id: 'procurement', icon: ShoppingCart, label: 'المشتريات وسلاسل التوريد', desc: 'تأهيل موردين، سياسات شراء' },
  { id: 'strategy', icon: BarChart2, label: 'الاستراتيجية والتخطيط', desc: 'خطط تشغيلية، OKRs، رؤية 2030' },
  { id: 'government', icon: Landmark, label: 'العلاقات الحكومية', desc: 'تراخيص، تسجيل، تواصل مع الجهات' },
  { id: 'translation', icon: Languages, label: 'الترجمة والتعريب', desc: 'مستندات رسمية، تعريب مواقع' },
  { id: 'hse', icon: Flame, label: 'السلامة والصحة المهنية', desc: 'HSE، تدريب سلامة، تقييم مخاطر' },
  { id: 'realestate', icon: Home, label: 'العقارات والمرافق', desc: 'تقييم، إيجار تجاري، إدارة أملاك' },
  { id: 'training', icon: GraduationCap, label: 'التدريب والتطوير', desc: 'برامج تأهيل، قيادة، مهارات' },
  { id: 'pm', icon: FolderKanban, label: 'إدارة المشاريع', desc: 'PMO، PMP، جداول زمنية، PMBOK' },
  { id: 'esg', icon: Leaf, label: 'الاستدامة وESG', desc: 'تقارير ESG، بيئة، مسؤولية اجتماعية' },
  { id: 'insurance', icon: Umbrella, label: 'التأمين', desc: 'مقارنة وثائق، تأمين طبي وممتلكات' },
  { id: 'audit', icon: FileText, label: 'التدقيق والمراجعة', desc: 'مراجعة داخلية، امتثال، تقارير مجلس الإدارة' },
]

const BUDGET_OPTIONS = [
  'أقل من ١٠,٠٠٠ ريال',
  '١٠,٠٠٠ – ٥٠,٠٠٠ ريال',
  '٥٠,٠٠٠ – ٢٠٠,٠٠٠ ريال',
  'أكثر من ٢٠٠,٠٠٠ ريال',
  'غير محدد بعد',
]

const COMPANY_SIZES = ['1-10', '11-50', '51-200', '201-500', '500+']

interface LeadForm {
  company_name: string
  contact_name: string
  contact_email: string
  contact_phone: string
  company_size: string
  category: string
  description: string
  budget_range: string
}

const EMPTY: LeadForm = {
  company_name: '', contact_name: '', contact_email: '',
  contact_phone: '', company_size: '', category: '',
  description: '', budget_range: ''
}

export function EnterprisesPage() {
  const { user } = useAuth()
  const [selectedCat, setSelectedCat] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<LeadForm>(EMPTY)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null)

  const set = (k: keyof LeadForm, v: string) => setForm(f => ({ ...f, [k]: v }))

  const openForm = (catId: string) => {
    setSelectedCat(catId)
    setForm(f => ({ ...f, category: catId }))
    setShowForm(true)
    setSuccess(false)
    setError('')
  }

  const handleSubmit = async () => {
    if (!form.company_name || !form.contact_name || !form.contact_email || !form.category || !form.description) {
      setError('يرجى تعبئة جميع الحقول المطلوبة')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      const { error: err } = await supabase.from('enterprise_leads').insert({
        ...form,
        user_id: user?.id ?? null,
        status: 'new'
      })
      if (err) throw err
      setSuccess(true)
    } catch (e: any) {
      setError('حدث خطأ، يرجى المحاولة مجدداً')
    } finally {
      setSubmitting(false)
    }
  }

  const selectedCatData = CATEGORIES.find(c => c.id === selectedCat)

  const faqs = [
    { q: 'كيف يعمل النظام؟', a: 'أرسل طلبك، وفريقنا يراجعه ويوصلك بأفضل مزود خدمة معتمد يناسب احتياجك خلال ٢٤ ساعة.' },
    { q: 'هل الخدمة مجانية؟', a: 'التسجيل والمطابقة مجانية كلياً. العقد والدفع يتم مباشرة بينك وبين مزود الخدمة خارج المنصة.' },
    { q: 'ما مدى موثوقية المزودين؟', a: 'جميع المزودين يخضعون لعملية تحقق من السجل التجاري والخبرات قبل القبول في المنصة.' },
    { q: 'كم يستغرق الرد؟', a: 'الرد الأولي خلال ٢٤ ساعة، والمطابقة مع مزود مناسب خلال ٧٢ ساعة كحد أقصى.' },
  ]

  const { navigate } = useApp()

  return (
    <div className="min-h-screen bg-white" dir="rtl">

      {/* Top bar */}
      <div className="bg-slate-900 px-4 py-2 flex items-center justify-between">
        <button onClick={() => navigate('landing')} className="flex items-center gap-1.5 text-slate-400 hover:text-white text-sm transition-colors">
          <ArrowLeft size={14} />
          <span>تغيير الوجهة</span>
        </button>
        <div className="flex items-center gap-2">
          <span className="text-white font-black text-sm">أمرني</span>
          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-accent-500/20 text-accent-300 border border-accent-500/30">
            منشآت
          </span>
        </div>
      </div>

      {/* Hero */}
      <section className="bg-gradient-to-br from-slate-900 via-primary-900 to-slate-900 text-white py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-primary-500/20 border border-primary-500/30 rounded-full px-4 py-1.5 text-primary-300 text-sm mb-6">
            <Building2 size={14} />
            <span>خدمات المنشآت والشركات</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black mb-4 leading-tight">
            وصّل منشأتك<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-l from-primary-400 to-accent-400">
              بأفضل المستشارين المعتمدين
            </span>
          </h1>
          <p className="text-slate-300 text-lg mb-8 max-w-2xl mx-auto">
            منصة أمرني تربطك بمزودي خدمات B2B محترفين في ١٨ تخصصاً — من الحوكمة والسعودة حتى الاستدامة وإدارة المشاريع.
          </p>
          <div className="flex flex-wrap justify-center gap-6 text-sm text-slate-400">
            {['مطابقة خلال ٢٤ ساعة', 'مزودون موثّقون', 'تعاقد مباشر بدون عمولة'].map(t => (
              <div key={t} className="flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-primary-400" />
                <span>{t}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories Grid */}
      <section className="py-16 px-4 bg-slate-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-black text-slate-900 mb-2">اختر التخصص المطلوب</h2>
            <p className="text-slate-500">١٨ تخصصاً متاحاً — جميعها تُفتح فور إرسال طلبك</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
            {CATEGORIES.map(cat => {
              const Icon = cat.icon
              return (
                <button
                  key={cat.id}
                  onClick={() => openForm(cat.id)}
                  className="group bg-white border border-slate-200 rounded-2xl p-4 text-right hover:border-primary-400 hover:shadow-md transition-all duration-200 flex flex-col gap-3"
                >
                  <div className="w-10 h-10 rounded-xl bg-primary-50 group-hover:bg-primary-100 flex items-center justify-center transition-colors">
                    <Icon size={18} className="text-primary-500" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900 leading-tight mb-0.5">{cat.label}</p>
                    <p className="text-xs text-slate-400 leading-relaxed">{cat.desc}</p>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-primary-500 font-medium mt-auto">
                    <span>أرسل طلبك</span>
                    <ArrowLeft size={11} />
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-black text-slate-900 text-center mb-10">كيف تشتغل المنصة؟</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { n: '١', title: 'أرسل طلبك', desc: 'اختر التخصص واملأ تفاصيل احتياجك في دقيقتين' },
              { n: '٢', title: 'نوصّلك بالمناسب', desc: 'فريقنا يراجع طلبك ويختار أفضل مزود خدمة معتمد يناسبك' },
              { n: '٣', title: 'تعاقد مباشر', desc: 'تتواصل مباشرة مع المزود وتوقع العقد بينكم — بدون عمولة' },
            ].map(step => (
              <div key={step.n} className="text-center">
                <div className="w-12 h-12 rounded-2xl bg-primary-500 text-white font-black text-xl flex items-center justify-center mx-auto mb-4">
                  {step.n}
                </div>
                <h3 className="font-bold text-slate-900 mb-2">{step.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 px-4 bg-slate-50">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-black text-slate-900 text-center mb-8">أسئلة شائعة</h2>
          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <div key={i} className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                <button
                  onClick={() => setExpandedFaq(expandedFaq === i ? null : i)}
                  className="w-full flex items-center justify-between px-5 py-4 text-right"
                >
                  <span className="font-semibold text-slate-900 text-sm">{faq.q}</span>
                  {expandedFaq === i ? <ChevronUp size={16} className="text-slate-400 flex-shrink-0" /> : <ChevronDown size={16} className="text-slate-400 flex-shrink-0" />}
                </button>
                {expandedFaq === i && (
                  <div className="px-5 pb-4 text-slate-500 text-sm leading-relaxed border-t border-slate-100 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4 bg-primary-900 text-white text-center">
        <h2 className="text-2xl font-black mb-3">جاهز تبدأ؟</h2>
        <p className="text-primary-200 mb-6">أرسل طلبك الآن — الخدمة مجانية والرد خلال ٢٤ ساعة</p>
        <button
          onClick={() => { setShowForm(true); setSelectedCat(null); setForm(EMPTY); setSuccess(false) }}
          className="bg-white text-primary-900 font-bold px-8 py-3 rounded-2xl hover:bg-primary-50 transition-colors"
        >
          أرسل طلبك الآن
        </button>
      </section>

      {/* Request Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between rounded-t-3xl">
              <div>
                <h2 className="font-black text-slate-900">
                  {selectedCatData ? selectedCatData.label : 'طلب خدمة للمنشآت'}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">سيصلك رد خلال ٢٤ ساعة</p>
              </div>
              <button onClick={() => setShowForm(false)} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors">
                <X size={14} />
              </button>
            </div>

            {success ? (
              <div className="p-8 text-center">
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 size={32} className="text-green-500" />
                </div>
                <h3 className="text-lg font-black text-slate-900 mb-2">تم استلام طلبك!</h3>
                <p className="text-slate-500 text-sm mb-6">سيتواصل معك فريقنا خلال ٢٤ ساعة على البريد الإلكتروني المدخل.</p>
                <button
                  onClick={() => setShowForm(false)}
                  className="bg-primary-500 text-white font-bold px-6 py-2.5 rounded-xl hover:bg-primary-600 transition-colors"
                >
                  حسناً
                </button>
              </div>
            ) : (
              <div className="p-6 space-y-4">
                {/* Category selector if not pre-selected */}
                {!selectedCat && (
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">التخصص المطلوب *</label>
                    <select
                      value={form.category}
                      onChange={e => set('category', e.target.value)}
                      className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 bg-slate-50"
                    >
                      <option value="">اختر التخصص</option>
                      {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                    </select>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">اسم الشركة *</label>
                    <input value={form.company_name} onChange={e => set('company_name', e.target.value)}
                      placeholder="شركة المستقبل" className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 bg-slate-50" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">اسم المسؤول *</label>
                    <input value={form.contact_name} onChange={e => set('contact_name', e.target.value)}
                      placeholder="محمد العبدالله" className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 bg-slate-50" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">البريد الإلكتروني *</label>
                    <input type="email" value={form.contact_email} onChange={e => set('contact_email', e.target.value)}
                      placeholder="info@company.com" className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 bg-slate-50" dir="ltr" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">رقم الجوال</label>
                    <input value={form.contact_phone} onChange={e => set('contact_phone', e.target.value)}
                      placeholder="05xxxxxxxx" className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 bg-slate-50" dir="ltr" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">حجم الشركة</label>
                    <select value={form.company_size} onChange={e => set('company_size', e.target.value)}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 bg-slate-50">
                      <option value="">اختر</option>
                      {COMPANY_SIZES.map(s => <option key={s} value={s}>{s} موظف</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">الميزانية التقريبية</label>
                    <select value={form.budget_range} onChange={e => set('budget_range', e.target.value)}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 bg-slate-50">
                      <option value="">اختر</option>
                      {BUDGET_OPTIONS.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">وصف الاحتياج *</label>
                  <textarea value={form.description} onChange={e => set('description', e.target.value)}
                    rows={4} placeholder="اشرح احتياج منشأتك بإيجاز — كلما كانت التفاصيل أوضح، كانت المطابقة أدق..."
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 bg-slate-50 resize-none" />
                </div>

                {error && (
                  <div className="bg-red-50 text-red-600 text-sm px-4 py-2.5 rounded-xl border border-red-100">
                    {error}
                  </div>
                )}

                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="w-full bg-primary-500 hover:bg-primary-600 disabled:opacity-60 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <span className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
                  ) : (
                    <>
                      <Send size={15} />
                      <span>إرسال الطلب</span>
                    </>
                  )}
                </button>

                <p className="text-xs text-slate-400 text-center">بإرسال الطلب توافق على مشاركة بياناتك مع فريق أمرني</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
