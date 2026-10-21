type WhiteLabelBrand = {
  enabled: true;
  appName: string;
  shortName: string;
  description: string;
  siteUrl: string;
  socialHandle: string;
  farcasterHandle: string;
  logoUrl: string;
  filledLogoUrl: string;
  wordmarkUrl: string;
  clientFid: number;
  walletIconDataUrl: `data:image/${string}`;
};

// The disabled variant keeps existing behavior and also supports tests that do
// not load the Vite build adapter. No alternate content is fetched at runtime.
const whiteLabel: WhiteLabelBrand | { enabled: false } =
  typeof __WHITELABEL__ === 'undefined' ? { enabled: false } : __WHITELABEL__;

/** Rebase page metadata only; never use this for API/auth/deep-link URLs. */
const brandPageCanonical = (canonical: string, siteUrl: string): string => {
  try {
    const page = new URL(canonical);
    if (
      page.protocol === 'https:' &&
      !page.username &&
      !page.password &&
      ['farcaster.xyz', 'warpcast.com'].includes(page.host)
    ) {
      return `${siteUrl.replace(/\/$/, '')}${page.pathname}${page.search}${page.hash}`;
    }
  } catch {
    // Preserve relative or otherwise nonstandard upstream metadata verbatim.
  }
  return canonical;
};

export { brandPageCanonical, whiteLabel };
export type { WhiteLabelBrand };
