# أمرني · Verify — توثيق الـAPI

جميع الاستدعاءات من الواجهة تمر عبر `src/lib/verify/index.ts` (الواجهة العامة).
لا يُستدعى `supabase.rpc(...)` مباشرة من أي صفحة.

---

## 1) `createVerifyRequest(input)`

ينشئ طلب تحقق جديد (أو يربط بشركة موجودة بنفس السجل التجاري).

```ts
createVerifyRequest(input: { cr?: string; name?: string }): Promise<{ request_id: string; company_id: string }>
```

- **التحقق قبل الشبكة** (في `VerifyService`، وليس في القاعدة فقط): يجب توفّر `cr`
  أو `name`؛ إن وُجد `cr` يجب أن يكون 10 أرقام بالضبط، وإلا يُرفض الطلب فوراً
  برسالة عربية واضحة قبل أي نداء شبكة.
- **RPC الخلفي**: `verify_create_request(p_cr text, p_name text)` — `SECURITY DEFINER`،
  ممنوحة لـ `authenticated` فقط. تبحث عن شركة موجودة (بالسجل ثم بالاسم)، أو تنشئ
  صفاً جديداً في `verify_companies` (auto-onboarding للمورد)، ثم تنشئ `verify_requests`
  بحالة `processing`، وتكتب سجل تدقيق `verify.request.created`.
- **أخطاء متوقّعة**: `unauthorized` (لا جلسة)، رسالة تحقق عربية (مدخلات ناقصة/رقم
  سجل غير صحيح).

---

## 2) `runVerification(requestId)`

يشغّل خط التحقق فعلياً: يستدعي Edge Function `verify-run`.

```ts
runVerification(requestId: string): Promise<{ ok: boolean; source?: string; report_id?: string; score?: number; already?: boolean }>
```

- Edge Function يعمل بصلاحية `service_role` (مفتاح `SUPABASE_SERVICE_ROLE_KEY` من
  Environment Secrets فقط، غير مكشوف للعميل).
- **Idempotent**: إن كان الطلب `ready` مسبقاً يرجع `{ ok: true, already: true }`
  دون إعادة توليد التقرير.
- الخطوات داخلياً: تحميل الطلب → اختيار المزوّد (`getProvider`) → `provider.lookup(cr, name)`
  → استدعاء `verify_generate_report` (RPC مقيّدة بـ`service_role` فقط) → عند الفشل
  يُحدَّث الطلب لحالة `failed` مع `error_msg`.
- **أخطاء متوقّعة**: `request_not_found`، `wathq_error_<status>` (عند فشل واثق
  الحقيقي)، أو أي رسالة من `verify_generate_report`.

---

## 3) `getVerifyReport(requestId)`

يجلب التقرير الكامل (طلب + شركة + تقرير إن وُجد).

```ts
getVerifyReport(requestId: string): Promise<VerifyReportBundle>
```

- **RPC الخلفي**: `verify_get_report(p_request_id uuid)` — `SECURITY DEFINER`،
  مقيّدة منطقياً: ترفض (`forbidden`) إن لم يكن المستدعي صاحب الطلب أو أدمن، حتى لو
  نجح تجاوز RLS على مستوى الجدول (دفاع مزدوج: RLS + فحص صريح داخل الدالة).
- **الشكل المُرجَع** (`VerifyReportBundle`):
  ```ts
  {
    request: { id, status, input_cr, input_name, created_at, is_paid },
    company: VerifyCompany,          // كامل صف الشركة
    report: {                        // null إن لم يكتمل التوليد بعد
      id, trust_score, verdict, score_breakdown, red_flags,
      recommendations, official, operational, generated_by, generated_at
    } | null
  }
  ```
- **أخطاء متوقّعة**: `unauthorized`، `request_not_found`، `forbidden`.

---

## 4) `listMyVerifyRequests()`

قائمة طلبات المستخدم الحالي (لصفحة "طلباتي").

```ts
listMyVerifyRequests(): Promise<VerifyListItem[]>
```

- **RPC الخلفي**: `verify_list_my_requests()` — مُرشَّحة ضمنياً بـ`requester_id = auth.uid()`
  داخل الاستعلام نفسه (وليس فقط بـRLS)، مرتّبة `created_at desc`.
- كل عنصر: `{ request_id, status, created_at, company_name, cr_number, trust_score, verdict }`.

---

## 5) `verifyEndToEnd(input)`

تدفّق مُجمَّع للاستخدام المباشر (شاشة واحدة: أدخل → انتظر → اعرض).

```ts
verifyEndToEnd(input: { cr?: string; name?: string }): Promise<VerifyReportBundle>
```

ينفّذ بالترتيب: `createRequest` → `run` → `getReport`. أي خطأ في أي مرحلة يوقف
السلسلة فوراً (بدون محاولة المتابعة بحالة جزئية).

---

## ملاحظة أمنية على كل الـAPIs

كل دالة أعلاه في النهاية تستدعي RPC واحدة في Postgres، وليست استعلام `select`/`insert`
مباشراً على الجداول من الواجهة. هذا يعني أن كل منطق التحقق والصلاحيات محصور في
مكان واحد قابل للتدقيق (migration 035)، بغض النظر عن أي عميل يستدعي الـAPI
(الواجهة الحالية، تطبيق جوال مستقبلي، إلخ) — لا يمكن لأي عميل تجاوز القواعد
لمجرد استدعاء نقطة نهاية مختلفة.

## جدول سريع: من يملك صلاحية استدعاء كل RPC؟

| RPC | authenticated | anon | service_role |
|---|:---:|:---:|:---:|
| `verify_create_request` | ✅ | ❌ | ✅ |
| `verify_get_report` | ✅ | ❌ | ✅ |
| `verify_list_my_requests` | ✅ | ❌ | ✅ |
| `verify_compute_score` | ✅ | ❌ | ✅ |
| **`verify_generate_report`** | **❌ (مُلغاة صراحةً)** | **❌** | **✅ فقط** |
