# Suraya Email Agent — Design Spec

Status: approved 2026-06-25. Author: Ibrahim (design with Claude).
Scope owner: cafe-palestina. Runs on Cloudflare + n8n + Supabase, not Vercel.

## Goal

A single email address that Suraya (and Alaa, and Ibrahim) can write to in plain
language to create events and blog posts on cafepalestinecolonia.de. The agent
parses the intent, drafts the content in all three site languages, confirms with
the sender, and on an "OK" reply writes the row to Supabase and replies with the
live link. Anything outside those two actions is forwarded to Ibrahim and Alaa.

The agent address is `dev@cafepalestinecolonia.de`.

## Scope

In scope (the entire agent, permanently):

- `create_event`
- `create_blog_post`

Explicitly out of scope, now and later (handled by forwarding, never by the agent):

- editing or deleting existing content
- changes to page_content, announcements, site_settings, categories, image_types
- anything ambiguous, suspicious, or not clearly one of the two verbs

There is deliberately no edit-live verb. Corrections happen before publish via the
confirm-before-write loop, so the agent never needs to mutate live content.

## Architecture

Three hops, plus an outbound provider:

```
sender ── email ──> Cloudflare Email Routing + Email Worker
                         │  (DMARC enforced, allowlist, setReject strangers)
                         │  POST JSON + shared secret
                         v
                    n8n workflow (the brain)
                         │  classify -> extract -> translate -> confirm -> write
                         │  OpenRouter for the LLM steps
                         v
                    Supabase (events, posts, agent_pending_actions)
                         │
                    Cloudflare Email Sending ── reply / notify ──> sender, and Ibrahim
```

### Inbound: Cloudflare Email Routing + Email Worker

The cafe domain is already on Cloudflare (zone active) with zero existing mail
records, so enabling Email Routing is non-destructive (no MX conflict).

1. Enable Email Routing on cafepalestinecolonia.de. This adds the MX record, the
   routing SPF include, and the routing DKIM selector.
2. Route `dev@` to an Email Worker (`cafe-mail-agent`).
3. Worker logic, in order:
   - Cloudflare already rejects SPF/DKIM/DMARC failures at receipt, before the
     worker runs, so the worker only ever sees DMARC-passed mail. As belt and
     suspenders the worker also reads `Authentication-Results` and requires a
     DMARC pass.
   - Check the `From` address against the allowlist (Suraya, Alaa, Ibrahim).
   - If the sender is not on the allowlist, call `message.setReject(...)` with a
     "no such user" style permanent SMTP error. This is a genuine SMTP-time
     rejection (not a fabricated bounce / backscatter), so the sender's system
     marks the address dead and prunes it from lists, with no risk to our domain
     reputation and without confirming the address is live to a spammer.
   - Parse the MIME (PostalMime): from, subject, text body, Message-ID,
     In-Reply-To, References.
   - POST that JSON to the n8n webhook with a shared-secret header
     (`X-Webhook-Token`).
   - The worker does not reply. All replies are async and come from n8n, because
     the conversation spans multiple emails and minutes.

### Brain: n8n workflow

Host is the existing n8n at n8n.deadthrone.dev. The workflow:

1. Webhook node validates the shared secret; reject otherwise.
2. Resolve sender -> reply language: Ibrahim = English, Suraya and Alaa = German.
3. Branch on whether this is a new request or a reply to a pending draft, matched
   by `In-Reply-To` / `References` against `agent_pending_actions`.

New request path:

- LLM (OpenRouter) classifies intent: `create_event` | `create_blog_post` |
  `out_of_scope`. Guardrails push anything edit/delete/ambiguous/suspicious to
  `out_of_scope`.
- `out_of_scope` -> forward the original email to Ibrahim and Alaa via Cloudflare Email Sending, and
  reply to the sender in their language ("I can only set up events and blog posts;
  I have passed this to Ibrahim and Alaa").
- `create_*` -> LLM extracts structured fields, then LLM translates the source
  (German) into de / en / ar so all three are filled.
- Store a draft row in `agent_pending_actions` (status `pending`).
- Reply to the sender in their language with the proposed content in all three
  languages: "Reply OK to publish, or send corrections."

Reply-to-pending path:

- Look up the pending draft by thread headers.
- LLM classifies the reply: `confirm` | `correction` | `cancel`.
- `confirm` -> write the live row:
  - event: insert into `events`; use `eventDateTimes(date, time)` logic for any
    date math; `event.time` is free-form text and must not be parsed naively.
  - post: insert into `posts` with `status = published`, `published_at = now()`,
    and a slug generated the same way the existing blog CMS does it.
  - Mark the pending row `published`; reply with the live link.
- `correction` -> re-extract / re-translate with the correction applied, update
  the pending payload, reply with the new draft to confirm again.
- `cancel` -> mark the pending row `cancelled`, acknowledge.

### Writes: Supabase

The agent uses the service-role key (bypasses RLS) stored as an n8n credential.
In practice it only ever inserts into `events` and `posts` and reads/writes
`agent_pending_actions`. The key is never hardcoded.

Before any code is written, the implementer verifies the exact column names of
`events` and `posts` and the live slug-generation logic against the database.

### Outbound: Cloudflare Email Sending

All replies and notifications go out via Cloudflare Email Sending (REST API
`POST /accounts/{account_id}/email/sending/send`), sending as
`dev@cafepalestinecolonia.de`. This keeps inbound and outbound on one vendor
(Cloudflare) and adds no third-party email SaaS, fitting the private/cheap priority.
It requires the Workers Paid plan (Email Sending is public beta, paid-plan only, ~$5/mo);
inbound Email Routing stays free. Cloudflare manages DKIM/SPF/DMARC via an onboarded
cf-bounce subdomain. n8n calls the REST API with a scoped Cloudflare API token
(`Email Sending: Edit`) stored as an n8n credential. Reply threading uses the
`[#refcode]` subject tag (client-agnostic), so the plain send endpoint suffices.

## New data: `agent_pending_actions`

Migration `010_agent_pending_actions.sql`, applied to prod via the Supabase MCP and
recorded as a file.

Columns:

- `id` uuid pk
- `type` text check in ('event','post')
- `sender_email` text
- `source_lang` text
- `message_id` text
- `thread_refs` text (the References / In-Reply-To chain used to match replies)
- `payload` jsonb (the drafted, translated content)
- `status` text check in ('pending','published','cancelled','superseded')
- `created_at`, `updated_at` timestamptz

RLS: admin-only (service-role bypasses). State lives in Supabase, not in n8n, so
it is covered by Supabase backups even though the n8n volume is not yet in Borg.

## Security and guardrails

Transport:

- DMARC pass enforced by Cloudflare before the worker.
- From allowlist in the worker; `setReject` for everyone else.
- Shared secret on the Worker -> n8n webhook.

Model:

- System prompt locks the agent to the two verbs only.
- The email body is treated as untrusted data, not instructions (prompt-injection
  defense): embedded instructions that try to change the agent's role, expand its
  permissions, or trigger edits/deletes must be ignored and classified
  `out_of_scope`.
- Nothing is written without an explicit OK reply (confirm-before-write).

Key hygiene:

- Service-role key used only for the three tables above; stored encrypted in n8n.

## Model selection (OpenRouter) — BDS + privacy criteria

Not Opus. Models are accessed via OpenRouter. Selection criteria, in priority
order for this project:

1. BDS-conscious vendor choice. Prefer providers not complicit in or targeted by
   the BDS movement. Concretely, steer away from Google / Gemini and Amazon-origin
   models (Project Nimbus), and treat Microsoft / Azure-tied OpenAI with caution.
   Route via OpenRouter providers that avoid those clouds where practical. (Note
   for transparency: Anthropic itself has Amazon and Google as major investors;
   since we are off Opus and on OpenRouter regardless, this is moot here but worth
   recording.)
2. Privacy. Prefer privacy-respecting providers; configure OpenRouter for zero
   data retention and no training on our data; exclude providers that log or train.
3. Capability and cost. The agent has no access to memories or chats, so cheaper
   capable models are fine. A two-model split is expected: a cheaper model for
   intent classification and field extraction, a stronger model for the Arabic
   translation (where quality matters most).

Current lean: Mistral (EU, privacy-forward, not BDS-targeted) for intent and
extraction, with an Arabic-quality check before locking the translation model. The
exact model IDs are chosen at build time after a short BDS + privacy + Arabic-
quality check, and recorded in the agent README.

## Reporting and errors

- Every action (created/published, forwarded, error) sends Ibrahim a notification
  email. This is the interim reporting channel until a centralized automation
  dashboard exists, at which point it is swapped out.
- On failure: reply to the sender ("something went wrong, Ibrahim has been
  notified") and send Ibrahim the error detail.

## Where it lives / ops

- A new `agent/` directory in the cafe-palestina repo holds: the Worker code, the
  n8n workflow JSON export, the SQL migration, env examples, and a README. Per the
  ownership seam, this cafe-domain workflow is versioned here, not in the life repo.
- Secrets: OpenRouter key, Cloudflare Email Sending key, Supabase service-role key, and the webhook
  shared secret are n8n credentials (encrypted by N8N_ENCRYPTION_KEY). The webhook
  URL and shared secret are Cloudflare Worker secrets. Nothing hardcoded; 1Password
  is the source of truth.
- n8n host changes (env vars, restart, new subdomain) are life-side and requested
  from the life planner, not edited here.
- Flag: the n8n DB/volume is not yet in Borg. Agent state lives in Supabase, so it
  is safe regardless, but folding n8n into Borg is recommended.

## Build / pipeline notes

- The migration applies to the same Supabase project (ref scctrpnoisvehdnspoej) and
  is recorded as file `010`. Any change to the Astro repo itself follows the
  staging -> PR -> main pipeline (conventional commits, no AI/Co-Authored-By
  trailer, no em dashes).
- Execution is delegated to Sonnet subagents (worker code, n8n workflow, migration,
  DNS/Email Routing setup, prompts); the planner reviews their evidence and does
  sensitive/irreversible operations directly.

## Open items resolved during design

- Q1 scope: events + blog posts only; everything else forwarded. (A then B
  incrementally, A+B is the full scope.)
- Q2 trilingual: confirm-before-write (drafts shown in all three languages, written
  only after OK).
- Q3 strangers: genuine SMTP `setReject`, not a fake bounce.
- Q4 sender bar: allowlist + DMARC, no shared secret word needed; model guardrails
  added.
- Q5 domain: no existing mail; use `dev@cafepalestinecolonia.de`.
- Q6 provider: Cloudflare Email Routing + Worker (reliable, secure, private, cheap,
  on infra Ibrahim controls).
- Q7 publish state: OK reply publishes live immediately.
- Model: OpenRouter, BDS + privacy conscious.
```