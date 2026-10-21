// قسم "أمرني للمنشآت" — محفوظ هنا للاستخدام لاحقاً (يُعرض في بوابة المنشآت وليس في صفحة الأفراد).
import { Landmark, Users2, Scale, FileText, BadgeCheck, Cpu } from 'lucide-react'

export function EnterprisesTeaser({ onOpen }: { onOpen: () => void }) {
  return (
        <>
        {/* ===== أمرني للمنشآت (قسم ثانوي — محفوظ بالكامل) ===== */}
        <section className="py-14 px-4 bg-slate-900">
          <div className="max-w-5xl mx-auto flex flex-col lg:flex-row items-center gap-8">
            <div className="flex-1 text-center lg:text-right">
              <p className="text-accent-400 text-xs font-bold mb-2">أمرني للمنشآت</p>
              <h2 className="text-2xl sm:text-3xl font-black text-white mb-3">خبراء معتمدون عند الطلب لمنشأتك</h2>
              <p className="text-slate-400 text-sm leading-relaxed mb-5">حوكمة، توطين، قانوني، مالي وزكاة، جودة وآيزو، أمن سيبراني — اطلب خبيراً بدل ما توظف بدوام كامل.</p>
              <button onClick={() => onOpen()} className="bg-white text-slate-900 font-bold text-sm px-6 py-2.5 rounded-xl hover:bg-slate-100 transition-colors">استكشف خدمات المنشآت</button>
            </div>
            <div className="grid grid-cols-3 gap-3 w-full lg:w-auto">
              {[[Landmark, 'حوكمة'], [Users2, 'توطين'], [Scale, 'قانوني'], [FileText, 'مالي/زكاة'], [BadgeCheck, 'جودة/آيزو'], [Cpu, 'أمن سيبراني']].map(([I, l]: any) => (
                <button key={l} onClick={() => onOpen()} className="bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl p-4 text-center transition-colors">
                  <I size={22} strokeWidth={1.75} className="text-accent-400 mx-auto mb-2" />
                  <p className="text-xs text-slate-200 font-medium">{l}</p>
                </button>
              ))}
            </div>
          </div>
        </section>
      </>
  )
}
