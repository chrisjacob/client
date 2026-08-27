export type ForkWalletMode = 'external-only';

const canonicalUrl = (
  import.meta.env.VITE_CANONICAL_URL || 'https://10x.social'
).replace(/\/$/, '');

/**
 * The intentionally small customization surface for the 10X fork.
 *
 * Keep product differences here (or behind imports from here) so upstream
 * Farcaster changes remain easy to merge. Values prefixed with VITE_ are
 * public build-time configuration and must never contain secrets.
 */
const forkConfig = {
  brandName: import.meta.env.VITE_BRAND_NAME || '10X Social',
  canonicalUrl,
  walletMode: 'external-only' as ForkWalletMode,
  walletConnectProjectId:
    import.meta.env.VITE_WALLETCONNECT_PROJECT_ID?.trim() || undefined,
} as const;

export { forkConfig };
