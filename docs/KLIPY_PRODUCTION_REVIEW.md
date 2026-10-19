# KLIPY production review

Status: **implementation ready for local/staging tests; production approval is
still required**.

## Implemented integration model

The 10X web client now follows a direct-client model:

1. The end-user's browser calls `https://api.klipy.com/v2/...` directly.
2. Search results remain in the order returned by KLIPY.
3. Picker previews load directly from the exact `static*.klipy.com` URLs in the
   response.
4. Selecting media adds the unmodified KLIPY URL directly to the Farcaster
   cast's standard URL embed field.
5. The 10X client does not download, upload, cache, proxy, re-host, or rewrite
   that media.
6. The 10X cast renderer recognizes exact KLIPY media hosts and loads the
   original source URL instead of applying the Farcaster `wrpcd.net` image
   transform.
7. Register Share is called directly from the end-user's browser after a
   selection.

Farcaster's cast schema has only a URL for this kind of embed. It has no
portable provider metadata field that can instruct every independent client or
indexer how to fetch that URL. Consequently, 10X can control its own request
path, but cannot control whether another Farcaster client, indexer, or gateway
later fetches, caches, or proxies the public embed URL.

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

## Production launch gate

Keep `VITE_10X_FEATURE_KLIPY_MEDIA_PICKER=false` in the production build until:

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

The Vite configuration defaults the picker to enabled for development and
disabled for production; while it is disabled, the production key is not
embedded either. After the launch gate is cleared, explicitly set
`VITE_10X_FEATURE_KLIPY_MEDIA_PICKER=true` for the production build.
