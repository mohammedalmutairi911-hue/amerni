// اللوقو الرسمي لأمرني — يُستخدم في كل الصفحات
// logo-icon-256.png = علامة اللوقو فقط (مقصوصة من اللوقو الرسمي بدون النص)، تُستخدم بجانب النص في الأماكن الصغيرة (النافبار)
// logo.jpg = اللوقو الرسمي الكامل (بالنص المدمج)، يُستخدم في الأماكن الكبيرة عبر <Logo full />
export function Logo({ size = 32, dark = false, textOnly = false, full = false, className = '' }: {
  size?: number
  dark?: boolean   // true = نص أبيض (على خلفية داكنة)
  textOnly?: boolean
  full?: boolean    // true = يعرض اللوقو الرسمي الكامل كصورة واحدة (علامة + نص مدمج)
  className?: string
}) {
  if (full) {
    return (
      <div className={`flex items-center ${className}`}>
        <img
          src="/logo.jpg"
          alt="أمرني"
          style={{ height: size, width: 'auto', objectFit: 'contain' }}
        />
      </div>
    )
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {!textOnly && (
        <img
          src="/logo-icon-256.png"
          alt="أمرني"
          width={size}
          height={size}
          style={{ width: size, height: size, objectFit: 'contain' }}
        />
      )}
      <div className="flex flex-col leading-none">
        <span style={{ color: dark ? '#ffffff' : '#1a2a6e', fontWeight: 800, fontSize: size * 0.45, letterSpacing: '-0.03em', fontFamily: 'system-ui, sans-serif' }}>
          Amerni
        </span>
        <span style={{ color: dark ? '#a0b0d0' : '#4a5a8a', fontWeight: 500, fontSize: size * 0.28, fontFamily: 'system-ui, sans-serif' }}>
          أمرني
        </span>
      </div>
    </div>
  )
}
