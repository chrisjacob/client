import React from 'react';

import { ExternalLink } from '~/components/links/ExternalLink';
import { Link } from '~/components/links/Link';
import { StandalonePage } from '~/components/page/StandalonePage';
import { H1 } from '~/components/text/H1';
import { H2 } from '~/components/text/H2';
import { Para } from '~/components/text/Para';

const SupportPage: React.FC = React.memo(() => {
  return (
    <StandalonePage meta={{ title: '10X Support' }}>
      <div className="py-4">
        <H1>Support</H1>
        <H2>Important Links</H2>
        <Para>
          <Link
            to="privacyPolicy"
            params={{}}
            searchParams={{}}
            title="Privacy Policy"
          >
            Privacy Policy
          </Link>
        </Para>
        <Para>
          <Link
            to="termsOfUse"
            params={{}}
            searchParams={{}}
            title="Terms of Use"
          >
            Terms of Use
          </Link>
        </Para>
        <H2>How is my data used?</H2>
        <Para>
          Using 10X.Social can involve processing information in your browser,
          through our infrastructure, and by upstream providers. The client uses
          browser storage for sessions and preferences. The inherited PostHog
          analytics integration is disabled in this white-label client.
          Cloudflare Web Analytics remains enabled to measure visits and
          technical performance, including before login. Read the Privacy Policy
          for information about data handling and privacy requests.
        </Para>
        <H2>
          Is my data shared with or sold to 3rd parties for advertising or
          tracking purposes?
        </H2>
        <Para>
          The client connects to independent services, including upstream
          application and analytics providers. Read the Privacy Policy and the
          relevant providers' policies for information about sharing and use.
        </Para>
        <H2>How do I delete my account?</H2>
        <Para>
          Read the{' '}
          <Link
            to="supportDeleteAccount"
            params={{}}
            searchParams={{}}
            title="Account deletion information"
          >
            account deletion information
          </Link>{' '}
          for the distinction between Farcaster account requests, 10X privacy
          requests, and clearing local browser data.
        </Para>
        <H2>Privacy, abuse, and moderation requests</H2>
        <Para>
          Read the{' '}
          <ExternalLink
            href="https://app.10x.meme/privacy#10x-social"
            title="10X.Social privacy section"
          >
            10X.Social privacy section
          </ExternalLink>{' '}
          and{' '}
          <ExternalLink
            href="https://app.10x.meme/terms#10x-social"
            title="10X.Social terms section"
          >
            10X.Social terms section
          </ExternalLink>{' '}
          for the relevant request and reporting channels. Do not send
          passwords, authentication tokens, private keys, or seed phrases.
        </Para>
        <H2>Contact us</H2>
        <Para>
          If you need to contact support, please send an email to{' '}
          <ExternalLink href="mailto:support@10x.meme" title="Email Support">
            support@10x.meme
          </ExternalLink>
          .
        </Para>
      </div>
    </StandalonePage>
  );
});

SupportPage.displayName = 'SupportPage';

export { SupportPage };
