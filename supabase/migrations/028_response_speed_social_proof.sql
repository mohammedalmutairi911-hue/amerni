-- سرعة الاستجابة + الدليل الاجتماعي + الرد على التقييمات
alter table public.enterprise_providers add column if not exists avg_response_minutes integer;
alter table public.enterprise_providers add column if not exists accepted_count integer default 0;
alter table public.enterprise_reviews add column if not exists response text check (char_length(response) <= 500);
alter table public.enterprise_reviews add column if not exists responded_at timestamptz;
-- provider_accept_lead محدّثة لحساب سرعة الاستجابة
-- respond_to_review(p_review_id, p_response) — المزود يرد على تقييم
-- get_platform_stats() — إحصائيات الدليل الاجتماعي (موثقة بالكامل في القاعدة عبر MCP)
