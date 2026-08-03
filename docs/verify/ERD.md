# أمرني · Verify — مخطط العلاقات (ERD)

## المخطط

```mermaid
erDiagram
    profiles ||--o{ verify_companies : "claimed_by / created_by"
    profiles ||--o{ verify_requests : "requester_id"
    profiles ||--o{ verify_evidence : "verified_by"
    profiles ||--o{ verify_badge_subscriptions : "supplier_id"
    profiles ||--o{ verify_audit_logs : "actor_id"

    verify_companies ||--o{ verify_requests : "company_id"
    verify_companies ||--o{ verify_reports : "company_id"
    verify_companies ||--o{ verify_evidence : "company_id"
    verify_companies ||--o{ verify_badge_subscriptions : "company_id"

    verify_requests ||--o| verify_reports : "report_id (FK متأخّر)"
    verify_requests ||--o{ verify_reports : "request_id"

    verify_companies {
        uuid id PK
        text cr_number UK "10 digits, unique"
        text name
        verify_cr_status cr_status "active/expired/cancelled/suspended/unknown"
        text entity_type
        text activity
        date issue_date
        date expiry_date
        numeric capital
        jsonb owners
        jsonb managers
        jsonb licenses
        timestamptz official_synced_at
        text website
        uuid claimed_by FK
        boolean is_badge_active
        int latest_trust_score
        verify_verdict latest_verdict
        uuid created_by FK
    }

    verify_requests {
        uuid id PK
        uuid requester_id FK "not null"
        uuid company_id FK
        text input_cr
        text input_name
        verify_request_status status "pending/processing/ready/failed"
        uuid report_id FK "متأخّر → verify_reports"
        boolean is_paid
        numeric amount
    }

    verify_reports {
        uuid id PK
        uuid request_id FK "not null"
        uuid company_id FK "not null"
        jsonb official "لقطة غير قابلة للتغيير"
        jsonb operational
        int trust_score "0-100"
        jsonb score_breakdown
        jsonb red_flags
        jsonb recommendations
        verify_verdict verdict
        verify_report_source generated_by "mock/wathq/manual"
        timestamptz generated_at
    }

    verify_evidence {
        uuid id PK
        uuid company_id FK "not null"
        verify_evidence_type type
        text label
        text value
        boolean verified
        uuid verified_by FK
        int weight
    }

    verify_badge_subscriptions {
        uuid id PK
        uuid company_id FK "not null"
        uuid supplier_id FK
        text plan "monthly/yearly"
        text status "pending/active/expired/cancelled"
        numeric amount
        timestamptz expires_at
    }

    verify_audit_logs {
        uuid id PK
        uuid actor_id FK "nullable (service_role = null)"
        text action
        text entity
        uuid entity_id
        jsonb meta
    }
```

## ملاحظات على العلاقات

- **`verify_requests.report_id` → `verify_reports.id`**: قيد FK يُضاف بعد إنشاء
  الجدولين (`do $$ ... exception when duplicate_object ...`) لأن `verify_reports`
  يعتمد أصلاً على `verify_requests.id` — علاقة دائرية مقصودة تُحل بترتيب الإنشاء
  ثم إضافة القيد المتأخر.
- **`verify_reports` غير قابل للتعديل (immutable) منطقياً**: لا توجد أي سياسة RLS
  أو RPC تسمح بـ`UPDATE` على هذا الجدول بعد الإدخال — كل تقرير هو لقطة (snapshot)
  ثابتة في تلك اللحظة، حتى لو تغيّرت بيانات الشركة لاحقاً.
- **`verify_companies.cr_number` فريد (UNIQUE) عند وجوده**: يمنع تكرار نفس السجل
  التجاري كصفين مختلفين — أي طلب تحقق لاحق لنفس السجل يُعاد استخدام نفس الصف
  ويُراكم عليه (بدلاً من تكرار الشركة).
- **الفهارس (22 إجمالاً)**: على كل مفتاح خارجي، وعلى `cr_number`/`name` للبحث،
  وفهرس جزئي (`partial index`) على `is_badge_active` (`where is_badge_active`)
  لتسريع استعلامات "الموردون الموثّقون فقط" دون فحص كامل الجدول.

## الأنواع المعدودة (Enums)

| Enum | القيم |
|---|---|
| `verify_request_status` | `pending`, `processing`, `ready`, `failed` |
| `verify_verdict` | `recommended`, `caution`, `not_recommended` |
| `verify_cr_status` | `active`, `expired`, `cancelled`, `suspended`, `unknown` |
| `verify_evidence_type` | `website`, `social`, `project`, `customer`, `certificate`, `accreditation`, `image`, `video`, `catalog`, `response_speed`, `review` |
| `verify_report_source` | `mock`, `wathq`, `manual` |
