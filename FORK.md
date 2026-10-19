# 10X Social Farcaster client fork

This repository is a deliberately thin fork of
[`farcasterxyz/client`](https://github.com/farcasterxyz/client). Product
differences should stay behind `apps/farcaster-web/src/fork/config.ts` and a
small number of adapter components.

## Product decisions

- Web first; iOS and Android are out of scope.
- External wallets only. The site never creates, imports, stores, or recovers
  private keys or seed phrases.
- EVM/Base uses wagmi browser connectors, Coinbase Wallet, and optional
  WalletConnect. Solana uses an injected browser wallet.
- Existing Farcaster wallet users are sent to Farcaster's official export
  origin and import into their chosen wallet outside this application.
- Upstream updates arrive as tested pull requests and require human approval.
- Branding and feature visibility belong in the fork configuration layer, not
  scattered patches.

## Fork feature flags

Build-time flags owned by 10X live in
`apps/farcaster-web/src/fork/featureFlags.ts`. Fork-only behavior should be
implemented under `src/fork` and connected to upstream UI through the smallest
possible adapter call. This keeps customization touchpoints easy to identify
and reapply when Farcaster publishes a replacement source snapshot.

| Flag                                  | Default | Purpose                                                        |
| ------------------------------------- | ------- | -------------------------------------------------------------- |
| `VITE_10X_FEATURES`                   | `true`  | Master switch for all optional 10X product features.           |
| `VITE_10X_FEATURE_ANIMATED_AVATARS`   | `true`  | Allow animated GIF profile images on every web avatar surface. |
| `VITE_10X_FEATURE_KLIPY_MEDIA_PICKER` | `true`  | Add KLIPY GIF, sticker, clip, meme, and AI emoji search.       |

Flags are public build settings and take effect on the next build/deployment.
An individual feature is active only when both `VITE_10X_FEATURES` and its own
flag are enabled. Set the master flag to `false` for a global rollback, or an
individual flag to `false` for a targeted rollback.

The master switch deliberately excludes essential fork plumbing such as API
routing, authentication compatibility, wallet safety policy, and deployment
configuration. Search for imports from `~/fork/` or `forkFeatureFlags` to find
the optional feature integration points in upstream UI code.

## White-label identity

`VITE_10X_FEATURE_WHITELABEL=false` is an independent build-time identity
switch. It is deliberately unaffected by `VITE_10X_FEATURES` so a product-feature
rollback cannot accidentally publish upstream branding. Editable names, the
reviewed string catalogue, full legal/support/landing pages, and copied image/
video resources live under `apps/farcaster-web/whitelabel/`.

Start with [`whitelabel/README.md`](apps/farcaster-web/whitelabel/README.md).
The starter values reproduce current upstream content; customize them before
enabling the switch. Run `pnpm --dir apps/farcaster-web branding:check` after
upstream merges. The architectural analysis and implementation plan are in
[`docs/WHITELABEL_PLAN.md`](docs/WHITELABEL_PLAN.md).

## Local development

```bash
pnpm install
pnpm --filter farcaster-analytics --filter farcaster-client-data --filter farcaster-cryptography --filter farcaster-cryptography-web --filter farcaster-client-hooks build
pnpm --dir apps/farcaster-web start
```

Copy `apps/farcaster-web/.env.example` to `.env.local` only when you need to
override public build settings. Never put a confidential server credential in a
`VITE_` variable: Vite embeds those values in the browser bundle.

The KLIPY picker intentionally calls KLIPY from the end-user's browser and
stores the returned media URL directly as the Farcaster embed. It does not use a
10X proxy or re-upload the media. Configure `VITE_KLIPY_API_KEY` as a public,
browser-scoped application credential. For compatibility with the existing
ignored setup, Vite also reads `KLIPY_API_KEY` from `.dev.vars.local` in
development and `.dev.vars.production` in production; either value is embedded
in the resulting JavaScript and is not secret.

Keep the production feature flag disabled until KLIPY confirms this use in
writing. The architecture, outstanding questions, and launch checklist are in
[`docs/KLIPY_PRODUCTION_REVIEW.md`](docs/KLIPY_PRODUCTION_REVIEW.md).
Vite defaults this feature on in development and off in production unless
`VITE_10X_FEATURE_KLIPY_MEDIA_PICKER` is explicitly supplied for that build.

## Update model

See `docs/UPSTREAMS.md`. Farcaster is merged as an upstream Git history.
Quorum Mobile is GPL-3.0 and React Native; its wallet paths are watched as a
design/functionality feed. Porting any GPL implementation must happen in a
clearly attributed GPL-compatible change. The current external-wallet adapter
does not copy Quorum code.
