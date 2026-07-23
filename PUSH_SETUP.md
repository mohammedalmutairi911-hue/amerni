# 🔔 Push Notifications — الخطوات الأخيرة

كل البنية التحتية جاهزة ومنشورة. تبقّى خطوتان أنت تسويهم:

## VAPID Keys الجاهزة

```
Public:  BIQwYXD3COvkMJ2XQ0idXKdUxRMRsp0p5PygMZiBLoO6FgZlW3QDHfAU6ragZ67xeU7LIvYN5V9GIqr2iPYyy6U
Private: 33y1J-aOpfCQCoosXWIqzpP00WByQtSqVUoDA1X9gJY
```

المفتاح العام (Public) مدمج في الكود. المفتاح الخاص (Private) لازم يروح كـ Supabase secret.

---

## الخطوة 1: نشر Edge Function `send-push`

من جهازك:

```bash
cd amerni3

# 1) سجّل الأسرار (مرة واحدة)
supabase secrets set VAPID_PUBLIC_KEY='BIQwYXD3COvkMJ2XQ0idXKdUxRMRsp0p5PygMZiBLoO6FgZlW3QDHfAU6ragZ67xeU7LIvYN5V9GIqr2iPYyy6U'
supabase secrets set VAPID_PRIVATE_KEY='33y1J-aOpfCQCoosXWIqzpP00WByQtSqVUoDA1X9gJY'
supabase secrets set VAPID_SUBJECT='mailto:support@amerniksa.com'

# 2) انشر الدالة
supabase functions deploy send-push --project-ref urgqapqkbwhornmgqaav
```

## الخطوة 2: ربط Database Webhook

في Supabase Dashboard:

1. اذهب لـ **Database → Webhooks → Create a new hook**
2. عبّي:
   - **Name:** `notif-to-push`
   - **Table:** `notifications`
   - **Events:** ✅ INSERT
   - **Type:** Supabase Edge Functions
   - **Function:** `send-push`
   - **Method:** POST
   - **HTTP Headers:** خلّها الافتراضية
3. احفظ.

---

## اختبار

بعد إتمام الخطوتين، من أي متصفح:

1. سجّل دخول كأدمن (moodi199@gmail.com)
2. روح لـ **الإشعارات** من قائمة الحساب
3. اضغط **تفعيل** لإذن Push
4. من جهاز/متصفح ثاني، سجّل حساب جديد أو أنشئ طلب

راح يوصلك إشعار Push فوراً على الجوال — حتى لو المتصفح مغلق.

---

## استكشاف الأخطاء

**ما وصلني إشعار:**
- تحقق: `Database → Webhooks → notif-to-push → Logs` — هل استُدعيت الدالة؟
- تحقق: `Edge Functions → send-push → Logs` — هل رجعت 200؟
- تحقق: جدول `push_subscriptions` — هل جهازك مسجّل؟

**iOS ما يظهر خيار "تفعيل":**
- المستخدم لازم يضيف الموقع للشاشة الرئيسية أولاً (زر "شارك → إضافة للشاشة الرئيسية")
- iOS Safari يدعم Push فقط داخل PWA المثبَّت

**التوكن انتهت صلاحيته:**
- الدالة تحذف الاشتراك تلقائياً إذا رجع Push service بـ 404 أو 410
- الـ SW يعيد التسجيل تلقائياً عند `pushsubscriptionchange`

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

كل حدث يحترم تفضيلات الأدمن في `notification_preferences` — الأدمن يقدر يوقف نوعاً معيّناً من صفحة الإشعارات.
