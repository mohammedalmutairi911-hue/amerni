import { useApp } from '../contexts/AppContext'

export function NotFoundPage() {
  const { navigate } = useApp()
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="text-center">
        <div className="text-8xl font-black text-primary-500 mb-4">404</div>
        <h1 className="text-2xl font-bold text-slate-900 mb-3">الصفحة غير موجودة</h1>
        <p className="text-slate-400 mb-8">يبدو إن الصفحة اللي تبحث عنها ما موجودة</p>
        <button onClick={() => navigate('landing')}
          className="bg-primary-500 text-slate-900 font-bold px-8 py-3 rounded-xl hover:bg-primary-400 transition-colors">
          ارجع للرئيسية
        </button>
      </div>
    </div>
  )
}
