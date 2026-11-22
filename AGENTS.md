<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

## Serviyo architecture
- Data access goes through the browser client with RLS; privileged admin actions (deleting auth users) live in `src/lib/*.functions.ts` server functions that check `has_role` first — files under `src/server/` are blocked from client imports.
- Phone numbers live in `profile_private` and are exposed to the other party only via the `get_contacts` RPC after a bid is accepted — keeps contacts hidden during bidding.
- Bid acceptance and job completion go through `accept_bid` / `complete_request` security-definer RPCs so status changes stay consistent.
- Voice notes are stored in the private `media` bucket (`<user_id>/...`) and played through signed URLs.
- UI text goes through `useT()` from `src/lib/i18n.tsx` (one row per key, columns in LANGS order); add every new string there — keeps all languages and RTL working.
- Provider services are many-to-many in `provider_services`; RLS uses `is_my_service()`. `profiles.category_id` is legacy (first service), so embeds from profiles to service_categories must name the FK explicitly or PostgREST rejects them as ambiguous.

- Shared query options prime authenticated pages and prefetch adjacent requests; reuse cache rather than serially reloading identical identity/category data.
- UAE mobile and gender schemas are shared by forms and mirrored by database validation; gender stays in private profile details.
- Profile photos are center-cropped and compressed in the browser before upload to owner-scoped private storage, then shown through cached signed URLs.
- Voice recording owns its stream lifecycle and waits for permissions while tracking held input; select a supported MIME type and matching upload extension.
- Leaf pages use the shared metadata helper to keep unique page titles and social descriptions consistent.
