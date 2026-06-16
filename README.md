# Recycle Group Safety Hub

Maintainly-style safety checklist app for Recycle Group operators, supervisors, and admins.

The product source of truth is `docs/SAFETY_CHECKLIST_CONTEXT.md`. Read that file before changing checklist behavior, database persistence, asset ownership rules, fault handling, or compliance-related flows.

## Current Stack

- Vite + React + TypeScript.
- HashRouter routing for GitHub Pages compatibility.
- Supabase client support with local/demo fallback when Supabase is not configured.
- Tailwind CSS utility styling.

## Common Commands

```sh
npm run dev
npm run lint
npm run build
npm run preview
npm run check:supabase
```

`npm run lint` currently runs TypeScript project checking with `tsc -b`.

## Environment

Client-side Supabase variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Server-side only, if needed:

- `SUPABASE_SERVICE_ROLE_KEY`

Never commit `.env.local` or paste real environment values into docs, issues, or commits.

## Safety Checklist Rules

Preserve these rules unless the business explicitly approves a change:

- Worker forms must stay mobile-first, simple, and low-friction.
- Company-owned and franchisee-owned asset logic must remain clear.
- Failed checklist items must flag a fault/follow-up path.
- Fault description is required when a fault/follow-up is created.
- Fault photo or photo-unavailable reason is required when a fault/follow-up is created.
- Meter readings cannot decrease, or increase abnormally, without an authorised override reason.
- Submitted checklist records, answers, signatures, timestamps, fault details, and history should be treated as immutable.

## Schema Status

The repository currently contains two schema directions:

- Older `checklist_*` tables used by the current frontend data access.
- Newer `form_*` compliance tables recommended for production in the context doc.

Do not change database schema or migrate frontend persistence without first documenting the migration risk and getting approval.

## Deployment Notes

- `vite.config.ts` uses a relative asset base.
- `src/App.tsx` uses `HashRouter`.
- `.github/workflows/deploy-github-pages.yml` builds `dist` for GitHub Pages deployment.
- `docs/index.html` and `docs/assets/` may contain GitHub Pages static output.
- `docs/SAFETY_CHECKLIST_CONTEXT.md` is not generated output and must be preserved.

For GitHub Pages, use one of these deployment sources:

- Recommended: GitHub Actions using `.github/workflows/deploy-github-pages.yml`.
- Alternative: Deploy from branch folder `/docs`.

Do not set GitHub Pages to deploy from the repository root. The root `index.html` is the Vite development entry and will show a blank page on static GitHub Pages.

## Generated Artifacts

These are not source of truth:

- `dist/`
- `node_modules/`
- `.DS_Store`
- generated zip upload/troubleshooting packages
- older troubleshooting output such as `github-pages-live-site/`
