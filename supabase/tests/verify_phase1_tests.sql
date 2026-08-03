-- ═══════════════════════════════════════════════════════════════════════════
-- أمرني · Verify Phase 1 — SQL Test Suite (Unit + Integration + RLS/RBAC + E2E)
-- ───────────────────────────────────────────────────────────────────────────
-- يُشغَّل على staging فقط. يفترض وجود:
--   • مخطط Verify (migration 035)
--   • ثلاث هويات اختبار في public.profiles:
--       11111111-… (client) · 22222222-… (client) · 33333333-… (admin)
-- التشغيل: psql "$STAGING_DB_URL" -f supabase/tests/verify_phase1_tests.sql
-- كل صف نتيجة فيه passed=boolean. الفشل = صف واحد على الأقل passed=false.
-- ═══════════════════════════════════════════════════════════════════════════
\set ON_ERROR_STOP off
drop table if exists _verify_test_results;
create temp table _verify_test_results(layer text, test text, passed boolean, detail text);

-- ── تنظيف تركيبات سابقة ──────────────────────────────────────────────────────
delete from public.verify_evidence where company_id in (select id from public.verify_companies where name like 'UT-%');
delete from public.verify_reports  where company_id in (select id from public.verify_companies where name like 'UT-%');
delete from public.verify_requests where company_id in (select id from public.verify_companies where name like 'UT-%');
delete from public.verify_companies where name like 'UT-%';
delete from public.verify_reports  where request_id in (select id from public.verify_requests where input_cr='1010101010');
delete from public.verify_requests where input_cr='1010101010';
delete from public.verify_companies where cr_number='1010101010';

-- ═══ UNIT · Trust Score Engine ═══════════════════════════════════════════════
insert into public.verify_companies (name, cr_status, activity, issue_date, licenses) values
  ('UT-active-basic','active','مقاولات', now()::date - interval '5 years', '["x"]'::jsonb),
  ('UT-expired','expired','مقاولات', now()::date - interval '5 years', '[]'::jsonb),
  ('UT-unknown','unknown',null,null,'[]'::jsonb),
  ('UT-new','active','تقنية', now()::date - interval '2 months', '[]'::jsonb),
  ('UT-full','active','تقنية', now()::date - interval '8 years', '["a","b"]'::jsonb);

update public.verify_companies set website='https://example.sa' where name='UT-full';
insert into public.verify_evidence (company_id, type, label, verified)
select c.id, t.type::verify_evidence_type, t.label, true
from (select id from public.verify_companies where name='UT-full') c
cross join (values
  ('website','w'),('project','p1'),('project','p2'),('project','p3'),('project','p4'),
  ('customer','c1'),('customer','c2'),('customer','c3'),
  ('certificate','cert'),('accreditation','acc'),
  ('review','r1'),('review','r2'),('review','r3'),('review','r4'),('response_speed','rs')
) t(type,label);

insert into _verify_test_results
select 'UNIT', c.name,
  case c.name
    when 'UT-active-basic' then (s.r->'breakdown'->>'official')::int=45 and (s.r->>'score')::int=45 and s.r->>'verdict'='not_recommended'
    when 'UT-expired'      then (s.r->'breakdown'->>'penalty')::int=30 and s.r->>'verdict'='not_recommended' and s.r->'red_flags'::text like '%cr_expired%'
    when 'UT-unknown'      then s.r->'red_flags'::text like '%cr_unknown%' and s.r->>'verdict'='not_recommended'
    when 'UT-new'          then s.r->'red_flags'::text like '%new_entity%'
    when 'UT-full'         then (s.r->>'score')::int>=75 and s.r->>'verdict'='recommended' and (s.r->'breakdown'->>'reputation')::int=20
  end,
  'score='||(s.r->>'score')
from public.verify_companies c
cross join lateral (select public.verify_compute_score(c.id) r) s
where c.name like 'UT-%';

-- ═══ RBAC · Function execution grants ════════════════════════════════════════
insert into _verify_test_results values
  ('RBAC','authenticated ∌ verify_generate_report',
     has_function_privilege('authenticated','public.verify_generate_report(uuid,jsonb,verify_report_source)','execute')=false, null),
  ('RBAC','anon ∌ verify_generate_report',
     has_function_privilege('anon','public.verify_generate_report(uuid,jsonb,verify_report_source)','execute')=false, null),
  ('RBAC','service_role ∋ verify_generate_report',
     has_function_privilege('service_role','public.verify_generate_report(uuid,jsonb,verify_report_source)','execute')=true, null),
  ('RBAC','authenticated ∋ verify_create_request',
     has_function_privilege('authenticated','public.verify_create_request(text,text)','execute')=true, null);

-- ═══ INTEGRATION + E2E · RPC pipeline (impersonation via JWT claims) ══════════
do $$
declare
  v_client uuid := '11111111-1111-1111-1111-111111111111';
  v_other  uuid := '22222222-2222-2222-2222-222222222222';
  v_res jsonb; v_req uuid; v_co uuid; v_bundle jsonb; v_forbidden boolean; v_official jsonb;
begin
  perform set_config('request.jwt.claims', json_build_object('sub',v_client,'role','authenticated')::text, true);
  v_res := public.verify_create_request('1010101010','شركة التكامل للاختبار');
  v_req := (v_res->>'request_id')::uuid; v_co := (v_res->>'company_id')::uuid;
  insert into _verify_test_results values('INTEGRATION','create_request ينشئ طلب+شركة', v_req is not null and v_co is not null, null);
  insert into _verify_test_results select 'INTEGRATION','الطلب processing ومالكه العميل',
    exists(select 1 from public.verify_requests where id=v_req and requester_id=v_client and status='processing'), null;
  insert into _verify_test_results select 'INTEGRATION','audit request.created مكتوب',
    exists(select 1 from public.verify_audit_logs where entity_id=v_req and action='verify.request.created'), null;

  perform set_config('request.jwt.claims', json_build_object('sub',v_other,'role','authenticated')::text, true);
  v_forbidden := false;
  begin perform public.verify_get_report(v_req);
  exception when others then if sqlerrm like '%forbidden%' then v_forbidden := true; end if; end;
  insert into _verify_test_results values('INTEGRATION','get_report ممنوع لغير المالك', v_forbidden, null);

  v_official := jsonb_build_object('cr_number','1010101010','name','شركة التكامل للاختبار','cr_status','active',
    'activity','تقنية المعلومات','issue_date',(now()::date - interval '6 years')::text,
    'licenses', jsonb_build_array(jsonb_build_object('type','رخصة','status','سارية')));
  v_res := public.verify_generate_report(v_req, v_official, 'mock');
  insert into _verify_test_results values('E2E','generate_report ينتج تقريراً', (v_res->>'report_id') is not null, 'score='||(v_res->>'score'));
  insert into _verify_test_results select 'E2E','الطلب ready ومربوط report_id',
    exists(select 1 from public.verify_requests where id=v_req and status='ready' and report_id is not null), null;
  insert into _verify_test_results select 'E2E','الطبقة الرسمية خُزّنت على الشركة',
    exists(select 1 from public.verify_companies where id=v_co and cr_status='active' and official_synced_at is not null), null;

  perform set_config('request.jwt.claims', json_build_object('sub',v_client,'role','authenticated')::text, true);
  v_bundle := public.verify_get_report(v_req);
  insert into _verify_test_results values('E2E','العميل يقرأ تقريره الكامل',
    (v_bundle->'report'->>'trust_score') is not null and (v_bundle->'request'->>'status')='ready', 'verdict='||(v_bundle->'report'->>'verdict'));
  insert into _verify_test_results select 'E2E','إشعار verify أُرسل للعميل',
    exists(select 1 from public.notifications where user_id=v_client and type='verify'), null;
  insert into _verify_test_results select 'E2E','audit report.generated مكتوب',
    exists(select 1 from public.verify_audit_logs where action='verify.report.generated' and (meta->>'company_id')::uuid=v_co), null;
end $$;

-- ═══ RLS · Row isolation (executed as non-privileged authenticated role) ══════
-- ملاحظة: تُشغَّل هذه الكتل يدوياً بمعاملة منفصلة لأن set local role يتطلب معاملة:
--   begin; set local role authenticated;
--   select set_config('request.jwt.claims','{"sub":"<uuid>","role":"authenticated"}',true);
--   select count(*) from public.verify_requests;  -- العميل الآخر: 0 · المالك: ≥1
--   rollback;

-- ── النتيجة النهائية ─────────────────────────────────────────────────────────
select layer, test, passed, coalesce(detail,'') detail from _verify_test_results order by layer, test;
select case when bool_and(passed) then '✅ ALL PASSED' else '❌ SOME FAILED' end as suite_result,
       count(*) filter (where passed) as passed, count(*) as total
from _verify_test_results;
