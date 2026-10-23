import assert from 'node:assert/strict';

// This is a release policy for the 10X hosting project, not a restriction on
// development or on the upstream client's supported API configurations.
export function releaseApiConfiguration(environment, brand) {
  const expected = new URL(brand.siteUrl);
  const canonical = new URL(environment.VITE_CANONICAL_URL || brand.siteUrl);
  assert.equal(
    canonical.protocol,
    'https:',
    'Release canonical URL must use HTTPS',
  );
  assert.equal(
    canonical.href.replace(/\/$/, ''),
    expected.href.replace(/\/$/, ''),
    'Release canonical URL must match brand.siteUrl; development tunnel overrides are not release settings',
  );
  assert.ok(
    !canonical.username &&
      !canonical.password &&
      canonical.pathname === '/' &&
      !canonical.search &&
      !canonical.hash,
    'Release canonical URL must be a credential-free site origin',
  );

  const configured = environment.VITE_FARCASTER_API_BASE_URL?.trim();
  if (configured) {
    assert.equal(
      configured.replace(/\/$/, ''),
      `${canonical.origin}/~api`,
      '10X releases must use the same-origin /~api relay; remove development or external API overrides',
    );
  }
  return {
    canonicalUrl: canonical.origin,
    apiMode: configured
      ? 'explicit same-origin relay'
      : 'runtime same-origin relay',
    apiPath: '/~api',
  };
}
