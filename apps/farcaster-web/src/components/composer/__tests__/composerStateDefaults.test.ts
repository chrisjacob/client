/* eslint-disable no-restricted-imports -- Exercise the canonical composer helpers directly, without loading app providers. */
import { describe, expect, it } from 'vitest';

import {
  getCastComposerEmbedsForLocalKey,
  getComposerImageUrlForRemoval,
  getEmbedUrlsForLocalKey,
} from '~/components/composer/composerStateDefaults';
import { createKlipyComposerEmbed, type KlipyMediaItem } from '~/fork/klipy';

import {
  type CastComposerEmbedsMap,
  getEmbedsToSubmit,
} from '../../../../../../packages/farcaster-client-hooks/src/hooks/data/mutations/castComposerEmbedHelpers';
import { buildCastComposerBucketView } from '../../../../../../packages/farcaster-client-hooks/src/hooks/data/mutations/castComposerEmbedSelectors';
import { reduceCastComposerEmbeds } from '../../../../../../packages/farcaster-client-hooks/src/hooks/data/mutations/castComposerEmbedStore';

it.each(['meme', 'gif'] as const)(
  'excludes a removed Klipy %s from both submission and saved drafts',
  async (removedType) => {
    const items = ['meme', 'gif'].map(
      (type) =>
        ({
          id: type,
          type,
          title: type,
          mediaUrl: `https://static.klipy.com/${type}.gif`,
          previewUrl: `https://static.klipy.com/${type}-preview.gif`,
          mediaKind: 'image',
          previewKind: 'image',
          width: 320,
          height: 240,
        }) as KlipyMediaItem,
    );
    let state: CastComposerEmbedsMap = {};
    for (const item of items) {
      state = reduceCastComposerEmbeds(state, {
        type: 'add',
        castLocalKey: 1,
        embed: createKlipyComposerEmbed(item),
        maxEmbedsLength: 2,
      });
    }
    const bucket = buildCastComposerBucketView(state)[1];
    expect(bucket.images.every((image) => image.version === 'v1')).toBe(true);
    const imageUrl = getComposerImageUrlForRemoval({
      images: bucket.images,
      previewSrc: items.find((item) => item.type === removedType)!.mediaUrl,
    });
    expect(imageUrl).toBeDefined();
    state = reduceCastComposerEmbeds(state, {
      type: 'remove',
      castLocalKey: 1,
      predicate: (embed) => embed.kind === 'image' && embed.url === imageUrl,
    });
    const remaining = items
      .filter((item) => item.type !== removedType)
      .map((item) => item.mediaUrl);
    expect(await getEmbedsToSubmit(state[1])).toEqual(remaining);
    expect(
      await getEmbedsToSubmit(state[1], { includeTextEmbeds: false }),
    ).toEqual(remaining);
  },
);

it('still resolves an uploaded image preview to its final submission URL', () => {
  expect(
    getComposerImageUrlForRemoval({
      images: [
        {
          version: 'v2',
          localUriRef: 'blob:local-preview',
          previewUrl: 'blob:local-preview',
          url: 'https://example.com/uploaded.png',
          uploadPromise: Promise.resolve({} as Response),
          aspectRatio: 1,
        },
      ],
      previewSrc: 'blob:local-preview',
    }),
  ).toBe('https://example.com/uploaded.png');
});

describe('composerStateDefaults', () => {
  it('returns a stable empty embeds object for casts without embed state', () => {
    const first = getCastComposerEmbedsForLocalKey({
      embeds: {},
      localKey: 1,
    });
    const second = getCastComposerEmbedsForLocalKey({
      embeds: {},
      localKey: 1,
    });

    expect(first).toBe(second);
    expect(first).toEqual({
      images: [],
      videos: [],
      urls: [],
    });
  });

  it('returns a stable empty URL list for casts without embed URL state', () => {
    const first = getEmbedUrlsForLocalKey({
      embedUrls: {},
      localKey: 1,
    });
    const second = getEmbedUrlsForLocalKey({
      embedUrls: {},
      localKey: 1,
    });

    expect(first).toBe(second);
    expect(first).toEqual([]);
  });

  it('returns populated state when it exists', () => {
    const embeds = {
      1: {
        images: [],
        videos: [],
        urls: [],
      },
    };
    const embedUrls = {
      1: ['https://example.com'],
    };

    expect(
      getCastComposerEmbedsForLocalKey({
        embeds,
        localKey: 1,
      }),
    ).toBe(embeds[1]);
    expect(
      getEmbedUrlsForLocalKey({
        embedUrls,
        localKey: 1,
      }),
    ).toBe(embedUrls[1]);
  });
});
