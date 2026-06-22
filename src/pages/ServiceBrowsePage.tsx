import { useState } from 'react'
import { Search, Filter, Star, CheckCircle, ArrowLeft, MapPin, Clock } from 'lucide-react'
import { BookingPage } from './BookingPage'

const CATEGORIES = ['الكل', '🧹 تنظيف', '❄️ تكييف', '🔧 سباكة', '⚡ كهرباء', '🏗️ صيانة', '📚 تعليم', '🚗 توصيل']

const PROFESSIONALS = [
  { id: 1, name: 'م. أحمد القحطاني', role: 'خبير صيانة أنظمة التكييف', rating: '4.9', reviews: 512, jobs: '٥٠٠+', price: '١٥٠', category: '❄️ تكييف', area: 'الرياض', badge: 'الأعلى تقييماً' },
  { id: 2, name: 'شركة التنظيف العميق', role: 'خدمات التنظيف والتعقيم', rating: '4.8', reviews: 1241, jobs: '١٢٠٠+', price: '٢٩٩', category: '🧹 تنظيف', area: 'الرياض', badge: '' },
  { id: 3, name: 'م. خالد العتيبي', role: 'متخصص سباكة وتأسيس', rating: '5.0', reviews: 304, jobs: '٣٠٠+', price: '١٢٠', category: '🔧 سباكة', area: 'جدة', badge: 'الأفضل' },
  { id: 4, name: 'م. فهد بن ناصر', role: 'خبير تمديدات كهربائية', rating: '4.7', reviews: 826, jobs: '٨٠٠+', price: '١٨٠', category: '⚡ كهرباء', area: 'الرياض', badge: '' },
  { id: 5, name: 'شركة النظافة المتميزة', role: 'تنظيف المنازل والمكاتب', rating: '4.6', reviews: 432, jobs: '٤٠٠+', price: '٢٠٠', category: '🧹 تنظيف', area: 'الدمام', badge: '' },
  { id: 6, name: 'م. سعد المطيري', role: 'صيانة عامة وكهرباء', rating: '4.8', reviews: 218, jobs: '٢٠٠+', price: '١٣٥', category: '⚡ كهرباء', area: 'الرياض', badge: '' },
  { id: 7, name: 'فريق الصيانة السريعة', role: 'جميع أعمال الصيانة المنزلية', rating: '4.9', reviews: 680, jobs: '٦٥٠+', price: '١٦٠', category: '🏗️ صيانة', area: 'الرياض', badge: 'سريع الاستجابة' },
  { id: 8, name: 'أ. نورة الشمري', role: 'معلمة رياضيات وعلوم', rating: '5.0', reviews: 148, jobs: '١٤٠+', price: '٨٠', category: '📚 تعليم', area: 'الرياض', badge: '' },
]

export function ServiceBrowsePage({ onClose }: { onClose: () => void }) {
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('الكل')
  const [showBooking, setShowBooking] = useState(false)
  const [sortBy, setSortBy] = useState<'rating'|'price'|'jobs'>('rating')

  if (showBooking) return <BookingPage onClose={() => setShowBooking(false)} />

  const filtered = PROFESSIONALS.filter(p => {
    const matchSearch = !search || p.name.includes(search) || p.role.includes(search)
    const matchCat = activeCategory === 'الكل' || p.category === activeCategory
    return matchSearch && matchCat
  }).sort((a, b) => {
    if (sortBy === 'rating') return parseFloat(b.rating) - parseFloat(a.rating)
    if (sortBy === 'price') return parseInt(a.price.replace(/\D/g,'')) - parseInt(b.price.replace(/\D/g,''))
    return b.reviews - a.reviews
  })

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3 mb-3">
            <button onClick={onClose} className="text-slate-400 hover:text-slate-900 transition-colors text-sm font-medium">
              ← رجوع
            </button>
            <h1 className="font-black text-slate-900 text-lg">استعراض المحترفين</h1>
          </div>

          {/* Search */}
          <div className="flex gap-2">
            <div className="flex-1 flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 focus-within:border-primary-500 transition-colors">
              <Search size={16} className="text-slate-400 flex-shrink-0" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="ابحث عن خدمة أو محترف..."
                className="flex-1 bg-transparent text-sm text-slate-900 outline-none text-right placeholder-slate-400" />
            </div>
            <select value={sortBy} onChange={e => setSortBy(e.target.value as any)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-primary-500">
              <option value="rating">الأعلى تقييماً</option>
              <option value="price">الأقل سعراً</option>
              <option value="jobs">الأكثر تجربة</option>
            </select>
          </div>
        </div>

        {/* Categories */}
        <div className="flex gap-2 px-4 pb-3 overflow-x-auto">
          {CATEGORIES.map(cat => (
            <button key={cat} onClick={() => setActiveCategory(cat)}
              className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-all ${activeCategory === cat ? 'bg-primary-500 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      <div className="max-w-5xl mx-auto px-4 py-6">
        <p className="text-sm text-slate-500 mb-4">{filtered.length} محترف متاح</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(pro => (
            <div key={pro.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all group">
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center text-primary-500 font-black text-lg flex-shrink-0">
                    {pro.name[0]}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm leading-snug">{pro.name}</h3>
                    <p className="text-slate-500 text-xs mt-0.5">{pro.role}</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-xs bg-green-100 text-green-600 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                    <CheckCircle size={9} /> موثق
                  </span>
                  {pro.badge && (
                    <span className="text-xs bg-accent-100 text-accent-600 font-bold px-2 py-0.5 rounded-full">
                      {pro.badge}
                    </span>
                  )}
                </div>
              </div>

              {/* Stats */}
              <div className="flex items-center gap-3 mb-4 text-xs">
                <div className="flex items-center gap-1">
                  <Star size={11} className="text-accent-500 fill-accent-500" />
                  <span className="font-bold text-slate-900">{pro.rating}</span>
                  <span className="text-slate-400">({pro.reviews})</span>
                </div>
                <div className="flex items-center gap-1 text-slate-400">
                  <CheckCircle size={11} className="text-secondary-500" />
                  <span>{pro.jobs} عملية</span>
                </div>
                <div className="flex items-center gap-1 text-slate-400">
                  <MapPin size={11} />
                  <span>{pro.area}</span>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <div>
                  <span className="text-xs text-slate-400">يبدأ من</span>
                  <span className="text-slate-900 font-black text-base mr-1">{pro.price}</span>
                  <span className="text-xs text-slate-400"> ر.س/ساعة</span>
                </div>
                <button onClick={() => setShowBooking(true)}
                  className="bg-primary-500 text-white text-sm font-bold px-4 py-2 rounded-xl hover:bg-primary-700 transition-colors flex items-center gap-1.5">
                  احجز الآن <ArrowLeft size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-20">
            <p className="text-slate-400 text-lg">ما في نتائج — جرّب كلمة بحث مختلفة</p>
          </div>
        )}
      </div>
    </div>
  )
}
