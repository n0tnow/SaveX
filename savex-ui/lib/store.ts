import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface Balance {
  token: string;
  amount: string;
}

interface WalletState {
  publicKey: string | null;
  isConnected: boolean;
  balances: Balance[];
  setPublicKey: (key: string | null) => void;
  setBalances: (balances: Balance[]) => void;
  disconnect: () => void;
}

export const useWalletStore = create<WalletState>()(
  persist(
    (set) => ({
      publicKey: null,
      isConnected: false,
      balances: [],
      setPublicKey: (key) => set({ publicKey: key, isConnected: !!key }),
      setBalances: (balances) => set({ balances }),
      disconnect: () => set({ publicKey: null, isConnected: false, balances: [] }),
    }),
    {
      name: 'savex-wallet-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

interface TransactionState {
  isLoading: boolean;
  lastTx: {
    type: string;
    hash?: string;
    error?: string;
    timestamp: number;
  } | null;
  setLoading: (loading: boolean) => void;
  setLastTx: (tx: TransactionState['lastTx']) => void;
}

export const useTransactionStore = create<TransactionState>((set) => ({
  isLoading: false,
  lastTx: null,
  setLoading: (loading) => set({ isLoading: loading }),
  setLastTx: (tx) => set({ lastTx: tx }),
}));