'use client';

import { useState, useEffect } from 'react';

interface Route {
    path: string[];
    estimatedOutput: number;
    duration: number;
    slippage: number;
    savings: number;
}

interface RouteComparisonProps {
    sourceAsset: string;
    destAsset: string;
    amount: string;
    onSelectRoute: (route: Route) => void;
}

export default function RouteComparison({ sourceAsset, destAsset, amount, onSelectRoute }: RouteComparisonProps) {
    const [routes, setRoutes] = useState<Route[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);

    useEffect(() => {
        if (sourceAsset && destAsset && amount && parseFloat(amount) > 0) {
            fetchRoutes();
        }
    }, [sourceAsset, destAsset, amount]);

    const fetchRoutes = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/routes/compare', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sourceAsset, destAsset, amount })
            });

            const data = await res.json();
            setRoutes(data.routes || []);
            if (data.bestRoute) {
                setSelectedRoute(data.bestRoute);
                onSelectRoute(data.bestRoute);
            }
        } catch (error) {
            console.error('Route fetch error:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="glass p-6 rounded-2xl">
                <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div>
                    <span className="ml-3 text-gray-400">Finding best routes...</span>
                </div>
            </div>
        );
    }

    if (routes.length === 0) {
        return null;
    }

    return (
        <div className="glass p-6 rounded-2xl space-y-4">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                🧠 Smart Route Comparison
                <span className="text-sm font-normal text-gray-400">({routes.length} routes found)</span>
            </h3>

            <div className="space-y-3">
                {routes.map((route, index) => {
                    const isBest = index === 0;
                    const isSelected = selectedRoute?.path.join('→') === route.path.join('→');

                    return (
                        <div
                            key={route.path.join('-')}
                            onClick={() => {
                                setSelectedRoute(route);
                                onSelectRoute(route);
                            }}
                            className={`
                p-4 rounded-xl border-2 cursor-pointer transition-all
                ${isBest ? 'border-green-500 bg-green-500/10' : 'border-white/10 bg-black/20'}
                ${isSelected ? 'ring-2 ring-cyan-500' : ''}
                hover:border-cyan-500/50
              `}
                        >
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    {isBest && <span className="text-green-400 text-sm font-bold">✓ BEST</span>}
                                    <span className="text-white font-mono text-sm">
                                        {route.path.join(' → ')}
                                    </span>
                                </div>
                                {route.savings != null && route.savings !== 0 && (
                                    <span className={`text-sm font-bold ${route.savings > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                        {route.savings > 0 ? '+' : ''}{route.savings.toFixed(2)}%
                                    </span>
                                )}
                            </div>

                            <div className="grid grid-cols-3 gap-4 text-sm">
                                <div>
                                    <div className="text-gray-400">Output</div>
                                    <div className="text-white font-bold">
                                        {route.estimatedOutput.toFixed(4)} {destAsset}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-gray-400">Duration</div>
                                    <div className="text-white">{route.duration}s</div>
                                </div>
                                <div>
                                    <div className="text-gray-400">Slippage</div>
                                    <div className="text-white">{(route.slippage * 100).toFixed(1)}%</div>
                                </div>
                            </div>

                            {isBest && (
                                <div className="mt-3 text-xs text-green-400 flex items-center gap-1">
                                    <span>💰</span>
                                    <span>Most profitable route - Recommended!</span>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {routes.length > 1 && (
                <div className="text-sm text-gray-400 text-center pt-2 border-t border-white/10">
                    Comparing {routes.length} routes to find you the best deal
                </div>
            )}
        </div>
    );
}
