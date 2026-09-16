create or replace function public.consume_sms_usage(
  p_company_id uuid,
  p_usage_month date,
  p_included_messages integer,
  p_currency text,
  p_overage_unit_price numeric
)
returns table (
  total_messages integer,
  included_messages integer,
  overage_messages integer,
  is_overage boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total integer;
  v_included integer;
  v_overage integer;
begin
  insert into public.sms_usage_monthly (
    company_id, usage_month, total_messages, included_messages, overage_messages, overage_unit_price, currency
  ) values (
    p_company_id, p_usage_month, 0, greatest(p_included_messages, 0), 0, greatest(p_overage_unit_price, 0), upper(coalesce(nullif(p_currency, ''), 'GBP'))
  )
  on conflict (company_id, usage_month) do nothing;

  update public.sms_usage_monthly as su
  set total_messages = su.total_messages + 1,
      included_messages = greatest(p_included_messages, 0),
      overage_unit_price = greatest(p_overage_unit_price, 0),
      currency = upper(coalesce(nullif(p_currency, ''), 'GBP')),
      overage_messages = greatest((su.total_messages + 1) - greatest(p_included_messages, 0), 0),
      updated_at = now()
  where su.company_id = p_company_id
    and su.usage_month = p_usage_month
  returning su.total_messages, su.included_messages, su.overage_messages
  into v_total, v_included, v_overage;

  return query select v_total, v_included, v_overage, v_total > v_included;
end;
$$;

revoke all on function public.consume_sms_usage(uuid,date,integer,text,numeric) from public;
grant execute on function public.consume_sms_usage(uuid,date,integer,text,numeric) to service_role;
