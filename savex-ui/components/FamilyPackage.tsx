'use client';

import { useState } from 'react';

interface FamilyPackageProps {
    onActivate: (packageData: any) => void;
    amount?: string;
    sourceAsset?: string;
    destAsset?: string;
}

export default function FamilyPackage({ onActivate, amount: initialAmount, sourceAsset: initialSource, destAsset: initialDest }: FamilyPackageProps) {
    const [frequency, setFrequency] = useState('monthly');
    const [amount, setAmount] = useState(initialAmount || '100');
    const [sourceAsset, setSourceAsset] = useState(initialSource || 'XLM');
    const [destAsset, setDestAsset] = useState(initialDest || 'USDC');

    const normalPrice = parseFloat(amount) * 0.12;
    const discountedPrice = normalPrice * 0.85; // 15% discount
    const savings = normalPrice - discountedPrice;

    const mockHistory = [
        { date: '01.11.2025', amount: '100 XLM', received: '10.2 USDC' },
        { date: '01.10.2025', amount: '100 XLM', received: '10.2 USDC' },
        { date: '01.09.2025', amount: '100 XLM', received: '10.2 USDC' },
    ];

    const totalSavings = savings * mockHistory.length;

    return (
        <div className="glass p-6 rounded-2xl space-y-6">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                👨‍👩‍👧‍👦 Family Package
                <span className="text-sm font-normal text-gray-400">15% discount on recurring transfers</span>
            </h3>

            {/* Package Selection */}
            <div>
                <div className="text-sm text-gray-400 mb-2">Select Frequency</div>
                <div className="grid grid-cols-3 gap-2">
                    {['weekly', 'monthly', 'quarterly'].map((freq) => (
                        <button
                            key={freq}
                            onClick={() => setFrequency(freq)}
                            className={`py-3 rounded-xl font-bold capitalize transition-all ${frequency === freq
                                ? 'bg-cyan-500 text-white'
                                : 'bg-black/40 border border-white/10 text-gray-400 hover:border-cyan-500/50'
                                }`}
                        >
                            {freq}
                        </button>
                    ))}
                </div>
            </div>

            {/* Transfer Settings */}
            <div className="space-y-4">
                <div>
                    <label className="text-sm text-gray-400 mb-2 block">Amount</label>
                    <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="w-full p-3 bg-black/40 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-cyan-500 outline-none"
                        placeholder="100"
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-sm text-gray-400 mb-2 block">From</label>
                        <select
                            value={sourceAsset}
                            onChange={(e) => setSourceAsset(e.target.value)}
                            className="w-full p-3 bg-black/40 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-cyan-500 outline-none"
                        >
                            <option value="XLM">XLM</option>
                            <option value="USDC">USDC</option>
                            <option value="AQUA">AQUA</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-sm text-gray-400 mb-2 block">To</label>
                        <select
                            value={destAsset}
                            onChange={(e) => setDestAsset(e.target.value)}
                            className="w-full p-3 bg-black/40 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-cyan-500 outline-none"
                        >
                            <option value="USDC">USDC</option>
                            <option value="XLM">XLM</option>
                            <option value="AQUA">AQUA</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Pricing */}
            <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 space-y-3">
                <div className="flex justify-between items-center">
                    <span className="text-gray-400">Normal Price</span>
                    <span className="text-gray-400 line-through">{normalPrice.toFixed(2)} {destAsset}</span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-white font-bold">Family Package</span>
                    <span className="text-green-400 font-bold text-xl">{discountedPrice.toFixed(2)} {destAsset}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                    <span className="text-green-400">You Save</span>
                    <span className="text-green-400 font-bold">{savings.toFixed(2)} {destAsset} (15%)</span>
                </div>
            </div>

            {/* Transfer History */}
            <div>
                <div className="text-sm text-gray-400 mb-3">Recent Transfers</div>
                <div className="space-y-2">
                    {mockHistory.map((transfer, i) => (
                        <div key={i} className="bg-black/40 border border-white/10 rounded-lg p-3 flex justify-between items-center">
                            <div>
                                <div className="text-white font-mono text-sm">{transfer.date}</div>
                                <div className="text-gray-400 text-xs">{transfer.amount}</div>
                            </div>
                            <div className="text-green-400 font-bold">{transfer.received}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Total Savings */}
            <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4">
                <div className="flex justify-between items-center">
                    <span className="text-gray-400">Total Savings (3 months)</span>
                    <span className="text-purple-400 font-bold text-2xl">{totalSavings.toFixed(2)} {destAsset}</span>
                </div>
            </div>

            {/* Activate Button */}
            <button
                onClick={() => onActivate({ frequency, amount, sourceAsset, destAsset })}
                className="w-full bg-gradient-to-r from-cyan-500 to-purple-500 text-white py-4 rounded-xl font-bold text-lg hover:shadow-lg hover:shadow-purple-500/20 transition-all"
            >
                Activate Family Package
            </button>

            <div className="text-xs text-gray-400 text-center">
                💡 Automatic transfers every {frequency === 'weekly' ? 'week' : frequency === 'monthly' ? 'month' : 'quarter'} with 15% discount
            </div>
        </div>
    );
}
