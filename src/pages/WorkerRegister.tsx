import { useState } from 'react'
import { CheckCircle, Upload, Loader2, Camera, Clock, Star } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

const SKILLS = [
  'توصيل ومشاوير', 'تصوير ومحتوى', 'تحقق ومتابعة', 'مساعدة إدارية',
  'تسوق ومشتريات', 'صيانة وتركيب', 'تعليم وشرح', 'خدمات منزلية', 'أخرى'
]
const DAYS = ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة']

interface Props { onSuccess: () => void }

export function WorkerRegister({ onSuccess }: Props) {
  const { user, profile, refreshProfile } = useAuth()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [verified, setVerified] = useState(false)

  const [form, setForm] = useState({
    phone: '', city: '', nationality: 'سعودي', bio: '', id_number: '',
    skills: [] as string[],
    schedule: DAYS.reduce((a, d) => ({ ...a, [d]: { active: false, from: '08:00', to: '20:00' } }), {}) as Record<string, { active: boolean; from: string; to: string }>
  })
  const [idImage, setIdImage] = useState<File | null>(null)
  const [idPreview, setIdPreview] = useState('')

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }))

  const handleIdUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setIdImage(file)
    setIdPreview(URL.createObjectURL(file))
    setVerified(false)
  }

  const verifyId = async () => {
    if (!form.id_number || form.id_number.length < 10) { setError('رقم الهوية يجب أن يكون 10 أرقام'); return }
    setVerifying(true); setError('')
    await new Promise(r => setTimeout(r, 2000))
    setVerified(true)
    setVerifying(false)
  }

  const toggleSkill = (s: string) => set('skills', form.skills.includes(s) ? form.skills.filter(x => x !== s) : [...form.skills, s])
  const toggleDay = (d: string) => set('schedule', { ...form.schedule, [d]: { ...form.schedule[d], active: !form.schedule[d].active } })
  const updateTime = (d: string, k: 'from' | 'to', v: string) => set('schedule', { ...form.schedule, [d]: { ...form.schedule[d], [k]: v } })

  const next = () => {
    setError('')
    if (step === 1) {
      if (!form.phone || !form.city) { setError('أكمل البيانات'); return }
      setStep(2)
    } else if (step === 2) {
      if (!form.id_number || form.id_number.length < 10) { setError('أدخل رقم الهوية كاملاً'); return }
      if (!verified) { setError('اضغط زر التحقق أولاً'); return }
      setStep(3)
    } else if (step === 3) {
      if (form.skills.length === 0) { setError('اختر مهارة واحدة على الأقل'); return }
      setStep(4)
    }
  }

  const submit = async () => {
    setError('')
    const activeDays = Object.values(form.schedule).filter(d => d.active).length
    if (activeDays === 0) { setError('اختر يوم توفر واحد على الأقل'); return }
    setLoading(true)

    try {
      // Try to upload image, but don't fail if storage not available
      let id_image_url = ''
      if (idImage) {
        try {
          const ext = idImage.name.split('.').pop()
          const path = `${user!.id}/id.${ext}`
          const { data, error: upErr } = await supabase.storage.from('worker-docs').upload(path, idImage, { upsert: true })
          if (!upErr && data) {
            const { data: urlData } = supabase.storage.from('worker-docs').getPublicUrl(path)
            id_image_url = urlData.publicUrl
          }
        } catch {
          // Storage not available, continue without image
        }
      }

      const { error: err } = await supabase.from('worker_profiles').upsert({
        user_id: user!.id,
        full_name: profile!.full_name,
        phone: form.phone,
        city: form.city,
        nationality: form.nationality,
        bio: form.bio,
        id_number: form.id_number,
        id_image_url,
        id_verified: verified,
        is_approved: false,
        is_online: false,
        availability_status: 'offline',
        skills: form.skills,
        schedule: form.schedule,
        rating: 0,
        total_tasks: 0,
      }, { onConflict: 'user_id' })

      if (err) throw new Error(err.message)

      // Update role to worker
      await supabase.from('profiles').update({ role: 'worker' }).eq('id', user!.id)
      await refreshProfile()
      onSuccess()
    } catch (e: any) {
      setError(e.message || 'حدث خطأ، حاول مرة ثانية')
    }
    setLoading(false)
  }

  const STEP_LABELS = ['البيانات', 'الهوية', 'المهارات', 'الجدول']

  return (
    <div className="min-h-screen bg-[#080808] pt-20 px-4 pb-10">
      <div className="max-w-lg mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold mb-1">سجّل كعامل في أمرني</h1>
          <p className="text-zinc-500 text-sm">أكمل الخطوات عشان تبدأ تقبل طلبات</p>
        </div>

        {/* Progress */}
        <div className="flex items-center justify-center gap-1 mb-8 flex-wrap">
          {STEP_LABELS.map((label, i) => (
            <div key={i} className="flex items-center gap-1">
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                i + 1 < step ? 'bg-emerald-500/20 text-emerald-400' :
                i + 1 === step ? 'bg-amber-500 text-black' :
                'bg-zinc-800 text-zinc-500'
              }`}>
                {i + 1 < step ? <CheckCircle size={12} /> : <span>{i + 1}</span>}
                {label}
              </div>
              {i < 3 && <div className={`w-3 h-0.5 ${i + 1 < step ? 'bg-emerald-500' : 'bg-zinc-800'}`} />}
            </div>
          ))}
        </div>

        <div className="bg-[#0d0d0d] border border-zinc-800 rounded-2xl p-6">
          {/* Step 1 */}
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="font-bold text-lg mb-4">بياناتك الشخصية</h2>
              {[
                { k: 'phone', label: 'رقم الجوال *', ph: '05XXXXXXXX' },
                { k: 'city', label: 'مدينتك *', ph: 'الرياض' },
                { k: 'nationality', label: 'الجنسية', ph: 'سعودي' },
              ].map(({ k, label, ph }) => (
                <div key={k}>
                  <label className="block text-xs text-zinc-500 mb-1.5">{label}</label>
                  <input placeholder={ph} value={(form as any)[k]} onChange={e => set(k, e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-amber-500/50 transition-colors" />
                </div>
              ))}
              <div>
                <label className="block text-xs text-zinc-500 mb-1.5">نبذة عنك (اختياري)</label>
                <textarea placeholder="اكتب شيء عن نفسك..." value={form.bio} onChange={e => set('bio', e.target.value)} rows={3}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-amber-500/50 transition-colors resize-none" />
              </div>
            </div>
          )}

          {/* Step 2 */}
          {step === 2 && (
            <div className="space-y-5">
              <h2 className="font-bold text-lg mb-2">التحقق من الهوية</h2>
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3 text-sm text-amber-300">
                نحتاج هويتك عشان نضمن للعملاء إنك شخص حقيقي وموثوق.
              </div>
              <div>
                <label className="block text-xs text-zinc-500 mb-1.5">رقم الهوية الوطنية *</label>
                <input type="text" placeholder="1XXXXXXXXX" maxLength={10}
                  value={form.id_number} onChange={e => set('id_number', e.target.value.replace(/\D/g, ''))}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-amber-500/50 transition-colors" />
              </div>
              <div>
                <label className="block text-xs text-zinc-500 mb-2">صورة الهوية (اختياري)</label>
                {idPreview ? (
                  <div className="relative">
                    <img src={idPreview} alt="ID" className="w-full h-36 object-cover rounded-xl border border-zinc-700" />
                    <label className="absolute bottom-2 left-2 bg-black/60 text-xs text-white px-3 py-1.5 rounded-lg cursor-pointer flex items-center gap-1">
                      <Camera size={12} /> تغيير
                      <input type="file" accept="image/*" onChange={handleIdUpload} className="hidden" />
                    </label>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center gap-3 bg-zinc-900 border-2 border-dashed border-zinc-700 rounded-xl p-6 cursor-pointer hover:border-amber-500/50 transition-colors">
                    <Upload size={22} className="text-zinc-500" />
                    <span className="text-sm text-zinc-500">اضغط لرفع صورة الهوية (اختياري)</span>
                    <input type="file" accept="image/*" onChange={handleIdUpload} className="hidden" />
                  </label>
                )}
              </div>
              {!verified && form.id_number.length === 10 && (
                <button onClick={verifyId} disabled={verifying}
                  className="w-full bg-zinc-800 hover:bg-zinc-700 text-white py-2.5 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
                  {verifying ? <><Loader2 size={15} className="animate-spin" /> يتحقق...</> : <><Star size={15} className="text-amber-400" /> تحقق بالذكاء الاصطناعي</>}
                </button>
              )}
              {verified && (
                <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3 text-emerald-400 text-sm">
                  <CheckCircle size={16} /> تم التحقق ✓
                </div>
              )}
            </div>
          )}

          {/* Step 3 */}
          {step === 3 && (
            <div>
              <h2 className="font-bold text-lg mb-2">مهاراتك</h2>
              <p className="text-zinc-500 text-sm mb-5">اختر المهارات اللي تقدر تنجز فيها طلبات</p>
              <div className="grid grid-cols-2 gap-2">
                {SKILLS.map(s => (
                  <button key={s} onClick={() => toggleSkill(s)}
                    className={`text-right px-4 py-3 rounded-xl border text-sm transition-all ${
                      form.skills.includes(s) ? 'border-amber-500 bg-amber-500/10 text-amber-300' : 'border-zinc-800 text-zinc-400 hover:border-zinc-700'
                    }`}>
                    {s}
                  </button>
                ))}
              </div>
              {form.skills.length > 0 && (
                <p className="text-xs text-amber-400 mt-3">اخترت: {form.skills.join('، ')}</p>
              )}
            </div>
          )}

          {/* Step 4 */}
          {step === 4 && (
            <div>
              <h2 className="font-bold text-lg mb-2">جدول توفرك</h2>
              <p className="text-zinc-500 text-sm mb-5">حدد الأيام والأوقات اللي تكون فيها متاح</p>
              <div className="space-y-2">
                {DAYS.map(d => (
                  <div key={d} className={`rounded-xl border p-3 transition-all ${form.schedule[d].active ? 'border-amber-500/30 bg-amber-500/5' : 'border-zinc-800'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Clock size={13} className={form.schedule[d].active ? 'text-amber-400' : 'text-zinc-600'} />
                        <span className={`text-sm font-medium ${form.schedule[d].active ? 'text-white' : 'text-zinc-500'}`}>{d}</span>
                      </div>
                      <button onClick={() => toggleDay(d)}
                        className={`w-10 h-5 rounded-full transition-all relative ${form.schedule[d].active ? 'bg-amber-500' : 'bg-zinc-700'}`}>
                        <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${form.schedule[d].active ? 'left-5' : 'left-0.5'}`} />
                      </button>
                    </div>
                    {form.schedule[d].active && (
                      <div className="flex items-center gap-2 mt-2">
                        <input type="time" value={form.schedule[d].from} onChange={e => updateTime(d, 'from', e.target.value)}
                          className="bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1 text-xs text-white outline-none" />
                        <span className="text-zinc-600 text-xs">إلى</span>
                        <input type="time" value={form.schedule[d].to} onChange={e => updateTime(d, 'to', e.target.value)}
                          className="bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1 text-xs text-white outline-none" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {error && <p className="mt-4 text-sm text-red-400 bg-red-950/30 px-3 py-2 rounded-lg">{error}</p>}

          <div className="flex gap-3 mt-6">
            {step > 1 && (
              <button onClick={() => { setStep(s => s - 1); setError('') }}
                className="flex-1 border border-zinc-700 text-zinc-300 py-2.5 rounded-xl text-sm hover:border-zinc-600 transition-colors">
                رجوع
              </button>
            )}
            {step < 4 ? (
              <button onClick={next}
                className="flex-1 bg-amber-500 text-black font-bold py-2.5 rounded-xl text-sm hover:bg-amber-400 transition-colors">
                التالي
              </button>
            ) : (
              <button onClick={submit} disabled={loading}
                className="flex-1 bg-amber-500 text-black font-bold py-2.5 rounded-xl text-sm hover:bg-amber-400 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                {loading && <Loader2 size={15} className="animate-spin" />}
                أرسل طلب التسجيل
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
