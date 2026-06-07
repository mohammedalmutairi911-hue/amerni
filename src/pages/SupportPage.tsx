import { useState, useEffect, useRef } from 'react'
import { Send, Loader2, Bot, User, Headphones, ArrowLeft } from 'lucide-react'
import { useApp } from '../contexts/AppContext'
import { useAuth } from '../contexts/AuthContext'

interface Msg {
  role: 'user' | 'assistant'
  content: string
}

const SYSTEM = `أنت مساعد خدمة عملاء لمنصة "أمرني" — منصة سعودية لطلب الخدمات.
رد باللهجة السعودية العامية بشكل ودود ومختصر.
إذا سألوا عن شيء مو موجود في معرفتك قل: "سيتواصل معك أحد من الفريق قريباً".
أمرني تتيح: طلب خدمات يومية، عمال موثوقين بهوية، دفع آمن، دعم ذكي.`

export function SupportPage() {
  const { navigate } = useApp()
  const { profile } = useAuth()
  const [msgs, setMsgs] = useState<Msg[]>([{
    role: 'assistant',
    content: `أهلاً${profile?.full_name ? ` ${profile.full_name.split(' ')[0]}` : ''}! 👋 أنا مساعد أمرني. كيف أقدر أساعدك؟`
  }])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [msgs])

  const send = async () => {
    const text = input.trim()
    if (!text || loading) return
    setInput('')
    const newMsgs: Msg[] = [...msgs, { role: 'user', content: text }]
    setMsgs(newMsgs)
    setLoading(true)

    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 400,
          system: SYSTEM,
          messages: newMsgs.map(m => ({ role: m.role, content: m.content })).slice(-10)
        })
      })
      if (res.ok) {
        const data = await res.json()
        const reply = data.content?.[0]?.text || 'عذراً، ما قدرت أساعدك الحين. سيتواصل معك الفريق قريباً.'
        setMsgs(p => [...p, { role: 'assistant', content: reply }])
      } else {
        setMsgs(p => [...p, { role: 'assistant', content: 'عذراً، حدث خطأ مؤقت. سيتواصل معك الفريق قريباً.' }])
      }
    } catch {
      setMsgs(p => [...p, { role: 'assistant', content: 'عذراً، ما قدرت أتصل بالسيرفر. تواصل معنا على support@amerniksa.com' }])
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-[#080808] pt-14 px-4 py-6">
      <div className="max-w-xl mx-auto">
        <button onClick={() => navigate('dashboard')} className="flex items-center gap-1.5 text-zinc-500 hover:text-white text-sm mb-4 transition-colors">
          <ArrowLeft size={14} /> رجوع
        </button>

        <div className="bg-[#0d0d0d] border border-zinc-800 rounded-2xl overflow-hidden flex flex-col" style={{ height: '70vh' }}>
          {/* Header */}
          <div className="px-4 py-3 border-b border-zinc-800 bg-zinc-900/50 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <Headphones size={16} className="text-amber-500" />
            </div>
            <div>
              <p className="text-sm font-semibold">دعم أمرني</p>
              <div className="flex items-center gap-1.5 text-xs text-emerald-400">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> متاح ٢٤/٧
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            {msgs.map((m, i) => (
              <div key={i} className={`flex items-start gap-2.5 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                  m.role === 'assistant' ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-zinc-800'
                }`}>
                  {m.role === 'assistant' ? <Bot size={14} className="text-amber-500" /> : <User size={14} className="text-zinc-400" />}
                </div>
                <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  m.role === 'user' ? 'bg-amber-500 text-black rounded-tr-sm' : 'bg-zinc-800 text-zinc-100 rounded-tl-sm'
                }`}>
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex items-start gap-2.5">
                <div className="w-7 h-7 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                  <Bot size={14} className="text-amber-500" />
                </div>
                <div className="bg-zinc-800 rounded-2xl rounded-tl-sm px-4 py-3 flex gap-1">
                  {[0,1,2].map(i => (
                    <div key={i} className="w-2 h-2 rounded-full bg-zinc-500 animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          {/* Input */}
          <div className="px-3 pb-3">
            <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 focus-within:border-amber-500/40 transition-colors">
              <input
                value={input} onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
                placeholder="اكتب رسالتك..."
                className="flex-1 bg-transparent text-sm outline-none placeholder-zinc-600"
              />
              <button onClick={send} disabled={!input.trim() || loading}
                className="text-amber-500 hover:text-amber-400 disabled:opacity-30 transition-colors">
                {loading ? <Loader2 size={17} className="animate-spin" /> : <Send size={17} />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
