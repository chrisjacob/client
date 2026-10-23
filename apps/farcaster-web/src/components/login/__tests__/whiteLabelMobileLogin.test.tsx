// @vitest-environment jsdom
/* eslint-disable no-restricted-imports -- Test the editable white-label replacement module directly. */
import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { LoginQRCodeWithInstructions } from '../../../../whitelabel/resources/source/LoginQRCodeWithInstructions';

vi.mock('~/lazy/components', () => ({
  LoginQRCode: ({ channelId }: { channelId: string }) => (
    <div data-testid="login-qr" data-channel-id={channelId}>
      QR
    </div>
  ),
}));

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

const renderLogin = (userAgent: string, platform = '', maxTouchPoints = 0) => {
  vi.stubGlobal('navigator', { userAgent, platform, maxTouchPoints });
  const onClose = vi.fn();
  const channelId = 'pending channel&extra=value#fragment';
  act(() =>
    root.render(
      <LoginQRCodeWithInstructions
        channelId={channelId}
        onClose={onClose}
        attemptingLogin={false}
      />,
    ),
  );
  return { onClose, channelId };
};

describe('white-label phone login', () => {
  it.each([
    [
      'iPhone Safari',
      'Mozilla/5.0 (iPhone) AppleWebKit/605.1.15 Safari/604.1',
      '',
      0,
    ],
    ['Android', 'Mozilla/5.0 (Linux; Android 14) Chrome/130', '', 0],
    [
      'iPad desktop mode',
      'Mozilla/5.0 (Macintosh) Safari/605.1.15',
      'MacIntel',
      5,
    ],
  ])(
    'offers an app link for %s while retaining the original login tab and channel',
    (_name: string, ua: string, platform: string, touch: number) => {
      const { onClose, channelId } = renderLogin(ua, platform, touch);
      const link = container.querySelector('a')!;
      const url = new URL(link.href);
      expect(link.textContent).toContain('Open Farcaster to log in');
      expect(url.origin).toBe('https://farcaster.xyz');
      expect(url.pathname).toBe('/login-web');
      expect(url.searchParams.get('channel-id')).toBe(channelId);
      expect([...url.searchParams.keys()]).toEqual(['channel-id']);
      expect(link.target).toBe('_blank');
      expect(link.rel).toContain('noopener');
      expect(container.textContent).toContain('return to this browser tab');
      expect(container.querySelector('details')?.open).toBe(false);
      expect(
        container
          .querySelector('[data-testid="login-qr"]')
          ?.getAttribute('data-channel-id'),
      ).toBe(channelId);
      expect(onClose).not.toHaveBeenCalled();
      act(() => container.querySelector('button')!.click());
      expect(onClose).toHaveBeenCalledOnce();
    },
  );

  it('keeps the scannable QR flow on desktop', () => {
    renderLogin('Mozilla/5.0 (Windows NT 10.0) Chrome/130');
    expect(container.querySelector('[data-testid="login-qr"]')).not.toBeNull();
    expect(container.querySelector('details')).toBeNull();
    expect(container.querySelector('a')).toBeNull();
    expect(container.textContent).toContain('Scan this QR code');
  });
});
