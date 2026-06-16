-- Recycle Group / JUNK MVP seed data
-- Run after supabase/sql/safety_compliance_mvp_schema.sql.
--
-- Important for demo users:
-- This seed does not create Auth passwords. First create these users in
-- Supabase Dashboard > Authentication > Users, then run this SQL:
--   admin@example.com
--   supervisor@example.com
--   driver@example.com
--   maintenance@example.com

alter table public.form_questions
  add column if not exists sort_order integer,
  add column if not exists creates_issue_on text not null default 'fail'
    check (creates_issue_on in ('fail', 'yes', 'no', 'any', 'never')),
  add column if not exists requires_notes_on_issue boolean not null default true,
  add column if not exists severity text not null default 'medium'
    check (severity in ('low', 'medium', 'high', 'critical')),
  add column if not exists notify_role text not null default 'supervisor'
    check (notify_role in ('staff', 'operator', 'supervisor', 'admin', 'maintenance'));

update public.form_questions
set sort_order = display_order
where sort_order is null;

alter table public.form_questions
  alter column sort_order set not null,
  alter column sort_order set default 0;

create index if not exists form_questions_sort_order_idx
  on public.form_questions(template_id, section_id, sort_order);

with demo_users(email, full_name, role) as (
  values
    ('admin@example.com', 'Admin User', 'admin'),
    ('supervisor@example.com', 'Supervisor User', 'supervisor'),
    ('driver@example.com', 'Driver User', 'staff'),
    ('maintenance@example.com', 'Maintenance User', 'maintenance')
)
insert into public.profiles (id, email, full_name, role, is_active)
select
  auth.users.id,
  demo_users.email,
  demo_users.full_name,
  demo_users.role,
  true
from demo_users
join auth.users on lower(auth.users.email) = lower(demo_users.email)
on conflict (id) do update
set
  email = excluded.email,
  full_name = excluded.full_name,
  role = excluded.role,
  is_active = true,
  updated_at = now();

insert into public.vehicles (name, registration, fleet_number, vehicle_type, status)
values
  ('Truck 1', 'ABC123', 'TRUCK-1', 'truck', 'active'),
  ('Truck 2', 'DEF456', 'TRUCK-2', 'truck', 'active'),
  ('Hook Truck', 'HOOK01', 'HOOK-1', 'hook_truck', 'active')
on conflict (registration) do update
set
  name = excluded.name,
  fleet_number = excluded.fleet_number,
  vehicle_type = excluded.vehicle_type,
  status = excluded.status,
  updated_at = now();

insert into public.equipment (name, equipment_type, asset_number, location, status)
values
  ('Forklift 1', 'forklift', 'FORKLIFT-1', 'Yard', 'active'),
  ('Excavator 1', 'excavator', 'EXCAVATOR-1', 'Yard', 'active')
on conflict (asset_number) do update
set
  name = excluded.name,
  equipment_type = excluded.equipment_type,
  location = excluded.location,
  status = excluded.status,
  updated_at = now();

insert into public.form_templates (
  slug,
  title,
  description,
  category,
  applies_to,
  status,
  display_order,
  created_by
)
values (
  'driver-safety-checklist',
  'Driver Safety Checklist',
  'Daily vehicle check before departure',
  'People and vehicles',
  'vehicle',
  'active',
  10,
  (select id from public.profiles where role = 'admin' order by created_at limit 1)
)
on conflict (slug) do update
set
  title = excluded.title,
  description = excluded.description,
  category = excluded.category,
  applies_to = excluded.applies_to,
  status = excluded.status,
  display_order = excluded.display_order,
  updated_at = now();

with template as (
  select id from public.form_templates where slug = 'driver-safety-checklist'
),
sections(title, description, display_order) as (
  values
    ('Personal Assessment', 'Driver fitness, licence and legal readiness.', 10),
    ('Pre-Trip Readiness', 'Route, crew, PPE and load readiness before departure.', 20),
    ('Vehicle Pre-Check', 'Vehicle exterior, controls, fluids and safety equipment.', 30),
    ('Vehicle Notes / Actions Taken', 'Faults, notes, actions and supervisor reporting.', 40)
)
insert into public.form_sections (template_id, title, description, display_order)
select template.id, sections.title, sections.description, sections.display_order
from template
cross join sections
where not exists (
  select 1
  from public.form_sections existing
  where existing.template_id = template.id
    and existing.title = sections.title
);

with template as (
  select id from public.form_templates where slug = 'driver-safety-checklist'
),
section_ids as (
  select form_sections.id, form_sections.title
  from public.form_sections
  join template on template.id = form_sections.template_id
),
questions(section_title, question_text, answer_type, sort_order, creates_issue_on, requires_notes_on_issue, severity, notify_role) as (
  values
    ('Personal Assessment', 'I acknowledge my responsibility to drive to the conditions of the road and respect road users.', 'pass_fail_na', 10, 'fail', true, 'high', 'supervisor'),
    ('Personal Assessment', 'I am free of drugs, alcohol or any medications that may impair my ability to drive this vehicle.', 'pass_fail_na', 20, 'fail', true, 'critical', 'supervisor'),
    ('Personal Assessment', 'I am aware of my responsibility to abide by all state and federal road laws.', 'pass_fail_na', 30, 'fail', true, 'high', 'supervisor'),
    ('Personal Assessment', 'I hold a valid licence for this vehicle.', 'pass_fail_na', 40, 'fail', true, 'critical', 'supervisor'),
    ('Personal Assessment', 'I have appropriate hands-free devices and acknowledge the laws around mobile phone use and will not use my phone while driving.', 'pass_fail_na', 50, 'fail', true, 'high', 'supervisor'),
    ('Personal Assessment', 'I am rested and fit to drive.', 'pass_fail_na', 60, 'fail', true, 'critical', 'supervisor'),
    ('Personal Assessment', 'If driving a heavy vehicle, I have completed my NHVR logbook and understand the requirements under law.', 'pass_fail_na', 70, 'fail', true, 'high', 'supervisor'),

    ('Pre-Trip Readiness', 'I have reviewed the route plan and equipment needed.', 'pass_fail_na', 10, 'fail', true, 'medium', 'supervisor'),
    ('Pre-Trip Readiness', 'I have ensured I have the contact details of my crew and management prior to departure.', 'pass_fail_na', 20, 'fail', true, 'medium', 'supervisor'),
    ('Pre-Trip Readiness', 'Truck is fuelled and cabin and rear are clear of any debris, clutter or loose projectiles.', 'pass_fail_na', 30, 'fail', true, 'high', 'supervisor'),
    ('Pre-Trip Readiness', 'I am in appropriate clothing, footwear and have the required Personal Protective Equipment (PPE) required of my role, including hi-vis.', 'pass_fail_na', 40, 'fail', true, 'high', 'supervisor'),
    ('Pre-Trip Readiness', 'I will take the required mandatory breaks to avoid fatigue.', 'pass_fail_na', 50, 'fail', true, 'high', 'supervisor'),
    ('Pre-Trip Readiness', 'I understand seatbelts are mandatory.', 'pass_fail_na', 60, 'fail', true, 'critical', 'supervisor'),
    ('Pre-Trip Readiness', 'I have appropriate equipment to safely secure my load and am aware of the height of my vehicle.', 'pass_fail_na', 70, 'fail', true, 'high', 'supervisor'),

    ('Vehicle Pre-Check', 'Visual inspection of truck exterior conducted and free of damage.', 'pass_fail_na', 10, 'fail', true, 'high', 'maintenance'),
    ('Vehicle Pre-Check', 'Verify all lights, including headlights, brake lights, turn signals and hazard lights, are working.', 'pass_fail_na', 20, 'fail', true, 'high', 'maintenance'),
    ('Vehicle Pre-Check', 'Ensure windshield, mirrors and windows are clean and free of cracks.', 'pass_fail_na', 30, 'fail', true, 'medium', 'maintenance'),
    ('Vehicle Pre-Check', 'Check for any fluid leaks under the vehicle.', 'pass_fail_na', 40, 'fail', true, 'high', 'maintenance'),
    ('Vehicle Pre-Check', 'Check tire pressure and tread depth.', 'pass_fail_na', 50, 'fail', true, 'high', 'maintenance'),
    ('Vehicle Pre-Check', 'Ensure horn is correctly functioning.', 'pass_fail_na', 60, 'fail', true, 'medium', 'maintenance'),
    ('Vehicle Pre-Check', 'Check dashboard for warning lights.', 'pass_fail_na', 70, 'fail', true, 'high', 'maintenance'),
    ('Vehicle Pre-Check', 'Test brakes and steering for proper response.', 'pass_fail_na', 80, 'fail', true, 'critical', 'maintenance'),
    ('Vehicle Pre-Check', 'Check wiper function and sufficient fluid.', 'pass_fail_na', 90, 'fail', true, 'medium', 'maintenance'),
    ('Vehicle Pre-Check', 'Check vehicle fluids, including oil, coolant and wiper fluid.', 'pass_fail_na', 100, 'fail', true, 'high', 'maintenance'),
    ('Vehicle Pre-Check', 'Number plate is visible and in good condition.', 'pass_fail_na', 110, 'fail', true, 'medium', 'supervisor'),

    ('Vehicle Notes / Actions Taken', 'Record any faults or issues and report to supervisor prior to departure.', 'text', 10, 'any', true, 'high', 'supervisor'),
    ('Vehicle Notes / Actions Taken', 'Record any remediation or action taken before departure.', 'text', 20, 'any', false, 'medium', 'supervisor'),
    ('Vehicle Notes / Actions Taken', 'Record vehicle kilometres or hours.', 'text', 30, 'never', false, 'low', 'supervisor')
)
insert into public.form_questions (
  template_id,
  section_id,
  question_text,
  answer_type,
  is_required,
  creates_issue_on_fail,
  display_order,
  sort_order,
  creates_issue_on,
  requires_notes_on_issue,
  severity,
  notify_role
)
select
  template.id,
  section_ids.id,
  questions.question_text,
  questions.answer_type::public.question_answer_type,
  true,
  questions.creates_issue_on in ('fail', 'any'),
  questions.sort_order,
  questions.sort_order,
  questions.creates_issue_on,
  questions.requires_notes_on_issue,
  questions.severity,
  questions.notify_role
from questions
join section_ids on section_ids.title = questions.section_title
cross join template
where not exists (
  select 1
  from public.form_questions existing
  where existing.template_id = template.id
    and existing.section_id = section_ids.id
    and existing.question_text = questions.question_text
);
