# Edit the web client's identity here

The feature is **off by default**. These files start with the current client's
names, legal text, images, and video so you can see what you are replacing.
Editing this directory does not modify the upstream originals. No deployment
has been performed.

Saving a mapped page/component under `resources/source/` uses Vite hot reload
without closing the local tunnel's origin port. Branding configuration and other
resource changes still restart Vite and can briefly return Bad Gateway while it
restarts; reload the page after the server is ready.

The 10X landing page replaces email login with "Log in with Farcaster", using
the QR hyperlink and starting the same pending channel in the original tab.
Phone/tablet users see only "Log in with Farcaster". It opens the official app
link separately, with an inline waiting/error status and cancellation instead
of a QR modal. The original browser tab keeps the matching channel alive and
completes authentication when the user returns. Desktop users see only "Log in
with phone", which opens the QR modal. Device detection also covers iPad desktop
mode and phones in landscape; it does not depend on viewport width.
The filled app/header logo uses the editable `resources/public/256x256-v2.png`
via `brand.json`'s `filledLogoUrl`. Cast image embeds (including quoted images)
use transparent backgrounds and no image border in white-label mode.

White-label pages default to Dark before first paint and after React mounts.
Explicit Light, System or Dark choices remain in this device's local storage
under `user-saved-theme`; no account-wide setting is changed. Unread/highlighted
rows and their matching avatar borders use the configured green palette through
`--notification-unread-light` and `--notification-unread-dark` (dark shade 200).

The upstream email callback remains available for existing links. This changes
the white-label interface only, not the upstream authentication service.

## Start tomorrow

1. Edit `brand.json`. Change `appName` and `shortName` to `10X`, set your company
   and legal entity, website, contact/support addresses, and social accounts.
   Empty `socialHandle` / `farcasterHandle` omits those metadata tags. The
   existing `VITE_CANONICAL_URL` environment setting takes precedence over
   `siteUrl`; `VITE_BRAND_NAME` is used only when white-labeling is off.
2. Replace the files under `resources/public/`. See the table below. Keep a
   filename to replace it in place, or change its `replacement` in
   `resources.json` to a new filename. Match the target file's format and image
   dimensions; e.g. PNG contents for a `.png` target. For an SVG-to-PNG logo
   change, add a PNG public mapping and point `logoUrl` at its target URL.
3. Edit the complete Terms, Privacy, Support, Delete Account, and landing-page
   copies under `resources/source/`. The untouched upstream versions remain
   available under `src/` for comparison. Their exports must keep the original
   names. Use `~/` imports when adding dependencies to copied pages.
4. Review `strings.json` for specific copy changes. Search by `source` or
   `file`. `source` shows the current original text; edit **`value`**, not
   `source`, `file`, `kind`, or `count` during ordinary brand customization.
5. Put `VITE_10X_FEATURE_WHITELABEL=true` in `.env.local` (or the public
   environment settings of your build), then validate and rebuild:

   ```sh
   pnpm branding:check
   pnpm branding:test
   pnpm branding:typecheck
   pnpm build
   ```

Run those commands from `apps/farcaster-web`, or prefix each with
`pnpm --dir apps/farcaster-web`. `pnpm start` serves the same replacements during
development; edits in this directory restart Vite. If changing an environment
file, restart development yourself. Existing installed PWAs and cached social
previews may retain old icons until the browser/platform refreshes them.

The flag is deliberately independent of `VITE_10X_FEATURES`: turning off
animated avatars or media features must not change the published identity.
White-label builds also disable the inherited PostHog integration, including
pre-login events and attempts to re-enable it. This does not disable logging or
analytics performed by independent upstream services or Mini Apps. Adopting an
analytics provider and any required collection controls needs separate review.
The linked shared legal revisions and `#10x-social` sections must be published
in coordination with these client changes; this repository does not publish them.
Rollback is `VITE_10X_FEATURE_WHITELABEL=false` plus a rebuild. That restores
the current fork's branding behavior (including its existing 10X metadata),
not a pristine copy of every upstream product decision.

## Brand values and strings

`brand.json` contains public strings, never secrets. To change only the app
name, edit `appName` and `shortName`; reviewed app references use `{{appName}}`.
Company and legal placeholders are separate so the app, trading name, and
legal entity can differ. `description` supplies default runtime metadata;
`manifestDescription` supplies the PWA description.
`socialHandle` is the X account; `farcasterHandle` is the Farcaster account.
`clientFid` is that client's numeric Farcaster identity, not the signed-in user.
10X uses FID 1313340 (10xmeme.eth, checked against the public upstream API).
Mini Apps receive this identity and the configured app name/logo in wallet
discovery; the independent bridge retains compatibility with the Mini App SDK.

`colors.light` and `colors.dark` each contain ten hex colours, from palette
step 100 to 1000. Step 500 supplies the main brand colour. `onActionLight` and
`onActionDark` supply contrasting action text. The HTML adapter sets palette
variables; disabled builds keep the original Tailwind fallback colours.
Public profile/cast shares use `siteUrl`; the app registers its canonical and
current origins for quote parsing. Protocol embeds and auth URLs stay upstream.

Referrals are temporarily unavailable in white-label mode: navigation is hidden
and referral/invite routes redirect home before mounting queries or reward
claims. This does not change upstream accounts or erase existing reward records.

Both 10X deployment scripts check the identity flag and branding audit before
building, then verify the generated identity before invoking deployment. Direct
manual hosting uploads must apply the same checks. The build step alone does not
deploy and still supports both branding variants for CI.
The release check also requires the canonical origin from `brand.json`, accepts
only an unset API override (the runtime same-origin `/~api` relay) or that site's
explicit `/~api` URL. Cloudflare Web Analytics is intentionally retained by the
owner's decision on 21 October 2026; the release checker permits its beacon.
Keep the existing hosting integration rather than adding a second script to the
client. Verify served pages and requests after an authorized deployment, including
SPA navigation. The inherited PostHog wrapper remains disabled in white-label
mode; this does not disable Cloudflare or other providers. Collection findings,
URL/resource caveats and the shared-policy wording are recorded in
`docs/10X_SOCIAL_CLOUDFLARE_ANALYTICS_HANDOFF.txt`.
Production settings, retained records, permissions and notices still require the
operational checks in `docs/10X_SOCIAL_POLICY_RECONCILIATION_RETURN.txt`.
Canonical page metadata on the exact `farcaster.xyz` / `warpcast.com` origins is
rebased to your configured site. This adapter applies only to page metadata;
external navigation, API calls, mobile deep links, and wallet export stay intact.

A catalogue entry looks like this:

```json
{
  "file": "src/pages/homeFeed/HomeFeedPage.tsx",
  "kind": "literal",
  "source": "Farcaster / Home",
  "count": 2,
  "category": "app",
  "value": "{{appName}} / Home"
}
```

The actual `count` in the checked-in catalogue is the authority. You can use
plain replacement text, including an empty string, instead of placeholders.
Replacement values are escaped as data. Template-expression values, user
names, posts, server responses, and third-party mini-app text are untouched.
This is a branding catalogue, not a complete localization system for every
sentence in the app.

Categories:

| Category   | Meaning                                                                                                                             |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `app`      | Presentation supplied by this web fork; editable.                                                                                   |
| `legal`    | Starter legal document strings; editable, or replace the whole page.                                                                |
| `preserve` | Protocol, technical contract, external product, official mobile app, reward, or source-data identity. Reason is recorded per entry. |
| `override` | An intentional reviewed departure from a preserved value.                                                                           |

Preserved entries cannot be edited accidentally: the loader rejects a changed
`value` until you explicitly change the category to `override`. Inspect the
call site first. Some strings are compared against incoming data or build
asset names even when they look like a label. For a different string in the
same file and syntax kind, add a new explicit catalogue entry; edits to `src/`
branding are detected by the audit. Whole-page overrides are often clearer
when behavior or substantial copy also needs to change.

## Resources you can replace

| Editable resource                                       | Where it appears                                                                                 |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `brand-logo.svg`                                        | Central Logo component, standalone/auth headers, cast image exports.                             |
| `brand-filled-logo.svg`                                 | Filled sidebar logo.                                                                             |
| `brand-wordmark.svg`                                    | Landing-page inline wordmark replacement.                                                        |
| `favicon-v3.png`                                        | Browser tab and branded wallet connection icon.                                                  |
| `favicon-notifications-v3.png`                          | Browser tab with unread notifications.                                                           |
| `og-logo-v3.png`                                        | Apple touch icon.                                                                                |
| `opengraph.png`                                         | Default branded social-preview image.                                                            |
| `512x512-v2.png`, `1024x1024-v2.png`, `256x256-v2.png`  | Install icons and existing public image consumers.                                               |
| `brand/farcaster-icon.svg`, `brand/farcaster-combo.svg` | Logo context-menu downloads (independent of displayed logo files).                               |
| `referral-info-splash.png`                              | Existing referral artwork.                                                                       |
| `matrix_bg_500x500_v2.mp4`                              | Mobile Matrix landing background, served at `/brand/landing-video.mp4`.                          |
| `matrix_bg_1080x1080.mp4`                               | Desktop Matrix loop at widths of 1024px and above, served at `/brand/landing-video-desktop.mp4`. |
| `matrix_bg_500x500_poster.webp`                         | Still background for loading, reduced-motion, and data-saving preferences.                       |
| `manifest.json`                                         | Full PWA manifest; only explicit string placeholders expand.                                     |

Every mapping has a `target` (the web app's original module or public path) and
`replacement` (the editable file relative to this directory). A new public
target also specifies `upstream`, identifying the source from which its starter
was derived. `upstreamSha256` describes the original, **not** your replacement.
Do not update it when you change your own content.

For example, to use `brand-logo.png`, save it in `resources/public/`, change the
logo mapping's target to `public/brand/logo.png` and its replacement to
`resources/public/brand-logo.png`, then set `logoUrl` to `/brand/logo.png`.
Keep that mapping's `upstream` and `upstreamSha256`. Apply the same pattern for
`filledLogoUrl` and `wordmarkUrl`. Empty logo URL values fall back to the copied
inline SVGs; custom images use their own colors (the original `fill` prop does
not recolor a PNG/SVG image).

Public overlays use the original URL paths in both Vite development and the
production output. The actual upstream `public/` files are never overwritten.
Alternate source/public copies are outside `public/` and are not published by
disabled builds. Source overrides support JS/TS/JSX/TSX, CSS, and JSON modules;
place replacement binary media in a public mapping and reference its URL from
an overridden source file, as the starter landing video does.

## Full legal documents and large sections

`TermsOfUsePage.tsx` and `PrivacyPolicyPage.tsx` are full editable copies,
including all headings, paragraphs, links, dates, and clauses. Unchanged
paragraphs pick up the reviewed company/entity/app/contact substitutions from
the catalogue. Edit entire sections directly to describe your actual service.

If you change a paragraph's wording, it no longer matches its original
catalogue entry. Write your desired final name directly, or use an explicit
placeholder **inside a JSX string expression**:

```tsx
<Para>{'{{legalEntity}} operates {{appName}}. Contact {{contactEmail}}.'}</Para>
<ExternalLink href={'mailto:{{contactEmail}}'} title="Contact us">
  {'{{contactEmail}}'}
</ExternalLink>
```

Do not put bare `{{appName}}` in JSX text: JSX interprets braces as JavaScript.
Placeholders are also supported in ordinary string literals and static template
segments inside replacement source modules. Unknown placeholders fail the build.
There is no automatic rewrite of arbitrary original text outside the catalogue.

Changing the company name does not update legal substance. The starters still
include upstream jurisdiction, arbitration, mobile permissions, processing,
account deletion, contact addresses, and service claims. In particular, the
deletion page currently describes a request to the upstream operator. Review
those sections together with your actual data flows and support handling.

## Upstream rebranding / replacement snapshots

`branding:check` is read-only and runs in CI even while the feature is off.
Enabled builds also run the audit before compiling. It detects:

- New/missing/changed occurrences of the tracked brand words in web JSX,
  strings, and template segments, including their lowercase URL/identifier forms.
- Changed occurrence counts (a newly reused string needs review).
- Changed or removed original files behind resource overrides.
- Missing replacements, duplicate mappings, invalid paths, and unknown placeholders.

Matching uses file + syntax kind + source value, not line numbers. JSX layout
whitespace is normalized; file hashes normalize CRLF/LF for text. Moving a
paragraph or changing line endings should not demand a brand redesign.

After an upstream merge:

1. Run `pnpm branding:check` and `pnpm branding:inventory`. The latter prints
   current candidates; it never overwrites `strings.json` or your resources.
2. Review new/changed strings. Carry your `value` forward to the revised
   `source`, update `count` if appropriate, and record why external identities
   should remain. Removed/renamed files require updating the mapping/export too.
3. Compare changed original resources with your replacements. Port fixes and
   legal/content changes deliberately; retain your own edits. Update only the
   corresponding original hash after review. Get the normalized hash with:

   ```sh
   node scripts/whitelabel/audit.mjs --hash src/pages/termsOfUse/TermsOfUsePage.tsx
   ```

4. Run audit, both type checks, tests, and a branded production build. Inspect
   landing/login, navigation, profile/cast titles, notification favicon, brand
   downloads, install metadata, legal/support pages, and cast image export.

The scanner recognizes Farcaster, Warpcast, Neynar, Merkle, Network State,
Network School, and the existing 10X Social label. An entirely new upstream
name or embedded text in an untracked image/video still needs human review;
extend `brandPattern` and the resource list when that happens. The audit does
not prove that a remote API, SDK widget, or mini app will never show another
brand. Original signed manifests, protocol fields, authentication statements,
API domains, and wallet-export origins must remain compatible.

Native apps and `farcaster-ssr` would need separate platform adapters if the
fork starts shipping them. Ownership/licensing context and architectural
tradeoffs are in `docs/WHITELABEL_PLAN.md` at the repository root.
