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
          10X.Social uses Farcaster services for your account. To request help
          deleting your Farcaster account, contact{' '}
          <ExternalLink
            href="mailto:support+deleteaccount@neynar.com"
            title="Email Support"
          >
            support+deleteaccount@neynar.com
          </ExternalLink>{' '}
          with the subject &quot;Delete account&quot;.
        </Para>
        <Para>
          Please include the username associated with your account in the body
          of the email.
        </Para>
        <Para>
          The email must be from the same email associated with the account.
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
            href="https://app.10x.meme/privacy"
            title="10X Privacy Policy"
          >
            10X Privacy Policy
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
