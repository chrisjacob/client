import React from 'react';

import { ExternalLink } from '~/components/links/ExternalLink';
import { StandalonePage } from '~/components/page/StandalonePage';
import { H1 } from '~/components/text/H1';
import { Para } from '~/components/text/Para';

const DeleteAccountPage: React.FC = React.memo(() => {
  return (
    <StandalonePage meta={{ title: 'Delete Your Account' }}>
      <div className="py-4">
        <H1>Delete your account</H1>
        <Para>
          10X.Social uses Farcaster services for your account. For requests
          concerning your Farcaster account or information held by its
          application services, use the current contact details and procedures
          in the{' '}
          <ExternalLink
            href="https://farcaster.xyz/~/privacy-policy"
            title="Farcaster privacy notice"
          >
            Farcaster privacy notice
          </ExternalLink>
          . Leaving 10X.Social does not automatically delete your Farcaster
          account.
        </Para>
        <Para>
          Farcaster handles requests concerning information held by its services
          under its own policies. Removing an account does not guarantee removal
          of public posts, blockchain records, or copies held by independent
          third parties.
        </Para>
        <Para>
          For privacy requests concerning information held by 10X, read the{' '}
          <ExternalLink
            href="https://app.10x.meme/privacy#10x-social"
            title="10X.Social privacy section"
          >
            10X.Social privacy section
          </ExternalLink>
          . Signing out or clearing browser data is different from requesting
          deletion of an account or information held by a service provider.
        </Para>
      </div>
    </StandalonePage>
  );
});

DeleteAccountPage.displayName = 'DeleteAccountPage';

export { DeleteAccountPage };
