# KLIPY production review

Status: **production picker enabled at the owner's direction on 24 October
2026**. The provider questions below remain open; this records the owner's
release decision, not written approval from KLIPY.

## Implemented integration model

The 10X web client now follows a direct-client model:

1. The end-user's browser calls `https://api.klipy.com/v2/...` directly for
   GIFs, stickers, memes and emoji. Clips use KLIPY's native
   `/api/v1/{app_key}/clips/trending` and `/clips/search` routes: the compatibility
   search can return clips with empty `media_formats`. Native Clips pagination
   uses page numbers, and clip selections register through the native share
   route with the returned slug. No persistent customer identifier is added.
2. Search results remain in the order returned by KLIPY.
3. Picker previews load directly from the exact `static*.klipy.com` URLs in the
   response.
4. Images use the unmodified KLIPY media URL in the cast's URL embed field.
   Clips prefer the public `https://klipy.com/clips/...` page returned by KLIPY,
   preserving its Open Graph animated image, video and player metadata for
   other clients. The original MP4 remains the source for 10X inline playback.
5. The 10X client does not download, upload, cache, proxy, re-host, or rewrite
   that media.
6. The 10X cast renderer recognizes exact KLIPY media hosts and loads the
   original source URL instead of applying the Farcaster `wrpcd.net` image
   transform.
   Unsupported raw KLIPY MP4/WebM links are promoted to video embeds locally.
   Clip-page previews are resolved through the direct native `clips/items`
   API near the viewport; resolved metadata is cached in the browser's query
   cache. Playback uses the existing visibility-managed video player: muted
   initially, looping, inline on mobile, with controls to enable audio. A
   provider link remains available if resolution fails or the key is absent.
   Newly published casts seed that attachment metadata from the canonical
   composer attachments before profile queries refresh. Mounted casts subscribe
   to this local metadata and fill missing server previews until processing
   completes; matching processed server videos take precedence. Removed
   attachments are excluded from this local preview as well as the cast payload.
7. Register Share is called directly from the end-user's browser after a
   selection.

Farcaster's cast schema has only a URL for this kind of embed. It has no
portable provider metadata field that can instruct every independent client or
indexer how to fetch that URL. Consequently, 10X can control its own request
path, but cannot control whether another Farcaster client, indexer, or gateway
later fetches, caches, or proxies the public embed URL.

The public page's metadata improves the input available to other clients; it
does not guarantee inline autoplay in the official app. Its actual rendering
must be verified after posting a new clip-page embed. Existing casts still
contain their original MP4 URLs and cannot be rewritten in other clients by a
frontend change. Native HLS/transcoded hosting is not added by this change.

## Questions requiring KLIPY's written answer

Send KLIPY the architecture above and ask them to confirm all of the following:

1. **Public Farcaster embeds:** May 10X publish the exact, unmodified
   `static*.klipy.com` media URL as a standard Farcaster `Embed.url`?
2. **Independent clients:** Is that use permitted when unrelated Farcaster
   clients, hubs, indexers, link unfurlers, or gateways may independently fetch,
   cache, transform, or proxy the URL outside 10X's control?
3. **Browser API key:** Is the v2 API key intended to be a public browser
   application credential? If so, which hostname/origin restrictions should be
   configured for `https://10x.social`, `https://www.10x.social`, the Pages
   preview domain, and local development?
4. **CORS:** Are `search`, `featured`, and `registershare` supported as direct
   cross-origin browser requests from those origins in production?
5. **URL permanence:** Are returned `static*.klipy.com` URLs stable public URLs
   suitable for permanent inclusion in an immutable/decentralized cast? Do they
   expire, require a referrer, or change when content is moderated?
6. **Register Share timing:** Is a Register Share event correct when the user
   attaches the item, or should it occur only after the cast is successfully
   published? Does a retry risk double-counting?
7. **All content types:** Does the same direct-URL permission cover GIFs,
   stickers, clips, memes, and AI emoji? Are there format-specific sharing or
   attribution requirements?
8. **Clips:** Which returned clip format should be embedded for the broadest
   cross-client compatibility: MP4, WebM, or an animated GIF fallback?
9. **Ads:** Are ads disabled for the 10X keys? If not, what exact ordering,
   impression, click, disclosure, and Register Share behavior is mandatory?
10. **Attribution:** Is the current `Search KLIPY` placeholder plus persistent
    `Powered by KLIPY` picker footer sufficient, or must attribution also appear
    on each selected item or published cast?
11. **Content safety:** Is `contentfilter=medium` acceptable for production,
    including the clips library, or does KLIPY require a different dashboard or
    request setting?
12. **Deletion and moderation:** What should 10X do when KLIPY removes content
    whose URL is already present in an immutable cast?

## Production configuration and follow-up

The committed `.env.production` enables
`VITE_10X_FEATURE_KLIPY_MEDIA_PICKER=true`. Production builds use the production
browser key: `VITE_KLIPY_API_KEY` if explicitly configured, otherwise
`KLIPY_API_KEY` from the ignored `.dev.vars.production`. Never use the local
testing key for a production release or commit either key.

Outstanding provider and integration checks:

- KLIPY has answered the questions above in writing and granted production
  access for the production key;
- direct browser CORS requests work from every approved 10X origin;
- KLIPY has confirmed the browser-key exposure and any origin restrictions;
- GIF, sticker, clip, meme, and AI emoji embeds have been tested in 10X and at
  least the official Farcaster client;
- returned media URLs fit Farcaster's 256-byte embed URL limit;
- attribution and any advertising requirements have been signed off; and
- the now-unused Cloudflare `KLIPY_API_KEY` runtime secret is removed after the
  direct-browser deployment is confirmed.

The build-time `VITE_KLIPY_API_KEY` value is intentionally public because Vite
embeds it in browser JavaScript. It must never be treated as a confidential
server credential. Local ignored `.dev.vars.*` files remain supported as a
transition convenience, but their `KLIPY_API_KEY` values are likewise embedded
when that environment is built with the picker enabled.

Without an explicit setting, the Vite configuration defaults the picker to
enabled for development and disabled for production. The committed production
setting above enables the release. Setting the flag to `false` disables the
picker and omits its browser key from that build.
