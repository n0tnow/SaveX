'use client';

import { useState } from 'react';
import { useWalletStore, useTransactionStore } from '@/lib/store';
import { stellarService } from '@/lib/stellar';
import { TOKENS } from '@/lib/config';
import { parseAmount, formatAmount } from '@/lib/utils';
import { RouteVisualizer } from './RouteVisualizer';
import { TimingRecommendation } from './TimingRecommendation';
import { PriceComparison } from './PriceComparison';
import { NotificationBanner } from './NotificationBanner';

export function TokenSwap() {
  const { publicKey, isConnected } = useWalletStore();
  const { isLoading, setLoading, setLastTx } = useTransactionStore();

  const [fromToken, setFromToken] = useState<string>(TOKENS.XLM.symbol);
  const [toToken, setToToken] = useState<string>(TOKENS.USDC.symbol);
  const [amount, setAmount] = useState('');
  const [estimatedOutput, setEstimatedOutput] = useState<string | null>(null);
  const [slippage, setSlippage] = useState(5); // 5% default

  const handleEstimate = async () => {
    if (!amount || !publicKey) return;

    setLoading(true);
    try {
      const fromTokenData = Object.values(TOKENS).find((t) => t.symbol === fromToken);
      const toTokenData = Object.values(TOKENS).find((t) => t.symbol === toToken);

      if (!fromTokenData || !toTokenData) return;

      const amountInStroops = parseAmount(amount, fromTokenData.decimals);

      const result = await stellarService.invokeSaveXContract(
        'estimate_swap_output',
        [
          stellarService.createScVal.address(fromTokenData.address),
          stellarService.createScVal.address(toTokenData.address),
          stellarService.createScVal.i128(amountInStroops),
        ],
        publicKey
      );

      if (result.success && result.result) {
        setEstimatedOutput(formatAmount(result.result.toString(), toTokenData.decimals));
      } else {
        alert('Estimation failed: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Estimation error:', error);
      alert('Failed to estimate swap output');
    } finally {
      setLoading(false);
    }
  };

  const handleSwap = async () => {
    if (!amount || !publicKey || !estimatedOutput) {
      alert('Please estimate the swap first');
      return;
    }

    setLoading(true);
    try {
      const fromTokenData = Object.values(TOKENS).find((t) => t.symbol === fromToken);
      const toTokenData = Object.values(TOKENS).find((t) => t.symbol === toToken);

      if (!fromTokenData || !toTokenData) return;

      const amountInStroops = parseAmount(amount, fromTokenData.decimals);
      const estimatedOutputStroops = parseAmount(estimatedOutput, toTokenData.decimals);

      // Calculate minimum output with slippage tolerance
      const minOutput = (estimatedOutputStroops * BigInt(100 - slippage)) / BigInt(100);

      const result = await stellarService.invokeSaveXContract(
        'transfer_with_swap',
        [
          stellarService.createScVal.address(publicKey),
          stellarService.createScVal.address(publicKey), // Recipient (self)
          stellarService.createScVal.address(fromTokenData.address),
          stellarService.createScVal.address(toTokenData.address),
          stellarService.createScVal.i128(amountInStroops),
          stellarService.createScVal.i128(minOutput),
          stellarService.createScVal.vec([]), // Empty path for direct swap
        ],
        publicKey
      );

      if (result.success) {
        setLastTx({
          type: 'Token Swap',
          timestamp: Date.now(),
        });
        alert(
          `✅ Swap successful!\nTransfer ID: ${result.result}\n\nSwapped ${amount} ${fromToken} → ${estimatedOutput} ${toToken}`
        );
        setAmount('');
        setEstimatedOutput(null);
      } else {
        setLastTx({
          type: 'Token Swap',
          error: result.error,
          timestamp: Date.now(),
        });
        alert('❌ Swap failed: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Swap error:', error);
      alert('Failed to execute swap');
    } finally {
      setLoading(false);
    }
  };

  const handleSwapTokens = () => {
    setFromToken(toToken);
    setToToken(fromToken);
    setEstimatedOutput(null);
  };

  if (!isConnected) {
    return (
      <div className="border border-gray-700 rounded-xl p-8 text-center bg-gray-900/50 shadow-sm">
        <p className="text-gray-300 font-semibold text-lg">Please connect your wallet to use Token Swap</p>
      </div>
    );
  }

  return (
    <div className="border border-gray-700 rounded-xl p-6 bg-gray-900 shadow-lg">
      <h2 className="text-3xl font-bold mb-6 flex items-center gap-2 text-white">
        🔄 Token Swap
      </h2>

      <div className="space-y-4">
        {/* Smart Notifications */}
        <NotificationBanner
          fromToken={fromToken}
          toToken={toToken}
          amount={amount}
        />

        {/* From Token */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">From</label>
          <div className="flex gap-2">
            <select
              value={fromToken}
              onChange={(e) => {
                setFromToken(e.target.value);
                setEstimatedOutput(null);
              }}
              className="flex-1 border border-gray-600 bg-gray-800 text-white rounded-md px-3 py-2"
            >
              {Object.values(TOKENS).map((token) => (
                <option key={token.symbol} value={token.symbol}>
                  {token.icon} {token.symbol}
                </option>
              ))}
            </select>
            <input
              type="number"
              step="0.0000001"
              placeholder="Amount"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                setEstimatedOutput(null);
              }}
              className="flex-1 border border-gray-600 bg-gray-800 text-white rounded-md px-3 py-2 placeholder-gray-400"
            />
          </div>
        </div>

        {/* Swap Direction Button */}
        <div className="flex justify-center">
          <button
            onClick={handleSwapTokens}
            className="p-2 bg-gray-700 rounded-full hover:bg-gray-600 transition-all"
          >
            ⬇️⬆️
          </button>
        </div>

        {/* To Token */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">To</label>
          <div className="flex gap-2">
            <select
              value={toToken}
              onChange={(e) => {
                setToToken(e.target.value);
                setEstimatedOutput(null);
              }}
              className="flex-1 border border-gray-600 bg-gray-800 text-white rounded-md px-3 py-2"
            >
              {Object.values(TOKENS).map((token) => (
                <option key={token.symbol} value={token.symbol}>
                  {token.icon} {token.symbol}
                </option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Estimated output"
              value={estimatedOutput || ''}
              readOnly
              className="flex-1 border border-gray-600 bg-gray-800/50 text-gray-300 rounded-md px-3 py-2 placeholder-gray-500"
            />
          </div>
        </div>

        {/* Timing Recommendation */}
        <TimingRecommendation
          fromToken={fromToken}
          toToken={toToken}
        />

        {/* Price Comparison */}
        <PriceComparison
          fromToken={fromToken}
          toToken={toToken}
          amount={amount}
        />

        {/* Route Visualizer */}
        <RouteVisualizer
          fromToken={fromToken}
          toToken={toToken}
          amount={amount}
        />

        {/* Slippage Tolerance */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Slippage Tolerance: {slippage}%
          </label>
          <div className="flex gap-2">
            {[1, 3, 5, 10].map((value) => (
              <button
                key={value}
                onClick={() => setSlippage(value)}
                className={`px-4 py-2 rounded-md ${
                  slippage === value
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {value}%
              </button>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleEstimate}
            disabled={isLoading || !amount || fromToken === toToken}
            className="flex-1 px-6 py-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-bold text-lg shadow-md hover:shadow-lg transition-all"
          >
            {isLoading ? 'Estimating...' : '📊 Estimate'}
          </button>

          <button
            onClick={handleSwap}
            disabled={isLoading || !estimatedOutput}
            className="flex-1 px-6 py-4 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-xl hover:from-indigo-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-bold text-lg shadow-md hover:shadow-lg transition-all"
          >
            {isLoading ? 'Swapping...' : '🔄 Execute Swap'}
          </button>
        </div>

        {/* Info */}
        {estimatedOutput && (
          <div className="bg-gray-800 border border-blue-500/30 rounded-xl p-5 shadow-sm">
            <p className="text-base font-bold text-blue-400 mb-3">📊 Swap Summary</p>
            <p className="text-sm text-gray-300 mt-2 font-medium">
              You pay: <span className="font-mono font-bold text-white">{amount} {fromToken}</span>
            </p>
            <p className="text-sm text-gray-300 mt-1 font-medium">
              You receive (estimated): <span className="font-mono font-bold text-green-400">{estimatedOutput} {toToken}</span>
            </p>
            <p className="text-sm text-gray-300 mt-1 font-medium">
              Minimum received: <span className="font-mono font-bold text-orange-400">
                {formatAmount(
                  (parseAmount(estimatedOutput, 7) * BigInt(100 - slippage)) / BigInt(100),
                  7
                )} {toToken}
              </span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}