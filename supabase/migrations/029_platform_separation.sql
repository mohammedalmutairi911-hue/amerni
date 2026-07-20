-- فصل الأفراد عن المنشآت
alter table public.profiles add column if not exists platform text default 'individuals'
  check (platform in ('individuals','enterprises'));
update public.profiles set platform = 'individuals' where platform is null;
