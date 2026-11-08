import { useState } from 'react'
import { createPortal } from 'react-dom'
import { X, Paperclip, MapPin, ExternalLink, ImageOff } from 'lucide-react'

// تصنيف محتوى رسالة المحادثة — نفس الصيغ المخزنة من قبل تبقى تشتغل:
//   صورة  : رابط chat-media ينتهي بامتداد صورة
//   صوت   : "🎤 " + رابط
//   ملف   : رابط chat-media بامتداد غير صورة، واسم الملف الأصلي بعد # (اختياري)
//   موقع  : رابط قوقل ماب (يُرسل من زر الموقع أو يُلصق)
//   نص    : غير ذلك

export type MsgKind =
  | { kind: 'image'; url: string }
  | { kind: 'audio'; url: string }
  | { kind: 'file'; url: string; name: string }
  | { kind: 'location'; url: string }
  | { kind: 'text'; text: string }

const STORAGE_RE = /^https:\/\/[a-z0-9]+\.supabase\.co\/storage\/v1\/object\/public\/(chat-media|task-files)\/\S+$/i
const IMAGE_EXT_RE = /\.(jpe?g|png|gif|webp|heic|heif|bmp)(\?|#|$)/i
export const MAPS_RE = /^https?:\/\/((www\.|maps\.)?google\.[a-z.]{2,6}\/maps\S*|maps\.app\.goo\.gl\/[\w-]+\S*|goo\.gl\/maps\/[\w-]+\S*|maps\.google\.[a-z.]{2,6}\/\S*)$/i

export function classify(content: string): MsgKind {
  const c = (content || '').trim()
  if (c.startsWith('🎤 ')) return { kind: 'audio', url: c.slice(3).trim() }
  if (STORAGE_RE.test(c)) {
    if (IMAGE_EXT_RE.test(c)) return { kind: 'image', url: c }
    const [url, frag] = c.split('#')
    let name = ''
    try { name = frag ? decodeURIComponent(frag) : '' } catch { name = '' }
    if (!name) name = 'ملف ' + ((url.split('.').pop() || '').toUpperCase())
    return { kind: 'file', url, name }
  }
  if (MAPS_RE.test(c)) return { kind: 'location', url: c }
  return { kind: 'text', text: content }
}

/** نص قصير للقوائم والمعاينات (مثل آخر الرسائل في لوحة الأدمن) */
export function previewText(content: string): string {
  const k = classify(content)
  if (k.kind === 'image') return '📷 صورة'
  if (k.kind === 'audio') return '🎤 رسالة صوتية'
  if (k.kind === 'file') return '📎 ' + k.name
  if (k.kind === 'location') return '📍 موقع على الخريطة'
  return k.text
}

export function MessageBody({ content, isMe, compact }: { content: string; isMe?: boolean; compact?: boolean }) {
  const k = classify(content)
  const [viewer, setViewer] = useState(false)
  const [broken, setBroken] = useState(false)

  if (k.kind === 'image') {
    if (broken) return (
      <a href={k.url} target="_blank" rel="noreferrer"
        className="flex items-center gap-2 rounded-2xl px-3 py-2.5 text-sm bg-white border border-slate-200 text-primary-600 font-bold">
        <ImageOff size={16} /> فتح الصورة
      </a>
    )
    return (
      <>
        <button type="button" onClick={() => setViewer(true)} aria-label="عرض الصورة" className="block">
          <img src={k.url} alt="صورة" loading="lazy" onError={() => setBroken(true)}
            className={`rounded-2xl max-w-full ${compact ? 'max-h-40' : 'max-h-60'} object-cover border border-slate-200 shadow-sm`} />
        </button>
        {viewer && createPortal(
          <div className="fixed inset-0 z-[200] bg-black/90 flex flex-col" onClick={() => setViewer(false)} dir="rtl">
            <div className="flex items-center justify-between p-3" style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}>
              <button onClick={() => setViewer(false)} aria-label="إغلاق"
                className="w-10 h-10 rounded-full bg-white/15 text-white flex items-center justify-center"><X size={20} /></button>
              <a href={k.url} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}
                className="flex items-center gap-1.5 text-white text-sm font-bold bg-white/15 rounded-full px-4 py-2">
                <ExternalLink size={14} /> فتح الأصل
              </a>
            </div>
            <div className="flex-1 flex items-center justify-center p-3 min-h-0">
              <img src={k.url} alt="صورة" onClick={e => e.stopPropagation()} className="max-w-full max-h-full object-contain rounded-lg" />
            </div>
          </div>, document.body)}
      </>
    )
  }

  if (k.kind === 'audio') return (
    <div className={`rounded-2xl px-3 py-2.5 ${isMe ? 'bg-primary-500' : 'bg-white border border-slate-200'}`}>
      <audio src={k.url} controls preload="metadata" className="h-8 max-w-[220px]" />
    </div>
  )

  if (k.kind === 'file') return (
    <a href={k.url} target="_blank" rel="noreferrer"
      className={`flex items-center gap-2.5 rounded-2xl px-3 py-2.5 text-sm shadow-sm min-w-0 ${isMe ? 'bg-primary-500 text-white' : 'bg-white border border-slate-200 text-slate-800'}`}>
      <span className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${isMe ? 'bg-white/20' : 'bg-slate-100 text-slate-500'}`}><Paperclip size={16} /></span>
      <span className="min-w-0">
        <span className="block font-bold truncate">{k.name}</span>
        <span className={`block text-xs ${isMe ? 'text-white/80' : 'text-primary-600'}`}>اضغط للفتح</span>
      </span>
    </a>
  )

  if (k.kind === 'location') return (
    <a href={k.url} target="_blank" rel="noreferrer"
      className={`flex items-center gap-2.5 rounded-2xl px-3 py-2.5 text-sm shadow-sm ${isMe ? 'bg-primary-500 text-white' : 'bg-white border border-slate-200 text-slate-800'}`}>
      <span className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${isMe ? 'bg-white/20' : 'bg-red-50 text-red-500'}`}><MapPin size={16} /></span>
      <span className="min-w-0">
        <span className="block font-bold">📍 موقع على الخريطة</span>
        <span className={`block text-xs ${isMe ? 'text-white/80' : 'text-primary-600'}`}>فتح في قوقل ماب</span>
      </span>
    </a>
  )

  return (
    <div className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm whitespace-pre-wrap break-words ${
      isMe ? 'bg-primary-500 text-white' : 'bg-white border border-slate-200 text-slate-800'
    }`}>
      {k.text}
    </div>
  )
}
