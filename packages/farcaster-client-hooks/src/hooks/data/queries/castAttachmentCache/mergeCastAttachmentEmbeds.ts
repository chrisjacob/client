import type { ApiCastEmbeds } from 'farcaster-client-data';

/** Keep server previews, filling attachments that are still being processed. */
export function mergeCastAttachmentEmbeds(
  upstream?: ApiCastEmbeds,
  cached?: ApiCastEmbeds,
): ApiCastEmbeds | undefined {
  if (!cached) return upstream;
  if (!upstream) return cached;

  const mergeMedia = <T extends { url: string; sourceUrl: string }>(
    server: T[] = [],
    local: T[] = [],
  ): T[] => {
    const known = new Set(
      server.flatMap(({ url, sourceUrl }) => [url, sourceUrl]),
    );
    return [
      ...server,
      ...local.filter(({ url, sourceUrl }) => {
        if (known.has(url) || known.has(sourceUrl)) return false;
        known.add(url);
        known.add(sourceUrl);
        return true;
      }),
    ];
  };
  const videos = mergeMedia(upstream.videos, cached.videos);
  const videoUrls = new Set(
    videos.flatMap(({ url, sourceUrl }) => [url, sourceUrl]),
  );
  const images = mergeMedia(upstream.images, cached.images).filter(
    ({ url, sourceUrl }) => !videoUrls.has(url) && !videoUrls.has(sourceUrl),
  );
  const mediaUrls = new Set(
    [...images, ...videos].flatMap(({ url, sourceUrl }) => [url, sourceUrl]),
  );
  const urls = mergeMedia(
    (upstream.urls ?? []).map((embed) => ({
      ...embed,
      url: embed.openGraph.url,
      sourceUrl: embed.openGraph.sourceUrl ?? embed.openGraph.url,
    })),
    (cached.urls ?? []).map((embed) => ({
      ...embed,
      url: embed.openGraph.url,
      sourceUrl: embed.openGraph.sourceUrl ?? embed.openGraph.url,
    })),
  )
    .filter(
      ({ url, sourceUrl }) => !mediaUrls.has(url) && !mediaUrls.has(sourceUrl),
    )
    .map(({ url: _url, sourceUrl: _sourceUrl, ...embed }) => embed);
  const knownUrls = new Set([
    ...mediaUrls,
    ...urls.flatMap(({ openGraph }) => [openGraph.url, openGraph.sourceUrl]),
  ]);
  const unknowns = [
    ...(upstream.unknowns ?? []),
    ...(cached.unknowns ?? []),
  ].filter(({ source }) => {
    if (knownUrls.has(source)) return false;
    knownUrls.add(source);
    return true;
  });

  return {
    ...cached,
    ...upstream,
    images,
    videos,
    urls,
    unknowns,
    casts: upstream.casts ?? cached.casts,
  };
}
