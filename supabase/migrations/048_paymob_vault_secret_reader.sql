-- مفاتيح Paymob (Live) محفوظة مشفّرة في Supabase Vault بأسماء:
--   paymob_secret_key, paymob_public_key, paymob_hmac_secret
-- (أُضيفت عبر vault.create_secret مباشرة — القيم ليست في المستودع)
-- دوال paymob-create-payment و paymob-webhook تقرأها من هنا أولاً ثم من متغيرات البيئة.
create or replace function public.paymob_vault_secret(p_name text)
 returns text
 language sql
 security definer
 set search_path to 'public', 'pg_temp'
as $$
  select decrypted_secret from vault.decrypted_secrets
  where name = p_name and p_name in ('paymob_secret_key', 'paymob_public_key', 'paymob_hmac_secret')
  limit 1
$$;
revoke all on function public.paymob_vault_secret(text) from public, anon, authenticated;
grant execute on function public.paymob_vault_secret(text) to service_role;
