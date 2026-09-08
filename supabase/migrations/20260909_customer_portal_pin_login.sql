alter table public.customer_portal_accounts add column if not exists pin_hash text;
alter table public.customer_portal_accounts add column if not exists pin_set_at timestamptz;

create table if not exists public.customer_portal_pin_attempts (
  account_id uuid primary key references public.customer_portal_accounts(id) on delete cascade,
  failed_attempts integer not null default 0,
  window_started_at timestamptz,
  locked_until timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.customer_portal_pin_attempts enable row level security;
revoke all on public.customer_portal_pin_attempts from anon, authenticated;
