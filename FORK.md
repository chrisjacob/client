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

| Flag                                | Default | Purpose                                                        |
| ----------------------------------- | ------- | -------------------------------------------------------------- |
| `VITE_10X_FEATURES`                 | `true`  | Master switch for all optional 10X product features.           |
| `VITE_10X_FEATURE_ANIMATED_AVATARS` | `true`  | Allow animated GIF profile images on every web avatar surface. |

Flags are public build settings and take effect on the next build/deployment.
An individual feature is active only when both `VITE_10X_FEATURES` and its own
flag are enabled. Set the master flag to `false` for a global rollback, or an
individual flag to `false` for a targeted rollback.

The master switch deliberately excludes essential fork plumbing such as API
routing, authentication compatibility, wallet safety policy, and deployment
configuration. Search for imports from `~/fork/` or `forkFeatureFlags` to find
the optional feature integration points in upstream UI code.

## Local development

```bash
pnpm install
pnpm --filter farcaster-analytics --filter farcaster-client-data --filter farcaster-cryptography --filter farcaster-cryptography-web --filter farcaster-client-hooks build
pnpm --dir apps/farcaster-web start
```

Copy `apps/farcaster-web/.env.example` to `.env.local` only when you need to
override public build settings. Never put server credentials in a `VITE_`
variable: Vite embeds those values in the browser bundle.

## Update model

See `docs/UPSTREAMS.md`. Farcaster is merged as an upstream Git history.
Quorum Mobile is GPL-3.0 and React Native; its wallet paths are watched as a
design/functionality feed. Porting any GPL implementation must happen in a
clearly attributed GPL-compatible change. The current external-wallet adapter
does not copy Quorum code.
