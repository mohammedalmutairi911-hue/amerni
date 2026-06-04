import { useState, useEffect, useRef } from 'react'
import { Send, Loader2, Shield } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'

const BLOCKED_PATTERNS = [
  /(\+966|00966|05\d{8})/,
  /[\w.-]+@[\w.-]+\.\w{2,}/,
  /wa\.me|whatsapp|واتساب|telegram|t\.me/i
]

interface Msg {
  id: string
  sender_id: string
  content: string
  is_system: boolean
  created_at: string
  sender_name?: string
}

interface Props {
  taskId: string
  taskTitle: string
}

export function Chat({ taskId, taskTitle }: Props) {
  const { user } = useAuth()
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [blocked, setBlocked] = useState('')
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchMsgs()
    const ch = supabase.channel(`chat-${taskId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'task_messages', filter: `task_id=eq.${taskId}` },
        () => fetchMsgs())
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [taskId])

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [msgs])

  const fetchMsgs = async () => {
    const { data } = await supabase
      .from('task_messages')
      .select('*, profiles(full_name)')
      .eq('task_id', taskId)
      .order('created_at')
    setMsgs((data || []).map((m: any) => ({
      id: m.id, sender_id: m.sender_id, content: m.content,
      is_system: m.is_blocked || false, created_at: m.created_at,
      sender_name: m.profiles?.full_name
    })))
  }

  const send = async () => {
    const text = input.trim()
    if (!text || !user || sending) return
    setInput('')

    // Check blocked patterns
    const isBlocked = BLOCKED_PATTERNS.some(p => p.test(text))
    if (isBlocked) {
      setBlocked('⛔ لا يمكن مشاركة بيانات التواصل — التواصل داخل المنصة فقط')
      setTimeout(() => setBlocked(''), 4000)
      // Save as blocked
      await supabase.from('blocked_messages').insert({ task_id: taskId, sender_id: user.id, content: text, reason: 'contact_info' }).catch(() => {})
      return
    }

    setSending(true)
    await supabase.from('task_messages').insert({
      task_id: taskId, sender_id: user.id, content: text, is_blocked: false
    })
    setSending(false)
  }

  return (
    <div className="flex flex-col bg-[#0d0d0d] border border-zinc-800 rounded-2xl overflow-hidden h-[500px]">
      {/* Header */}
      <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">{taskTitle}</p>
          <div className="flex items-center gap-1.5 text-xs text-zinc-500 mt-0.5">
            <Shield size={11} className="text-emerald-500" /> محمية — لا تشارك أرقام أو روابط
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {msgs.length === 0 && (
          <p className="text-center text-zinc-600 text-sm py-8">ابدأ المحادثة مع العميل</p>
        )}
        {msgs.map(m => {
          const isMe = m.sender_id === user?.id
          if (m.is_system) return (
            <div key={m.id} className="flex justify-center">
              <span className="text-xs text-zinc-600 bg-zinc-900 border border-zinc-800 rounded-full px-3 py-1 max-w-xs text-center">{m.content}</span>
            </div>
          )
          return (
            <div key={m.id} className={`flex ${isMe ? 'justify-start' : 'justify-end'}`}>
              <div className="max-w-[75%]">
                {!isMe && <p className="text-xs text-zinc-500 mb-1">{m.sender_name}</p>}
                <div className={`rounded-2xl px-4 py-2.5 text-sm ${isMe ? 'bg-zinc-800 text-zinc-100' : 'bg-amber-500 text-black'}`}>
                  {m.content}
                </div>
              </div>
            </div>
          )
        })}
        <div ref={endRef} />
      </div>

      {/* Blocked warning */}
      {blocked && (
        <div className="mx-3 mb-2 px-4 py-2 bg-red-950/40 border border-red-800/50 rounded-xl text-sm text-red-400">
          {blocked}
        </div>
      )}

      {/* Input */}
      <div className="px-3 pb-3">
        <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 focus-within:border-amber-500/40 transition-colors">
          <input
            value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
            placeholder="اكتب رسالة..."
            className="flex-1 bg-transparent text-sm outline-none placeholder-zinc-600"
          />
          <button onClick={send} disabled={!input.trim() || sending}
            className="text-amber-500 hover:text-amber-400 disabled:opacity-30 transition-colors">
            {sending ? <Loader2 size={17} className="animate-spin" /> : <Send size={17} />}
          </button>
        </div>
      </div>
    </div>
  )
}
