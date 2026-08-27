import { useCallback, useEffect, useMemo, useState } from 'react';

type SolanaPublicKey = { toString: () => string };

type InjectedSolanaProvider = {
  isConnected?: boolean;
  publicKey?: SolanaPublicKey | null;
  connect: () => Promise<{ publicKey?: SolanaPublicKey }>;
  disconnect?: () => Promise<void>;
  on?: (
    event: 'connect' | 'disconnect' | 'accountChanged',
    callback: () => void,
  ) => void;
  off?: (
    event: 'connect' | 'disconnect' | 'accountChanged',
    callback: () => void,
  ) => void;
};

type SolanaWindow = Window & {
  phantom?: { solana?: InjectedSolanaProvider };
  solana?: InjectedSolanaProvider;
};

const getInjectedProvider = (): InjectedSolanaProvider | undefined => {
  if (typeof window === 'undefined') {
    return undefined;
  }
  const solanaWindow = window as SolanaWindow;
  return solanaWindow.phantom?.solana ?? solanaWindow.solana;
};

const readAddress = (provider?: InjectedSolanaProvider) =>
  provider?.publicKey?.toString();

/**
 * Thin Solana browser-wallet adapter. It never receives or stores key material;
 * signing remains inside the installed wallet extension.
 */
export function useExternalSolanaWallet() {
  const provider = useMemo(getInjectedProvider, []);
  const [address, setAddress] = useState<string | undefined>(() =>
    readAddress(provider),
  );
  const [isConnecting, setIsConnecting] = useState(false);

  const refresh = useCallback(() => {
    setAddress(readAddress(provider));
  }, [provider]);

  useEffect(() => {
    provider?.on?.('connect', refresh);
    provider?.on?.('disconnect', refresh);
    provider?.on?.('accountChanged', refresh);
    return () => {
      provider?.off?.('connect', refresh);
      provider?.off?.('disconnect', refresh);
      provider?.off?.('accountChanged', refresh);
    };
  }, [provider, refresh]);

  const connect = useCallback(async () => {
    if (!provider) {
      window.open(
        'https://phantom.com/download',
        '_blank',
        'noopener,noreferrer',
      );
      return;
    }
    setIsConnecting(true);
    try {
      const result = await provider.connect();
      setAddress(result.publicKey?.toString() ?? readAddress(provider));
    } finally {
      setIsConnecting(false);
    }
  }, [provider]);

  const disconnect = useCallback(async () => {
    await provider?.disconnect?.();
    setAddress(undefined);
  }, [provider]);

  return {
    address,
    connect,
    disconnect,
    isConnecting,
    isInstalled: !!provider,
  };
}
