-- Recycle Group / JUNK Safety Compliance MVP Schema
-- Paste this file into Supabase SQL Editor and run it once.
-- It creates the core tables, indexes, timestamps, roles, and MVP RLS policies.

create extension if not exists pgcrypto;

do $$
begin
  alter type public.user_role add value if not exists 'staff';
  alter type public.user_role add value if not exists 'maintenance';
exception when undefined_object then null;
end $$;

do $$
begin
  create type public.asset_status as enum ('active', 'inactive', 'maintenance', 'retired');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.form_template_status as enum ('draft', 'active', 'archived');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.question_answer_type as enum (
    'pass_fail',
    'pass_fail_na',
    'yes_no',
    'text',
    'number',
    'date',
    'photo'
  );
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.form_answer_value as enum ('pass', 'fail', 'na', 'yes', 'no');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.form_submission_status as enum (
    'submitted',
    'needs_follow_up',
    'reviewed',
    'void'
  );
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.issue_status as enum (
    'open',
    'in_progress',
    'waiting_on_parts',
    'waiting_on_external',
    'resolved',
    'closed',
    'cancelled'
  );
exception when duplicate_object then null;
end $$;

do $$
begin
  alter type public.issue_status add value if not exists 'waiting_on_parts';
  alter type public.issue_status add value if not exists 'waiting_on_external';
  alter type public.issue_status add value if not exists 'cancelled';
exception when undefined_object then null;
end $$;

do $$
begin
  create type public.issue_priority as enum ('low', 'medium', 'high', 'critical');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.notification_status as enum ('queued', 'sent', 'failed', 'cancelled');
exception when duplicate_object then null;
end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text,
  phone text,
  role text not null default 'staff'
    check (role in ('staff', 'operator', 'supervisor', 'admin', 'maintenance')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.vehicles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  registration text unique,
  fleet_number text unique,
  vehicle_type text not null,
  status public.asset_status not null default 'active',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.equipment (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  equipment_type text not null,
  asset_number text unique,
  serial_number text,
  location text,
  status public.asset_status not null default 'active',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.form_templates (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text,
  category text not null,
  applies_to text not null default 'general'
    check (applies_to in ('general', 'vehicle', 'equipment', 'area')),
  status public.form_template_status not null default 'draft',
  display_order integer not null default 0,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.form_sections (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.form_templates(id) on delete cascade,
  title text not null,
  description text,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.form_questions (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.form_templates(id) on delete cascade,
  section_id uuid not null references public.form_sections(id) on delete cascade,
  question_text text not null,
  help_text text,
  answer_type public.question_answer_type not null default 'pass_fail_na',
  is_required boolean not null default true,
  creates_issue_on_fail boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.form_submissions (
  id uuid primary key default gen_random_uuid(),
  template_id uuid references public.form_templates(id) on delete set null,
  template_title text not null,
  submitted_by uuid references public.profiles(id) on delete set null,
  submitted_by_name text not null,
  vehicle_id uuid references public.vehicles(id) on delete set null,
  equipment_id uuid references public.equipment(id) on delete set null,
  area_name text,
  status public.form_submission_status not null default 'submitted',
  general_notes text,
  submitted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint form_submissions_single_asset check (num_nonnulls(vehicle_id, equipment_id) <= 1)
);

create table if not exists public.form_answers (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.form_submissions(id) on delete cascade,
  question_id uuid references public.form_questions(id) on delete set null,
  question_text text not null,
  answer_value public.form_answer_value,
  answer_text text,
  answer_number numeric,
  answer_date date,
  notes text,
  is_failure boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.issues (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  status public.issue_status not null default 'open',
  priority public.issue_priority not null default 'medium',
  submission_id uuid references public.form_submissions(id) on delete set null,
  answer_id uuid references public.form_answers(id) on delete set null,
  vehicle_id uuid references public.vehicles(id) on delete set null,
  equipment_id uuid references public.equipment(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  assigned_to uuid references public.profiles(id) on delete set null,
  resolved_by uuid references public.profiles(id) on delete set null,
  due_at timestamptz,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.issue_updates (
  id uuid primary key default gen_random_uuid(),
  issue_id uuid not null references public.issues(id) on delete cascade,
  created_by uuid references public.profiles(id) on delete set null,
  status_from public.issue_status,
  status_to public.issue_status,
  note text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_profile_id uuid references public.profiles(id) on delete cascade,
  issue_id uuid references public.issues(id) on delete cascade,
  event_type text not null,
  channel text not null default 'email' check (channel in ('email', 'sms', 'in_app')),
  recipient_address text,
  subject text,
  body text,
  status public.notification_status not null default 'queued',
  error_message text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_role_idx on public.profiles(role);
create index if not exists profiles_active_idx on public.profiles(is_active);
create index if not exists vehicles_status_idx on public.vehicles(status);
create index if not exists vehicles_type_idx on public.vehicles(vehicle_type);
create index if not exists vehicles_registration_idx on public.vehicles(registration);
create index if not exists equipment_status_idx on public.equipment(status);
create index if not exists equipment_type_idx on public.equipment(equipment_type);
create index if not exists equipment_location_idx on public.equipment(location);
create index if not exists form_templates_status_order_idx on public.form_templates(status, display_order);
create index if not exists form_templates_category_idx on public.form_templates(category);
create index if not exists form_sections_template_order_idx on public.form_sections(template_id, display_order);
create index if not exists form_questions_template_order_idx on public.form_questions(template_id, display_order);
create index if not exists form_questions_section_order_idx on public.form_questions(section_id, display_order);
create index if not exists form_submissions_template_idx on public.form_submissions(template_id);
create index if not exists form_submissions_submitted_by_idx on public.form_submissions(submitted_by);
create index if not exists form_submissions_vehicle_idx on public.form_submissions(vehicle_id);
create index if not exists form_submissions_equipment_idx on public.form_submissions(equipment_id);
create index if not exists form_submissions_submitted_at_idx on public.form_submissions(submitted_at desc);
create index if not exists form_answers_submission_idx on public.form_answers(submission_id);
create index if not exists form_answers_question_idx on public.form_answers(question_id);
create index if not exists form_answers_failure_idx on public.form_answers(is_failure) where is_failure = true;
create index if not exists issues_status_priority_idx on public.issues(status, priority);
create index if not exists issues_assigned_to_idx on public.issues(assigned_to);
create index if not exists issues_created_by_idx on public.issues(created_by);
create index if not exists issues_vehicle_idx on public.issues(vehicle_id);
create index if not exists issues_equipment_idx on public.issues(equipment_id);
create index if not exists issues_due_at_idx on public.issues(due_at);
create index if not exists issues_open_idx on public.issues(created_at desc)
  where status::text in ('open', 'in_progress', 'waiting_on_parts', 'waiting_on_external');
create index if not exists issue_updates_issue_idx on public.issue_updates(issue_id);
create index if not exists notifications_recipient_idx on public.notifications(recipient_profile_id);
create index if not exists notifications_status_idx on public.notifications(status);
create index if not exists notifications_issue_idx on public.notifications(issue_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists vehicles_set_updated_at on public.vehicles;
create trigger vehicles_set_updated_at before update on public.vehicles
for each row execute function public.set_updated_at();

drop trigger if exists equipment_set_updated_at on public.equipment;
create trigger equipment_set_updated_at before update on public.equipment
for each row execute function public.set_updated_at();

drop trigger if exists form_templates_set_updated_at on public.form_templates;
create trigger form_templates_set_updated_at before update on public.form_templates
for each row execute function public.set_updated_at();

drop trigger if exists form_sections_set_updated_at on public.form_sections;
create trigger form_sections_set_updated_at before update on public.form_sections
for each row execute function public.set_updated_at();

drop trigger if exists form_questions_set_updated_at on public.form_questions;
create trigger form_questions_set_updated_at before update on public.form_questions
for each row execute function public.set_updated_at();

drop trigger if exists form_submissions_set_updated_at on public.form_submissions;
create trigger form_submissions_set_updated_at before update on public.form_submissions
for each row execute function public.set_updated_at();

drop trigger if exists issues_set_updated_at on public.issues;
create trigger issues_set_updated_at before update on public.issues
for each row execute function public.set_updated_at();

drop trigger if exists notifications_set_updated_at on public.notifications;
create trigger notifications_set_updated_at before update on public.notifications
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email, 'Staff member'),
    new.email,
    coalesce(new.raw_user_meta_data ->> 'role', 'staff')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.current_profile_role()
returns text
language sql
stable
as $$
  select role from public.profiles where id = auth.uid() and is_active = true
$$;

create or replace function public.is_supervisor_or_admin()
returns boolean
language sql
stable
as $$
  select coalesce(public.current_profile_role() in ('supervisor', 'admin'), false)
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select coalesce(public.current_profile_role() = 'admin', false)
$$;

create or replace function public.is_maintenance_or_manager()
returns boolean
language sql
stable
as $$
  select coalesce(public.current_profile_role() in ('maintenance', 'supervisor', 'admin'), false)
$$;

alter table public.profiles enable row level security;
alter table public.vehicles enable row level security;
alter table public.equipment enable row level security;
alter table public.form_templates enable row level security;
alter table public.form_sections enable row level security;
alter table public.form_questions enable row level security;
alter table public.form_submissions enable row level security;
alter table public.form_answers enable row level security;
alter table public.issues enable row level security;
alter table public.issue_updates enable row level security;
alter table public.notifications enable row level security;

drop policy if exists profiles_select_own_or_manager on public.profiles;
create policy profiles_select_own_or_manager on public.profiles
for select to authenticated
using (id = auth.uid() or public.is_supervisor_or_admin());

drop policy if exists profiles_update_own_or_admin on public.profiles;
create policy profiles_update_own_or_admin on public.profiles
for update to authenticated
using (id = auth.uid() or public.is_admin())
with check (id = auth.uid() or public.is_admin());

drop policy if exists profiles_admin_insert on public.profiles;
create policy profiles_admin_insert on public.profiles
for insert to authenticated
with check (public.is_admin());

drop policy if exists vehicles_read_active on public.vehicles;
create policy vehicles_read_active on public.vehicles
for select to authenticated
using (status <> 'retired' or public.is_supervisor_or_admin());

drop policy if exists vehicles_maintenance_manage on public.vehicles;
create policy vehicles_maintenance_manage on public.vehicles
for all to authenticated
using (public.is_maintenance_or_manager())
with check (public.is_maintenance_or_manager());

drop policy if exists equipment_read_active on public.equipment;
create policy equipment_read_active on public.equipment
for select to authenticated
using (status <> 'retired' or public.is_supervisor_or_admin());

drop policy if exists equipment_maintenance_manage on public.equipment;
create policy equipment_maintenance_manage on public.equipment
for all to authenticated
using (public.is_maintenance_or_manager())
with check (public.is_maintenance_or_manager());

drop policy if exists form_templates_read_active on public.form_templates;
create policy form_templates_read_active on public.form_templates
for select to authenticated
using (status = 'active' or public.is_supervisor_or_admin());

drop policy if exists form_templates_supervisor_manage on public.form_templates;
create policy form_templates_supervisor_manage on public.form_templates
for all to authenticated
using (public.is_supervisor_or_admin())
with check (public.is_supervisor_or_admin());

drop policy if exists form_sections_read_active_template on public.form_sections;
create policy form_sections_read_active_template on public.form_sections
for select to authenticated
using (
  exists (
    select 1 from public.form_templates
    where form_templates.id = form_sections.template_id
      and (form_templates.status = 'active' or public.is_supervisor_or_admin())
  )
);

drop policy if exists form_sections_supervisor_manage on public.form_sections;
create policy form_sections_supervisor_manage on public.form_sections
for all to authenticated
using (public.is_supervisor_or_admin())
with check (public.is_supervisor_or_admin());

drop policy if exists form_questions_read_active_template on public.form_questions;
create policy form_questions_read_active_template on public.form_questions
for select to authenticated
using (
  exists (
    select 1 from public.form_templates
    where form_templates.id = form_questions.template_id
      and (form_templates.status = 'active' or public.is_supervisor_or_admin())
  )
);

drop policy if exists form_questions_supervisor_manage on public.form_questions;
create policy form_questions_supervisor_manage on public.form_questions
for all to authenticated
using (public.is_supervisor_or_admin())
with check (public.is_supervisor_or_admin());

drop policy if exists form_submissions_insert_own on public.form_submissions;
create policy form_submissions_insert_own on public.form_submissions
for insert to authenticated
with check (submitted_by = auth.uid());

drop policy if exists form_submissions_read_own_or_manager on public.form_submissions;
create policy form_submissions_read_own_or_manager on public.form_submissions
for select to authenticated
using (submitted_by = auth.uid() or public.is_maintenance_or_manager());

drop policy if exists form_submissions_supervisor_update on public.form_submissions;
create policy form_submissions_supervisor_update on public.form_submissions
for update to authenticated
using (public.is_supervisor_or_admin())
with check (public.is_supervisor_or_admin());

drop policy if exists form_answers_insert_own_submission on public.form_answers;
create policy form_answers_insert_own_submission on public.form_answers
for insert to authenticated
with check (
  exists (
    select 1 from public.form_submissions
    where form_submissions.id = form_answers.submission_id
      and form_submissions.submitted_by = auth.uid()
  )
);

drop policy if exists form_answers_read_relevant on public.form_answers;
create policy form_answers_read_relevant on public.form_answers
for select to authenticated
using (
  exists (
    select 1 from public.form_submissions
    where form_submissions.id = form_answers.submission_id
      and (form_submissions.submitted_by = auth.uid() or public.is_maintenance_or_manager())
  )
);

drop policy if exists issues_insert_own on public.issues;
create policy issues_insert_own on public.issues
for insert to authenticated
with check (created_by = auth.uid());

drop policy if exists issues_read_relevant on public.issues;
create policy issues_read_relevant on public.issues
for select to authenticated
using (
  created_by = auth.uid()
  or assigned_to = auth.uid()
  or public.is_maintenance_or_manager()
);

drop policy if exists issues_maintenance_update on public.issues;
create policy issues_maintenance_update on public.issues
for update to authenticated
using (public.is_maintenance_or_manager())
with check (public.is_maintenance_or_manager());

drop policy if exists issue_updates_insert_relevant on public.issue_updates;
create policy issue_updates_insert_relevant on public.issue_updates
for insert to authenticated
with check (
  public.is_maintenance_or_manager()
  or exists (
    select 1 from public.issues
    where issues.id = issue_updates.issue_id
      and (issues.created_by = auth.uid() or issues.assigned_to = auth.uid())
  )
);

drop policy if exists issue_updates_read_relevant on public.issue_updates;
create policy issue_updates_read_relevant on public.issue_updates
for select to authenticated
using (
  exists (
    select 1 from public.issues
    where issues.id = issue_updates.issue_id
      and (
        issues.created_by = auth.uid()
        or issues.assigned_to = auth.uid()
        or public.is_maintenance_or_manager()
      )
  )
);

drop policy if exists notifications_read_own_or_manager on public.notifications;
create policy notifications_read_own_or_manager on public.notifications
for select to authenticated
using (recipient_profile_id = auth.uid() or public.is_supervisor_or_admin());

drop policy if exists notifications_manager_insert on public.notifications;
create policy notifications_manager_insert on public.notifications
for insert to authenticated
with check (public.is_supervisor_or_admin());

drop policy if exists notifications_admin_update on public.notifications;
create policy notifications_admin_update on public.notifications
for update to authenticated
using (public.is_admin())
with check (public.is_admin());
