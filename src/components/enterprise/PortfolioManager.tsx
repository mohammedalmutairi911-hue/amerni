import { useState, useEffect } from 'react'
import { Briefcase, Plus, Trash2, Loader2, X } from 'lucide-react'
import { supabase } from '../../lib/supabase'

interface Work {
  id: string
  title: string
  description: string
  category: string
  client_name: string
  year: string
}

// إدارة الأعمال (للمزود نفسه)
export function PortfolioManager({ providerId }: { providerId: string }) {
  const [works, setWorks] = useState<Work[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', category: '', client_name: '', year: '' })
  const [saving, setSaving] = useState(false)

  const load = async () => {
    const { data } = await supabase.from('provider_portfolio').select('*').eq('provider_id', providerId).order('created_at', { ascending: false })
    setWorks(data || [])
    setLoading(false)
  }
  useEffect(() => { load() }, [providerId])

  const add = async () => {
    if (form.title.trim().length < 3) return
    setSaving(true)
    const { error } = await supabase.from('provider_portfolio').insert({ provider_id: providerId, ...form })
    setSaving(false)
    if (!error) { setForm({ title: '', description: '', category: '', client_name: '', year: '' }); setShowForm(false); load() }
  }

  const remove = async (id: string) => {
    await supabase.from('provider_portfolio').delete().eq('id', id)
    load()
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-bold text-slate-800 flex items-center gap-2"><Briefcase size={15} /> أعمالي السابقة</h4>
        <button onClick={() => setShowForm(!showForm)}
          className="text-xs bg-primary-500 text-white px-3 py-1.5 rounded-lg font-bold flex items-center gap-1 hover:bg-primary-600 transition-colors">
          {showForm ? <X size={13} /> : <Plus size={13} />} {showForm ? 'إلغاء' : 'إضافة عمل'}
        </button>
      </div>

      {showForm && (
        <div className="bg-slate-50 rounded-xl p-4 mb-4 space-y-2">
          <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            placeholder="عنوان العمل *" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white" />
          <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            rows={2} placeholder="وصف مختصر" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white resize-none" />
          <div className="grid grid-cols-2 gap-2">
            <input value={form.client_name} onChange={e => setForm(f => ({ ...f, client_name: e.target.value }))}
              placeholder="اسم العميل (اختياري)" className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white" />
            <input value={form.year} onChange={e => setForm(f => ({ ...f, year: e.target.value.replace(/[^0-9]/g,'').slice(0,4) }))}
              placeholder="السنة" inputMode="numeric" maxLength={4} className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white" />
          </div>
          <button onClick={add} disabled={saving || form.title.trim().length < 3}
            className="w-full bg-primary-500 text-white py-2 rounded-lg text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2">
            {saving ? <Loader2 size={14} className="animate-spin" /> : 'حفظ العمل'}
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-4"><Loader2 size={18} className="animate-spin text-slate-300" /></div>
      ) : works.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-4">لم تضف أعمالاً بعد — أضف أعمالك لبناء الثقة مع العملاء</p>
      ) : (
        <div className="space-y-2">
          {works.map(w => (
            <div key={w.id} className="bg-slate-50 rounded-xl px-4 py-3 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-bold text-sm text-slate-800">{w.title}</p>
                {w.description && <p className="text-xs text-slate-500 mt-0.5">{w.description}</p>}
                <div className="flex gap-2 mt-1 text-xs text-slate-400">
                  {w.client_name && <span>{w.client_name}</span>}
                  {w.year && <span>· {w.year}</span>}
                </div>
              </div>
              <button onClick={() => remove(w.id)} className="text-red-400 hover:text-red-600 flex-shrink-0"><Trash2 size={14} /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// عرض الأعمال (للقراءة — العميل يشوفها)
export function PortfolioView({ providerId }: { providerId: string }) {
  const [works, setWorks] = useState<Work[]>([])
  useEffect(() => {
    supabase.from('provider_portfolio').select('*').eq('provider_id', providerId).order('created_at', { ascending: false })
      .then(({ data }) => setWorks(data || []))
  }, [providerId])

  if (works.length === 0) return null
  return (
    <div className="space-y-2">
      <p className="text-xs font-bold text-slate-500">الأعمال السابقة ({works.length})</p>
      {works.slice(0, 8).map(w => (
        <div key={w.id} className="bg-slate-50 rounded-lg px-3 py-2">
          <p className="font-bold text-xs text-slate-800">{w.title}</p>
          {w.description && <p className="text-xs text-slate-500 mt-0.5">{w.description}</p>}
          {(w.client_name || w.year) && <p className="text-xs text-slate-400 mt-0.5">{w.client_name} {w.year && `· ${w.year}`}</p>}
        </div>
      ))}
    </div>
  )
}
