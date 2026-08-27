/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_RELEASE_ID?: string;
  readonly VITE_BRAND_NAME?: string;
  readonly VITE_CANONICAL_URL?: string;
  /** Public WalletConnect/Reown project identifier; this is not a secret. */
  readonly VITE_WALLETCONNECT_PROJECT_ID?: string;
  readonly VITE_FARCASTER_WALLET_EXPORT_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
