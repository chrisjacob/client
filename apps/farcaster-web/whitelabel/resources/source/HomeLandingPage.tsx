import { AnalyticsEvent } from 'farcaster-analytics';
import React, { useEffect, useState } from 'react';

import { ExternalLink } from '~/components/links/ExternalLink';
import { Link } from '~/components/links/Link';
import { LoginWithMobile } from '~/components/login/LoginWithMobile';
import { LogoBrandContextMenu } from '~/components/LogoBrandContextMenu';
import { LoginModal } from '~/components/modals/LoginModal';
import { Page } from '~/components/page/Page';
import { useAnalytics } from '~/contexts/AnalyticsProvider';
import { forkConfig } from '~/fork/config';
import { whiteLabel } from '~/fork/whiteLabel';
import { isMobile } from '~/utils/navigatorUtils';
import { createUUID } from '~/utils/uuidUtils';

function LandingBackground() {
  const [playVideo, setPlayVideo] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const reducedData = window.matchMedia('(prefers-reduced-data: reduce)');
    const desktopViewport = window.matchMedia('(min-width: 1024px)');
    const connection = (
      navigator as Navigator & {
        connection?: EventTarget & { saveData?: boolean };
      }
    ).connection;
    const syncPreference = () => {
      setIsDesktop(desktopViewport.matches);
      setPlayVideo(
        !reducedMotion.matches &&
          !reducedData.matches &&
          connection?.saveData !== true,
      );
    };

    syncPreference();
    reducedMotion.addEventListener('change', syncPreference);
    reducedData.addEventListener('change', syncPreference);
    desktopViewport.addEventListener('change', syncPreference);
    connection?.addEventListener('change', syncPreference);
    return () => {
      reducedMotion.removeEventListener('change', syncPreference);
      reducedData.removeEventListener('change', syncPreference);
      desktopViewport.removeEventListener('change', syncPreference);
      connection?.removeEventListener('change', syncPreference);
    };
  }, []);

  const videoSrc = isDesktop
    ? '/brand/landing-video-desktop.mp4'
    : '/brand/landing-video.mp4';
  const videoFade = isDesktop
    ? 'linear-gradient(to bottom, black 0%, transparent 65%)'
    : 'linear-gradient(to bottom, black 0%, black 50%, transparent 100%)';

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 top-0 w-full select-none overflow-hidden"
      style={{
        height: 'min(100vw, 100dvh)',
        maskImage: videoFade,
        WebkitMaskImage: videoFade,
      }}
    >
      {playVideo ? (
        <video
          key={videoSrc}
          src={videoSrc}
          poster="/brand/landing-video-poster.webp"
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          tabIndex={-1}
          className="absolute inset-0 size-full object-cover object-top opacity-25"
        />
      ) : (
        <img
          src="/brand/landing-video-poster.webp"
          alt=""
          className="absolute inset-0 size-full object-cover object-top opacity-25"
        />
      )}
      <div
        className="absolute inset-x-0 bottom-0 h-1/2"
        style={{
          background:
            'linear-gradient(to top, rgba(0, 0, 0, 0.95) 0%, rgba(0, 0, 0, 0) 100%)',
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background: isDesktop
            ? 'radial-gradient(circle at top, rgba(0, 255, 0, 0.2), rgba(0, 0, 0, 0.88) 42%)'
            : 'radial-gradient(circle at top, rgba(0, 255, 0, 0.2), rgba(0, 0, 0, 0.88) 62%)',
        }}
      />
    </div>
  );
}

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
  const { dangerouslyTrackPreAuthEvent } = useAnalytics();
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [mobile] = useState(isMobile);
  const [directChannelId, setDirectChannelId] = useState(createUUID);
  const closeLogin = () => {
    setIsLoggingIn(false);
    setDirectChannelId(createUUID());
  };
  const directLoginUrl = `https://farcaster.xyz/login-web?${new URLSearchParams(
    {
      'channel-id': directChannelId,
    },
  )}`;
  const copyrightEntity = '{{legalEntity}}'.replace(/\.$/, '');

  return (
    <Page className="bg-black" meta={{ title: forkConfig.brandName }}>
      <div
        className="relative isolate flex min-h-dvh w-full flex-col overflow-hidden px-6 py-8 [--landing-gradient-end:100%] sm:p-[60px] lg:[--landing-gradient-end:60%]"
        style={{
          background:
            'linear-gradient(180deg, #0b5a1e 0%, #000000 var(--landing-gradient-end))',
        }}
      >
        <LandingBackground />
        <header className="relative z-10 flex shrink-0 items-center">
          <LogoBrandContextMenu>
            <FullLogo />
          </LogoBrandContextMenu>
        </header>

        <main className="relative z-10 flex flex-1 items-center justify-center py-14 sm:py-16">
          <div className="w-full max-w-[480px] text-center">
            <h1 className="font-seasonMix text-3xl font-semibold leading-tight text-white sm:text-4xl">
              You're Just One Trade Away...
            </h1>
            <p className="mt-6 text-base leading-relaxed text-white/80">
              The crypto social network you've been looking for.
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

              {mobile ? (
                <ExternalLink
                  href={directLoginUrl}
                  title="Log in with Farcaster"
                  className="w-full rounded-full border border-transparent bg-white/20 px-9 py-3 text-base text-white transition-colors hover:border-white/20 hover:bg-white/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#00FD00]"
                  onClick={() => {
                    // Keep this tab waiting on the exact channel opened by the link.
                    setIsLoggingIn(true);
                  }}
                >
                  Log in with Farcaster
                </ExternalLink>
              ) : (
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
              )}
              {mobile && isLoggingIn && (
                <LoginWithMobile
                  initialChannelId={directChannelId}
                  presentation="app-link"
                  onClose={closeLogin}
                />
              )}
            </div>
          </div>
        </main>

        <footer className="relative z-10 flex shrink-0 flex-col items-center justify-between gap-4 text-sm sm:flex-row sm:gap-6">
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

      {!mobile && isLoggingIn && <LoginModal onClose={closeLogin} />}
    </Page>
  );
}
