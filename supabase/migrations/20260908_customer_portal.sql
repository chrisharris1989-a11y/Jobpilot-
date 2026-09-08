-- Customer Portal
-- Links a Supabase Auth user to exactly one JobPilot customer within one company.
create table if not exists public.customer_portal_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  company_id uuid not null,
  status text not null default 'active' check (status in ('active','disabled')),
  created_at timestamptz not null default now(),
  unique (user_id),
  unique (company_id, customer_id)
);

create index if not exists customer_portal_accounts_customer_idx on public.customer_portal_accounts(customer_id);
create index if not exists customer_portal_accounts_company_idx on public.customer_portal_accounts(company_id);

alter table public.customer_portal_accounts enable row level security;

create policy "portal user can read own account"
on public.customer_portal_accounts for select
to authenticated
using (user_id = auth.uid() and status = 'active');

-- Customer-owned portal data is protected by customer_id membership.
-- These policies are deliberately scoped to the linked customer account.
alter table public.customers enable row level security;
create policy "portal user can read own customer"
on public.customers for select
to authenticated
using (id in (select customer_id from public.customer_portal_accounts where user_id = auth.uid() and status = 'active'));

create policy "portal user can update own customer"
on public.customers for update
to authenticated
using (id in (select customer_id from public.customer_portal_accounts where user_id = auth.uid() and status = 'active'))
with check (id in (select customer_id from public.customer_portal_accounts where user_id = auth.uid() and status = 'active'));

alter table public.jobs enable row level security;
create policy "portal user can read own jobs"
on public.jobs for select
to authenticated
using (customer_id in (select customer_id from public.customer_portal_accounts where user_id = auth.uid() and status = 'active'));

alter table public.quotes enable row level security;
create policy "portal user can read own quotes"
on public.quotes for select
to authenticated
using (customer_id in (select customer_id from public.customer_portal_accounts where user_id = auth.uid() and status = 'active'));

alter table public.invoices enable row level security;
create policy "portal user can read own invoices"
on public.invoices for select
to authenticated
using (customer_id in (select customer_id from public.customer_portal_accounts where user_id = auth.uid() and status = 'active'));
