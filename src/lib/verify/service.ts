// ══════════════════════════════════════════════════════════════════════════
// أمرني · Verify — Service Layer (Business Orchestration)
// ينسّق حالات الاستخدام فوق المستودع: إنشاء الطلب، تشغيل خط التحقق، جلب التقرير،
// والتدفّق الكامل E2E. لا يعرف تفاصيل Supabase — يتحدث للمستودع فقط.
// ══════════════════════════════════════════════════════════════════════════
import { VerifyRepository } from './repository'
import type {
  CreateRequestInput,
  CreateRequestResult,
  RunResult,
  VerifyListItem,
  VerifyReportBundle,
} from './models'

export class VerifyService {
  constructor(private repo: VerifyRepository) {}

  /** التحقق من صحة المدخلات قبل لمس الشبكة (fail-fast). */
  private validate(input: CreateRequestInput): void {
    const cr = input.cr?.trim()
    const name = input.name?.trim()
    if (!cr && !name) throw new Error('يجب إدخال رقم السجل التجاري أو اسم الشركة')
    if (cr && !/^[0-9]{10}$/.test(cr)) throw new Error('رقم السجل التجاري يجب أن يكون ١٠ أرقام')
  }

  async createRequest(input: CreateRequestInput): Promise<CreateRequestResult> {
    this.validate(input)
    return this.repo.createRequest(input)
  }

  run(requestId: string): Promise<RunResult> {
    return this.repo.run(requestId)
  }

  getReport(requestId: string): Promise<VerifyReportBundle> {
    return this.repo.getReport(requestId)
  }

  listMyRequests(): Promise<VerifyListItem[]> {
    return this.repo.listMyRequests()
  }

  /** التدفّق الكامل: أنشئ → شغّل → اجلب التقرير الجاهز. */
  async verifyEndToEnd(input: CreateRequestInput): Promise<VerifyReportBundle> {
    this.validate(input)
    const { request_id } = await this.repo.createRequest(input)
    await this.repo.run(request_id)
    return this.repo.getReport(request_id)
  }
}
