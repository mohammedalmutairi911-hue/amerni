-- الداعي يشوف مكافآته فقط (قراءة)، والأدمن يشوف الكل. الكتابة من دالة التأكيد فقط.
create policy referrer_read_own_referral_commissions on public.referral_commissions
  for select to authenticated
  using (referrer_id = (select auth.uid()) or exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin'));
