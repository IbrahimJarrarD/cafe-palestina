-- Migration 006: Newsletter subscribers
-- Applied to production 2026-06-24 via the Supabase MCP.
--
-- Public can insert with a valid email + explicit consent (GDPR single opt-in);
-- only admins can read/manage. Mirrors the rsvps RLS pattern from migration 005.

create table if not exists public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  lang text,
  consented boolean not null default false,
  source text not null default 'website',
  created_at timestamptz not null default now(),
  unsubscribed_at timestamptz
);

create unique index if not exists newsletter_subscribers_email_key
  on public.newsletter_subscribers (lower(email));

alter table public.newsletter_subscribers enable row level security;

grant insert on public.newsletter_subscribers to anon, authenticated;
grant select, update, delete on public.newsletter_subscribers to authenticated;
grant all on public.newsletter_subscribers to service_role;

drop policy if exists "Public can subscribe" on public.newsletter_subscribers;
create policy "Public can subscribe"
  on public.newsletter_subscribers for insert
  with check (
    email is not null
    and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
    and consented = true
  );

drop policy if exists "Admins can view subscribers" on public.newsletter_subscribers;
create policy "Admins can view subscribers"
  on public.newsletter_subscribers for select
  using (is_admin());

drop policy if exists "Admins can manage subscribers" on public.newsletter_subscribers;
create policy "Admins can manage subscribers"
  on public.newsletter_subscribers for all
  using (is_admin());
