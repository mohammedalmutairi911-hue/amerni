-- الإحالة = خصم ورقي فقط (بدون محفظة ولا تحويل):
-- لكل صديق يسجّل من رابطك ويكمل أول طلب مدفوع له → تاخذ رصيد «طلبين بدون عمولة الموقع».
-- طلبك اللي عليه الرصيد: المتفق 100 → تدفع 95، العامل يستلم 95 مثل العادة، والموقع 0.
-- (الرصيد ينعطى بعد أول طلب مكتمل ومدفوع للصديق — مو عند التسجيل — عشان ما ينحصل بحسابات وهمية)
-- يلغي مكافأة المحفظة اللي في 049.

create table if not exists public.referral_discounts (
  user_id    uuid primary key references public.profiles(id) on delete cascade,
  credits    integer not null default 0 check (credits >= 0),
  updated_at timestamptz not null default now()
);
alter table public.referral_discounts enable row level security;
drop policy if exists referral_discounts_read_own on public.referral_discounts;
create policy referral_discounts_read_own on public.referral_discounts
  for select to authenticated
  using (user_id = (select auth.uid()) or exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin'));
-- لا سياسات كتابة: التعديل من دوال السيرفر فقط

alter table public.payment_transactions add column if not exists referral_discount boolean not null default false;

-- ── إنشاء طلب الدفع: لو عند الدافع رصيد → يدفع المبلغ ناقص عمولة الموقع ──
create or replace function public.payment_create_request(p_task_id uuid)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public', 'pg_temp'
as $function$
declare
  v_uid uuid := auth.uid();
  v_task public.tasks%rowtype;
  v_amount numeric;
  v_commission numeric;
  v_charge numeric;
  v_disc boolean := false;
  v_existing public.payment_transactions%rowtype;
  v_ref text;
  v_id uuid;
begin
  if v_uid is null then raise exception 'unauthorized'; end if;

  select * into v_task from public.tasks where id = p_task_id;
  if not found then raise exception 'task_not_found'; end if;
  if coalesce(v_task.client_id, v_task.user_id) <> v_uid then raise exception 'forbidden'; end if;
  if v_task.worker_id is null then raise exception 'no_worker_assigned'; end if;
  if v_task.status in ('cancelled') then raise exception 'task_cancelled'; end if;

  if coalesce(v_task.negotiation_status, '') <> 'accepted' then raise exception 'no_agreed_price'; end if;
  v_amount := coalesce(v_task.price_final, v_task.price_suggested);
  if v_amount is null or v_amount <= 0 then raise exception 'no_agreed_price'; end if;

  select * into v_existing from public.payment_transactions
    where task_id = p_task_id and status = 'pending'
    order by created_at desc limit 1;
  if found then
    return jsonb_build_object(
      'transaction_id', v_existing.id, 'special_reference', v_existing.special_reference,
      'amount', v_existing.amount, 'reused', true, 'referral_discount', v_existing.referral_discount);
  end if;

  if exists (select 1 from public.payment_transactions where task_id = p_task_id and status in ('held','released')) then
    raise exception 'already_paid';
  end if;

  v_commission := round(v_amount * 0.05, 2);
  v_charge := v_amount;
  if exists (select 1 from public.referral_discounts where user_id = v_uid and credits > 0) then
    v_disc := true;
    v_charge := v_amount - v_commission;   -- العميل يدفع ناقص عمولة الموقع
    v_commission := 0;                      -- الموقع ما ياخذ شي
  end if;

  v_ref := 'amerni_' || replace(p_task_id::text, '-', '') || '_' || extract(epoch from clock_timestamp())::bigint;

  begin
    insert into public.payment_transactions (
      task_id, payer_id, payee_id, amount, commission_amount, payee_amount, special_reference, status, referral_discount
    ) values (
      p_task_id, v_uid, v_task.worker_id, v_charge, v_commission, v_charge - v_commission, v_ref, 'pending', v_disc
    ) returning id into v_id;
  exception when unique_violation then
    select * into v_existing from public.payment_transactions
      where task_id = p_task_id and status in ('pending','held') order by created_at desc limit 1;
    return jsonb_build_object(
      'transaction_id', v_existing.id, 'special_reference', v_existing.special_reference,
      'amount', v_existing.amount, 'reused', true, 'referral_discount', v_existing.referral_discount);
  end;

  return jsonb_build_object('transaction_id', v_id, 'special_reference', v_ref, 'amount', v_charge,
                            'reused', false, 'referral_discount', v_disc);
end;
$function$;

-- ── تأكيد الدفع من Paymob: لو الدفعة عليها خصم إحالة → ينخصم طلب من الرصيد ──
create or replace function public.payment_mark_paid(p_special_reference text, p_paymob_transaction_id text, p_raw jsonb)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public', 'pg_temp'
as $function$
declare
  v_txn public.payment_transactions%rowtype;
begin
  select * into v_txn from public.payment_transactions where special_reference = p_special_reference;
  if not found then raise exception 'transaction_not_found'; end if;

  if v_txn.status in ('held','released','refunded') then
    return jsonb_build_object('ok', true, 'already', true, 'transaction_id', v_txn.id);
  end if;

  update public.payment_transactions
    set status = 'held', paid_at = now(), paymob_transaction_id = p_paymob_transaction_id,
        raw_webhook = p_raw, updated_at = now()
    where id = v_txn.id;

  if v_txn.referral_discount then
    update public.referral_discounts set credits = greatest(credits - 1, 0), updated_at = now()
      where user_id = v_txn.payer_id;
  end if;

  update public.tasks set payment_status = 'held', updated_at = now() where id = v_txn.task_id;
  insert into public.task_messages (task_id, sender_id, content, is_system_message) values (v_txn.task_id, null, '💳 العميل دفع ' || v_txn.amount || ' ريال والمبلغ محجوز بأمان — تقدر تبدأ التنفيذ الحين.', true);

  insert into public.notifications (user_id, type, title, body, task_id) values
    (v_txn.payer_id, 'payment', 'تم الدفع بنجاح ✅', 'دفعتك محفوظة بأمان في أمرني حتى اكتمال الخدمة.', v_txn.task_id);
  if v_txn.payee_id is not null then
    insert into public.notifications (user_id, type, title, body, task_id) values
      (v_txn.payee_id, 'payment', 'وصلتك دفعة 💰',
       'العميل دفع ' || v_txn.amount || ' ريال. المبلغ محجوز وسيُحرَّر تلقائياً لمحفظتك عند تأكيد العميل الاستلام.',
       v_txn.task_id);
  end if;

  return jsonb_build_object('ok', true, 'transaction_id', v_txn.id);
end;
$function$;

-- ── تأكيد الاستلام: منح رصيد الخصم بدل مكافأة المحفظة (يلغي 049) ──
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

    -- ── الإحالة: أول طلب مكتمل ومدفوع للصديق → الداعي ياخذ رصيد طلبين بدون عمولة (مرة وحدة لكل صديق) ──
    select coalesce(v_task.referred_by, p.referred_by) into v_referrer from public.profiles p where p.id = v_client_id;
    if v_referrer is not null and v_referrer <> v_client_id and v_referrer <> v_task.worker_id
       and not exists (select 1 from public.referral_commissions where referrer_id = v_referrer and referred_id = v_client_id) then
      insert into public.referral_commissions (referrer_id, referred_id, task_id, platform_fee, commission, paid)
        values (v_referrer, v_client_id, p_task_id, v_txn.commission_amount, 0, false);
      insert into public.referral_discounts (user_id, credits) values (v_referrer, 2)
        on conflict (user_id) do update set credits = public.referral_discounts.credits + 2, updated_at = now();
      insert into public.notifications (user_id, title, body, task_id)
        values (v_referrer, '🎁 كسبت خصم إحالة!',
                'صديقك اللي سجّل من رابطك كمّل أول طلب — طلبينك الجايين بدون عمولة الموقع (تدفع أقل 5٪).', null);
    end if;
  end if;

  return json_build_object('success', true, 'commission', v_commission);
end; $function$;
