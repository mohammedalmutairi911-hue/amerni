-- حماية مدخلات المنشآت على مستوى القاعدة (بريد/جوال/اسم/سجل تجاري)
alter table public.enterprise_leads add constraint ent_lead_email_valid check (contact_email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');
alter table public.enterprise_leads add constraint ent_lead_phone_valid check (contact_phone is null or contact_phone ~ '^[0-9+\-() ]{9,20}$');
alter table public.enterprise_leads add constraint ent_lead_name_length check (char_length(trim(contact_name)) >= 2 and char_length(contact_name) <= 100);
alter table public.enterprise_providers add constraint ent_prov_email_valid check (contact_email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');
alter table public.enterprise_providers add constraint ent_prov_phone_valid check (contact_phone is null or contact_phone ~ '^[0-9+\-() ]{9,20}$');
alter table public.enterprise_providers add constraint ent_prov_name_length check (char_length(trim(contact_name)) >= 2 and char_length(contact_name) <= 100);
alter table public.enterprise_providers add constraint ent_prov_company_length check (char_length(trim(company_name)) >= 2 and char_length(company_name) <= 200);
alter table public.enterprise_providers add constraint ent_prov_cr_valid check (cr_number is null or cr_number ~ '^[0-9]{10}$');
