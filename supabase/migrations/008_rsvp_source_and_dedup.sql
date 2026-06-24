-- Migration 008: RSVP source tracking + dedup
-- Applied to production 2026-06-24 via the Supabase MCP.
--
-- - source: distinguish public website sign-ups from manual/pasted entries.
-- - email nullable: manual entries (phone/Instagram RSVPs) can be name-only.
-- - unique (event_id, lower(email)) where email is not null: one website RSVP
--   per email per event (manual name-only entries are not constrained).

alter table public.rsvps add column if not exists source text not null default 'website';
alter table public.rsvps alter column email drop not null;

create unique index if not exists rsvps_event_email_key
  on public.rsvps (event_id, lower(email))
  where email is not null;
