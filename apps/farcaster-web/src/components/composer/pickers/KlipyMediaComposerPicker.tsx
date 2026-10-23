import classNames from 'classnames';
import React from 'react';

import { showComposerAttachmentLimitToast } from '~/components/composer/composerAttachmentLimitToast';
import { DefaultButton } from '~/components/forms/buttons/DefaultButton';
import { SearchInput } from '~/components/forms/SearchInput';
import { LoadingIndicator } from '~/components/loaders/LoadingIndicator';
import { AnchoredPopover } from '~/components/popovers/AnchoredPopover';
import {
  type KlipyMediaItem,
  type KlipyMediaType,
  registerKlipyShare,
  searchKlipyMedia,
} from '~/fork/klipy';
import { trackError } from '~/utils/errorUtils';
import { toast } from '~/utils/toast';

const SEARCH_DEBOUNCE_MS = 300;

const mediaTabs: { label: string; type: KlipyMediaType }[] = [
  { label: 'GIFs', type: 'gif' },
  { label: 'Stickers', type: 'sticker' },
  { label: 'Clips', type: 'clip' },
  { label: 'Memes', type: 'meme' },
  { label: 'AI Emoji', type: 'emoji' },
];

type KlipyMediaComposerPickerProps = {
  disabled: boolean;
  getRemainingEmbedsCount: () => number;
  castEmbedLimit: number;
  onMediaSelect: ({ item }: { item: KlipyMediaItem }) => void | Promise<void>;
  className?: string;
};

const KlipyMediaComposerPicker: React.FC<KlipyMediaComposerPickerProps> = ({
  disabled,
  getRemainingEmbedsCount,
  castEmbedLimit,
  onMediaSelect,
  className,
}) => {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const [type, setType] = React.useState<KlipyMediaType>('gif');
  const [results, setResults] = React.useState<KlipyMediaItem[]>([]);
  const [next, setNext] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [selectedId, setSelectedId] = React.useState<string>();
  const [error, setError] = React.useState<string>();

  React.useEffect(() => {
    if (!open) {
      return;
    }

    const abortController = new AbortController();
    const timeout = window.setTimeout(() => {
      setLoading(true);
      setError(undefined);
      void searchKlipyMedia({
        query,
        type,
        signal: abortController.signal,
      })
        .then((response) => {
          setResults(response.results);
          setNext(response.next);
        })
        .catch((cause: unknown) => {
          if (cause instanceof DOMException && cause.name === 'AbortError') {
            return;
          }
          trackError(cause);
          setResults([]);
          setNext('');
          setError(
            cause instanceof Error
              ? cause.message
              : 'KLIPY search is temporarily unavailable.',
          );
        })
        .finally(() => {
          if (!abortController.signal.aborted) {
            setLoading(false);
          }
        });
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timeout);
      abortController.abort();
    };
  }, [open, query, type]);

  const loadMore = React.useCallback(async () => {
    if (!next || loadingMore) {
      return;
    }

    setLoadingMore(true);
    setError(undefined);
    try {
      const response = await searchKlipyMedia({
        query,
        type,
        position: next,
      });
      setResults((current) => [
        ...current,
        ...response.results.filter(
          (item) => !current.some((existing) => existing.id === item.id),
        ),
      ]);
      setNext(response.next);
    } catch (cause) {
      trackError(cause);
      setError('Could not load more KLIPY media.');
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, next, query, type]);

  const selectMedia = React.useCallback(
    async (item: KlipyMediaItem) => {
      if (getRemainingEmbedsCount() <= 0) {
        showComposerAttachmentLimitToast({ castEmbedLimit });
        return;
      }

      setSelectedId(item.id);
      try {
        await onMediaSelect({ item });
        void registerKlipyShare({
          id: item.id,
          query,
          type: item.type,
          slug: item.shareSlug,
        }).catch(trackError);
        setOpen(false);
      } catch (cause) {
        trackError(cause);
        toast({
          message:
            cause instanceof Error
              ? cause.message
              : 'The selected KLIPY media could not be attached.',
          type: 'error',
          toastId: 'klipy-media-attach-failed',
        });
      } finally {
        setSelectedId(undefined);
      }
    },
    [castEmbedLimit, getRemainingEmbedsCount, onMediaSelect, query],
  );

  const trigger = (
    <DefaultButton
      title="KLIPY media"
      aria-label="Add GIF, sticker, clip, meme, or emoji"
      variant="muted"
      className={classNames('border-0 text-muted', className)}
      disabled={disabled}
      onClick={() => {
        if (getRemainingEmbedsCount() <= 0) {
          showComposerAttachmentLimitToast({ castEmbedLimit });
        }
      }}
    >
      <span className="text-xs font-bold leading-4">GIF</span>
    </DefaultButton>
  );

  return (
    <AnchoredPopover
      open={open}
      onOpenChange={(nextOpen) => {
        if (nextOpen && getRemainingEmbedsCount() <= 0) {
          showComposerAttachmentLimitToast({ castEmbedLimit });
          return;
        }
        setOpen(nextOpen);
      }}
      trigger={trigger}
      contentClassName="z-30 w-[min(380px,calc(100vw-16px))] overflow-hidden rounded-xl border shadow-lg bg-app border-default"
    >
      <div className="flex max-h-[min(540px,var(--radix-popover-content-available-height))] flex-col">
        <div className="border-b p-3 border-default">
          <SearchInput
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onClear={() => setQuery('')}
            placeholder="Search KLIPY"
            showFilterIcon={false}
            variant="muted"
          />
          <div
            className="scrollbar-horiz mt-2 flex gap-1 overflow-x-auto"
            role="tablist"
            aria-label="KLIPY media type"
          >
            {mediaTabs.map((tab) => (
              <button
                key={tab.type}
                type="button"
                role="tab"
                aria-selected={type === tab.type}
                className={classNames(
                  'shrink-0 rounded-full px-3 py-1 text-xs font-semibold',
                  type === tab.type
                    ? 'text-white bg-action-primary'
                    : 'text-muted bg-tertiary hover:text-default',
                )}
                onClick={() => setType(tab.type)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="scrollbar-vert min-h-40 overflow-y-auto p-2">
          {loading ? (
            <div className="flex h-40 items-center justify-center">
              <LoadingIndicator size="md" />
            </div>
          ) : error && results.length === 0 ? (
            <div className="flex h-40 items-center justify-center px-6 text-center text-sm text-muted">
              {error}
            </div>
          ) : results.length === 0 ? (
            <div className="flex h-40 items-center justify-center text-sm text-muted">
              No {mediaTabs.find((tab) => tab.type === type)?.label} found
            </div>
          ) : (
            <>
              <div className="columns-2 gap-2">
                {results.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className="focus:outline-hidden focus:ring-action-primary relative mb-2 block w-full break-inside-avoid overflow-hidden rounded-lg bg-tertiary focus:ring-2"
                    title={item.title}
                    aria-label={`Attach ${type}: ${item.title}`}
                    disabled={typeof selectedId !== 'undefined'}
                    onClick={() => void selectMedia(item)}
                  >
                    {item.previewKind === 'video' ? (
                      <video
                        src={item.previewUrl}
                        aria-label={item.title}
                        autoPlay
                        loop
                        muted
                        playsInline
                        className="h-auto w-full"
                        width={item.width}
                        height={item.height}
                      />
                    ) : (
                      <img
                        src={item.previewUrl}
                        alt={item.title}
                        loading="lazy"
                        className="h-auto w-full"
                        width={item.width}
                        height={item.height}
                      />
                    )}
                    {selectedId === item.id && (
                      <div className="absolute inset-0 flex items-center justify-center bg-overlay">
                        <LoadingIndicator
                          size="md"
                          containerClassName="text-white"
                        />
                      </div>
                    )}
                  </button>
                ))}
              </div>
              {next && (
                <DefaultButton
                  type="button"
                  variant="muted"
                  size="sm-tall"
                  className="mt-1 w-full"
                  isLoading={loadingMore}
                  disabled={loadingMore || typeof selectedId !== 'undefined'}
                  onClick={() => void loadMore()}
                >
                  Load more
                </DefaultButton>
              )}
              {error && (
                <div className="mt-2 text-center text-xs text-danger">
                  {error}
                </div>
              )}
            </>
          )}
        </div>

        <div className="border-t px-3 py-2 text-right text-[11px] font-semibold border-default text-faint">
          Powered by KLIPY
        </div>
      </div>
    </AnchoredPopover>
  );
};

export { KlipyMediaComposerPicker };
