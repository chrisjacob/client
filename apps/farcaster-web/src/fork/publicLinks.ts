import { getCastURL } from 'farcaster-client-data/src/utils/CastUtils';

import { forkConfig } from './config';
import { whiteLabel } from './whiteLabel';

// Presentation links only. Protocol embeds, auth and official app URLs retain
// their upstream identity; never apply this to arbitrary outbound URLs.
export const getPublicCastURL = (params: Parameters<typeof getCastURL>[0]) => {
  const upstream = getCastURL(params);
  if (!whiteLabel.enabled) {
    return upstream;
  }
  const url = new URL(upstream);
  return `${forkConfig.canonicalUrl}${url.pathname}`;
};

export const getPublicProfileURL = ({
  username,
  fid,
}: {
  username?: string;
  fid: number;
}) => {
  const origin = whiteLabel.enabled
    ? forkConfig.canonicalUrl
    : 'https://farcaster.xyz';
  return username
    ? `${origin}/${encodeURIComponent(username)}`
    : `${origin}/~/profiles/${fid}`;
};
