import type { CastComposerEmbed } from 'farcaster-client-hooks';

type KlipyMediaFormat = {
  url: string;
  dims: [number, number];
  size?: number;
};

const klipyMediaTypes = ['gif', 'sticker', 'clip', 'meme', 'emoji'] as const;

type KlipyMediaType = (typeof klipyMediaTypes)[number];
type KlipyMediaKind = 'image' | 'video';

type KlipyMediaItem = {
  id: string;
  title: string;
  previewUrl: string;
  mediaUrl: string;
  previewKind: KlipyMediaKind;
  mediaKind: KlipyMediaKind;
  width: number;
  height: number;
  type: KlipyMediaType;
  shareSlug?: string;
  pageUrl?: string;
};

type KlipySearchResponse = {
  results: KlipyMediaItem[];
  next: string;
};

const KLIPY_API_ORIGIN = 'https://api.klipy.com';
const FARCASTER_EMBED_URL_MAX_BYTES = 256;
const RESULT_LIMIT = '24';

const mediaConfigs: Record<
  KlipyMediaType,
  { searchFilter?: string; mediaFilter: string }
> = {
  gif: { mediaFilter: 'gif,mediumgif,tinygif,nanogif,preview' },
  sticker: {
    searchFilter: 'sticker',
    mediaFilter:
      'gif_transparent,tinygif_transparent,nanogif_transparent,webp_transparent,tinywebp_transparent,gif,tinygif',
  },
  clip: {
    searchFilter: 'clip',
    mediaFilter: 'mp4,tinymp4,webm,tinywebm,gif,tinygif,nanogif',
  },
  meme: {
    searchFilter: 'static',
    mediaFilter: 'gif,tinygif,nanogif,preview,webp,png,jpg,jpeg',
  },
  emoji: {
    searchFilter: 'emoji',
    mediaFilter:
      'gif_transparent,tinygif_transparent,nanogif_transparent,webp_transparent,tinywebp_transparent,gif,tinygif,webp',
  },
};

const formatPriority: Record<
  KlipyMediaType,
  { full: string[]; preview: string[] }
> = {
  gif: {
    full: ['gif', 'mediumgif', 'webp'],
    preview: ['tinygif', 'nanogif', 'mediumgif', 'gif'],
  },
  sticker: {
    full: ['gif_transparent', 'webp_transparent', 'gif', 'webp'],
    preview: [
      'tinygif_transparent',
      'tinywebp_transparent',
      'nanogif_transparent',
      'gif_transparent',
      'tinygif',
      'gif',
    ],
  },
  clip: {
    full: ['mp4', 'webm', 'tinymp4', 'tinywebm'],
    preview: [
      'tinygif',
      'nanogif',
      'webp',
      'gif',
      'tinymp4',
      'tinywebm',
      'mp4',
      'webm',
    ],
  },
  meme: {
    full: ['gif', 'webp', 'png', 'jpg', 'jpeg', 'preview'],
    preview: ['tinygif', 'nanogif', 'preview', 'webp', 'gif'],
  },
  emoji: {
    full: ['gif_transparent', 'webp_transparent', 'gif', 'webp', 'png'],
    preview: [
      'tinygif_transparent',
      'tinywebp_transparent',
      'nanogif_transparent',
      'gif_transparent',
      'tinygif',
      'gif',
    ],
  },
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isAllowedKlipyMediaUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      url.protocol === 'https:' &&
      (url.hostname === 'static.klipy.com' ||
        url.hostname === 'static1.klipy.com' ||
        url.hostname === 'static2.klipy.com')
    );
  } catch {
    return false;
  }
}

function getKlipyClipPageSlug(value: string): string | undefined {
  try {
    const url = new URL(value);
    if (
      url.protocol !== 'https:' ||
      !['klipy.com', 'www.klipy.com'].includes(url.host) ||
      url.username ||
      url.password
    ) {
      return undefined;
    }
    const match = url.pathname.match(/^\/clips\/([^/]+)\/?$/);
    if (!match) {
      return undefined;
    }
    const slug = decodeURIComponent(match[1]);
    return slug &&
      slug.length <= 180 &&
      !slug.includes('/') &&
      !slug.includes('\\') &&
      Array.from(slug).every((character) => {
        const code = character.charCodeAt(0);
        return code >= 32 && code !== 127;
      })
      ? slug
      : undefined;
  } catch {
    return undefined;
  }
}

function isKlipyClipPageUrl(value: string): boolean {
  return getKlipyClipPageSlug(value) !== undefined;
}

function canEmbedKlipyUrl(url: string): boolean {
  return (
    isAllowedKlipyMediaUrl(url) &&
    new TextEncoder().encode(url).length <= FARCASTER_EMBED_URL_MAX_BYTES
  );
}

function isKlipyMediaFormat(value: unknown): value is KlipyMediaFormat {
  if (!isRecord(value)) {
    return false;
  }
  return (
    typeof value.url === 'string' &&
    isAllowedKlipyMediaUrl(value.url) &&
    Array.isArray(value.dims) &&
    value.dims.length === 2 &&
    value.dims.every(
      (dimension) => typeof dimension === 'number' && dimension > 0,
    )
  );
}

function pickMediaFormat(
  mediaFormats: Record<string, unknown>,
  priorities: string[],
): KlipyMediaFormat | undefined {
  for (const format of priorities) {
    const candidate = mediaFormats[format];
    if (isKlipyMediaFormat(candidate)) {
      return candidate;
    }
  }
  return undefined;
}

function getMediaKind(url: string): KlipyMediaKind {
  const extension = new URL(url).pathname.split('.').pop()?.toLowerCase();
  return extension === 'mp4' || extension === 'webm' ? 'video' : 'image';
}

function getKlipyMediaMimeType(url: string): string | undefined {
  if (!isAllowedKlipyMediaUrl(url)) {
    return undefined;
  }
  const extension = new URL(url).pathname.split('.').pop()?.toLowerCase();
  return {
    gif: 'image/gif',
    jpeg: 'image/jpeg',
    jpg: 'image/jpeg',
    mp4: 'video/mp4',
    png: 'image/png',
    webm: 'video/webm',
    webp: 'image/webp',
  }[extension ?? ''];
}

function normalizeKlipyResponse(
  payload: unknown,
  type: KlipyMediaType = 'gif',
): KlipySearchResponse {
  if (!isRecord(payload)) {
    return { results: [], next: '' };
  }

  // The native Clips API supplies file URLs and dimensions separately. Its
  // compatibility endpoint can return clips with an empty media_formats array.
  if (type === 'clip' && isRecord(payload.data)) {
    const page = payload.data;
    const items = Array.isArray(page.data) ? page.data : [];
    const slugs = new Map<string, string>();
    const pages = new Map<string, string>();
    const results = items.flatMap((item) => {
      if (
        !isRecord(item) ||
        item.type !== 'clip' ||
        !isRecord(item.file) ||
        !isRecord(item.file_meta)
      ) {
        return [];
      }
      const fileMeta = item.file_meta;
      if (typeof item.slug === 'string') {
        slugs.set(String(item.id), item.slug);
      }
      if (
        typeof item.url === 'string' &&
        isKlipyClipPageUrl(item.url) &&
        new TextEncoder().encode(item.url).length <=
          FARCASTER_EMBED_URL_MAX_BYTES
      ) {
        pages.set(String(item.id), item.url);
      }
      const mediaFormats = Object.fromEntries(
        Object.entries(item.file).map(([format, url]) => {
          const meta = fileMeta[format];
          return [
            format,
            {
              url,
              dims: isRecord(meta) ? [meta.width, meta.height] : [],
            },
          ];
        }),
      );
      return [{ ...item, media_formats: mediaFormats }];
    });
    const currentPage = Number(page.current_page);
    const normalized = normalizeKlipyResponse(
      {
        results,
        next:
          page.has_next === true &&
          Number.isSafeInteger(currentPage) &&
          currentPage > 0
            ? String(currentPage + 1)
            : '',
      },
      'clip',
    );
    return {
      ...normalized,
      results: normalized.results.map((item) => ({
        ...item,
        shareSlug: slugs.get(item.id),
        pageUrl: pages.get(item.id),
      })),
    };
  }

  const rawResults = Array.isArray(payload.results) ? payload.results : [];
  const results = rawResults.flatMap((result) => {
    if (!isRecord(result)) {
      return [];
    }

    const id =
      typeof result.id === 'string' || typeof result.id === 'number'
        ? String(result.id)
        : '';
    const mediaFormats = isRecord(result.media_formats)
      ? result.media_formats
      : undefined;
    if (!id || !mediaFormats) {
      return [];
    }

    const priorities = formatPriority[type];
    const full = pickMediaFormat(mediaFormats, priorities.full);
    const preview = pickMediaFormat(mediaFormats, priorities.preview) ?? full;
    if (!full || !preview || !canEmbedKlipyUrl(full.url)) {
      return [];
    }

    const contentDescription =
      typeof result.content_description === 'string'
        ? result.content_description.trim()
        : '';
    const title = typeof result.title === 'string' ? result.title.trim() : '';

    return [
      {
        id,
        title: contentDescription || title || `KLIPY ${type}`,
        previewUrl: preview.url,
        mediaUrl: full.url,
        previewKind: getMediaKind(preview.url),
        mediaKind: getMediaKind(full.url),
        width: full.dims[0],
        height: full.dims[1],
        type,
      },
    ];
  });

  return {
    results,
    next: typeof payload.next === 'string' ? payload.next : '',
  };
}

function getBrowserLocale(): { country: string; locale: string } {
  const browserLocale = navigator.language || 'en-AU';
  const locale = browserLocale.replace('-', '_');
  const countryMatch = locale.match(/_([A-Za-z]{2})$/);
  return {
    country: countryMatch?.[1]?.toUpperCase() ?? 'AU',
    locale,
  };
}

function getKlipyApiKey(): string {
  const key = import.meta.env.VITE_KLIPY_API_KEY?.trim();
  if (!key) {
    throw new Error('KLIPY media search has not been configured.');
  }
  return key;
}

function buildKlipyRequestUrl({
  endpoint,
  apiKey,
  params,
}: {
  endpoint: 'featured' | 'registershare' | 'search';
  apiKey: string;
  params: URLSearchParams;
}): string {
  const url = new URL(`/v2/${endpoint}`, KLIPY_API_ORIGIN);
  const directParams = new URLSearchParams(params);
  directParams.set('key', apiKey);
  url.search = directParams.toString();
  return url.href;
}

function buildKlipyClipRequestUrl({
  endpoint,
  apiKey,
  params,
}: {
  endpoint: 'trending' | 'search' | 'items';
  apiKey: string;
  params: URLSearchParams;
}): string {
  const url = new URL(
    `/api/v1/${encodeURIComponent(apiKey)}/clips/${endpoint}`,
    KLIPY_API_ORIGIN,
  );
  url.search = params.toString();
  return url.href;
}

async function fetchKlipyClip({
  pageUrl,
  signal,
}: {
  pageUrl: string;
  signal?: AbortSignal;
}): Promise<KlipyMediaItem> {
  const slug = getKlipyClipPageSlug(pageUrl);
  if (!slug) {
    throw new Error('Invalid KLIPY clip page.');
  }
  const response = await fetch(
    buildKlipyClipRequestUrl({
      endpoint: 'items',
      apiKey: getKlipyApiKey(),
      params: new URLSearchParams({ slugs: slug }),
    }),
    { headers: { Accept: 'application/json' }, signal },
  );
  const payload: unknown = await response.json().catch(() => undefined);
  if (!response.ok || !isRecord(payload) || payload.result !== true) {
    throw new Error('KLIPY clip is unavailable.');
  }
  const item = normalizeKlipyResponse(payload, 'clip').results.find(
    (item) =>
      item.shareSlug === slug ||
      (item.pageUrl && getKlipyClipPageSlug(item.pageUrl) === slug),
  );
  if (!item) {
    throw new Error('KLIPY clip is unavailable.');
  }
  return item;
}

async function searchKlipyMedia({
  query,
  type,
  position,
  signal,
}: {
  query: string;
  type: KlipyMediaType;
  position?: string;
  signal?: AbortSignal;
}): Promise<KlipySearchResponse> {
  const apiKey = getKlipyApiKey();
  const { country, locale } = getBrowserLocale();
  const mediaConfig = mediaConfigs[type];
  const trimmedQuery = query.trim();
  if (type === 'clip') {
    const page = position ?? '1';
    if (
      !/^\d+$/.test(page) ||
      !Number.isSafeInteger(Number(page)) ||
      Number(page) < 1
    ) {
      throw new Error('Invalid KLIPY Clips page.');
    }
    const params = new URLSearchParams({
      page,
      per_page: RESULT_LIMIT,
      locale: country,
    });
    if (trimmedQuery) {
      params.set('q', trimmedQuery);
    }
    const response = await fetch(
      buildKlipyClipRequestUrl({
        endpoint: trimmedQuery ? 'search' : 'trending',
        apiKey,
        params,
      }),
      { headers: { Accept: 'application/json' }, signal },
    );
    const payload: unknown = await response.json().catch(() => undefined);
    if (
      !response.ok ||
      !isRecord(payload) ||
      payload.result !== true ||
      !isRecord(payload.data) ||
      !Array.isArray(payload.data.data)
    ) {
      throw new Error('KLIPY Clips search is temporarily unavailable.');
    }
    return normalizeKlipyResponse(payload, type);
  }
  const params = new URLSearchParams({
    contentfilter: 'medium',
    country,
    limit: RESULT_LIMIT,
    locale,
    media_filter: mediaConfig.mediaFilter,
  });
  if (mediaConfig.searchFilter) {
    params.set('searchfilter', mediaConfig.searchFilter);
  }
  if (trimmedQuery) {
    params.set('q', trimmedQuery);
  }
  if (position) {
    params.set('pos', position);
  }

  const response = await fetch(
    buildKlipyRequestUrl({
      endpoint: trimmedQuery ? 'search' : 'featured',
      apiKey,
      params,
    }),
    { headers: { Accept: 'application/json' }, signal },
  );
  const payload: unknown = await response.json().catch(() => undefined);
  if (!response.ok) {
    throw new Error('KLIPY search is temporarily unavailable.');
  }
  return normalizeKlipyResponse(payload, type);
}

async function registerKlipyShare({
  id,
  query,
  type,
  slug,
}: {
  id: string;
  query: string;
  type?: KlipyMediaType;
  slug?: string;
}): Promise<void> {
  const apiKey = getKlipyApiKey();
  const { country, locale } = getBrowserLocale();
  const params = new URLSearchParams({ country, id, locale });
  const trimmedQuery = query.trim();
  if (type === 'clip' && slug) {
    const url = new URL(
      `/api/v1/${encodeURIComponent(apiKey)}/clips/share/${encodeURIComponent(slug)}`,
      KLIPY_API_ORIGIN,
    );
    const response = await fetch(url.href, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        locale: country,
        ...(trimmedQuery ? { q: trimmedQuery } : {}),
      }),
    });
    if (!response.ok) {
      throw new Error('KLIPY Clip share registration failed.');
    }
    return;
  }
  if (trimmedQuery) {
    params.set('q', trimmedQuery);
  }
  await fetch(
    buildKlipyRequestUrl({ endpoint: 'registershare', apiKey, params }),
    { headers: { Accept: 'application/json' } },
  );
}

function createKlipyComposerEmbed(item: KlipyMediaItem): CastComposerEmbed {
  if (!canEmbedKlipyUrl(item.mediaUrl)) {
    throw new Error('The selected KLIPY media URL cannot be embedded.');
  }

  const id = `klipy-${item.id}-${crypto.randomUUID()}`;
  if (item.mediaKind === 'video') {
    // Other clients can unfurl KLIPY's HTML page; the raw MP4 often has no
    // upstream preview. Keep the actual MP4 for this client's inline player.
    const sharedUrl =
      item.pageUrl &&
      isKlipyClipPageUrl(item.pageUrl) &&
      new TextEncoder().encode(item.pageUrl).length <=
        FARCASTER_EMBED_URL_MAX_BYTES
        ? item.pageUrl
        : item.mediaUrl;
    return {
      id,
      kind: 'video',
      url: sharedUrl,
      localUriRef: item.mediaUrl,
      videoId: id,
      uploadStatus: 'uploaded',
      width: item.width,
      height: item.height,
      thumbnailUrl: item.previewUrl,
      apiVideoEmbed: {
        type: 'video',
        url: item.mediaUrl,
        sourceUrl: sharedUrl,
        width: item.width,
        height: item.height,
        thumbnailUrl: item.previewUrl,
      },
    };
  }

  return {
    id,
    kind: 'image',
    url: item.mediaUrl,
    localUriRef: item.mediaUrl,
    previewUrl: item.previewUrl,
    uploadStatus: 'uploaded',
    width: item.width,
    height: item.height,
    aspectRatio: item.width / item.height,
    apiImageEmbed: {
      type: 'image',
      url: item.mediaUrl,
      sourceUrl: item.mediaUrl,
      alt: item.title,
      media: {
        version: '2',
        staticRaster: item.mediaUrl,
        width: item.width,
        height: item.height,
        mimeType: getKlipyMediaMimeType(item.mediaUrl),
      },
    },
  };
}

export {
  buildKlipyClipRequestUrl,
  buildKlipyRequestUrl,
  canEmbedKlipyUrl,
  createKlipyComposerEmbed,
  fetchKlipyClip,
  getKlipyClipPageSlug,
  getKlipyMediaMimeType,
  isAllowedKlipyMediaUrl,
  isKlipyClipPageUrl,
  type KlipyMediaItem,
  type KlipyMediaType,
  klipyMediaTypes,
  normalizeKlipyResponse,
  registerKlipyShare,
  searchKlipyMedia,
};
