import { useApp } from '../contexts/AppContext'

export function JoinPage() {
  const { navigate, openAuth } = useApp()

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4" dir="rtl">
      <div className="max-w-md w-full">
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-primary-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-slate-900 text-3xl font-black">أ</span>
          </div>
          <h1 className="text-3xl font-black text-slate-900 mb-2">انضم كمُنجز في أمرني</h1>
          <p className="text-slate-500">اكسب من وقتك الحر بدون رأس مال</p>
        </div>

        <div className="space-y-3 mb-8">
          {[
            { icon: '💰', title: 'دخل إضافي حقيقي', desc: 'اختار الطلبات اللي تناسبك واكسب بشروطك' },
            { icon: '⏰', title: 'بوقتك وبشروطك', desc: 'لا التزامات — تشتغل وقت ما تبي' },
            { icon: '🔒', title: 'أمان كامل', desc: 'فلوسك محمية والتواصل آمن داخل المنصة' },
            { icon: '🌟', title: 'بدون خبرة لازمة', desc: 'اي مهارة عندك لها سوق في أمرني' },
          ].map(({ icon, title, desc }) => (
            <div key={title} className="flex items-start gap-4 bg-white border border-slate-200 rounded-2xl p-4">
              <span className="text-2xl">{icon}</span>
              <div>
                <p className="font-semibold text-slate-900">{title}</p>
                <p className="text-sm text-slate-400 mt-0.5">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        <button onClick={() => { openAuth('signup'); navigate('landing') }}
          className="w-full bg-primary-500 hover:bg-primary-400 text-white font-black py-4 rounded-2xl text-lg transition-colors mb-3">
          سجّل كمُنجز — مجاناً
        </button>
        <button onClick={() => navigate('landing')}
          className="w-full text-slate-400 hover:text-slate-600 py-3 text-sm transition-colors">
          لديك حساب؟ سجّل دخول
        </button>
      </div>
    </div>
  )
}
