create or replace function private.enforce_core_customer_limit()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
declare
  company_plan text;
  customer_count integer;
begin
  if new.company_id is null then
    return new;
  end if;

  select lower(trim(c.plan)) into company_plan
  from public.companies c
  where c.id = new.company_id;

  if company_plan <> 'core' then
    return new;
  end if;

  select count(*) into customer_count
  from public.customers c
  where c.company_id = new.company_id;

  if customer_count >= 25 then
    raise exception 'Core includes up to 25 customers. Upgrade to Solo for unlimited customers.';
  end if;

  return new;
end;
$function$;
