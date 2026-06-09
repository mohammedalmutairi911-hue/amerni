import { useApp } from '../contexts/AppContext'

export function NotFoundPage() {
  const { navigate } = useApp()
  return (
    <div className="min-h-screen bg-[#080808] flex items-center justify-center px-4">
      <div className="text-center">
        <div className="text-8xl font-black text-amber-500 mb-4">404</div>
        <h1 className="text-2xl font-bold text-white mb-3">الصفحة غير موجودة</h1>
        <p className="text-zinc-500 mb-8">يبدو إن الصفحة اللي تبحث عنها ما موجودة</p>
        <button onClick={() => navigate('landing')}
          className="bg-amber-500 text-black font-bold px-8 py-3 rounded-xl hover:bg-amber-400 transition-colors">
          ارجع للرئيسية
        </button>
      </div>
    </div>
  )
}
