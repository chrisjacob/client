import classNames from 'classnames';
import React, { FC, memo } from 'react';

import { ExternalLink } from '~/components/links/ExternalLink';
import { LoginQRCode } from '~/lazy/components';
import { isMobile } from '~/utils/navigatorUtils';

type LoginQRCodeWithInstructionsProps = {
  channelId: string;
  onClose: () => void;
  attemptingLogin: boolean;
};

const LoginQRCodeWithInstructions: FC<LoginQRCodeWithInstructionsProps> = memo(
  ({ channelId, onClose, attemptingLogin }) => {
    const mobile = isMobile();
    // Match the QR destination, retaining the official mobile app association.
    const loginUrl = `https://farcaster.xyz/login-web?${new URLSearchParams({
      'channel-id': channelId,
    })}`;
    const qrCode = (
      <div className="flex w-full justify-center">
        <div
          className={classNames(
            'relative mt-2 flex justify-center',
            attemptingLogin && 'animate-pulse',
          )}
        >
          <LoginQRCode channelId={channelId} />
        </div>
      </div>
    );

    return (
      <div className="flex flex-col space-y-4 p-6">
        <h3 className="font-seasonMix text-3xl font-semibold text-light">
          Log in with Farcaster
        </h3>
        {mobile ? (
          <>
            <p className="text-light">
              Open the Farcaster app on this phone and approve the login. Then
              return to this browser tab to finish logging in to 10X.
            </p>
            {/* ExternalLink opens separately, preserving this pending channel. */}
            <ExternalLink
              href={loginUrl}
              title="Open the Farcaster app to approve login"
              className="flex w-full items-center justify-center rounded-full px-5 py-3 text-center font-semibold bg-action-primary text-light"
            >
              Open Farcaster to log in
            </ExternalLink>
            <p className="text-sm text-muted">
              You need the Farcaster mobile app. Keep this tab open while you
              approve the request.
            </p>
            <details className="w-full">
              <summary className="cursor-pointer text-sm text-link">
                Use a QR code instead
              </summary>
              {qrCode}
            </details>
          </>
        ) : (
          <>
            {qrCode}
            <p className="text-light">
              Scan this QR code with your phone&apos;s camera, then approve the
              login in the Farcaster mobile app. Keep this browser tab open.
            </p>
          </>
        )}
        {attemptingLogin && (
          <p role="status" className="text-sm text-muted">
            Finishing login&hellip;
          </p>
        )}
        <button
          type="button"
          onClick={onClose}
          className="landing-btn-secondary-bg flex w-full items-center justify-center rounded-full px-6 py-3 text-light"
        >
          Cancel
        </button>
      </div>
    );
  },
);

LoginQRCodeWithInstructions.displayName = 'LoginQRCodeWithInstructions';

export { LoginQRCodeWithInstructions };
