// ══════════════════════════════════════════════════════════════════════════
// أمرني · Verify — Repository Layer (Data Access)
// المسؤولية الوحيدة: التخاطب مع مصدر البيانات (Supabase RPC + Edge Function).
// لا منطق أعمال هنا — فقط استدعاء وتحويل الأخطاء. يعتمد على تجريد SupabaseLike
// حتى يمكن حقن عميل وهمي في الاختبارات دون شبكة حقيقية.
// ══════════════════════════════════════════════════════════════════════════
import type {
  CreateRequestInput,
  CreateRequestResult,
  RunResult,
  VerifyListItem,
  VerifyReportBundle,
} from './models'

/** الحد الأدنى من واجهة عميل Supabase الذي تحتاجه هذه الطبقة (قابل للحقن). */
export interface SupabaseLike {
  rpc(fn: string, args?: Record<string, unknown>): Promise<{ data: any; error: { message: string } | null }>
  functions: {
    invoke(name: string, opts: { body: unknown }): Promise<{ data: any; error: { message: string } | null }>
  }
}

export class VerifyRepository {
  constructor(private db: SupabaseLike) {}

  async createRequest(input: CreateRequestInput): Promise<CreateRequestResult> {
    const { data, error } = await this.db.rpc('verify_create_request', {
      p_cr: input.cr?.trim() || null,
      p_name: input.name?.trim() || null,
    })
    if (error) throw new Error(error.message)
    return data as CreateRequestResult
  }

  async run(requestId: string): Promise<RunResult> {
    const { data, error } = await this.db.functions.invoke('verify-run', { body: { request_id: requestId } })
    if (error) throw new Error(error.message || 'verify_run_failed')
    return data as RunResult
  }

  async getReport(requestId: string): Promise<VerifyReportBundle> {
    const { data, error } = await this.db.rpc('verify_get_report', { p_request_id: requestId })
    if (error) throw new Error(error.message)
    return data as VerifyReportBundle
  }

  async listMyRequests(): Promise<VerifyListItem[]> {
    const { data, error } = await this.db.rpc('verify_list_my_requests')
    if (error) throw new Error(error.message)
    return (data ?? []) as VerifyListItem[]
  }
}
