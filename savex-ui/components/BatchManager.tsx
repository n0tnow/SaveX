'use client';

import { useState, useEffect } from 'react';
import { useWalletStore } from '@/lib/store';

interface SwapIntent {
  fromToken: string;
  toToken: string;
  amount: string;
  estimatedOutput?: string;
  addedAt: number;
}

interface BatchAnalysis {
  recommendedBatchSize: number;
  estimatedSavings: number;
  savingsPercentage: number;
  feeWithoutBatch: string;
  feeWithBatch: string;
  breakdownWithoutBatch: {
    networkFee: string;
    contractFee: string;
    totalFee: string;
  };
  breakdownWithBatch: {
    networkFee: string;
    contractFee: string;
    totalFee: string;
  };
}

const STORAGE_KEY = 'savex_batch_queue';

export function BatchManager() {
  const { publicKey, isConnected } = useWalletStore();
  const [queue, setQueue] = useState<SwapIntent[]>([]);
  const [analysis, setAnalysis] = useState<BatchAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [showQueue, setShowQueue] = useState(false);

  // Load queue from localStorage on mount
  useEffect(() => {
    if (!isConnected || !publicKey) return;

    const stored = localStorage.getItem(`${STORAGE_KEY}_${publicKey}`);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setQueue(parsed);
      } catch (error) {
        console.error('Failed to parse batch queue:', error);
      }
    }
  }, [publicKey, isConnected]);

  // Save queue to localStorage whenever it changes
  useEffect(() => {
    if (!publicKey) return;

    if (queue.length > 0) {
      localStorage.setItem(`${STORAGE_KEY}_${publicKey}`, JSON.stringify(queue));
    } else {
      localStorage.removeItem(`${STORAGE_KEY}_${publicKey}`);
    }
  }, [queue, publicKey]);

  // Analyze batch whenever queue changes
  useEffect(() => {
    if (queue.length < 2) {
      setAnalysis(null);
      return;
    }

    const analyzeBatch = async () => {
      setLoading(true);
      try {
        const response = await fetch('/api/batch-queue', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ swaps: queue }),
        });

        if (response.ok) {
          const data = await response.json();
          setAnalysis(data);
        } else {
          console.error('Batch analysis failed');
          setAnalysis(null);
        }
      } catch (error) {
        console.error('Batch analysis error:', error);
        setAnalysis(null);
      } finally {
        setLoading(false);
      }
    };

    analyzeBatch();
  }, [queue]);

  const addToQueue = (swap: Omit<SwapIntent, 'addedAt'>) => {
    setQueue((prev) => [...prev, { ...swap, addedAt: Date.now() }]);
  };

  const removeFromQueue = (index: number) => {
    setQueue((prev) => prev.filter((_, i) => i !== index));
  };

  const clearQueue = () => {
    setQueue([]);
  };

  const getTokenIcon = (token: string) => {
    const icons: { [key: string]: string } = {
      XLM: '🌌',
      USDC: '💵',
      TRY: '🇹🇷',
      EUR: '🇪🇺',
      BTC: '₿',
    };
    return icons[token] || '💰';
  };

  if (!isConnected) {
    return null;
  }

  // Expose addToQueue function for external use
  if (typeof window !== 'undefined') {
    (window as any).saveXBatchManager = { addToQueue };
  }

  return (
    <div className="border border-gray-700 rounded-lg bg-gray-900 shadow-sm">
      {/* Header */}
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-800"
        onClick={() => setShowQueue(!showQueue)}
      >
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-bold text-white">📦 Batch Queue</h3>
          <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs font-bold rounded-full">
            {queue.length} swap{queue.length !== 1 ? 's' : ''}
          </span>
        </div>
        <button className="text-gray-400 hover:text-gray-200">
          {showQueue ? '▼' : '▶'}
        </button>
      </div>

      {showQueue && (
        <div className="border-t border-gray-700 p-4">
          {/* Queue Empty State */}
          {queue.length === 0 && (
            <div className="text-center py-8 text-gray-400">
              <p className="text-sm">No swaps in queue</p>
              <p className="text-xs mt-1">Add swaps to batch them together and save on fees!</p>
            </div>
          )}

          {/* Batch Analysis Banner */}
          {analysis && queue.length >= 2 && (
            <div className="mb-4 bg-gray-800 border border-green-500/30 rounded-lg p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h4 className="text-sm font-bold text-green-400">💰 Batch Savings Analysis</h4>
                  <p className="text-xs text-gray-300 mt-1">
                    Executing {queue.length} swaps in a single batch
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-green-400">
                    {analysis.savingsPercentage.toFixed(1)}%
                  </p>
                  <p className="text-xs text-green-500">savings</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-3">
                <div className="bg-gray-700/50 rounded-md p-2">
                  <p className="text-xs text-gray-400">Individual Execution</p>
                  <p className="text-sm font-bold font-mono text-red-400">
                    {analysis.feeWithoutBatch} XLM
                  </p>
                  <p className="text-[10px] text-gray-500">
                    Network: {analysis.breakdownWithoutBatch.networkFee} XLM
                  </p>
                </div>
                <div className="bg-gray-700/50 rounded-md p-2">
                  <p className="text-xs text-gray-400">Batch Execution</p>
                  <p className="text-sm font-bold font-mono text-green-400">
                    {analysis.feeWithBatch} XLM
                  </p>
                  <p className="text-[10px] text-gray-500">
                    Network: {analysis.breakdownWithBatch.networkFee} XLM
                  </p>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-gray-700">
                <p className="text-xs text-gray-300">
                  💡 <span className="font-semibold">Recommendation:</span>{' '}
                  {analysis.recommendedBatchSize <= queue.length
                    ? 'Execute batch now to maximize savings!'
                    : `Add ${analysis.recommendedBatchSize - queue.length} more swap${
                        analysis.recommendedBatchSize - queue.length > 1 ? 's' : ''
                      } for optimal batch size`}
                </p>
              </div>
            </div>
          )}

          {/* Queue Items */}
          {queue.length > 0 && (
            <div className="space-y-2 mb-4">
              {queue.map((swap, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 bg-gray-800 rounded-md border border-gray-700"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-gray-400">#{idx + 1}</span>
                    <div className="flex items-center gap-1">
                      <span className="text-sm">{getTokenIcon(swap.fromToken)}</span>
                      <span className="text-xs font-mono font-semibold text-white">{swap.amount}</span>
                      <span className="text-xs text-gray-400">{swap.fromToken}</span>
                    </div>
                    <span className="text-gray-500">→</span>
                    <div className="flex items-center gap-1">
                      <span className="text-sm">{getTokenIcon(swap.toToken)}</span>
                      <span className="text-xs text-gray-400">{swap.toToken}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => removeFromQueue(idx)}
                    className="px-2 py-1 text-xs text-red-400 hover:bg-red-500/20 rounded-md transition-all"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Action Buttons */}
          {queue.length > 0 && (
            <div className="flex gap-2">
              <button
                onClick={clearQueue}
                className="flex-1 px-4 py-2 bg-gray-700 text-gray-300 rounded-md hover:bg-gray-600 font-semibold text-sm"
              >
                Clear Queue
              </button>
              <button
                disabled={queue.length < 2 || loading}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-md hover:from-green-600 hover:to-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-sm"
              >
                {loading ? 'Analyzing...' : `Execute Batch (${queue.length} swaps)`}
              </button>
            </div>
          )}

          {/* Info */}
          {queue.length === 1 && (
            <div className="mt-4 bg-gray-800 border border-blue-500/30 rounded-md p-3">
              <p className="text-xs text-blue-400">
                💡 Add at least one more swap to enable batch execution and save on fees!
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
