import { useQuery } from '@tanstack/react-query';
import React from 'react';
import { useInView } from 'react-intersection-observer';

import { ExternalLink } from '~/components/links/ExternalLink';
import { fetchKlipyClip, isKlipyClipPageUrl } from '~/fork/klipy';

import { VideoAttachment } from './VideoAttachment';

type Props = React.ComponentProps<typeof VideoAttachment>;

function KlipyClipPageVideo(props: Props) {
  const { ref, inView } = useInView({ rootMargin: '500px', triggerOnce: true });
  const { data: clip, isFetching } = useQuery({
    queryKey: ['klipy-clip-page', props.url],
    queryFn: ({ signal }: { signal: AbortSignal }) =>
      fetchKlipyClip({ pageUrl: props.url, signal }),
    enabled: inView,
    staleTime: 60 * 60 * 1000,
    retry: false,
  });

  return (
    <div ref={ref} className="w-full" style={{ maxWidth: props.maxWidth }}>
      {clip ? (
        <VideoAttachment
          {...props}
          url={clip.mediaUrl}
          videoWidth={clip.width}
          videoHeight={clip.height}
          thumbnailUrl={clip.previewUrl}
        />
      ) : (
        <div className="flex min-h-32 flex-col items-center justify-center gap-3 rounded-xl p-4 bg-overlay-faint">
          {props.thumbnailUrl && (
            <img
              src={props.thumbnailUrl}
              alt="Clip preview"
              loading="lazy"
              className="max-h-48 rounded-lg object-contain"
            />
          )}
          <p role="status" className="text-sm text-muted">
            {isFetching ? 'Loading clip…' : 'Watch this clip on KLIPY.'}
          </p>
        </div>
      )}
      <ExternalLink
        href={props.url}
        title="Watch clip on KLIPY"
        className="mt-1 inline-block text-xs text-link"
      >
        View on KLIPY
      </ExternalLink>
    </div>
  );
}

export function KlipyVideoAttachment(props: Props) {
  return isKlipyClipPageUrl(props.url) ? (
    <KlipyClipPageVideo {...props} />
  ) : (
    <VideoAttachment {...props} />
  );
}
