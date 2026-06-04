-- ═══════════════════════════════════════════
-- أمرني — قاعدة البيانات الكاملة
-- ═══════════════════════════════════════════

-- ── 1. Profiles ─────────────────────────────
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  full_name     text,
  email         text,
  phone         text,
  role          text not null default 'client' check (role in ('client','worker','admin')),
  avatar_url    text,
  phone_verified boolean default false,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);
alter table public.profiles enable row level security;
create policy "users_own_profile" on public.profiles for all using (auth.uid() = id);
create policy "read_profiles" on public.profiles for select using (true);

-- Auto create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, full_name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new.email,
    coalesce(new.raw_user_meta_data->>'role', 'client')
  );
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── 2. Worker Profiles ───────────────────────
create table if not exists public.worker_profiles (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid unique references auth.users(id) on delete cascade,
  full_name           text not null,
  phone               text not null,
  city                text not null,
  nationality         text default 'سعودي',
  national_address    text,
  id_type             text default 'saudi' check (id_type in ('saudi','resident')),
  id_number           text,
  id_image_url        text,
  id_verified         boolean default false,
  skills              text[] default '{}',
  rating              numeric(3,1) default 0,
  completed_tasks     int default 0,
  total_earnings      numeric default 0,
  availability_status text default 'offline' check (availability_status in ('online','offline','busy')),
  is_online           boolean default false,
  is_approved         boolean default false,
  verification_level  text default 'none' check (verification_level in ('none','basic','verified')),
  bio                 text default '',
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);
alter table public.worker_profiles enable row level security;
create policy "worker_own_profile" on public.worker_profiles for all using (auth.uid() = user_id);
create policy "read_worker_profiles" on public.worker_profiles for select using (true);
create policy "admin_all_workers" on public.worker_profiles for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- ── 3. Worker Schedule ──────────────────────
create table if not exists public.worker_schedule (
  id          uuid primary key default gen_random_uuid(),
  worker_id   uuid unique references auth.users(id) on delete cascade,
  work_days   int[] default '{0,1,2,3,4}',
  start_hour  int default 8,
  end_hour    int default 22,
  is_available boolean default true,
  updated_at  timestamptz default now()
);
alter table public.worker_schedule enable row level security;
create policy "worker_schedule_own" on public.worker_schedule for all using (auth.uid() = worker_id);
create policy "read_schedule" on public.worker_schedule for select using (true);

-- ── 4. Tasks ────────────────────────────────
create table if not exists public.tasks (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid references auth.users(id) on delete cascade,
  worker_id           uuid references auth.users(id),
  title               text not null,
  description         text not null,
  category            text default 'عام',
  status              text default 'waiting_for_worker' check (status in (
    'waiting_for_worker','in_progress','completed','cancelled','disputed'
  )),
  client_price        numeric default 0,
  worker_price        numeric,
  final_price         numeric,
  ai_price_min        numeric,
  ai_price_max        numeric,
  ai_price_label      text,
  negotiation_status  text check (negotiation_status in ('pending','accepted','rejected')),
  use_ai              boolean default false,
  location            text,
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);
alter table public.tasks enable row level security;
create policy "client_own_tasks" on public.tasks for all using (auth.uid() = user_id);
create policy "worker_see_tasks" on public.tasks for select using (
  status = 'waiting_for_worker' or worker_id = auth.uid()
);
create policy "worker_update_tasks" on public.tasks for update using (worker_id = auth.uid());
create policy "admin_all_tasks" on public.tasks for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- ── 5. Task Messages ────────────────────────
create table if not exists public.task_messages (
  id                uuid primary key default gen_random_uuid(),
  task_id           uuid references public.tasks(id) on delete cascade,
  sender_id         uuid references auth.users(id),
  content           text not null,
  is_system_message boolean default false,
  created_at        timestamptz default now()
);
alter table public.task_messages enable row level security;
create policy "task_participants_messages" on public.task_messages for all using (
  exists (
    select 1 from public.tasks t
    where t.id = task_id and (t.user_id = auth.uid() or t.worker_id = auth.uid())
  )
);
create policy "admin_all_messages" on public.task_messages for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- ── 6. Task Files (Escrow) ──────────────────
create table if not exists public.task_files (
  id          uuid primary key default gen_random_uuid(),
  task_id     uuid references public.tasks(id) on delete cascade,
  uploader_id uuid references auth.users(id),
  file_name   text not null,
  file_url    text not null,
  file_size   int default 0,
  is_locked   boolean default true,
  lock_reason text default 'awaiting_payment',
  unlocked_at timestamptz,
  created_at  timestamptz default now()
);
alter table public.task_files enable row level security;
create policy "task_files_worker_upload" on public.task_files for insert with check (auth.uid() = uploader_id);
create policy "task_files_worker_see_own" on public.task_files for select using (auth.uid() = uploader_id);
create policy "task_files_client_unlocked" on public.task_files for select using (
  is_locked = false and exists (
    select 1 from public.tasks where id = task_id and user_id = auth.uid()
  )
);
create policy "admin_all_files" on public.task_files for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- ── 7. Blocked Messages ─────────────────────
create table if not exists public.blocked_messages (
  id         uuid primary key default gen_random_uuid(),
  task_id    uuid references public.tasks(id) on delete cascade,
  sender_id  uuid references auth.users(id),
  content    text not null,
  reason     text not null,
  created_at timestamptz default now()
);
alter table public.blocked_messages enable row level security;
create policy "admin_blocked" on public.blocked_messages for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- ── 8. Notifications ────────────────────────
create table if not exists public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users(id) on delete cascade,
  type       text default 'info',
  title      text not null,
  body       text default '',
  task_id    uuid references public.tasks(id) on delete set null,
  read       boolean default false,
  created_at timestamptz default now()
);
alter table public.notifications enable row level security;
create policy "users_own_notifs" on public.notifications for all using (auth.uid() = user_id);

-- ── 9. Ratings ──────────────────────────────
create table if not exists public.ratings (
  id         uuid primary key default gen_random_uuid(),
  task_id    uuid unique references public.tasks(id) on delete cascade,
  worker_id  uuid references auth.users(id),
  rater_id   uuid references auth.users(id),
  stars      int not null check (stars between 1 and 5),
  comment    text,
  is_public  boolean default true,
  created_at timestamptz default now()
);
alter table public.ratings enable row level security;
create policy "read_public_ratings" on public.ratings for select using (is_public = true);
create policy "insert_rating" on public.ratings for insert with check (auth.uid() = rater_id);

-- ── 10. Support Conversations ───────────────
create table if not exists public.support_conversations (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users(id) on delete cascade,
  status     text default 'open' check (status in ('open','resolved')),
  created_at timestamptz default now()
);
alter table public.support_conversations enable row level security;
create policy "support_own" on public.support_conversations for all using (auth.uid() = user_id);
create policy "admin_support" on public.support_conversations for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

create table if not exists public.support_messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid references public.support_conversations(id) on delete cascade,
  sender          text not null check (sender in ('user','ai','admin')),
  content         text not null,
  created_at      timestamptz default now()
);
alter table public.support_messages enable row level security;
create policy "support_msg_own" on public.support_messages for all using (
  exists (
    select 1 from public.support_conversations sc
    where sc.id = conversation_id and sc.user_id = auth.uid()
  )
);
create policy "admin_support_msg" on public.support_messages for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- ── 11. Functions ────────────────────────────
create or replace function public.accept_task(
  p_task_id uuid, p_worker_id uuid, p_worker_price numeric
) returns text language plpgsql security definer as $$
begin
  if not exists (select 1 from public.tasks where id = p_task_id and status = 'waiting_for_worker') then
    return 'not_available';
  end if;
  update public.tasks set
    worker_id = p_worker_id, status = 'in_progress',
    worker_price = p_worker_price, negotiation_status = 'pending',
    updated_at = now()
  where id = p_task_id and status = 'waiting_for_worker';
  insert into public.notifications (user_id, type, title, body, task_id)
  select user_id, 'task_accepted', 'تم قبول طلبك!', 'عامل بدأ العمل على طلبك.', p_task_id
  from public.tasks where id = p_task_id;
  return 'ok';
end; $$;

create or replace function public.unlock_task_files(
  p_task_id uuid, p_worker_id uuid
) returns text language plpgsql security definer as $$
begin
  if auth.uid() <> p_worker_id then return 'unauthorized'; end if;
  update public.task_files set is_locked = false, unlocked_at = now()
  where task_id = p_task_id and is_locked = true;
  update public.tasks set status = 'completed', updated_at = now()
  where id = p_task_id;
  insert into public.notifications (user_id, type, title, body, task_id)
  select user_id, 'task_completed', 'تم إنجاز طلبك! 🎉', 'أكّد الاستلام وقيّم العامل.', p_task_id
  from public.tasks where id = p_task_id;
  return 'ok';
end; $$;

create or replace function public.submit_rating(
  p_task_id uuid, p_stars int, p_comment text default null
) returns text language plpgsql security definer as $$
declare v_task record;
begin
  select * into v_task from public.tasks where id = p_task_id;
  if not found then return 'not_found'; end if;
  if v_task.user_id <> auth.uid() then return 'unauthorized'; end if;
  insert into public.ratings (task_id, worker_id, rater_id, stars, comment)
  values (p_task_id, v_task.worker_id, auth.uid(), p_stars, p_comment)
  on conflict (task_id) do update set stars = p_stars, comment = p_comment;
  update public.worker_profiles set rating = (
    select round(avg(stars)::numeric, 1) from public.ratings where worker_id = v_task.worker_id
  ), completed_tasks = completed_tasks + 1
  where user_id = v_task.worker_id;
  return 'ok';
end; $$;

-- Enable realtime
alter publication supabase_realtime add table public.task_messages;
alter publication supabase_realtime add table public.notifications;
alter publication supabase_realtime add table public.tasks;
alter publication supabase_realtime add table public.task_files;

-- Storage buckets (run manually in dashboard)
-- insert into storage.buckets (id, name, public) values ('worker-docs', 'worker-docs', false);
-- insert into storage.buckets (id, name, public) values ('task-files', 'task-files', true);
