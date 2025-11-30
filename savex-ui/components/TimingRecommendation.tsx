'use client';

import { useState, useEffect } from 'react';

interface HourlyPattern {
  hour: number;
  avgSpread: number;
  tradeCount: number;
  confidence: 'high' | 'medium' | 'low';
}

interface VolatilityAnalysis {
  recommendation: string;
  bestHour: number;
  currentHour: number;
  currentSpread: number;
  bestSpread: number;
  potentialSavings: number;
  hourlyPatterns: HourlyPattern[];
  analysisWindow: string;
}

interface TimingRecommendationProps {
  fromToken: string;
  toToken: string;
  tokenIssuer?: string;
  compact?: boolean;
}

export function TimingRecommendation({
  fromToken,
  toToken,
  tokenIssuer = 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN',
  compact = false,
}: TimingRecommendationProps) {
  const [analysis, setAnalysis] = useState<VolatilityAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    if (!fromToken || !toToken || fromToken === toToken) {
      setAnalysis(null);
      return;
    }

    const fetchVolatilityAnalysis = async () => {
      setLoading(true);
      try {
        const baseAsset = fromToken === 'XLM' ? 'native' : fromToken;
        const params = new URLSearchParams({
          base: baseAsset,
          counter: toToken,
          issuer: tokenIssuer,
        });

        const response = await fetch(`/api/volatility?${params}`);

        if (response.ok) {
          const data = await response.json();
          setAnalysis(data);
        } else {
          console.error('Volatility analysis failed');
          setAnalysis(null);
        }
      } catch (error) {
        console.error('Volatility analysis error:', error);
        setAnalysis(null);
      } finally {
        setLoading(false);
      }
    };

    fetchVolatilityAnalysis();

    // Refresh every 10 minutes (matches cache TTL)
    const intervalId = setInterval(fetchVolatilityAnalysis, 600000);
    return () => clearInterval(intervalId);
  }, [fromToken, toToken, tokenIssuer]);

  if (!analysis || fromToken === toToken) {
    return null;
  }

  if (loading && !analysis) {
    return (
      <div className="bg-gray-800 border border-yellow-500/30 rounded-md p-3">
        <div className="flex items-center gap-2">
          <div className="animate-spin">⏰</div>
          <span className="text-sm text-yellow-400">Analyzing market timing...</span>
        </div>
      </div>
    );
  }

  const getSeverityColor = () => {
    const savings = analysis.potentialSavings || 0;
    if (savings < 0.05) return 'bg-gray-800 border-green-500/30 text-green-400';
    if (savings < 0.15) return 'bg-gray-800 border-yellow-500/30 text-yellow-400';
    return 'bg-gray-800 border-orange-500/30 text-orange-400';
  };

  const getConfidenceIndicator = (confidence: 'high' | 'medium' | 'low') => {
    const indicators = {
      high: '🟢',
      medium: '🟡',
      low: '🔴',
    };
    return indicators[confidence] || '⚪';
  };

  if (compact) {
    return (
      <div className={`border-2 rounded-md p-2 ${getSeverityColor()}`}>
        <p className="text-xs font-semibold">{analysis.recommendation}</p>
      </div>
    );
  }

  return (
    <div className={`border-2 rounded-lg p-4 ${getSeverityColor()}`}>
      {/* Main Recommendation */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="text-sm font-bold mb-1">⏰ Market Timing Analysis</h3>
          <p className="text-sm font-semibold">{analysis.recommendation}</p>
          <p className="text-xs mt-1 opacity-75">
            Analysis window: {analysis.analysisWindow}
          </p>
        </div>
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="ml-2 px-3 py-1 text-xs font-semibold rounded-md bg-gray-700 text-white hover:bg-gray-600 transition-all"
        >
          {showDetails ? 'Hide' : 'Details'}
        </button>
      </div>

      {/* Current vs Best Stats */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="bg-gray-700/50 rounded-md p-2">
          <p className="text-xs text-gray-400">Current Hour</p>
          <p className="text-lg font-bold text-white">{analysis.currentHour ?? 0}:00 UTC</p>
          <p className="text-xs font-mono text-gray-300">{((analysis.currentSpread ?? 0) * 100).toFixed(3)}% spread</p>
        </div>
        <div className="bg-gray-700/50 rounded-md p-2">
          <p className="text-xs text-gray-400">Best Hour</p>
          <p className="text-lg font-bold text-white">{analysis.bestHour ?? 0}:00 UTC</p>
          <p className="text-xs font-mono text-gray-300">{((analysis.bestSpread ?? 0) * 100).toFixed(3)}% spread</p>
        </div>
        <div className="bg-gray-700/50 rounded-md p-2">
          <p className="text-xs text-gray-400">Potential Savings</p>
          <p className="text-lg font-bold text-white">{(analysis.potentialSavings ?? 0).toFixed(2)}%</p>
          <p className="text-xs text-gray-300">if you wait</p>
        </div>
      </div>

      {/* Detailed Hourly Breakdown */}
      {showDetails && (
        <div className="bg-gray-700/50 rounded-md p-3">
          <h4 className="text-xs font-bold mb-2 text-white">24-Hour Spread Pattern</h4>
          <div className="grid grid-cols-6 gap-1 max-h-48 overflow-y-auto">
            {analysis.hourlyPatterns.map((pattern) => {
              const isBestHour = pattern.hour === analysis.bestHour;
              const isCurrentHour = pattern.hour === analysis.currentHour;

              return (
                <div
                  key={pattern.hour}
                  className={`p-1 rounded text-center text-xs ${
                    isBestHour
                      ? 'bg-green-500/30 border-2 border-green-500'
                      : isCurrentHour
                      ? 'bg-yellow-500/30 border-2 border-yellow-500'
                      : 'bg-gray-600'
                  }`}
                >
                  <div className="font-bold text-white">{pattern.hour}:00</div>
                  <div className="text-[10px] font-mono text-gray-300">
                    {((pattern.avgSpread ?? 0) * 100).toFixed(2)}%
                  </div>
                  <div className="text-[10px]">
                    {getConfidenceIndicator(pattern.confidence)}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-2 flex gap-3 text-[10px] text-gray-300">
            <span>🟢 High confidence (10+ trades)</span>
            <span>🟡 Medium (3-10 trades)</span>
            <span>🔴 Low (&lt;3 trades)</span>
          </div>
        </div>
      )}
    </div>
  );
}
