// ══════════════════════════════════════════════════════════════════════════
// أمرني · Verify — Composition Root (Wiring)
// المكان الوحيد الذي يربط الطبقات النقية بعميل Supabase الحقيقي. عزله هنا يبقي
// ملفات الكلاسات نقية وقابلة للاختبار بلا بيئة تشغيل.
// ══════════════════════════════════════════════════════════════════════════
import { supabase } from '../supabase'
import { VerifyRepository, type SupabaseLike } from './repository'
import { VerifyService } from './service'

export const verifyRepository = new VerifyRepository(supabase as unknown as SupabaseLike)
export const verifyService = new VerifyService(verifyRepository)
