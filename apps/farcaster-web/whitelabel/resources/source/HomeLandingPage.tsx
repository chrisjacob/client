import { AnalyticsEvent } from 'farcaster-analytics';
import React, { useState } from 'react';

import { Link } from '~/components/links/Link';
import { LogoBrandContextMenu } from '~/components/LogoBrandContextMenu';
import { LoginMagicLinkModal } from '~/components/modals/LoginMagicLinkModal';
import { LoginModal } from '~/components/modals/LoginModal';
import { Page } from '~/components/page/Page';
import { useAnalytics } from '~/contexts/AnalyticsProvider';
import { forkConfig } from '~/fork/config';
import { whiteLabel } from '~/fork/whiteLabel';

function FullLogo() {
  const logoUrl =
    whiteLabel.enabled && whiteLabel.wordmarkUrl
      ? whiteLabel.wordmarkUrl
      : '/brand/wordmark.svg';

  return (
    <img
      src={logoUrl}
      alt={forkConfig.brandName}
      width={95}
      height={40}
      className="h-8 w-auto object-contain sm:h-10"
    />
  );
}

export function HomeLandingPage() {
  const { dangerouslyTrackPreAuthEvent, trackEvent } = useAnalytics();
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isLoggingInWithMagicLink, setIsLoggingInWithMagicLink] =
    useState(false);
  const copyrightEntity = '{{legalEntity}}'.replace(/\.$/, '');

  return (
    <Page className="bg-black" meta={{ title: forkConfig.brandName }}>
      <div
        className="flex min-h-dvh w-full flex-col px-6 py-8 sm:p-[60px]"
        style={{
          background: 'linear-gradient(180deg, #0b5a1e 0%, #000000 100%)',
        }}
      >
        <header className="flex shrink-0 items-center">
          <LogoBrandContextMenu>
            <FullLogo />
          </LogoBrandContextMenu>
        </header>

        <main className="flex flex-1 items-center justify-center py-14 sm:py-16">
          <div className="w-full max-w-[480px] text-center">
            <h1 className="font-seasonMix text-3xl font-semibold leading-tight text-white sm:text-4xl">
              You're Just One Trade Away...
            </h1>
            <p className="mt-6 text-base leading-relaxed text-white/80">
              10X is where Builders, Traders and Attention align. It's the
              crypto social network you've been looking for.
            </p>

            <div className="mt-9 flex flex-col gap-3">
              <Link
                to="signup"
                params={{}}
                searchParams={{}}
                title="Sign up"
                className="flex w-full items-center justify-center rounded-full bg-[#00FD00] px-9 py-3 text-base font-semibold text-black transition-colors hover:bg-[#3bff3b] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
              >
                Sign up
              </Link>

              <div className="flex items-center gap-2 py-2" aria-hidden="true">
                <div className="h-px grow bg-white/40" />
                <span className="text-sm text-white/60">or</span>
                <div className="h-px grow bg-white/40" />
              </div>

              <button
                type="button"
                className="w-full rounded-full border border-transparent bg-white/20 px-9 py-3 text-base text-white transition-colors hover:border-white/20 hover:bg-white/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#00FD00]"
                onClick={() => {
                  trackEvent(AnalyticsEvent.ClickedMagicLink, undefined);
                  setIsLoggingInWithMagicLink(true);
                }}
              >
                Log in with email
              </button>
              <button
                type="button"
                className="w-full rounded-full border border-transparent bg-white/20 px-9 py-3 text-base text-white transition-colors hover:border-white/20 hover:bg-white/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#00FD00]"
                onClick={() => {
                  dangerouslyTrackPreAuthEvent(
                    AnalyticsEvent.ClickedLogin,
                    undefined,
                  );
                  setIsLoggingIn(true);
                }}
              >
                Log in with phone
              </button>
            </div>
          </div>
        </main>

        <footer className="flex shrink-0 flex-col items-center justify-between gap-4 text-sm sm:flex-row sm:gap-6">
          <p className="font-seasonMix text-white/50">
            Copyright © {new Date().getFullYear()} {copyrightEntity}. All rights
            reserved.
          </p>
          <nav
            aria-label="Legal and support"
            className="flex items-center gap-6"
          >
            <Link
              to="support"
              params={{}}
              searchParams={{}}
              title="Support"
              className="font-seasonMix text-white/80 hover:underline"
            >
              Support
            </Link>
            <Link
              to="privacyPolicy"
              params={{}}
              searchParams={{}}
              title="Privacy Policy"
              className="font-seasonMix text-white/80 hover:underline"
            >
              Privacy
            </Link>
            <Link
              to="termsOfUse"
              params={{}}
              searchParams={{}}
              title="Terms of Use"
              className="font-seasonMix text-white/80 hover:underline"
            >
              Terms
            </Link>
          </nav>
        </footer>
      </div>

      {isLoggingIn && <LoginModal onClose={() => setIsLoggingIn(false)} />}
      {isLoggingInWithMagicLink && (
        <LoginMagicLinkModal
          onClose={() => setIsLoggingInWithMagicLink(false)}
        />
      )}
    </Page>
  );
}
