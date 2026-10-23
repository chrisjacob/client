// @vitest-environment jsdom
/* eslint-disable no-restricted-imports -- Exercise source hooks with isolated API mocks instead of the built package barrel. */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ApiCastEmbeds } from 'farcaster-client-data';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import { createKlipyComposerEmbed } from '~/fork/klipy';

import { submittedCastPreviewEmbeds } from '../../../../../../packages/farcaster-client-hooks/src/hooks/data/mutations/castComposerEmbedHelpers';
import { useCreateCast } from '../../../../../../packages/farcaster-client-hooks/src/hooks/data/mutations/useCreateCast';
import { buildCastAttachmentCacheKey } from '../../../../../../packages/farcaster-client-hooks/src/hooks/data/queries/castAttachmentCache/buildCastAttachmentCacheKey';
import { mergeCastAttachmentEmbeds } from '../../../../../../packages/farcaster-client-hooks/src/hooks/data/queries/castAttachmentCache/mergeCastAttachmentEmbeds';
import { useCachedCastAttachment } from '../../../../../../packages/farcaster-client-hooks/src/hooks/data/queries/castAttachmentCache/useCastAttachmentCache';

const fixture = vi.hoisted(() => ({
  createCast: vi.fn(),
  invalidate: vi.fn(),
}));
vi.mock(
  '../../../../../../packages/farcaster-client-hooks/src/providers/FarcasterApiClientProvider',
  () => ({
    useFarcasterApiClient: () => ({
      apiClient: { createCast: fixture.createCast },
    }),
  }),
);
vi.mock(
  '../../../../../../packages/farcaster-client-hooks/src/hooks/data/queries/userCasts/useInvalidateUserCasts',
  () => ({
    useInvalidateUserCasts: () => fixture.invalidate,
  }),
);
vi.mock(
  '../../../../../../packages/farcaster-client-hooks/src/hooks/data/queries/userCastsAndReplies/useInvalidateUserCastsAndReplies',
  () => ({
    useInvalidateUserCastsAndReplies: () => fixture.invalidate,
  }),
);
vi.mock(
  '../../../../../../packages/farcaster-client-hooks/src/hooks/data/queries/profileSnapCasts/useInvalidateProfileSnapCasts',
  () => ({
    useInvalidateProfileSnapCasts: () => fixture.invalidate,
  }),
);
vi.mock(
  '../../../../../../packages/farcaster-client-hooks/src/hooks/data/queries/activeChannelStreak/useInvalidateActiveChannelStreak',
  () => ({
    useInvalidateActiveChannelStreak: () => fixture.invalidate,
  }),
);

const identity = { fid: 123, hash: '0x-new-clip' };
const empty: ApiCastEmbeds = { images: [], videos: [], urls: [], unknowns: [] };
const page = 'https://klipy.com/clips/happy-happy-gilmore';
const mp4 = 'https://static.klipy.com/clip.mp4';
const clip = createKlipyComposerEmbed({
  id: 'clip',
  title: 'Clip',
  type: 'clip',
  mediaKind: 'video',
  previewKind: 'image',
  mediaUrl: mp4,
  pageUrl: page,
  previewUrl: 'https://static.klipy.com/poster.webp',
  width: 720,
  height: 382,
});
const preview = submittedCastPreviewEmbeds([clip], empty);
let root: Root;
let container: HTMLDivElement;
let client: QueryClient;
let post: ReturnType<typeof useCreateCast>;

function ProfileCast({ upstream = empty }: { upstream?: ApiCastEmbeds }) {
  post = useCreateCast();
  const cached = useCachedCastAttachment(identity);
  const embeds = mergeCastAttachmentEmbeds(upstream, cached?.embeds);
  return (
    <>
      {embeds?.videos?.map((video) => (
        <video key={video.sourceUrl} src={video.url} />
      ))}
    </>
  );
}

async function render(upstream = empty) {
  await act(async () => {
    root.render(
      <QueryClientProvider client={client}>
        <ProfileCast upstream={upstream} />
      </QueryClientProvider>,
    );
  });
}

beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  fixture.createCast.mockReset();
  fixture.invalidate.mockReset();
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  client.clear();
  container.remove();
  vi.unstubAllGlobals();
});

it('seeds the clip before profile refresh, renders immediately and reconciles server metadata', async () => {
  await render();
  expect(container.querySelector('video')).toBeNull();
  fixture.createCast.mockResolvedValue({
    data: {
      result: {
        cast: {
          hash: identity.hash,
          author: { fid: identity.fid },
          text: 'Clip 2',
          embeds: empty,
        },
      },
    },
  });
  fixture.invalidate.mockImplementation(() => {
    expect(client.getQueryData(buildCastAttachmentCacheKey(identity))).toEqual({
      embeds: preview,
    });
  });

  await act(async () => {
    const result = await post({
      fid: identity.fid,
      castText: 'Clip 2',
      embeds: [page],
      clientProcessedEmbeds: preview,
    });
    expect(result.result.cast.embeds?.videos).toEqual(preview.videos);
    await new Promise((resolve) => setTimeout(resolve, 20));
  });
  expect(fixture.invalidate).toHaveBeenCalledTimes(4);
  expect(container.querySelector('video')?.getAttribute('src')).toBe(mp4);
  // Client-only playback metadata must not be sent to the upstream API.
  expect(fixture.createCast.mock.calls[0][0]).not.toHaveProperty(
    'clientProcessedEmbeds',
  );
  expect(fixture.createCast.mock.calls[0][0].embeds).toEqual([page]);

  const serverVideo = {
    ...preview.videos![0],
    url: 'https://cdn.example/processed.mp4',
  };
  await render({ ...empty, videos: [serverVideo] });
  expect(container.querySelectorAll('video')).toHaveLength(1);
  expect(container.querySelector('video')?.getAttribute('src')).toBe(
    serverVideo.url,
  );
});

it('updates an already mounted post when attachment metadata arrives later', async () => {
  await render();
  await act(async () => {
    client.setQueryData(buildCastAttachmentCacheKey(identity), {
      embeds: preview,
    });
    await new Promise((resolve) => setTimeout(resolve, 20));
  });
  expect(container.querySelector('video')?.getAttribute('src')).toBe(mp4);
});

it('does not seed a preview or refresh the profile when publishing fails', async () => {
  await render();
  fixture.createCast.mockRejectedValue(new Error('Publish failed'));
  await expect(
    post({
      fid: identity.fid,
      castText: 'Clip 2',
      embeds: [page],
      clientProcessedEmbeds: preview,
    }),
  ).rejects.toThrow('Publish failed');
  expect(
    client.getQueryData(buildCastAttachmentCacheKey(identity)),
  ).toBeUndefined();
  expect(fixture.invalidate).not.toHaveBeenCalled();
  expect(container.querySelector('video')).toBeNull();
});

it('replaces an unprocessed link or image preview with the known playable clip', () => {
  const result = mergeCastAttachmentEmbeds(
    {
      ...empty,
      images: [
        {
          type: 'image',
          url: 'https://static.klipy.com/poster.gif',
          sourceUrl: page,
          alt: 'Clip',
        },
      ],
      unknowns: [{ type: 'unknown', source: page }],
    },
    preview,
  );
  expect(result?.videos).toEqual(preview.videos);
  expect(result?.images).toEqual([]);
  expect(result?.unknowns).toEqual([]);
});

it('does not bring back a removed attachment from stale composer processing', () => {
  const removed = {
    type: 'image' as const,
    url: 'https://static.klipy.com/removed.gif',
    sourceUrl: 'https://static.klipy.com/removed.gif',
    alt: 'Removed',
  };
  const result = submittedCastPreviewEmbeds([clip], {
    ...empty,
    images: [removed],
  });
  expect(result.images).toEqual([]);
  expect(result.videos?.[0].url).toBe(mp4);
});

it('keeps unrelated attachments when only one server preview is ready', () => {
  const image = {
    type: 'image' as const,
    url: 'https://example.com/image.png',
    sourceUrl: 'https://example.com/image.png',
    alt: 'Image',
  };
  const result = mergeCastAttachmentEmbeds(
    { ...empty, images: [image] },
    preview,
  );
  expect(result?.images).toEqual([image]);
  expect(result?.videos).toEqual(preview.videos);
});
