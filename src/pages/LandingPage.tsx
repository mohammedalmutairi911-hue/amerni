import { useState, useEffect } from 'react'
import { Sparkles, Shield, CheckCircle, Zap, Users, Star, ArrowLeft, Bot, UserCheck } from 'lucide-react'
import { useApp } from '../contexts/AppContext'
import { useAuth } from '../contexts/AuthContext'

const EXAMPLES = [
  'أبي أحد يتأكد لي إذا المحل مفتوح',
  'أحتاج أحد يجيب غرض من السوق',
  'أبي أحد يصور موقع أو منتج',
  'أحتاج أحد يمر على مكان عني',
  'أبي أحد يوصل شيء',
  'أحتاج أحد يطابق لي معلومة',
]

const STEPS = [
  { n: '١', icon: Sparkles, title: 'اكتب اللي تبيه', desc: 'اكتب طلبك بأي كلام. ما في خيارات أو تصنيفات.' },
  { n: '٢', icon: Zap, title: 'عامل يقبل على طول', desc: 'الطلب يوصل للعمال المناسبين فوراً.' },
  { n: '٣', icon: Users, title: 'تكلمه وتابع', desc: 'محادثة مباشرة تفتح تلقائياً. يرفع لك صور التنفيذ.' },
]

const TRUST = [
  'التحقق من الهوية الوطنية السعودية',
  'تحقق AI من صورة الهوية',
  'فلوسك محمية لحين إتمام الشغل (Escrow)',
  'دعم مباشر بالعربي',
  'خصوصيتك محمية وبياناتك سرية',
  'تواصل مباشر مع العامل عبر المحادثة',
  'إشعارات فورية عند تحديث الطلب',
]

const FEATURES = [
  { icon: Bot, title: 'ذكاء اصطناعي', desc: 'اقتراح سعر مناسب، تحقق من الهوية، حماية المحادثة من تبادل الأرقام' },
  { icon: UserCheck, title: 'عمال موثوقون', desc: 'كل عامل مرّ بفحص هوية صارم وموافقة الأدمن قبل القبول' },
  { icon: Shield, title: 'Escrow ذكي', desc: 'الملفات مخفية حتى يتم تأكيد الدفع — مثل Binance P2P' },
  { icon: Star, title: 'تقييم شفاف', desc: 'كل طلب ينتهي بتقييم متبادل يبني سمعة العامل' },
]

export function LandingPage() {
  const { openAuth, navigate } = useApp()
  const { user } = useAuth()
  const [idx, setIdx] = useState(0)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const t = setInterval(() => {
      setVisible(false)
      setTimeout(() => { setIdx(i => (i + 1) % EXAMPLES.length); setVisible(true) }, 300)
    }, 3000)
    return () => clearInterval(t)
  }, [])

  const handleStart = () => user ? navigate('dashboard') : openAuth('signup')

  return (
    <div className="min-h-screen bg-[#080808] text-white">
      {/* Hero */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-4 pt-14 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-amber-500/5 blur-3xl" />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:60px_60px]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,#080808_100%)]" />
        </div>

        <div className="relative max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-full px-4 py-1.5 text-sm text-amber-400 mb-8">
            <Sparkles size={13} /> أمرني — اطلب أي شي في السعودية
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black tracking-tight mb-5 leading-tight">
            <span className="text-white">اطلب</span>{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-500">أي شيء.</span>
            <br />
            <span className="text-white text-4xl sm:text-5xl">ننجزه لك.</span>
          </h1>

          <p className="text-zinc-400 text-lg mb-10">
            منصة سعودية تربطك بعمال موثوقين لإنجاز أي مهمة يومية — بذكاء وأمان.
          </p>

          {/* Input */}
          <div className="relative max-w-xl mx-auto mb-4">
            <div className="flex items-center gap-3 bg-[#111] border border-zinc-800 rounded-2xl px-5 py-4 focus-within:border-amber-500/50 transition-all">
              <Sparkles size={18} className="text-amber-500 flex-shrink-0" />
              <span className={`flex-1 text-right text-zinc-400 text-sm transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}>
                {EXAMPLES[idx]}
              </span>
              <button onClick={handleStart}
                className="bg-amber-500 text-black text-sm font-bold px-4 py-2 rounded-xl hover:bg-amber-400 transition-colors flex-shrink-0">
                اطلب
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="flex justify-center gap-8 mt-12 text-center">
            {[['١٠٬٠٠٠+', 'طلب اتنجز'], ['٢٤٠٠+', 'عامل موثوق'], ['٩٨٪', 'نسبة الرضا']].map(([v, l]) => (
              <div key={l}>
                <div className="text-2xl font-black text-amber-400">{v}</div>
                <div className="text-xs text-zinc-500 mt-0.5">{l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-24 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-full px-4 py-1.5 text-sm text-zinc-400 mb-4">
              كيف تشتغل؟
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold mb-2">بسيطة كالرسالة</h2>
            <p className="text-zinc-500">ثلاث خطوات وخلاص.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {STEPS.map(({ n, icon: Icon, title, desc }, i) => (
              <div key={i} className="bg-[#0d0d0d] border border-zinc-800 rounded-2xl p-7 hover:border-zinc-700 transition-all">
                <div className="text-5xl font-black text-zinc-800 mb-4">{n}</div>
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-4">
                  <Icon size={19} className="text-amber-500" />
                </div>
                <h3 className="font-semibold mb-2">{title}</h3>
                <p className="text-zinc-500 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 px-4 bg-zinc-900/10">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-full px-4 py-1.5 text-sm text-zinc-400 mb-4">
              المميزات
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold mb-2">مختلفون عن الكل</h2>
            <p className="text-zinc-500">ميزات لا تجدها في أي منصة ثانية.</p>
          </div>
          <div className="grid sm:grid-cols-2 gap-5">
            {FEATURES.map(({ icon: Icon, title, desc }, i) => (
              <div key={i} className="bg-[#0d0d0d] border border-zinc-800 rounded-2xl p-6 hover:border-amber-500/30 transition-all">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-4">
                  <Icon size={19} className="text-amber-500" />
                </div>
                <h3 className="font-semibold mb-2">{title}</h3>
                <p className="text-zinc-500 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust */}
      <section id="trust" className="py-24 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-full px-4 py-1.5 text-sm text-zinc-400 mb-6">
                <Shield size={13} className="text-emerald-500" /> الثقة والأمان
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold mb-5 leading-tight">
                مبنية على الثقة.<br />وكل شخص موثوق.
              </h2>
              <p className="text-zinc-500 mb-8 leading-relaxed">
                في المملكة، الثقة هي الأساس. كل عامل يمر بتحقق من الهوية الوطنية وفحص AI صارم قبل ما يقبل أي طلب.
              </p>
              <button onClick={handleStart}
                className="bg-amber-500 text-black font-bold px-6 py-3 rounded-xl hover:bg-amber-400 transition-colors flex items-center gap-2">
                اطلب الآن <ArrowLeft size={16} />
              </button>
            </div>
            <div className="space-y-2.5">
              {TRUST.map(t => (
                <div key={t} className="flex items-center gap-4 bg-[#0d0d0d] border border-zinc-800 rounded-xl px-5 py-3.5">
                  <div className="w-6 h-6 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center flex-shrink-0">
                    <CheckCircle size={13} className="text-emerald-500" />
                  </div>
                  <span className="text-sm text-zinc-300">{t}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-4 bg-zinc-900/10">
        <div className="max-w-xl mx-auto text-center">
          <div className="bg-gradient-to-b from-zinc-900 to-[#0d0d0d] border border-zinc-800 rounded-3xl px-8 py-16">
            <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-full px-4 py-1.5 text-sm text-amber-400 mb-6">
              <Star size={13} fill="currentColor" /> جاهز تطلب؟
            </div>
            <h2 className="text-3xl font-bold mb-4">أي شيء تبيه — اطلبه الحين</h2>
            <p className="text-zinc-500 mb-8">بس اكتب اللي تبيه. ما في تعقيد.</p>
            <div className="flex gap-3 justify-center">
              <button onClick={handleStart}
                className="bg-amber-500 text-black font-bold px-6 py-3 rounded-xl hover:bg-amber-400 transition-colors">
                ابدأ الآن
              </button>
              <button onClick={() => openAuth('signup')}
                className="border border-zinc-700 text-zinc-300 px-6 py-3 rounded-xl hover:border-zinc-600 transition-colors">
                أشتغل معكم
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-900 py-8 px-4 text-center text-zinc-600 text-sm">
        <p>© ٢٠٢٦ أمرني — جميع الحقوق محفوظة</p>
      </footer>
    </div>
  )
}
