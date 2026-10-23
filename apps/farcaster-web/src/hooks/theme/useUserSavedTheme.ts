import { useCallback, useEffect, useState } from 'react';

import { whiteLabel } from '~/fork/whiteLabel';

export type UserSavedTheme = 'light' | 'dark' | 'system';

const DEFAULT_THEME: UserSavedTheme = whiteLabel.enabled ? 'dark' : 'system';

const STORAGE_KEY = 'user-saved-theme';

const VALID_THEMES = new Set<UserSavedTheme>(['light', 'dark', 'system']);

const isValidTheme = (value: string | null): value is UserSavedTheme =>
  value !== null && VALID_THEMES.has(value as UserSavedTheme);

const getUserSavedTheme = (): UserSavedTheme => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return isValidTheme(stored) ? stored : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
};

export function useUserSavedTheme() {
  const [theme, setTheme] = useState<UserSavedTheme>(getUserSavedTheme);

  useEffect(() => {
    const callback = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY || event.key === null) {
        setTheme(isValidTheme(event.newValue) ? event.newValue : DEFAULT_THEME);
      }
    };
    addEventListener('storage', callback);
    return () => {
      removeEventListener('storage', callback);
    };
  }, []);

  const updateTheme = useCallback(
    (next: UserSavedTheme) => {
      let storage: Storage | null = null;
      try {
        storage = localStorage;
        storage.setItem(STORAGE_KEY, next);
      } catch {
        // Storage can be unavailable; still apply the choice for this session.
      }
      setTheme(next);
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: STORAGE_KEY,
          newValue: next,
          oldValue: theme,
          storageArea: storage,
          url: window.location.href,
        }),
      );
    },
    [theme],
  );

  return { userSavedTheme: theme, setUserSavedTheme: updateTheme };
}
