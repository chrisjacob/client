import React from 'react';

import { ExternalLink } from '~/components/links/ExternalLink';
import { StandalonePage } from '~/components/page/StandalonePage';
import { H1 } from '~/components/text/H1';
import { Para } from '~/components/text/Para';

const PrivacyPolicyPage: React.FC = React.memo(() => {
  return (
    <StandalonePage meta={{ title: '10X.Social Privacy' }}>
      <div className="py-4">
        <H1>10X.Social Privacy</H1>
        <Para>
          10X.Social is an independent web client operated by{' '}
          {'{{legalEntity}}'} that connects to Farcaster application services
          and the Farcaster protocol.
        </Para>
        <Para>
          Using the client can involve processing information in your browser,
          through our infrastructure, and by upstream providers. The client uses
          browser storage for sessions and preferences and can send usage
          information to analytics services. Public social posts, private
          account information, and blockchain records have different visibility
          and handling. Removing information from one service does not guarantee
          its removal from independent third-party systems.
        </Para>
        <Para>
          Read the published{' '}
          <ExternalLink
            href="https://app.10x.meme/privacy"
            title="Read the full 10X Privacy Policy (opens in a new tab)"
            className="underline"
          >
            10X Privacy Policy
          </ExternalLink>{' '}
          for information about our privacy practices, your rights, and how to
          make a privacy request. Independent providers may also process
          information under their own policies.
        </Para>
        <Para>
          This page provides a brief explanation of the client relationship. For
          questions about 10X.Social, contact{' '}
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

PrivacyPolicyPage.displayName = 'PrivacyPolicyPage';

export { PrivacyPolicyPage };
