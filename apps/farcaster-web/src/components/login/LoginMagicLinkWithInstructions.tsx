import classNames from 'classnames';
import { AnalyticsEvent } from 'farcaster-analytics';
import { useFarcasterApiClient } from 'farcaster-client-hooks';
import { FC, memo, useCallback, useState } from 'react';

import { TextInput } from '~/components/forms/TextInput';
import { useAnalytics } from '~/contexts/AnalyticsProvider';
import { isEmailValid } from '~/utils/emailUtils';

type LoginMagicLinkWithInstructionsProps = {
  onClose: () => void;
};

const LoginMagicLinkWithInstructions: FC<LoginMagicLinkWithInstructionsProps> =
  memo(({ onClose }) => {
    const { trackEvent } = useAnalytics();
    const [email, setEmail] = useState<string>('');
    const { apiClient } = useFarcasterApiClient();

    const [error, setError] = useState<string>();
    const [success, setSuccess] = useState<boolean>();
    const [attemptingLogin, setAttemptingLogin] = useState<boolean>(false);

    const login = useCallback(async () => {
      const normalizedEmail = email.trim();
      if (!isEmailValid(normalizedEmail)) {
        setSuccess(false);
        setError('Enter a valid email address');
        return;
      }

      try {
        setAttemptingLogin(true);
        setSuccess(false);
        setError(undefined);
        trackEvent(AnalyticsEvent.ClickedSendMagicLink, {});
        await apiClient.initiateMagicLink({
          email: normalizedEmail,
          source: 'web',
        });

        setEmail(normalizedEmail);
        setSuccess(true);
      } catch {
        setError(
          "We couldn't send the email. Check the address and try again.",
        );
      } finally {
        setAttemptingLogin(false);
      }
    }, [apiClient, email, trackEvent]);

    return (
      <>
        <div className="flex flex-col space-y-3 px-8 py-12">
          <h3 className="font-seasonMix text-3xl font-semibold text-light">
            Log in with email
          </h3>
          <div className="text-light">
            Enter your email address to receive a link.
          </div>
          <div
            className={classNames(
              'flex w-full grow flex-col space-y-4',
              attemptingLogin && 'animate-pulse',
            )}
          >
            <div className="flex flex-col space-y-2">
              <TextInput
                className="!rounded-[12px] !border-none !bg-[rgba(249,249,249,0.05)] py-4 text-light"
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError(undefined);
                  setSuccess(false);
                }}
                value={email}
                placeholder="satoshin@gmx.com"
                autoFocus={true}
                type="email"
                name="email"
                autoComplete="email"
                inputMode="email"
                spellCheck={false}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !attemptingLogin) {
                    event.preventDefault();
                    void login();
                  }
                }}
              />
              {error && (
                <div className="text-left text-sm text-danger">{error}</div>
              )}
              {success && (
                <div className="rounded-md text-left text-sm text-success">
                  Please check your email
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => void login()}
              disabled={attemptingLogin}
              className="flex w-full items-center justify-center rounded-[300px] bg-[#7959FF] px-[36px] py-[10px] disabled:cursor-wait disabled:opacity-70"
            >
              <div className="text-[16px] text-light">
                {attemptingLogin
                  ? 'Sending...'
                  : (success && 'Resend email') || 'Send email'}
              </div>
            </button>
            <button
              type="button"
              className="landing-btn-secondary-bg flex w-full cursor-pointer items-center justify-center rounded-[300px] px-[36px] py-[10px]"
              onClick={onClose}
            >
              <div className="text-[16px] text-light">Cancel</div>
            </button>
          </div>
        </div>
      </>
    );
  });

LoginMagicLinkWithInstructions.displayName = 'LoginMagicLinkWithInstructions';

export { LoginMagicLinkWithInstructions };
