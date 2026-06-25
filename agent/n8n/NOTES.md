# n8n Workflow Import Notes

## Credentials to Create in n8n

Before importing, create these three credentials in n8n (Settings -> Credentials):

| Credential name (exact) | n8n type | Secret / permission needed |
|---|---|---|
| `cafe agent webhook token` | HTTP Header Auth (or Generic Credential) | A self-generated shared secret token; store in 1Password (vault Private). Set header name `X-Webhook-Token`, value = the token. The Worker secret `WEBHOOK_TOKEN` must match. |
| `OpenRouter - cafe email agent` | HTTP Header Auth | OpenRouter API key from the OpenRouter dashboard. Header name: `Authorization`, value: `Bearer <key>`. ZDR (zero data retention) must be enabled on the OpenRouter account. |
| `Supabase service role - cafe` | HTTP Header Auth | Supabase service-role key for project `scctrpnoisvehdnspoej`. Header name: `apikey`, value: `<service-role-key>`. Also used as the Bearer token. The `Authorization` and `apikey` headers in HTTP Request nodes both reference `$credential.password` - this assumes the credential stores the raw key as the "password" field in an HTTP Header Auth credential. |
| `Resend API key - cafe` | HTTP Header Auth | Resend API key. Header name: `Authorization`, value: `Bearer <key>`. Sending domain must be verified first (Task 3). |

Note: all four credential IDs in the JSON are placeholder strings (`PLACEHOLDER_*`). n8n will prompt to re-link credentials on import - this is expected.

---

## Architectural Assumptions and Uncertainties

### Auth: Check Token node
The `Auth: Check Token` IF node uses `$credential.token` to read the stored token value. This expression depends on the credential type selected. For a "Generic Credential Type" with a field named `token`, the expression is `{{ $credential.token }}`. For an "HTTP Header Auth" credential the stored value is `password`. Verify this expression on import and adjust to match the credential type chosen.

**Recommended approach**: use n8n's built-in webhook authentication (Header Auth option on the Webhook node itself) instead of the manual IF node. The Webhook node supports `Header Auth` natively since n8n v1.x. If you switch to that, remove the `Auth: Check Token` and `Auth: Reject Unauthorized` nodes and set `authentication: "headerAuth"` directly on the Webhook node with the credential.

### Webhook "respond immediately then continue" pattern
The workflow uses a `Respond to Webhook` node immediately after the auth check to return HTTP 200 to the Worker before the rest of the flow runs. n8n supports this via `responseMode: "responseNode"` on the Webhook node, which is set. The `Respond 200 Immediately` node is wired as the first output of the Webhook AND in parallel with the auth check. Verify the connection order is correct in the UI - in n8n, a node can only connect to one downstream per output index. The current JSON connects both `Respond 200 Immediately` and `Auth: Check Token` from `Webhook`'s `main[0]` output array, which means they run in parallel. This should work but verify in the UI.

### Supabase credential dual-use
The Supabase HTTP Request nodes set both `apikey` and `Authorization: Bearer` headers from `$credential.password`. This requires a single HTTP Header Auth credential storing the service-role key as the password. n8n does not natively support multiple headers from one credential - the `apikey` header expression `={{ $credential.password }}` and the Authorization header `=Bearer {{ $credential.password }}` both reference the same credential field. This works only if the same credential provides both. Verify this resolves correctly; if not, use two separate HTTP Header Auth credentials (one for `apikey`, one for `Authorization`), or use Supabase-native n8n credentials if that node type is available.

### DB: Lookup Pending Row - response shape
The Supabase REST API returns an array for GET requests. The `Pending Row Found?` IF node checks `$json.length > 0`. However, n8n HTTP Request nodes may return the array as the item body directly or as a nested structure. Verify that `$json.length` resolves to the array length after the HTTP Request. If not, use `$json[0]` checks or a Code node to normalize.

### Error path wiring
The two error nodes (`Resend: Error Reply to Sender` and `Resend: Error Notify Ibrahim`) are defined but NOT connected to any upstream node. n8n does not support inline "catch all errors" connections - error handling must be done via:
1. Setting this workflow as an error workflow for itself (circular, not recommended).
2. Creating a separate n8n workflow with an Error Trigger node and pointing `settings.errorWorkflow` to its ID.
3. Adding try/catch inside Code nodes and connecting explicit error paths from each risky node.

**Action required**: after import, set up a separate "Cafe Agent Error Handler" workflow with an Error Trigger, wire `Resend: Error Reply to Sender` and `Resend: Error Notify Ibrahim` there, and set `errorWorkflow` in this workflow's settings to that workflow's ID. The error nodes in this file serve as a template for what that separate workflow should do.

### DB: Store Message-ID on Pending
The confirmation email's Resend response is expected to contain a `headers['message-id']` or `id` field for storing back in `agent_pending_actions.message_id`. Resend returns an `id` (UUID) in its response body; it does not return email headers. Update this node to use `$json.id` (Resend's email ID) rather than a message-id header. The column is informational only (fallback match), so a Resend UUID is sufficient.

### Slug generation in DB: Insert Event and DB: Insert Post
The slug is generated inline in the JSON body expression using JavaScript string methods. n8n expressions run in a sandboxed context that does not support `String.prototype.normalize('NFKD')` in all versions. If slugification fails, the insert will error. The `Gen: RefCode + Slug` Code node generates the slug correctly and stores it in `$json.slug` - use that instead of regenerating in the insert body. Update `DB: Insert Event` and `DB: Insert Post` to reference `$('Gen: RefCode + Slug').first().json.slug` (or pass it through the data chain).

### crypto.getRandomValues in n8n Code nodes
The `Gen: RefCode + Slug` node uses `crypto.getRandomValues(new Uint32Array(1))`. This is available in n8n's Node.js runtime (v18+). If it errors, fall back to `Math.random().toString(36).slice(2, 8)`.

### Branch: Intent - Switch node output order
The Switch node outputs are: index 0 = `create_event`, index 1 = `create_blog_post`, index 2 = fallback (out_of_scope). Verify the output ordering in the n8n UI matches the connections defined. If the fallback output for out-of-scope goes to the wrong branch, the OOS path will not trigger.

### Branch: Reply Decision - Switch node output order
Output order: index 0 = `confirm`, index 1 = fallback (correction), index 2 = `cancel`. Verify in the UI.

### "no date" path keeps email pending but no pending row is stored yet
When an event has no date, the workflow replies asking for it and stops without storing a pending row. This means when the sender replies with a date, the email has no `[#refCode]` tag and will re-enter the new-request path, re-classify, re-extract (now hopefully with the date from the reply), and then store a pending row. This is acceptable behavior but worth documenting for ops awareness.

### Source language assumption
All prompts assume source text is German (`source_lang: "de"` stored in DB). If Ibrahim writes in English, the LLM will still translate from German - quality may suffer. The plan says Ibrahim's reply language is English but does not specify his source language for content creation. This is a known gap; acceptable for v1.

### Correction path re-extract
The `LLM: Re-extract with Correction` node sends the original draft payload and the correction text to the LLM and asks it to apply the correction. This relies on the LLM understanding the diff. It does NOT send the original email body. If the correction is ambiguous, the LLM may produce a poor result. Flag for testing.

### `$input` vs `$json` in Code nodes
Some Code nodes use `$input.first().json` while others reference named nodes via `$('Node Name').first().json`. This mixed pattern is intentional: nodes that receive data from a previous node use `$input`, while nodes that need data from a non-adjacent upstream node use named references. Verify all named references resolve correctly on import.

---

## Model IDs (tunable)

| Use | Model ID | Notes |
|---|---|---|
| Classify intent, classify reply | `mistralai/mistral-small-latest` | Cheap, fast. Swap to `mistral-medium` if quality is insufficient. |
| Extract event, extract post (includes Arabic translation) | `mistralai/mistral-large-latest` | Higher quality Arabic. Swap to `mistral-medium` if cost is a concern. |

Both are BDS-conscious (Mistral is EU-based, not Google/Amazon/Azure-origin). ZDR is enforced via `"provider": {"data_collection": "deny"}` in each request body.

---

## What to verify on first import

1. Credentials all re-linked (4 credentials, names must match exactly).
2. Webhook URL copied into Worker secret `N8N_WEBHOOK_URL`.
3. Webhook node `responseMode` is `responseNode` - confirm in node settings.
4. Switch node output indexes match the documented order (check UI).
5. Run a test execution with a mock JSON payload via n8n's "Test Workflow" to verify the auth check, lang/refcode extraction, and classify path before connecting the live Worker.
6. Set up the separate error-handler workflow and set its ID in `settings.errorWorkflow`.
7. Activate the workflow only after all credentials are linked and a test pass is clean.
