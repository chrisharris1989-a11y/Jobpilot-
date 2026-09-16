create table if not exists public.quickbooks_connections (
  user_id uuid primary key references auth.users(id) on delete cascade,
  realm_id text not null,
  company_name text,
  access_token text not null,
  refresh_token text not null,
  access_token_expires_at timestamptz not null,
  refresh_token_expires_at timestamptz,
  scopes text[] default '{}',
  environment text not null default 'sandbox',
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.quickbooks_oauth_states (
  state text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.quickbooks_connections enable row level security;
alter table public.quickbooks_oauth_states enable row level security;

create policy "Users can view their QuickBooks connection"
  on public.quickbooks_connections for select
  using (auth.uid() = user_id);

create policy "Users can view their QuickBooks OAuth states"
  on public.quickbooks_oauth_states for select
  using (auth.uid() = user_id);

create index if not exists quickbooks_oauth_states_created_at_idx
  on public.quickbooks_oauth_states(created_at);
