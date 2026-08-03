// ══════════════════════════════════════════════════════════════════════════
// أمرني · Verify — Public API Barrel
// نقطة الدخول الوحيدة لطبقة Verify. يعيد تصدير النماذج، ويوفّر واجهة الدوال
// المتوافقة مع الاستخدام السابق (حتى لا تنكسر الصفحات) فوق طبقة الخدمة.
// ══════════════════════════════════════════════════════════════════════════
export * from './models'
export { VerifyService } from './service'
export { VerifyRepository } from './repository'
export type { SupabaseLike } from './repository'
export { verifyRepository, verifyService } from './client'

import { verifyService } from './client'
import type { CreateRequestInput } from './models'

// ── واجهة الدوال المتوافقة خلفياً (Backward-compatible facade) ────────────────
export const createVerifyRequest = (input: CreateRequestInput) => verifyService.createRequest(input)
export const runVerification = (requestId: string) => verifyService.run(requestId)
export const getVerifyReport = (requestId: string) => verifyService.getReport(requestId)
export const listMyVerifyRequests = () => verifyService.listMyRequests()
export const verifyEndToEnd = (input: CreateRequestInput) => verifyService.verifyEndToEnd(input)
