# Upstream maintenance

The fork treats upstream code as two different streams because they have
different licenses, platforms, and merge characteristics.

## Farcaster client (MIT)

`upstream` points to `farcasterxyz/client`; `origin` points to
`chrisjacob/client`. The scheduled `Farcaster upstream sync` workflow fetches
new upstream commits, merges them into an automation branch, runs CI, and opens
a pull request. It never auto-merges to `main`.

Conflicts are expected to stay concentrated in the fork config, wallet adapter,
Wallet page, and deployment files. A conflict opens an issue instead of forcing
a merge.

## Quorum Mobile wallet (GPL-3.0)

Quorum is a React Native self-custody wallet that handles mnemonic/private-key
material. The 10X web fork intentionally uses external signers, so blindly
merging its source would be both technically unsafe and inconsistent with the
custody model.

The `Quorum wallet watch` workflow checks only the paths in `upstreams.json`.
When they change, it opens a commit-specific review issue with the diff link.
That issue is the intake queue for adapting useful UX or protocol behavior.

If a future change copies or adapts Quorum GPL source, it must:

1. identify the copied files and upstream commit;
2. retain copyright and GPL notices;
3. publish corresponding source under GPL-3.0-compatible terms; and
4. receive security review before release.

## Review policy

White-label builds have a separate branding drift gate. After any upstream
refresh, run `pnpm --dir apps/farcaster-web branding:check` and review new names,
changed source strings, and hashes for overridden source files/assets before
enabling the branded build. Follow
[`whitelabel/README.md`](../apps/farcaster-web/whitelabel/README.md); never
regenerate the catalogue or replace the owner's resource copies automatically.

- Dependency, wallet, authentication, signing, API-origin, and deployment
  changes always require a human reviewer.
- CI must pass before merge.
- The production Cloudflare domain is never changed by an upstream workflow.
- Secrets belong in Cloudflare/GitHub secret stores, never the repository.
