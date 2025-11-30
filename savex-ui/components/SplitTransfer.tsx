'use client';

import { useState } from 'react';

interface SplitTransferProps {
    sourceAsset: string;
    destAsset: string;
    totalAmount: string;
    userAddress: string;
    onExecute: (splits: { amount: string; executeAt: string }[]) => void;
}

export default function SplitTransfer({ sourceAsset, destAsset, totalAmount, userAddress, onExecute }: SplitTransferProps) {
    const [splitRatio, setSplitRatio] = useState(50); // 50-50 by default
    const [scheduleDate, setScheduleDate] = useState('');
    const [scheduleTime, setScheduleTime] = useState('');

    const amount1 = (parseFloat(totalAmount) * splitRatio / 100).toFixed(4);
    const amount2 = (parseFloat(totalAmount) * (100 - splitRatio) / 100).toFixed(4);

    // Calculate estimated costs (simplified)
    const estimatedCost1 = parseFloat(amount1) * 0.12; // Assuming XLM to USDC rate
    const estimatedCost2 = parseFloat(amount2) * 0.12;
    const totalEstimated = estimatedCost1 + estimatedCost2;
    const singleTransferCost = parseFloat(totalAmount) * 0.12 * 1.08; // 8% higher for single transfer
    const savings = ((singleTransferCost - totalEstimated) / singleTransferCost) * 100;

    const handleExecute = async () => {
        const executeAt2 = scheduleDate && scheduleTime
            ? `${scheduleDate}T${scheduleTime}:00Z`
            : new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // Default: 24h later

        try {
            // Call split transfer API
            const response = await fetch('/api/transfer/split', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sourceAsset,
                    destAsset,
                    totalAmount,
                    splits: [
                        { amount: amount1, executeAt: 'now' },
                        { amount: amount2, executeAt: executeAt2 }
                    ],
                    userAddress // Use actual userAddress
                })
            });

            const data = await response.json();

            if (data.success && data.results[0].xdr) {
                // Sign and submit first part
                const { signTransaction } = await import('@stellar/freighter-api');
                const signedXdr = await signTransaction(data.results[0].xdr, {
                    networkPassphrase: 'Test SDF Network ; September 2015'
                });

                // Submit to network
                const StellarSDK = await import('@stellar/stellar-sdk');
                const server = new StellarSDK.Horizon.Server('https://horizon-testnet.stellar.org');
                const xdrString = typeof signedXdr === 'string' ? signedXdr : (signedXdr as any).signedTxXdr;
                const transaction = new StellarSDK.Transaction(xdrString, StellarSDK.Networks.TESTNET);
                await server.submitTransaction(transaction);

                onExecute([
                    { amount: amount1, executeAt: 'now' },
                    { amount: amount2, executeAt: executeAt2 }
                ]);
            }
        } catch (error) {
            console.error('Split transfer error:', error);
            alert('Split transfer failed. Please try again.');
        }
    };

    return (
        <div className="glass p-6 rounded-2xl space-y-6">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                ✂️ Split Transfer
                <span className="text-sm font-normal text-gray-400">Optimize timing for better rates</span>
            </h3>

            {/* Split Ratio Slider */}
            <div>
                <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-400">Split Ratio</span>
                    <span className="text-white font-bold">{splitRatio}% / {100 - splitRatio}%</span>
                </div>
                <input
                    type="range"
                    min="10"
                    max="90"
                    value={splitRatio}
                    onChange={(e) => setSplitRatio(parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>10%</span>
                    <span>50%</span>
                    <span>90%</span>
                </div>
            </div>

            {/* Transfer Details */}
            <div className="grid grid-cols-2 gap-4">
                {/* Part 1 */}
                <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-xl p-4">
                    <div className="text-sm text-gray-400 mb-2">Part 1 (Now)</div>
                    <div className="text-2xl font-bold text-white mb-1">{amount1}</div>
                    <div className="text-sm text-gray-400">{sourceAsset}</div>
                    <div className="mt-3 text-xs text-cyan-400">
                        ✓ Execute immediately
                    </div>
                    <div className="mt-1 text-sm text-white">
                        ≈ {estimatedCost1.toFixed(2)} {destAsset}
                    </div>
                </div>

                {/* Part 2 */}
                <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4">
                    <div className="text-sm text-gray-400 mb-2">Part 2 (Scheduled)</div>
                    <div className="text-2xl font-bold text-white mb-1">{amount2}</div>
                    <div className="text-sm text-gray-400">{sourceAsset}</div>
                    <div className="mt-3 space-y-2">
                        <input
                            type="date"
                            value={scheduleDate}
                            onChange={(e) => setScheduleDate(e.target.value)}
                            min={new Date().toISOString().split('T')[0]}
                            className="w-full px-2 py-1 bg-black/40 border border-white/10 rounded text-white text-xs"
                        />
                        <input
                            type="time"
                            value={scheduleTime}
                            onChange={(e) => setScheduleTime(e.target.value)}
                            className="w-full px-2 py-1 bg-black/40 border border-white/10 rounded text-white text-xs"
                        />
                    </div>
                    <div className="mt-2 text-sm text-white">
                        ≈ {estimatedCost2.toFixed(2)} {destAsset}
                    </div>
                </div>
            </div>

            {/* Savings Summary */}
            <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
                <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-400">Total Estimated</span>
                    <span className="text-lg font-bold text-white">{totalEstimated.toFixed(2)} {destAsset}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-400">Single Transfer Cost</span>
                    <span className="text-gray-400 line-through">{singleTransferCost.toFixed(2)} {destAsset}</span>
                </div>
                <div className="mt-3 flex items-center justify-between">
                    <span className="text-green-400 font-bold">Potential Savings</span>
                    <span className="text-green-400 font-bold text-xl">
                        {(singleTransferCost - totalEstimated).toFixed(2)} {destAsset} ({savings.toFixed(1)}%)
                    </span>
                </div>
            </div>

            {/* Execute Button */}
            <button
                onClick={handleExecute}
                className="w-full bg-gradient-to-r from-cyan-500 to-purple-500 text-white py-4 rounded-xl font-bold text-lg hover:shadow-lg hover:shadow-purple-500/20 transition-all"
            >
                Execute Split Transfer
            </button>

            <div className="text-xs text-gray-400 text-center">
                💡 Part 1 executes now, Part 2 scheduled for {scheduleDate || 'tomorrow'} {scheduleTime || '12:00'}
            </div>
        </div>
    );
}
