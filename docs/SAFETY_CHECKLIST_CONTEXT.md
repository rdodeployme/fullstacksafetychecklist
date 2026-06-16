# Safety Checklist Context

This file is the source of truth for the Maintainly-style Safety Checklist feature in the Recycle Group Safety Hub.

Last updated: 2026-06-16

## 1. Purpose

The safety checklist system gives staff a simple way to complete daily safety checks, permits, fault reports, and service records from a phone or tablet.

The main goal is operational safety and compliance, not a complex SaaS dashboard. Workers should scan a QR code or open a bookmarked page, choose the correct tile, type their name, complete the check, and submit.

The system must support:

- Daily pre-start checks.
- Fault capture.
- Permit capture.
- Service and repair records.
- Supervisor follow-up.
- Admin reporting.
- Chain of responsibility and WHS evidence.

## 2. Users

Primary users:

- Drivers.
- Jockeys / offsiders.
- Forklift operators.
- Excavator operators.
- Skid steer operators.
- Machinery operators.
- Yard staff.
- Workshop and maintenance staff.

Secondary users:

- Supervisors.
- Managers.
- Admin staff.
- Compliance staff.

The operator-facing experience must assume many users are older, practical, time-poor, and may dislike complex technology.

## 3. Asset Types

The system currently covers or is expected to cover:

- Trucks.
- Hook trucks.
- Forklifts.
- Excavators.
- Skid steers.
- Shredders.
- Balers.
- EPS / polystyrene machines.
- Scissor lifts.
- Floor scrubbers.
- Extraction ducting.
- Dumpmasters.
- Screens.
- Crushers.
- Conveyors.
- Rollers.
- Truck service bay.
- Yard areas.
- High risk areas.
- Hot works jobs.
- Spray painting / panel beating jobs.

## 4. Company-Owned vs Franchisee-Owned Assets

Company-owned assets:

- Should be fully tracked in the asset register.
- Should have daily checks, fault records, service records, and issue history kept by the company.
- Should support admin reporting by asset number, asset category, date range, staff member, and fault status.
- Should have service interval data where relevant.

Franchisee-owned assets:

- May still need checks when operating under Recycle Group / JUNK work.
- Should be identifiable as franchisee-owned or external-owned in the future asset register.
- Should still capture staff name, asset category, asset ID, date/time, declarations, and fault details.
- May not require company-managed service interval tracking unless Recycle Group is responsible for maintenance.
- Must still support chain of responsibility evidence where the vehicle or equipment is used for company work.

Recommended future asset ownership values:

- `company_owned`
- `franchisee_owned`
- `contractor_owned`
- `unknown`

## 5. Daily Checklist Business Rules

Daily checks should:

- Be completed before the asset is operated or before departure.
- Capture staff member name.
- Capture asset category.
- Capture asset ID / asset number.
- Capture date and time.
- Capture fitness for work declarations.
- Capture licence / permit declaration where relevant.
- Capture odometer or hour meter readings where relevant.
- Capture meter photo where relevant.
- Capture a staff signature.
- Create or flag a fault when any item fails.

Fault rules:

- If a user marks an item as fail, damaged, unsafe, not working, or requires attention, the submission is flagged as `FAULT FOUND`.
- Fault description is mandatory.
- Fault photo is mandatory where possible.
- If no photo is available, a reason is mandatory.
- Standard reports route to `reports@recycle.net.au`.
- Fault reports route to `repairs@recycle.net.au`.

Meter rules:

- Store previous reading.
- Store current reading.
- Store meter photo.
- Store reading timestamp.
- Current reading cannot decrease unless an authorised override reason is entered.
- Abnormally high increases must be flagged and require an authorised override reason.

## 6. Chain of Responsibility and WHS Requirements

The system should create reliable evidence that staff and management are checking assets before use and acting on reported faults.

The system should support:

- Vehicle roadworthiness evidence.
- Heavy vehicle chain of responsibility evidence where relevant.
- Worker fitness for work declarations.
- Licence / permit confirmation.
- PPE and clothing confirmation.
- Hazard identification.
- Fault reporting.
- Supervisor follow-up.
- Repair / maintenance history.
- High risk work controls.
- Hot works controls.
- Spray painting / panel beating controls.

This file is product context, not legal advice. Compliance rules should be reviewed by the business, safety advisor, or legal/compliance specialist before production reliance.

## 7. Fields That Must Be Captured

Universal checklist / permit fields:

- Staff member name.
- Asset category.
- Asset ID / asset number.
- Date and time.
- Staff signature.
- Automatic submission timestamp.
- Location capture is not part of the V1 worker form because it adds too much friction for operators.
- GPS/manual location may be kept as a future optional backend/admin feature, but should not be visible to workers unless the business explicitly re-approves it.

Fitness for work declarations:

- Drug free.
- Alcohol free.
- Not impaired by medication.
- Fit for work.
- Correct licence / permit held where required.
- Appropriate clothing worn.
- PPE / safety vest worn where required.

Fault fields:

- Fault flag.
- Fault description.
- Fault photo.
- Fault photo unavailable reason, if no photo is supplied.
- Failed checklist item.
- Notes.
- Route/report recipients.

Meter fields where relevant:

- Previous reading.
- Current reading.
- Meter unit, such as kilometres or hours.
- Meter photo.
- Reading timestamp.
- Override reason if reading decreases or increases abnormally.

Truck-specific required fields:

- Truck / asset ID.
- Driver name or staff member name.
- Date and time.
- Odometer kilometres.
- Odometer photo.
- Current licence / permit confirmation.
- Drug free confirmation.
- Alcohol free confirmation.
- Not impaired by medication confirmation.
- Fit for work confirmation.

Forklift / excavator / skid steer required fields:

- Asset ID.
- Staff member name.
- Date and time.
- Hour meter reading.
- Hour meter photo.
- Current licence / permit confirmation.

Shredder required fields:

- Asset ID.
- Staff member name.
- Date and time.
- Hour meter reading.
- Hour meter photo.

Baler and EPS / polystyrene machine:

- Do not require hours or kilometres unless the business changes this later.

Service interval fields:

- Last service date.
- Next service due hours.
- Next service due kilometres.
- Service notes.

## 8. Immutable or Non-Deletable Records

The following should be treated as immutable or non-deletable once submitted:

- Checklist submissions.
- Checklist answers.
- Staff signatures.
- Submission timestamps.
- Fault flags.
- Fault descriptions.
- Fault photo references.
- Meter readings.
- Meter photos.
- GPS/manual location records, if location capture is reintroduced later.
- Issue creation records.
- Issue update history.
- Notification event logs.

Corrections should be handled by appending a correction note or admin amendment record, not by overwriting or deleting the original record.

Soft delete or archive is acceptable for templates and assets, but submitted safety records should remain available for compliance and audit.

## 9. Sold or Dormant Assets

Sold, retired, inactive, or dormant assets should:

- Remain in historical records.
- Not appear as normal active choices for new daily checks.
- Still be searchable by admins.
- Retain all linked submissions, faults, service records, and issues.

Recommended asset statuses:

- `active`
- `inactive`
- `maintenance`
- `dormant`
- `sold`
- `retired`

If an old asset is scanned from an old QR code, the app should show a clear message such as: "This asset is inactive. Ask your supervisor before continuing."

## 10. Current Completed Functionality

Current front-end:

- Vite + React + TypeScript app.
- HashRouter routing for GitHub Pages compatibility.
- Public worker home screen available without login.
- Admin login still exists for admin/supervisor areas.
- Home page tile grid for checklist categories.
- Fleet number shortcut on home page; any typed fleet number opens the truck/driver check with the fleet number prefilled.
- Dynamic checklist form route at `#/forms/:slug`.
- Large pass / fail / N/A controls.
- Selected answer button stays highlighted.
- App-level validation messages for blank required fields.
- Public local demo submissions are supported when Supabase is not configured.

Current checklist/template data:

- Truck Check.
- Jockey Check.
- Hook Truck Check.
- Forklift Check.
- Excavator Check.
- Skid Steer Check.
- Shredder Check.
- Baler Check.
- EPS Densifier Check.
- Scissor Lift Check.
- Floor Scrubber Check.
- Extraction Ducting Check.
- Dumpmaster Check.
- Screens Check.
- Crushers Check.
- Conveyors Check.
- Rollers Check.
- Area Check.
- Truck Service Bay Check.
- High Risk Area Check.
- Hot Works Permit.
- Spray Painting / Panel Beating Checklist.
- End of Day Closing.
- Report Fault.
- Service / Repair.
- Manager Follow-Up.

Recent amendments implemented in the front end:

- Universal asset category.
- Universal ownership type for company-owned and franchisee-owned assets.
- Universal asset ID / asset number.
- Universal staff member name.
- Universal date/time.
- Universal fitness declarations.
- Staff signature.
- Optional supervisor signature for applicable modules.
- Automatic submission timestamp.
- GPS capture was removed from the worker form because it was too much for V1.
- Fault description requirement.
- Fault photo or photo-unavailable reason requirement.
- Meter previous/current validation.
- Abnormal meter increase flag.
- Authorised override reason.
- Service interval fields on service/repair.
- Workshop compliance checks for service bay, hot works, spray painting / panel beating.
- Admin recent submissions show ownership type and asset ID when saved in submission history.

Current static deployment support:

- `docs/index.html` and `docs/assets/` hold the GitHub Pages build.
- `vite.config.ts` uses relative asset base for GitHub Pages.
- `src/App.tsx` uses `HashRouter`.
- `.github/workflows/deploy-github-pages.yml` exists.
- `recycle-group-safety-hub-github-upload.zip` is a generated upload package.

## 11. Current Incomplete Functionality

Still incomplete or prototype-only:

- Real production persistence for all public worker submissions.
- Actual upload storage for photos.
- Real email sending to `reports@recycle.net.au` and `repairs@recycle.net.au`.
- Fully connected Supabase schema to the current front-end checklist field model.
- Admin template management UI.
- Admin user/role management UI.
- Full issue resolution workflow.
- Manager follow-up workflow tied directly to created issues.
- Export reports.
- Structured asset-register ownership handling for advanced filtering/reporting.
- Sold/dormant asset behavior in UI.
- QR-code asset-specific routing.
- Real service interval dashboard.
- Push/SMS/in-app notifications.
- Offline mode.
- Audit correction workflow.

## 12. Known Bugs or Risks

Known risks:

- Supabase connection previously failed locally because the anon key was invalid or placeholder.
- `.env.local` must not be committed.
- Public worker submissions currently fall back to local/demo behavior if Supabase is not configured or if using a local public-worker profile.
- Photo uploads are captured in the browser UI, but real storage is not fully wired.
- Email routing is recorded in notes, but actual email sending depends on backend/Edge Function wiring.
- Some older built assets may remain in `docs/assets`; `docs/index.html` points to the active latest bundle.
- There are two schema directions in the repo: older `checklist_*` tables and newer `form_*` compliance tables. This needs consolidation before production.
- GPS/location capture is intentionally not shown in the V1 worker form. If reintroduced later, remember browser geolocation requires HTTPS or localhost and user/device permission.
- Current front-end validations are helpful but should be repeated server-side before production.
- Legal/WHS/chain of responsibility requirements should be verified before production reliance.

## 13. Important Files

Core app:

- `src/App.tsx`: App routing. Uses `HashRouter`. Public routes include home, help, and forms. Admin/issues routes are protected.
- `src/main.tsx`: React app entry.
- `src/SafetyHubPage.tsx`: Legacy compatibility re-export for `src/pages/SafetyHubPage.tsx`; do not build new logic here.
- `src/pages/SafetyHubPage.tsx`: Worker home screen, checklist tiles, fleet number shortcut.
- `src/pages/ChecklistFormPage.tsx`: Shared checklist/permit form page, validation, fault workflow, signatures, meter validation.
- `src/pages/LoginPage.tsx`: Admin/supervisor login screen.
- `src/pages/AdminPage.tsx`: Admin records page shell.
- `src/pages/IssuesPage.tsx`: Supervisor issues dashboard shell.
- `src/pages/HelpPage.tsx`: Simple help page.
- `src/data/defaultChecklistTemplates.ts`: Fallback checklist/template definitions and most current front-end checklist content.
- `src/lib/checklists.ts`: Loads templates, derives groups, submits checklists, creates issue records, builds submission notes.
- `src/lib/supabase.ts`: Supabase browser client setup using environment variables.
- `src/lib/icons.ts`: Lucide icon mapping.
- `src/auth/AuthContext.tsx`: Auth/profile/demo-login handling.
- `src/types.ts`: Shared TypeScript types.
- `src/styles.css`: Tailwind component classes and visual style.
- `src/vite-env.d.ts`: Vite TypeScript environment declarations.

Configuration:

- `vite.config.ts`: Vite config, relative base, `NEXT_PUBLIC_` env prefix.
- `.env.example`: Placeholder environment variables only.
- `.env.local`: Local secrets file, ignored by git via `*.local`; do not commit or paste contents.
- `.gitignore`: Must ignore `.env.local`.
- `index.html`: Vite HTML shell.
- `package.json`: Scripts and dependencies.
- `package-lock.json`: Locked dependency tree.
- `tailwind.config.ts`: Tailwind content paths and theme tokens.
- `postcss.config.js`: Tailwind/autoprefixer PostCSS setup.
- `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`: TypeScript project configuration.

Supabase:

- `supabase/migrations/20260612000000_safety_hub_schema.sql`: Earlier checklist-based schema.
- `supabase/migrations/20260612000001_seed_checklist_templates.sql`: Earlier checklist template seed.
- `supabase/migrations/20260612000002_safety_compliance_form_schema.sql`: Form-based compliance schema.
- `supabase/migrations/20260616000000_safety_hub_submission_amendments.sql`: Amendment columns for signatures, optional future GPS/location fields, fault flags, meter readings, and service interval data.
- `supabase/sql/safety_compliance_mvp_schema.sql`: SQL document for MVP schema.
- `supabase/sql/seed_mvp_driver_safety_checklist.sql`: MVP seed for driver checklist and demo records.
- `supabase/functions/send-notification/index.ts`: Supabase Edge Function stub for notifications.
- `api/supabase-health.ts`: Vercel-style server-side Supabase health check.
- `scripts/check-supabase-connection.mjs`: Local Supabase connection check script.

Deployment/static output:

- `.github/workflows/deploy-github-pages.yml`: GitHub Pages workflow that builds `dist`.
- `docs/index.html`: GitHub Pages built entry.
- `docs/assets/`: GitHub Pages built assets.
- `docs/.nojekyll`: Prevents GitHub Pages Jekyll processing.
- `docs/SAFETY_CHECKLIST_CONTEXT.md`: Product and engineering context source of truth.

Generated/local artifacts:

- `dist/`: Local production build output.
- `recycle-group-safety-hub-github-upload.zip`: Generated upload package.
- `recycle-group-safety-hub-live-site.zip`: Older troubleshooting package, not source of truth.
- `github-pages-live-site/`: Older troubleshooting output, not source of truth.
- `node_modules/`: Installed dependencies, not source of truth.
- `.DS_Store`: macOS artifact, not source of truth.

## 14. Database and Schema Assumptions

Intended production database is Supabase Postgres.

Assumed core entities:

- `profiles`
- `vehicles`
- `equipment`
- `form_templates`
- `form_sections`
- `form_questions`
- `form_submissions`
- `form_answers`
- `issues`
- `issue_updates`
- `notifications` or `notification_events`

Current repo reality:

- The app currently reads fallback templates from TypeScript if Supabase is missing or returns no templates.
- `src/lib/checklists.ts` currently queries `checklist_templates`, `checklist_sections`, and `checklist_items`.
- Separate SQL files also define `form_templates`, `form_sections`, `form_questions`, `form_submissions`, and `form_answers`.
- Before production, choose one canonical schema direction and update the front-end data access to match it.

Recommended canonical direction:

- Use `form_*` tables for production compliance records.
- Keep templates dynamic in the database.
- Keep submitted records immutable.
- Store files in Supabase Storage and store file paths in submission/answer/issue records.
- Use RLS for staff, supervisors, admins, and maintenance.

## 15. Environment Variables

Required client-side variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Server-side only if needed:

- `SUPABASE_SERVICE_ROLE_KEY`

Rules:

- Do not hardcode real keys.
- Do not commit `.env.local`.
- `.env.example` should contain placeholders only.
- `SUPABASE_SERVICE_ROLE_KEY` must never be used in browser/client code.

## 16. Mobile Usability Requirements

The system must remain:

- Mobile-first.
- Tablet friendly.
- Large tap target based.
- High contrast.
- Simple English.
- Low clutter.
- Usable by older operators from a few feet away.
- No tiny menus for workers.
- No complex dashboards for workers.
- No icon-only buttons without labels.
- No unnecessary settings.
- No horizontal scrolling.
- QR-code friendly.
- Bookmark friendly.

Operators should be able to understand what to press in under 5 seconds.

## 17. Phase 1 Cleanup Audit

Audit date: 2026-06-16

Phase 1 is limited to zero-risk cleanup. Do not change checklist business logic, auth/security-sensitive logic, UI design, database schema, or deployment behavior in this phase.

Current repo health:

- TypeScript project check passes with `tsc -b`.
- No project README existed before this audit.
- There is no `components/` directory; page-local components are currently embedded in page files.
- The checklist flow is concentrated in `src/pages/ChecklistFormPage.tsx`, `src/lib/checklistFormHelpers.ts`, `src/lib/checklists.ts`, `src/data/defaultChecklistTemplates.ts`, and `src/types.ts`.
- The current `lint` script is TypeScript checking only; it does not prove unused code or enforce style rules beyond compiler settings.

Critical risks to keep visible:

- The frontend still reads and writes older `checklist_*` tables, while the recommended production direction is `form_*` tables.
- Newer checklist fields such as asset ownership, signatures, meter readings, and fault metadata are mostly serialized into submission notes rather than persisted as structured columns.
- Photo upload is captured in the browser UI, but Supabase Storage upload and durable file paths are not wired end to end.
- Public/demo worker submissions can fall back to local/demo success when Supabase is not configured or when a local public-worker profile is used.
- Demo auth behavior is security-sensitive and should not be changed without explicit approval.

Safe Phase 1 changes:

- Add a project README with setup, safety rules, schema status, and generated-artifact notes.
- Keep this context file updated as the source of truth.
- Ignore clearly generated local artifacts such as zip packages and older troubleshooting output.

Do not touch yet:

- `src/auth/AuthContext.tsx` unless auth behavior is explicitly approved for review.
- Supabase migrations or SQL schema files unless the migration risk and canonical schema direction are approved.
- Checklist content in `src/data/defaultChecklistTemplates.ts` unless the business approves wording or rule changes.
- `src/pages/ChecklistFormPage.tsx` except for tightly scoped, behavior-preserving fixes.

## 18. Phase 4 Structured Persistence Step

Implementation date: 2026-06-16

The current production-safe persistence direction is conservative:

- Keep the existing `checklist_*` frontend path for now.
- Keep writing human-readable submission notes as a fallback/audit aid.
- Also write already-captured worker form values into existing `checklist_submissions` amendment columns where those columns exist.
- If those amendment columns are missing in an older Supabase database, the app falls back to the previous notes-only insert so worker submissions are not blocked.
- Do not migrate the frontend to `form_*` tables until the canonical schema direction is approved.
- Do not make schema changes in this step.

Structured checklist submission fields now written by `src/lib/checklists.ts` when Supabase is configured and the profile is not local/demo:

- `asset_category`
- `asset_identifier`
- `staff_signature`
- `supervisor_signature`
- `fault_found`
- `fault_description`
- `fault_photo_unavailable_reason`
- `previous_meter_reading`
- `current_meter_reading`
- `meter_unit`
- `meter_reading_at`
- `meter_override_reason`

Still intentionally not structured in this step:

- Asset ownership remains in notes because there is no approved `asset_ownership` column yet.
- Fault photo and meter photo paths remain unset because Supabase Storage upload is not wired end to end; file names remain in notes only.
- Service interval fields remain in notes because current amendment columns place service interval data on `vehicles` and `equipment`, not on immutable checklist submissions.

Before production reliance:

- Confirm the `20260616000000_safety_hub_submission_amendments.sql` migration has been applied wherever the app is expected to write structured checklist submission fields.
- Add server-side validation for required safety fields, fault details, meter override rules, and immutable/correction behavior.
- Decide whether to add `asset_ownership` to the submission record or normalize it through an asset register.

## 17. Admin and Reporting Requirements

Admin users should be able to:

- View all submissions.
- Filter by date range.
- Filter by staff member.
- Filter by asset category.
- Filter by asset ID.
- Filter by fault status.
- View fault reports.
- View photos.
- View GPS/manual location only if location capture is reintroduced later.
- View issue history.
- View service/repair records.
- Export records.
- Manage checklist templates.
- Manage users and roles.
- Manage active/inactive/sold/dormant assets.

Supervisor users should be able to:

- View open faults.
- View failed checklist items.
- Add follow-up notes.
- Assign or update issue status.
- Mark repairs or follow-up complete.

Worker users should not see admin/reporting complexity.

## 18. Recommended Next Task

Recommended next task:

Consolidate the Supabase schema and front-end submission path.

Suggested scope:

1. Choose `form_*` tables as the canonical production schema.
2. Update `src/lib/checklists.ts` to submit public worker checklist data into `form_submissions` and `form_answers`.
3. Add Supabase Storage buckets for odometer/hour-meter/fault photos.
4. Store uploaded file paths in the database.
5. Persist fault records into `issues`.
6. Keep the current UI unchanged unless a critical bug is found.
7. Add a simple admin records view that proves submissions are saved.

Do this before investing more time in UI polish, because persistence and records are the biggest production gap.
