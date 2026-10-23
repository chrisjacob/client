// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import { KlipyVideoAttachment } from '~/components/attachments/KlipyVideoAttachment';

const fixture = vi.hoisted(() => ({
  inView: true,
  ref: () => {},
  noop: () => {},
  source: 'https://static.klipy.com/audio-clip.mp4',
}));
vi.mock('react-intersection-observer', () => ({
  useInView: () => ({ ref: fixture.ref, inView: fixture.inView }),
}));
vi.mock('farcaster-client-hooks', () => ({
  getImageAspectRatio: ({ w, h }: { w: number; h: number }) => w / h,
  useTrackCastClick: () => fixture.noop,
  CastClickType: {},
}));
vi.mock('@vidstack/react', () => ({
  MediaPlayer: () => null,
  MediaProvider: () => null,
  Poster: () => null,
  useStore: () => ({}),
}));
vi.mock('@vidstack/react/player/layouts/default', () => ({
  defaultLayoutIcons: {},
  DefaultVideoLayout: () => null,
}));
vi.mock('~/contexts/VideoPlayStatusProvider', () => ({
  useVideoPlayStatus: () => ({
    activeVideoUrl: fixture.source,
    enqueueVideoForAutoplay: fixture.noop,
    dequeueVideoFromAutoplay: fixture.noop,
    forcePlayVideo: fixture.noop,
  }),
}));

let root: Root;
let container: HTMLDivElement;
let client: QueryClient;
let play: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  fixture.inView = true;
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.stubGlobal('React', React);
  vi.stubEnv('VITE_KLIPY_API_KEY', 'public-test-key');
  vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(
    'Mozilla/5.0 (iPhone) AppleWebKit/605.1.15 Version/18.0 Mobile Safari/604.1',
  );
  play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue();
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
  vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => {});
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  client.clear();
  container.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

async function render(url: string) {
  await act(async () => {
    root.render(
      <QueryClientProvider client={client}>
        <KlipyVideoAttachment
          url={url}
          videoWidth={720}
          videoHeight={382}
          mode="cast"
          autoPlay={true}
        />
      </QueryClientProvider>,
    );
  });
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 10));
  });
}

it('plays a direct clip as a muted inline loop with controls that can enable audio', async () => {
  await render(fixture.source);
  const video = container.querySelector('video')!;
  expect(video).not.toBeNull();
  expect(video.loop).toBe(true);
  expect(video.muted).toBe(true);
  expect(video.playsInline).toBe(true);
  expect(video.controls).toBe(true);
  expect(play).toHaveBeenCalled();
  act(() => {
    video.muted = false;
    video.dispatchEvent(new Event('volumechange'));
  });
  expect(video.muted).toBe(false);
});

it('resolves a clip-page embed to its audio MP4 and renders the same player', async () => {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      result: true,
      data: {
        data: [
          {
            id: 'clip',
            type: 'clip',
            slug: 'audio-clip',
            url: 'https://klipy.com/clips/audio-clip',
            file: { mp4: fixture.source },
            file_meta: { mp4: { width: 720, height: 382 } },
          },
        ],
      },
    }),
  });
  vi.stubGlobal('fetch', fetchMock);
  await render('https://klipy.com/clips/audio-clip');
  expect(container.querySelector('video')?.src).toBe(fixture.source);
  expect(container.querySelector('video')?.muted).toBe(true);
  expect(container.querySelector('video')?.loop).toBe(true);
  expect(new URL(fetchMock.mock.calls[0][0]).searchParams.get('slugs')).toBe(
    'audio-clip',
  );
  expect(container.querySelector('a')?.href).toBe(
    'https://klipy.com/clips/audio-clip',
  );
});

it('defers offscreen lookups and keeps a provider link if resolution fails', async () => {
  const fetchMock = vi.fn().mockRejectedValue(new Error('unavailable'));
  vi.stubGlobal('fetch', fetchMock);
  fixture.inView = false;
  await render('https://klipy.com/clips/audio-clip');
  expect(fetchMock).not.toHaveBeenCalled();
  fixture.inView = true;
  await render('https://klipy.com/clips/audio-clip');
  expect(fetchMock).toHaveBeenCalledOnce();
  expect(container.querySelector('video')).toBeNull();
  expect(container.querySelector('a')?.href).toBe(
    'https://klipy.com/clips/audio-clip',
  );
  expect(container.textContent).not.toContain('No preview found');
});
