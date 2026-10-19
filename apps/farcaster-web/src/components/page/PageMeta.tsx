import { Helmet } from '@dr.pogodin/react-helmet';
import { useUnseen } from 'farcaster-client-hooks';
import { FC, memo, useEffect } from 'react';

import { useStandaloneMode } from '~/contexts/StandaloneModeProvider';
import { forkConfig } from '~/fork/config';
import { brandPageCanonical, whiteLabel } from '~/fork/whiteLabel';

export type PageMetaProps = {
  title: string;
  description?: string;
  canonical?: string;
  ogImage?: string;
  ogImageWidth?: number;
  ogImageHeight?: number;
  ogType?: 'article' | 'website';
  twitterCard?: 'summary' | 'summary_large_image';
  author?: string;
};

const DEFAULT_DESCRIPTION = whiteLabel.enabled
  ? whiteLabel.description
  : 'A decentralized social network';

const PageMeta: FC<PageMetaProps> = memo(
  ({
    title,
    description = DEFAULT_DESCRIPTION,
    canonical,
    ogImage = whiteLabel.enabled
      ? `${forkConfig.canonicalUrl}/opengraph.png`
      : undefined,
    ogImageWidth,
    ogImageHeight,
    ogType = 'website',
    twitterCard = 'summary',
    author,
  }) => {
    const { notificationsCount } = useUnseen();
    const { setAppBadge, clearAppBadge } = useStandaloneMode();

    // Handle app badge
    useEffect(() => {
      if (notificationsCount !== 0) {
        setAppBadge({ count: notificationsCount });
      } else {
        clearAppBadge();
      }
    }, [clearAppBadge, notificationsCount, setAppBadge]);

    const faviconPath =
      typeof notificationsCount !== 'undefined' && notificationsCount !== 0
        ? '/favicon-notifications-v3.png'
        : '/favicon-v3.png';

    const pageCanonical =
      canonical && whiteLabel.enabled
        ? brandPageCanonical(canonical, forkConfig.canonicalUrl)
        : canonical;

    return (
      <Helmet>
        <title>{title}</title>
        <link rel="icon" href={faviconPath} />

        {/* Standard meta tags */}
        {description && <meta name="description" content={description} />}
        {author && <meta name="author" content={author} />}

        {/* Open Graph */}
        <meta property="og:locale" content="en_US" />
        <meta property="og:title" content={title} />
        {description && (
          <meta property="og:description" content={description} />
        )}
        {ogImage && <meta property="og:image" content={ogImage} />}
        {ogImageWidth && (
          <meta property="og:image:width" content={ogImageWidth.toString()} />
        )}
        {ogImageHeight && (
          <meta property="og:image:height" content={ogImageHeight.toString()} />
        )}
        <meta property="og:type" content={ogType} />
        {pageCanonical && <meta property="og:url" content={pageCanonical} />}
        <meta property="og:site_name" content={forkConfig.brandName} />

        {/* Twitter Card */}
        <meta name="twitter:card" content={twitterCard} />
        <meta name="twitter:title" content={title} />
        {description && (
          <meta name="twitter:description" content={description} />
        )}
        {ogImage && <meta name="twitter:image" content={ogImage} />}
        {(!whiteLabel.enabled || whiteLabel.socialHandle) && (
          <meta
            name="twitter:site"
            content={
              whiteLabel.enabled ? whiteLabel.socialHandle : '@farcaster_xyz'
            }
          />
        )}

        {/* Farcaster-specific */}
        {(!whiteLabel.enabled || whiteLabel.farcasterHandle) && (
          <meta
            name="farcaster:fname"
            content={
              whiteLabel.enabled ? whiteLabel.farcasterHandle : '@farcaster'
            }
          />
        )}

        {/* Links */}
        {pageCanonical && <link rel="canonical" href={pageCanonical} />}
        <link
          rel="sitemap"
          href={`${forkConfig.canonicalUrl}/sitemap.xml`}
          type="application/xml"
        />
      </Helmet>
    );
  },
);

PageMeta.displayName = 'PageMeta';

export { PageMeta };
