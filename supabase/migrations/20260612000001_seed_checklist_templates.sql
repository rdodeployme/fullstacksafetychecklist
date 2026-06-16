insert into public.checklist_templates (
  slug,
  title,
  description,
  group_id,
  group_title,
  group_description,
  group_icon,
  group_variant,
  icon,
  variant,
  display_order,
  creates_issue
)
values
  ('driver-check', 'Driver Check', 'Daily vehicle check before departure', 'people-and-vehicles', 'People and vehicles', 'Driver, jockey and hook truck checks', 'truck', 'standard', 'truck', 'standard', 10, false),
  ('jockey-check', 'Jockey Check', 'Daily offsider check before departure', 'people-and-vehicles', 'People and vehicles', 'Driver, jockey and hook truck checks', 'truck', 'standard', 'users', 'standard', 20, false),
  ('hook-truck-check', 'Hook Truck Check', 'Hook truck and bin safety check', 'people-and-vehicles', 'People and vehicles', 'Driver, jockey and hook truck checks', 'truck', 'standard', 'factory', 'standard', 30, false),
  ('forklift-check', 'Forklift Check', 'Daily forklift pre-start check', 'machinery-and-equipment', 'Machinery and equipment', 'Forklifts, excavators and plant checks', 'forklift', 'standard', 'forklift', 'standard', 40, false),
  ('excavator-check', 'Excavator Check', 'Daily excavator pre-start check', 'machinery-and-equipment', 'Machinery and equipment', 'Forklifts, excavators and plant checks', 'forklift', 'standard', 'tractor', 'standard', 50, false),
  ('skid-steer-check', 'Skid Steer Check', 'Daily skid steer loader check', 'machinery-and-equipment', 'Machinery and equipment', 'Forklifts, excavators and plant checks', 'forklift', 'standard', 'tractor', 'standard', 60, false),
  ('shredder-check', 'Shredder Check', 'Slow speed shredder safety check', 'machinery-and-equipment', 'Machinery and equipment', 'Forklifts, excavators and plant checks', 'forklift', 'standard', 'cog', 'standard', 70, false),
  ('baler-check', 'Baler Check', 'Daily baler safety check', 'machinery-and-equipment', 'Machinery and equipment', 'Forklifts, excavators and plant checks', 'forklift', 'standard', 'package-check', 'standard', 80, false),
  ('eps-densifier-check', 'EPS Densifier Check', 'Polystyrene densifier safety check', 'machinery-and-equipment', 'Machinery and equipment', 'Forklifts, excavators and plant checks', 'forklift', 'standard', 'boxes', 'standard', 90, false),
  ('scissor-lift-check', 'Scissor Lift Check', 'Daily scissor lift safety check', 'machinery-and-equipment', 'Machinery and equipment', 'Forklifts, excavators and plant checks', 'forklift', 'standard', 'scissors', 'standard', 100, false),
  ('floor-scrubber-check', 'Floor Scrubber Check', 'Daily scrubber or sweeper check', 'machinery-and-equipment', 'Machinery and equipment', 'Forklifts, excavators and plant checks', 'forklift', 'standard', 'cog', 'standard', 110, false),
  ('extraction-ducting-check', 'Extraction Ducting Check', 'Check ducting, filters and debris', 'machinery-and-equipment', 'Machinery and equipment', 'Forklifts, excavators and plant checks', 'forklift', 'standard', 'wind', 'standard', 120, false),
  ('dumpmaster-check', 'Dumpmaster Check', 'Bin rotator safety check', 'machinery-and-equipment', 'Machinery and equipment', 'Forklifts, excavators and plant checks', 'forklift', 'standard', 'rotate', 'standard', 130, false),
  ('area-check', 'Area Check', 'Daily risk and hazard assessment', 'site-checks-and-follow-up', 'Site checks and follow-up', 'Area checks, faults and manager actions', 'map-pin', 'warning', 'map-pin', 'standard', 140, false),
  ('high-risk-area-check', 'High Risk Area Check', 'Smoke, heat, odour, paints, gas bottles and batteries', 'site-checks-and-follow-up', 'Site checks and follow-up', 'Area checks, faults and manager actions', 'map-pin', 'warning', 'shield-alert', 'warning', 150, false),
  ('end-of-day-closing', 'End of Day Closing', 'Final yard and equipment shutdown check', 'site-checks-and-follow-up', 'Site checks and follow-up', 'Area checks, faults and manager actions', 'map-pin', 'warning', 'door', 'standard', 160, false),
  ('report-fault', 'Report Fault', 'Report a safety issue or broken equipment', 'site-checks-and-follow-up', 'Site checks and follow-up', 'Area checks, faults and manager actions', 'map-pin', 'warning', 'alert', 'danger', 170, true),
  ('service-repair', 'Service / Repair', 'Record service or repair work', 'site-checks-and-follow-up', 'Site checks and follow-up', 'Area checks, faults and manager actions', 'map-pin', 'warning', 'wrench', 'standard', 180, false),
  ('manager-follow-up', 'Manager Follow-Up', 'Complete action after a reported fault', 'site-checks-and-follow-up', 'Site checks and follow-up', 'Area checks, faults and manager actions', 'map-pin', 'warning', 'user-check', 'standard', 190, false)
on conflict (slug) do update
set
  title = excluded.title,
  description = excluded.description,
  group_id = excluded.group_id,
  group_title = excluded.group_title,
  group_description = excluded.group_description,
  group_icon = excluded.group_icon,
  group_variant = excluded.group_variant,
  icon = excluded.icon,
  variant = excluded.variant,
  display_order = excluded.display_order,
  creates_issue = excluded.creates_issue,
  is_active = true;

insert into public.checklist_sections (template_id, title, display_order)
select id, case when creates_issue then 'Fault details' else 'Safety check' end, 1
from public.checklist_templates
where not exists (
  select 1 from public.checklist_sections
  where checklist_sections.template_id = checklist_templates.id
);

insert into public.checklist_items (template_id, section_id, prompt, display_order, requires_issue_on_fail)
select t.id, s.id, item.prompt, item.display_order, true
from public.checklist_templates t
join public.checklist_sections s on s.template_id = t.id
join lateral (
  values
    (1, 'Confirm this check has been completed and the area or equipment is safe to use.'),
    (2, 'Record any damage, hazard, missing equipment or unsafe condition.'),
    (3, 'Confirm supervisor has been notified if anything failed or needs follow-up.')
) as item(display_order, prompt) on true
where not exists (
  select 1 from public.checklist_items
  where checklist_items.template_id = t.id
);
