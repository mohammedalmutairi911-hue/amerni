-- إصلاح trigger التسجيل ليدعم platform (كان ينشئ الحساب دائماً individuals)
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, email, full_name, role, platform, phone_verified)
  values (new.id, new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'role', 'client'),
    coalesce(new.raw_user_meta_data->>'platform', 'individuals'), false)
  on conflict (id) do update set
    email = excluded.email,
    full_name = coalesce(excluded.full_name, profiles.full_name),
    role = coalesce(excluded.role, profiles.role),
    platform = coalesce(excluded.platform, profiles.platform);
  return new;
end; $$;
