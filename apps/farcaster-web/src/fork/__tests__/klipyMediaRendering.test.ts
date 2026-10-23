import type { ApiCastEmbeds, ApiCastImageEmbed } from 'farcaster-client-data';

import {
  getCastImageMediaForRendering,
  normalizeKlipyCastEmbeds,
  processForkMediasForRendering,
} from '~/fork/klipyMediaRendering';

describe('10X KLIPY direct media rendering', () => {
  it('promotes old unsupported MP4/WebM links to videos without modifying the cached response', () => {
    const source = 'https://static.klipy.com/clip.mp4';
    const embeds: ApiCastEmbeds = {
      images: [],
      urls: [],
      unknowns: [{ type: 'unknown', source }],
    };
    const normalized = normalizeKlipyCastEmbeds(embeds)!;
    expect(normalized.unknowns).toEqual([]);
    expect(normalized.videos).toEqual([
      expect.objectContaining({
        url: source,
        sourceUrl: source,
        type: 'video',
      }),
    ]);
    expect(embeds.unknowns).toHaveLength(1);
    expect(embeds.videos).toBeUndefined();
  });

  it('routes a clip-page preview to video rendering and keeps unrelated links and images', () => {
    const source = 'https://klipy.com/clips/happy';
    const embeds: ApiCastEmbeds = {
      images: [],
      unknowns: [{ type: 'unknown', source: 'https://example.com/clip.mp4' }],
      urls: [
        {
          type: 'url',
          openGraph: {
            url: source,
            image: 'https://static.klipy.com/poster.webp',
          },
        },
        { type: 'url', openGraph: { url: 'https://example.com' } },
      ],
    };
    const normalized = normalizeKlipyCastEmbeds(embeds)!;
    expect(normalized.videos).toEqual([
      expect.objectContaining({
        sourceUrl: source,
        thumbnailUrl: 'https://static.klipy.com/poster.webp',
      }),
    ]);
    expect(normalized.urls).toHaveLength(1);
    expect(normalized.unknowns).toEqual(embeds.unknowns);
    expect(normalized.images).toBe(embeds.images);
  });

  it('does not render duplicate previews when a recognized video also appears as unknown', () => {
    const source = 'https://static.klipy.com/clip.mp4';
    const embeds: ApiCastEmbeds = {
      images: [],
      urls: [],
      videos: [{ type: 'video', url: source, sourceUrl: source }],
      unknowns: [{ type: 'unknown', source }],
    };
    expect(normalizeKlipyCastEmbeds(embeds)!.videos).toHaveLength(1);
    const unrelated: ApiCastEmbeds = {
      images: [],
      urls: [],
      unknowns: [{ type: 'unknown', source: 'https://example.com/video.mp4' }],
    };
    expect(normalizeKlipyCastEmbeds(unrelated)).toBe(unrelated);
  });
  it('restores the original KLIPY source URL when API media was proxied', () => {
    const image: ApiCastImageEmbed = {
      type: 'image',
      alt: 'KLIPY GIF',
      sourceUrl: 'https://static.klipy.com/original.gif',
      url: 'https://wrpcd.net/proxied.gif',
      media: {
        version: '2',
        width: 480,
        height: 270,
        staticRaster: 'https://wrpcd.net/proxied.gif',
        mimeType: 'image/gif',
      },
    };

    expect(getCastImageMediaForRendering(image)).toEqual({
      version: '2',
      width: 480,
      height: 270,
      staticRaster: 'https://static.klipy.com/original.gif',
      mimeType: 'image/gif',
    });
  });

  it('does not route KLIPY image URLs through the Farcaster image CDN', () => {
    const url = 'https://static1.klipy.com/direct.gif';
    const [processed] = processForkMediasForRendering({
      medias: [
        {
          version: '2',
          width: 320,
          height: 180,
          staticRaster: url,
          mimeType: 'image/gif',
        },
      ],
      pixelDensity: 3,
      blockAnimated: false,
    });

    expect(processed.thumbnail).toBe(url);
    expect(processed.original).toBe(url);
  });
});
