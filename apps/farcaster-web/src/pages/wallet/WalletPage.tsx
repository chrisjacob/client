import { CopyIcon, ExternalLinkIcon, ShieldCheckIcon } from 'lucide-react';
import { memo, useCallback, useState } from 'react';
import { formatUnits } from 'viem';
import { base } from 'viem/chains';
import { useAccount, useBalance, useDisconnect } from 'wagmi';

import { BorderedMainContent } from '~/components/BorderedMainContent';
import { DefaultButton } from '~/components/forms/buttons/DefaultButton';
import { Page } from '~/components/page/Page';
import { PageHeader } from '~/components/page/PageHeader';
import { PageTitle } from '~/components/page/PageTitle';
import { SettingsPageContent } from '~/components/page/SettingsPageContent';
import { useWallet } from '~/contexts/WalletProvider';
import { forkConfig } from '~/fork/config';
import { useExternalSolanaWallet } from '~/hooks/wallet/useExternalSolanaWallet';

const shortAddress = (address: string) =>
  `${address.slice(0, 6)}…${address.slice(-4)}`;

function CopyAddressButton({ address }: { address: string }) {
  const [copied, setCopied] = useState(false);
  const copy = useCallback(async () => {
    await navigator.clipboard.writeText(address);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }, [address]);

  return (
    <button
      type="button"
      onClick={copy}
      className="flex items-center gap-1 text-sm text-muted hover:text-default"
    >
      <CopyIcon className="size-4" />
      {copied ? 'Copied' : shortAddress(address)}
    </button>
  );
}

const WalletPage = memo(() => {
  const { address, isConnected, chain } = useAccount();
  const { disconnect } = useDisconnect();
  const { openConnectModal } = useWallet();
  const solana = useExternalSolanaWallet();
  const { data: baseBalance, isLoading: isBalanceLoading } = useBalance({
    address,
    chainId: base.id,
    query: { enabled: !!address },
  });

  return (
    <Page meta={{ title: `Wallet / ${forkConfig.brandName}` }}>
      <div className="border-default sm:border-x">
        <PageHeader hideCastButton>
          <div className="flex items-center">
            <PageTitle>Wallet</PageTitle>
          </div>
        </PageHeader>
      </div>
      <BorderedMainContent className="flex flex-row p-6">
        <SettingsPageContent>
          <div className="flex flex-col gap-4">
            <div className="flex gap-3 rounded-2xl border p-4 bg-elevated-nohover border-default">
              <ShieldCheckIcon className="mt-0.5 size-6 shrink-0 text-success" />
              <div>
                <div className="font-semibold text-default">
                  External wallets only
                </div>
                <div className="text-sm text-muted">
                  {forkConfig.brandName} never creates, imports, or stores your
                  recovery phrase or private keys. Every signature is approved
                  in your wallet.
                </div>
              </div>
            </div>

            <section className="rounded-2xl border p-4 bg-surface-secondary border-default">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-default">
                    Ethereum / Base
                  </h2>
                  <p className="text-sm text-muted">
                    Browser wallets and Coinbase Wallet
                    {forkConfig.walletConnectProjectId
                      ? ', plus WalletConnect.'
                      : '.'}
                  </p>
                </div>
                {isConnected && address && (
                  <CopyAddressButton address={address} />
                )}
              </div>
              {isConnected && address ? (
                <div className="flex flex-col gap-3">
                  <div className="rounded-xl p-3 bg-app">
                    <div className="text-xs text-muted">Base balance</div>
                    <div className="text-xl font-semibold text-default">
                      {isBalanceLoading
                        ? 'Loading…'
                        : `${baseBalance ? formatUnits(baseBalance.value, baseBalance.decimals) : '0'} ${baseBalance?.symbol ?? 'ETH'}`}
                    </div>
                    <div className="text-xs text-faint">
                      Connected via {chain?.name ?? 'external wallet'}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <DefaultButton
                      onClick={openConnectModal}
                      variant="secondary"
                    >
                      Switch wallet
                    </DefaultButton>
                    <DefaultButton onClick={() => disconnect()} variant="muted">
                      Disconnect
                    </DefaultButton>
                  </div>
                </div>
              ) : (
                <DefaultButton onClick={openConnectModal}>
                  Connect wallet
                </DefaultButton>
              )}
            </section>

            <section className="rounded-2xl border p-4 bg-surface-secondary border-default">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-default">Solana</h2>
                  <p className="text-sm text-muted">
                    Connect an injected Solana wallet such as Phantom.
                  </p>
                </div>
                {solana.address && (
                  <CopyAddressButton address={solana.address} />
                )}
              </div>
              {solana.address ? (
                <DefaultButton onClick={solana.disconnect} variant="muted">
                  Disconnect Solana
                </DefaultButton>
              ) : (
                <DefaultButton
                  onClick={solana.connect}
                  isLoading={solana.isConnecting}
                >
                  {solana.isInstalled
                    ? 'Connect Solana wallet'
                    : 'Install Phantom'}
                </DefaultButton>
              )}
            </section>

            <section className="rounded-2xl border p-4 bg-surface-secondary border-default">
              <h2 className="font-semibold text-default">
                Moving an existing Farcaster wallet
              </h2>
              <p className="mb-3 text-sm text-muted">
                Use Farcaster’s official export flow, then import directly into
                the external wallet you trust. {forkConfig.brandName} never sees
                the phrase or key.
              </p>
              <a
                href={forkConfig.walletExportUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center gap-1 text-sm font-semibold text-action-purple"
              >
                Open official export flow
                <ExternalLinkIcon className="size-4" />
              </a>
            </section>
          </div>
        </SettingsPageContent>
      </BorderedMainContent>
    </Page>
  );
});

WalletPage.displayName = 'WalletPage';

export { WalletPage };
