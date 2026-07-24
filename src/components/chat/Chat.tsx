import { useState, useEffect, useRef } from 'react'
import { Send, Loader2, Shield, Image, Mic, MicOff, X } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { filterContent } from '../../lib/contentFilter'
import { useAuth } from '../../contexts/AuthContext'

const BLOCKED_PATTERNS = [
  /(\+966|00966|966)/,
  /(05\d[\s\-.]?\d{3}[\s\-.]?\d{4})/,
  /\d[\s\-.]?\d[\s\-.]?\d[\s\-.]?\d[\s\-.]?\d[\s\-.]?\d[\s\-.]?\d/,
  /[\w.+\-]+\s*@\s*[\w.\-]+\.\w{2,}/,
  /wa\.me|whatsapp|واتس|واتساب/i,
  /telegram|تيليجرام|تلغرام|t\.me/i,
  /snapchat|سناب/i,
  /instagram|انستا/i,
  /twitter|تويتر|x\.com/i,
  /تيك\s*توك|tiktok/i,
  /تواصل\s*معي\s*على|كلمني\s*على|راسلني\s*على/i,
  /call\s*me|contact\s*me/i,
]

interface Msg {
  id: string
  sender_id: string
  content: string
  is_system: boolean
  created_at: string
  image_url?: string
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
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [recording, setRecording] = useState(false)
  const [recordSeconds, setRecordSeconds] = useState(0)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [audioURL, setAudioURL] = useState<string | null>(null)
  const endRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const mediaRef = useRef<MediaRecorder | null>(null)
  const timerRef = useRef<any>(null)

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
    const { data, error } = await supabase
      .from('task_messages')
      .select('id, sender_id, content, is_system_message, is_filtered, created_at')
      .eq('task_id', taskId)
      .order('created_at')
    if (error) console.error('fetchMsgs error:', error)
    setMsgs((data || []).map((m: any) => ({
      id: m.id,
      sender_id: m.sender_id,
      content: m.is_filtered ? 'تم حذف هذه الرسالة' : m.content,
      is_system: m.is_system_message || false,
      created_at: m.created_at,
    })))
  }

  // رفع صورة إلى Supabase Storage
  const uploadImage = async (file: File): Promise<string | null> => {
    const ext = file.name.split('.').pop()
    const path = `chat/${taskId}/${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('chat-media').upload(path, file)
    if (error) {
      console.error('upload error:', error)
      setBlocked('فشل رفع الصورة — تحقق من الاتصال وحاول مجدداً')
      setTimeout(() => setBlocked(''), 4000)
      return null
    }
    const { data } = supabase.storage.from('chat-media').getPublicUrl(path)
    return data.publicUrl
  }

  // رفع تسجيل صوتي
  const uploadAudio = async (blob: Blob): Promise<string | null> => {
    const path = `chat/${taskId}/${Date.now()}.webm`
    const { error } = await supabase.storage.from('chat-media').upload(path, blob, { contentType: 'audio/webm' })
    if (error) {
      console.error('audio upload error:', error)
      setBlocked('فشل رفع التسجيل الصوتي — حاول مجدداً')
      setTimeout(() => setBlocked(''), 4000)
      return null
    }
    const { data } = supabase.storage.from('chat-media').getPublicUrl(path)
    return data.publicUrl
  }

  const send = async () => {
    if (!user || sending) return
    const text = input.trim()

    // فلتر المحتوى — نص فقط، الصور والصوت تمر مباشرة
    if (text) {
      const isBlocked = BLOCKED_PATTERNS.some(p => p.test(text))
      if (isBlocked) {
        setBlocked('لا يمكن مشاركة بيانات التواصل — التواصل داخل المنصة فقط')
        setTimeout(() => setBlocked(''), 4000)
        return
      }
      const contentCheck = filterContent(text)
      if (contentCheck.blocked) {
        setBlocked(contentCheck.reason)
        setTimeout(() => setBlocked(''), 5000)
        return
      }
    }

    if (!text && !imageFile && !audioBlob) return

    setSending(true)
    setInput('')

    // إرسال صورة
    if (imageFile) {
      const url = await uploadImage(imageFile)
      if (url) {
        await supabase.from('task_messages').insert({
          task_id: taskId, sender_id: user.id,
          content: url, is_system_message: false,
        })
      }
      setImageFile(null); setImagePreview(null)
    }

    // إرسال تسجيل صوتي
    if (audioBlob) {
      const url = await uploadAudio(audioBlob)
      if (url) {
        await supabase.from('task_messages').insert({
          task_id: taskId, sender_id: user.id,
          content: `🎤 ${url}`, is_system_message: false,
        })
      }
      setAudioBlob(null); setAudioURL(null)
    }

    // إرسال نص
    if (text) {
      await supabase.from('task_messages').insert({
        task_id: taskId, sender_id: user.id,
        content: text, is_system_message: false,
      })
    }

    setSending(false)
  }

  // اختيار صورة
  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { setBlocked('الحجم الأقصى للصورة 5 ميجا'); setTimeout(() => setBlocked(''), 3000); return }
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  // تسجيل صوتي
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mr = new MediaRecorder(stream)
      const chunks: BlobPart[] = []
      mr.ondataavailable = e => chunks.push(e.data)
      mr.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' })
        setAudioBlob(blob)
        setAudioURL(URL.createObjectURL(blob))
        stream.getTracks().forEach(t => t.stop())
      }
      mr.start()
      mediaRef.current = mr
      setRecording(true)
      setRecordSeconds(0)
      timerRef.current = setInterval(() => setRecordSeconds(s => s + 1), 1000)
    } catch { setBlocked('لا يمكن الوصول للميكروفون'); setTimeout(() => setBlocked(''), 3000) }
  }

  const stopRecording = () => {
    mediaRef.current?.stop()
    setRecording(false)
    clearInterval(timerRef.current)
  }

  const formatTime = (s: number) => `${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`

  const isImage = (content: string) => /\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(content) && !content.startsWith('🎤')
  const isAudio = (content: string) => content.startsWith('🎤 ')

  return (
    <div className="flex flex-col bg-white border border-slate-200 rounded-2xl overflow-hidden h-[420px] sm:h-[520px] shadow-sm">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50">
        <div>
          <p className="text-sm font-bold text-slate-900">{taskTitle}</p>
          <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-0.5">
            <Shield size={10} className="text-secondary-500" /> محادثة محمية — التواصل داخل المنصة فقط
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2 bg-slate-50/30">
        {msgs.length === 0 && (
          <p className="text-center text-slate-400 text-sm py-10">ابدأ المحادثة</p>
        )}
        {msgs.map(m => {
          const isMe = m.sender_id === user?.id

          if (m.is_system) return (
            <div key={m.id} className="flex justify-center">
              <span className="text-xs text-slate-500 bg-white border border-slate-200 rounded-full px-3 py-1 max-w-xs text-center shadow-sm">{m.content}</span>
            </div>
          )

          return (
            <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className="max-w-[75%]">
                {isImage(m.content) ? (
                  <img src={m.content} alt="صورة" loading="lazy" className="rounded-2xl max-w-full max-h-48 object-cover border border-slate-200 shadow-sm" />
                ) : isAudio(m.content) ? (
                  <div className={`rounded-2xl px-3 py-2.5 ${isMe ? 'bg-primary-500' : 'bg-white border border-slate-200'}`}>
                    <audio src={m.content.replace('🎤 ', '')} controls className="h-8 max-w-[200px]" />
                  </div>
                ) : (
                  <div className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm ${
                    isMe
                      ? 'bg-primary-500 text-white'
                      : 'bg-white border border-slate-200 text-slate-800'
                  }`}>
                    {m.content}
                  </div>
                )}
                <p className={`text-[10px] mt-1 text-slate-400 ${isMe ? 'text-left' : 'text-right'}`}>
                  {new Date(m.created_at).toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          )
        })}
        <div ref={endRef} />
      </div>

      {/* Image preview */}
      {imagePreview && (
        <div className="mx-3 mb-2 relative inline-flex">
          <img src={imagePreview} alt="" className="h-16 w-16 object-cover rounded-xl border border-slate-200" />
          <button onClick={() => { setImagePreview(null); setImageFile(null) }}
            className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs" aria-label="إغلاق">
            <X size={10} />
          </button>
        </div>
      )}

      {/* Audio preview */}
      {audioURL && !recording && (
        <div className="mx-3 mb-2 flex items-center gap-2 bg-primary-50 border border-primary-200 rounded-xl px-3 py-2">
          <audio src={audioURL} controls className="h-8 flex-1" />
          <button onClick={() => { setAudioBlob(null); setAudioURL(null) }} className="text-red-400 hover:text-red-500" aria-label="إغلاق">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Recording indicator */}
      {recording && (
        <div className="mx-3 mb-2 flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">
          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span className="text-sm text-red-500 font-bold">{formatTime(recordSeconds)}</span>
          <span className="text-xs text-red-400">جاري التسجيل...</span>
        </div>
      )}

      {/* Blocked warning */}
      {blocked && (
        <div className="mx-3 mb-2 px-3 py-2 bg-red-50 border border-red-200 rounded-xl text-sm text-red-500">
          ⛔ {blocked}
        </div>
      )}

      {/* Input bar */}
      <div className="px-3 pb-3 pt-2 bg-white border-t border-slate-100">
        <div className={`flex items-center gap-2 bg-slate-50 border rounded-2xl px-3 py-2.5 transition-colors ${blocked ? 'border-red-300' : 'border-slate-200 focus-within:border-primary-400'}`}>
          {/* Image upload */}
          <input ref={fileRef} type="file" accept="image/*" onChange={onFileChange} className="hidden" />
          <button onClick={() => fileRef.current?.click()} title="إرفاق صورة" aria-label="إرفاق صورة"
            className="text-slate-400 hover:text-primary-500 transition-colors flex-shrink-0">
            <Image size={18} />
          </button>

          {/* Voice recording */}
          <button onClick={recording ? stopRecording : startRecording}
            title={recording ? 'إيقاف التسجيل' : 'تسجيل صوتي'}
            aria-label={recording ? 'إيقاف التسجيل الصوتي' : 'بدء تسجيل صوتي'}
            className={`flex-shrink-0 transition-colors ${recording ? 'text-red-500 animate-pulse' : 'text-slate-400 hover:text-primary-500'}`}>
            {recording ? <MicOff size={18} /> : <Mic size={18} />}
          </button>

          <input
            value={input}
            onChange={e => { setInput(e.target.value); if(blocked) setBlocked('') }}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
            placeholder="اكتب رسالة..."
            aria-label="اكتب رسالة"
            className="flex-1 bg-transparent text-sm outline-none placeholder-slate-400 text-slate-900"
          />

          <button onClick={send}
            disabled={(!input.trim() && !imageFile && !audioBlob) || sending}
            aria-label="إرسال الرسالة"
            className="bg-primary-500 hover:bg-primary-700 disabled:opacity-30 text-white w-8 h-8 rounded-xl flex items-center justify-center transition-colors flex-shrink-0">
            {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
          </button>
        </div>
      </div>
    </div>
  )
}
