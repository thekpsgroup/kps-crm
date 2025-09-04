-- users (basic)
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  full_name text,
  created_at timestamptz default now()
);

-- companies
create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  website text,
  notes text,
  created_by uuid references public.users(id),
  created_at timestamptz default now()
);

-- contacts
create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete set null,
  first_name text,
  last_name text,
  email text,
  phone text,
  title text,
  tags text[] default '{}',
  created_by uuid references public.users(id),
  created_at timestamptz default now()
);

-- pipeline stages
create table if not exists public.deal_stages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  position int not null
);

-- deals
create table if not exists public.deals (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  company_id uuid references public.companies(id) on delete set null,
  contact_id uuid references public.contacts(id) on delete set null,
  amount numeric(12,2),
  stage_id uuid references public.deal_stages(id),
  owner_id uuid references public.users(id),
  created_at timestamptz default now()
);

-- activity log
create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid references public.deals(id) on delete cascade,
  contact_id uuid references public.contacts(id) on delete set null,
  type text not null,               -- 'note' | 'task' | 'call' | 'email' | 'sms'
  summary text,
  due_at timestamptz,
  done boolean default false,
  created_by uuid references public.users(id),
  created_at timestamptz default now()
);

-- ringcentral auth mapping
create table if not exists public.ringcentral_identities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) unique,
  rc_account_id text,
  access_token text,
  refresh_token text,
  token_expires_at timestamptz,
  created_at timestamptz default now()
);

-- organizations (multi-tenancy)
create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid references public.users(id),
  created_at timestamptz default now()
);

create table if not exists public.organization_members (
  organization_id uuid references public.organizations(id) on delete cascade,
  user_id uuid references public.users(id),
  role text default 'member',
  primary key (organization_id, user_id)
);

-- add organization_id to core tables
alter table public.companies add column if not exists organization_id uuid references public.organizations(id);
alter table public.contacts add column if not exists organization_id uuid references public.organizations(id);
alter table public.deals add column if not exists organization_id uuid references public.organizations(id);
alter table public.activities add column if not exists organization_id uuid references public.organizations(id);

-- call logs
create table if not exists public.call_logs (
  id uuid primary key default gen_random_uuid(),
  direction text not null,          -- 'inbound' | 'outbound'
  status text,                      -- 'completed' | 'missed' | ...
  from_number text,
  to_number text,
  duration_seconds int,
  recording_url text,
  rc_call_id text unique,
  matched_contact_id uuid references public.contacts(id),
  matched_deal_id uuid references public.deals(id),
  organization_id uuid references public.organizations(id),
  created_at timestamptz default now()
);

-- seed stages
insert into public.deal_stages (name, position)
values ('New',1),('Qualified',2),('Proposal',3),('Won',4),('Lost',5)
on conflict do nothing;

-- RLS Policies (Organization-based)
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;

-- Organizations: users can see orgs they're members of
drop policy if exists organizations_member_access on public.organizations;
create policy organizations_member_access
on public.organizations for select
using (id in (
  select organization_id
  from public.organization_members
  where user_id = auth.uid()
));

-- Organization members: users can see their own memberships
drop policy if exists organization_members_own on public.organization_members;
create policy organization_members_own
on public.organization_members for all
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- Companies: org-based access
drop policy if exists companies_org_rw on public.companies;
create policy companies_org_rw
on public.companies for all
using (organization_id in (
  select organization_id
  from public.organization_members
  where user_id = auth.uid()
))
with check (organization_id in (
  select organization_id
  from public.organization_members
  where user_id = auth.uid()
));

-- Contacts: org-based access
drop policy if exists contacts_org_rw on public.contacts;
create policy contacts_org_rw
on public.contacts for all
using (organization_id in (
  select organization_id
  from public.organization_members
  where user_id = auth.uid()
))
with check (organization_id in (
  select organization_id
  from public.organization_members
  where user_id = auth.uid()
));

-- Deals: org-based access
drop policy if exists deals_org_rw on public.deals;
create policy deals_org_rw
on public.deals for all
using (organization_id in (
  select organization_id
  from public.organization_members
  where user_id = auth.uid()
))
with check (organization_id in (
  select organization_id
  from public.organization_members
  where user_id = auth.uid()
));

-- Activities: org-based access
drop policy if exists activities_org_rw on public.activities;
create policy activities_org_rw
on public.activities for all
using (organization_id in (
  select organization_id
  from public.organization_members
  where user_id = auth.uid()
))
with check (organization_id in (
  select organization_id
  from public.organization_members
  where user_id = auth.uid()
));

-- Call logs: org-based access
drop policy if exists call_logs_org_rw on public.call_logs;
create policy call_logs_org_rw
on public.call_logs for all
using (organization_id in (
  select organization_id
  from public.organization_members
  where user_id = auth.uid()
))
with check (organization_id in (
  select organization_id
  from public.organization_members
  where user_id = auth.uid()
));
