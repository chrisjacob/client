# Web client white-label analysis and implementation plan

Prepared 20 October 2026 (Australia/Sydney).

## Objective and scope

Give this fork one explicit build-time switch and an editable brand directory
containing strings, resources, and complete legal-page replacements. Start with
the current content so the owner can see exactly what to replace. Follow the
existing `FORK.md` decision: web first; native iOS/Android and the separate SSR
application are not deployed by this fork and are outside this implementation.

## Findings

The existing `forkConfig.brandName` affects only a few surfaces. Most product
names are literals throughout pages/components, including template-literal
segments used for dynamic titles and notifications. `index.html`,
`public/manifest.json`, PageMeta, WalletConnect metadata, notification favicons,
Open Graph images, downloadable brand files, and inline Logo/FilledLogo SVGs
are separate surfaces. TermsOfUsePage and PrivacyPolicyPage are complete React
documents with their own titles, company references, email links, dates, and
substantive clauses. Branding therefore needs more than a single React context
or search-and-replace pass.

The same names also identify things that belong to someone else: the protocol,
official mobile app, upstream wallet/export service, Neynar scores, paid Pro
subscriptions, rewards, developer specifications, endpoints, signed manifests,
analytics, identifiers, storage keys, and user content. Changing these to 10X
would create inaccurate claims or break integrations. User-generated casts,
profiles, server messages, and third-party mini apps must not be rewritten.

The repository already contains unrelated uncommitted KLIPY/media work. Preserve
that work and integrate additively with its Vite configuration and feature flags.

## Ownership and anticipated upstream changes

The user's supplied naming restriction is the working product constraint:
use an independent app identity while retaining protocol compatibility.
[Contemporaneous reporting](https://coinmarketcap.com/academy/article/network-school-acquires-farcaster-neynar)
corroborates an October 2026 handover and restrictions on commercial branding.
The exact quoted original post was not independently retrieved. Reports differ
on the resulting product identity; do not encode a predicted rename or date.
The [upstream repository](https://github.com/farcasterxyz/client) is a snapshot
monorepo. Local LICENSE and THIRD_PARTY_NOTICES remain authoritative files to
retain in this checkout; app branding is separate from those notices.

Expect renamed files/exports, new logos, changed legal text, changed URLs, and
new branding literals. A successful Git merge is insufficient evidence that a
white-label build remains correct. An automated inventory must surface new,
removed, or changed literals and upstream changes to whole-file/asset overrides.
Never automatically refresh baselines or overwrite the owner's edits.

## Chosen architecture

1. Add `VITE_10X_FEATURE_WHITELABEL`, default false. Keep it independent of the
   optional-feature master switch: disabling GIFs must not silently publish an
   unrelated company's identity. When false, leave current fork behavior intact.
2. Keep all editable inputs under `apps/farcaster-web/whitelabel/`: brand values,
   an exact-source string catalogue, a resource mapping, public files, and full
   source replacements. Seed resources from this checkout.
3. Use a build-time syntax-aware adapter. Replace only explicitly catalogued
   JSX text, string literals, and static template segments in named files.
   Preserve dynamic expressions. Track deliberate exclusions with reasons.
   This avoids invasive edits across hundreds of upstream components and avoids
   rewriting DOM text, network responses, source identifiers, or arbitrary URLs.
4. Allow named placeholders in catalogue replacements (app name, company,
   entity, contact, website). Match by file + syntax kind + original content,
   not line number, so ordinary line movement does not invalidate customization.
   Escape replacements as literals, never evaluate owner-supplied strings as code.
5. Replace entire source files through a constrained resource manifest for legal
   pages and central logo components. Preserve their export contracts. Allow
   edits/replacement of large sections directly in those independent files.
   Legal copies may use explicit placeholders while keeping current defaults.
6. Serve public replacements at their existing URL paths in development and
   overlay them in production output. Let the mapping point to an independently
   named file such as `resources/public/brand-logo.png`. Never mutate upstream
   public assets. Use the same configuration for initial HTML, manifest, runtime
   metadata, and wallet metadata.
7. Record upstream hashes for resource overrides and reviewable string
   baselines. Add an audit command and CI gate; changed upstream content fails
   with actionable diagnostics. Keep white-label inputs outside the default
   public directory so disabled builds do not publish the alternate resource set.

## Alternatives considered

| Approach | Assessment |
| --- | --- |
| Global source/bundle replacement | Reject: alters protocols, keys, URLs, signatures, and third-party claims. |
| MutationObserver / DOM text replacement | Reject: flashes old branding, misses metadata/exports, rewrites user content, conflicts with React. |
| Runtime i18n calls in every component | Good for future full localization; unnecessary dependencies and broad upstream patch surface for this branding task. |
| Aliasing every branded upstream module | Good for full pages; excessive duplication for short copy changes. |
| Exact reviewed syntax catalogue plus resource overrides | Selected: small upstream boundary, readable owner inputs, explicit drift detection. |

## Implementation sequence

1. Build the syntax inventory, configuration loader, replacement engine, and
   resource validation. Review app/protocol/external-service classifications.
2. Seed editable originals, wire the Vite adapter and metadata integration,
   and expose the independent feature flag in fork configuration.
3. Add audit, drift checks, CI integration, and owner instructions with a 10X
   example. Leave the feature off until the owner replaces the starter content.
4. Verify disabled/enabled behavior, escaping, template interpolation, legal
   replacements, assets, manifest/HTML, drift errors, type checking, and build.

## Review and release boundaries

This is client presentation customization, not backend independence. Existing
Farcaster API, authentication, moderation, rewards, and paid products remain
external dependencies and may change during the ownership transition. Review
upstream integration changes separately. Do not relabel an upstream subscription
or reward as one supplied by 10X. Keep the official wallet-export origin.

Copied legal documents are editing starters, not a claim that changing names
makes their data-processing, jurisdiction, arbitration, mobile permissions,
payments, or service descriptions correct for this web fork. Full replacement
is intentionally supported. Review outbound community/support and app-store
links together with the legal copy before enabling the independent identity.

No deployment, upstream merge, or external communication is part of this work.

## Acceptance criteria

- With the switch off, the new layer does not change existing app branding.
- With it on, editing the brand config, catalogue, legal copies, and resource
  mappings affects the web build and local development consistently.
- Special characters and interpolation remain plain data; dynamic user text is
  preserved; protocol/service exclusions remain unchanged.
- Missing resources, invalid mappings, stale source strings, and upstream
  replacement drift are reported before a release can silently leak branding.
- Owner edits are never overwritten by an audit or an upstream merge.
- Instructions identify editable files, activation, validation, rollback,
  remaining external identities, and the upstream update procedure.

## Implemented result and validation

The implementation uses the selected syntax catalogue and Vite resource adapter.
The starter directory contains 520 tracked references (101 app, 50 legal, and
369 deliberately preserved), 15 public resource mappings, and seven complete
source replacements. Central logos and the landing wordmark can point directly
to editable SVG/PNG resources. Terms and Privacy remain full editable documents;
support, deletion instructions, landing artwork, and video are also available.

The identity flag defaults off and is independent of the optional-feature
master. Initial HTML, PWA manifest, runtime metadata, wallet metadata, canonical
page URLs, and sitemap host configuration share the brand settings. Metadata URL
rebasing is limited to canonical pages on the exact original client origins;
API, export, authentication, signing, and third-party destinations are untouched.
CI checks the catalogue, type-checks replacement pages, runs focused tests, and
builds the enabled variant in addition to the existing web checks.

Validation completed locally:

- Production build with white-labeling disabled: passed; no alternate logo
  resource was published.
- Production build with temporary 10X names and the optional-feature master
  disabled: passed. Generated HTML, manifest, Home feed title, Terms, Privacy,
  and public overlays were checked; starter configuration was restored.
- Existing web suite: 206 tests passed. Dedicated branding engine suite: 12
  tests passed. Canonical metadata adapter: 10 tests passed.
- Application and replacement-page type checks passed. Targeted lint checks
  cover the runtime adapters, replacement modules, and build/test scripts.
- Builds retain the existing warnings about a missing italic font, vendor
  annotations, and large chunks. Performance/dependency cleanup is separate.

No deployment was performed. The feature remains off; the owner can start with
`apps/farcaster-web/whitelabel/README.md`, edit the seeded inputs, and enable the
flag when those changes are ready. The native/SSR and remote-content boundaries
above remain applicable.
