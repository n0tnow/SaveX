'use client';

import { useState } from 'react';
import Link from 'next/link';
import WaveBackground from '@/components/WaveBackground';
import Header from '@/components/Header';

export default function LandingPage() {
    const [email, setEmail] = useState('');

    return (
        <div className="min-h-screen relative">
            {/* Animated Wave Background */}
            <WaveBackground />

            {/* Content */}
            <div className="relative z-10">
                {/* Navigation - Using Swave-style Header */}
                <Header transparent={true} />

                {/* Hero Section */}
                <section className="min-h-screen flex items-center justify-center px-6 pt-20">
                    <div className="max-w-6xl mx-auto text-center">
                        <div className="mb-6 inline-block">
                            <div className="px-4 py-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 text-cyan-400 text-sm font-medium">
                                🚀 Next Generation DeFi Platform
                            </div>
                        </div>

                        <h1 className="text-6xl md:text-8xl font-bold mb-6 leading-tight">
                            <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
                                Smart Swaps
                            </span>
                            <br />
                            <span className="text-white">
                                Maximum Savings
                            </span>
                        </h1>

                        <p className="text-xl md:text-2xl text-gray-400 mb-12 max-w-3xl mx-auto leading-relaxed">
                            Experience the future of decentralized trading with AI-powered arbitrage detection,
                            split transfers, and family packages on Stellar Network
                        </p>

                        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
                            <Link
                                href="/swap"
                                className="px-8 py-4 bg-gradient-to-r from-cyan-500 to-purple-500 text-white rounded-2xl font-bold text-lg hover:shadow-2xl hover:shadow-cyan-500/50 transition-all transform hover:scale-105"
                            >
                                Start Trading Now
                            </Link>
                            <a
                                href="#features"
                                className="px-8 py-4 border border-white/20 text-white rounded-2xl font-bold text-lg hover:bg-white/10 transition-all"
                            >
                                Learn More
                            </a>
                        </div>

                        {/* Stats */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
                            <div className="glass rounded-2xl p-6 border border-white/10">
                                <div className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent mb-2">
                                    $2M+
                                </div>
                                <div className="text-gray-400 text-sm">Total Volume</div>
                            </div>
                            <div className="glass rounded-2xl p-6 border border-white/10">
                                <div className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-2">
                                    15%
                                </div>
                                <div className="text-gray-400 text-sm">Avg. Savings</div>
                            </div>
                            <div className="glass rounded-2xl p-6 border border-white/10">
                                <div className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent mb-2">
                                    1000+
                                </div>
                                <div className="text-gray-400 text-sm">Active Users</div>
                            </div>
                            <div className="glass rounded-2xl p-6 border border-white/10">
                                <div className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent mb-2">
                                    24/7
                                </div>
                                <div className="text-gray-400 text-sm">Uptime</div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Features Section */}
                <section id="features" className="py-32 px-6">
                    <div className="max-w-7xl mx-auto">
                        <div className="text-center mb-20">
                            <h2 className="text-5xl font-bold mb-6 bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                                Powerful Features
                            </h2>
                            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
                                Everything you need for optimal DeFi trading on Stellar
                            </p>
                        </div>

                        <div className="grid md:grid-cols-3 gap-8">
                            {/* Feature 1 */}
                            <div className="glass rounded-3xl p-8 border border-white/10 hover:border-cyan-500/50 transition-all group">
                                <div className="text-5xl mb-6 group-hover:scale-110 transition-transform">🔄</div>
                                <h3 className="text-2xl font-bold text-white mb-4">Smart Arbitrage</h3>
                                <p className="text-gray-400 leading-relaxed">
                                    AI-powered arbitrage detection finds the best routes across multiple DEXs,
                                    maximizing your returns on every trade.
                                </p>
                            </div>

                            {/* Feature 2 */}
                            <div className="glass rounded-3xl p-8 border border-white/10 hover:border-purple-500/50 transition-all group">
                                <div className="text-5xl mb-6 group-hover:scale-110 transition-transform">✂️</div>
                                <h3 className="text-2xl font-bold text-white mb-4">Split Transfers</h3>
                                <p className="text-gray-400 leading-relaxed">
                                    Execute large trades across multiple time windows to minimize slippage
                                    and get better average prices.
                                </p>
                            </div>

                            {/* Feature 3 */}
                            <div className="glass rounded-3xl p-8 border border-white/10 hover:border-blue-500/50 transition-all group">
                                <div className="text-5xl mb-6 group-hover:scale-110 transition-transform">👨‍👩‍👧‍👦</div>
                                <h3 className="text-2xl font-bold text-white mb-4">Family Packages</h3>
                                <p className="text-gray-400 leading-relaxed">
                                    Get up to 15% discount on fees when trading with family members.
                                    Save more together.
                                </p>
                            </div>

                            {/* Feature 4 */}
                            <div className="glass rounded-3xl p-8 border border-white/10 hover:border-cyan-500/50 transition-all group">
                                <div className="text-5xl mb-6 group-hover:scale-110 transition-transform">⚡</div>
                                <h3 className="text-2xl font-bold text-white mb-4">Lightning Fast</h3>
                                <p className="text-gray-400 leading-relaxed">
                                    Built on Stellar Network for near-instant transactions with minimal fees.
                                    Trade at the speed of light.
                                </p>
                            </div>

                            {/* Feature 5 */}
                            <div className="glass rounded-3xl p-8 border border-white/10 hover:border-purple-500/50 transition-all group">
                                <div className="text-5xl mb-6 group-hover:scale-110 transition-transform">🔒</div>
                                <h3 className="text-2xl font-bold text-white mb-4">Secure & Non-Custodial</h3>
                                <p className="text-gray-400 leading-relaxed">
                                    Your keys, your crypto. We never hold your funds. All transactions
                                    are signed directly from your wallet.
                                </p>
                            </div>

                            {/* Feature 6 */}
                            <div className="glass rounded-3xl p-8 border border-white/10 hover:border-blue-500/50 transition-all group">
                                <div className="text-5xl mb-6 group-hover:scale-110 transition-transform">📊</div>
                                <h3 className="text-2xl font-bold text-white mb-4">Real-time Analytics</h3>
                                <p className="text-gray-400 leading-relaxed">
                                    Track your portfolio, analyze market trends, and make informed decisions
                                    with our advanced analytics dashboard.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Technology Section */}
                <section id="technology" className="py-32 px-6 bg-gradient-to-b from-transparent via-cyan-500/5 to-transparent">
                    <div className="max-w-7xl mx-auto">
                        <div className="text-center mb-20">
                            <h2 className="text-5xl font-bold mb-6 bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                                Built on Stellar
                            </h2>
                            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
                                Leveraging the power of Stellar blockchain for optimal performance
                            </p>
                        </div>

                        <div className="grid md:grid-cols-2 gap-12 items-center">
                            <div className="space-y-6">
                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-cyan-500/20 flex items-center justify-center flex-shrink-0">
                                        <span className="text-2xl">🌟</span>
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-white mb-2">Low Fees</h3>
                                        <p className="text-gray-400">Transactions cost fractions of a cent, making DeFi accessible to everyone.</p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                                        <span className="text-2xl">⚡</span>
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-white mb-2">Fast Settlement</h3>
                                        <p className="text-gray-400">Transactions confirm in 3-5 seconds, no more waiting for confirmations.</p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                                        <span className="text-2xl">🌍</span>
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-white mb-2">Global Reach</h3>
                                        <p className="text-gray-400">Trade with anyone, anywhere, anytime. No borders, no limits.</p>
                                    </div>
                                </div>
                            </div>

                            <div className="glass rounded-3xl p-12 border border-white/10">
                                <div className="text-center">
                                    <div className="text-6xl mb-6">🚀</div>
                                    <h3 className="text-3xl font-bold text-white mb-4">Ready to Launch?</h3>
                                    <p className="text-gray-400 mb-8">
                                        Join thousands of traders already saving on fees with SaveX
                                    </p>
                                    <Link
                                        href="/swap"
                                        className="inline-block px-8 py-4 bg-gradient-to-r from-cyan-500 to-purple-500 text-white rounded-2xl font-bold text-lg hover:shadow-2xl hover:shadow-cyan-500/50 transition-all transform hover:scale-105"
                                    >
                                        Launch App
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* CTA Section */}
                <section className="py-32 px-6">
                    <div className="max-w-4xl mx-auto text-center">
                        <div className="glass rounded-3xl p-12 border border-white/10">
                            <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                                Start Saving Today
                            </h2>
                            <p className="text-xl text-gray-400 mb-8">
                                Join the DeFi revolution and maximize your trading profits
                            </p>
                            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                                <Link
                                    href="/swap"
                                    className="px-8 py-4 bg-gradient-to-r from-cyan-500 to-purple-500 text-white rounded-2xl font-bold text-lg hover:shadow-2xl hover:shadow-cyan-500/50 transition-all transform hover:scale-105"
                                >
                                    Get Started
                                </Link>
                                <a
                                    href="https://stellar.org"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-8 py-4 border border-white/20 text-white rounded-2xl font-bold text-lg hover:bg-white/10 transition-all"
                                >
                                    Learn About Stellar
                                </a>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Footer */}
                <footer className="py-12 px-6 border-t border-white/10">
                    <div className="max-w-7xl mx-auto">
                        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                            <div className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                                SaveX
                            </div>
                            <div className="flex gap-8 text-gray-400">
                                <a href="#features" className="hover:text-white transition-colors">Features</a>
                                <a href="#technology" className="hover:text-white transition-colors">Technology</a>
                                <Link href="/swap" className="hover:text-white transition-colors">App</Link>
                            </div>
                            <div className="text-gray-400 text-sm">
                                © 2025 SaveX. Built on Stellar.
                            </div>
                        </div>
                    </div>
                </footer>
            </div>
        </div>
    );
}
