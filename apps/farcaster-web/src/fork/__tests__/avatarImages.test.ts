import {
  applyForkAvatarImagePath,
  enableCdnAnimation,
} from '~/fork/avatarImages';
import {
  parseBooleanFeatureFlag,
  resolveForkFeatureFlags,
} from '~/fork/featureFlags';

const transformedAvatarUrl =
  'https://wrpcd.net/cdn-cgi/imagedelivery/BXluQx4ige9GuW0Ia56BHw/8cc13d8a-8449-47b2-12f3-04c6f75a2e00/anim=false,fit=contain,f=auto,w=576';

describe('10X fork avatar image policy', () => {
  it('enables animation in direct and encoded CDN transforms', () => {
    expect(
      enableCdnAnimation(
        `https://example.com/anim=false/${encodeURIComponent(
          transformedAvatarUrl,
        )}`,
      ),
    ).toBe(
      `https://example.com/anim=true/${encodeURIComponent(
        transformedAvatarUrl.replace('anim=false', 'anim=true'),
      )}`,
    );
  });

  it('enables animation for an avatar URL that is already transformed', () => {
    const result = applyForkAvatarImagePath(transformedAvatarUrl, 192, {
      animatedAvatars: true,
    });

    expect(result).toContain('/anim=true,');
    expect(decodeURIComponent(result)).toContain('/anim=true,');
    expect(decodeURIComponent(result)).not.toContain('anim=false');
  });

  it('keeps the upstream static-avatar behavior when disabled', () => {
    const result = applyForkAvatarImagePath(transformedAvatarUrl, 192, {
      animatedAvatars: false,
    });

    expect(result).toContain('/anim=false,');
    expect(decodeURIComponent(result)).toContain('/anim=false,');
  });
});

describe('10X fork feature flags', () => {
  it.each([
    ['true', true],
    ['1', true],
    ['false', false],
    ['0', false],
  ])('parses %s as %s', (value, expected) => {
    expect(parseBooleanFeatureFlag(value, !expected)).toBe(expected);
  });

  it('uses the default for missing or invalid values', () => {
    expect(parseBooleanFeatureFlag(undefined, true)).toBe(true);
    expect(parseBooleanFeatureFlag('invalid', false)).toBe(false);
  });

  it('enables features by default when no build flags are supplied', () => {
    expect(resolveForkFeatureFlags({})).toEqual({
      enabled: true,
      animatedAvatars: true,
    });
  });

  it('lets an individual feature be disabled while 10X features stay on', () => {
    expect(
      resolveForkFeatureFlags({
        VITE_10X_FEATURES: 'true',
        VITE_10X_FEATURE_ANIMATED_AVATARS: 'false',
      }),
    ).toEqual({
      enabled: true,
      animatedAvatars: false,
    });
  });

  it('uses the master switch to disable every optional 10X feature', () => {
    expect(
      resolveForkFeatureFlags({
        VITE_10X_FEATURES: 'false',
        VITE_10X_FEATURE_ANIMATED_AVATARS: 'true',
      }),
    ).toEqual({
      enabled: false,
      animatedAvatars: false,
    });
  });
});
