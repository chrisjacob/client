// @vitest-environment jsdom
/* eslint-disable no-restricted-imports -- Test the editable white-label replacement module directly. */
import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import { HomeLandingPage } from '../../../../whitelabel/resources/source/HomeLandingPage';

vi.mock('~/components/links/Link', () => ({
  Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
}));
vi.mock('~/components/LogoBrandContextMenu', () => ({
  LogoBrandContextMenu: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));
vi.mock('~/components/page/Page', () => ({
  Page: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock('~/contexts/AnalyticsProvider', () => ({
  useAnalytics: () => ({ dangerouslyTrackPreAuthEvent: vi.fn() }),
}));
vi.mock('~/fork/config', () => ({ forkConfig: { brandName: '10X' } }));
vi.mock('~/components/login/LoginWithMobile', () => ({
  LoginWithMobile: ({
    initialChannelId,
    presentation,
    onClose,
  }: {
    initialChannelId: string;
    presentation: string;
    onClose: () => void;
  }) => (
    <div
      data-testid="inline-login"
      data-channel-id={initialChannelId}
      data-presentation={presentation}
    >
      <button onClick={onClose}>Cancel login</button>
    </div>
  ),
}));
vi.mock('~/components/modals/LoginModal', () => ({
  LoginModal: ({
    initialChannelId,
    onClose,
  }: {
    initialChannelId?: string;
    onClose: () => void;
  }) => (
    <div data-testid="pending-login" data-channel-id={initialChannelId}>
      <button onClick={onClose}>Close test login</button>
    </div>
  ),
}));

let container: HTMLDivElement;
let root: Root;
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.stubGlobal('matchMedia', () => ({
    matches: false,
    addEventListener() {},
    removeEventListener() {},
  }));
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

it.each([
  ['iPhone', 'Mozilla/5.0 (iPhone) Safari/604.1', '', 0],
  ['Android in landscape', 'Mozilla/5.0 (Linux; Android 14) Chrome/130', '', 0],
  [
    'iPad desktop mode',
    'Mozilla/5.0 (Macintosh) Safari/605.1.15',
    'MacIntel',
    5,
  ],
])(
  'shows only the app link on %s and waits inline without a modal',
  (
    _name: string,
    userAgent: string,
    platform: string,
    maxTouchPoints: number,
  ) => {
    vi.stubGlobal('navigator', { userAgent, platform, maxTouchPoints });
    act(() => root.render(<HomeLandingPage />));
    expect(container.textContent).not.toContain('Log in with email');
    expect(container.textContent).not.toContain('Log in with phone');
    const link = container.querySelector<HTMLAnchorElement>(
      'a[title="Log in with Farcaster"]',
    )!;
    const channel = new URL(link.href).searchParams.get('channel-id');
    expect(new URL(link.href).origin).toBe('https://farcaster.xyz');
    expect(new URL(link.href).pathname).toBe('/login-web');
    expect(channel).toMatch(/^[a-f0-9-]{36}$/);
    expect(link.target).toBe('_blank');
    link.addEventListener('click', (event) => event.preventDefault());
    act(() => link.click());
    expect(
      container
        .querySelector('[data-testid="inline-login"]')
        ?.getAttribute('data-channel-id'),
    ).toBe(channel);
    expect(container.querySelector('[data-testid="pending-login"]')).toBeNull();
    expect(
      container
        .querySelector('[data-testid="inline-login"]')
        ?.getAttribute('data-presentation'),
    ).toBe('app-link');
    act(() =>
      container
        .querySelector<HTMLButtonElement>(
          '[data-testid="inline-login"] button',
        )!
        .click(),
    );
    expect(container.querySelector('[data-testid="inline-login"]')).toBeNull();
    expect(new URL(link.href).searchParams.get('channel-id')).not.toBe(channel);
  },
);

it('retains the original phone/QR option without forcing the direct-link channel', () => {
  vi.stubGlobal('navigator', {
    userAgent: 'Mozilla/5.0 (Windows NT 10.0) Chrome/130',
  });
  act(() => root.render(<HomeLandingPage />));
  expect(
    container.querySelector('a[title="Log in with Farcaster"]'),
  ).toBeNull();
  expect(container.textContent).not.toContain('Log in with email');
  const button = [...container.querySelectorAll('button')].find(
    (item) => item.textContent === 'Log in with phone',
  )!;
  act(() => button.click());
  const pending = container.querySelector('[data-testid="pending-login"]');
  expect(pending).not.toBeNull();
  expect(pending?.hasAttribute('data-channel-id')).toBe(false);
  expect(container.querySelector('[data-testid="inline-login"]')).toBeNull();
});
