-- صيغة جوال سعودية: 10 أرقام تبدأ بـ 05 (أو دولي +)
alter table public.enterprise_leads drop constraint if exists ent_lead_phone_valid;
alter table public.enterprise_leads add constraint ent_lead_phone_valid
  check (contact_phone is null or contact_phone ~ '^(05[0-9]{8}|\+[0-9]{8,15})$');
alter table public.enterprise_providers drop constraint if exists ent_prov_phone_valid;
alter table public.enterprise_providers add constraint ent_prov_phone_valid
  check (contact_phone is null or contact_phone ~ '^(05[0-9]{8}|\+[0-9]{8,15})$');
