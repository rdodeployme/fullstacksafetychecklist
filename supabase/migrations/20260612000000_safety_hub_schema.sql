create extension if not exists pgcrypto;

do $$
begin
  create type public.user_role as enum ('operator', 'supervisor', 'admin');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.submission_status as enum ('submitted', 'needs_follow_up');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.answer_response as enum ('pass', 'fail', 'na');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.issue_status as enum ('open', 'in_progress', 'resolved', 'closed');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.issue_priority as enum ('low', 'medium', 'high', 'critical');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role public.user_role not null default 'operator',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.checklist_templates (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text not null,
  group_id text not null,
  group_title text not null,
  group_description text not null,
  group_icon text not null,
  group_variant text not null default 'standard',
  icon text not null,
  variant text not null default 'standard',
  display_order integer not null default 0,
  creates_issue boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.checklist_sections (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.checklist_templates(id) on delete cascade,
  title text not null,
  display_order integer not null default 0
);

create table if not exists public.checklist_items (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.checklist_templates(id) on delete cascade,
  section_id uuid not null references public.checklist_sections(id) on delete cascade,
  prompt text not null,
  response_type text not null default 'pass_fail',
  requires_issue_on_fail boolean not null default true,
  display_order integer not null default 0
);

create table if not exists public.checklist_submissions (
  id uuid primary key default gen_random_uuid(),
  template_id uuid references public.checklist_templates(id) on delete set null,
  template_slug text not null,
  template_title text not null,
  user_id uuid references auth.users(id) on delete set null,
  operator_name text not null,
  status public.submission_status not null default 'submitted',
  notes text,
  submitted_at timestamptz not null default now()
);

create table if not exists public.checklist_answers (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.checklist_submissions(id) on delete cascade,
  item_id uuid references public.checklist_items(id) on delete set null,
  prompt text not null,
  response public.answer_response not null,
  notes text,
  creates_issue boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.issues (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  status public.issue_status not null default 'open',
  priority public.issue_priority not null default 'medium',
  source_submission_id uuid references public.checklist_submissions(id) on delete set null,
  source_answer_id uuid references public.checklist_answers(id) on delete set null,
  source_template_slug text,
  created_by uuid references auth.users(id) on delete set null,
  created_by_name text,
  assigned_to uuid references auth.users(id) on delete set null,
  assigned_to_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table if not exists public.issue_updates (
  id uuid primary key default gen_random_uuid(),
  issue_id uuid not null references public.issues(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  user_name text,
  note text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.notification_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  issue_id uuid references public.issues(id) on delete cascade,
  status text not null default 'queued',
  error text,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email, 'Operator'),
    coalesce((new.raw_user_meta_data ->> 'role')::public.user_role, 'operator')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
before update on public.profiles
for each row execute function public.touch_updated_at();

drop trigger if exists issues_touch_updated_at on public.issues;
create trigger issues_touch_updated_at
before update on public.issues
for each row execute function public.touch_updated_at();

alter table public.profiles enable row level security;
alter table public.checklist_templates enable row level security;
alter table public.checklist_sections enable row level security;
alter table public.checklist_items enable row level security;
alter table public.checklist_submissions enable row level security;
alter table public.checklist_answers enable row level security;
alter table public.issues enable row level security;
alter table public.issue_updates enable row level security;
alter table public.notification_events enable row level security;

create or replace function public.current_user_role()
returns public.user_role
language sql
stable
as $$
  select role from public.profiles where id = auth.uid()
$$;

drop policy if exists "Profiles can view their own profile" on public.profiles;
create policy "Profiles can view their own profile"
on public.profiles for select
to authenticated
using (id = auth.uid() or public.current_user_role() in ('supervisor', 'admin'));

drop policy if exists "Users can update their own profile name" on public.profiles;
create policy "Users can update their own profile name"
on public.profiles for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists "Authenticated users can read active templates" on public.checklist_templates;
create policy "Authenticated users can read active templates"
on public.checklist_templates for select
to authenticated
using (is_active = true or public.current_user_role() = 'admin');

drop policy if exists "Authenticated users can read sections" on public.checklist_sections;
create policy "Authenticated users can read sections"
on public.checklist_sections for select
to authenticated
using (true);

drop policy if exists "Authenticated users can read items" on public.checklist_items;
create policy "Authenticated users can read items"
on public.checklist_items for select
to authenticated
using (true);

drop policy if exists "Admins can manage templates" on public.checklist_templates;
create policy "Admins can manage templates"
on public.checklist_templates for all
to authenticated
using (public.current_user_role() = 'admin')
with check (public.current_user_role() = 'admin');

drop policy if exists "Admins can manage sections" on public.checklist_sections;
create policy "Admins can manage sections"
on public.checklist_sections for all
to authenticated
using (public.current_user_role() = 'admin')
with check (public.current_user_role() = 'admin');

drop policy if exists "Admins can manage items" on public.checklist_items;
create policy "Admins can manage items"
on public.checklist_items for all
to authenticated
using (public.current_user_role() = 'admin')
with check (public.current_user_role() = 'admin');

drop policy if exists "Users can create own submissions" on public.checklist_submissions;
create policy "Users can create own submissions"
on public.checklist_submissions for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "Users can view relevant submissions" on public.checklist_submissions;
create policy "Users can view relevant submissions"
on public.checklist_submissions for select
to authenticated
using (user_id = auth.uid() or public.current_user_role() in ('supervisor', 'admin'));

drop policy if exists "Users can create answers for own submissions" on public.checklist_answers;
create policy "Users can create answers for own submissions"
on public.checklist_answers for insert
to authenticated
with check (
  exists (
    select 1 from public.checklist_submissions
    where checklist_submissions.id = submission_id
    and checklist_submissions.user_id = auth.uid()
  )
);

drop policy if exists "Users can view relevant answers" on public.checklist_answers;
create policy "Users can view relevant answers"
on public.checklist_answers for select
to authenticated
using (
  exists (
    select 1 from public.checklist_submissions
    where checklist_submissions.id = submission_id
    and (checklist_submissions.user_id = auth.uid() or public.current_user_role() in ('supervisor', 'admin'))
  )
);

drop policy if exists "Users can create issues" on public.issues;
create policy "Users can create issues"
on public.issues for insert
to authenticated
with check (created_by = auth.uid());

drop policy if exists "Users can view relevant issues" on public.issues;
create policy "Users can view relevant issues"
on public.issues for select
to authenticated
using (created_by = auth.uid() or assigned_to = auth.uid() or public.current_user_role() in ('supervisor', 'admin'));

drop policy if exists "Supervisors can update issues" on public.issues;
create policy "Supervisors can update issues"
on public.issues for update
to authenticated
using (public.current_user_role() in ('supervisor', 'admin'))
with check (public.current_user_role() in ('supervisor', 'admin'));

drop policy if exists "Supervisors can create issue updates" on public.issue_updates;
create policy "Supervisors can create issue updates"
on public.issue_updates for insert
to authenticated
with check (public.current_user_role() in ('supervisor', 'admin'));

drop policy if exists "Users can view relevant issue updates" on public.issue_updates;
create policy "Users can view relevant issue updates"
on public.issue_updates for select
to authenticated
using (
  exists (
    select 1 from public.issues
    where issues.id = issue_id
    and (issues.created_by = auth.uid() or issues.assigned_to = auth.uid() or public.current_user_role() in ('supervisor', 'admin'))
  )
);

drop policy if exists "Authenticated users can queue notifications" on public.notification_events;
create policy "Authenticated users can queue notifications"
on public.notification_events for insert
to authenticated
with check (true);

drop policy if exists "Admins can view notifications" on public.notification_events;
create policy "Admins can view notifications"
on public.notification_events for select
to authenticated
using (public.current_user_role() = 'admin');
