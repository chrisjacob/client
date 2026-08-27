import { createConnector, type CreateConnectorFn } from '@wagmi/core';
import type WalletConnectProvider from '@walletconnect/ethereum-provider';
import { getAddress } from 'viem';

type WalletConnectParameters = {
  projectId: string;
  showQrModal?: boolean;
  metadata: {
    name: string;
    description: string;
    url: string;
    icons: string[];
  };
};

/**
 * Small WalletConnect adapter kept in the fork boundary to avoid importing the
 * @wagmi/connectors barrel. That barrel currently pulls a Coinbase SDK which
 * requires a newer viem release than the Farcaster client pins.
 */
export function walletConnectConnector(
  parameters: WalletConnectParameters,
): CreateConnectorFn<WalletConnectProvider> {
  let providerPromise: Promise<WalletConnectProvider> | undefined;

  return createConnector((config) => ({
    id: 'walletConnect',
    name: 'WalletConnect',
    type: 'walletConnect',

    async connect({ chainId, withCapabilities } = {}) {
      const provider = (await this.getProvider()) as WalletConnectProvider;
      const targetChainId = chainId ?? config.chains[0]?.id;
      if (!targetChainId) {
        throw new Error('No supported chain is configured.');
      }

      if (!provider.session) {
        await provider.connect({
          chains: [targetChainId],
          optionalChains: config.chains
            .filter((chain) => chain.id !== targetChainId)
            .map((chain) => chain.id),
        });
      }

      const accounts = (await provider.enable()).map((account: string) =>
        getAddress(account),
      );

      provider.on('accountsChanged', this.onAccountsChanged.bind(this));
      provider.on('chainChanged', this.onChainChanged.bind(this));
      provider.on('disconnect', this.onDisconnect.bind(this));
      provider.on('session_delete', () => config.emitter.emit('disconnect'));

      return {
        accounts: (withCapabilities
          ? accounts.map((account: `0x${string}`) => ({
              address: account,
              capabilities: {},
            }))
          : accounts) as never,
        chainId: provider.chainId,
      };
    },

    async disconnect() {
      const provider = (await this.getProvider()) as WalletConnectProvider;
      await provider.disconnect().catch((error: unknown) => {
        if (
          !(error instanceof Error) ||
          !error.message.includes('No matching key')
        ) {
          throw error;
        }
      });
    },

    async getAccounts() {
      const provider = (await this.getProvider()) as WalletConnectProvider;
      return provider.accounts.map((account: string) => getAddress(account));
    },

    async getChainId() {
      const provider = (await this.getProvider()) as WalletConnectProvider;
      return provider.chainId;
    },

    async getProvider(): Promise<WalletConnectProvider> {
      const firstChain = config.chains[0];
      if (!firstChain) {
        throw new Error('No supported chain is configured.');
      }
      providerPromise ??= import('@walletconnect/ethereum-provider').then(
        async ({ EthereumProvider }) =>
          EthereumProvider.init({
            projectId: parameters.projectId,
            metadata: parameters.metadata,
            showQrModal: parameters.showQrModal ?? true,
            optionalChains: [
              firstChain.id,
              ...config.chains.slice(1).map((chain) => chain.id),
            ],
            disableProviderPing: true,
          }),
      );
      return providerPromise;
    },

    async isAuthorized() {
      try {
        return (await this.getAccounts()).length > 0;
      } catch {
        return false;
      }
    },

    onAccountsChanged(accounts) {
      if (accounts.length === 0) {
        this.onDisconnect();
        return;
      }
      config.emitter.emit('change', {
        accounts: accounts.map((account) => getAddress(account)),
      });
    },

    onChainChanged(chainId) {
      config.emitter.emit('change', { chainId: Number(chainId) });
    },

    onDisconnect() {
      config.emitter.emit('disconnect');
    },
  }));
}
