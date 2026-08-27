# Third-party notices

## Farcaster client

This project is derived from the Farcaster client maintained by Neynar, Inc.
The upstream project is licensed under the MIT License. See `LICENSE` and
<https://github.com/farcasterxyz/client>.

## Quorum Mobile

Quorum Mobile by Quilibrium Network is monitored as a wallet functionality and
UX reference. It is licensed under GPL-3.0 at
<https://github.com/quilibriumnetwork/quorum-mobile>.

No Quorum Mobile source code is included in the current external-wallet
implementation. If GPL-derived source is added later, its files, upstream
commit, and applicable license notices must be listed here.

## WalletConnect adapter

The small connector in `apps/farcaster-web/src/fork/walletConnectConnector.ts`
follows the public connector contract from wagmi, which is MIT-licensed. It is
kept local only to avoid an incompatible optional Coinbase dependency pulled by
the upstream connector barrel.
