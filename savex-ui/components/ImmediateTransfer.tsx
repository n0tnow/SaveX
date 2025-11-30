'use client';

import { useState } from 'react';
import { useWalletStore, useTransactionStore } from '@/lib/store';
import { stellarService } from '@/lib/stellar';
import { TOKENS, TEST_ACCOUNTS } from '@/lib/config';
import { parseAmount, formatAmount } from '@/lib/utils';

export function ImmediateTransfer() {
  const { publicKey, isConnected } = useWalletStore();
  const { isLoading, setLoading, setLastTx } = useTransactionStore();

  const [recipient, setRecipient] = useState('');
  const [token, setToken] = useState<string>(TOKENS.XLM.symbol);
  const [amount, setAmount] = useState('');
  const [fee, setFee] = useState<string | null>(null);

  const handleCalculateFee = async () => {
    if (!amount || !publicKey) return;

    setLoading(true);
    try {
      const tokenData = Object.values(TOKENS).find((t) => t.symbol === token);
      if (!tokenData) return;

      const amountInStroops = parseAmount(amount, tokenData.decimals);

      const result = await stellarService.invokeSaveXContract(
        'calculate_fee',
        [
          stellarService.createScVal.address(publicKey),
          stellarService.createScVal.i128(amountInStroops),
          stellarService.createScVal.bool(false), // not batch
          stellarService.createScVal.u32(1), // batch size 1
        ],
        publicKey
      );

      if (result.success && result.result) {
        // result.result is now {discount, network_fee, service_fee, total}
        const feeData = result.result;
        console.log('Fee data:', feeData);

        if (feeData && feeData.total) {
          setFee(formatAmount(feeData.total, 7));
        } else {
          alert('Invalid fee data returned');
        }
      } else {
        alert('Fee calculation failed: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Fee calculation error:', error);
      alert('Failed to calculate fee');
    } finally {
      setLoading(false);
    }
  };

  const handleTransfer = async () => {
    if (!amount || !recipient || !publicKey) {
      alert('Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      const tokenData = Object.values(TOKENS).find((t) => t.symbol === token);
      if (!tokenData) return;

      const amountInStroops = parseAmount(amount, tokenData.decimals);

      const result = await stellarService.invokeSaveXContract(
        'transfer_immediate',
        [
          stellarService.createScVal.address(publicKey),
          stellarService.createScVal.address(recipient),
          stellarService.createScVal.address(tokenData.address),
          stellarService.createScVal.i128(amountInStroops),
        ],
        publicKey
      );

      if (result.success) {
        setLastTx({
          type: 'Immediate Transfer',
          timestamp: Date.now(),
        });
        alert(
          `✅ Transfer successful!\nTransfer ID: ${result.result}\n\nSent ${amount} ${token} to recipient`
        );
        setAmount('');
        setRecipient('');
        setFee(null);
      } else {
        setLastTx({
          type: 'Immediate Transfer',
          error: result.error,
          timestamp: Date.now(),
        });
        alert('❌ Transfer failed: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Transfer error:', error);
      alert('Failed to execute transfer');
    } finally {
      setLoading(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="glass rounded-2xl p-8 text-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-cyan-500/10 flex items-center justify-center">
            <span className="text-3xl">🔒</span>
          </div>
          <p className="text-gray-400 text-lg">Please connect your wallet to make transfers</p>
        </div>
      </div>
    );
  }

  return (
    <div className="glass glass-hover rounded-2xl p-6 sm:p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center">
          <span className="text-2xl">⚡</span>
        </div>
        <div>
          <h2 className="text-2xl font-bold gradient-text">Immediate Transfer</h2>
          <p className="text-gray-400 text-sm">Send tokens instantly on Stellar</p>
        </div>
      </div>

      <div className="space-y-5">
        {/* Recipient */}
        <div>
          <label className="block text-sm font-semibold text-gray-300 mb-2">
            Recipient Address
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="G..."
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              className="flex-1 glass rounded-xl px-4 py-3 font-mono text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all"
            />
            <button
              onClick={() => setRecipient(TEST_ACCOUNTS.BOB)}
              className="px-4 py-3 glass glass-hover rounded-xl text-sm font-medium text-gray-300 hover:text-white"
              title="Use test account Bob"
            >
              <span className="mr-1">👤</span>
              Bob
            </button>
          </div>
        </div>

        {/* Token Selection */}
        <div>
          <label className="block text-sm font-semibold text-gray-300 mb-2">Token</label>
          <select
            value={token}
            onChange={(e) => {
              setToken(e.target.value);
              setFee(null);
            }}
            className="w-full glass rounded-xl px-4 py-3 text-white font-medium focus:outline-none focus:ring-2 focus:ring-cyan-500/50 cursor-pointer transition-all"
          >
            {Object.values(TOKENS).map((t) => (
              <option key={t.symbol} value={t.symbol} className="bg-black">
                {t.icon} {t.symbol} - {t.name}
              </option>
            ))}
          </select>
        </div>

        {/* Amount */}
        <div>
          <label className="block text-sm font-semibold text-gray-300 mb-2">Amount</label>
          <input
            type="number"
            step="0.0000001"
            placeholder="0.00"
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value);
              setFee(null);
            }}
            className="w-full glass rounded-xl px-4 py-3 text-white text-lg font-medium placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all"
          />
        </div>

        {/* Fee Display */}
        {fee && (
          <div className="glass rounded-xl p-4 border border-cyan-500/30 glow-cyan">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm font-medium text-gray-400">Estimated Fee</p>
                <p className="text-xl font-bold text-cyan-400">{fee} XLM</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                <span className="text-xl">💰</span>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Including package discount if applicable
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 pt-2">
          <button
            onClick={handleCalculateFee}
            disabled={isLoading || !amount}
            className="flex-1 px-6 py-4 glass glass-hover rounded-xl font-semibold text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:glow-cyan"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="animate-spin">⚙️</span>
                Calculating...
              </span>
            ) : (
              <span>💰 Calculate Fee</span>
            )}
          </button>

          <button
            onClick={handleTransfer}
            disabled={isLoading || !recipient || !amount}
            className="flex-1 px-6 py-4 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-xl font-bold text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:shadow-lg hover:shadow-cyan-500/50"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="animate-spin">⚙️</span>
                Sending...
              </span>
            ) : (
              <span>⚡ Send Now</span>
            )}
          </button>
        </div>

        {/* Info */}
        <div className="glass rounded-xl p-4 border border-purple-500/20">
          <div className="flex items-start gap-3">
            <span className="text-purple-400 text-lg mt-0.5">ℹ️</span>
            <p className="text-xs text-gray-400 leading-relaxed">
              Immediate transfers are executed instantly on the Stellar network.
              Transaction confirmation takes approximately 5 seconds.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}