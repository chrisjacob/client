import assert from 'node:assert/strict';
import test from 'node:test';

import { releaseApiConfiguration } from './releasePolicy.mjs';

const brand = { siteUrl: 'https://10x.social' };

test('release uses the runtime or explicit same-origin relay', () => {
  assert.equal(
    releaseApiConfiguration({}, brand).apiMode,
    'runtime same-origin relay',
  );
  assert.equal(
    releaseApiConfiguration(
      { VITE_FARCASTER_API_BASE_URL: 'https://10x.social/~api/' },
      brand,
    ).apiMode,
    'explicit same-origin relay',
  );
});

test('release rejects a tunnel, loopback or upstream API override and a wrong canonical', () => {
  for (const url of [
    'https://local.10x.social/~api',
    'http://localhost:8080',
    'https://farcaster.xyz/~api',
    'https://10x.social/~api?debug=true',
    'https://user:password@10x.social/~api',
  ]) {
    assert.throws(
      () =>
        releaseApiConfiguration({ VITE_FARCASTER_API_BASE_URL: url }, brand),
      /same-origin/,
    );
  }
  assert.throws(
    () =>
      releaseApiConfiguration(
        { VITE_CANONICAL_URL: 'https://local.10x.social' },
        brand,
      ),
    /canonical/,
  );
});
