import { useState, useEffect, useRef } from 'react'
import { Send, Loader2 } from 'lucide-react'
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

  const fetchMessages = async () => {
    const { data } = await supabase
      .from('enterprise_messages')
      .select('*')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: true })
    setMessages(data || [])
    setLoading(false)
  }

  useEffect(() => {
    fetchMessages()
    // Realtime
    const ch = supabase
      .channel(`ent_msg_${leadId}`)
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
    if (error) setInput(text) // رجّع النص لو فشل
    setSending(false)
  }

  const roleLabel = (r: string) => r === 'company' ? 'المنشأة' : r === 'provider' ? 'المزود' : 'الفريق'

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden flex flex-col h-96" dir="rtl">
      <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50">
        <p className="text-sm font-bold text-slate-700">المحادثة</p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 size={20} className="animate-spin text-primary-300" /></div>
        ) : messages.length === 0 ? (
          <p className="text-center text-slate-300 text-sm py-8">لا توجد رسائل بعد — ابدأ المحادثة</p>
        ) : messages.map(m => {
          const mine = m.sender_role === senderRole
          if (m.is_system) return (
            <div key={m.id} className="text-center">
              <span className="text-xs bg-slate-100 text-slate-500 px-3 py-1 rounded-full">{m.content}</span>
            </div>
          )
          return (
            <div key={m.id} className={`flex ${mine ? 'justify-start' : 'justify-end'}`}>
              <div className={`max-w-[75%] rounded-2xl px-4 py-2 ${mine ? 'bg-primary-500 text-white rounded-tr-sm' : 'bg-slate-100 text-slate-800 rounded-tl-sm'}`}>
                {!mine && <p className="text-xs font-bold mb-0.5 opacity-70">{roleLabel(m.sender_role)}</p>}
                <p className="text-sm leading-relaxed">{m.content}</p>
              </div>
            </div>
          )
        })}
        <div ref={endRef} />
      </div>

      <div className="px-3 py-2.5 border-t border-slate-100 flex items-center gap-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
          placeholder="اكتب رسالتك..."
          className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-300"
        />
        <button onClick={send} disabled={!input.trim() || sending}
          className="bg-primary-500 text-white w-9 h-9 rounded-xl flex items-center justify-center disabled:opacity-40 hover:bg-primary-600 transition-colors">
          {sending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
        </button>
      </div>
    </div>
  )
}
