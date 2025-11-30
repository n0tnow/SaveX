'use client';

import { useState, useEffect } from 'react';

interface PathRoute {
  tokens: string[];
  expectedOutput: string;
  totalFee: number;
  hops: number;
}

interface PathFindingResponse {
  recommended: PathRoute;
  alternatives: PathRoute[];
  timestamp: number;
}

interface RouteVisualizerProps {
  fromToken: string;
  toToken: string;
  amount: string;
  onRouteSelected?: (route: PathRoute) => void;
}

export function RouteVisualizer({ fromToken, toToken, amount, onRouteSelected }: RouteVisualizerProps) {
  const [pathData, setPathData] = useState<PathFindingResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState<'recommended' | number>('recommended');

  useEffect(() => {
    if (!amount || !fromToken || !toToken || fromToken === toToken) {
      setPathData(null);
      return;
    }

    const fetchOptimalPath = async () => {
      setLoading(true);
      try {
        const response = await fetch('/api/path-finding', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fromToken,
            toToken,
            amount,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          setPathData(data);

          // Notify parent of recommended route
          if (onRouteSelected && data.recommended) {
            onRouteSelected(data.recommended);
          }
        } else {
          console.error('Path finding failed');
          setPathData(null);
        }
      } catch (error) {
        console.error('Path finding error:', error);
        setPathData(null);
      } finally {
        setLoading(false);
      }
    };

    // Debounce the API call
    const timeoutId = setTimeout(fetchOptimalPath, 500);
    return () => clearTimeout(timeoutId);
  }, [fromToken, toToken, amount, onRouteSelected]);

  const renderRoute = (route: PathRoute, label: string, isRecommended: boolean = false) => {
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

    return (
      <div
        key={label}
        className={`p-3 rounded-md border-2 cursor-pointer transition-all ${
          isRecommended
            ? 'bg-green-500/20 border-green-500 hover:bg-green-500/30'
            : 'bg-gray-700/50 border-gray-600 hover:bg-gray-700'
        }`}
        onClick={() => {
          setSelectedRoute(isRecommended ? 'recommended' : parseInt(label.split(' ')[1]) - 1);
          if (onRouteSelected) {
            onRouteSelected(route);
          }
        }}
      >
        <div className="flex items-center justify-between mb-2">
          <span className={`text-xs font-bold ${isRecommended ? 'text-green-400' : 'text-gray-300'}`}>
            {label}
          </span>
          <span className="text-xs text-gray-400">
            {route.hops} hop{route.hops > 1 ? 's' : ''}
          </span>
        </div>

        {/* Visual Route Path */}
        <div className="flex items-center gap-1 mb-2 overflow-x-auto">
          {route.tokens.map((token, idx) => (
            <div key={idx} className="flex items-center">
              <div className="flex flex-col items-center">
                <span className="text-lg">{getTokenIcon(token)}</span>
                <span className="text-xs font-mono font-semibold text-gray-300">{token}</span>
              </div>
              {idx < route.tokens.length - 1 && (
                <span className="mx-1 text-gray-500">→</span>
              )}
            </div>
          ))}
        </div>

        {/* Route Details */}
        <div className="flex justify-between text-xs">
          <div>
            <span className="text-gray-400">Output:</span>
            <span className="ml-1 font-mono font-bold text-white">
              {parseFloat(route.expectedOutput).toFixed(4)}
            </span>
          </div>
          <div>
            <span className="text-gray-400">Fee:</span>
            <span className="ml-1 font-mono font-bold text-red-400">
              {(route.totalFee * 100).toFixed(2)}%
            </span>
          </div>
        </div>
      </div>
    );
  };

  if (!amount || !fromToken || !toToken || fromToken === toToken) {
    return null;
  }

  if (loading) {
    return (
      <div className="bg-gray-800 border border-blue-500/30 rounded-md p-4">
        <div className="flex items-center gap-2">
          <div className="animate-spin">🔄</div>
          <span className="text-sm text-blue-400">Finding optimal route...</span>
        </div>
      </div>
    );
  }

  if (!pathData) {
    return null;
  }

  return (
    <div className="bg-gray-800 border border-blue-500/30 rounded-lg p-4">
      <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
        🗺️ Optimal Swap Routes
        <span className="text-xs text-gray-400 font-normal">
          (Cached • Updated {Math.floor((Date.now() - pathData.timestamp) / 1000)}s ago)
        </span>
      </h3>

      <div className="space-y-2">
        {/* Recommended Route */}
        {renderRoute(pathData.recommended, '✅ Recommended', true)}

        {/* Alternative Routes */}
        {pathData.alternatives.map((route, idx) => (
          renderRoute(route, `Alternative ${idx + 1}`, false)
        ))}
      </div>

      {/* Savings Info */}
      {pathData.alternatives.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-700">
          <p className="text-xs text-gray-400">
            💡 <span className="font-semibold">Tip:</span> Direct routes save on fees but may have worse prices.
            Multi-hop routes via liquid pairs often yield better output.
          </p>
        </div>
      )}
    </div>
  );
}
