create index if not exists uk_address_lookup_postcode_idx
  on public.uk_address_lookup (postcode);

create index if not exists uk_address_lookup_postcode_address_idx
  on public.uk_address_lookup (postcode, address_line1, address_line2);

create or replace function public.lookup_jobpilot_addresses(lookup_postcode text)
returns table (
  id bigint,
  uprn text,
  postcode text,
  address_line1 text,
  address_line2 text,
  city text,
  region text,
  country_code text,
  display_address text,
  latitude double precision,
  longitude double precision
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    a.id,
    a.uprn,
    a.postcode,
    a.address_line1,
    a.address_line2,
    a.city,
    a.region,
    a.country_code,
    coalesce(
      nullif(a.display_address, ''),
      concat_ws(', ', a.address_line1, a.address_line2, a.city, a.region, a.postcode)
    ) as display_address,
    a.latitude,
    a.longitude
  from public.uk_address_lookup a
  where upper(regexp_replace(trim(a.postcode), '\\s+', ' ', 'g')) = upper(regexp_replace(trim(lookup_postcode), '\\s+', ' ', 'g'))
  order by a.address_line1, a.address_line2, a.city
  limit 100;
$$;

grant execute on function public.lookup_jobpilot_addresses(text) to authenticated;
