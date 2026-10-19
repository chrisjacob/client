import type {
  ApiCastImageEmbed,
  ApiCastVideoEmbed,
  ApiMediaV2,
} from 'farcaster-client-data';
import {
  getImageAspectRatio,
  processMediasForRendering,
} from 'farcaster-client-hooks';

import { getKlipyMediaMimeType, isAllowedKlipyMediaUrl } from './klipy';

function getDirectKlipyMediaUrl(
  ...candidates: Array<string | undefined>
): string | undefined {
  return candidates.find(
    (candidate): candidate is string =>
      typeof candidate === 'string' && isAllowedKlipyMediaUrl(candidate),
  );
}

function getCastImageMediaForRendering(image: ApiCastImageEmbed): ApiMediaV2 {
  const directUrl = getDirectKlipyMediaUrl(image.sourceUrl, image.url);
  if (directUrl) {
    return {
      version: '2',
      staticRaster: directUrl,
      height: image.media?.height ?? 1000,
      width: image.media?.width ?? 1000,
      mimeType: getKlipyMediaMimeType(directUrl),
    };
  }

  if (image.media && 'staticRaster' in image.media) {
    return {
      version: '2',
      staticRaster: image.media.staticRaster,
      height: image.media.height,
      width: image.media.width,
      mimeType: image.media.mimeType,
    };
  }

  return {
    version: '2',
    staticRaster: image.url,
    height: image.media?.height ?? 1000,
    width: image.media?.width ?? 1000,
  };
}

function getCastVideoUrlForRendering(video: ApiCastVideoEmbed): string {
  return getDirectKlipyMediaUrl(video.sourceUrl, video.url) ?? video.url;
}

function processForkMediasForRendering(
  options: Parameters<typeof processMediasForRendering>[0],
): ReturnType<typeof processMediasForRendering> {
  return options.medias.flatMap((media) => {
    if (!isAllowedKlipyMediaUrl(media.staticRaster)) {
      return processMediasForRendering({ ...options, medias: [media] });
    }

    return [
      {
        width: media.width,
        thumbnail: media.staticRaster,
        original: media.staticRaster,
        aspectRatio: getImageAspectRatio({ w: media.width, h: media.height }),
        mimeType: media.mimeType ?? getKlipyMediaMimeType(media.staticRaster),
      },
    ];
  });
}

export {
  getCastImageMediaForRendering,
  getCastVideoUrlForRendering,
  getDirectKlipyMediaUrl,
  processForkMediasForRendering,
};
