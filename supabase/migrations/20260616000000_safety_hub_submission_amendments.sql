-- Maintainly / Recycle Group Safety Hub amendments
-- Adds signature, asset, GPS, fault, meter, and service interval fields without
-- replacing the existing schema.

alter table if exists public.checklist_submissions
  add column if not exists asset_category text,
  add column if not exists asset_identifier text,
  add column if not exists staff_signature text,
  add column if not exists supervisor_signature text,
  add column if not exists gps_coordinates text,
  add column if not exists manual_location text,
  add column if not exists fault_found boolean not null default false,
  add column if not exists fault_description text,
  add column if not exists fault_photo_path text,
  add column if not exists fault_photo_unavailable_reason text,
  add column if not exists previous_meter_reading numeric,
  add column if not exists current_meter_reading numeric,
  add column if not exists meter_unit text,
  add column if not exists meter_photo_path text,
  add column if not exists meter_reading_at timestamptz,
  add column if not exists meter_override_reason text;

alter table if exists public.form_submissions
  add column if not exists asset_category text,
  add column if not exists asset_identifier text,
  add column if not exists staff_signature text,
  add column if not exists supervisor_signature text,
  add column if not exists gps_coordinates text,
  add column if not exists manual_location text,
  add column if not exists fault_found boolean not null default false,
  add column if not exists fault_description text,
  add column if not exists fault_photo_path text,
  add column if not exists fault_photo_unavailable_reason text,
  add column if not exists previous_meter_reading numeric,
  add column if not exists current_meter_reading numeric,
  add column if not exists meter_unit text,
  add column if not exists meter_photo_path text,
  add column if not exists meter_reading_at timestamptz,
  add column if not exists meter_override_reason text;

alter table if exists public.vehicles
  add column if not exists last_service_date date,
  add column if not exists next_service_due_hours numeric,
  add column if not exists next_service_due_kilometres numeric,
  add column if not exists service_notes text;

alter table if exists public.equipment
  add column if not exists last_service_date date,
  add column if not exists next_service_due_hours numeric,
  add column if not exists next_service_due_kilometres numeric,
  add column if not exists service_notes text;

create index if not exists checklist_submissions_asset_category_idx
  on public.checklist_submissions(asset_category);

create index if not exists checklist_submissions_asset_identifier_idx
  on public.checklist_submissions(asset_identifier);

create index if not exists checklist_submissions_fault_found_idx
  on public.checklist_submissions(fault_found);

create index if not exists form_submissions_asset_category_idx
  on public.form_submissions(asset_category);

create index if not exists form_submissions_asset_identifier_idx
  on public.form_submissions(asset_identifier);

create index if not exists form_submissions_fault_found_idx
  on public.form_submissions(fault_found);
