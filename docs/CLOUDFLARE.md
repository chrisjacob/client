# Cloudflare Pages deployment

The web client is a Vite application with one stateless Pages Function. It
needs no server-side wallet backend, stores no keys, and has no private
configuration. The function relays the browser's Farcaster API calls to the
fixed `https://farcaster.xyz/~api` origin because Farcaster's CORS allowlist
permits localhost development but not arbitrary production domains. The
committed Pages configuration is `apps/farcaster-web/wrangler.jsonc`.

## Build settings for Git integration

- Repository: `chrisjacob/client`
- Production branch: `main`
- Root directory: `/apps/farcaster-web`
- Build command:
  `pnpm --filter farcaster-analytics --filter farcaster-client-data --filter farcaster-cryptography --filter farcaster-cryptography-web --filter farcaster-client-hooks build && pnpm build`
- Build output directory: `dist`
- Node version: use `.node-version`
- pnpm version: `10.8.1`

Set these public build variables in Pages (Production and Preview as needed):

```text
VITE_BRAND_NAME=10X Social
VITE_CANONICAL_URL=https://10x.social
VITE_WALLETCONNECT_PROJECT_ID=<public Reown project id>
# Optional only after Farcaster allowlists the production origin:
# VITE_FARCASTER_API_BASE_URL=https://farcaster.xyz/~api
```

`VITE_` values are shipped to every browser and are never secret. This client
requires no Cloudflare secret, KV, D1, R2, or service binding. Do not add API
tokens to the relay: it forwards the user's existing Farcaster authorization
header without logging or persisting it. The upstream host is hard-coded, and
cookies plus forwarding metadata are stripped so the endpoint is not a general
open proxy.

## Direct preview deploy

From `apps/farcaster-web`:

```bash
pnpm deploy:preview
```

Use the resulting `*.pages.dev` preview for wallet and login testing before
attaching the production domain.

## Web Analytics decision

The owner chose to retain Cloudflare Web Analytics on 21 October 2026. Preserve
the existing integration; do not add a duplicate beacon to the application.
The white-label release checker permits this integration. The inherited
PostHog integration remains disabled in revised white-label builds.

Collection findings, policy wording, and remaining account/traffic checks are in
`docs/10X_SOCIAL_CLOUDFLARE_ANALYTICS_HANDOFF.txt`. Local build HTML alone cannot
prove what Cloudflare injects into served pages. Verify the retained beacon and
SPA requests after an authorized deployment. This decision does not authorize
a deployment or change hosting/security log retention.

## Stable local tunnel

The named `social-local` Cloudflare Tunnel exposes the development client at
`https://local.10x.social`. Once that hostname has a proxied CNAME to
`250b9663-a16a-430c-b883-1b4f97d0bfed.cfargotunnel.com`, start or attach the
local client with:

```bash
pnpm --dir apps/farcaster-web local:tunnel
```

The launcher starts Vite on `http://127.0.0.1:5173` with local TLS disabled,
because Cloudflare terminates HTTPS at the edge. If an HTTP server is already
responding on port 5173, the launcher reuses it. Stop any other `social-local`
tunnel replica first so Cloudflare does not balance requests across different
local origins. The launcher also selects the same-origin `/~api` relay, and
Vite proxies that fixed path to Farcaster while stripping cookies and
forwarding metadata. Tunnel credentials stay in the user's `.cloudflared`
directory and must never be committed.

The launcher now supervises both processes independently. It restarts Vite or
cloudflared after an unexpected exit, monitors an origin it initially reused,
and restarts an owned origin if three health checks fail after its startup grace
period. It uses bounded health checks and launches Vite directly, so there is no
Windows shell process hiding the server's exit. Current PIDs and per-process
logs are recorded in the ignored `tmp/local-tunnel/active.json`.

White-label README, backup and public asset saves do not restart Vite. Branding
configuration saves are debounced. An incomplete source/catalogue edit warns
in development rather than terminating the server; `branding:check` and
production builds still fail until it is reconciled. Recovery after a genuine
crash can take a few seconds while Vite starts; a stopped PC or stopped launcher
cannot serve this development URL.

## Domain cutover

After the preview is approved, open the Pages project in Cloudflare and add
`10x.social` under **Custom domains**. Because it is the apex domain, it must be
an active zone in the same Cloudflare account. Cloudflare will create/update
the required DNS record and certificate after confirmation.

Attaching `10x.social` replaces the old site's traffic. Preserve or export the
old deployment first if rollback matters. Domain cutover is intentionally a
manual action and is not performed by CI or an upstream-sync workflow.
