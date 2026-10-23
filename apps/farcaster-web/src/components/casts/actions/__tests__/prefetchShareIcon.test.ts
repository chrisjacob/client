import { afterEach, expect, it, vi } from 'vitest';

import { prefetchShareIcon } from '~/components/casts/actions/prefetchShareIcon';

afterEach(() => vi.unstubAllGlobals());

it('settles a failed icon before the menu subscribes without an unhandled rejection', async () => {
  let fail: () => void = () => {};
  vi.stubGlobal(
    'Image',
    class {
      onerror?: () => void;
      set src(_src: string) {
        fail = () => this.onerror?.();
      }
    },
  );
  const pending = prefetchShareIcon('https://example.com/missing-icon.png');
  fail();
  // Wait a full event-loop turn before the menu consumes the result.
  await new Promise((resolve) => setTimeout(resolve, 0));
  await expect(pending).resolves.toBeNull();
});

it('registers handlers before setting src and returns a successfully loaded icon', async () => {
  vi.stubGlobal(
    'Image',
    class {
      onload?: () => void;
      onerror?: () => void;
      private value = '';
      set src(src: string) {
        this.value = src;
        expect(this.onerror).toBeTypeOf('function');
        this.onload?.();
      }
      get src() {
        return this.value;
      }
    },
  );
  const image = await prefetchShareIcon('https://example.com/icon.png');
  expect(image?.src).toBe('https://example.com/icon.png');
});
