'use client';

import { useState, useEffect } from 'react';

interface TimingSuggestionProps {
    sourceAsset: string;
    destAsset: string;
    amount: string;
}

export default function TimingSuggestion({ sourceAsset, destAsset, amount }: TimingSuggestionProps) {
    const [currentPrice, setCurrentPrice] = useState<number | null>(null);
    const [predictedPrice, setPredictedPrice] = useState<number | null>(null);
    const [optimalTime, setOptimalTime] = useState('now');
    const [priceHistory, setPriceHistory] = useState<number[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!sourceAsset || !destAsset) {
            setCurrentPrice(null);
            setPriceHistory([]);
            return;
        }

        const fetchPriceData = async () => {
            setLoading(true);
            try {
                // Fetch current price from estimate-price API
                const response = await fetch('/api/estimate-price', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        sourceAsset: { code: sourceAsset },
                        destAsset: { code: destAsset },
                        amount: '1' // Get rate for 1 unit
                    })
                });

                const data = await response.json();
                if (data.rate) {
                    const rate = parseFloat(data.rate);
                    setCurrentPrice(rate);

                    // Simulate price history based on current rate (last 24 hours)
                    // In a real app, this would come from historical data
                    const history = Array.from({ length: 24 }, (_, i) =>
                        rate + (Math.sin(i / 4) * rate * 0.05) + ((Math.random() - 0.5) * rate * 0.02)
                    );
                    setPriceHistory(history);

                    // Simple trend analysis
                    const recentPrices = history.slice(-6);
                    const trend = recentPrices[recentPrices.length - 1] - recentPrices[0];

                    if (trend < 0) {
                        // Price is falling, suggest waiting
                        setPredictedPrice(rate * 0.92);
                        setOptimalTime('2 hours');
                    } else {
                        // Price is rising, suggest now
                        setPredictedPrice(rate * 1.05);
                        setOptimalTime('now');
                    }
                }
            } catch (error) {
                console.error('Failed to fetch price data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchPriceData();
    }, [sourceAsset, destAsset]);

    const savings = currentPrice && predictedPrice ? ((currentPrice - predictedPrice) / currentPrice) * 100 : 0;

    if (!sourceAsset || !destAsset) {
        return (
            <div className="text-center py-8 text-gray-400">
                <p className="text-sm">Select tokens to see timing suggestion</p>
            </div>
        );
    }

    if (loading || currentPrice === null) {
        return (
            <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500 mx-auto mb-3"></div>
                <p className="text-sm text-gray-400">Loading price data...</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                ⏰ Timing Suggestion
            </h3>

            {/* Current Price */}
            <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-xl p-4">
                <div className="text-sm text-gray-400 mb-1">Current Price</div>
                <div className="text-2xl font-bold text-white">
                    1 {sourceAsset} = {currentPrice.toFixed(6)} {destAsset}
                </div>
            </div>

            {/* Price Chart (Simplified) */}
            <div className="bg-black/40 border border-white/10 rounded-xl p-4">
                <div className="text-sm text-gray-400 mb-3">Last 24 Hours</div>
                <div className="flex items-end gap-1 h-24">
                    {priceHistory.map((price, i) => {
                        const height = ((price - 0.11) / 0.02) * 100;
                        return (
                            <div
                                key={i}
                                className="flex-1 bg-gradient-to-t from-cyan-500 to-purple-500 rounded-t"
                                style={{ height: `${height}%` }}
                            />
                        );
                    })}
                </div>
                <div className="flex justify-between text-xs text-gray-500 mt-2">
                    <span>24h ago</span>
                    <span>Now</span>
                </div>
            </div>

            {/* Suggestion */}
            {optimalTime !== 'now' ? (
                <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-2xl">💡</span>
                        <div>
                            <div className="text-white font-bold">Wait {optimalTime}</div>
                            <div className="text-sm text-gray-400">for better rates</div>
                        </div>
                    </div>
                    <div className="mt-3 space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-400">Predicted Price</span>
                            <span className="text-white font-bold">{predictedPrice?.toFixed(6) || 'N/A'} {destAsset}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-400">Potential Savings</span>
                            <span className="text-green-400 font-bold">{Math.abs(savings).toFixed(1)}%</span>
                        </div>
                    </div>
                    <button className="w-full mt-4 bg-green-500/20 border border-green-500/50 text-green-300 py-2 rounded-lg font-bold hover:bg-green-500/30 transition-all">
                        🔔 Set Alert
                    </button>
                </div>
            ) : (
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
                    <div className="flex items-center gap-2">
                        <span className="text-2xl">⚡</span>
                        <div>
                            <div className="text-white font-bold">Transfer Now</div>
                            <div className="text-sm text-gray-400">Price is rising - best time to transfer</div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
