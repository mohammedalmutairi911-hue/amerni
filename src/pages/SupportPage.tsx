import { useState, useEffect, useRef } from 'react'
import { COMPANY } from '../lib/constants'
import { Send, Loader2, Headphones, ArrowLeft, MessageCircle } from 'lucide-react'
import { useApp } from '../contexts/AppContext'
import { useAuth } from '../contexts/AuthContext'
import { goHome } from '../lib/homePage'

interface Msg {
  role: 'user' | 'assistant'
  content: string
}

// ── نظام الردود الذكية لآمرني ──
const RESPONSES: { keywords: string[]; reply: string }[] = [
  // التسجيل والحساب
  {
    keywords: ['تسجيل','سجل','حساب','اشتراك','انضم','عضوية'],
    reply: 'أهلاً! التسجيل في آمرني سهل ومجاني 😊\n\n▪️ للعملاء: اضغط "سجّل" من الصفحة الرئيسية\n▪️ لمقدمي الخدمة: اضغط "انضم كمقدم خدمة"\n\nما تحتاج سوى بريد إلكتروني أو حساب Google.'
  },
  {
    keywords: ['نسيت','كلمة مرور','باسورد','دخول','تسجيل دخول'],
    reply: 'لإعادة كلمة المرور:\n\n▪️ اضغط "دخول" من الصفحة الرئيسية\n▪️ اختر "نسيت كلمة المرور"\n▪️ أدخل بريدك الإلكتروني وراح يجيك رابط التغيير\n\nإذا ما وصلك البريد تحقق من Spam 📧'
  },
  // الطلبات
  {
    keywords: ['طلب','اطلب','كيف اطلب','سوي طلب','خدمة','ابي'],
    reply: 'لطلب خدمة في آمرني:\n\n١. اضغط "طلب خدمة جديدة" ✏️\n٢. اكتب اللي تبيه بكلامك\n٣. اختر التصنيف والمدينة\n٤. انتظر — مقدم خدمة موثوق يقبل خلال دقائق ⚡\n\nما تحتاج تحدد سعر من البداية، المقدم يقترح السعر بعد ما يشوف الطلب.'
  },
  {
    keywords: ['الغ','الغاء','الغي','ألغ','ألغي'],
    reply: 'إلغاء الطلب:\n\n▪️ لو الطلب "بانتظار مقدم" — تقدر تلغيه مباشرة من تفاصيل الطلب\n▪️ لو قُبل الطلب — تواصل مع مقدم الخدمة في المحادثة أولاً\n▪️ في حالات الطوارئ تقدر ترفع نزاع وفريق آمرني يساعدك\n\nهل تبي مساعدة في طلب معين؟'
  },
  {
    keywords: ['وين طلبي','حالة الطلب','متابعة','تتبع','وصل'],
    reply: 'لمتابعة طلبك:\n\n▪️ روح "طلباتي" من القائمة الرئيسية\n▪️ اضغط على الطلب لتشوف تفاصيله\n▪️ لو الطلب "جاري" تقدر تكلم المقدم مباشرة في المحادثة 💬\n\nإذا ما لقيت طلبك أرسل لي رقم الطلب.'
  },
  // الدفع والأسعار
  {
    keywords: ['دفع','سعر','كم تكلف','فلوس','مبلغ','ريال','رسوم'],
    reply: 'نظام الدفع في آمرني:\n\n▪️ أنت تحدد ميزانيتك المقترحة أو تتركها مفتوحة\n▪️ مقدم الخدمة يقترح السعر النهائي بعد إنجاز العمل\n▪️ أنت توافق على السعر قبل التأكيد النهائي\n▪️ الدفع مباشرة بين العميل والمقدم (كاش أو تحويل)\n\nآمرني تأخذ عمولة 2% فقط من المقدم 💰'
  },
  {
    keywords: ['استرداد','رجوع فلوس','ما ارتاح','راضي','مو راضي'],
    reply: 'إذا ما كنت راضي عن الخدمة:\n\n١. لا تضغط "تأكيد استلام" ❌\n٢. تواصل مع المقدم في المحادثة لحل المشكلة\n٣. لو ما انحلت — اضغط "رفع نزاع"\n٤. فريق آمرني يراجع المحادثة ويتواصل معك خلال 24 ساعة\n\nحقوقك محفوظة — الطلب ما يُغلق إلا بموافقتك ✅'
  },
  // مقدمو الخدمة
  {
    keywords: ['اشتغل','عمل','مقدم','انضم','كسب','دخل','احترافي'],
    reply: 'للانضمام كمقدم خدمة في آمرني:\n\n١. سجّل حساباً واختر "مقدم خدمة"\n٢. أكمل ملفك الشخصي وحدد تخصصاتك\n٣. فريق آمرني يراجع طلبك خلال 24-48 ساعة\n٤. بعد الموافقة تبدأ تستقبل الطلبات مباشرة ⚡\n\nالانضمام مجاني — تدفع عمولة 2% فقط على كل طلب مكتمل.'
  },
  {
    keywords: ['عمولة','نسبة','خصم','موقع يأخذ'],
    reply: 'عمولة آمرني:\n\n▪️ 2% فقط من قيمة كل طلب مكتمل\n▪️ تُدفع خلال 72 ساعة من إتمام الطلب\n▪️ عبر تحويل بنكي لـ IBAN المنصة\n\nمثال: طلب بـ 100 ريال = 2 ريال عمولة فقط 💰'
  },
  // التحقق والأمان
  {
    keywords: ['موثوق','أمان','سرقة','نصب','خوف','ضمان','احتيال'],
    reply: 'آمرني منصة آمنة 100% 🔒\n\n▪️ كل مقدم خدمة موثّق بهويته الوطنية عبر أبشر\n▪️ المحادثات محمية ومراقبة — لا أرقام خارج المنصة\n▪️ الطلب لا يُغلق إلا بموافقتك\n▪️ فريق دعم متاح 24/7 لأي مشكلة\n\nإذا واجهت أي مشكلة راسلنا على support@amerniksa.com'
  },
  // المحادثة
  {
    keywords: ['محادثة','تكلم','تواصل','رسالة','شات'],
    reply: 'المحادثة في آمرني:\n\n▪️ تفتح تلقائياً بعد قبول مقدم الخدمة لطلبك\n▪️ تقدر ترسل نصوص، صور، وتسجيلات صوتية\n▪️ ممنوع مشاركة أرقام الجوال أو وسائل تواصل خارجية — للحماية\n\nإذا ما قدرت ترسل رسالة أرسل لي تفاصيل المشكلة 🙏'
  },
  // الخدمات المتاحة
  {
    keywords: ['خدمات','وش يوفر','ايش','ماذا','نوع','تصنيف'],
    reply: 'خدمات آمرني المتاحة:\n\n🚗 توصيل ومشاوير\n📸 تصوير ومحتوى\n🛍️ تسوق ومشتريات\n📚 تعليم وشرح\n⚖️ استشارات قانونية ومالية\n🎉 تنسيق حفلات وفعاليات\n🤝 مساعدة إدارية\n✏️ ترجمة وتصميم\n\nإذا ما لقيت تصنيف مناسب اختر "أخرى" واكتب طلبك 😊'
  },
  // التطبيق والموقع
  {
    keywords: ['تطبيق','app','موبايل','جوال','تحميل','نزّل'],
    reply: 'آمرني متاح الحين كـ PWA:\n\n▪️ افتح amerniksa.com من متصفحك\n▪️ اضغط على "أضف للشاشة الرئيسية"\n▪️ يشتغل مثل التطبيق بالضبط 📱\n\nتطبيق رسمي قادم قريباً على App Store و Google Play ⚡'
  },
  // الشكاوى
  {
    keywords: ['شكوى','مشكلة','خطأ','بلاغ','تقرير'],
    reply: 'نأسف لأي مشكلة واجهتها 🙏\n\nطرق التواصل معنا:\n\n▪️ البريد الإلكتروني: support@amerniksa.com\n▪️ رفع نزاع من تفاصيل الطلب مباشرة\n▪️ هذا الشات للمساعدة الفورية\n\nأخبرني بتفاصيل المشكلة وأساعدك فوراً 👇'
  },
  // السلام والترحيب
  {
    keywords: ['هلا','مرحبا','السلام','هاي','اهلا','صباح','مساء'],
    reply: 'هلا وغلا! 👋 أنا مساعد آمرني.\n\nكيف أقدر أساعدك اليوم؟\n\n▪️ سؤال عن خدمة؟\n▪️ مشكلة في طلب؟\n▪️ تبي تنضم كمقدم خدمة؟\n\nاكتب سؤالك وأنا هنا 😊'
  },
  {
    keywords: ['شكرا','شكراً','ممتاز','زين','تمام','وايد'],
    reply: 'العفو! يسعدنا خدمتك دائماً 😊\n\nإذا احتجت أي مساعدة ثانية أنا هنا.\n\nيوم سعيد ⚡'
  },
]

const DEFAULT_REPLY = 'شكراً على تواصلك مع آمرني 🙏\n\nما فهمت سؤالك بشكل كامل. تقدر:\n\n▪️ تعيد السؤال بطريقة ثانية\n▪️ تتواصل معنا على support@amerniksa.com\n▪️ تبحث في الأسئلة الشائعة أدناه\n\nنحن هنا لمساعدتك دائماً 💙'

function getReply(input: string): string {
  const text = input.toLowerCase()
  for (const { keywords, reply } of RESPONSES) {
    if (keywords.some(k => text.includes(k))) return reply
  }
  return DEFAULT_REPLY
}

const QUICK_QUESTIONS = [
  'كيف أطلب خدمة؟',
  'كيف أنضم كمقدم خدمة؟',
  'ما هي الخدمات المتاحة؟',
  'كيف يعمل نظام الدفع؟',
]

export function SupportPage() {
  const { navigate } = useApp()
  const { profile } = useAuth()
  const [msgs, setMsgs] = useState<Msg[]>([{
    role: 'assistant',
    content: `هلا${profile?.full_name ? ` ${profile.full_name.split(' ')[0]}` : ''}! 👋 أنا مساعد آمرني الذكي.\n\nكيف أقدر أساعدك اليوم؟`
  }])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [msgs])

  const send = (text?: string) => {
    const msg = (text || input).trim()
    if (!msg || loading) return
    setInput('')
    setMsgs(p => [...p, { role: 'user', content: msg }])
    setLoading(true)
    setTimeout(() => {
      setMsgs(p => [...p, { role: 'assistant', content: getReply(msg) }])
      setLoading(false)
    }, 700)
  }

  return (
    <div className="min-h-screen bg-slate-50 pt-14 px-4 py-6 font-sans">
      <div className="max-w-xl mx-auto">
        <button onClick={() => goHome(navigate, profile)} className="flex items-center gap-1.5 text-slate-400 hover:text-slate-900 text-sm mb-4 transition-colors">
          ← رجوع
        </button>

        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden flex flex-col shadow-sm" style={{ height: '72vh' }}>
          {/* Header */}
          <div className="px-4 py-3 border-b border-slate-200 bg-primary-500 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
              <Headphones size={18} className="text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">دعم آمرني</p>
              <div className="flex items-center gap-1.5 text-xs text-blue-100">
                <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" /> متاح ٢٤/٧
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            {msgs.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {m.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0 mr-2 mt-1">
                    <MessageCircle size={13} className="text-primary-500" />
                  </div>
                )}
                <div className={`max-w-[78%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-line ${
                  m.role === 'user'
                    ? 'bg-primary-500 text-white rounded-tr-sm'
                    : 'bg-slate-100 text-slate-800 rounded-tl-sm'
                }`}>
                  {m.content}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="w-7 h-7 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0 mr-2">
                  <MessageCircle size={13} className="text-primary-500" />
                </div>
                <div className="bg-slate-100 rounded-2xl rounded-tl-sm px-4 py-3 flex gap-1.5 items-center">
                  <div className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}

            {/* Quick questions - show only at start */}
            {msgs.length === 1 && (
              <div className="space-y-2 pt-2">
                <p className="text-xs text-slate-400 text-center">أسئلة شائعة</p>
                {QUICK_QUESTIONS.map(q => (
                  <button key={q} onClick={() => send(q)}
                    className="w-full text-right text-sm text-primary-500 bg-primary-50 border border-primary-100 px-4 py-2.5 rounded-xl hover:bg-primary-100 transition-colors">
                    {q} ←
                  </button>
                ))}
              </div>
            )}

            <div ref={endRef} />
          </div>

          {/* Input */}
          <div className="px-3 pb-3 pt-2 border-t border-slate-100">
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus-within:border-primary-400 transition-colors">
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && send()}
                placeholder="اكتب سؤالك هنا..."
                className="flex-1 bg-transparent text-sm outline-none placeholder-slate-400 text-slate-900"
              />
              <button onClick={() => send()} disabled={!input.trim() || loading}
                className="bg-primary-500 hover:bg-primary-700 disabled:opacity-30 text-white w-8 h-8 rounded-xl flex items-center justify-center transition-colors flex-shrink-0">
                {loading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              </button>
            </div>
            <p className="text-[10px] text-slate-300 text-center mt-2">{COMPANY.email}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
