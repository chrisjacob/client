import {
  buildKlipyRequestUrl,
  canEmbedKlipyUrl,
  isAllowedKlipyMediaUrl,
  normalizeKlipyResponse,
} from '~/fork/klipy';

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
