// ══════════════════════════════════════════════════════════════════════════
// أمرني · Verify — طبقة العميل (Client Service Layer)
// كل التعامل مع نظام الثقة يمر من هنا: RPCs + Edge Function، بأنواع صارمة.
// ══════════════════════════════════════════════════════════════════════════
import { supabase } from './supabase'

export type VerifyVerdict = 'recommended' | 'caution' | 'not_recommended'
export type VerifyCrStatus = 'active' | 'expired' | 'cancelled' | 'suspended' | 'unknown'
export type VerifyRequestStatus = 'pending' | 'processing' | 'ready' | 'failed'

export interface VerifyRedFlag {
  severity: 'low' | 'medium' | 'high' | 'critical'
  code: string
  message: string
}

export interface VerifyScoreBreakdown {
  official: number; official_max: number
  operational: number; operational_max: number
  reputation: number; reputation_max: number
  penalty: number
}

export interface VerifyCompany {
  id: string
  cr_number: string | null
  name: string
  name_en?: string | null
  cr_status: VerifyCrStatus
  entity_type?: string | null
  activity?: string | null
  issue_date?: string | null
  expiry_date?: string | null
  capital?: number | null
  city?: string | null
  region?: string | null
  owners?: any[]
  managers?: any[]
  branches?: any[]
  licenses?: any[]
  website?: string | null
  socials?: Record<string, string>
  is_badge_active?: boolean
  latest_trust_score?: number | null
  latest_verdict?: VerifyVerdict | null
}

export interface VerifyReport {
  id: string
  trust_score: number
  verdict: VerifyVerdict
  score_breakdown: VerifyScoreBreakdown
  red_flags: VerifyRedFlag[]
  recommendations: string[]
  official: Record<string, any>
  operational: Record<string, any>
  generated_by: 'mock' | 'wathq' | 'manual'
  generated_at: string
}

export interface VerifyReportBundle {
  request: {
    id: string; status: VerifyRequestStatus
    input_cr: string | null; input_name: string | null
    created_at: string; is_paid: boolean
  }
  company: VerifyCompany
  report: VerifyReport | null
}

export interface VerifyListItem {
  request_id: string
  status: VerifyRequestStatus
  created_at: string
  company_name: string
  cr_number: string | null
  trust_score: number | null
  verdict: VerifyVerdict | null
}

// ── 1) إنشاء طلب تحقق ────────────────────────────────────────────────────────
export async function createVerifyRequest(input: { cr?: string; name?: string }) {
  const { data, error } = await supabase.rpc('verify_create_request', {
    p_cr: input.cr?.trim() || null,
    p_name: input.name?.trim() || null,
  })
  if (error) throw new Error(error.message)
  return data as { request_id: string; company_id: string }
}

// ── 2) تشغيل خط التحقق (Edge: جلب واثق + توليد التقرير) ───────────────────────
export async function runVerification(request_id: string) {
  const { data, error } = await supabase.functions.invoke('verify-run', {
    body: { request_id },
  })
  if (error) throw new Error(error.message || 'verify_run_failed')
  return data as { ok: boolean; source?: string; report_id?: string; score?: number }
}

// ── 3) جلب التقرير ──────────────────────────────────────────────────────────
export async function getVerifyReport(request_id: string): Promise<VerifyReportBundle> {
  const { data, error } = await supabase.rpc('verify_get_report', { p_request_id: request_id })
  if (error) throw new Error(error.message)
  return data as VerifyReportBundle
}

// ── 4) قائمة طلباتي ─────────────────────────────────────────────────────────
export async function listMyVerifyRequests(): Promise<VerifyListItem[]> {
  const { data, error } = await supabase.rpc('verify_list_my_requests')
  if (error) throw new Error(error.message)
  return (data ?? []) as VerifyListItem[]
}

// ── تدفّق كامل: أنشئ → شغّل → اجلب ────────────────────────────────────────────
export async function verifyEndToEnd(input: { cr?: string; name?: string }): Promise<VerifyReportBundle> {
  const { request_id } = await createVerifyRequest(input)
  await runVerification(request_id)
  return getVerifyReport(request_id)
}

// ── مساعدات عرض ─────────────────────────────────────────────────────────────
export const VERDICT_META: Record<VerifyVerdict, { label: string; tone: 'green' | 'amber' | 'red'; icon: string }> = {
  recommended:     { label: 'نعم — يُنصح بالتعامل', tone: 'green', icon: '✓' },
  caution:         { label: 'بحذر — تحقّق أكثر',    tone: 'amber', icon: '!' },
  not_recommended: { label: 'لا يُنصح بالتعامل',    tone: 'red',   icon: '✕' },
}

export const CR_STATUS_LABEL: Record<VerifyCrStatus, string> = {
  active: 'ساري', expired: 'منتهي', cancelled: 'ملغى', suspended: 'موقوف', unknown: 'غير معروف',
}
