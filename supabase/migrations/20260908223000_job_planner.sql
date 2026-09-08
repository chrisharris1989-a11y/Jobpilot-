create table public.job_plans (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  job_id uuid references public.jobs(id) on delete cascade,
  title text not null,
  description text,
  start_date date,
  target_end_date date,
  status text not null default 'draft' check (status in ('draft','active','completed','archived')),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.job_plan_tasks (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.job_plans(id) on delete cascade,
  title text not null,
  description text,
  duration_days numeric(8,2) not null default 1 check (duration_days > 0),
  start_date date,
  end_date date,
  status text not null default 'pending' check (status in ('pending','in_progress','completed','skipped')),
  order_index integer not null default 0,
  assigned_user_id uuid references auth.users(id) on delete set null,
  predecessor_task_id uuid references public.job_plan_tasks(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.job_plans enable row level security;
alter table public.job_plan_tasks enable row level security;

create index idx_job_plans_company on public.job_plans(company_id);
create index idx_job_plans_job on public.job_plans(job_id);
create index idx_job_plan_tasks_plan on public.job_plan_tasks(plan_id);
create index idx_job_plan_tasks_assigned on public.job_plan_tasks(assigned_user_id);

create policy "Company members can view job plans" on public.job_plans for select to authenticated using (private.is_active_company_member(company_id));
create policy "Company members can create job plans" on public.job_plans for insert to authenticated with check (private.is_active_company_member(company_id) and (created_by is null or created_by = auth.uid()) and (job_id is null or exists (select 1 from public.jobs j where j.id = job_plans.job_id and j.company_id = job_plans.company_id)));
create policy "Company members can update job plans" on public.job_plans for update to authenticated using (private.is_active_company_member(company_id)) with check (private.is_active_company_member(company_id) and (job_id is null or exists (select 1 from public.jobs j where j.id = job_plans.job_id and j.company_id = job_plans.company_id)));
create policy "Company members can delete job plans" on public.job_plans for delete to authenticated using (private.is_active_company_member(company_id));

create policy "Company members can view job plan tasks" on public.job_plan_tasks for select to authenticated using (exists (select 1 from public.job_plans p where p.id = job_plan_tasks.plan_id and private.is_active_company_member(p.company_id)));
create policy "Company members can create job plan tasks" on public.job_plan_tasks for insert to authenticated with check (exists (select 1 from public.job_plans p where p.id = job_plan_tasks.plan_id and private.is_active_company_member(p.company_id)) and (assigned_user_id is null or exists (select 1 from public.company_members m where m.company_id = (select p2.company_id from public.job_plans p2 where p2.id = job_plan_tasks.plan_id) and m.user_id = job_plan_tasks.assigned_user_id and m.status = 'active')));
create policy "Company members can update job plan tasks" on public.job_plan_tasks for update to authenticated using (exists (select 1 from public.job_plans p where p.id = job_plan_tasks.plan_id and private.is_active_company_member(p.company_id))) with check (exists (select 1 from public.job_plans p where p.id = job_plan_tasks.plan_id and private.is_active_company_member(p.company_id)) and (assigned_user_id is null or exists (select 1 from public.company_members m where m.company_id = (select p2.company_id from public.job_plans p2 where p2.id = job_plan_tasks.plan_id) and m.user_id = job_plan_tasks.assigned_user_id and m.status = 'active')));
create policy "Company members can delete job plan tasks" on public.job_plan_tasks for delete to authenticated using (exists (select 1 from public.job_plans p where p.id = job_plan_tasks.plan_id and private.is_active_company_member(p.company_id)));
