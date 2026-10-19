import { describe, expect, it } from 'vitest';

import { brandPageCanonical, whiteLabel } from '~/fork/whiteLabel';

describe('white-label page metadata', () => {
  it('defaults to the existing identity outside a branded Vite build', () => {
    expect(whiteLabel.enabled).toBe(false);
  });

  it.each(['https://farcaster.xyz', 'https://warpcast.com'])(
    'rebases %s page metadata and preserves path, query and hash',
    (origin) => {
      expect(
        brandPageCanonical(
          `${origin}/alice/0x123?view=thread#reply`,
          'https://10x.social/',
        ),
      ).toBe('https://10x.social/alice/0x123?view=thread#reply');
    },
  );

  it.each([
    'https://wallet-export.farcaster.xyz/export',
    'https://farcaster.xyz.attacker.test/alice',
    'https://other.example/alice',
    'https://farcaster.xyz:8443/alice',
    'https://user:pass@farcaster.xyz/alice',
    'farcaster://alice',
    '/alice',
  ])('preserves non-page origin %s', (canonical) => {
    expect(brandPageCanonical(canonical, 'https://10x.social')).toBe(canonical);
  });
});
