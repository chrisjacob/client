import React from 'react';

import { ExternalLink } from '~/components/links/ExternalLink';
import { StandalonePage } from '~/components/page/StandalonePage';
import { H1 } from '~/components/text/H1';
import { Para } from '~/components/text/Para';

const TermsOfUsePage: React.FC = React.memo(() => {
  return (
    <StandalonePage meta={{ title: '10X.Social Terms' }}>
      <div className="py-4">
        <H1>10X.Social Terms</H1>
        <Para>
          10X.Social is an independent web client operated by{' '}
          {'{{legalEntity}}'} that connects to Farcaster application services
          and the Farcaster protocol. Using those services does not imply that
          their providers sponsor or endorse 10X.Social. You must be at least 18
          years old to use 10X.Social.
        </Para>
        <Para>
          Read the published{' '}
          <ExternalLink
            href="https://app.10x.meme/terms"
            title="Read the full 10X Terms of Service (opens in a new tab)"
            className="underline"
          >
            10X Terms of Service
          </ExternalLink>{' '}
          for service conditions, eligibility, user-content rules, and other
          terms. Your use of independent third-party services is also subject to
          their applicable terms and policies.
        </Para>
        <Para>
          See the{' '}
          <ExternalLink
            href="https://app.10x.meme/terms#10x-social"
            title="10X.Social terms section (opens in a new tab)"
            className="underline"
          >
            10X.Social terms section
          </ExternalLink>{' '}
          for client-specific terms, and the{' '}
          <ExternalLink
            href="https://farcaster.xyz/~/terms-of-use"
            title="Farcaster Terms of Use (opens in a new tab)"
            className="underline"
          >
            Farcaster Terms of Use
          </ExternalLink>{' '}
          for upstream application services.
        </Para>
        <Para>
          Access to features depends on supported authentication, permissions,
          and upstream availability. Social-account sessions, wallet
          connections, and transaction signing involve different permissions;
          review authorizations before granting them. Public posts may be
          distributed beyond 10X.Social, and removing content or ending access
          here does not guarantee removal elsewhere.
        </Para>
        <Para>
          For information about data handling, read the{' '}
          <ExternalLink
            href="https://app.10x.meme/privacy"
            title="Read the full 10X Privacy Policy (opens in a new tab)"
            className="underline"
          >
            10X Privacy Policy
          </ExternalLink>
          . For questions about 10X.Social, contact{' '}
          <ExternalLink
            href="mailto:{{contactEmail}}"
            title="Contact 10X.Social"
            className="underline"
          >
            {'{{contactEmail}}'}
          </ExternalLink>
          .
        </Para>
      </div>
    </StandalonePage>
  );
});

TermsOfUsePage.displayName = 'TermsOfUsePage';

export { TermsOfUsePage };
