-- الإحالة الجديدة: اللي يسجّل من رابطك — أول طلبين يكتملون له، عمولة الموقع (5٪) كاملة
-- تروح لمحفظتك بدل الموقع. العامل ما يتغير عليه شي (الـ5٪ تنخصم منه كالعادة).
-- المكافأة القديمة (نسبة صغيرة من العمولة على كل طلب) أُلغيت.
-- تنضاف للمحفظة فقط إذا الطلب مدفوع فعلاً عبر البوابة (الدفعة المحجوزة اتحررت)،
-- وتنسجّل في referral_commissions (paid = true لأنها انضافت للمحفظة مباشرة).
create or replace function public.confirm_task_completion(p_task_id uuid)
 returns json
 language plpgsql
 security definer
 set search_path to 'public', 'pg_temp'
as $function$
declare
  v_client_id  uuid := auth.uid();
  v_task       tasks%rowtype;
  v_amount     numeric;
  v_commission numeric;
  v_referrer   uuid;
  v_ref_bonus  numeric;
  v_ref_used   integer;
  v_ref_bal    numeric;
  v_txn        public.payment_transactions%rowtype;
  v_new_balance numeric;
begin
  if v_client_id is null then raise exception 'غير مصرح'; end if;
  select * into v_task from tasks where id = p_task_id for update;
  if v_task.client_id != v_client_id then raise exception 'غير مصرح'; end if;
  if v_task.status != 'pending_confirmation' then raise exception 'الطلب ليس بانتظار التأكيد'; end if;
  if coalesce(v_task.payment_status, 'unpaid') not in ('held', 'paid') then raise exception 'الطلب ما انْدفع'; end if;

  update tasks set status = 'completed' where id = p_task_id;
  v_amount     := coalesce(v_task.price_final, v_task.price_suggested, 0);
  v_commission := round(v_amount * 0.05, 2);

  perform set_config('app.trusted_update', 'on', true);
  update worker_profiles set
    completed_tasks = coalesce(completed_tasks, 0) + 1,
    total_earnings  = coalesce(total_earnings, 0) + v_amount
  where user_id = v_task.worker_id;
  perform set_config('app.trusted_update', 'off', true);

  insert into notifications (user_id, title, body, task_id)
  values (v_task.worker_id, 'العميل أكّد الإكمال ✅', 'العمولة المستحقة: ' || v_commission || ' ريال', p_task_id);

  select * into v_txn from public.payment_transactions
    where task_id = p_task_id and status = 'held' order by created_at desc limit 1;

  if found then
    update public.payment_transactions
      set status = 'released', released_at = now(), updated_at = now()
      where id = v_txn.id;
    update public.tasks set payment_status = 'released' where id = p_task_id;

    insert into public.wallets (user_id, balance_available)
      values (v_txn.payee_id, 0)
      on conflict (user_id) do nothing;

    update public.wallets
      set balance_available = balance_available + v_txn.payee_amount,
          total_earned = total_earned + v_txn.payee_amount,
          updated_at = now()
      where user_id = v_txn.payee_id
      returning balance_available into v_new_balance;

    insert into public.wallet_ledger (user_id, type, amount, balance_after, reference_type, reference_id, note)
      values (v_txn.payee_id, 'credit_release', v_txn.payee_amount, v_new_balance,
              'payment_transaction', v_txn.id, 'تحرير دفعة بعد تأكيد العميل الاستلام');

    insert into public.notifications (user_id, type, title, body, task_id) values
      (v_txn.payee_id, 'payment', 'وصلتك دفعتك 💰',
       'تم تحويل ' || v_txn.payee_amount || ' ريال إلى محفظتك في أمرني — يمكنك طلب السحب الآن.', p_task_id);

    -- ── مكافأة الإحالة: أول طلبين مكتملين للمدعو → عمولة الموقع كاملة للداعي ──
    v_referrer := v_task.referred_by;
    if v_referrer is not null and v_referrer <> v_client_id and v_referrer <> v_task.worker_id
       and coalesce(v_txn.commission_amount, 0) > 0 then
      select count(*) into v_ref_used from public.referral_commissions
        where referrer_id = v_referrer and referred_id = v_client_id;
      if v_ref_used < 2 then
        v_ref_bonus := v_txn.commission_amount;
        insert into public.referral_commissions (referrer_id, referred_id, task_id, platform_fee, commission, paid)
          values (v_referrer, v_client_id, p_task_id, v_txn.commission_amount, v_ref_bonus, true);

        insert into public.wallets (user_id, balance_available) values (v_referrer, 0)
          on conflict (user_id) do nothing;
        update public.wallets
          set balance_available = balance_available + v_ref_bonus,
              total_earned = total_earned + v_ref_bonus,
              updated_at = now()
          where user_id = v_referrer
          returning balance_available into v_ref_bal;
        insert into public.wallet_ledger (user_id, type, amount, balance_after, reference_type, reference_id, note)
          values (v_referrer, 'credit_adjustment', v_ref_bonus, v_ref_bal, 'referral', p_task_id,
                  'مكافأة إحالة — عمولة الموقع كاملة على طلب صديقك (' || (v_ref_used + 1) || ' من 2)');
        insert into public.notifications (user_id, title, body, task_id)
          values (v_referrer, '🎁 مكافأة إحالة!',
                  'انضاف ' || v_ref_bonus || ' ريال لمحفظتك من طلب صديقك'
                  || case when v_ref_used + 1 < 2 then ' — باقي طلب واحد.' else ' — هذي آخر مكافأة عن هالصديق.' end,
                  p_task_id);
      end if;
    end if;
  end if;

  return json_build_object('success', true, 'commission', v_commission);
end; $function$;
