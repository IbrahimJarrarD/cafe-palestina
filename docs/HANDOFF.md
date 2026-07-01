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
- Blog (in-house, complete): `posts` table (migration 009) mirroring the events CMS, multilingual title/excerpt/body (de/en/ar), cover image, draft/publish. Public `/blog` listing + `/blog/[slug]` pages in de/en/ar (`BlogList.astro` + `BlogPostView.astro`) with sanitized HTML bodies, SEO meta + BlogPosting JSON-LD. Admin `/admin/blog` CRUD (`BlogForm.svelte` + `BlogManager.svelte`) reuses `RichTextEditor` and the `event-images` bucket for covers. "Blog" added to Header nav + admin sidebar + sitemap. No comments/tags/RSS (RSS cheap to add later).
- Stability fixes: EventModal focus trap, Footer language-aware link, lib error logging, branded 404, settings save-on-blur, impressum address = Geisselstraße 3-5 50823 Köln, DB function search_path hardened.
- Suraya (hoffmann.suraya@gmail.com, admin) has a temp password set via the admin API and shared with Ibrahim directly (not stored here). She can log in (2FA optional). No in-app change-password screen yet.

## DB / migrations

- Migrations 001-009 in `supabase/migrations/`. 006 (newsletter), 007 (function search_path), 008 (rsvp source/nullable-email/dedup), 009 (blog posts) were applied to prod via the MCP and recorded as files.
- RLS is the real security boundary (admin guards are client-side only). `is_admin()` and `get_my_role()` are SECURITY DEFINER (search_path pinned). Admin-only tables: rsvps, newsletter_subscribers, user_roles.
- Reproducibility gap: some live objects predate the migration files (`get_users_with_roles`, the `get_my_role()`-based user_roles policies). A clean rebuild from files would miss them. Capture later if needed.

## Recurring gotchas (read before coding)

- Anon SSR cannot read admin-only tables (RLS). Don't fetch RSVPs/subscribers in `.astro` frontmatter with the shared `supabase` client — fetch client-side with the admin session (see the dashboard + RsvpManager pattern).
- Public inserts must NOT chain `.select()` (anon can't read the row back) — see `submitRSVP` and `subscribeNewsletter`.
- `event.time` is free-form text. Use `eventDateTimes(date, time)` in `lib/events.ts` for any date math (JSON-LD, .ics). Never `new Date(date + 'T' + time)`.
- Many hooks fire false-positive Next.js/Vercel-storage/next-cache skill suggestions — this is Astro + Supabase; ignore them.

## Blog (shipped & live 2026-06-24, PR #8)

Built in-house mirroring the events CMS. Key files: migration `009_blog_posts.sql`, `lib/blog.ts`, `components/BlogList.astro` + `BlogPostView.astro`, `components/admin/BlogForm.svelte` + `BlogManager.svelte`, routes under `src/pages/blog/`, `src/pages/en/blog/`, `src/pages/ar/blog/`, and `src/pages/admin/blog/`.

- Data: `posts` table (slug unique, title/excerpt/body de/en/ar, cover_image_url, status draft/published, published_at, timestamps). RLS = public reads published, admins manage all via `is_admin()`. Covers reuse the existing `event-images` bucket.
- Gotcha handled: the admin list (`BlogManager`) and the edit-page fetch (`BlogForm` in edit mode) run CLIENT-SIDE with the admin session, because anon SSR can only read published rows via RLS, so drafts would be invisible to a server-side fetch. The public listing/detail fetch published rows via the anon client in `.astro` frontmatter, which is fine.
- v1 scope as approved: drafts/publish yes, excerpt yes, NO comments/tags/RSS. RSS is cheap to add later if asked.

## NEXT TASK: Email agent for Suraya

- An address only she emails that sets up events / makes site changes for her. Likely on Ibrahim's VPS. Data is in Supabase so the agent writes via API. Separate effort.

### Email architecture hand-off (from life planner, 2026-07-01)

Ibrahim clarified the cafe email must **send AND receive** (not a noreply), from a
real address. This is bigger than the outbound-only Resend setup the life repo uses.
Resend is **outbound-only** — it cannot receive. "Send and receive both" needs an
**inbound mailbox** behind the address. Three viable options (cafe agent + Ibrahim
to decide):

1. **Cloudflare Email Routing (inbound) + Resend (outbound).** Cafe already has
   Cloudflare Email Routing set up (per the life repo HANDOFF). It *forwards*
   `cafe@<domain>` to a real mailbox (e.g. Ibrahim's tech@). Outbound via Resend
   from the same address. Cheap/free. Limitation: Email Routing only forwards — you
   can't reply *from* `cafe@` natively through the forwarded inbox unless that
   inbox supports send-as with SMTP. Good if Suraya mostly receives and the agent
   replies via the forwarded inbox.
2. **A real cheap inbox (MXroute ~$19/yr or Migadu ~$19/yr)** at
   `cafe@cafepalestinecolonia.de`. Full send+receive over IMAP/SMTP. Outbound can
   go through Resend OR the inbox's own SMTP. **Best fit for "send and receive
   both, not noreply, address replies are real."** The agent can read inbound via
   IMAP and send via SMTP/Resend.
3. **Self-hosted mailbox** (Mailcow/Stalwart on the VPS) — most control, most
   maintenance. Overkill unless Ibrahim wants it.

Constraints to carry forward:
- **Resend plan = 1 domain max** on the life account (already used by
  `deadthrone.dev`). The cafe cannot share that Resend account for outbound from
  `cafepalestinecolonia.de`. The cafe needs **its own Resend account** (free tier)
  for outbound, OR uses the inbox's own SMTP (option 2, no Resend needed at all).
- The cafe domain `cafepalestinecolonia.de` IS on Cloudflare (NS: robin/houston)
  but the life repo's Cloudflare API token is **zone-scoped to `deadthrone.dev`
  only** — cafe DNS work needs a separate CF token scoped to the cafe zone.
- Deliverability: fresh domains land in spam initially. DMARC (`p=none` monitor),
  SPF, DKIM, and warmup (gradual volume + "not spam" marks) are the fixes. See
  the life repo's `docs/secrets-registry.md` "Known limits" for the pattern used.

Decision needed: which option (1/2/3), and the exact `cafe@` address. Then the
agent build proceeds against Supabase (events/site changes) + the chosen mailbox.

## Open / deferred (lower priority)

- Hero "Link to Event" announcements fall back to `#events` (no per-event page; a modal deep-link is deferred, ties into events work).
- No in-app change-password screen for logged-in admins (Suraya keeps her temp password).
- Leaked-password protection is a Supabase Pro feature; left off on the free plan.
- Dashboard "Total Events"/"Upcoming" still SSR via anon (fine — events are public).
