import { useState } from 'react'
import { ArrowRight, ArrowLeft, MapPin, Clock, CreditCard, CheckCircle, Star, Shield } from 'lucide-react'
import { useApp } from '../contexts/AppContext'
import { useAuth } from '../contexts/AuthContext'
import { goHome } from '../lib/homePage'

type Step = 1 | 2 | 3

const TIMES = ['٠٩:٠٠ صباحاً', '١١:٠٠ صباحاً', '٠١:٣٠ ظهراً', '٠٤:٠٠ عصراً', '٠٦:٠٠ مساءً', '٠٨:٣٠ مساءً']
const DAYS = ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة']
const DATES = ['١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩', '١٠', '١١']

export function BookingPage({ onClose }: { onClose: () => void }) {
  const { navigate } = useApp()
  const { profile } = useAuth()
  const [step, setStep] = useState<Step>(1)
  const [selectedDay, setSelectedDay] = useState(0)
  const [selectedDate, setSelectedDate] = useState(0)
  const [selectedTime, setSelectedTime] = useState('')
  const [address, setAddress] = useState('حي النخيل، الرياض')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [notes, setNotes] = useState('')
  const [payMethod, setPayMethod] = useState<'card'|'apple'|'cash'>('apple')
  const [confirmed, setConfirmed] = useState(false)

  const professional = {
    name: 'سارة المطيري',
    role: 'مساعدة إدارية وتنظيم مواعيد',
    rating: '4.9',
    reviews: '٣١٢',
    price: '٨٠',
    duration: 'ساعتان',
    inspection: '٢٠',
    total: '١٨٠',
  }

  if (confirmed) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl p-10 max-w-md w-full text-center">
        <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
          <CheckCircle size={40} className="text-green-500" />
        </div>
        <h2 className="text-2xl font-black text-slate-900 mb-2">تم تأكيد الحجز!</h2>
        <p className="text-slate-500 mb-6">سيتواصل معك {professional.name} خلال دقائق لتأكيد الموعد.</p>
        <div className="bg-slate-50 rounded-2xl p-4 mb-6 text-right space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-slate-900 font-bold">{professional.name}</span>
            <span className="text-slate-500">المحترف</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-900 font-bold">{DAYS[selectedDay]}، {DATES[selectedDate]} • {selectedTime || TIMES[2]}</span>
            <span className="text-slate-500">الموعد</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-primary-500 font-bold">{professional.total} ر.س</span>
            <span className="text-slate-500">الإجمالي</span>
          </div>
        </div>
        <button onClick={() => { goHome(navigate, profile); onClose() }}
          className="w-full bg-primary-500 text-white font-bold py-3 rounded-xl hover:bg-primary-700 transition-colors">
          متابعة الطلب
        </button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <button onClick={onClose} className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors">
            <ArrowRight size={18} /> رجوع
          </button>
          <span className="font-bold text-slate-900">عملية الحجز</span>
          <div className="flex gap-2">
            {[1,2,3].map(s => (
              <div key={s} className={`w-8 h-1.5 rounded-full transition-all ${s <= step ? 'bg-primary-500' : 'bg-slate-200'}`} />
            ))}
          </div>
        </div>
      </div>

      {/* Steps indicator */}
      <div className="bg-white border-b border-slate-100 px-4 py-3">
        <div className="max-w-2xl mx-auto flex justify-between text-xs">
          {['تفاصيل الخدمة', 'الموقع والتواصل', 'الدفع والتأكيد'].map((s, i) => (
            <div key={s} className={`flex items-center gap-1.5 ${i+1 === step ? 'text-primary-500 font-bold' : i+1 < step ? 'text-secondary-500' : 'text-slate-400'}`}>
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${i+1 === step ? 'bg-primary-500 text-white' : i+1 < step ? 'bg-secondary-500 text-slate-900' : 'bg-slate-200 text-slate-400'}`}>
                {i+1 < step ? '✓' : i+1}
              </div>
              <span className="hidden sm:block">{s}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">

        {/* Step 1: Date & Time */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
              <h3 className="font-bold text-slate-900 mb-4">اختر الموعد المناسب</h3>

              {/* Day selector */}
              <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
                {DAYS.map((d, i) => (
                  <button key={d} onClick={() => setSelectedDay(i)}
                    className={`flex-shrink-0 px-3 py-2 rounded-xl text-sm font-medium transition-all ${selectedDay === i ? 'bg-primary-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                    {d}
                  </button>
                ))}
              </div>

              {/* Date selector */}
              <div className="flex flex-wrap gap-2 mb-5">
                {DATES.map((d, i) => (
                  <button key={d} onClick={() => setSelectedDate(i)}
                    className={`w-10 h-10 rounded-xl text-sm font-bold transition-all ${selectedDate === i ? 'bg-primary-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                    {d}
                  </button>
                ))}
              </div>

              {/* Time selector */}
              <h4 className="text-sm font-semibold text-slate-700 mb-3">الوقت المفضل</h4>
              <div className="grid grid-cols-3 gap-2">
                {TIMES.map(t => (
                  <button key={t} onClick={() => setSelectedTime(t)}
                    className={`py-2.5 rounded-xl text-sm font-medium transition-all text-center ${selectedTime === t ? 'bg-primary-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <button onClick={() => setStep(2)} disabled={!selectedTime}
              className="w-full bg-primary-500 text-white font-bold py-4 rounded-xl hover:bg-primary-700 transition-colors disabled:opacity-40 flex items-center justify-center gap-2">
              المتابعة للموقع <ArrowLeft size={16} />
            </button>
          </div>
        )}

        {/* Step 2: Location & Contact */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
              <h3 className="font-bold text-slate-900">أين تقع الخدمة؟</h3>

              <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
                <MapPin size={16} className="text-primary-500 flex-shrink-0" />
                <input value={address} onChange={e => setAddress(e.target.value)}
                  placeholder="حي النخيل، الرياض"
                  className="flex-1 bg-transparent text-sm text-slate-900 outline-none text-right placeholder-slate-400" />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">الاسم بالكامل</label>
                <input value={name} onChange={e => setName(e.target.value)}
                  placeholder="محمد العتيبي"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 outline-none focus:border-primary-500 transition-colors text-right" />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">رقم الجوال</label>
                <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                  placeholder="05XXXXXXXX"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 outline-none focus:border-primary-500 transition-colors text-right" />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">ملاحظات إضافية</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)}
                  placeholder="أي تفاصيل إضافية تساعد المحترف..."
                  rows={3}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 outline-none focus:border-primary-500 transition-colors resize-none text-right" />
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep(1)}
                className="flex-1 bg-white border border-slate-200 text-slate-700 font-bold py-4 rounded-xl hover:bg-slate-50 transition-colors flex items-center justify-center gap-2">
                <ArrowRight size={16} /> العودة
              </button>
              <button onClick={() => setStep(3)} disabled={!name || !phone}
                className="flex-[2] bg-primary-500 text-white font-bold py-4 rounded-xl hover:bg-primary-700 transition-colors disabled:opacity-40 flex items-center justify-center gap-2">
                مراجعة الحجز <ArrowLeft size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Payment & Confirm */}
        {step === 3 && (
          <div className="space-y-4">
            {/* Booking summary */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
              <h3 className="font-bold text-slate-900 mb-4">ملخص الحجز</h3>
              <div className="flex items-start gap-4 pb-4 border-b border-slate-100 mb-4">
                <div className="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center text-primary-500 font-bold text-lg flex-shrink-0">
                  {professional.name[2]}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-slate-900 text-sm">{professional.name}</span>
                    <span className="text-xs bg-green-100 text-green-600 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Shield size={9} /> موثق
                    </span>
                  </div>
                  <p className="text-slate-500 text-xs mb-1">{professional.role}</p>
                  <div className="flex items-center gap-1">
                    <Star size={10} className="text-accent-500 fill-accent-500" />
                    <span className="text-xs font-bold text-slate-700">{professional.rating}</span>
                    <span className="text-xs text-slate-400">({professional.reviews} تقييم)</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2.5 text-sm">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-900">{DAYS[selectedDay]}، {DATES[selectedDate]} • {selectedTime}</span>
                  <span className="text-slate-500 flex items-center gap-1"><Clock size={12} /> الموعد</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-900">{address}</span>
                  <span className="text-slate-500 flex items-center gap-1"><MapPin size={12} /> الموقع</span>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-slate-100 space-y-2 text-sm">
                <div className="flex justify-between text-slate-500">
                  <span>{professional.price} ر.س × {professional.duration}</span>
                  <span>سعر الساعة</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>{professional.inspection} ر.س</span>
                  <span>رسوم الكشف</span>
                </div>
                <div className="flex justify-between font-black text-slate-900 text-base pt-2 border-t border-slate-100">
                  <span>{professional.total} ر.س</span>
                  <span>الإجمالي المقدر</span>
                </div>
              </div>
            </div>

            {/* Payment method */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
              <h3 className="font-bold text-slate-900 mb-4">تأكيد الحجز والدفع</h3>
              <div className="space-y-2">
                {[
                  { id: 'apple', label: 'Apple Pay', icon: '🍎' },
                  { id: 'card', label: 'مدى / بطاقة ائتمان', icon: '💳' },
                  { id: 'cash', label: 'دفع نقدي', icon: '💵' },
                ].map(({ id, label, icon }) => (
                  <button key={id} onClick={() => setPayMethod(id as any)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all text-right ${payMethod === id ? 'border-primary-500 bg-primary-50' : 'border-slate-200 bg-slate-50 hover:border-slate-300'}`}>
                    <span className="text-xl">{icon}</span>
                    <span className={`font-medium text-sm ${payMethod === id ? 'text-primary-500' : 'text-slate-700'}`}>{label}</span>
                    {payMethod === id && <CheckCircle size={16} className="text-primary-500 mr-auto" />}
                  </button>
                ))}
              </div>
              <p className="text-xs text-slate-400 mt-3 text-center">
                بمجرد الضغط على تأكيد، سيتم إرسال طلبك للمحترف. سيتم خصم المبلغ بعد إتمام الخدمة بنجاح.
              </p>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep(2)}
                className="flex-1 bg-white border border-slate-200 text-slate-700 font-bold py-4 rounded-xl hover:bg-slate-50 transition-colors flex items-center justify-center gap-2">
                <ArrowRight size={16} /> العودة
              </button>
              <button onClick={() => setConfirmed(true)}
                className="flex-[2] bg-primary-500 text-white font-bold py-4 rounded-xl hover:bg-primary-700 transition-colors flex items-center justify-center gap-2">
                تأكيد الحجز النهائي <CheckCircle size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
