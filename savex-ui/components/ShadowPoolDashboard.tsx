"use client";

import { useShadowPools, useArbitrageOpportunities, useStats, useTestnetPools } from '@/hooks/useShadowPools';
import SwapInterface from '@/components/SwapInterface';
import { WalletConnect } from '@/components/WalletConnect';
import ArbitrageDetector from '@/components/ArbitrageDetector';

export default function ShadowPoolDashboard() {
    const { stats, loading: statsLoading } = useStats();
    const { pools, loading: poolsLoading } = useShadowPools(10);
    const { opportunities, loading: arbLoading } = useArbitrageOpportunities(1, 'high');
    const { pools: testnetPools, loading: testnetLoading } = useTestnetPools();

    if (statsLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-black">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto mb-4"></div>
                    <p className="text-cyan-400">Loading Shadow Pool Data...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black text-white selection:bg-cyan-500/30">
            {/* Animated Background */}
            <div className="fixed inset-0 bg-gradient-to-br from-black via-gray-900 to-black pointer-events-none">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(0,240,255,0.05),transparent_50%)]"></div>
            </div>

            <div className="relative z-10 container mx-auto px-4 py-8">
                <div className="flex flex-col md:flex-row justify-between items-center mb-8 border-b border-white/10 pb-6">
                    <div>
                        <h1 className="text-4xl font-extrabold bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent mb-2">
                            Shadow Pool Dashboard
                        </h1>
                        <p className="text-gray-400 text-sm">Advanced Liquidity Analysis & Execution</p>
                    </div>
                    <div className="flex items-center gap-3 mt-4 md:mt-0">
                        <span className="glass px-4 py-2 rounded-xl text-xs border border-cyan-500/30 text-cyan-400 font-mono">
                            ● Testnet Active
                        </span>
                    </div>
                </div>

                {/* Wallet Connection */}
                <div className="mb-8">
                    <WalletConnect />
                </div>

                {/* Stats Overview */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <StatCard
                        title="Total Pools"
                        value={stats?.pools?.total || 0}
                        subtitle="Selected from 37K+"
                        icon="🏊"
                    />
                    <StatCard
                        title="Arbitrage Opps"
                        value={stats?.arbitrage?.totalOpportunities || 0}
                        subtitle={`${stats?.arbitrage?.highConfidence || 0} high confidence`}
                        icon="💰"
                    />
                    <StatCard
                        title="Tracked Tokens"
                        value={stats?.prices?.totalTokens || 0}
                        subtitle="External prices"
                        icon="🪙"
                    />
                    <StatCard
                        title="Testnet Deployed"
                        value={testnetPools?.length || 0}
                        subtitle="Active pools"
                        icon="🚀"
                    />
                </div>

                {/* Swap & Testnet Pools Section */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
                    {/* Swap Interface */}
                    <div className="lg:col-span-1">
                        <SwapInterface />
                    </div>

                    {/* Testnet Pools List */}
                    <div className="lg:col-span-2 glass rounded-2xl p-6 border border-white/10">
                        <h2 className="text-2xl font-bold mb-6 text-white flex items-center gap-2">
                            Deployed Testnet Pools
                            <span className="text-xs font-normal text-gray-500 bg-white/5 px-2 py-1 rounded-lg">Live Data</span>
                        </h2>
                        {testnetLoading ? (
                            <div className="text-center py-8 text-gray-400">Loading deployed pools...</div>
                        ) : testnetPools.length === 0 ? (
                            <div className="text-center py-8 text-gray-500 border border-dashed border-white/10 rounded-xl">
                                No pools deployed yet. Run deployment script.
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full">
                                    <thead>
                                        <tr className="border-b border-white/10">
                                            <th className="text-left py-4 px-4 text-gray-400 font-medium text-sm">Pair</th>
                                            <th className="text-left py-4 px-4 text-gray-400 font-medium text-sm">Pool ID</th>
                                            <th className="text-right py-4 px-4 text-gray-400 font-medium text-sm">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {testnetPools.map((pool: any) => (
                                            <tr key={pool.poolId} className="hover:bg-white/5 transition-colors">
                                                <td className="py-4 px-4 font-bold text-white">{pool.pairName}</td>
                                                <td className="py-4 px-4 font-mono text-xs text-cyan-400/80" title={pool.liquidityPoolId}>
                                                    {pool.liquidityPoolId.substring(0, 12)}...
                                                </td>
                                                <td className="py-4 px-4 text-right">
                                                    <span className="px-3 py-1 rounded-full text-xs bg-green-500/10 text-green-400 border border-green-500/20">
                                                        Active
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>

                {/* Top Mainnet Pools */}
                <div className="glass rounded-2xl p-6 mb-8 border border-white/10">
                    <h2 className="text-2xl font-bold mb-6 text-white">Top Mainnet Pools (Reference)</h2>
                    {poolsLoading ? (
                        <div className="text-center py-8 text-gray-400">Loading pools...</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full">
                                <thead>
                                    <tr className="border-b border-white/10">
                                        <th className="text-left py-4 px-4 text-gray-400 font-medium text-sm">Pair</th>
                                        <th className="text-left py-4 px-4 text-gray-400 font-medium text-sm">Category</th>
                                        <th className="text-right py-4 px-4 text-gray-400 font-medium text-sm">Score</th>
                                        <th className="text-right py-4 px-4 text-gray-400 font-medium text-sm">Shares</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {pools.map((pool) => (
                                        <tr key={pool.poolId} className="hover:bg-white/5 transition-colors">
                                            <td className="py-4 px-4 font-medium text-white">{pool.pairName}</td>
                                            <td className="py-4 px-4">
                                                <span className={`px-3 py-1 rounded-full text-xs border ${getCategoryColor(pool.category)}`}>
                                                    {pool.category}
                                                </span>
                                            </td>
                                            <td className="py-4 px-4 text-right text-gray-300">{pool.totalScore.toFixed(4)}</td>
                                            <td className="py-4 px-4 text-right text-gray-300">{parseFloat(pool.totalShares).toFixed(2)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Arbitrage Detector */}
                <div className="mb-8">
                    <ArbitrageDetector />
                </div>
            </div>
        </div>
    );
}

function StatCard({ title, value, subtitle, icon }: any) {
    return (
        <div className="glass rounded-2xl p-6 border border-white/10 hover:border-cyan-500/30 transition-all">
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-gray-400 text-sm font-medium">{title}</h3>
                <span className="text-2xl grayscale opacity-80">{icon}</span>
            </div>
            <div className="text-3xl font-bold mb-1 text-white">{value.toLocaleString()}</div>
            <p className="text-sm text-gray-500">{subtitle}</p>
        </div>
    );
}

function getCategoryColor(category: string) {
    const colors: any = {
        major: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
        stablecoin: 'bg-green-500/10 text-green-400 border-green-500/20',
        defi: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
        longtail: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
    };
    return colors[category] || colors.longtail;
}

function getConfidenceColor(confidence: string) {
    const colors: any = {
        high: 'bg-green-500/10 text-green-400',
        medium: 'bg-yellow-500/10 text-yellow-400',
        low: 'bg-red-500/10 text-red-400',
    };
    return colors[confidence] || colors.low;
}
