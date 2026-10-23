import {
  buildKlipyRequestUrl,
  canEmbedKlipyUrl,
  createKlipyComposerEmbed,
  fetchKlipyClip,
  isAllowedKlipyMediaUrl,
  isKlipyClipPageUrl,
  normalizeKlipyResponse,
  registerKlipyShare,
  searchKlipyMedia,
} from '~/fork/klipy';

const nativeClips = {
  result: true,
  data: {
    current_page: 1,
    has_next: true,
    data: [
      {
        id: 4144663754405082,
        type: 'clip',
        slug: 'happy-clip',
        title: 'Happy clip with audio',
        url: 'https://klipy.com/clips/happy-clip',
        file: {
          mp4: 'https://static.klipy.com/clip.mp4',
          gif: 'https://static.klipy.com/clip.gif',
          webp: 'https://static.klipy.com/clip.webp',
        },
        file_meta: {
          mp4: { width: 720, height: 382 },
          gif: { width: 320, height: 170 },
          webp: { width: 320, height: 170 },
        },
      },
    ],
  },
};

describe('native KLIPY Clips', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('converts native file/file_meta results into playable video attachments', () => {
    const response = normalizeKlipyResponse(nativeClips, 'clip');
    expect(response.next).toBe('2');
    expect(response.results).toHaveLength(1);
    expect(response.results[0]).toMatchObject({
      mediaUrl: 'https://static.klipy.com/clip.mp4',
      previewUrl: 'https://static.klipy.com/clip.webp',
      mediaKind: 'video',
      previewKind: 'image',
      width: 720,
      height: 382,
      shareSlug: 'happy-clip',
    });
    expect(createKlipyComposerEmbed(response.results[0])).toMatchObject({
      url: 'https://klipy.com/clips/happy-clip',
      localUriRef: 'https://static.klipy.com/clip.mp4',
      kind: 'video',
      uploadStatus: 'uploaded',
      apiVideoEmbed: { url: 'https://static.klipy.com/clip.mp4' },
    });
  });

  it('resolves a public clip page back to its original MP4 without a first-party proxy', async () => {
    vi.stubEnv('VITE_KLIPY_API_KEY', 'public-browser-key');
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => nativeClips });
    vi.stubGlobal('fetch', fetchMock);
    const clip = await fetchKlipyClip({
      pageUrl: 'https://klipy.com/clips/happy-clip',
    });
    const request = new URL(fetchMock.mock.calls[0][0]);
    expect(request.origin).toBe('https://api.klipy.com');
    expect(request.pathname).toBe('/api/v1/public-browser-key/clips/items');
    expect(request.searchParams.get('slugs')).toBe('happy-clip');
    expect(clip.mediaUrl).toBe('https://static.klipy.com/clip.mp4');
  });

  it('recognizes only official HTTPS clip pages and never looks up arbitrary hosts or paths', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    for (const url of [
      'http://klipy.com/clips/happy',
      'https://klipy.com.evil.test/clips/happy',
      'https://user:password@klipy.com/clips/happy',
      'https://klipy.com:444/clips/happy',
      'https://klipy.com/clips/a%2Fb',
      'https://klipy.com/gifs/happy',
    ]) {
      expect(isKlipyClipPageUrl(url)).toBe(false);
      await expect(fetchKlipyClip({ pageUrl: url })).rejects.toThrow('Invalid');
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('ends native pagination and rejects non-clip items, invalid dimensions and foreign media hosts', () => {
    const item = nativeClips.data.data[0];
    const payload = {
      result: true,
      data: {
        current_page: 2,
        has_next: false,
        data: [
          item,
          { ...item, type: 'ad' },
          { ...item, file_meta: {} },
          { ...item, file: { mp4: 'https://example.com/video.mp4' } },
        ],
      },
    };
    expect(normalizeKlipyResponse(payload, 'clip').results).toHaveLength(1);
    expect(normalizeKlipyResponse(payload, 'clip').next).toBe('');
  });

  it.each(['', ' happy '])(
    'uses native trending/search and page numbers for query %j',
    async (query: string) => {
      vi.stubEnv('VITE_KLIPY_API_KEY', 'public-browser-key');
      vi.stubGlobal('navigator', { language: 'en-AU' });
      const fetchMock = vi
        .fn()
        .mockResolvedValue({ ok: true, json: async () => nativeClips });
      vi.stubGlobal('fetch', fetchMock);
      const controller = new AbortController();
      const response = await searchKlipyMedia({
        query,
        type: 'clip',
        position: '2',
        signal: controller.signal,
      });
      const url = new URL(fetchMock.mock.calls[0][0]);
      expect(url.origin).toBe('https://api.klipy.com');
      expect(url.pathname).toBe(
        `/api/v1/public-browser-key/clips/${query ? 'search' : 'trending'}`,
      );
      expect(url.searchParams.get('page')).toBe('2');
      expect(url.searchParams.get('per_page')).toBe('24');
      expect(url.searchParams.get('locale')).toBe('AU');
      expect(url.searchParams.get('q')).toBe(query ? 'happy' : null);
      expect(url.searchParams.has('customer_id')).toBe(false);
      expect(fetchMock.mock.calls[0][1].signal).toBe(controller.signal);
      expect(response.results).toHaveLength(1);
    },
  );

  it('reports native API failures rather than pretending the library is empty', async () => {
    vi.stubEnv('VITE_KLIPY_API_KEY', 'public-browser-key');
    vi.stubGlobal('navigator', { language: 'en-AU' });
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue({ ok: true, json: async () => ({ result: false }) }),
    );
    await expect(searchKlipyMedia({ query: '', type: 'clip' })).rejects.toThrow(
      'temporarily unavailable',
    );
  });

  it('registers clip selections by native slug while leaving GIF registration on v2', async () => {
    vi.stubEnv('VITE_KLIPY_API_KEY', 'public-browser-key');
    vi.stubGlobal('navigator', { language: 'en-AU' });
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock);
    await registerKlipyShare({
      id: '123',
      type: 'clip',
      slug: 'happy/clip',
      query: 'happy',
    });
    const [url, options] = fetchMock.mock.calls[0];
    expect(new URL(url).pathname).toBe(
      '/api/v1/public-browser-key/clips/share/happy%2Fclip',
    );
    expect(options.method).toBe('POST');
    expect(JSON.parse(options.body)).toEqual({ locale: 'AU', q: 'happy' });
    await registerKlipyShare({ id: 'gif-1', query: 'happy', type: 'gif' });
    expect(new URL(fetchMock.mock.calls[1][0]).pathname).toBe(
      '/v2/registershare',
    );
  });
});

describe('10X KLIPY adapter', () => {
  it('normalizes GIF preview and full-size formats', () => {
    expect(
      normalizeKlipyResponse({
        next: 'next-page',
        results: [
          {
            id: 'gif-1',
            content_description: 'A happy dance',
            media_formats: {
              tinygif: {
                url: 'https://static.klipy.com/preview.gif',
                dims: [220, 160],
              },
              gif: {
                url: 'https://static.klipy.com/full.gif',
                dims: [440, 320],
              },
            },
          },
        ],
      }),
    ).toEqual({
      next: 'next-page',
      results: [
        {
          id: 'gif-1',
          title: 'A happy dance',
          previewUrl: 'https://static.klipy.com/preview.gif',
          mediaUrl: 'https://static.klipy.com/full.gif',
          previewKind: 'image',
          mediaKind: 'image',
          width: 440,
          height: 320,
          type: 'gif',
        },
      ],
    });
  });

  it.each([
    ['sticker', 'gif_transparent', 'tinygif_transparent'],
    ['emoji', 'gif_transparent', 'tinygif_transparent'],
  ] as const)(
    'prefers transparent %s formats',
    (
      type: 'sticker' | 'emoji',
      fullFormat: 'gif_transparent',
      previewFormat: 'tinygif_transparent',
    ) => {
      const result = normalizeKlipyResponse(
        {
          results: [
            {
              id: `${type}-1`,
              media_formats: {
                gif: {
                  url: `https://static.klipy.com/${type}.gif`,
                  dims: [400, 400],
                },
                [fullFormat]: {
                  url: `https://static.klipy.com/${type}-transparent.gif`,
                  dims: [400, 400],
                },
                [previewFormat]: {
                  url: `https://static.klipy.com/${type}-preview.gif`,
                  dims: [120, 120],
                },
              },
            },
          ],
        },
        type,
      );

      expect(result.results[0]).toMatchObject({
        type,
        mediaUrl: `https://static.klipy.com/${type}-transparent.gif`,
        previewUrl: `https://static.klipy.com/${type}-preview.gif`,
      });
    },
  );

  it('uses a video attachment and lightweight GIF preview for clips', () => {
    const result = normalizeKlipyResponse(
      {
        results: [
          {
            id: 'clip-1',
            title: 'Short clip',
            media_formats: {
              tinygif: {
                url: 'https://static1.klipy.com/clip-preview.gif',
                dims: [240, 135],
              },
              mp4: {
                url: 'https://static1.klipy.com/clip.mp4',
                dims: [1280, 720],
              },
            },
          },
        ],
      },
      'clip',
    );

    expect(result.results[0]).toMatchObject({
      type: 'clip',
      previewKind: 'image',
      mediaKind: 'video',
      mediaUrl: 'https://static1.klipy.com/clip.mp4',
    });
  });

  it('normalizes static meme results', () => {
    const result = normalizeKlipyResponse(
      {
        results: [
          {
            id: 'meme-1',
            title: 'A meme',
            media_formats: {
              webp: {
                url: 'https://static2.klipy.com/meme.webp',
                dims: [640, 640],
              },
            },
          },
        ],
      },
      'meme',
    );

    expect(result.results[0]).toMatchObject({
      type: 'meme',
      title: 'A meme',
      previewKind: 'image',
      mediaKind: 'image',
    });
  });

  it('drops malformed or non-KLIPY media URLs', () => {
    expect(
      normalizeKlipyResponse({
        results: [
          { id: 'missing-media', title: 'Missing media' },
          {
            id: 'untrusted-media',
            media_formats: {
              gif: {
                url: 'https://example.com/not-klipy.gif',
                dims: [300, 200],
              },
            },
          },
        ],
      }),
    ).toEqual({ next: '', results: [] });
  });

  it('accepts only exact HTTPS KLIPY media hosts', () => {
    expect(isAllowedKlipyMediaUrl('https://static.klipy.com/a.gif')).toBe(true);
    expect(isAllowedKlipyMediaUrl('https://static1.klipy.com/a.gif')).toBe(
      true,
    );
    expect(isAllowedKlipyMediaUrl('http://static.klipy.com/a.gif')).toBe(false);
    expect(
      isAllowedKlipyMediaUrl('https://static.klipy.com.evil.test/a.gif'),
    ).toBe(false);
  });

  it('rejects media URLs that exceed the Farcaster embed URL byte limit', () => {
    const shortUrl = 'https://static.klipy.com/a.gif';
    const longUrl = `https://static.klipy.com/${'a'.repeat(240)}.gif`;

    expect(canEmbedKlipyUrl(shortUrl)).toBe(true);
    expect(canEmbedKlipyUrl(longUrl)).toBe(false);
  });

  it('builds a direct KLIPY request without a first-party proxy', () => {
    const url = new URL(
      buildKlipyRequestUrl({
        endpoint: 'search',
        apiKey: 'browser-key',
        params: new URLSearchParams({ q: 'happy dance' }),
      }),
    );

    expect(url.origin).toBe('https://api.klipy.com');
    expect(url.pathname).toBe('/v2/search');
    expect(url.searchParams.get('key')).toBe('browser-key');
    expect(url.searchParams.get('q')).toBe('happy dance');
  });
});
