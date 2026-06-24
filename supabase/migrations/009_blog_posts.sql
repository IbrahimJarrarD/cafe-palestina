-- Migration 009: Blog posts
-- Applied to production 2026-06-24 via the Supabase MCP.
--
-- In-house blog mirroring the events CMS: multilingual rich-text posts with a
-- draft/publish workflow. Public can read published posts only; admins manage
-- all (incl. drafts) via is_admin(). Mirrors the events RLS pattern (migration
-- 005) and the explicit grants from the newsletter table (migration 006).
-- Cover images reuse the existing public 'event-images' storage bucket, so no
-- new storage policies are needed.

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,

  -- Multilingual content
  title_de text not null,
  title_en text not null,
  title_ar text not null,
  excerpt_de text,
  excerpt_en text,
  excerpt_ar text,
  body_de text not null default '',
  body_en text not null default '',
  body_ar text not null default '',

  -- Media + workflow
  cover_image_url text,
  status text not null default 'draft' check (status in ('draft', 'published')),
  published_at timestamptz,

  -- Timestamps
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_posts_status on public.posts (status);
create index if not exists idx_posts_published_at on public.posts (published_at desc);

-- Keep updated_at fresh (reuses the function from migration 001)
drop trigger if exists posts_updated_at on public.posts;
create trigger posts_updated_at
  before update on public.posts
  for each row
  execute function update_updated_at();

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

alter table public.posts enable row level security;

grant select on public.posts to anon, authenticated;
grant insert, update, delete on public.posts to authenticated;
grant all on public.posts to service_role;

-- Public can read published posts only
drop policy if exists "Public can view published posts" on public.posts;
create policy "Public can view published posts"
  on public.posts for select
  using (status = 'published');

-- Admins manage all posts (incl. drafts). FOR ALL also grants admins SELECT on
-- drafts and serves as the WITH CHECK for inserts/updates.
drop policy if exists "Admins can manage posts" on public.posts;
create policy "Admins can manage posts"
  on public.posts for all
  using (is_admin());

comment on table public.posts is 'Blog posts for Cafe Palestine Colonia - admin can add/edit/delete';
