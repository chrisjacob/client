// @vitest-environment jsdom
import { act, createElement } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import { useAppThemeName } from '~/hooks/theme/useAppTheme';
import {
  UserSavedTheme,
  useUserSavedTheme,
} from '~/hooks/theme/useUserSavedTheme';

vi.mock('~/fork/whiteLabel', () => ({ whiteLabel: { enabled: true } }));

let root: Root;
let container: HTMLDivElement;
let saved: ReturnType<typeof useUserSavedTheme>;
let effective: ReturnType<typeof useAppThemeName>;
let systemDark = false;
const listeners = new Set<() => void>();

function Consumer() {
  // Mirrors the separate preference selector and app theme consumers.
  saved = useUserSavedTheme();
  effective = useAppThemeName();
  return null;
}

function render() {
  act(() => root.render(createElement(Consumer)));
}

beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  localStorage.clear();
  document.documentElement.className = '';
  document.documentElement.removeAttribute('data-theme');
  systemDark = false;
  listeners.clear();
  vi.stubGlobal('matchMedia', () => ({
    get matches() {
      return systemDark;
    },
    addEventListener: (_event: string, listener: () => void) =>
      listeners.add(listener),
    removeEventListener: (_event: string, listener: () => void) =>
      listeners.delete(listener),
  }));
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

it('defaults to Dark even when the device uses Light, without persisting an implicit choice', () => {
  render();
  expect(saved.userSavedTheme).toBe('dark');
  expect(effective.appThemeName).toBe('dark');
  expect(document.documentElement.classList.contains('dark')).toBe(true);
  expect(localStorage.getItem('user-saved-theme')).toBeNull();
});

it.each(['light', 'system', 'dark'] as UserSavedTheme[])(
  'restores an explicit %s preference when the page mounts',
  (theme) => {
    localStorage.setItem('user-saved-theme', theme);
    render();
    expect(saved.userSavedTheme).toBe(theme);
    expect(effective.appThemeName).toBe(theme === 'dark' ? 'dark' : 'light');
    expect(document.documentElement.dataset.theme).toBe(theme);
  },
);

it('saves Light locally, updates both consumers, and restores it on remount', () => {
  render();
  act(() => saved.setUserSavedTheme('light'));
  expect(localStorage.getItem('user-saved-theme')).toBe('light');
  expect(effective.appThemeName).toBe('light');
  act(() => root.unmount());
  root = createRoot(container);
  render();
  expect(saved.userSavedTheme).toBe('light');
  expect(effective.appThemeName).toBe('light');
});

it('persists System and follows later device changes without reverting to the default', () => {
  render();
  act(() => saved.setUserSavedTheme('system'));
  expect(localStorage.getItem('user-saved-theme')).toBe('system');
  expect(effective.appThemeName).toBe('light');
  act(() => {
    systemDark = true;
    listeners.forEach((listener) => listener());
  });
  expect(effective.appThemeName).toBe('dark');
  expect(saved.userSavedTheme).toBe('system');
});

it('falls back to Dark for invalid or cleared preferences', () => {
  localStorage.setItem('user-saved-theme', 'invalid');
  render();
  expect(effective.appThemeName).toBe('dark');
  act(() => saved.setUserSavedTheme('light'));
  act(() => {
    localStorage.clear();
    window.dispatchEvent(new StorageEvent('storage', { key: null }));
  });
  expect(effective.appThemeName).toBe('dark');
});

it('still applies theme changes when browser storage is unavailable', () => {
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
    throw new Error('blocked');
  });
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('blocked');
  });
  render();
  expect(effective.appThemeName).toBe('dark');
  act(() => saved.setUserSavedTheme('light'));
  expect(effective.appThemeName).toBe('light');
});
