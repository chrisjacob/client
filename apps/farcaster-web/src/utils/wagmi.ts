import { injected } from '@wagmi/core';
import { robinhood } from 'farcaster-client-data';
import { bsc, degen, monadTestnet, unichain } from 'viem/chains';
import { Config, createConfig, http, Transport } from 'wagmi';
import {
  arbitrum,
  arbitrumSepolia,
  base,
  baseSepolia,
  celo,
  gnosis,
  mainnet,
  optimism,
  optimismSepolia,
  polygon,
  sepolia,
  zora,
} from 'wagmi/chains';

import { forkConfig } from '~/fork/config';
import { walletConnectConnector } from '~/fork/walletConnectConnector';

const chains = [
  arbitrum,
  arbitrumSepolia,
  base,
  baseSepolia,
  degen,
  gnosis,
  optimism,
  optimismSepolia,
  polygon,
  zora,
  unichain,
  monadTestnet,
  celo,
  sepolia,
  mainnet,
  bsc,
  robinhood,
] as const;

const transports = chains.reduce(
  (acc, chain) => {
    acc[chain.id] = http();
    return acc;
  },
  {} as Record<number, Transport>,
);

const connectors = [
  injected({ shimDisconnect: true }),
  ...(forkConfig.walletConnectProjectId
    ? [
        walletConnectConnector({
          projectId: forkConfig.walletConnectProjectId,
          showQrModal: true,
          metadata: {
            name: forkConfig.brandName,
            description: 'External wallet connection for 10X Social',
            url: forkConfig.canonicalUrl,
            icons: [`${forkConfig.canonicalUrl}${forkConfig.walletIconPath}`],
          },
        }),
      ]
    : []),
];

const wagmiConfig: Config = createConfig({
  chains,
  transports,
  connectors,
  multiInjectedProviderDiscovery: true,
});

export { wagmiConfig };
