'use client';

import { useEffect, useState } from 'react';
import Header from '@/components/Header';
import BackgroundPaths from '@/components/BackgroundPaths';
import { TrendingUp, Droplet, Activity, AlertCircle } from 'lucide-react';
import { SimpleArbitrage } from '@/components/SimpleArbitrage';

export default function LiquidityPage() {
    const [pools, setPools] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [arbitrageOpportunities, setArbitrageOpportunities] = useState<any[]>([]);
    const [showArbitragePopup, setShowArbitragePopup] = useState(false);
    const [activeTab, setActiveTab] = useState<'pools' | 'arbitrage'>('pools');

    useEffect(() => {
        // Load testnet pools
        const loadPools = async () => {
            try {
                const response = await fetch('/api/testnet-pools');
                const data = await response.json();
                setPools(data.pools || []);
            } catch (error) {
                console.error('Failed to load pools:', error);
            } finally {
                setLoading(false);
            }
        };

        loadPools();

        // Check for arbitrage opportunities (once per session)
        const hasShownArbitrage = sessionStorage.getItem('arbitragePopupShown');
        if (!hasShownArbitrage) {
            // Load real arbitrage data from backend
            const loadArbitrage = async () => {
                try {
                    const response = await fetch('/api/arbitrage');
                    const data = await response.json();

                    console.log('Arbitrage data:', data);

                    if (data.opportunities && data.opportunities.length > 0) {
                        setArbitrageOpportunities(data.opportunities);
                        setShowArbitragePopup(true);
                        sessionStorage.setItem('arbitragePopupShown', 'true');
                    }
                } catch (error) {
                    console.error('Failed to load arbitrage data:', error);
                }
            };

            setTimeout(loadArbitrage, 2000);
        }
    }, []);

    const closeArbitragePopup = () => {
        setShowArbitragePopup(false);
    };

    // Calculate stats from real pool data
    const stats = {
        totalPools: pools.length,
        totalTVL: pools.reduce((sum, pool) => {
            const tvlA = parseFloat(pool.tokenA?.amount || '0');
            const tvlB = parseFloat(pool.tokenB?.amount || '0');
            return sum + tvlA + tvlB;
        }, 0),
        avgAPR: '8.5%', // This would come from real calculations
        activePositions: 0 // Would come from user's wallet data
    };

    return (
        <div className="min-h-screen bg-black text-white relative">
            <BackgroundPaths />

            {/* Header */}
            <Header />

            {/* Arbitrage Popup */}
            {showArbitragePopup && arbitrageOpportunities.length > 0 && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
                    <div className="glass rounded-2xl p-6 max-w-md mx-4 border border-cyan-500/30 shadow-2xl shadow-cyan-500/20">
                        <div className="flex items-start gap-4 mb-4">
                            <div className="p-3 bg-cyan-500/20 rounded-xl">
                                <TrendingUp className="w-6 h-6 text-cyan-400" />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-xl font-bold text-white mb-1">Arbitrage Opportunity Detected!</h3>
                                <p className="text-sm text-gray-400">Profit from price differences</p>
                            </div>
                        </div>

                        {arbitrageOpportunities.map((opp, i) => (
                            <div key={i} className="bg-black/40 rounded-xl p-4 mb-4">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-white font-bold">{opp.pairName}</span>
                                    <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded-full text-xs font-bold">
                                        {opp.confidence.toUpperCase()}
                                    </span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-400">Potential Profit</span>
                                    <span className="text-green-400 font-bold">+{opp.profitPercent.toFixed(2)}%</span>
                                </div>
                                <div className="flex justify-between text-sm mt-1">
                                    <span className="text-gray-400">Type</span>
                                    <span className="text-white capitalize">{opp.type}</span>
                                </div>
                            </div>
                        ))}

                        <button
                            onClick={closeArbitragePopup}
                            className="w-full bg-gradient-to-r from-cyan-500 to-purple-500 text-white py-3 rounded-xl font-bold hover:shadow-lg hover:shadow-cyan-500/20 transition-all"
                        >
                            Got it!
                        </button>
                    </div>
                </div>
            )}

            {/* Main Content */}
            <div className="relative z-10 container mx-auto px-4 pt-24 pb-8">
                {/* Page Header */}
                <div className="mb-8">
                    <h1 className="text-4xl font-bold mb-2">Liquidity & Arbitrage</h1>
                    <p className="text-gray-400">Provide liquidity or execute arbitrage opportunities</p>
                </div>

                {/* Tabs */}
                <div className="mb-8 flex gap-4 border-b border-white/10">
                    <button
                        onClick={() => setActiveTab('pools')}
                        className={`px-6 py-3 font-semibold transition-all border-b-2 ${
                            activeTab === 'pools'
                                ? 'border-cyan-500 text-cyan-400'
                                : 'border-transparent text-gray-400 hover:text-white'
                        }`}
                    >
                        <Droplet className="w-5 h-5 inline mr-2" />
                        Liquidity Pools
                    </button>
                    <button
                        onClick={() => setActiveTab('arbitrage')}
                        className={`px-6 py-3 font-semibold transition-all border-b-2 ${
                            activeTab === 'arbitrage'
                                ? 'border-cyan-500 text-cyan-400'
                                : 'border-transparent text-gray-400 hover:text-white'
                        }`}
                    >
                        <TrendingUp className="w-5 h-5 inline mr-2" />
                        Simple Arbitrage
                    </button>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <StatCard
                        icon={<Droplet className="w-5 h-5" />}
                        title="Total Pools"
                        value={stats.totalPools.toString()}
                        iconBg="bg-cyan-500/20"
                        iconColor="text-cyan-400"
                    />
                    <StatCard
                        icon={<TrendingUp className="w-5 h-5" />}
                        title="Total TVL"
                        value={`${stats.totalTVL.toLocaleString()} XLM`}
                        iconBg="bg-purple-500/20"
                        iconColor="text-purple-400"
                    />
                    <StatCard
                        icon={<Activity className="w-5 h-5" />}
                        title="Avg APR"
                        value={stats.avgAPR}
                        iconBg="bg-green-500/20"
                        iconColor="text-green-400"
                    />
                    <StatCard
                        icon={<AlertCircle className="w-5 h-5" />}
                        title="My Positions"
                        value={stats.activePositions.toString()}
                        iconBg="bg-orange-500/20"
                        iconColor="text-orange-400"
                    />
                </div>

                {/* Tab Content */}
                {activeTab === 'pools' && (
                    <div className="glass rounded-2xl p-6 shadow-2xl backdrop-blur-xl">
                        <h2 className="text-2xl font-bold mb-6">Available Pools</h2>
                        {loading ? (
                            <div className="text-center py-12">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto mb-4"></div>
                                <p className="text-gray-400">Loading pools...</p>
                            </div>
                        ) : (
                            <LiquidityPoolsList pools={pools} />
                        )}
                    </div>
                )}

                {activeTab === 'arbitrage' && (
                    <div className="max-w-2xl mx-auto">
                        <SimpleArbitrage />
                    </div>
                )}
            </div>
        </div>
    );
}

function StatCard({ icon, title, value, iconBg, iconColor }: {
    icon: React.ReactNode;
    title: string;
    value: string;
    iconBg: string;
    iconColor: string;
}) {
    return (
        <div className="glass rounded-xl p-6 shadow-xl backdrop-blur-xl hover:scale-105 transition-transform">
            <div className="flex items-center gap-3 mb-3">
                <div className={`p-2 rounded-lg ${iconBg}`}>
                    <div className={iconColor}>{icon}</div>
                </div>
                <div className="text-sm text-gray-400">{title}</div>
            </div>
            <div className="text-2xl font-bold text-white">{value}</div>
        </div>
    );
}

function LiquidityPoolsList({ pools }: { pools: any[] }) {
    if (pools.length === 0) {
        return (
            <div className="text-center py-12 text-gray-400">
                <p>No pools available</p>
            </div>
        );
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full">
                <thead>
                    <tr className="border-b border-white/10">
                        <th className="text-left py-4 px-4 text-gray-400 font-medium">Pool</th>
                        <th className="text-right py-4 px-4 text-gray-400 font-medium">Reserve A</th>
                        <th className="text-right py-4 px-4 text-gray-400 font-medium">Reserve B</th>
                        <th className="text-right py-4 px-4 text-gray-400 font-medium">Price</th>
                        <th className="text-right py-4 px-4 text-gray-400 font-medium">Created</th>
                    </tr>
                </thead>
                <tbody>
                    {pools.map((pool, i) => {
                        const reserveA = parseFloat(pool.tokenA?.amount || '0');
                        const reserveB = parseFloat(pool.tokenB?.amount || '0');
                        const price = pool.price || (reserveB / reserveA);
                        const created = pool.createdAt ? new Date(pool.createdAt).toLocaleDateString() : 'N/A';

                        return (
                            <tr key={i} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                <td className="py-4 px-4">
                                    <div className="font-bold text-white">
                                        {pool.tokenA?.code || pool.tokenA?.symbol} / {pool.tokenB?.code || pool.tokenB?.symbol}
                                    </div>
                                    <div className="text-xs text-gray-500 mt-1">{pool.pairName}</div>
                                </td>
                                <td className="py-4 px-4 text-right text-white">
                                    {reserveA.toLocaleString(undefined, { maximumFractionDigits: 2 })} {pool.tokenA?.code}
                                </td>
                                <td className="py-4 px-4 text-right text-white">
                                    {reserveB.toLocaleString(undefined, { maximumFractionDigits: 2 })} {pool.tokenB?.code}
                                </td>
                                <td className="py-4 px-4 text-right text-cyan-400 font-mono">
                                    {price.toFixed(6)}
                                </td>
                                <td className="py-4 px-4 text-right text-gray-400 text-sm">
                                    {created}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
