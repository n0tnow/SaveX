'use client';

import { useState } from 'react';
import { useWalletStore, useTransactionStore } from '@/lib/store';
import { stellarService } from '@/lib/stellar';
import { TOKENS } from '@/lib/config';
import { parseAmount } from '@/lib/utils';

export function RateLocking() {
  const { publicKey, isConnected } = useWalletStore();
  const { isLoading, setLoading, setLastTx } = useTransactionStore();

  const [fromToken, setFromToken] = useState<string>(TOKENS.XLM.symbol);
  const [toToken, setToToken] = useState<string>(TOKENS.USDC.symbol);
  const [amount, setAmount] = useState('');
  const [lockRate, setLockRate] = useState('');
  const [duration, setDuration] = useState(3600); // 1 hour default
  const [lockId, setLockId] = useState<string | null>(null);

  const handleLockRate = async () => {
    if (!amount || !lockRate || !publicKey) {
      alert('Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      const fromTokenData = Object.values(TOKENS).find((t) => t.symbol === fromToken);
      const toTokenData = Object.values(TOKENS).find((t) => t.symbol === toToken);

      if (!fromTokenData || !toTokenData) return;

      const amountInStroops = parseAmount(amount, fromTokenData.decimals);
      const rateWithPrecision = parseAmount(lockRate, 7); // 7 decimal precision

      const result = await stellarService.invokeSaveXContract(
        'lock_rate',
        [
          stellarService.createScVal.address(publicKey),
          stellarService.createScVal.address(fromTokenData.address),
          stellarService.createScVal.address(toTokenData.address),
          stellarService.createScVal.i128(rateWithPrecision),
          stellarService.createScVal.i128(amountInStroops),
          stellarService.createScVal.u64(duration),
        ],
        publicKey
      );

      if (result.success) {
        setLockId(result.result.toString());
        setLastTx({
          type: 'Rate Lock',
          timestamp: Date.now(),
        });
        alert(
          `✅ Rate locked successfully!\nLock ID: ${result.result}\n\nRate: ${lockRate}\nDuration: ${duration}s\nAmount: ${amount} ${fromToken}`
        );
      } else {
        setLastTx({
          type: 'Rate Lock',
          error: result.error,
          timestamp: Date.now(),
        });
        alert('❌ Rate lock failed: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Rate lock error:', error);
      alert('Failed to lock rate');
    } finally {
      setLoading(false);
    }
  };

  const handleGetRateLock = async () => {
    if (!lockId || !publicKey) {
      alert('Please provide a lock ID');
      return;
    }

    setLoading(true);
    try {
      const result = await stellarService.invokeSaveXContract(
        'get_rate_lock',
        [stellarService.createScVal.u64(parseInt(lockId))],
        publicKey
      );

      if (result.success && result.result) {
        const lock = result.result;
        const info = `
Lock ID: ${lockId}
Owner: ${lock.owner}
From Token: ${lock.from_token}
To Token: ${lock.to_token}
Locked Rate: ${lock.locked_rate}
Amount: ${lock.amount}
Expiry: ${new Date(Number(lock.expiry) * 1000).toLocaleString()}
Active: ${lock.is_active ? 'Yes' : 'No'}
Created: ${new Date(Number(lock.created_at) * 1000).toLocaleString()}
        `.trim();
        alert('📊 Rate Lock Details:\n\n' + info);
      } else {
        alert('❌ Failed to get rate lock: ' + (result.error || 'Not found'));
      }
    } catch (error) {
      console.error('Get rate lock error:', error);
      alert('Failed to retrieve rate lock details');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelLock = async () => {
    if (!lockId || !publicKey) {
      alert('Please provide a lock ID');
      return;
    }

    setLoading(true);
    try {
      const result = await stellarService.invokeSaveXContract(
        'cancel_rate_lock',
        [
          stellarService.createScVal.address(publicKey),
          stellarService.createScVal.u64(parseInt(lockId)),
        ],
        publicKey
      );

      if (result.success) {
        setLastTx({
          type: 'Cancel Rate Lock',
          timestamp: Date.now(),
        });
        alert(`✅ Rate lock ${lockId} cancelled successfully!`);
        setLockId(null);
      } else {
        setLastTx({
          type: 'Cancel Rate Lock',
          error: result.error,
          timestamp: Date.now(),
        });
        alert('❌ Cancel failed: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Cancel rate lock error:', error);
      alert('Failed to cancel rate lock');
    } finally {
      setLoading(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="border rounded-lg p-6 text-center bg-gray-50">
        <p className="text-gray-600">Please connect your wallet to use Rate Locking</p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg p-6 bg-white shadow-sm">
      <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
        🔒 Rate Locking
      </h2>

      <div className="space-y-4">
        {/* Token Pair */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">From Token</label>
            <select
              value={fromToken}
              onChange={(e) => setFromToken(e.target.value)}
              className="w-full border rounded-md px-3 py-2"
            >
              {Object.values(TOKENS).map((t) => (
                <option key={t.symbol} value={t.symbol}>
                  {t.icon} {t.symbol}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">To Token</label>
            <select
              value={toToken}
              onChange={(e) => setToToken(e.target.value)}
              className="w-full border rounded-md px-3 py-2"
            >
              {Object.values(TOKENS).map((t) => (
                <option key={t.symbol} value={t.symbol}>
                  {t.icon} {t.symbol}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Rate and Amount */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Exchange Rate (1 {fromToken} = ? {toToken})
            </label>
            <input
              type="number"
              step="0.0000001"
              placeholder="e.g., 1.05"
              value={lockRate}
              onChange={(e) => setLockRate(e.target.value)}
              className="w-full border rounded-md px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Amount</label>
            <input
              type="number"
              step="0.0000001"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full border rounded-md px-3 py-2"
            />
          </div>
        </div>

        {/* Duration */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Lock Duration: {duration / 3600} hour(s)
          </label>
          <div className="flex gap-2">
            {[
              { label: '1h', value: 3600 },
              { label: '6h', value: 21600 },
              { label: '12h', value: 43200 },
              { label: '24h', value: 86400 },
            ].map(({ label, value }) => (
              <button
                key={value}
                onClick={() => setDuration(value)}
                className={`px-4 py-2 rounded-md ${
                  duration === value
                    ? 'bg-purple-500 text-white'
                    : 'bg-gray-100 hover:bg-gray-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Lock Rate Button */}
        <button
          onClick={handleLockRate}
          disabled={isLoading || !amount || !lockRate}
          className="w-full px-4 py-3 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-md hover:from-purple-600 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
        >
          {isLoading ? 'Locking...' : '🔒 Lock Rate'}
        </button>

        {/* Divider */}
        <div className="border-t my-6"></div>

        {/* Manage Lock */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Manage Existing Lock
          </label>
          <input
            type="number"
            placeholder="Lock ID"
            value={lockId || ''}
            onChange={(e) => setLockId(e.target.value)}
            className="w-full border rounded-md px-3 py-2 mb-2"
          />
          <div className="flex gap-2">
            <button
              onClick={handleGetRateLock}
              disabled={isLoading || !lockId}
              className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50"
            >
              📊 View Details
            </button>
            <button
              onClick={handleCancelLock}
              disabled={isLoading || !lockId}
              className="flex-1 px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 disabled:opacity-50"
            >
              ❌ Cancel Lock
            </button>
          </div>
        </div>

        {/* Info */}
        <div className="bg-purple-50 border border-purple-200 rounded-md p-3">
          <p className="text-xs text-purple-700">
            ℹ️ Lock the current exchange rate for up to 24 hours. You can use this locked
            rate for transfers anytime before expiry, protecting yourself from rate
            fluctuations.
          </p>
        </div>
      </div>
    </div>
  );
}