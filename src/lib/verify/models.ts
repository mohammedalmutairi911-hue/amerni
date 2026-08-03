// ══════════════════════════════════════════════════════════════════════════
// أمرني · Verify — Domain Models (Types + Display Metadata)
// طبقة النماذج: تعريفات النطاق فقط، بلا أي وصول للبيانات.
// ══════════════════════════════════════════════════════════════════════════

export type VerifyVerdict = 'recommended' | 'caution' | 'not_recommended'
export type VerifyCrStatus = 'active' | 'expired' | 'cancelled' | 'suspended' | 'unknown'
export type VerifyRequestStatus = 'pending' | 'processing' | 'ready' | 'failed'
export type VerifyReportSource = 'mock' | 'wathq' | 'manual'

export interface VerifyRedFlag {
  severity: 'low' | 'medium' | 'high' | 'critical'
  code: string
  message: string
}

export interface VerifyScoreBreakdown {
  official: number
  official_max: number
  operational: number
  operational_max: number
  reputation: number
  reputation_max: number
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
  generated_by: VerifyReportSource
  generated_at: string
}

export interface VerifyReportBundle {
  request: {
    id: string
    status: VerifyRequestStatus
    input_cr: string | null
    input_name: string | null
    created_at: string
    is_paid: boolean
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

export interface CreateRequestInput {
  cr?: string
  name?: string
}

export interface CreateRequestResult {
  request_id: string
  company_id: string
}

export interface RunResult {
  ok: boolean
  source?: string
  report_id?: string
  score?: number
  already?: boolean
}

// ── Display metadata ────────────────────────────────────────────────────────
export const VERDICT_META: Record<
  VerifyVerdict,
  { label: string; tone: 'green' | 'amber' | 'red'; icon: string }
> = {
  recommended: { label: 'نعم — يُنصح بالتعامل', tone: 'green', icon: '✓' },
  caution: { label: 'بحذر — تحقّق أكثر', tone: 'amber', icon: '!' },
  not_recommended: { label: 'لا يُنصح بالتعامل', tone: 'red', icon: '✕' },
}

export const CR_STATUS_LABEL: Record<VerifyCrStatus, string> = {
  active: 'ساري',
  expired: 'منتهي',
  cancelled: 'ملغى',
  suspended: 'موقوف',
  unknown: 'غير معروف',
}
