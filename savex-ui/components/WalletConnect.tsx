'use client';

import { useState, useEffect } from 'react';
import { useWalletStore } from '@/lib/store';
import { stellarService } from '@/lib/stellar';
import { TOKENS } from '@/lib/config';
import { formatAddress, formatAmount } from '@/lib/utils';

export function WalletConnect() {
  const { publicKey, isConnected, balances, setPublicKey, setBalances, disconnect } = useWalletStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFreighterDetected, setIsFreighterDetected] = useState(false);

  // Check for Freighter on mount
  useEffect(() => {
    const checkFreighter = async () => {
      const detected = await stellarService.waitForFreighter();
      setIsFreighterDetected(detected);
      console.log('Freighter detection result:', detected);
    };
    checkFreighter();
  }, []);

  const handleConnect = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const key = await stellarService.connectWallet();
      if (key) {
        setPublicKey(key);
        await loadBalances(key);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect wallet');
      console.error('Wallet connection error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadBalances = async (address: string) => {
    console.log('Loading balances for address:', address);

    const balancePromises = Object.values(TOKENS).map(async (token) => {
      try {
        let balance: string;

        if (token.symbol === 'XLM') {
          // For XLM, get native balance from account
          balance = await stellarService.getAccountBalance(address);
        } else {
          // For other tokens, get Soroban token balance
          balance = await stellarService.getSorobanTokenBalance(address, token.address);
        }

        console.log(`Balance for ${token.symbol}:`, balance);

        return {
          token: token.symbol,
          amount: balance,
        };
      } catch (error) {
        console.error(`Error loading balance for ${token.symbol}:`, error);
        return {
          token: token.symbol,
          amount: '0',
        };
      }
    });

    const balanceResults = await Promise.all(balancePromises);
    setBalances(balanceResults);
    console.log('All balances loaded:', balanceResults);
  };

  const handleRefresh = async () => {
    if (publicKey) {
      setIsLoading(true);
      await loadBalances(publicKey);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Check if wallet is already connected
    const checkConnection = async () => {
      try {
        const key = stellarService.getPublicKey();
        if (key) {
          setPublicKey(key);
          await loadBalances(key);
        }
      } catch {
        // Wallet not connected, ignore
      }
    };

    checkConnection();
  }, []);

  if (isConnected && publicKey) {
    return (
      <div className="glass glass-hover rounded-2xl p-6 border border-cyan-500/30">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-cyan-500 flex items-center justify-center">
              <span className="text-2xl">✓</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-400 mb-1">Connected Wallet</p>
              <p className="font-mono font-bold text-xl text-white">{formatAddress(publicKey, 8)}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleRefresh}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-semibold glass glass-hover rounded-xl text-white disabled:opacity-40 transition-all"
            >
              {isLoading ? '🔄' : '↻'} Refresh
            </button>
            <button
              onClick={disconnect}
              className="px-4 py-2 text-sm font-semibold glass glass-hover rounded-xl text-red-400 border border-red-500/30 hover:border-red-500/50 transition-all"
            >
              Disconnect
            </button>
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-sm font-bold text-white">Token Balances:</p>
          {balances.length === 0 ? (
            <p className="text-sm text-gray-400 font-medium animate-pulse">Loading balances...</p>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {Object.values(TOKENS).map((token) => {
                const balance = balances.find((b) => b.token === token.symbol);
                return (
                  <div key={token.symbol} className="glass glass-hover rounded-xl p-4 border border-white/10">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{token.icon}</span>
                      <div>
                        <p className="text-xs text-gray-400 font-semibold">{token.name}</p>
                        <p className="font-bold text-xl text-white">
                          {balance ? formatAmount(balance.amount, token.decimals) : '0'}
                        </p>
                        <p className="text-xs text-cyan-400 font-medium">{token.symbol}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="glass rounded-2xl p-8 text-center border border-white/10">
      <div className="mb-6">
        <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center">
          <span className="text-4xl">🚀</span>
        </div>
        <h3 className="text-2xl font-bold text-white mb-2">Connect Your Wallet</h3>
        <p className="text-sm text-gray-400 font-medium mb-4">
          Connect Freighter wallet to start using SaveX
        </p>

        {isFreighterDetected && (
          <div className="inline-flex items-center gap-2 glass px-4 py-2 rounded-xl border border-green-500/30">
            <span className="text-green-400">✓</span>
            <p className="text-sm text-green-400 font-bold">Freighter Detected</p>
          </div>
        )}
      </div>

      {error && (
        <div className="mb-4 glass p-4 border-2 border-red-500/50 rounded-xl glow-red">
          <p className="text-sm text-red-400 font-semibold">⚠️ {error}</p>
          {error.includes('not installed') && (
            <a
              href="https://www.freighter.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-cyan-400 font-semibold underline block mt-2 hover:text-cyan-300"
            >
              Install Freighter Wallet →
            </a>
          )}
        </div>
      )}

      <button
        onClick={handleConnect}
        disabled={isLoading || !isFreighterDetected}
        className="px-8 py-4 bg-gradient-to-r from-cyan-500 to-purple-500 text-white rounded-xl font-bold text-lg hover:shadow-lg hover:shadow-cyan-500/50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
      >
        {isLoading ? 'Connecting...' : isFreighterDetected ? 'Connect Freighter Wallet' : 'Waiting for Freighter...'}
      </button>

      <div className="mt-4 inline-flex items-center gap-2 glass px-4 py-2 rounded-xl border border-white/10">
        <p className="text-xs text-gray-400">
          Network: <span className="font-mono font-bold text-cyan-400">Stellar Testnet</span>
        </p>
      </div>
    </div>
  );
}