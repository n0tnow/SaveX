'use client';

import { useState, useEffect } from 'react';
import { CONTRACTS, TOKENS } from '@/lib/config';
import * as StellarSdk from '@stellar/stellar-sdk';

// Freighter API types
declare global {
    interface Window {
        freighterApi?: {
            getPublicKey: () => Promise<string>;
            signTransaction: (xdr: string, opts: { networkPassphrase: string }) => Promise<string>;
        };
    }
}

interface ArbitrageOpportunity {
    path: string[];
    profit: number;
    profitPercent: number;
    startAmount: number;
    endAmount: number;
    steps: {
        from: string;
        to: string;
        rate: number;
    }[];
}

export default function ArbitrageDetector() {
    const [opportunities, setOpportunities] = useState<ArbitrageOpportunity[]>([]);
    const [loading, setLoading] = useState(false);
    const [startAsset, setStartAsset] = useState('XLM');
    const [amount, setAmount] = useState('100');
    const [autoRefresh, setAutoRefresh] = useState(false);

    const detectArbitrage = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/arbitrage/detect', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ startAsset, amount })
            });

            const data = await res.json();
            setOpportunities(data.opportunities || []);
        } catch (error) {
            console.error('Arbitrage detection error:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        detectArbitrage();
    }, []);

    useEffect(() => {
        if (autoRefresh) {
            const interval = setInterval(detectArbitrage, 10000); // Every 10s
            return () => clearInterval(interval);
        }
    }, [autoRefresh, startAsset, amount]);

    const executeArbitrage = async (opp: ArbitrageOpportunity) => {
        try {
            // Check if Freighter is installed
            if (!window.freighterApi) {
                alert('Please install Freighter wallet to execute arbitrage');
                return;
            }

            setLoading(true);

            // Get user's public key from Freighter
            const publicKey = await window.freighterApi.getPublicKey();

            // Build token path from opportunity
            const tokenPath = opp.path.map(symbol => {
                const token = Object.values(TOKENS).find(t => t.symbol === symbol);
                if (!token) throw new Error(`Token ${symbol} not found`);
                return token.address;
            });

            // Convert amount to contract format (7 decimals)
            const amountInStroops = Math.floor(opp.startAmount * 10_000_000);
            const minProfitInStroops = Math.floor(opp.profit * 0.95 * 10_000_000); // 5% slippage tolerance

            // Create contract instance
            const contract = new StellarSdk.Contract(CONTRACTS.SAVEX);

            // Build transaction
            const server = new StellarSdk.SorobanRpc.Server('https://soroban-testnet.stellar.org');
            const sourceAccount = await server.getAccount(publicKey);

            // Build path vector (exclude first and last as they're the same)
            const pathVec = tokenPath.slice(1, -1);

            const tx = new StellarSdk.TransactionBuilder(sourceAccount, {
                fee: '1000000', // 0.1 XLM
                networkPassphrase: StellarSdk.Networks.TESTNET,
            })
                .addOperation(
                    contract.call(
                        'execute_triangular_arbitrage',
                        StellarSdk.Address.fromString(publicKey).toScVal(),
                        StellarSdk.nativeToScVal(pathVec, { type: 'address[]' }),
                        StellarSdk.nativeToScVal(amountInStroops, { type: 'i128' }),
                        StellarSdk.nativeToScVal(minProfitInStroops, { type: 'i128' })
                    )
                )
                .setTimeout(300)
                .build();

            // Simulate transaction
            const simulated = await server.simulateTransaction(tx);

            if (StellarSdk.SorobanRpc.Api.isSimulationError(simulated)) {
                throw new Error(`Simulation failed: ${simulated.error}`);
            }

            // Prepare and sign transaction
            const prepared = StellarSdk.SorobanRpc.assembleTransaction(tx, simulated).build();

            // Sign with Freighter
            const signedXdr = await window.freighterApi.signTransaction(prepared.toXDR(), {
                networkPassphrase: StellarSdk.Networks.TESTNET,
            });

            const signedTx = StellarSdk.TransactionBuilder.fromXDR(
                signedXdr,
                StellarSdk.Networks.TESTNET
            );

            // Submit transaction
            const result = await server.sendTransaction(signedTx);

            if (result.status === 'PENDING') {
                alert(`✅ Arbitrage executed!\n\nTransaction submitted: ${result.hash}\n\nProfit: ${opp.profit.toFixed(4)} ${startAsset} (${opp.profitPercent.toFixed(2)}%)\n\nCheck status on Stellar Expert`);
            } else {
                throw new Error(`Transaction failed: ${result.status}`);
            }

        } catch (error: any) {
            console.error('Arbitrage execution error:', error);
            alert(`❌ Arbitrage execution failed:\n\n${error.message || error}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="glass p-6 rounded-2xl space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    🔄 Arbitrage Detector
                    <span className="text-sm font-normal text-gray-400">Find profitable opportunities</span>
                </h3>
                <button
                    onClick={detectArbitrage}
                    disabled={loading}
                    className="px-4 py-2 bg-cyan-500/20 border border-cyan-500/50 text-cyan-300 rounded-lg font-bold hover:bg-cyan-500/30 disabled:opacity-50"
                >
                    {loading ? '🔄 Scanning...' : '🔍 Scan Now'}
                </button>
            </div>

            {/* Settings */}
            <div className="grid grid-cols-3 gap-4">
                <div>
                    <label className="text-sm text-gray-400 mb-2 block">Start Asset</label>
                    <select
                        value={startAsset}
                        onChange={(e) => setStartAsset(e.target.value)}
                        className="w-full p-2 bg-black/40 border border-white/10 rounded-lg text-white"
                    >
                        <option value="XLM">XLM</option>
                        <option value="USDC">USDC</option>
                        <option value="AQUA">AQUA</option>
                    </select>
                </div>
                <div>
                    <label className="text-sm text-gray-400 mb-2 block">Amount</label>
                    <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="w-full p-2 bg-black/40 border border-white/10 rounded-lg text-white"
                    />
                </div>
                <div>
                    <label className="text-sm text-gray-400 mb-2 block">Auto Refresh</label>
                    <button
                        onClick={() => setAutoRefresh(!autoRefresh)}
                        className={`w-full p-2 rounded-lg font-bold ${autoRefresh
                                ? 'bg-green-500/20 border border-green-500/50 text-green-300'
                                : 'bg-gray-500/20 border border-gray-500/50 text-gray-300'
                            }`}
                    >
                        {autoRefresh ? '✓ ON (10s)' : '○ OFF'}
                    </button>
                </div>
            </div>

            {/* Opportunities */}
            <div className="space-y-3">
                {opportunities.length === 0 && !loading && (
                    <div className="text-center text-gray-400 py-8">
                        No arbitrage opportunities found. Try different settings.
                    </div>
                )}

                {opportunities.map((opp, i) => (
                    <div
                        key={i}
                        className={`p-4 rounded-xl border-2 ${opp.profitPercent > 2
                                ? 'border-green-500 bg-green-500/10'
                                : opp.profitPercent > 1
                                    ? 'border-yellow-500 bg-yellow-500/10'
                                    : 'border-white/10 bg-black/20'
                            }`}
                    >
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <span className="text-2xl">
                                    {opp.profitPercent > 2 ? '🔥' : opp.profitPercent > 1 ? '⚡' : '💰'}
                                </span>
                                <div>
                                    <div className="text-white font-mono text-sm">
                                        {opp.path.join(' → ')}
                                    </div>
                                    <div className="text-xs text-gray-400">
                                        {opp.steps.length} swaps required
                                    </div>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className={`text-2xl font-bold ${opp.profitPercent > 2 ? 'text-green-400' :
                                        opp.profitPercent > 1 ? 'text-yellow-400' : 'text-white'
                                    }`}>
                                    +{opp.profitPercent.toFixed(2)}%
                                </div>
                                <div className="text-sm text-gray-400">
                                    +{opp.profit.toFixed(4)} {startAsset}
                                </div>
                            </div>
                        </div>

                        {/* Steps */}
                        <div className="grid grid-cols-3 gap-2 mb-3">
                            {opp.steps.map((step, j) => (
                                <div key={j} className="bg-black/40 rounded p-2 text-xs">
                                    <div className="text-gray-400">{step.from} → {step.to}</div>
                                    <div className="text-white font-bold">
                                        Rate: {step.rate.toFixed(6)}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Execute Button */}
                        <button
                            onClick={() => executeArbitrage(opp)}
                            className="w-full bg-gradient-to-r from-green-500 to-cyan-500 text-white py-2 rounded-lg font-bold hover:shadow-lg hover:shadow-green-500/20"
                        >
                            Execute Arbitrage
                        </button>
                    </div>
                ))}
            </div>

            {opportunities.length > 0 && (
                <div className="text-sm text-gray-400 text-center pt-2 border-t border-white/10">
                    Found {opportunities.length} profitable opportunities
                </div>
            )}
        </div>
    );
}
