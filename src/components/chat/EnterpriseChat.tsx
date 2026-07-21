import { useState, useEffect, useRef } from 'react'
import { Send, Loader2, MessageSquare } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'

interface Props {
  leadId: string
  senderRole: 'company' | 'provider' | 'admin'
}

interface Msg {
  id: string
  sender_id: string | null
  sender_role: string
  content: string
  is_system: boolean
  created_at: string
}

export function EnterpriseChat({ leadId, senderRole }: Props) {
  const { user } = useAuth()
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    supabase.from('enterprise_messages').select('*').eq('lead_id', leadId).order('created_at', { ascending: true })
      .then(({ data }) => { setMessages(data || []); setLoading(false) })

    const ch = supabase.channel(`ent_msg_${leadId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'enterprise_messages', filter: `lead_id=eq.${leadId}` },
        (payload) => setMessages(p => [...p, payload.new as Msg]))
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [leadId])

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const send = async () => {
    const text = input.trim()
    if (!text || sending) return
    setInput('')
    setSending(true)
    const { error } = await supabase.from('enterprise_messages').insert({
      lead_id: leadId, sender_id: user?.id, sender_role: senderRole, content: text
    })
    if (error) setInput(text)
    setSending(false)
  }

  const roleLabel = (r: string) => r === 'company' ? 'المنشأة' : r === 'provider' ? 'المزود' : 'الفريق'
  const roleInitial = (r: string) => r === 'company' ? 'م' : r === 'provider' ? 'خ' : 'أ'
  const roleColor = (r: string) => r === 'company' ? 'bg-primary-600' : r === 'provider' ? 'bg-slate-700' : 'bg-green-600'

  const formatTime = (d: string) => new Date(d).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })

  return (
    <div className="flex flex-col rounded-2xl overflow-hidden border border-slate-200 bg-white shadow-sm" style={{ height: '520px' }} dir="rtl">

      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-3.5 bg-slate-900 border-b border-slate-800">
        <div className="w-8 h-8 rounded-full bg-primary-500 flex items-center justify-center flex-shrink-0">
          <MessageSquare size={15} className="text-white" />
        </div>
        <div>
          <p className="text-white font-bold text-sm">المحادثة المباشرة</p>
          <p className="text-slate-400 text-xs">بين المنشأة والمزود</p>
        </div>
        <div className="mr-auto flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-green-400 text-xs font-medium">متصل</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-slate-50">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 size={24} className="animate-spin text-primary-300" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mb-3">
              <MessageSquare size={24} className="text-slate-300" />
            </div>
            <p className="text-slate-400 font-medium text-sm">لا توجد رسائل بعد</p>
            <p className="text-slate-300 text-xs mt-1">ابدأ المحادثة مع المزود</p>
          </div>
        ) : messages.map((m, i) => {
          const mine = m.sender_role === senderRole
          const prev = messages[i - 1]
          const showDate = !prev || new Date(m.created_at).toDateString() !== new Date(prev.created_at).toDateString()

          if (m.is_system) return (
            <div key={m.id} className="flex justify-center">
              <span className="text-xs bg-white border border-slate-200 text-slate-500 px-4 py-1.5 rounded-full shadow-sm">
                {m.content}
              </span>
            </div>
          )

          return (
            <div key={m.id}>
              {showDate && (
                <div className="flex justify-center mb-3">
                  <span className="text-xs bg-slate-200 text-slate-500 px-3 py-1 rounded-full">
                    {new Date(m.created_at).toLocaleDateString('ar-SA', { weekday: 'long', month: 'long', day: 'numeric' })}
                  </span>
                </div>
              )}
              <div className={`flex items-end gap-2 ${mine ? 'flex-row-reverse' : 'flex-row'}`}>
                {/* Avatar */}
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-black flex-shrink-0 mb-0.5 ${roleColor(m.sender_role)}`}>
                  {roleInitial(m.sender_role)}
                </div>
                {/* Bubble */}
                <div className={`max-w-[70%] ${mine ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                  {!mine && (
                    <p className="text-xs text-slate-400 font-medium px-1">{roleLabel(m.sender_role)}</p>
                  )}
                  <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                    mine
                      ? 'bg-primary-600 text-white rounded-br-sm shadow-sm'
                      : 'bg-white text-slate-800 border border-slate-200 rounded-bl-sm shadow-sm'
                  }`}>
                    {m.content}
                  </div>
                  <p className={`text-xs text-slate-400 px-1 ${mine ? 'text-right' : 'text-left'}`}>
                    {formatTime(m.created_at)}
                  </p>
                </div>
              </div>
            </div>
          )
        })}
        <div ref={endRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 bg-white border-t border-slate-100 flex items-center gap-2.5">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
          placeholder="اكتب رسالتك هنا..."
          className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary-300 transition-all"
        />
        <button onClick={send} disabled={!input.trim() || sending}
          className="bg-primary-600 hover:bg-primary-700 text-white w-10 h-10 rounded-xl flex items-center justify-center disabled:opacity-40 transition-colors shadow-sm flex-shrink-0">
          {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
        </button>
      </div>
    </div>
  )
}
