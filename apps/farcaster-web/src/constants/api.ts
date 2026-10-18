import { isProd } from '~/constants/env';

// Dev-only escape hatch: persist `farcasterApi.local` in localStorage to
// flip the API base from prod (`farcaster.xyz/~api`) to a backend running
// on `localhost:8080`. Use the helper from `init/initFarcasterApi.ts` —
// don't poke localStorage directly.
const STORAGE_KEY = 'farcasterApi.local';

function isLocalApiEnabled(): boolean {
  if (isProd) {
    return false;
  }
  if (typeof window === 'undefined') {
    return false;
  }
  return window.localStorage.getItem(STORAGE_KEY) === 'true';
}

const useLocalApi = isLocalApiEnabled();

const upstreamApiUrl = 'https://farcaster.xyz/~api';

// Farcaster permits its private web API from the official site and local
// development origins, but not from arbitrary production origins. Production
// builds therefore use the same-origin Pages Function relay in /functions.
// An explicit build-time URL can bypass the relay if Farcaster later
// allowlists the fork's domain. VITE_* values are public browser config.
const configuredApiUrl =
  import.meta.env.VITE_FARCASTER_API_BASE_URL?.trim() || undefined;
const productionApiUrl =
  configuredApiUrl ||
  (typeof window === 'undefined'
    ? upstreamApiUrl
    : `${window.location.origin}/~api`);

const baseApiUrl = useLocalApi
  ? 'http://localhost:8080'
  : isProd || configuredApiUrl
    ? productionApiUrl
    : upstreamApiUrl;

const parsedBaseApiUrl = new URL(baseApiUrl);
const baseApiHost = `${parsedBaseApiUrl.host}${parsedBaseApiUrl.pathname}`;
const baseUseHttps = parsedBaseApiUrl.protocol === 'https:';

const wsUrl = useLocalApi
  ? `ws://${baseApiHost}/stream`
  : 'wss://ws.farcaster.xyz/stream';

export { baseApiHost, baseApiUrl, baseUseHttps, STORAGE_KEY, wsUrl };
