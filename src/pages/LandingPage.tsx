import { useState, useEffect } from 'react'
import { Sparkles, Shield, CheckCircle, Zap, Users, Star, ArrowLeft, Bot, UserCheck, Loader2, Eye, EyeOff, Mail, Phone, MessageCircle, Info, Send, X } from 'lucide-react'
import { useApp } from '../contexts/AppContext'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { NewTaskPage } from './NewTaskPage'

const EXAMPLES = [
  'أبي أحد يتأكد لي إذا المحل مفتوح',
  'أحتاج أحد يجيب غرض من السوق',
  'أبي أحد يصور موقع أو منتج',
  'أحتاج أحد يمر على مكان عني',
  'أبي أحد يوصل شيء',
  'أحتاج أحد يطابق لي معلومة',
]

const TRUST = [
  'التحقق من الهوية الوطنية السعودية',
  'تحقق AI من صورة الهوية',
  'فلوسك محمية لحين إتمام الشغل',
  'دعم مباشر بالعربي ٢٤/٧',
  'خصوصيتك محمية وبياناتك سرية',
  'تواصل مباشر مع العامل عبر المنصة فقط',
]

const STEPS = [
  { n: '١', icon: Sparkles, title: 'اكتب اللي تبيه', desc: 'اكتب طلبك بأي كلام. ما في خيارات أو تصنيفات.' },
  { n: '٢', icon: Zap, title: 'عامل يقبل على طول', desc: 'الطلب يوصل للعمال المناسبين فوراً.' },
  { n: '٣', icon: Users, title: 'تكلمه وتابع', desc: 'محادثة مباشرة تفتح تلقائياً.' },
]

type Tab = 'home' | 'how' | 'features' | 'trust' | 'about' | 'contact' | 'support'

const SUPPORT_SYSTEM = `أنت مساعد خدمة عملاء لمنصة "أمرني" السعودية لطلب الخدمات.
مهمتك مساعدة العملاء والعمال بأسلوب ودي وسعودي.
إذا ذكر المستخدم مشكلة في طلب، اطلب منه رقم الطلب.
المنصة تتيح: طلب خدمات يومية، عمال موثوقين، دفع آمن.
للتواصل المباشر: support@amerniksa.com`

interface SupportMsg { role: 'user' | 'assistant'; content: string }

export function LandingPage() {
  const { navigate } = useApp()
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<Tab>('home')
  const [idx, setIdx] = useState(0)
  const [visible, setVisible] = useState(true)
  const [taskInput, setTaskInput] = useState('')
  const [showNewTask, setShowNewTask] = useState(false)

  // Contact form
  const [contactForm, setContactForm] = useState({ name: '', email: '', message: '' })
  const [contactSent, setContactSent] = useState(false)
  const [contactLoading, setContactLoading] = useState(false)

  // Support chat
  const [supportMsgs, setSupportMsgs] = useState<SupportMsg[]>([
    { role: 'assistant', content: 'أهلاً! أنا مساعد أمرني. كيف أقدر أساعدك اليوم؟ 😊' }
  ])
  const [supportInput, setSupportInput] = useState('')
  const [supportLoading, setSupportLoading] = useState(false)

  useEffect(() => {
    const t = setInterval(() => {
      setVisible(false)
      setTimeout(() => { setIdx(i => (i + 1) % EXAMPLES.length); setVisible(true) }, 300)
    }, 3000)
    return () => clearInterval(t)
  }, [])

  const handleStart = () => {
    if (!taskInput.trim() && user) { navigate('dashboard'); return }
    setShowNewTask(true)
  }

  const sendContact = async () => {
    if (!contactForm.name || !contactForm.email || !contactForm.message) return
    setContactLoading(true)
    await new Promise(r => setTimeout(r, 1000))
    setContactSent(true)
    setContactLoading(false)
  }

  const sendSupport = async () => {
    const text = supportInput.trim()
    if (!text || supportLoading) return
    setSupportInput('')
    const newMsgs: SupportMsg[] = [...supportMsgs, { role: 'user', content: text }]
    setSupportMsgs(newMsgs)
    setSupportLoading(true)
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514', max_tokens: 400,
          system: SUPPORT_SYSTEM,
          messages: newMsgs.map(m => ({ role: m.role, content: m.content })).slice(-10)
        })
      })
      const data = await res.json()
      const reply = data.content?.[0]?.text || 'عذراً، حدث خطأ. تواصل معنا على support@amerniksa.com'
      setSupportMsgs(p => [...p, { role: 'assistant', content: reply }])
    } catch {
      setSupportMsgs(p => [...p, { role: 'assistant', content: 'عذراً، حدث خطأ مؤقت. تواصل معنا على support@amerniksa.com' }])
    }
    setSupportLoading(false)
  }

  if (showNewTask) return <NewTaskPage initialTask={taskInput} onClose={() => setShowNewTask(false)} />

  const TABS = [
    { id: 'home', label: 'الرئيسية' },
    { id: 'how', label: 'كيف تشتغل' },
    { id: 'features', label: 'المميزات' },
    { id: 'trust', label: 'الثقة والأمان' },
    { id: 'about', label: 'عنّا' },
    { id: 'contact', label: 'تواصل معنا' },
    { id: 'support', label: 'الدعم' },
    { id: 'privacy', label: 'الخصوصية والأمان' },
    { id: 'terms', label: 'الشروط والأحكام' },
  ]

  const handleBrowse = () => navigate('browse')
  const handleBounties = () => navigate('bounties')
  const handleEarn = () => navigate('earn')

  return (
    <div className="min-h-screen bg-[#080808] text-white flex flex-col">
      {/* Navbar */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-[#080808]/95 backdrop-blur border-b border-zinc-900">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <button onClick={() => setActiveTab('home')} className="text-xl font-black text-amber-400">أمرني</button>
          <div className="hidden md:flex items-center gap-1 overflow-x-auto">
            {TABS.slice(1).map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id as Tab)}
                className={`px-3 py-1.5 rounded-lg text-sm transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-amber-500/15 text-amber-400' : 'text-zinc-400 hover:text-white'}`}>
                {tab.label}
              </button>
            ))}
          </div>
          {user ? (
            <button onClick={() => navigate('dashboard')} className="bg-amber-500 text-black font-bold px-4 py-1.5 rounded-lg text-sm hover:bg-amber-400 transition-colors">
              داشبورد
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button onClick={() => setShowNewTask(true)} className="text-zinc-400 hover:text-white text-sm transition-colors">دخول</button>
              <button onClick={() => setShowNewTask(true)} className="bg-amber-500 text-black font-bold px-4 py-1.5 rounded-lg text-sm hover:bg-amber-400 transition-colors">سجّل</button>
            </div>
          )}
        </div>
        {/* Mobile tabs */}
        <div className="md:hidden flex gap-1 px-4 pb-2 overflow-x-auto">
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as Tab)}
              className={`px-3 py-1 rounded-lg text-xs transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-amber-500 text-black font-bold' : 'text-zinc-500 hover:text-white'}`}>
              {tab.label}
            </button>
          ))}
        </div>
      </nav>

      <div className="flex-1 pt-14">

        {/* HOME */}
        {activeTab === 'home' && (
          <div>
            {/* Hero - full viewport */}
            <section className="relative min-h-[calc(100vh-56px)] flex flex-col items-center justify-center px-4 overflow-hidden">
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] rounded-full bg-amber-500/6 blur-3xl" />
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff04_1px,transparent_1px),linear-gradient(to_bottom,#ffffff04_1px,transparent_1px)] bg-[size:60px_60px]" />
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,#080808_100%)]" />
              </div>
              <div className="relative max-w-3xl mx-auto text-center w-full">
                <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-full px-4 py-1.5 text-sm text-amber-400 mb-8">
                  <Sparkles size={13} /> أمرني — اطلب أي شي في السعودية
                </div>
                <h1 className="text-6xl sm:text-7xl lg:text-8xl font-black tracking-tight mb-6 leading-[1.05]">
                  <span className="text-white">اطلب</span>{' '}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-500">أي شيء.</span>
                  <br />
                  <span className="text-white text-5xl sm:text-6xl">ننجزه لك.</span>
                </h1>
                <p className="text-zinc-400 text-xl mb-12 max-w-xl mx-auto leading-relaxed">
                  منصة سعودية تربطك بعمال موثوقين لإنجاز أي مهمة يومية — بذكاء وأمان.
                </p>
                <div className="relative max-w-xl mx-auto mb-6">
                  <div className="flex items-center gap-3 bg-[#111] border-2 border-zinc-800 rounded-2xl px-5 py-4 focus-within:border-amber-500 transition-all shadow-2xl">
                    <Sparkles size={18} className="text-amber-500 flex-shrink-0" />
                    <input
                      value={taskInput} onChange={e => setTaskInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && taskInput.trim() && handleStart()}
                      placeholder={visible ? EXAMPLES[idx] : ''}
                      className="flex-1 text-right bg-transparent text-white placeholder-zinc-500 text-sm outline-none"
                    />
                    <button onClick={handleStart}
                      className="bg-amber-500 text-black text-sm font-bold px-5 py-2.5 rounded-xl hover:bg-amber-400 transition-colors flex-shrink-0 flex items-center gap-1.5">
                      اطلب <ArrowLeft size={14} />
                    </button>
                  </div>
                </div>
                <p className="text-xs text-zinc-600 mb-10">اكتب أي شيء واضغط اطلب — مجاني تماماً</p>

                {/* Quick categories */}
                <div className="flex flex-wrap justify-center gap-2 mb-10">
                  {['توصيل 🚗','تصوير 📸','تحقق 🔍','تسوق 🛍️','تعليم 📚','أخرى ✨'].map(cat => (
                    <button key={cat} onClick={() => { setTaskInput(cat.split(' ')[0]); setShowNewTask(true) }}
                      className="px-4 py-2 bg-zinc-900 border border-zinc-800 hover:border-amber-500/40 rounded-full text-sm text-zinc-400 hover:text-white transition-all">
                      {cat}
                    </button>
                  ))}
                </div>

                <div className="flex justify-center gap-10 text-center">
                  {[['١٠٬٠٠٠+', 'طلب اتنجز'], ['٢٤٠٠+', 'عامل موثوق'], ['٩٨٪', 'نسبة الرضا']].map(([v, l]) => (
                    <div key={l}>
                      <div className="text-3xl font-black text-amber-400">{v}</div>
                      <div className="text-xs text-zinc-500 mt-1">{l}</div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* Quick how it works */}
            <section className="py-20 px-4 bg-zinc-900/10">
              <div className="max-w-4xl mx-auto grid md:grid-cols-3 gap-5">
                {STEPS.map(({ n, icon: Icon, title, desc }) => (
                  <div key={n} className="bg-[#0d0d0d] border border-zinc-800 rounded-2xl p-6">
                    <div className="text-4xl font-black text-zinc-800 mb-3">{n}</div>
                    <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-3">
                      <Icon size={17} className="text-amber-500" />
                    </div>
                    <h3 className="font-semibold mb-1.5">{title}</h3>
                    <p className="text-zinc-500 text-sm leading-relaxed">{desc}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {/* HOW IT WORKS */}
        {activeTab === 'how' && (
          <section className="min-h-[calc(100vh-56px)] py-20 px-4">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-14">
                <h2 className="text-4xl font-black mb-3">كيف تشتغل أمرني؟</h2>
                <p className="text-zinc-500">من الطلب للإنجاز في دقائق</p>
              </div>
              <div className="grid md:grid-cols-3 gap-6 mb-16">
                {STEPS.map(({ n, icon: Icon, title, desc }) => (
                  <div key={n} className="bg-[#0d0d0d] border border-zinc-800 rounded-2xl p-7 hover:border-zinc-700 transition-all">
                    <div className="text-5xl font-black text-zinc-800 mb-4">{n}</div>
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-4">
                      <Icon size={19} className="text-amber-500" />
                    </div>
                    <h3 className="font-semibold mb-2 text-lg">{title}</h3>
                    <p className="text-zinc-500 text-sm leading-relaxed">{desc}</p>
                  </div>
                ))}
              </div>
              <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-8 text-center">
                <h3 className="text-2xl font-bold mb-3">جاهز تطلب؟</h3>
                <p className="text-zinc-500 mb-6">اكتب طلبك الحين وعامل يقبله في ثواني</p>
                <button onClick={() => setShowNewTask(true)} className="bg-amber-500 text-black font-bold px-8 py-3 rounded-xl hover:bg-amber-400 transition-colors">
                  اطلب الحين
                </button>
              </div>
            </div>
          </section>
        )}

        {/* FEATURES */}
        {activeTab === 'features' && (
          <section className="min-h-[calc(100vh-56px)] py-20 px-4">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-14">
                <h2 className="text-4xl font-black mb-3">مميزات أمرني</h2>
                <p className="text-zinc-500">مختلفون عن الكل</p>
              </div>
              <div className="grid sm:grid-cols-2 gap-5">
                {[
                  { icon: Bot, title: 'ذكاء اصطناعي', desc: 'اقتراح سعر مناسب، تحقق من الهوية، حماية المحادثة من تبادل الأرقام الخارجية', color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20' },
                  { icon: UserCheck, title: 'عمال موثوقون', desc: 'كل عامل مرّ بفحص هوية صارم وموافقة الأدمن قبل القبول في المنصة', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
                  { icon: Shield, title: 'دفع آمن', desc: 'الطلب يكتمل فقط بعد تأكيد العميل استلام الخدمة — لا خسارة لأي طرف', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
                  { icon: Star, title: 'تقييم شفاف', desc: 'كل طلب ينتهي بتقييم حقيقي يبني سمعة العامل ويساعدك باختيار الأفضل', color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
                  { icon: MessageCircle, title: 'محادثة محمية', desc: 'تواصل مباشر مع العامل داخل المنصة — لا تشارك أرقامك مع أحد', color: 'text-pink-400', bg: 'bg-pink-500/10 border-pink-500/20' },
                  { icon: Zap, title: 'سرعة الرد', desc: 'العمال المتاحون يشوفون طلبك فوراً ويقبلون في دقائق', color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/20' },
                ].map(({ icon: Icon, title, desc, color, bg }) => (
                  <div key={title} className={`bg-[#0d0d0d] border rounded-2xl p-6 hover:border-zinc-600 transition-all ${bg.split(' ')[1]}`}>
                    <div className={`w-10 h-10 rounded-xl ${bg} border flex items-center justify-center mb-4`}>
                      <Icon size={19} className={color} />
                    </div>
                    <h3 className="font-semibold mb-2 text-lg">{title}</h3>
                    <p className="text-zinc-500 text-sm leading-relaxed">{desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* TRUST */}
        {activeTab === 'trust' && (
          <section className="min-h-[calc(100vh-56px)] py-20 px-4">
            <div className="max-w-5xl mx-auto">
              <div className="text-center mb-14">
                <h2 className="text-4xl font-black mb-3">الثقة والأمان</h2>
                <p className="text-zinc-500 max-w-lg mx-auto">في المملكة، الثقة هي الأساس. كل عامل يمر بتحقق من الهوية الوطنية وفحص AI صارم.</p>
              </div>
              <div className="grid lg:grid-cols-2 gap-10 items-start">
                <div className="space-y-2.5">
                  {TRUST.map(t => (
                    <div key={t} className="flex items-center gap-4 bg-[#0d0d0d] border border-zinc-800 rounded-xl px-5 py-4 hover:border-zinc-700 transition-all">
                      <div className="w-6 h-6 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center flex-shrink-0">
                        <CheckCircle size={13} className="text-emerald-500" />
                      </div>
                      <span className="text-sm text-zinc-300">{t}</span>
                    </div>
                  ))}
                </div>
                <div className="space-y-4">
                  <div className="bg-[#0d0d0d] border border-zinc-800 rounded-2xl p-6">
                    <h3 className="font-bold text-lg mb-3 flex items-center gap-2"><Shield size={18} className="text-emerald-500" /> تحقق الهوية</h3>
                    <p className="text-zinc-500 text-sm leading-relaxed">كل عامل يرفع صورة هويته الوطنية أو إقامته، والذكاء الاصطناعي يتحقق من صحتها قبل القبول.</p>
                  </div>
                  <div className="bg-[#0d0d0d] border border-zinc-800 rounded-2xl p-6">
                    <h3 className="font-bold text-lg mb-3 flex items-center gap-2"><Shield size={18} className="text-amber-500" /> حماية الدفع</h3>
                    <p className="text-zinc-500 text-sm leading-relaxed">لا يكتمل الطلب إلا بعد تأكيد العميل استلام الخدمة — نظام Escrow يحمي الطرفين.</p>
                  </div>
                  <div className="bg-[#0d0d0d] border border-zinc-800 rounded-2xl p-6">
                    <h3 className="font-bold text-lg mb-3 flex items-center gap-2"><Shield size={18} className="text-blue-500" /> خصوصية التواصل</h3>
                    <p className="text-zinc-500 text-sm leading-relaxed">المحادثة داخل المنصة فقط — فلتر ذكي يمنع مشاركة أرقام الجوال والإيميلات.</p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ABOUT */}
        {activeTab === 'about' && (
          <section className="min-h-[calc(100vh-56px)] py-20 px-4">
            <div className="max-w-3xl mx-auto">
              <div className="text-center mb-16">
                <div className="w-20 h-20 rounded-3xl bg-amber-500 flex items-center justify-center mx-auto mb-6">
                  <span className="text-4xl font-black text-black">أ</span>
                </div>
                <h2 className="text-4xl font-black mb-4">قصتنا</h2>
                <p className="text-zinc-400 text-lg leading-relaxed">منصة سعودية ولدت من فكرة بسيطة</p>
              </div>

              <div className="space-y-8 text-zinc-300 leading-relaxed">
                <div className="bg-[#0d0d0d] border border-zinc-800 rounded-2xl p-8">
                  <h3 className="text-xl font-bold text-white mb-4">من نحن؟</h3>
                  <p className="text-zinc-400 leading-loose">
                    أمرني منصة سعودية هدفها الأول خدمتك — نربطك مع أفضل الأشخاص والخبراء اللي يقدرون ينجزون طلبك بأمان وسرعة. 
                    بدأت الفكرة من مشكلة حقيقية: كيف أجد شخصاً موثوقاً ينجز لي مهمة بسيطة دون خوف أو تعقيد؟
                  </p>
                </div>

                <div className="bg-[#0d0d0d] border border-zinc-800 rounded-2xl p-8">
                  <h3 className="text-xl font-bold text-white mb-4">رسالتنا</h3>
                  <p className="text-zinc-400 leading-loose">
                    نؤمن أن كل شخص يستحق مساعدة سريعة وموثوقة. سواء كنت مشغولاً في العمل أو تحتاج لمهمة بسيطة، أمرني هنا عشانك.
                    هدفنا بناء اقتصاد خدمي قائم على الثقة — حيث يكسب العامل بشرف وينجز العميل بثقة.
                  </p>
                </div>

                <div className="bg-[#0d0d0d] border border-zinc-800 rounded-2xl p-8">
                  <h3 className="text-xl font-bold text-white mb-4">قيمنا</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { emoji: '🤝', title: 'الثقة أولاً', desc: 'كل عامل موثق بهويته الوطنية' },
                      { emoji: '⚡', title: 'السرعة', desc: 'طلبك يوصل للعامل في ثوانٍ' },
                      { emoji: '🛡️', title: 'الأمان', desc: 'فلوسك محمية حتى الإنجاز' },
                      { emoji: '🌟', title: 'الجودة', desc: 'تقييمات حقيقية من عملاء حقيقيين' },
                    ].map(({ emoji, title, desc }) => (
                      <div key={title} className="bg-zinc-900 rounded-xl p-4">
                        <div className="text-2xl mb-2">{emoji}</div>
                        <p className="font-semibold text-white text-sm">{title}</p>
                        <p className="text-zinc-500 text-xs mt-1">{desc}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-8 text-center">
                  <p className="text-amber-300 text-lg font-semibold mb-2">"أمرني وإحنا ننجز"</p>
                  <p className="text-zinc-500 text-sm">شعارنا يقول كل شيء — أنت تطلب وإحنا نوصلك لمن ينجز</p>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* CONTACT */}
        {activeTab === 'contact' && (
          <section className="min-h-[calc(100vh-56px)] py-20 px-4">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-14">
                <h2 className="text-4xl font-black mb-3">تواصل معنا</h2>
                <p className="text-zinc-500">نحن هنا للمساعدة — تواصل معنا بأي طريقة تناسبك</p>
              </div>
              <div className="grid md:grid-cols-2 gap-8">
                {/* Contact info */}
                <div className="space-y-5">
                  <h3 className="font-bold text-lg mb-4">معلومات التواصل</h3>
                  {[
                    { icon: Mail, label: 'البريد الإلكتروني', value: 'support@amerniksa.com', color: 'text-amber-400' },
                    { icon: Phone, label: 'واتساب', value: '+966 5X XXX XXXX', color: 'text-emerald-400' },
                    { icon: MessageCircle, label: 'الدعم المباشر', value: 'متاح ٢٤/٧ عبر الدردشة', color: 'text-blue-400' },
                  ].map(({ icon: Icon, label, value, color }) => (
                    <div key={label} className="flex items-center gap-4 bg-[#0d0d0d] border border-zinc-800 rounded-xl p-4">
                      <div className={`w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center flex-shrink-0`}>
                        <Icon size={18} className={color} />
                      </div>
                      <div>
                        <p className="text-xs text-zinc-500">{label}</p>
                        <p className="font-medium text-white mt-0.5">{value}</p>
                      </div>
                    </div>
                  ))}

                  <div className="bg-[#0d0d0d] border border-zinc-800 rounded-2xl p-5">
                    <h4 className="font-semibold mb-2">ساعات العمل</h4>
                    <div className="space-y-1.5 text-sm text-zinc-400">
                      <div className="flex justify-between"><span>الأحد — الخميس</span><span className="text-white">٨ص — ١١م</span></div>
                      <div className="flex justify-between"><span>الجمعة والسبت</span><span className="text-white">١٠ص — ١٠م</span></div>
                      <div className="flex justify-between"><span>الدعم الآلي</span><span className="text-emerald-400">٢٤/٧</span></div>
                    </div>
                  </div>
                </div>

                {/* Contact form */}
                <div className="bg-[#0d0d0d] border border-zinc-800 rounded-2xl p-6">
                  <h3 className="font-bold text-lg mb-5">أرسل رسالة</h3>
                  {contactSent ? (
                    <div className="text-center py-10">
                      <div className="text-4xl mb-4">✅</div>
                      <h4 className="font-bold text-white mb-2">وصلتنا رسالتك!</h4>
                      <p className="text-zinc-500 text-sm">سنرد عليك خلال 24 ساعة على بريدك الإلكتروني</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {[
                        { k: 'name', label: 'الاسم', ph: 'محمد العتيبي', type: 'text' },
                        { k: 'email', label: 'البريد الإلكتروني', ph: 'example@gmail.com', type: 'email' },
                      ].map(({ k, label, ph, type }) => (
                        <div key={k}>
                          <label className="block text-xs text-zinc-500 mb-1.5">{label}</label>
                          <input type={type} placeholder={ph} value={(contactForm as any)[k]}
                            onChange={e => setContactForm(f => ({ ...f, [k]: e.target.value }))}
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-amber-500/50 transition-colors" />
                        </div>
                      ))}
                      <div>
                        <label className="block text-xs text-zinc-500 mb-1.5">رسالتك</label>
                        <textarea value={contactForm.message} onChange={e => setContactForm(f => ({ ...f, message: e.target.value }))}
                          placeholder="اكتب رسالتك هنا..." rows={4}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-amber-500/50 transition-colors resize-none" />
                      </div>
                      <button onClick={sendContact} disabled={contactLoading || !contactForm.name || !contactForm.email || !contactForm.message}
                        className="w-full bg-amber-500 text-black font-bold py-3 rounded-xl hover:bg-amber-400 transition-colors disabled:opacity-40 flex items-center justify-center gap-2">
                        {contactLoading ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                        إرسال الرسالة
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* SUPPORT */}
        {activeTab === 'support' && (
          <section className="min-h-[calc(100vh-56px)] py-20 px-4">
            <div className="max-w-2xl mx-auto">
              <div className="text-center mb-10">
                <h2 className="text-4xl font-black mb-3">الدعم والمساعدة</h2>
                <p className="text-zinc-500">مساعد أمرني الذكي متاح ٢٤/٧ — اسأله أي شيء</p>
              </div>

              {/* FAQ quick */}
              <div className="grid grid-cols-2 gap-2 mb-6">
                {[
                  'كيف أتابع طلبي؟', 'كيف أنضم كعامل؟',
                  'فيه مشكلة في طلب', 'كيف يتم الدفع؟'
                ].map(q => (
                  <button key={q} onClick={() => {
                    setSupportMsgs(p => [...p, { role: 'user', content: q }])
                    setSupportInput('')
                    // Auto send
                    const msgs: SupportMsg[] = [...supportMsgs, { role: 'user', content: q }]
                    setSupportLoading(true)
                    fetch('https://api.anthropic.com/v1/messages', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        model: 'claude-sonnet-4-20250514', max_tokens: 400,
                        system: SUPPORT_SYSTEM,
                        messages: msgs.map(m => ({ role: m.role, content: m.content }))
                      })
                    }).then(r => r.json()).then(data => {
                      setSupportMsgs(p => [...p, { role: 'assistant', content: data.content?.[0]?.text || 'عذراً، حدث خطأ.' }])
                      setSupportLoading(false)
                    }).catch(() => {
                      setSupportMsgs(p => [...p, { role: 'assistant', content: 'عذراً، حدث خطأ مؤقت.' }])
                      setSupportLoading(false)
                    })
                  }}
                    className="text-right px-4 py-3 bg-[#0d0d0d] border border-zinc-800 hover:border-amber-500/30 rounded-xl text-sm text-zinc-400 hover:text-white transition-all">
                    {q}
                  </button>
                ))}
              </div>

              {/* Chat */}
              <div className="bg-[#0d0d0d] border border-zinc-800 rounded-2xl overflow-hidden">
                <div className="px-4 py-3 border-b border-zinc-800 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                    <Bot size={16} className="text-amber-500" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">مساعد أمرني</p>
                    <div className="flex items-center gap-1.5 text-xs text-emerald-400">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> متاح الآن
                    </div>
                  </div>
                </div>

                <div className="h-80 overflow-y-auto px-4 py-3 space-y-3">
                  {supportMsgs.map((m, i) => (
                    <div key={i} className={`flex items-start gap-2.5 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${m.role === 'assistant' ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-zinc-800'}`}>
                        {m.role === 'assistant' ? <Bot size={13} className="text-amber-500" /> : <span className="text-xs">أ</span>}
                      </div>
                      <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${m.role === 'user' ? 'bg-amber-500 text-black rounded-tr-sm' : 'bg-zinc-800 text-zinc-100 rounded-tl-sm'}`}>
                        {m.content}
                      </div>
                    </div>
                  ))}
                  {supportLoading && (
                    <div className="flex items-start gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                        <Bot size={13} className="text-amber-500" />
                      </div>
                      <div className="bg-zinc-800 rounded-2xl px-4 py-3 flex gap-1">
                        {[0,1,2].map(i => <div key={i} className="w-2 h-2 rounded-full bg-zinc-500 animate-bounce" style={{ animationDelay: `${i*150}ms` }} />)}
                      </div>
                    </div>
                  )}
                </div>

                <div className="px-3 pb-3 border-t border-zinc-800 pt-3">
                  <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 focus-within:border-amber-500/40 transition-colors">
                    <input value={supportInput} onChange={e => setSupportInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendSupport()}
                      placeholder="اكتب سؤالك..." className="flex-1 bg-transparent text-sm outline-none placeholder-zinc-600" />
                    <button onClick={sendSupport} disabled={!supportInput.trim() || supportLoading}
                      className="text-amber-500 hover:text-amber-400 disabled:opacity-30 transition-colors">
                      {supportLoading ? <Loader2 size={17} className="animate-spin" /> : <Send size={17} />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-5 text-center text-sm text-zinc-500">
                للتواصل المباشر: <a href="mailto:support@amerniksa.com" className="text-amber-400 hover:underline">support@amerniksa.com</a>
              </div>
            </div>
          </section>
        )}
      </div>

      {/* PRIVACY */}
      {activeTab === 'privacy' && (
        <section className="min-h-[calc(100vh-56px)] py-20 px-4">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-black mb-3">سياسة الخصوصية والأمان</h2>
              <p className="text-zinc-500">آخر تحديث: يونيو ٢٠٢٦</p>
            </div>
            <div className="space-y-6">
              {[
                {
                  title: '١. جمع البيانات',
                  body: 'نجمع فقط البيانات الضرورية لتشغيل المنصة: الاسم، البريد الإلكتروني، رقم الجوال، وصورة الهوية للعمال. لا نجمع أي بيانات إضافية دون إذنك الصريح.'
                },
                {
                  title: '٢. استخدام البيانات',
                  body: 'بياناتك تُستخدم حصراً لتشغيل الخدمة — التحقق من الهوية، ربط العملاء بالعمال، وإرسال الإشعارات. لا نبيع أي بيانات لأطراف ثالثة.'
                },
                {
                  title: '٣. حماية البيانات',
                  body: 'جميع البيانات مشفرة ومحمية بأعلى معايير الأمان عبر Supabase. المحادثات داخل المنصة فقط ومحمية بفلتر ذكي يمنع تسريب معلومات التواصل الخارجية.'
                },
                {
                  title: '٤. حقوق المستخدم',
                  body: 'يحق لك طلب حذف حسابك وجميع بياناتك في أي وقت عبر التواصل مع support@amerniksa.com. سنُنفذ الطلب خلال 30 يوماً.'
                },
                {
                  title: '٥. ملفات تعريف الارتباط',
                  body: 'نستخدم ملفات الارتباط الضرورية فقط للحفاظ على جلسة تسجيل الدخول. لا نستخدم ملفات تتبع للإعلانات.'
                },
                {
                  title: '٦. الإفصاح القانوني',
                  body: 'قد نُفصح عن بياناتك للجهات القانونية السعودية المختصة إذا طُلب ذلك بموجب أمر قضائي أو للتحقيق في نشاط مشبوه يهدد سلامة المستخدمين.'
                },
              ].map(({ title, body }) => (
                <div key={title} className="bg-[#0d0d0d] border border-zinc-800 rounded-2xl p-6">
                  <h3 className="font-bold text-white mb-3">{title}</h3>
                  <p className="text-zinc-400 text-sm leading-relaxed">{body}</p>
                </div>
              ))}
              <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-6 text-center">
                <p className="text-emerald-400 font-semibold mb-1">التزامنا بحماية خصوصيتك</p>
                <p className="text-zinc-500 text-sm">أمرني ملتزمة بأنظمة حماية البيانات في المملكة العربية السعودية</p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* TERMS */}
      {activeTab === 'terms' && (
        <section className="min-h-[calc(100vh-56px)] py-20 px-4">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-black mb-3">الشروط والأحكام</h2>
              <p className="text-zinc-500">يُرجى قراءة هذه الشروط بعناية قبل استخدام المنصة</p>
            </div>
            <div className="space-y-6">
              {[
                {
                  title: '١. طبيعة المنصة',
                  body: 'أمرني منصة وسيطة تربط العملاء بمقدمي الخدمات (العمال) فحسب. المنصة لا تُقدّم الخدمات بنفسها ولا توظّف العمال مباشرة. العلاقة التعاقدية تنشأ بين العميل والعامل مباشرة.'
                },
                {
                  title: '٢. إخلاء مسؤولية المنصة',
                  body: 'أمرني غير مسؤولة عن: جودة الخدمة المُقدَّمة، أي احتيال أو تقصير من أي طرف، الأضرار المباشرة أو غير المباشرة الناتجة عن التعاملات بين المستخدمين، أو أي نزاعات تنشأ خارج المنصة.'
                },
                {
                  title: '٣. التزامات العميل',
                  body: 'يلتزم العميل بتقديم طلبات مشروعة ومتوافقة مع الأنظمة السعودية، وعدم مشاركة معلومات تواصل خارج المنصة، وتأكيد استلام الخدمة بصدق قبل إغلاق الطلب.'
                },
                {
                  title: '٤. التزامات العامل',
                  body: 'يلتزم العامل بتقديم بيانات صحيحة عند التسجيل، والالتزام بتنفيذ الطلبات المقبولة، وعدم التواصل مع العملاء خارج المنصة، ودفع عمولة 2% من قيمة كل طلب مكتمل.'
                },
                {
                  title: '٥. المحتوى المحظور',
                  body: 'يُحظر تقديم أو طلب أي خدمة تتعلق بـ: المواد المخدرة، الكحول، المحتوى الجنسي، الأسلحة، القمار، الاحتيال، أو أي نشاط مخالف للأنظمة السعودية. المخالفة تستوجب الحذف الفوري وقد تُحال للجهات المختصة.'
                },
                {
                  title: '٦. النزاعات',
                  body: 'في حال نشوء نزاع بين طرفين، تسعى أمرني للوساطة بحسن نية دون أي التزام قانوني بحلّه. يحق لكل طرف اللجوء للجهات القضائية السعودية المختصة.'
                },
                {
                  title: '٧. الملكية الفكرية',
                  body: 'جميع محتويات المنصة (التصميم، الكود، العلامة التجارية) ملك حصري لأمرني. يُحظر نسخها أو استخدامها دون إذن خطي مسبق.'
                },
                {
                  title: '٨. التعديلات',
                  body: 'تحتفظ أمرني بحق تعديل هذه الشروط في أي وقت. سيتم إشعار المستخدمين بأي تغييرات جوهرية عبر البريد الإلكتروني أو الإشعارات داخل التطبيق.'
                },
                {
                  title: '٩. القانون المطبّق',
                  body: 'تخضع هذه الشروط لأنظمة المملكة العربية السعودية وتُفسَّر وفقاً لها. أي نزاع يخضع للاختصاص القضائي في المملكة العربية السعودية.'
                },
              ].map(({ title, body }) => (
                <div key={title} className="bg-[#0d0d0d] border border-zinc-800 rounded-2xl p-6">
                  <h3 className="font-bold text-white mb-3">{title}</h3>
                  <p className="text-zinc-400 text-sm leading-relaxed">{body}</p>
                </div>
              ))}
              <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-6">
                <p className="text-amber-400 font-semibold mb-2">بالتسجيل في أمرني أنت توافق على جميع هذه الشروط</p>
                <p className="text-zinc-500 text-sm">للاستفسار: <a href="mailto:support@amerniksa.com" className="text-amber-400 hover:underline">support@amerniksa.com</a></p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="border-t border-zinc-900 py-8 px-4">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-amber-500 flex items-center justify-center text-xs font-black text-black">أ</div>
            <span className="text-zinc-400 text-sm font-bold">أمرني</span>
          </div>
          <p className="text-zinc-600 text-xs">© ٢٠٢٦ أمرني — جميع الحقوق محفوظة</p>
          <div className="flex items-center gap-4 text-xs text-zinc-600">
            {TABS.slice(1).map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id as Tab)} className="hover:text-zinc-300 transition-colors">{t.label}</button>
            ))}
          </div>
        </div>
      </footer>
    </div>
  )
}
