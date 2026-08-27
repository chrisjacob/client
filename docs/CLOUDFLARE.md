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

## Domain cutover

After the preview is approved, open the Pages project in Cloudflare and add
`10x.social` under **Custom domains**. Because it is the apex domain, it must be
an active zone in the same Cloudflare account. Cloudflare will create/update
the required DNS record and certificate after confirmation.

Attaching `10x.social` replaces the old site's traffic. Preserve or export the
old deployment first if rollback matters. Domain cutover is intentionally a
manual action and is not performed by CI or an upstream-sync workflow.
