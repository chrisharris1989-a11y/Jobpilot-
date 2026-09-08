create or replace function public.get_customer_portal_branding()
returns table(company_name text, logo_url text)
language sql
security definer
set search_path = public
as $function$
  select
    coalesce(nullif(trim(us.business_name), ''), c.name) as company_name,
    us.business_logo_url as logo_url
  from public.customer_portal_accounts cpa
  join public.companies c on c.id = cpa.company_id
  left join public.user_settings us on us.user_id = c.owner_id
  where cpa.user_id = auth.uid()
    and cpa.status = 'active'
  limit 1;
$function$;
