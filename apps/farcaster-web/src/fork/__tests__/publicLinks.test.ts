import { afterEach, describe, expect, it, vi } from 'vitest';

const loadLinks = async (enabled: boolean) => {
  vi.resetModules();
  vi.doMock('../whiteLabel', () => ({
    whiteLabel: { enabled, siteUrl: 'https://10x.social', appName: '10X' },
  }));
  return import('../publicLinks');
};

afterEach(() => vi.doUnmock('../whiteLabel'));

describe('public sharing URLs', () => {
  it('keeps profile and cast shares on the configured client, including unnamed users', async () => {
    const links = await loadLinks(true);
    expect(links.getPublicProfileURL({ username: 'alice.eth', fid: 1 })).toBe(
      'https://10x.social/alice.eth',
    );
    expect(links.getPublicProfileURL({ fid: 1 })).toBe(
      'https://10x.social/~/profiles/1',
    );
    expect(
      links.getPublicCastURL({
        castUsername: 'alice.eth',
        castHash: '0x1234567890abcdef',
      }),
    ).toBe('https://10x.social/alice.eth/0x12345678');
    expect(
      links.getPublicCastURL({
        castUsername: undefined,
        castHash: '0x1234567890abcdef',
      }),
    ).toBe('https://10x.social/~/conversations/0x1234567890abcdef');
  });

  it('preserves upstream sharing in disabled builds', async () => {
    const links = await loadLinks(false);
    expect(links.getPublicProfileURL({ username: 'alice', fid: 1 })).toBe(
      'https://farcaster.xyz/alice',
    );
    expect(
      links.getPublicCastURL({
        castUsername: 'alice',
        castHash: '0x1234567890abcdef',
      }),
    ).toBe('https://farcaster.xyz/alice/0x12345678');
  });
});
