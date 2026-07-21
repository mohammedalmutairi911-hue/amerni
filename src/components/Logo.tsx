// اللوقو الرسمي لأمرني — يُستخدم في كل الصفحات
export function Logo({ size = 32, dark = false, textOnly = false, className = '' }: {
  size?: number
  dark?: boolean   // true = نص أبيض (على خلفية داكنة)
  textOnly?: boolean
  className?: string
}) {
  const color = dark ? '#ffffff' : '#1a2a6e'
  const silver = '#9aa3b8'

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {!textOnly && (
        <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* حلقة يسار */}
          <path d="M18 50 Q14 30 28 18 Q38 10 50 12" stroke={color} strokeWidth="7" strokeLinecap="round" fill="none"/>
          <path d="M18 50 Q14 70 28 82 Q38 90 50 88" stroke={color} strokeWidth="7" strokeLinecap="round" fill="none"/>
          {/* حلقة يمين */}
          <path d="M82 50 Q86 30 72 18 Q62 10 50 12" stroke={color} strokeWidth="7" strokeLinecap="round" fill="none"/>
          <path d="M82 50 Q86 70 72 82 Q62 90 50 88" stroke={color} strokeWidth="7" strokeLinecap="round" fill="none"/>
          {/* حرف A */}
          <path d="M32 78 L50 22 L68 78" stroke={color} strokeWidth="7.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
          <path d="M39 58 L61 58" stroke={color} strokeWidth="6" strokeLinecap="round" fill="none"/>
          {/* حرف ع (فضي) */}
          <path d="M54 36 Q66 30 68 42 Q70 54 60 60 Q52 64 46 58 Q42 52 48 48 Q54 44 56 50 Q57 56 52 57" stroke={silver} strokeWidth="4.5" strokeLinecap="round" fill="none"/>
          <path d="M52 57 Q58 64 65 62 Q70 58 68 52" stroke={silver} strokeWidth="4.5" strokeLinecap="round" fill="none"/>
        </svg>
      )}
      <div className="flex flex-col leading-none">
        <span style={{ color, fontWeight: 800, fontSize: size * 0.45, letterSpacing: '-0.03em', fontFamily: 'system-ui, sans-serif' }}>
          Amarni
        </span>
        <span style={{ color: dark ? '#a0b0d0' : '#4a5a8a', fontWeight: 500, fontSize: size * 0.28, fontFamily: 'system-ui, sans-serif' }}>
          أمرني
        </span>
      </div>
    </div>
  )
}
