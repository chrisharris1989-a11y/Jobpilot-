alter table public.customers
  add column if not exists quickbooks_customer_id text;

alter table public.invoices
  add column if not exists quickbooks_invoice_id text,
  add column if not exists quickbooks_sync_status text,
  add column if not exists quickbooks_sync_error text,
  add column if not exists quickbooks_synced_at timestamptz;

create unique index if not exists customers_quickbooks_customer_id_uidx
  on public.customers (quickbooks_customer_id)
  where quickbooks_customer_id is not null;

create unique index if not exists invoices_quickbooks_invoice_id_uidx
  on public.invoices (quickbooks_invoice_id)
  where quickbooks_invoice_id is not null;
