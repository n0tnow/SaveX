'use client';

import { useState } from 'react';
import SwapInterface from '@/components/SwapInterface';
import Header from '@/components/Header';
import BackgroundPaths from '@/components/BackgroundPaths';
import { DexComparisonWidget } from '@/components/DexComparisonWidget';
import { FeeCalculator } from '@/components/FeeCalculator';

export default function SwapPage() {
    // State to track swap values for widgets
    const [fromToken, setFromToken] = useState('');
    const [toToken, setToToken] = useState('');
    const [amount, setAmount] = useState(0);

    return (
        <div className="min-h-screen bg-black text-white relative">
            <BackgroundPaths />

            {/* Header */}
            <Header />

            {/* Main Content */}
            <div className="relative z-10 container mx-auto px-4 pt-24 pb-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main Swap Interface - Takes 2 columns on large screens */}
                    <div className="lg:col-span-2">
                        <SwapInterface />
                    </div>

                    {/* Sidebar Widgets - 1 column on large screens */}
                    <div className="space-y-6">
                        {/* DEX Comparison */}
                        <DexComparisonWidget
                            fromToken={fromToken}
                            toToken={toToken}
                            amount={amount}
                        />

                        {/* Fee Calculator */}
                        <FeeCalculator
                            amount={amount}
                            isBatch={false}
                            batchSize={1}
                        />

                        {/* Info Card */}
                        <div className="glass rounded-xl p-4 border border-white/10">
                            <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                                <span>ℹ️</span>
                                How SaveX Saves You Money
                            </h3>
                            <ul className="text-sm text-gray-400 space-y-2">
                                <li className="flex items-start gap-2">
                                    <span className="text-cyan-400 mt-0.5">✓</span>
                                    <span>Automatically finds the cheapest DEX for your swap</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-cyan-400 mt-0.5">✓</span>
                                    <span>Package discounts apply automatically</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-cyan-400 mt-0.5">✓</span>
                                    <span>Batch multiple swaps to save on fees</span>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
