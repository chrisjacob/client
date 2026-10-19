import type { ApiCastImageEmbed } from 'farcaster-client-data';

import {
  getCastImageMediaForRendering,
  processForkMediasForRendering,
} from '~/fork/klipyMediaRendering';

describe('10X KLIPY direct media rendering', () => {
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
