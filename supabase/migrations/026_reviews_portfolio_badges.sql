-- التقييمات الثنائية + الأعمال + شارات التوثيق
alter table public.enterprise_providers add column if not exists verification_level text default 'basic' check (verification_level in ('basic','verified','premium'));
alter table public.enterprise_providers add column if not exists review_count integer default 0;
alter table public.enterprise_providers add column if not exists client_rating numeric default 0;
update public.enterprise_providers set verification_level = 'verified' where is_approved = true;

create table if not exists public.enterprise_reviews (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.enterprise_leads(id) on delete cascade,
  reviewer_id uuid not null references auth.users(id) on delete cascade,
  reviewee_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('client_reviews_provider','provider_reviews_client')),
  stars integer not null check (stars between 1 and 5),
  comment text check (char_length(comment) <= 1000),
  created_at timestamptz default now(),
  unique (lead_id, reviewer_id));
alter table public.enterprise_reviews enable row level security;
create policy "reviews_read_all" on public.enterprise_reviews for select using (true);
create policy "reviews_write_own" on public.enterprise_reviews for insert with check (auth.uid() = reviewer_id);

create table if not exists public.provider_portfolio (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 3 and 150),
  description text check (char_length(description) <= 1000),
  category text, client_name text, year text,
  created_at timestamptz default now());
alter table public.provider_portfolio enable row level security;
create policy "portfolio_read_all" on public.provider_portfolio for select using (true);
create policy "portfolio_write_own" on public.provider_portfolio for all using (auth.uid() = provider_id) with check (auth.uid() = provider_id);
