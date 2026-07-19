-- حماية مدخلات الأفراد (هوية/جوال/بريد/اسم/عنوان/سعر)
alter table public.worker_profiles add constraint wp_id_number_valid check (id_number is null or id_number ~ '^[0-9]{10}$');
alter table public.worker_profiles add constraint wp_phone_valid check (phone is null or phone ~ '^[0-9+\-() ]{9,20}$');
alter table public.worker_profiles add constraint wp_name_length check (full_name is null or (char_length(trim(full_name)) >= 2 and char_length(full_name) <= 100));
alter table public.profiles add constraint prof_phone_valid check (phone is null or phone ~ '^[0-9+\-() ]{9,20}$');
alter table public.profiles add constraint prof_email_valid check (email is null or email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');
alter table public.profiles add constraint prof_name_length check (full_name is null or char_length(full_name) <= 100);
alter table public.tasks add constraint task_title_length check (char_length(trim(title)) >= 3 and char_length(title) <= 150);
alter table public.tasks add constraint task_desc_length check (description is null or char_length(description) <= 2000);
alter table public.tasks add constraint task_price_sane check ((price_suggested is null or (price_suggested >= 0 and price_suggested <= 1000000)) and (price_final is null or (price_final >= 0 and price_final <= 1000000)));
