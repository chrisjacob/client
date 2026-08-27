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
