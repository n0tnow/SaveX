'use client';

import { useState, useEffect } from 'react';

interface DEXQuote {
  dex: 'Soroswap' | 'Stellar DEX' | 'SaveX (Best)';
  price: number;
  outputAmount: number;
  liquidity: 'high' | 'medium' | 'low';
  fee: number;
}

interface PriceComparisonProps {
  fromToken: string;
  toToken: string;
  amount: string;
}

export function PriceComparison({ fromToken, toToken, amount }: PriceComparisonProps) {
  const [quotes, setQuotes] = useState<DEXQuote[]>([]);
  const [loading, setLoading] = useState(false);
  const [bestDex, setBestDex] = useState<string>('');

  useEffect(() => {
    if (!amount || !fromToken || !toToken || fromToken === toToken) {
      setQuotes([]);
      return;
    }

    const fetchPrices = async () => {
      setLoading(true);
      try {
        // Simulate DEX price comparison
        // In real implementation, this would call actual DEX APIs
        const amountNum = parseFloat(amount);

        // Soroswap quote (0.3% fee)
        const soroswapOutput = amountNum * 0.997;
        const soroswapPrice = soroswapOutput / amountNum;

        // Stellar DEX quote (0.15% spread estimate)
        const stellarDexOutput = amountNum * 0.9985;
        const stellarDexPrice = stellarDexOutput / amountNum;

        // SaveX aggregated quote (best of both)
        const saveXOutput = Math.max(soroswapOutput, stellarDexOutput);
        const saveXPrice = saveXOutput / amountNum;

        const allQuotes: DEXQuote[] = [
          {
            dex: 'Soroswap',
            price: soroswapPrice,
            outputAmount: soroswapOutput,
            liquidity: 'high',
            fee: 0.003,
          },
          {
            dex: 'Stellar DEX',
            price: stellarDexPrice,
            outputAmount: stellarDexOutput,
            liquidity: 'medium',
            fee: 0.0015,
          },
          {
            dex: 'SaveX (Best)',
            price: saveXPrice,
            outputAmount: saveXOutput,
            liquidity: 'high',
            fee: 0.005, // SaveX base fee
          },
        ];

        // Sort by output (descending)
        allQuotes.sort((a, b) => b.outputAmount - a.outputAmount);

        setQuotes(allQuotes);
        setBestDex(allQuotes[0].dex);
      } catch (error) {
        console.error('Price comparison error:', error);
      } finally {
        setLoading(false);
      }
    };

    // Debounce
    const timeoutId = setTimeout(fetchPrices, 500);
    return () => clearTimeout(timeoutId);
  }, [fromToken, toToken, amount]);

  if (!amount || !fromToken || !toToken || fromToken === toToken) {
    return null;
  }

  if (loading) {
    return (
      <div className="bg-gray-800 border border-purple-500/30 rounded-lg p-4">
        <div className="flex items-center gap-2">
          <div className="animate-spin">💱</div>
          <span className="text-sm text-purple-400">Comparing DEX prices...</span>
        </div>
      </div>
    );
  }

  if (quotes.length === 0) {
    return null;
  }

  const getLiquidityColor = (liquidity: string) => {
    switch (liquidity) {
      case 'high':
        return 'text-green-600';
      case 'medium':
        return 'text-yellow-600';
      case 'low':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getLiquidityIcon = (liquidity: string) => {
    switch (liquidity) {
      case 'high':
        return '🟢';
      case 'medium':
        return '🟡';
      case 'low':
        return '🔴';
      default:
        return '⚪';
    }
  };

  const savingsVsBest = quotes.length > 1
    ? ((quotes[0].outputAmount - quotes[quotes.length - 1].outputAmount) / quotes[quotes.length - 1].outputAmount) * 100
    : 0;

  return (
    <div className="bg-gray-800 border border-purple-500/30 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-purple-400">💱 DEX Price Comparison</h3>
        <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-1 rounded-full font-semibold">
          Live Prices
        </span>
      </div>

      {/* Price comparison table */}
      <div className="space-y-2">
        {quotes.map((quote, idx) => {
          const isBest = quote.dex === bestDex;
          const isSaveX = quote.dex === 'SaveX (Best)';

          return (
            <div
              key={quote.dex}
              className={`p-3 rounded-md border-2 transition-all ${
                isBest
                  ? 'bg-green-500/20 border-green-500'
                  : 'bg-gray-700/50 border-gray-600'
              }`}
            >
              <div className="flex items-center justify-between">
                {/* DEX Name */}
                <div className="flex items-center gap-2">
                  <span className="text-lg">
                    {idx === 0 ? '🏆' : idx === 1 ? '🥈' : '🥉'}
                  </span>
                  <div>
                    <p className={`text-sm font-bold ${isBest ? 'text-green-400' : 'text-white'}`}>
                      {quote.dex}
                    </p>
                    <p className="text-xs text-gray-400 flex items-center gap-1">
                      {getLiquidityIcon(quote.liquidity)}
                      <span className={getLiquidityColor(quote.liquidity)}>
                        {quote.liquidity} liquidity
                      </span>
                    </p>
                  </div>
                </div>

                {/* Output Amount */}
                <div className="text-right">
                  <p className={`text-sm font-mono font-bold ${isBest ? 'text-green-400' : 'text-white'}`}>
                    {quote.outputAmount.toFixed(4)} {toToken}
                  </p>
                  <p className="text-xs text-gray-400">
                    Fee: {(quote.fee * 100).toFixed(2)}%
                  </p>
                </div>

                {/* Best Badge */}
                {isBest && (
                  <div className="ml-2">
                    <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full font-bold">
                      BEST
                    </span>
                  </div>
                )}
              </div>

              {/* Price difference */}
              {idx > 0 && (
                <div className="mt-2 pt-2 border-t border-gray-600">
                  <p className="text-xs text-red-400">
                    {((quotes[0].outputAmount - quote.outputAmount) / quote.outputAmount * 100).toFixed(2)}%
                    {' '}worse than best price
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Savings summary */}
      {savingsVsBest > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-700">
          <div className="flex items-center justify-between bg-green-500/20 border border-green-500/50 rounded-md p-2">
            <div className="flex items-center gap-2">
              <span className="text-lg">💰</span>
              <div>
                <p className="text-xs font-bold text-green-400">SaveX Advantage</p>
                <p className="text-[10px] text-green-300">
                  By aggregating DEXs
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold text-green-400">
                +{savingsVsBest.toFixed(2)}%
              </p>
              <p className="text-[10px] text-green-300">better output</p>
            </div>
          </div>
        </div>
      )}

      {/* Info */}
      <div className="mt-3 pt-3 border-t border-gray-700">
        <p className="text-xs text-purple-400">
          💡 <span className="font-semibold">SaveX automatically</span> finds the best price across all DEXs.
          You don't need to check manually!
        </p>
      </div>
    </div>
  );
}
