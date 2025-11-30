'use client';

import { useState } from 'react';
import { useWalletStore, useTransactionStore } from '@/lib/store';
import { stellarService } from '@/lib/stellar';
import { TOKENS, TEST_ACCOUNTS } from '@/lib/config';
import { parseAmount } from '@/lib/utils';

export function AdvancedTransfers() {
  const { publicKey, isConnected } = useWalletStore();
  const { isLoading, setLoading, setLastTx } = useTransactionStore();

  // Scheduled Transfer States
  const [recipient, setRecipient] = useState('');
  const [token, setToken] = useState<string>(TOKENS.XLM.symbol);
  const [amount, setAmount] = useState('');
  const [executeAfter, setExecuteAfter] = useState('');

  const handleScheduledTransfer = async () => {
    if (!recipient || !amount || !executeAfter || !publicKey) {
      alert('Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      const tokenData = Object.values(TOKENS).find((t) => t.symbol === token);
      if (!tokenData) return;

      const amountInStroops = parseAmount(amount, tokenData.decimals);
      const executeTimestamp = Math.floor(new Date(executeAfter).getTime() / 1000);

      const result = await stellarService.invokeSaveXContract(
        'transfer_scheduled',
        [
          stellarService.createScVal.address(publicKey),
          stellarService.createScVal.address(recipient),
          stellarService.createScVal.address(tokenData.address),
          stellarService.createScVal.i128(amountInStroops),
          stellarService.createScVal.u64(executeTimestamp),
        ],
        publicKey
      );

      if (result.success) {
        setLastTx({ type: 'Scheduled Transfer', timestamp: Date.now() });
        alert(
          `✅ Scheduled transfer created!\nTransfer ID: ${result.result}\n\nWill execute after: ${new Date(executeTimestamp * 1000).toLocaleString()}`
        );
        setRecipient('');
        setAmount('');
        setExecuteAfter('');
      } else {
        setLastTx({ type: 'Scheduled Transfer', error: result.error, timestamp: Date.now() });
        alert('❌ Failed: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Scheduled transfer error:', error);
      alert('Failed to create scheduled transfer');
    } finally {
      setLoading(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="border border-gray-700 rounded-xl p-8 text-center bg-gray-900/50 shadow-sm">
        <p className="text-gray-300 font-semibold text-lg">Please connect your wallet to use Scheduled Transfers</p>
      </div>
    );
  }

  return (
    <div className="border border-gray-700 rounded-xl p-6 bg-gray-900 shadow-lg">
      <h2 className="text-3xl font-bold mb-3 flex items-center gap-2 text-white">
        ⏰ Scheduled Transfers
      </h2>
      <p className="text-sm text-gray-300 font-medium mb-6">
        Schedule a transfer to be executed at a future date and time
      </p>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Recipient</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              className="flex-1 border border-gray-600 bg-gray-800 text-white rounded-md px-3 py-2 font-mono text-sm placeholder-gray-500"
              placeholder="G..."
            />
            <button
              onClick={() => setRecipient(TEST_ACCOUNTS.BOB)}
              className="px-3 py-2 bg-gray-700 text-gray-300 rounded-md text-sm hover:bg-gray-600"
            >
              👤 Bob
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Token</label>
            <select
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="w-full border border-gray-600 bg-gray-800 text-white rounded-md px-3 py-2"
            >
              {Object.values(TOKENS).map((t) => (
                <option key={t.symbol} value={t.symbol}>
                  {t.icon} {t.symbol}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Amount</label>
            <input
              type="number"
              step="0.0000001"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full border border-gray-600 bg-gray-800 text-white rounded-md px-3 py-2"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Execute After (Date & Time)
          </label>
          <input
            type="datetime-local"
            value={executeAfter}
            onChange={(e) => setExecuteAfter(e.target.value)}
            className="w-full border border-gray-600 bg-gray-800 text-white rounded-md px-3 py-2"
          />
        </div>

        <button
          onClick={handleScheduledTransfer}
          disabled={isLoading}
          className="w-full px-6 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 font-bold text-lg shadow-md hover:shadow-lg transition-all"
        >
          {isLoading ? 'Creating...' : '⏰ Schedule Transfer'}
        </button>
      </div>
    </div>
  );
}
