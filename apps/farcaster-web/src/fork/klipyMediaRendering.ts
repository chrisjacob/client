import type {
  ApiCastEmbeds,
  ApiCastImageEmbed,
  ApiCastVideoEmbed,
  ApiMediaV2,
} from 'farcaster-client-data';
import {
  getImageAspectRatio,
  processMediasForRendering,
} from 'farcaster-client-hooks';

import {
  getKlipyMediaMimeType,
  isAllowedKlipyMediaUrl,
  isKlipyClipPageUrl,
} from './klipy';

/** Repair upstream unknown/OG classifications without mutating API cache data. */
function normalizeKlipyCastEmbeds(
  embeds?: ApiCastEmbeds,
): ApiCastEmbeds | undefined {
  if (!embeds) {
    return embeds;
  }
  const videos = [...(embeds.videos ?? [])];
  const known = new Set(
    videos.flatMap((video) => [video.url, video.sourceUrl]),
  );
  let changed = false;
  const promote = (source: string, thumbnailUrl?: string) => {
    const mime = getKlipyMediaMimeType(source);
    if (
      mime !== 'video/mp4' &&
      mime !== 'video/webm' &&
      !isKlipyClipPageUrl(source)
    ) {
      return false;
    }
    changed = true;
    if (!known.has(source)) {
      videos.push({
        type: 'video',
        url: source,
        sourceUrl: source,
        width: 1280,
        height: 720,
        thumbnailUrl,
      });
      known.add(source);
    }
    return true;
  };
  const urls = (embeds.urls ?? []).filter(
    ({ openGraph }) =>
      !promote(openGraph.sourceUrl ?? openGraph.url, openGraph.image),
  );
  const unknowns = (embeds.unknowns ?? []).filter(
    ({ source }) => !promote(source),
  );
  return changed ? { ...embeds, videos, urls, unknowns } : embeds;
}

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
  normalizeKlipyCastEmbeds,
  processForkMediasForRendering,
};
