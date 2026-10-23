import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiCastEmbeds } from 'farcaster-client-data';
import { useCallback } from 'react';

import { buildCastAttachmentCacheKey } from './buildCastAttachmentCacheKey';

type CastAttachmentCacheValue = { embeds?: ApiCastEmbeds } | undefined;

// Unlike the imperative reader, this subscribes mounted casts to late previews.
const useCachedCastAttachment = ({
  fid,
  hash,
}: {
  fid: number;
  hash: string;
}) =>
  useQuery<CastAttachmentCacheValue>({
    queryKey: buildCastAttachmentCacheKey({ fid, hash }),
    enabled: false,
    queryFn: async () => ({}),
  }).data;

const useCastAttachmentCache = () => {
  const qc = useQueryClient();

  return useCallback(
    ({
      fid,
      hash,
    }: {
      fid: number;
      hash: string;
    }): CastAttachmentCacheValue => {
      return qc.getQueryData(buildCastAttachmentCacheKey({ fid, hash }));
    },
    [qc],
  );
};

const useSetCastAttachmentCache = () => {
  const qc = useQueryClient();

  return useCallback(
    ({
      embeds,
      fid,
      hash,
    }: {
      embeds?: ApiCastEmbeds;
      castText: string;
      fid: number;
      hash: string;
    }) => {
      if (typeof embeds === 'undefined') return;

      const embedsToCache: ApiCastEmbeds | undefined = embeds
        ? { ...embeds }
        : undefined;

      const cache: CastAttachmentCacheValue = {
        embeds: embedsToCache,
      };

      return qc.setQueryData(
        buildCastAttachmentCacheKey({ fid, hash }),
        () => cache,
      );
    },
    [qc],
  );
};

export {
  useCachedCastAttachment,
  useCastAttachmentCache,
  useSetCastAttachmentCache,
};
