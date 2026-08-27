# Cloudflare Pages deployment

The web client is a static Vite application. It needs no server-side wallet
backend and stores no keys. The committed Pages configuration is
`apps/farcaster-web/wrangler.jsonc`.

## Build settings for Git integration

- Repository: `chrisjacob/client`
- Production branch: `main`
- Root directory: `/`
- Build command:
  `pnpm --filter farcaster-analytics --filter farcaster-client-data --filter farcaster-cryptography --filter farcaster-cryptography-web --filter farcaster-client-hooks build && pnpm --dir apps/farcaster-web build`
- Build output directory: `apps/farcaster-web/dist`
- Node version: use `.node-version`
- pnpm version: `10.8.1`

Set these public build variables in Pages (Production and Preview as needed):

```text
VITE_BRAND_NAME=10X Social
VITE_CANONICAL_URL=https://10x.social
VITE_WALLETCONNECT_PROJECT_ID=<public Reown project id>
```

`VITE_` values are shipped to every browser and are never secret. This static
client currently requires no Cloudflare secret, KV, D1, R2, or service binding.

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
