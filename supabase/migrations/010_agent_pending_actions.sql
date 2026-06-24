-- 010_agent_pending_actions.sql
-- Holds drafts the email agent has proposed but not yet written live.
create table if not exists public.agent_pending_actions (
  id           uuid primary key default gen_random_uuid(),
  ref_code     text not null unique,                 -- short tag echoed in the email subject
  type         text not null check (type in ('event','post')),
  sender_email text not null,
  source_lang  text,
  reply_lang   text,
  message_id   text,                                  -- agent's outgoing reply Message-ID (fallback match)
  payload      jsonb not null,                        -- drafted, translated content
  status       text not null default 'pending'
                 check (status in ('pending','published','cancelled','superseded')),
  result_slug  text,                                  -- filled on publish
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists agent_pending_actions_ref_code_idx
  on public.agent_pending_actions (ref_code);
create index if not exists agent_pending_actions_status_idx
  on public.agent_pending_actions (status);

alter table public.agent_pending_actions enable row level security;

-- Admin-only; service-role (used by the agent) bypasses RLS entirely.
create policy "admins manage agent_pending_actions"
  on public.agent_pending_actions
  for all using (public.is_admin()) with check (public.is_admin());
