import { Logo } from '../components/Logo'
import { useState, useEffect } from 'react'
import { Building2, Users, Mail, CheckCircle, BarChart2, Clock, LogOut } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useApp } from '../contexts/AppContext'
import { COMPANY } from '../lib/constants'

type Tab = 'overview' | 'leads' | 'providers'

export function AdminEnterprisesPanel() {
  const { navigate } = useApp()
  const [tab, setTab] = useState<Tab>('overview')
  const [leads, setLeads] = useState<any[]>([])
  const [providers, setProviders] = useState<any[]>([])
  const [overdueLeads, setOverdueLeads] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [leadNote, setLeadNote] = useState<Record<string, string>>({})

  useEffect(() => {
    Promise.all([
      supabase.from('enterprise_leads').select('*').order('created_at', { ascending: false }),
      supabase.from('enterprise_providers').select('*').order('created_at', { ascending: false }),
      supabase.rpc('get_overdue_enterprise_leads').catch(() => ({ data: [] })),
    ]).then(([l, p, o]) => {
      setLeads(l.data || [])
      setProviders(p.data || [])
      setOverdueLeads((o as any).data || [])
      setLoading(false)
    })
  }, [])

  const updateLeadStatus = async (leadId: string, status: string) => {
    await supabase.from('enterprise_leads').update({ status }).eq('id', leadId)
    setLeads(p => p.map(l => l.id === leadId ? { ...l, status } : l))
  }

  const saveLeadNote = async (leadId: string) => {
    const note = leadNote[leadId] || ''
    await supabase.from('enterprise_leads').update({ notes: note }).eq('id', leadId)
    setLeads(p => p.map(l => l.id === leadId ? { ...l, notes: note } : l))
  }

  const approveProvider = async (id: string, approved: boolean) => {
    // اعتماد مزوّد المنشآت = تحديث سجل enterprise_providers مباشرة.
    // أُزيلت مناداة admin_approve_worker — كانت خاطئة (اسم بارامتر p_worker_id
    // بدل p_user_id، وتمرّر id سجل المزوّد بدل user_id) وتفشل بصمت بلا أثر.
    await supabase.from('enterprise_providers').update({ is_approved: approved, verification_level: approved ? 'verified' : 'basic' }).eq('id', id)
    setProviders(p => p.map(prov => prov.id === id ? { ...prov, is_approved: approved } : prov))
  }

  const assignProvider = async (leadId: string, providerId: string) => {
    const prov = providers.find(p => p.id === providerId)
    if (!prov) return
    await supabase.from('enterprise_leads').update({ provider_id: prov.user_id, matched_provider_id: providerId, status: 'matched' }).eq('id', leadId)
    setLeads(p => p.map(l => l.id === leadId ? { ...l, provider_id: prov.user_id, matched_provider_id: providerId, status: 'matched' } : l))
    alert('تم ربط الطلب بـ ' + prov.company_name)
  }

  const TABS = [
    { id: 'overview', icon: BarChart2, label: 'نظرة عامة' },
    { id: 'leads',    icon: Building2, label: `الطلبات (${leads.length})` },
    { id: 'providers', icon: Users,   label: `المزودون (${providers.filter(p=>p.is_approved).length}/${providers.length})` },
  ]

  const statusColor = (s: string) =>
    s === 'open' ? 'bg-blue-50 text-blue-600 border-blue-200' :
    s === 'matched' ? 'bg-green-50 text-green-600 border-green-200' :
    s === 'closed' ? 'bg-slate-100 text-slate-500 border-slate-200' :
    'bg-amber-50 text-amber-600 border-amber-200'

  const statusLabel = (s: string) =>
    s === 'open' ? 'منشور' : s === 'matched' ? 'مطابَق' : s === 'closed' ? 'مغلق' : s === 'cancelled' ? 'ملغى' : s

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-500 rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-50" dir="rtl">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-slate-900 text-white px-6 py-4 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-black"><Logo size={26} dark={true} className="ml-2" /><span className="text-lg font-bold text-white/80 mr-2">إدارة المنشآت</span></h1>
          <span className="text-xs bg-primary-500 px-2 py-0.5 rounded-full">B2B</span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('admin')}
            className="text-xs text-slate-300 hover:text-white px-3 py-1.5 rounded-lg border border-slate-700 hover:border-slate-500 transition-colors">
            أدمن الأفراد
          </button>
          <button onClick={() => navigate('landing')}
            className="text-xs text-slate-400 hover:text-white flex items-center gap-1 transition-colors">
            <LogOut size={13} /> خروج
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b border-slate-200 px-6">
        <div className="flex gap-1">
          {TABS.map(({ id, icon: Icon, label }) => (
            <button key={id} onClick={() => setTab(id as Tab)}
              className={`flex items-center gap-2 px-4 py-3.5 text-sm font-medium border-b-2 transition-colors ${
                tab === id ? 'border-primary-500 text-primary-600' : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}>
              <Icon size={15} /> {label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">

        {/* ── OVERVIEW ── */}
        {tab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'إجمالي الطلبات', value: leads.length, color: 'text-slate-700' },
                { label: 'منشورة', value: leads.filter(l => l.status === 'open').length, color: 'text-blue-600' },
                { label: 'مطابَقة', value: leads.filter(l => l.status === 'matched').length, color: 'text-green-600' },
                { label: 'مغلقة', value: leads.filter(l => l.status === 'closed').length, color: 'text-slate-500' },
              ].map((s, i) => (
                <div key={i} className="bg-white border border-slate-200 rounded-2xl p-5">
                  <p className="text-xs text-slate-400 mb-1">{s.label}</p>
                  <p className={`text-3xl font-black ${s.color}`}>{s.value}</p>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { label: 'مزودون معتمدون', value: providers.filter(p => p.is_approved).length, color: 'text-green-600' },
                { label: 'بانتظار الاعتماد', value: providers.filter(p => !p.is_approved).length, color: 'text-amber-600' },
                { label: 'طلبات متأخرة', value: overdueLeads.length, color: 'text-red-600' },
              ].map((s, i) => (
                <div key={i} className="bg-white border border-slate-200 rounded-2xl p-5">
                  <p className="text-xs text-slate-400 mb-1">{s.label}</p>
                  <p className={`text-3xl font-black ${s.color}`}>{s.value}</p>
                </div>
              ))}
            </div>

            {overdueLeads.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
                <p className="text-sm font-bold text-red-700 mb-2 flex items-center gap-2"><Clock size={14} /> طلبات بدون استجابة أكثر من ٢٤ ساعة</p>
                {overdueLeads.map((l: any) => (
                  <div key={l.id} className="text-xs text-red-600 py-1 border-b border-red-100 last:border-0">
                    {l.company_name} — {l.contact_email} — {new Date(l.created_at).toLocaleString('ar-SA')}
                  </div>
                ))}
              </div>
            )}

            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
              <span className="text-amber-500 text-lg mt-0.5">💡</span>
              <div>
                <p className="text-sm font-bold text-amber-800">نظام العمولة المؤقت</p>
                <p className="text-xs text-amber-700 mt-0.5 leading-relaxed">العمولة الحالية: <strong>١٪ من قيمة العقد</strong> — تُحوَّل لـ IBAN: {COMPANY.iban} (بنك البلاد)</p>
              </div>
            </div>
          </div>
        )}

        {/* ── LEADS ── */}
        {tab === 'leads' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">طلبات المنشآت</h2>
              <span className="text-xs text-slate-400">{leads.length} طلب</span>
            </div>
            {leads.length === 0 ? (
              <div className="text-center py-16 bg-white border border-slate-200 rounded-2xl text-slate-400">
                <Building2 size={40} className="mx-auto mb-3 opacity-30" />
                <p>لا يوجد طلبات بعد</p>
              </div>
            ) : leads.map(lead => (
              <div key={lead.id} className="bg-white border border-slate-200 rounded-2xl p-5">
                <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                  <div>
                    <p className="font-bold text-slate-900">{lead.company_name}</p>
                    <p className="text-sm text-slate-500">{lead.contact_name} — {lead.contact_email}</p>
                    {lead.contact_phone && <p className="text-xs text-slate-400 mt-0.5">{lead.contact_phone}</p>}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs bg-primary-50 text-primary-600 border border-primary-200 px-2 py-0.5 rounded-full">{lead.category}</span>
                    {lead.company_size && <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{lead.company_size} موظف</span>}
                    {lead.budget_range && <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full">{lead.budget_range}</span>}
                    <select value={lead.status}
                      onChange={e => updateLeadStatus(lead.id, e.target.value)}
                      className={`text-xs px-2 py-0.5 rounded-full border font-medium cursor-pointer outline-none ${statusColor(lead.status)}`}>
                      <option value="open">منشور</option>
                      <option value="matched">مطابَق</option>
                      <option value="closed">مغلق</option>
                      <option value="cancelled">ملغى</option>
                    </select>
                  </div>
                </div>

                <p className="text-sm text-slate-600 leading-relaxed mb-3 bg-slate-50 rounded-xl px-4 py-3">{lead.description}</p>

                {/* ربط مزود */}
                <div className="mb-3 bg-primary-50 border border-primary-200 rounded-xl p-3">
                  <label className="text-xs font-bold text-primary-700 mb-1.5 block">ربط يدوي بمزود (إن لزم)</label>
                  <div className="flex gap-2">
                    <select defaultValue={lead.matched_provider_id || ''}
                      onChange={e => { if (e.target.value) assignProvider(lead.id, e.target.value) }}
                      className="flex-1 text-xs border border-primary-200 rounded-lg px-2 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-primary-300">
                      <option value="">— اختر مزود —</option>
                      {providers.filter(p => p.is_approved).map(p => (
                        <option key={p.id} value={p.id}>
                          {p.company_name} {p.categories?.includes(lead.category) ? '✓' : ''}
                        </option>
                      ))}
                    </select>
                    {lead.matched_provider_id && (
                      <span className="text-xs bg-green-100 text-green-600 px-3 py-2 rounded-lg font-bold flex items-center gap-1">
                        <CheckCircle size={12} /> مربوط
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 items-end">
                  <textarea value={leadNote[lead.id] !== undefined ? leadNote[lead.id] : (lead.notes || '')}
                    onChange={e => setLeadNote(p => ({ ...p, [lead.id]: e.target.value }))}
                    placeholder="ملاحظات داخلية..." rows={2}
                    className="flex-1 text-xs border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-300 resize-none bg-slate-50" />
                  <button onClick={() => saveLeadNote(lead.id)}
                    className="text-xs bg-primary-500 text-white px-3 py-2 rounded-xl hover:bg-primary-600 transition-colors whitespace-nowrap">حفظ</button>
                  <a href={`mailto:${lead.contact_email}?subject=أمرني للمنشآت`}
                    className="text-xs bg-slate-100 text-slate-600 px-3 py-2 rounded-xl hover:bg-slate-200 transition-colors flex items-center gap-1.5 whitespace-nowrap">
                    <Mail size={12} /> راسل
                  </a>
                </div>
                <p className="text-xs text-slate-400 mt-2">{new Date(lead.created_at).toLocaleString('ar-SA')}</p>
              </div>
            ))}
          </div>
        )}

        {/* ── PROVIDERS ── */}
        {tab === 'providers' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">مزودو الخدمة</h2>
              <span className="text-xs text-slate-400">{providers.length} مزود — {providers.filter(p => p.is_approved).length} معتمد</span>
            </div>
            {providers.length === 0 ? (
              <div className="text-center py-16 bg-white border border-slate-200 rounded-2xl text-slate-400">
                <Users size={40} className="mx-auto mb-3 opacity-30" />
                <p>لا يوجد مزودون بعد</p>
              </div>
            ) : providers.map(prov => {
              let details: any = {}
              try { details = JSON.parse(prov.description || '{}') } catch {}
              return (
                <div key={prov.id} className="bg-white border border-slate-200 rounded-2xl p-5">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <p className="font-bold text-slate-900">{prov.company_name}</p>
                      <p className="text-sm text-slate-500">{prov.contact_name} — {prov.contact_email}</p>
                      {prov.city && <p className="text-xs text-slate-400 mt-0.5">📍 {prov.city}</p>}
                    </div>
                    <span className={`text-xs font-bold px-3 py-1 rounded-full border flex-shrink-0 ${prov.is_approved ? 'bg-green-50 text-green-600 border-green-200' : 'bg-amber-50 text-amber-600 border-amber-200'}`}>
                      {prov.is_approved ? '✓ معتمد' : 'بانتظار المراجعة'}
                    </span>
                  </div>

                  {prov.categories?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {prov.categories.map((cat: string) => (
                        <span key={cat} className="text-xs bg-primary-50 text-primary-600 border border-primary-200 px-2 py-0.5 rounded-full">{cat}</span>
                      ))}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                    {(details.cr_number || prov.cr_number) && (
                      <div className="bg-blue-50 rounded-lg px-3 py-2 border border-blue-100">
                        <span className="text-blue-500">س.ت: </span>
                        <span className="font-medium font-mono">{details.cr_number || prov.cr_number}</span>
                      </div>
                    )}
                    {details.years_experience && (
                      <div className="bg-slate-50 rounded-lg px-3 py-2">
                        <span className="text-slate-400">الخبرة: </span>
                        <span className="font-medium">{details.years_experience} سنوات</span>
                      </div>
                    )}
                    {details.certifications && (
                      <div className="bg-green-50 rounded-lg px-3 py-2 border border-green-100 col-span-2">
                        <span className="text-green-600">الشهادات: </span>
                        <span className="font-medium">{details.certifications}</span>
                      </div>
                    )}
                  </div>
                  {details.bio && <p className="text-sm text-slate-600 bg-slate-50 rounded-xl px-4 py-3 mb-3 leading-relaxed">{details.bio}</p>}

                  <div className="flex gap-2">
                    {!prov.is_approved ? (
                      <button onClick={() => approveProvider(prov.id, true)}
                        className="flex-1 bg-green-500 text-white text-xs font-bold py-2 rounded-xl hover:bg-green-600 transition-colors">
                        ✓ اعتماد المزود
                      </button>
                    ) : (
                      <button onClick={() => approveProvider(prov.id, false)}
                        className="text-xs text-amber-600 border border-amber-200 px-3 py-2 rounded-xl hover:bg-amber-50 transition-colors">
                        إلغاء الاعتماد
                      </button>
                    )}
                    <a href={`mailto:${prov.contact_email}`}
                      className="flex items-center gap-1.5 text-xs bg-slate-100 text-slate-600 px-3 py-2 rounded-xl hover:bg-slate-200 transition-colors">
                      <Mail size={12} /> راسل
                    </a>
                  </div>
                  <p className="text-xs text-slate-400 mt-2">{new Date(prov.created_at).toLocaleString('ar-SA')}</p>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
