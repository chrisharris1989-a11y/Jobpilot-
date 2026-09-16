create table if not exists public.sms_usage_monthly (
  company_id uuid not null references public.companies(id) on delete cascade,
  usage_month date not null,
  total_messages integer not null default 0 check (total_messages >= 0),
  included_messages integer not null default 0 check (included_messages >= 0),
  overage_messages integer not null default 0 check (overage_messages >= 0),
  overage_unit_price numeric(12,4) not null default 0 check (overage_unit_price >= 0),
  currency text not null default 'GBP',
  stripe_invoice_item_id text,
  stripe_customer_id text,
  updated_at timestamptz not null default now(),
  primary key (company_id, usage_month)
);

alter table public.sms_usage_monthly enable row level security;

create policy "Company members can view own SMS usage"
on public.sms_usage_monthly
for select
to authenticated
using (
  exists (
    select 1 from public.company_members cm
    where cm.company_id = sms_usage_monthly.company_id
      and cm.user_id = auth.uid()
      and cm.status = 'active'
  )
);

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

  update public.sms_usage_monthly
  set total_messages = total_messages + 1,
      included_messages = greatest(p_included_messages, 0),
      overage_unit_price = greatest(p_overage_unit_price, 0),
      currency = upper(coalesce(nullif(p_currency, ''), 'GBP')),
      overage_messages = greatest((total_messages + 1) - greatest(p_included_messages, 0), 0),
      updated_at = now()
  where company_id = p_company_id
    and usage_month = p_usage_month
  returning sms_usage_monthly.total_messages, sms_usage_monthly.included_messages, sms_usage_monthly.overage_messages
  into v_total, v_included, v_overage;

  return query select v_total, v_included, v_overage, v_total > v_included;
end;
$$;

revoke all on function public.consume_sms_usage(uuid,date,integer,text,numeric) from public;
grant execute on function public.consume_sms_usage(uuid,date,integer,text,numeric) to service_role;
