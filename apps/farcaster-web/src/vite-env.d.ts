/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_RELEASE_ID?: string;
  readonly VITE_BRAND_NAME?: string;
  readonly VITE_CANONICAL_URL?: string;
  /** Independent build identity switch; unaffected by VITE_10X_FEATURES. */
  readonly VITE_10X_FEATURE_WHITELABEL?: string;
  /** Master switch for optional 10X product features. */
  readonly VITE_10X_FEATURES?: string;
  /** Enables animated profile avatars across the 10X web client. */
  readonly VITE_10X_FEATURE_ANIMATED_AVATARS?: string;
  /** Enables KLIPY GIF, sticker, clip, meme, and AI emoji search. */
  readonly VITE_10X_FEATURE_KLIPY_MEDIA_PICKER?: string;
  /** Public, browser-scoped KLIPY application key. */
  readonly VITE_KLIPY_API_KEY?: string;
  /** Public WalletConnect/Reown project identifier; this is not a secret. */
  readonly VITE_WALLETCONNECT_PROJECT_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare const __WHITELABEL__:
  | import('./fork/whiteLabel').WhiteLabelBrand
  | { enabled: false };
