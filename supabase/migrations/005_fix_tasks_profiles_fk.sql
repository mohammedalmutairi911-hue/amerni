-- ═══════════════════════════════════════════════════════════════
-- 005: إصلاح العلاقة بين tasks و profiles
-- المشكلة: tasks.user_id يرتبط بـ auth.users وليس public.profiles
--          مما يمنع Supabase من عمل join بين tasks و profiles
-- ═══════════════════════════════════════════════════════════════

-- إضافة foreign key من tasks.user_id إلى public.profiles
-- (profiles.id يرتبط بالفعل بـ auth.users.id)
alter table public.tasks
  drop constraint if exists tasks_user_id_profiles_fkey;

alter table public.tasks
  add constraint tasks_user_id_profiles_fkey
  foreign key (user_id) references public.profiles(id) on delete cascade;

-- إضافة foreign key من tasks.client_id إلى public.profiles أيضاً
alter table public.tasks
  drop constraint if exists tasks_client_id_profiles_fkey;

alter table public.tasks
  add constraint tasks_client_id_profiles_fkey
  foreign key (client_id) references public.profiles(id) on delete set null;

-- تحديث schema cache
notify pgrst, 'reload schema';
