# Cafe Palestina — Session Handoff

Last updated 2026-06-24. Living context for a fresh Claude session. Pair this with
the auto-memory under the project's memory dir (`MEMORY.md` + files), which loads
automatically. No secrets are stored here.

## Stack & infra

- Astro v5 (`output: 'server'`) + Svelte 5 islands + Supabase (Auth + Postgres + Storage), deployed on Vercel.
- Canonical domain: `https://www.cafepalestinecolonia.de` (apex 307-redirects to www).
- Supabase project ref: `scctrpnoisvehdnspoej`. Vercel project `cafe-palestina` (prj_fFzByXf8GagrSYDCwV2jnbENps94), team `team_Ex39H0eafvBbbY2YH0m35G1B`.
- Env: PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, PUBLIC_SITE_URL (in `.env`, gitignored).
- Supabase MCP is configured for Claude Code (project-local, scoped to the ref): use the `mcp__supabase__*` tools (execute_sql, apply_migration, get_advisors, list_tables, etc.). It has DB/project tools only — NO GoTrue auth-config (Site URL, signups, rate limits) tools; those stay dashboard-only.

## Deploy pipeline (IMPORTANT)

- `main` = production (auto-deploys to www on push/merge). `staging` = preview deploys. Claude pushes to staging freely; `main` only via PR with Ibrahim's approval (he has standing approval for this stream of work).
- Flow used every time: commit on `staging` → `git push origin staging` → wait for the Vercel staging build READY → `gh pr create --base main --head staging` → `gh pr merge --merge` → Vercel auto-deploys main → verify on www.
- Verify builds via the Vercel MCP `list_deployments` (state READY, target production) and curl the www domain. Preview (staging) URLs are behind Vercel auth (401 to curl) — that's expected; verify on www after merge.
- Commit rules (Ibrahim's): conventional commits with scope, NO AI/Co-Authored-By trailer, no em dashes in commit messages.
- Note: local `staging` is content-identical to `main` but "behind" by the PR merge commits. Branching new work off `staging` is fine; merge-tree has been clean each time.

## What is shipped & live

- Admin invites work end-to-end (`/api/invite` checks role via the service-role client; `/admin/set-password` page handles the email link). Supabase Auth Site URL + redirect allow-list set to the www host.
- 2FA is now OPTIONAL (was mandatory). `MfaGuard` lets admins without an enrolled factor in with password alone; enrolled admins still verify. Enroll flow kept in code to re-enable later.
- Newsletter signup saves emails: `newsletter_subscribers` table (anon insert, valid email + consent via RLS, admin-only read), consent checkbox + privacy link, rendered on all 3 home pages. Single opt-in (no confirmation email yet). View via Supabase table editor.
- SEO: valid Event JSON-LD, hreflang (de/en/ar + x-default), `public/sitemap.xml` (static, hand-maintained 9 URLs), robots.txt -> www.
- RSVP (in-house, complete): public form in the event modal (name/email/guests/message, trilingual, honeypot anti-spam, dedup). Admin `/admin/rsvps` is interactive (`RsvpManager.svelte`): per-event grouping + totals, manual add (email optional), paste-a-list import (one per line, email auto-detected), cancel/restore/delete. Event modal has a universal `.ics` download + the Google Calendar link. Admin dashboard RSVP count/recent fetched client-side.
- Stability fixes: EventModal focus trap, Footer language-aware link, lib error logging, branded 404, settings save-on-blur, impressum address = Geisselstraße 3-5 50823 Köln, DB function search_path hardened.
- Suraya (hoffmann.suraya@gmail.com, admin) has a temp password set via the admin API and shared with Ibrahim directly (not stored here). She can log in (2FA optional). No in-app change-password screen yet.

## DB / migrations

- Migrations 001-008 in `supabase/migrations/`. 006 (newsletter), 007 (function search_path), 008 (rsvp source/nullable-email/dedup) were applied to prod via the MCP and recorded as files.
- RLS is the real security boundary (admin guards are client-side only). `is_admin()` and `get_my_role()` are SECURITY DEFINER (search_path pinned). Admin-only tables: rsvps, newsletter_subscribers, user_roles.
- Reproducibility gap: some live objects predate the migration files (`get_users_with_roles`, the `get_my_role()`-based user_roles policies). A clean rebuild from files would miss them. Capture later if needed.

## Recurring gotchas (read before coding)

- Anon SSR cannot read admin-only tables (RLS). Don't fetch RSVPs/subscribers in `.astro` frontmatter with the shared `supabase` client — fetch client-side with the admin session (see the dashboard + RsvpManager pattern).
- Public inserts must NOT chain `.select()` (anon can't read the row back) — see `submitRSVP` and `subscribeNewsletter`.
- `event.time` is free-form text. Use `eventDateTimes(date, time)` in `lib/events.ts` for any date math (JSON-LD, .ics). Never `new Date(date + 'T' + time)`.
- Many hooks fire false-positive Next.js/Vercel-storage/next-cache skill suggestions — this is Astro + Supabase; ignore them.

## NEXT TASK: Blog (design approved, ready to build)

In-house, simple, mirror the events CMS. Approved scope:
- Data: new `posts` table — slug (unique), title_de/en/ar, body_de/en/ar (rich HTML), excerpt_de/en/ar, cover image (Supabase storage like events), status (draft/published), published_at, created_at, updated_at. RLS: public reads published, admins manage all. Add as migration 009 + apply via MCP.
- Public: `/blog` (+ `/en/blog`, `/ar/blog`) listing (cover, title, excerpt, date, newest first) and `/blog/[slug]` post pages (sanitized HTML body, SEO meta + Article/BlogPosting JSON-LD + hreflang). Add "Blog" to the header nav (Header.astro) and the sitemap.
- Admin: `/admin/blog` list + create/edit/delete reusing the existing `RichTextEditor`, cover-image upload, slug, multilingual fields, draft/publish toggle (mirror `EventForm`/`ContentEditor`). Add "Blog" to the admin sidebar (`AdminLayout.astro` navItems).
- v1 scope decisions (approved): drafts+publish yes; NO comments, tags, or RSS; include the excerpt field; Blog in main nav. RSS is cheap to add later if asked.

## After blog

- Email agent for Suraya: an address only she emails that sets up events / makes site changes for her. Likely on Ibrahim's VPS. Data is in Supabase so the agent writes via API. Separate effort.

## Open / deferred (lower priority)

- Hero "Link to Event" announcements fall back to `#events` (no per-event page; a modal deep-link is deferred, ties into events work).
- No in-app change-password screen for logged-in admins (Suraya keeps her temp password).
- Leaked-password protection is a Supabase Pro feature; left off on the free plan.
- Dashboard "Total Events"/"Upcoming" still SSR via anon (fine — events are public).
