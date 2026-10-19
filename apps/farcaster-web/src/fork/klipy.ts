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
    full: ['mp4', 'webm'],
    preview: ['tinygif', 'nanogif', 'tinymp4', 'tinywebm', 'mp4'],
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
}: {
  id: string;
  query: string;
}): Promise<void> {
  const apiKey = getKlipyApiKey();
  const { country, locale } = getBrowserLocale();
  const params = new URLSearchParams({ country, id, locale });
  const trimmedQuery = query.trim();
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
    return {
      id,
      kind: 'video',
      url: item.mediaUrl,
      localUriRef: item.mediaUrl,
      videoId: id,
      uploadStatus: 'uploaded',
      width: item.width,
      height: item.height,
      thumbnailUrl: item.previewUrl,
      apiVideoEmbed: {
        type: 'video',
        url: item.mediaUrl,
        sourceUrl: item.mediaUrl,
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
  buildKlipyRequestUrl,
  canEmbedKlipyUrl,
  createKlipyComposerEmbed,
  getKlipyMediaMimeType,
  isAllowedKlipyMediaUrl,
  type KlipyMediaItem,
  type KlipyMediaType,
  klipyMediaTypes,
  normalizeKlipyResponse,
  registerKlipyShare,
  searchKlipyMedia,
};
