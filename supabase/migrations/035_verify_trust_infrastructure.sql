-- ═══════════════════════════════════════════════════════════════════════════
-- أمرني · Verify — Trust Infrastructure (Phase 1)
-- ───────────────────────────────────────────────────────────────────────────
-- Verify ليس خدمة تحقق منفصلة، بل هو نظام الثقة (Trust Layer) الذي ستبني عليه
-- RFQ والشراء والذكاء الاصطناعي لاحقاً. لذلك:
--   • الطبقة الرسمية (من واثق) لا يكتبها العميل إطلاقاً — تُكتب فقط بصلاحية
--     service_role عبر دالة verify_generate_report. هذا يمنع تزوير الثقة.
--   • Trust Score محرك واحد في SQL (verify_compute_score) = مصدر حقيقة واحد.
--   • كل شيء مصمّم Concierge-First: يمكن للأدمن تعبئة الأدلة يدوياً، ثم تُؤتمت.
-- كل الجداول مُفهرسة، بعلاقات وقيود، وعليها RLS.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Enums (idempotent) ──────────────────────────────────────────────────────
do $$ begin
  create type verify_request_status as enum ('pending','processing','ready','failed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type verify_verdict as enum ('recommended','caution','not_recommended');
exception when duplicate_object then null; end $$;

do $$ begin
  create type verify_cr_status as enum ('active','expired','cancelled','suspended','unknown');
exception when duplicate_object then null; end $$;

do $$ begin
  create type verify_evidence_type as enum (
    'website','social','project','customer','certificate',
    'accreditation','image','video','catalog','response_speed','review'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type verify_report_source as enum ('mock','wathq','manual');
exception when duplicate_object then null; end $$;


-- ═══════════════════════════════════════════════════════════════════════════
-- 1) verify_companies — الكيان الموثّق (مورد). صف واحد لكل سجل تجاري فريد.
-- ═══════════════════════════════════════════════════════════════════════════
create table if not exists public.verify_companies (
  id            uuid primary key default gen_random_uuid(),
  cr_number     text unique,                       -- رقم السجل التجاري (فريد عند وجوده)
  name          text not null,
  name_en       text,
  -- الطبقة الرسمية (من واثق) — تُكتب فقط بصلاحية service_role ------------------
  cr_status     verify_cr_status default 'unknown',
  entity_type   text,
  activity      text,
  issue_date    date,
  expiry_date   date,
  capital       numeric,
  city          text,
  region        text,
  owners        jsonb default '[]'::jsonb,
  managers      jsonb default '[]'::jsonb,
  branches      jsonb default '[]'::jsonb,
  licenses      jsonb default '[]'::jsonb,
  official_synced_at timestamptz,
  -- الطبقة التشغيلية (Operational) — قابلة للتعبئة Concierge -------------------
  website       text,
  socials       jsonb default '{}'::jsonb,
  -- الملكية والشارة ----------------------------------------------------------
  claimed_by    uuid references public.profiles(id) on delete set null,
  is_badge_active boolean default false,
  badge_expires_at timestamptz,
  latest_trust_score int,
  latest_verdict verify_verdict,
  -- ميتاداتا ----------------------------------------------------------------
  source        text default 'customer_request',   -- customer_request | supplier_claim | admin
  created_by    uuid references public.profiles(id) on delete set null,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now(),
  constraint verify_companies_name_len check (char_length(name) between 2 and 200),
  constraint verify_companies_cr_fmt   check (cr_number is null or cr_number ~ '^[0-9]{10}$')
);
create index if not exists idx_verify_companies_cr      on public.verify_companies(cr_number);
create index if not exists idx_verify_companies_name    on public.verify_companies(name);
create index if not exists idx_verify_companies_claimed on public.verify_companies(claimed_by);
create index if not exists idx_verify_companies_badge   on public.verify_companies(is_badge_active) where is_badge_active;
create index if not exists idx_verify_companies_region  on public.verify_companies(region);


-- ═══════════════════════════════════════════════════════════════════════════
-- 2) verify_requests — طلب عميل للتحقق من شركة.
-- ═══════════════════════════════════════════════════════════════════════════
create table if not exists public.verify_requests (
  id           uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles(id) on delete cascade,
  company_id   uuid references public.verify_companies(id) on delete set null,
  input_cr     text,
  input_name   text,
  status       verify_request_status default 'pending',
  report_id    uuid,                                -- FK يُضاف بعد إنشاء verify_reports
  is_paid      boolean default false,
  amount       numeric default 0,
  currency     text default 'SAR',
  error_msg    text,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now(),
  constraint verify_requests_has_input check (input_cr is not null or input_name is not null)
);
create index if not exists idx_verify_requests_requester on public.verify_requests(requester_id, created_at desc);
create index if not exists idx_verify_requests_company   on public.verify_requests(company_id);
create index if not exists idx_verify_requests_status    on public.verify_requests(status);


-- ═══════════════════════════════════════════════════════════════════════════
-- 3) verify_reports — لقطة تقرير غير قابلة للتغيير لكل طلب.
-- ═══════════════════════════════════════════════════════════════════════════
create table if not exists public.verify_reports (
  id            uuid primary key default gen_random_uuid(),
  request_id    uuid not null references public.verify_requests(id) on delete cascade,
  company_id    uuid not null references public.verify_companies(id) on delete cascade,
  official      jsonb default '{}'::jsonb,          -- لقطة الطبقة الرسمية
  operational   jsonb default '{}'::jsonb,          -- لقطة الأدلة التشغيلية
  trust_score   int not null default 0,
  score_breakdown jsonb default '{}'::jsonb,
  red_flags     jsonb default '[]'::jsonb,
  recommendations jsonb default '[]'::jsonb,
  verdict       verify_verdict not null default 'caution',
  generated_by  verify_report_source not null default 'mock',
  generated_at  timestamptz default now(),
  created_at    timestamptz default now(),
  constraint verify_reports_score_range check (trust_score between 0 and 100)
);
create index if not exists idx_verify_reports_request on public.verify_reports(request_id);
create index if not exists idx_verify_reports_company on public.verify_reports(company_id, created_at desc);

-- FK المتأخّر: verify_requests.report_id → verify_reports.id
do $$ begin
  alter table public.verify_requests
    add constraint verify_requests_report_fk
    foreign key (report_id) references public.verify_reports(id) on delete set null;
exception when duplicate_object then null; end $$;


-- ═══════════════════════════════════════════════════════════════════════════
-- 4) verify_evidence — أدلة الطبقة التشغيلية (قابلة للتعبئة Concierge).
-- ═══════════════════════════════════════════════════════════════════════════
create table if not exists public.verify_evidence (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.verify_companies(id) on delete cascade,
  type        verify_evidence_type not null,
  label       text not null,
  value       text,                                 -- رابط / نص / رقم
  verified    boolean default false,
  verified_by uuid references public.profiles(id) on delete set null,
  weight      int default 1,
  meta        jsonb default '{}'::jsonb,
  created_at  timestamptz default now(),
  constraint verify_evidence_label_len check (char_length(label) between 1 and 200)
);
create index if not exists idx_verify_evidence_company on public.verify_evidence(company_id, type);


-- ═══════════════════════════════════════════════════════════════════════════
-- 5) verify_badge_subscriptions — اشتراك الشارة (Concierge: الأدمن يعلّم مدفوع).
-- ═══════════════════════════════════════════════════════════════════════════
create table if not exists public.verify_badge_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.verify_companies(id) on delete cascade,
  supplier_id uuid references public.profiles(id) on delete set null,
  plan        text default 'monthly',               -- monthly | yearly
  status      text default 'pending',               -- pending | active | expired | cancelled
  amount      numeric default 0,
  currency    text default 'SAR',
  starts_at   timestamptz,
  expires_at  timestamptz,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);
create index if not exists idx_verify_badge_subs_company on public.verify_badge_subscriptions(company_id);
create index if not exists idx_verify_badge_subs_status  on public.verify_badge_subscriptions(status);


-- ═══════════════════════════════════════════════════════════════════════════
-- 6) verify_audit_logs — سجل تدقيق لأفعال Verify.
-- ═══════════════════════════════════════════════════════════════════════════
create table if not exists public.verify_audit_logs (
  id         uuid primary key default gen_random_uuid(),
  actor_id   uuid references public.profiles(id) on delete set null,
  action     text not null,
  entity     text not null,
  entity_id  uuid,
  meta       jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);
create index if not exists idx_verify_audit_entity on public.verify_audit_logs(entity, entity_id);
create index if not exists idx_verify_audit_created on public.verify_audit_logs(created_at desc);


-- ═══════════════════════════════════════════════════════════════════════════
-- RLS — تفعيل + سياسات
-- ═══════════════════════════════════════════════════════════════════════════
alter table public.verify_companies           enable row level security;
alter table public.verify_requests            enable row level security;
alter table public.verify_reports             enable row level security;
alter table public.verify_evidence            enable row level security;
alter table public.verify_badge_subscriptions enable row level security;
alter table public.verify_audit_logs          enable row level security;

-- helper: هل المستدعي أدمن؟
create or replace function public.verify_is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- verify_companies: قراءة عامة للموثّقين/المطالَب بهم — لكن نبقيها محكومة:
--   • الأدمن يرى الكل.  • المالك (claimed_by) يرى شركته.
--   • أي مستخدم مُسجّل يرى الشركات (بيانات السجل التجاري عامة أصلاً) للقراءة فقط.
-- الكتابة ممنوعة من العميل تماماً (تتم عبر RPCs/Edge بصلاحية أعلى).
drop policy if exists verify_companies_read on public.verify_companies;
create policy verify_companies_read on public.verify_companies
  for select using (auth.uid() is not null);

drop policy if exists verify_companies_admin_write on public.verify_companies;
create policy verify_companies_admin_write on public.verify_companies
  for all using (public.verify_is_admin()) with check (public.verify_is_admin());

-- verify_requests: العميل يرى/ينشئ طلباته فقط. الأدمن يرى الكل.
drop policy if exists verify_requests_own on public.verify_requests;
create policy verify_requests_own on public.verify_requests
  for select using (requester_id = auth.uid() or public.verify_is_admin());

drop policy if exists verify_requests_admin_all on public.verify_requests;
create policy verify_requests_admin_all on public.verify_requests
  for all using (public.verify_is_admin()) with check (public.verify_is_admin());
-- الإنشاء يتم حصراً عبر RPC verify_create_request (SECURITY DEFINER) — لا insert مباشر.

-- verify_reports: يراها صاحب الطلب أو الأدمن.
drop policy if exists verify_reports_own on public.verify_reports;
create policy verify_reports_own on public.verify_reports
  for select using (
    public.verify_is_admin()
    or exists (
      select 1 from public.verify_requests r
      where r.id = verify_reports.request_id and r.requester_id = auth.uid()
    )
  );

drop policy if exists verify_reports_admin_all on public.verify_reports;
create policy verify_reports_admin_all on public.verify_reports
  for all using (public.verify_is_admin()) with check (public.verify_is_admin());

-- verify_evidence: قراءة لأي مُسجّل، كتابة للأدمن أو مالك الشركة.
drop policy if exists verify_evidence_read on public.verify_evidence;
create policy verify_evidence_read on public.verify_evidence
  for select using (auth.uid() is not null);

drop policy if exists verify_evidence_write on public.verify_evidence;
create policy verify_evidence_write on public.verify_evidence
  for all using (
    public.verify_is_admin()
    or exists (select 1 from public.verify_companies c
               where c.id = verify_evidence.company_id and c.claimed_by = auth.uid())
  ) with check (
    public.verify_is_admin()
    or exists (select 1 from public.verify_companies c
               where c.id = verify_evidence.company_id and c.claimed_by = auth.uid())
  );

-- verify_badge_subscriptions: المورد يرى اشتراكه، الأدمن الكل.
drop policy if exists verify_badge_subs_own on public.verify_badge_subscriptions;
create policy verify_badge_subs_own on public.verify_badge_subscriptions
  for select using (supplier_id = auth.uid() or public.verify_is_admin());

drop policy if exists verify_badge_subs_admin on public.verify_badge_subscriptions;
create policy verify_badge_subs_admin on public.verify_badge_subscriptions
  for all using (public.verify_is_admin()) with check (public.verify_is_admin());

-- verify_audit_logs: الأدمن فقط يقرأ. الكتابة عبر RPCs بصلاحية definer.
drop policy if exists verify_audit_admin on public.verify_audit_logs;
create policy verify_audit_admin on public.verify_audit_logs
  for select using (public.verify_is_admin());


-- ═══════════════════════════════════════════════════════════════════════════
-- Trust Score Engine — محرك واحد، أوزان موثّقة، مصدر حقيقة واحد.
--   الرسمي (45) + التشغيلي (35) + الاستجابة والسمعة (20) − الأعلام الحمراء.
-- ═══════════════════════════════════════════════════════════════════════════
create or replace function public.verify_compute_score(p_company_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  c public.verify_companies%rowtype;
  v_official int := 0;
  v_operational int := 0;
  v_reputation int := 0;
  v_penalty int := 0;
  v_age_years numeric := 0;
  v_flags jsonb := '[]'::jsonb;
  v_recs  jsonb := '[]'::jsonb;
  v_has_website boolean;
  v_has_social boolean;
  v_projects int;
  v_customers int;
  v_certs int;
  v_accred int;
  v_resp int;
  v_reviews int;
  v_total int;
  v_verdict verify_verdict;
begin
  select * into c from public.verify_companies where id = p_company_id;
  if not found then
    return jsonb_build_object('error','company_not_found');
  end if;

  -- ── الطبقة الرسمية (max 45) ──────────────────────────────────────────────
  if c.cr_status = 'active' then
    v_official := v_official + 25;
  elsif c.cr_status = 'suspended' then
    v_official := v_official + 8;
    v_flags := v_flags || jsonb_build_object('severity','high','code','cr_suspended','message','السجل التجاري موقوف');
  elsif c.cr_status in ('expired','cancelled') then
    v_penalty := v_penalty + 30;
    v_flags := v_flags || jsonb_build_object('severity','critical','code','cr_'||c.cr_status,
               'message', case when c.cr_status='expired' then 'السجل التجاري منتهي' else 'السجل التجاري ملغى' end);
  else -- unknown
    v_flags := v_flags || jsonb_build_object('severity','medium','code','cr_unknown','message','تعذّر التأكد من حالة السجل التجاري');
  end if;

  if c.issue_date is not null then
    v_age_years := extract(epoch from (now() - c.issue_date)) / 31557600.0;
    v_official := v_official + least(10, floor(v_age_years * 2)::int); -- عامان لكل نقطة، بحد 10
    if v_age_years < 0.5 then
      v_flags := v_flags || jsonb_build_object('severity','low','code','new_entity','message','منشأة حديثة التأسيس (أقل من ٦ أشهر)');
    end if;
  end if;

  if coalesce(c.activity,'') <> '' then v_official := v_official + 5; end if;
  if jsonb_array_length(coalesce(c.licenses,'[]'::jsonb)) > 0 then v_official := v_official + 5; end if;
  v_official := least(45, v_official);

  -- ── الطبقة التشغيلية (max 35) ────────────────────────────────────────────
  v_has_website := coalesce(c.website,'') <> ''
                   or exists (select 1 from public.verify_evidence e where e.company_id=c.id and e.type='website' and e.verified);
  v_has_social  := (c.socials is not null and c.socials <> '{}'::jsonb)
                   or exists (select 1 from public.verify_evidence e where e.company_id=c.id and e.type='social' and e.verified);
  select count(*) into v_projects  from public.verify_evidence where company_id=c.id and type='project'  and verified;
  select count(*) into v_customers from public.verify_evidence where company_id=c.id and type='customer' and verified;
  select count(*) into v_certs     from public.verify_evidence where company_id=c.id and type='certificate' and verified;
  select count(*) into v_accred    from public.verify_evidence where company_id=c.id and type='accreditation' and verified;

  if v_has_website then v_operational := v_operational + 7; end if;
  if v_has_social  then v_operational := v_operational + 6; end if;
  v_operational := v_operational + least(8, v_projects * 2);
  v_operational := v_operational + least(6, v_customers * 2);
  v_operational := v_operational + least(8, (v_certs + v_accred) * 3);
  v_operational := least(35, v_operational);

  -- ── الاستجابة والسمعة (max 20) ───────────────────────────────────────────
  select count(*) into v_resp    from public.verify_evidence where company_id=c.id and type='response_speed' and verified;
  select count(*) into v_reviews from public.verify_evidence where company_id=c.id and type='review' and verified;
  if v_resp > 0 then v_reputation := v_reputation + 8; end if;
  v_reputation := v_reputation + least(12, v_reviews * 3);
  v_reputation := least(20, v_reputation);

  -- ── الإجمالي ─────────────────────────────────────────────────────────────
  v_total := greatest(0, least(100, v_official + v_operational + v_reputation - v_penalty));

  -- ── التوصيات ─────────────────────────────────────────────────────────────
  if not v_has_website then v_recs := v_recs || to_jsonb('اطلب رابط الموقع الإلكتروني الرسمي قبل التعاقد'::text); end if;
  if v_projects = 0 then v_recs := v_recs || to_jsonb('اطلب نماذج أعمال سابقة (صور قبل/بعد أو مشاريع موثّقة)'::text); end if;
  if v_certs + v_accred = 0 then v_recs := v_recs || to_jsonb('تأكد من وجود شهادات أو اعتمادات في مجال الخدمة'::text); end if;
  if v_reviews = 0 then v_recs := v_recs || to_jsonb('اطلب أرقام عملاء سابقين كمرجع'::text); end if;
  if v_total >= 75 then v_recs := v_recs || to_jsonb('يمكن التعاقد مع توثيق نطاق العمل والأسعار كتابياً'::text); end if;

  -- ── القرار (Verdict) ─────────────────────────────────────────────────────
  if c.cr_status in ('expired','cancelled') then
    v_verdict := 'not_recommended';
  elsif v_total >= 75 then
    v_verdict := 'recommended';
  elsif v_total >= 50 then
    v_verdict := 'caution';
  else
    v_verdict := 'not_recommended';
  end if;

  return jsonb_build_object(
    'score', v_total,
    'verdict', v_verdict,
    'breakdown', jsonb_build_object(
      'official', v_official, 'official_max', 45,
      'operational', v_operational, 'operational_max', 35,
      'reputation', v_reputation, 'reputation_max', 20,
      'penalty', v_penalty
    ),
    'red_flags', v_flags,
    'recommendations', v_recs
  );
end;
$$;


-- ═══════════════════════════════════════════════════════════════════════════
-- RPC: verify_create_request — العميل ينشئ طلب تحقق (Entry point).
--   ينشئ/يربط الشركة، ينشئ الطلب بحالة processing، يرجّع المعرّفات.
-- ═══════════════════════════════════════════════════════════════════════════
create or replace function public.verify_create_request(p_cr text, p_name text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_company_id uuid;
  v_request_id uuid;
  v_cr text := nullif(trim(coalesce(p_cr,'')),'');
  v_name text := nullif(trim(coalesce(p_name,'')),'');
begin
  if v_uid is null then raise exception 'unauthorized'; end if;
  if v_cr is null and v_name is null then
    raise exception 'يجب إدخال رقم السجل التجاري أو اسم الشركة';
  end if;
  if v_cr is not null and v_cr !~ '^[0-9]{10}$' then
    raise exception 'رقم السجل التجاري يجب أن يكون ١٠ أرقام';
  end if;

  -- ابحث عن الشركة أو أنشئها (auto-create supplier في قاعدة الموردين)
  if v_cr is not null then
    select id into v_company_id from public.verify_companies where cr_number = v_cr;
  end if;
  if v_company_id is null and v_name is not null then
    select id into v_company_id from public.verify_companies
      where cr_number is null and lower(name) = lower(v_name) limit 1;
  end if;

  if v_company_id is null then
    insert into public.verify_companies (cr_number, name, source, created_by)
    values (v_cr, coalesce(v_name, 'سجل تجاري ' || v_cr), 'customer_request', v_uid)
    returning id into v_company_id;
  end if;

  insert into public.verify_requests (requester_id, company_id, input_cr, input_name, status)
  values (v_uid, v_company_id, v_cr, v_name, 'processing')
  returning id into v_request_id;

  insert into public.verify_audit_logs (actor_id, action, entity, entity_id, meta)
  values (v_uid, 'verify.request.created', 'verify_request', v_request_id,
          jsonb_build_object('company_id', v_company_id, 'cr', v_cr, 'name', v_name));

  return jsonb_build_object('request_id', v_request_id, 'company_id', v_company_id);
end;
$$;


-- ═══════════════════════════════════════════════════════════════════════════
-- RPC: verify_generate_report — يُستدعى فقط من Edge (service_role) بعد جلب واثق.
--   يخزّن الطبقة الرسمية على الشركة، يحسب Score، يصنع لقطة التقرير، يجهّز الطلب.
--   ممنوع على authenticated (لمنع تزوير الطبقة الرسمية).
-- ═══════════════════════════════════════════════════════════════════════════
create or replace function public.verify_generate_report(
  p_request_id uuid,
  p_official jsonb,
  p_source verify_report_source default 'mock'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company_id uuid;
  v_score jsonb;
  v_report_id uuid;
  v_operational jsonb;
begin
  select company_id into v_company_id from public.verify_requests where id = p_request_id;
  if v_company_id is null then raise exception 'request_not_found'; end if;

  -- خزّن الطبقة الرسمية (المصدر: واثق/Mock) على الشركة
  update public.verify_companies set
    cr_status   = coalesce((p_official->>'cr_status')::verify_cr_status, cr_status),
    name        = coalesce(nullif(p_official->>'name',''), name),
    name_en     = coalesce(nullif(p_official->>'name_en',''), name_en),
    entity_type = coalesce(nullif(p_official->>'entity_type',''), entity_type),
    activity    = coalesce(nullif(p_official->>'activity',''), activity),
    issue_date  = coalesce((p_official->>'issue_date')::date, issue_date),
    expiry_date = coalesce((p_official->>'expiry_date')::date, expiry_date),
    capital     = coalesce((p_official->>'capital')::numeric, capital),
    city        = coalesce(nullif(p_official->>'city',''), city),
    region      = coalesce(nullif(p_official->>'region',''), region),
    owners      = coalesce(p_official->'owners', owners),
    managers    = coalesce(p_official->'managers', managers),
    branches    = coalesce(p_official->'branches', branches),
    licenses    = coalesce(p_official->'licenses', licenses),
    cr_number   = coalesce(cr_number, nullif(p_official->>'cr_number','')),
    official_synced_at = now(),
    updated_at  = now()
  where id = v_company_id;

  -- احسب Score (المحرك الموحّد)
  v_score := public.verify_compute_score(v_company_id);

  -- لقطة الطبقة التشغيلية
  select jsonb_build_object(
    'website', (select website from public.verify_companies where id=v_company_id),
    'socials', (select socials from public.verify_companies where id=v_company_id),
    'evidence', coalesce((select jsonb_agg(jsonb_build_object(
        'type', type, 'label', label, 'value', value, 'verified', verified))
      from public.verify_evidence where company_id=v_company_id), '[]'::jsonb)
  ) into v_operational;

  -- اصنع لقطة التقرير (immutable)
  insert into public.verify_reports (
    request_id, company_id, official, operational,
    trust_score, score_breakdown, red_flags, recommendations, verdict, generated_by
  ) values (
    p_request_id, v_company_id, p_official, v_operational,
    (v_score->>'score')::int, v_score->'breakdown', v_score->'red_flags',
    v_score->'recommendations', (v_score->>'verdict')::verify_verdict, p_source
  ) returning id into v_report_id;

  -- حدّث الطلب والشركة
  update public.verify_requests
    set status='ready', report_id=v_report_id, updated_at=now()
    where id=p_request_id;
  update public.verify_companies
    set latest_trust_score=(v_score->>'score')::int,
        latest_verdict=(v_score->>'verdict')::verify_verdict,
        updated_at=now()
    where id=v_company_id;

  -- أشعر العميل
  insert into public.notifications (user_id, type, title, body)
  select requester_id, 'verify', 'اكتمل تقرير التحقق',
         'تقرير التحقق من "' || (select name from public.verify_companies where id=v_company_id) || '" جاهز الآن.'
  from public.verify_requests where id=p_request_id;

  insert into public.verify_audit_logs (actor_id, action, entity, entity_id, meta)
  values (null, 'verify.report.generated', 'verify_report', v_report_id,
          jsonb_build_object('company_id', v_company_id, 'score', (v_score->>'score')::int, 'source', p_source));

  return jsonb_build_object('report_id', v_report_id, 'company_id', v_company_id, 'score', (v_score->>'score')::int);
end;
$$;


-- ═══════════════════════════════════════════════════════════════════════════
-- RPC: verify_get_report — يعرض التقرير الكامل (RLS: صاحب الطلب أو الأدمن).
-- ═══════════════════════════════════════════════════════════════════════════
create or replace function public.verify_get_report(p_request_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_req public.verify_requests%rowtype;
  v_company public.verify_companies%rowtype;
  v_report public.verify_reports%rowtype;
begin
  if v_uid is null then raise exception 'unauthorized'; end if;
  select * into v_req from public.verify_requests where id = p_request_id;
  if not found then raise exception 'request_not_found'; end if;
  if v_req.requester_id <> v_uid and not public.verify_is_admin() then
    raise exception 'forbidden';
  end if;

  select * into v_company from public.verify_companies where id = v_req.company_id;
  if v_req.report_id is not null then
    select * into v_report from public.verify_reports where id = v_req.report_id;
  end if;

  return jsonb_build_object(
    'request', jsonb_build_object(
      'id', v_req.id, 'status', v_req.status, 'input_cr', v_req.input_cr,
      'input_name', v_req.input_name, 'created_at', v_req.created_at, 'is_paid', v_req.is_paid),
    'company', to_jsonb(v_company),
    'report', case when v_report.id is not null then jsonb_build_object(
      'id', v_report.id, 'trust_score', v_report.trust_score, 'verdict', v_report.verdict,
      'score_breakdown', v_report.score_breakdown, 'red_flags', v_report.red_flags,
      'recommendations', v_report.recommendations, 'official', v_report.official,
      'operational', v_report.operational, 'generated_by', v_report.generated_by,
      'generated_at', v_report.generated_at) else null end
  );
end;
$$;


-- ═══════════════════════════════════════════════════════════════════════════
-- RPC: verify_list_my_requests — قائمة طلبات العميل.
-- ═══════════════════════════════════════════════════════════════════════════
create or replace function public.verify_list_my_requests()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'unauthorized'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'request_id', r.id, 'status', r.status, 'created_at', r.created_at,
      'company_name', c.name, 'cr_number', c.cr_number,
      'trust_score', c.latest_trust_score, 'verdict', c.latest_verdict
    ) order by r.created_at desc)
    from public.verify_requests r
    join public.verify_companies c on c.id = r.company_id
    where r.requester_id = v_uid
  ), '[]'::jsonb);
end;
$$;


-- ═══════════════════════════════════════════════════════════════════════════
-- الصلاحيات — الأهم أمنياً: verify_generate_report ممنوعة على authenticated.
-- ═══════════════════════════════════════════════════════════════════════════
revoke all on function public.verify_generate_report(uuid, jsonb, verify_report_source) from public, authenticated, anon;
grant execute on function public.verify_generate_report(uuid, jsonb, verify_report_source) to service_role;

grant execute on function public.verify_create_request(text, text)   to authenticated;
grant execute on function public.verify_get_report(uuid)             to authenticated;
grant execute on function public.verify_list_my_requests()           to authenticated;
grant execute on function public.verify_compute_score(uuid)          to authenticated, service_role;
grant execute on function public.verify_is_admin()                   to authenticated, service_role;

-- realtime على الطلبات ليتحدّث UI العميل لحظياً عند اكتمال التقرير
do $$ begin
  alter publication supabase_realtime add table public.verify_requests;
exception when duplicate_object then null; when others then null; end $$;
