# 🔔 Push Notifications — دليل الإعداد

## الحالة الحالية

كل شيء منشور ويعمل. الـ Edge Function مباشرة على السيرفر، pg_net trigger مثبَّت، والاختبار عبر SQL يرجع `200 OK`.

الشيء الوحيد المتبقّي: أنت (كأدمن) تفعّل إذن Push من متصفح جوالك.

---

## VAPID Keys

- **Public key** موجود في `src/lib/push.ts` (آمن للنشر — المتصفحات تحتاجه)
- **Private key** موجود فقط داخل الـ Edge Function المنشورة (متغيّر بيئة/ثابت داخلي)

**لا تشارك الـ private key، ولا تدرجه في git.**

### تدوير المفاتيح عند الحاجة

```bash
# 1) ولّد keys جديدة
npx web-push generate-vapid-keys

# 2) حدّث Public في src/lib/push.ts
# 3) أعد نشر الـ Edge Function مع Private الجديد كسر (Supabase secret أو دمج مباشر)
supabase secrets set VAPID_PRIVATE_KEY='<الجديد>'
supabase functions deploy send-push --project-ref urgqapqkbwhornmgqaav

# 4) commit للـ src/lib/push.ts فقط (بدون private)
```

**ملاحظة:** تدوير المفاتيح يبطل جميع الاشتراكات الحالية — على المستخدمين تفعيل الإشعارات من جديد.

---

## الاختبار على الموقع

1. افتح https://amerniksa.com من جوالك.
2. **iPhone فقط:** أضف الموقع للشاشة الرئيسية أولاً:
   - اضغط زر Share ⬆️
   - اختر "إضافة إلى الشاشة الرئيسية"
   - افتح الموقع من الأيقونة على الشاشة الرئيسية.
3. سجّل دخول كـ أدمن (`moodi199@gmail.com`).
4. من قائمة الحساب → **الإشعارات** → اضغط **تفعيل**.
5. اقبل إذن الإشعارات من الجوال.
6. من متصفح ثاني، أنشئ طلب أو سجّل حساب → إشعار Push يوصلك خلال ثوانٍ.

للتحقق من نجاح الاشتراك:
```sql
select device_type, created_at
from push_subscriptions
where user_id = '<your-admin-uuid>';
```

للتحقق من نجاح الإرسال (بعد أي حدث):
```sql
select status_code, content
from net._http_response
order by id desc limit 3;
```
`status_code = 200` ومحتوى الرد `{"sent": N, "total": N}` = الإشعار وصل الأجهزة.

---

## الأحداث المدعومة

| الحدث | Trigger | من يستقبله |
|---|---|---|
| مستخدم جديد | `profiles INSERT` | كل الأدمنز |
| منشأة جديدة | `profiles INSERT` (platform=enterprises) | كل الأدمنز |
| عامل جديد | `profiles INSERT` (role=worker) | كل الأدمنز |
| طلب جديد | `tasks INSERT` | كل الأدمنز |
| قبول طلب | `tasks UPDATE (in_progress)` | كل الأدمنز |
| اكتمال طلب | `tasks UPDATE (completed)` | كل الأدمنز |
| إلغاء طلب | `tasks UPDATE (cancelled)` | كل الأدمنز |
| رفع نزاع | `tasks UPDATE (disputed)` | كل الأدمنز |
| تقييم جديد | `ratings INSERT` | كل الأدمنز |
| طلب تحقق | `worker_profiles INSERT` | كل الأدمنز |
| نجاح تحقق | `worker_profiles UPDATE (is_approved)` | كل الأدمنز |
| طلب منشأة | `enterprise_leads INSERT` | كل الأدمنز |
| مطابقة مزود | `enterprise_leads UPDATE (matched)` | كل الأدمنز |
| إغلاق طلب منشأة | `enterprise_leads UPDATE (closed)` | كل الأدمنز |

كل حدث يحترم تفضيلات الأدمن في `notification_preferences`.
