import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const posthogMock = vi.hoisted(() => ({
  init: vi.fn(),
  opt_in_capturing: vi.fn(),
  opt_out_capturing: vi.fn(),
  capture: vi.fn(),
  identify: vi.fn(),
  reset: vi.fn(),
  setPersonProperties: vi.fn(),
  get_property: vi.fn(() => 'analytics-device'),
  get_session_id: vi.fn(() => 'analytics-session'),
  isFeatureEnabled: vi.fn(() => true),
  getFeatureFlagPayload: vi.fn(() => 'payload'),
  onFeatureFlags: vi.fn(() => () => undefined),
}));

vi.mock('posthog-js', () => ({ default: posthogMock }));
vi.mock('~/constants/analytics', () => ({
  posthogApiHost: 'https://analytics.example.test',
  posthogApiKey: 'test-project',
}));

const loadAnalytics = async (enabled: boolean) => {
  vi.doMock('~/fork/whiteLabel', () => ({ whiteLabel: { enabled } }));
  return (await import('~/utils/analyticsUtils')).Analytics;
};

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
});

afterEach(() => {
  vi.doUnmock('~/fork/whiteLabel');
});

describe('white-label analytics privacy boundary', () => {
  it('never initializes or calls the upstream SDK, including explicit enable and pre-login events', async () => {
    const analytics = await loadAnalytics(true);
    analytics.init();
    analytics.enable();
    analytics.setUserId('123');
    analytics.setUserProperties({
      username: 'alice',
      neynarScore: 0.5,
      version: 'test',
      appVersion: 'test',
    });
    analytics.logEvent('authenticated');
    analytics.logAnalyticsOnlyEvent('analytics-only');
    analytics.dangerouslyLogPossiblyPreAuthEvent('login');
    analytics.disable();
    analytics.enable();
    analytics.init();

    expect(analytics.getDeviceId()).toBeUndefined();
    expect(analytics.getSessionId()).toBeUndefined();
    expect(analytics.isFeatureEnabled('remote-flag')).toBeUndefined();
    expect(analytics.getFeatureFlagPayload('remote-flag')).toBeUndefined();
    analytics.onFeatureFlags(vi.fn())();

    for (const method of Object.values(posthogMock)) {
      expect(method).not.toHaveBeenCalled();
    }
  });

  it('preserves the existing upstream lifecycle when white-label mode is off', async () => {
    const analytics = await loadAnalytics(false);
    analytics.init();
    analytics.setUserId('123');
    analytics.logEvent('authenticated');
    expect(posthogMock.init).toHaveBeenCalledOnce();
    expect(posthogMock.identify).toHaveBeenCalledWith('123');
    expect(posthogMock.capture).toHaveBeenCalledWith(
      'authenticated',
      undefined,
    );
    expect(analytics.getDeviceId()).toBe('analytics-device');
    expect(analytics.getSessionId()).toBe('analytics-session');

    analytics.disable();
    analytics.logEvent('disabled');
    expect(posthogMock.opt_out_capturing).toHaveBeenCalledOnce();
    expect(posthogMock.capture).toHaveBeenCalledTimes(1);
    analytics.enable();
    expect(posthogMock.opt_in_capturing).toHaveBeenCalledOnce();
    analytics.logEvent('re-enabled');
    expect(posthogMock.capture).toHaveBeenCalledTimes(2);
  });
});
