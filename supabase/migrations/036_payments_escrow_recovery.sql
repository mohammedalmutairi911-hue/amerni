-- ════════════════════════════════════════════════════════════════════════════
-- 036 · Payments / Escrow / Wallet — RECOVERY SNAPSHOT
-- ────────────────────────────────────────────────────────────────────────────
-- ملاحظة مهمة: هذا الملف "لقطة استرجاع" (recovery snapshot) للدوال الأساسية
-- لنظام الدفع/الإسكرو، سُحبت مباشرة من قاعدة الإنتاج (urgqapqkbwhornmgqaav)
-- بتاريخ 2026-08-31 لأن المهاجرة الأصلية لم تُحفظ في المستودع.
--
-- هذا الملف يحتوي الدوال فقط. تعريفات الجداول (payment_transactions, wallets,
-- wallet_ledger, withdrawal_requests, payment_webhook_log) وسياسات RLS الخاصة بها
-- موجودة في قاعدة الإنتاج وعليها RLS مفعّل. لاستكمال النسخة الاحتياطية، يُنصح
-- لاحقاً بإضافة CREATE TABLE + policies لهذه الجداول هنا أيضاً.
--
-- الغرض: حفظ منطق العمل في git كنسخة احتياطية. الدوال معرّفة بـ SECURITY DEFINER
-- مع SET search_path، وكلها تتحقق من الملكية/الصلاحية داخلياً.
-- ════════════════════════════════════════════════════════════════════════════

-- حارس صلاحية الأدمن لطبقة المدفوعات
CREATE OR REPLACE FUNCTION public.payments_is_admin()
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$function$;

-- إنشاء/استرجاع طلب دفع — يتحقق من ملكية العميل، وجود مزود، سعر متفق، ويمنع الدفع المزدوج
CREATE OR REPLACE FUNCTION public.payment_create_request(p_task_id uuid)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
declare
  v_uid uuid := auth.uid();
  v_task public.tasks%rowtype;
  v_amount numeric;
  v_commission numeric;
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

  v_amount := coalesce(v_task.price_final, v_task.price_suggested);
  if v_amount is null or v_amount <= 0 then raise exception 'no_agreed_price'; end if;

  select * into v_existing from public.payment_transactions
    where task_id = p_task_id and status = 'pending'
    order by created_at desc limit 1;
  if found then
    return jsonb_build_object(
      'transaction_id', v_existing.id, 'special_reference', v_existing.special_reference,
      'amount', v_existing.amount, 'reused', true);
  end if;

  if exists (select 1 from public.payment_transactions where task_id = p_task_id and status in ('held','released')) then
    raise exception 'already_paid';
  end if;

  v_commission := round(v_amount * 0.02, 2);
  v_ref := 'amerni_' || replace(p_task_id::text, '-', '') || '_' || extract(epoch from clock_timestamp())::bigint;

  begin
    insert into public.payment_transactions (
      task_id, payer_id, payee_id, amount, commission_amount, payee_amount, special_reference, status
    ) values (
      p_task_id, v_uid, v_task.worker_id, v_amount, v_commission, v_amount - v_commission, v_ref, 'pending'
    ) returning id into v_id;
  exception when unique_violation then
    select * into v_existing from public.payment_transactions
      where task_id = p_task_id and status in ('pending','held') order by created_at desc limit 1;
    return jsonb_build_object(
      'transaction_id', v_existing.id, 'special_reference', v_existing.special_reference,
      'amount', v_existing.amount, 'reused', true);
  end;

  return jsonb_build_object('transaction_id', v_id, 'special_reference', v_ref, 'amount', v_amount, 'reused', false);
end;
$function$;

-- تأكيد الدفع (يُستدعى من webhook بعد التحقق من HMAC) — idempotent، يحجز المبلغ ويُشعر الطرفين
CREATE OR REPLACE FUNCTION public.payment_mark_paid(p_special_reference text, p_paymob_transaction_id text, p_raw jsonb)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
declare v_txn public.payment_transactions%rowtype;
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

  update public.tasks set payment_status = 'held', updated_at = now() where id = v_txn.task_id;

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

-- تعليم الدفع كفاشل
CREATE OR REPLACE FUNCTION public.payment_mark_failed(p_special_reference text, p_raw jsonb)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
declare v_txn public.payment_transactions%rowtype;
begin
  select * into v_txn from public.payment_transactions where special_reference = p_special_reference;
  if not found then raise exception 'transaction_not_found'; end if;
  if v_txn.status in ('held','released','refunded') then
    return jsonb_build_object('ok', true, 'already', true);
  end if;
  update public.payment_transactions
    set status = 'failed', raw_webhook = p_raw, updated_at = now()
    where id = v_txn.id;
  return jsonb_build_object('ok', true);
end;
$function$;

-- محفظة المستخدم (رصيد متاح/محجوز + آخر 20 حركة)
CREATE OR REPLACE FUNCTION public.wallet_get_mine()
 RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
declare
  v_uid uuid := auth.uid();
  v_wallet public.wallets%rowtype;
  v_held numeric;
  v_ledger jsonb;
begin
  if v_uid is null then raise exception 'unauthorized'; end if;

  select * into v_wallet from public.wallets where user_id = v_uid;
  if not found then
    v_wallet.user_id := v_uid; v_wallet.balance_available := 0;
    v_wallet.total_earned := 0; v_wallet.total_withdrawn := 0;
  end if;

  select coalesce(sum(payee_amount), 0) into v_held
    from public.payment_transactions where payee_id = v_uid and status = 'held';

  select coalesce(jsonb_agg(jsonb_build_object(
      'id', id, 'type', type, 'amount', amount, 'balance_after', balance_after,
      'note', note, 'created_at', created_at
    ) order by created_at desc), '[]'::jsonb)
    into v_ledger
    from (select * from public.wallet_ledger where user_id = v_uid order by created_at desc limit 20) l;

  return jsonb_build_object(
    'balance_available', v_wallet.balance_available,
    'balance_held', v_held,
    'total_earned', v_wallet.total_earned,
    'total_withdrawn', v_wallet.total_withdrawn,
    'ledger', v_ledger
  );
end;
$function$;

-- طلب سحب — يقفل صف المحفظة ويتحقق من الرصيد
CREATE OR REPLACE FUNCTION public.withdrawal_request_create(p_amount numeric, p_iban text, p_holder_name text)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
declare
  v_uid uuid := auth.uid();
  v_wallet public.wallets%rowtype;
  v_id uuid;
  v_new_balance numeric;
begin
  if v_uid is null then raise exception 'unauthorized'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'invalid_amount'; end if;
  if coalesce(trim(p_iban), '') = '' then raise exception 'iban_required'; end if;

  select * into v_wallet from public.wallets where user_id = v_uid for update;
  if not found or v_wallet.balance_available < p_amount then
    raise exception 'insufficient_balance';
  end if;

  v_new_balance := v_wallet.balance_available - p_amount;
  update public.wallets set balance_available = v_new_balance, updated_at = now() where user_id = v_uid;

  insert into public.withdrawal_requests (user_id, amount, bank_iban, bank_holder_name, status)
    values (v_uid, p_amount, trim(p_iban), nullif(trim(p_holder_name), ''), 'pending')
    returning id into v_id;

  insert into public.wallet_ledger (user_id, type, amount, balance_after, reference_type, reference_id, note)
    values (v_uid, 'debit_withdrawal', -p_amount, v_new_balance, 'withdrawal_request', v_id, 'طلب سحب قيد المراجعة');

  return jsonb_build_object('withdrawal_id', v_id, 'balance_available', v_new_balance);
end;
$function$;

-- اعتماد السحب (أدمن)
CREATE OR REPLACE FUNCTION public.admin_withdrawal_approve(p_id uuid)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
declare v_uid uuid := auth.uid();
begin
  if not public.payments_is_admin() then raise exception 'forbidden'; end if;
  update public.withdrawal_requests
    set status = 'paid', processed_at = now(), processed_by = v_uid
    where id = p_id and status = 'pending';
  if not found then raise exception 'not_found_or_processed'; end if;
  update public.wallets w set total_withdrawn = total_withdrawn + wr.amount
    from public.withdrawal_requests wr where wr.id = p_id and w.user_id = wr.user_id;
  return jsonb_build_object('ok', true);
end;
$function$;

-- رفض السحب (أدمن) — يعيد المبلغ للرصيد
CREATE OR REPLACE FUNCTION public.admin_withdrawal_reject(p_id uuid, p_reason text)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
declare
  v_uid uuid := auth.uid();
  v_req public.withdrawal_requests%rowtype;
  v_new_balance numeric;
begin
  if not public.payments_is_admin() then raise exception 'forbidden'; end if;
  select * into v_req from public.withdrawal_requests where id = p_id and status = 'pending' for update;
  if not found then raise exception 'not_found_or_processed'; end if;

  update public.withdrawal_requests
    set status = 'rejected', processed_at = now(), processed_by = v_uid, admin_note = p_reason
    where id = p_id;

  update public.wallets set balance_available = balance_available + v_req.amount, updated_at = now()
    where user_id = v_req.user_id
    returning balance_available into v_new_balance;

  insert into public.wallet_ledger (user_id, type, amount, balance_after, reference_type, reference_id, note)
    values (v_req.user_id, 'credit_withdrawal_reversal', v_req.amount, v_new_balance, 'withdrawal_request', p_id,
            coalesce('رُفض طلب السحب: ' || p_reason, 'رُفض طلب السحب'));

  return jsonb_build_object('ok', true);
end;
$function$;

-- استرجاع مبلغ محجوز (أدمن) — عند إلغاء/نزاع
CREATE OR REPLACE FUNCTION public.admin_refund_escrow(p_task_id uuid, p_reason text)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
declare
  v_txn public.payment_transactions%rowtype;
  v_new_balance numeric;
begin
  if not public.payments_is_admin() then raise exception 'forbidden'; end if;

  select * into v_txn from public.payment_transactions
    where task_id = p_task_id and status = 'held' order by created_at desc limit 1;
  if not found then raise exception 'no_held_payment_for_task'; end if;

  update public.payment_transactions
    set status = 'refunded', refunded_at = now(), updated_at = now()
    where id = v_txn.id;
  update public.tasks set payment_status = 'refunded', updated_at = now() where id = p_task_id;

  insert into public.wallets (user_id, balance_available)
    values (v_txn.payer_id, 0)
    on conflict (user_id) do nothing;

  update public.wallets set balance_available = balance_available + v_txn.amount, updated_at = now()
    where user_id = v_txn.payer_id
    returning balance_available into v_new_balance;

  insert into public.wallet_ledger (user_id, type, amount, balance_after, reference_type, reference_id, note)
    values (v_txn.payer_id, 'credit_refund', v_txn.amount, v_new_balance, 'payment_transaction', v_txn.id,
            coalesce('استرجاع دفعة: ' || p_reason, 'استرجاع دفعة'));

  insert into public.notifications (user_id, type, title, body, task_id) values
    (v_txn.payer_id, 'payment', 'تم استرجاع مبلغك 💳',
     'تم إرجاع ' || v_txn.amount || ' ريال إلى محفظتك في أمرني.', p_task_id);

  return jsonb_build_object('ok', true, 'refunded_amount', v_txn.amount);
end;
$function$;
