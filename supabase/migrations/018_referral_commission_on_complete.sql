-- حساب عمولة الإحالة عند إكمال المهمة (5% من عمولة المنصة)
-- كانت الصفحة تعد بـ 5% لكن لا يوجد كود يحسبها
create or replace function public.confirm_task_completion(p_task_id uuid)
returns json language plpgsql security definer as $$
declare
  v_client_id  uuid := auth.uid();
  v_task       tasks%rowtype;
  v_amount     numeric;
  v_commission numeric;
  v_referrer   uuid;
  v_ref_bonus  numeric;
begin
  if v_client_id is null then raise exception 'غير مصرح'; end if;
  select * into v_task from tasks where id = p_task_id for update;
  if v_task.client_id != v_client_id then raise exception 'غير مصرح'; end if;
  if v_task.status != 'pending_confirmation' then raise exception 'الطلب ليس بانتظار التأكيد'; end if;

  update tasks set status = 'completed' where id = p_task_id;
  v_amount     := coalesce(v_task.price_final, v_task.price_suggested, 0);
  v_commission := round(v_amount * 0.02, 2);

  perform set_config('app.trusted_update', 'on', true);
  update worker_profiles set
    completed_tasks = coalesce(completed_tasks, 0) + 1,
    total_earnings  = coalesce(total_earnings, 0) + v_amount
  where user_id = v_task.worker_id;
  perform set_config('app.trusted_update', 'off', true);

  select referred_by into v_referrer from tasks where id = p_task_id;
  if v_referrer is not null and v_referrer != v_client_id then
    v_ref_bonus := round(v_commission * 0.05, 2);
    insert into referral_commissions (referrer_id, referred_id, task_id, platform_fee, commission, paid)
    values (v_referrer, v_client_id, p_task_id, v_commission, v_ref_bonus, false);
    insert into notifications (user_id, title, body, task_id)
    values (v_referrer, '🎁 عمولة إحالة جديدة!', 'كسبت ' || v_ref_bonus || ' ريال من إحالة اكتمل طلبها', p_task_id);
  end if;

  insert into notifications (user_id, title, body, task_id)
  values (v_task.worker_id, 'العميل أكّد الإكمال ✅', 'العمولة المستحقة: ' || v_commission || ' ريال', p_task_id);

  return json_build_object('success', true, 'commission', v_commission);
end; $$;
