"use client";

import { useState, useMemo, useEffect } from 'react';
import { useTestnetPools } from '@/hooks/useShadowPools';
import { useWalletStore } from '@/lib/store';
import { signTransaction } from '@stellar/freighter-api';
import * as StellarSDK from '@stellar/stellar-sdk';
import { TOKENS } from '@/lib/config';
import { ArrowDownUp, Settings, TrendingUp } from 'lucide-react';
import RouteComparison from './RouteComparison';
import SplitTransfer from './SplitTransfer';
import TimingSuggestion from './TimingSuggestion';
import FamilyPackage from './FamilyPackage';

export default function SwapInterface() {
    const { pools } = useTestnetPools();
    const { publicKey, balances } = useWalletStore();

    const [sourceAsset, setSourceAsset] = useState<string>('');
    const [destAsset, setDestAsset] = useState<string>('');
    const [amount, setAmount] = useState<string>('');
    const [status, setStatus] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const [availableDestinations, setAvailableDestinations] = useState<any[]>([]);
    const [estimatedReceive, setEstimatedReceive] = useState<string>('');
    const [estimating, setEstimating] = useState(false);
    const [showSplitTransfer, setShowSplitTransfer] = useState(false);
    const [showFamilyPackage, setShowFamilyPackage] = useState(false);

    // Get token icon from config
    const getTokenIcon = (code: string) => {
        const token = Object.values(TOKENS).find(t => t.symbol === code);
        return token?.icon || '💰';
    };

    // Extract unique assets from pools
    const allAssets = useMemo(() => {
        const assets = pools.reduce((acc: any[], pool: any) => {
            const addAsset = (asset: any) => {
                if (!asset || !asset.code) return;
                const key = asset.code === 'XLM' ? 'native' : `${asset.code}:${asset.issuer}`;
                if (!acc.find(a => (a.code === 'XLM' && asset.code === 'XLM') || (a.code === asset.code && a.issuer === asset.issuer))) {
                    acc.push({ ...asset, key, icon: getTokenIcon(asset.code) });
                }
            };
            if (pool.tokenA) addAsset(pool.tokenA);
            if (pool.tokenB) addAsset(pool.tokenB);
            return acc;
        }, []);
        return assets;
    }, [pools]);

    // Filter source assets to only show tokens user has in wallet
    const sourceAssets = useMemo(() => {
        if (!balances || balances.length === 0) {
            return [];
        }

        return allAssets.filter(asset => {
            if (asset.code === 'XLM') {
                const xlmBalance = balances.find(b => b.token === 'XLM');
                return xlmBalance && parseFloat(xlmBalance.amount) > 0;
            }
            const balance = balances.find(b => b.token === asset.code);
            return balance && parseFloat(balance.amount) > 0;
        });
    }, [allAssets, balances]);

    // Get balance for an asset (convert from stroops)
    const getBalance = (code: string) => {
        const balance = balances.find(b => b.token === code);
        if (!balance) return '0.0000';

        // Convert from stroops to actual amount
        const num = parseFloat(balance.amount) / 10000000;

        if (num >= 1000) {
            return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        }
        if (num >= 1) {
            return num.toFixed(4);
        }
        return num.toFixed(7);
    };

    // Check available paths when source asset changes
    useEffect(() => {
        if (!sourceAsset || !publicKey) {
            setAvailableDestinations(allAssets);
            return;
        }

        const checkAvailablePaths = async () => {
            const sAsset = allAssets.find(a => a.key === sourceAsset);
            if (!sAsset) {
                setAvailableDestinations([]);
                return;
            }

            const availableDests: any[] = [];
            for (const destAsset of allAssets) {
                if (destAsset.key === sourceAsset) continue;

                try {
                    const res = await fetch('/api/check-path', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            sourceAsset: {
                                type: sAsset.code === 'XLM' ? 'native' : 'credit_alphanum4',
                                code: sAsset.code,
                                issuer: sAsset.issuer
                            },
                            destAsset: {
                                type: destAsset.code === 'XLM' ? 'native' : 'credit_alphanum4',
                                code: destAsset.code,
                                issuer: destAsset.issuer
                            },
                            amount: '1'
                        })
                    });

                    const data = await res.json();
                    if (data.pathExists) {
                        availableDests.push(destAsset);
                    }
                } catch (e) {
                    console.error(`Error checking path for ${destAsset.code}:`, e);
                }
            }

            setAvailableDestinations(availableDests);
        };

        checkAvailablePaths();
    }, [sourceAsset, allAssets, publicKey]);

    // Estimate receive amount
    useEffect(() => {
        if (!sourceAsset || !destAsset || !amount || parseFloat(amount) <= 0) {
            setEstimatedReceive('');
            return;
        }

        const estimateSwap = async () => {
            setEstimating(true);
            const sAsset = allAssets.find(a => a.key === sourceAsset);
            const dAsset = allAssets.find(a => a.key === destAsset);

            if (!sAsset || !dAsset) {
                setEstimatedReceive('');
                setEstimating(false);
                return;
            }

            try {
                const res = await fetch('/api/estimate-price', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        sourceAsset: {
                            type: sAsset.code === 'XLM' ? 'native' : 'credit_alphanum4',
                            code: sAsset.code,
                            issuer: sAsset.issuer
                        },
                        destAsset: {
                            type: dAsset.code === 'XLM' ? 'native' : 'credit_alphanum4',
                            code: dAsset.code,
                            issuer: dAsset.issuer
                        },
                        amount
                    })
                });

                const data = await res.json();
                if (data.estimatedReceive && data.estimatedReceive !== 'unknown') {
                    setEstimatedReceive(data.estimatedReceive);
                } else {
                    setEstimatedReceive('Unable to estimate');
                }
            } catch (e) {
                console.error('Estimation error:', e);
                setEstimatedReceive('Unable to estimate');
            } finally {
                setEstimating(false);
            }
        };

        const debounce = setTimeout(estimateSwap, 500);
        return () => clearTimeout(debounce);
    }, [sourceAsset, destAsset, amount, allAssets]);

    const handleSwap = async () => {
        if (!publicKey) return;
        setLoading(true);
        setStatus('Building transaction...');

        try {
            const sAsset = allAssets.find(a => a.key === sourceAsset);
            const dAsset = allAssets.find(a => a.key === destAsset);

            if (!sAsset || !dAsset) throw new Error('Invalid assets');

            const res = await fetch('/api/swap', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sourceAsset: {
                        type: sAsset.code === 'XLM' ? 'native' : 'credit_alphanum4',
                        code: sAsset.code,
                        issuer: sAsset.issuer
                    },
                    destAsset: {
                        type: dAsset.code === 'XLM' ? 'native' : 'credit_alphanum4',
                        code: dAsset.code,
                        issuer: dAsset.issuer
                    },
                    amount,
                    userAddress: publicKey
                })
            });

            const data = await res.json();
            if (data.error) throw new Error(data.error);

            setStatus('Signing with Freighter...');
            const signedXdr = await signTransaction(data.xdr, {
                networkPassphrase: "Test SDF Network ; September 2015"
            });

            setStatus('Submitting to network...');
            const server = new StellarSDK.Horizon.Server('https://horizon-testnet.stellar.org');
            const xdrString = typeof signedXdr === 'string' ? signedXdr : (signedXdr as any).signedTxXdr;
            const transaction = new StellarSDK.Transaction(xdrString, StellarSDK.Networks.TESTNET);
            const result = await server.submitTransaction(transaction);

            setStatus(`Success! Hash: ${result.hash}`);
            setAmount('');
            setSourceAsset('');
            setDestAsset('');
        } catch (e: any) {
            console.error('Swap error:', e);
            let msg = e.message;

            if (e.response?.data?.extras) {
                const resultCodes = e.response.data.extras.result_codes;
                if (resultCodes) {
                    msg = `Transaction failed: ${resultCodes.transaction || 'Unknown error'}`;
                }
            }

            setStatus(`Error: ${msg}`);
        } finally {
            setLoading(false);
        }
    };

    // Format balance with proper decimals (convert from stroops to token amount)
    const formatBalance = (amount: string) => {
        // Convert from stroops (10^7) to actual token amount
        const num = parseFloat(amount) / 10000000;

        if (num >= 1000) {
            // For thousands: show with comma separator
            return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        }
        if (num >= 1) {
            // For 1-1000: show 4 decimals
            return num.toFixed(4);
        }
        // For less than 1: show 7 decimals
        return num.toFixed(7);
    };

    return (
        <div className="max-w-7xl mx-auto">
            {/* Wallet Assets Display - Compact, No Border */}
            {publicKey && balances.length > 0 && (
                <div className="mb-6 bg-gradient-to-r from-[#667eea]/10 to-[#764ba2]/10 rounded-2xl p-4">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-semibold text-white/80">Your Assets</h3>
                        <TrendingUp className="w-4 h-4 text-cyan-400" />
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {balances.map((balance) => {
                            const token = Object.values(TOKENS).find(t => t.symbol === balance.token);
                            if (!token) return null;
                            const hasBalance = parseFloat(balance.amount) > 0;

                            return (
                                <div
                                    key={token.symbol}
                                    className={`bg-black/30 rounded-xl p-3 transition-all ${
                                        hasBalance ? 'hover:bg-black/40' : 'opacity-50'
                                    }`}
                                >
                                    <div className="flex items-center gap-2 mb-1.5">
                                        <span className="text-2xl">{token.icon}</span>
                                        <span className="text-sm font-bold text-white">{token.symbol}</span>
                                    </div>
                                    <div className="text-base font-mono font-bold text-cyan-400">
                                        {formatBalance(balance.amount)}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Swap and Timing Side by Side */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Swap Card - 2 columns, NO BORDER */}
                <div className="lg:col-span-2 glass rounded-2xl p-6 shadow-2xl backdrop-blur-xl">
                {/* Header */}
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-white">
                        Swap
                    </h2>
                    <button className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                        <Settings className="w-5 h-5 text-gray-400" />
                    </button>
                </div>

                {!publicKey && (
                    <div className="bg-yellow-500/10 text-yellow-200 p-4 rounded-xl mb-4 text-sm">
                        Please connect your wallet first
                    </div>
                )}

                {/* From Input */}
                <div className="bg-black/30 rounded-2xl p-4 mb-2 hover:bg-black/40 transition-all">
                    <div className="flex justify-between mb-2">
                        <span className="text-gray-400 text-xs">From</span>
                        <span className="text-gray-400 text-xs">
                            Balance: {sourceAsset && getBalance(allAssets.find(a => a.key === sourceAsset)?.code || '')}
                        </span>
                    </div>
                    <div className="flex items-center gap-4">
                        <input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="0.00"
                            className="bg-transparent text-3xl font-bold text-white w-full outline-none placeholder-gray-600"
                        />
                        <select
                            value={sourceAsset}
                            onChange={(e) => setSourceAsset(e.target.value)}
                            className="bg-white/10 text-white px-4 py-3 rounded-xl font-bold outline-none border-none cursor-pointer hover:bg-white/20 transition-colors"
                            style={{ minWidth: '140px' }}
                        >
                            <option value="" disabled className="bg-gray-900">Select</option>
                            {sourceAssets.map(asset => (
                                <option key={asset.key} value={asset.key} className="bg-gray-900">
                                    {asset.icon} {asset.code}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Swap Arrow */}
                <div className="flex justify-center -my-3 relative z-10">
                    <button
                        onClick={() => {
                            const temp = sourceAsset;
                            setSourceAsset(destAsset);
                            setDestAsset(temp);
                        }}
                        className="bg-gradient-to-r from-cyan-500 to-purple-500 border-4 border-black rounded-xl p-2.5 hover:scale-110 transition-transform text-white shadow-lg"
                    >
                        <ArrowDownUp className="w-5 h-5" />
                    </button>
                </div>

                {/* To Input */}
                <div className="bg-black/30 rounded-2xl p-4 mb-6 hover:bg-black/40 transition-all">
                    <div className="flex justify-between mb-2">
                        <span className="text-gray-400 text-xs">To</span>
                        <span className="text-gray-400 text-xs">
                            {estimating && <span className="animate-pulse">Estimating...</span>}
                        </span>
                    </div>
                    <div className="flex items-center gap-4">
                        <input
                            type="text"
                            value={estimatedReceive ? `~${estimatedReceive}` : ''}
                            readOnly
                            placeholder="0.00"
                            className="bg-transparent text-3xl font-bold text-gray-400 w-full outline-none placeholder-gray-600 cursor-default"
                        />
                        <select
                            value={destAsset}
                            onChange={(e) => setDestAsset(e.target.value)}
                            className="bg-white/10 text-white px-4 py-3 rounded-xl font-bold outline-none border-none cursor-pointer hover:bg-white/20 transition-colors"
                            style={{ minWidth: '140px' }}
                        >
                            <option value="" disabled className="bg-gray-900">Select</option>
                            {availableDestinations.map(asset => (
                                <option key={asset.key} value={asset.key} className="bg-gray-900">
                                    {asset.icon} {asset.code}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Route Comparison */}
                {amount && sourceAsset && destAsset && (
                    <div className="mb-6">
                        <RouteComparison
                            sourceAsset={allAssets.find(a => a.key === sourceAsset)?.code || ''}
                            destAsset={allAssets.find(a => a.key === destAsset)?.code || ''}
                            amount={amount}
                            onSelectRoute={(route) => {
                                setEstimatedReceive(route.estimatedOutput.toString());
                            }}
                        />
                    </div>
                )}

                {/* Features */}
                {amount && sourceAsset && destAsset && (
                    <div className="grid grid-cols-2 gap-3 mb-6">
                        <button
                            onClick={() => setShowSplitTransfer(!showSplitTransfer)}
                            className={`p-3 rounded-xl border transition-all text-sm font-medium flex items-center justify-center gap-2 ${
                                showSplitTransfer
                                    ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400'
                                    : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                            }`}
                        >
                            ✂️ Split Transfer
                        </button>
                        <button
                            onClick={() => setShowFamilyPackage(!showFamilyPackage)}
                            className={`p-3 rounded-xl border transition-all text-sm font-medium flex items-center justify-center gap-2 ${
                                showFamilyPackage
                                    ? 'bg-purple-500/20 border-purple-500 text-purple-400'
                                    : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                            }`}
                        >
                            👨‍👩‍👧‍👦 Family Pack
                        </button>
                    </div>
                )}

                {/* Split Transfer UI */}
                {showSplitTransfer && (
                    <div className="mb-6 animate-in fade-in slide-in-from-top-4 duration-300">
                        <SplitTransfer
                            sourceAsset={allAssets.find(a => a.key === sourceAsset)?.code || ''}
                            destAsset={allAssets.find(a => a.key === destAsset)?.code || ''}
                            totalAmount={amount}
                            userAddress={publicKey || ''}
                            onExecute={(splits) => {
                                console.log('Split transfer:', splits);
                                setStatus('Split transfer scheduled!');
                                setShowSplitTransfer(false);
                            }}
                        />
                    </div>
                )}

                {/* Family Package UI */}
                {showFamilyPackage && (
                    <div className="mb-6 animate-in fade-in slide-in-from-top-4 duration-300">
                        <FamilyPackage
                            amount={amount}
                            sourceAsset={allAssets.find(a => a.key === sourceAsset)?.code || ''}
                            destAsset={allAssets.find(a => a.key === destAsset)?.code || ''}
                            onActivate={(pkg) => {
                                console.log('Family package activated:', pkg);
                                setStatus('Family package activated! 15% discount applied.');
                                setShowFamilyPackage(false);
                            }}
                        />
                    </div>
                )}

                {/* Swap Button */}
                <button
                    onClick={handleSwap}
                    disabled={!publicKey || loading || !sourceAsset || !destAsset || !amount}
                    className="w-full bg-gradient-to-r from-cyan-500 to-purple-500 text-white py-4 rounded-2xl font-bold text-xl hover:shadow-lg hover:shadow-cyan-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all transform hover:scale-[1.02] active:scale-[0.98]"
                >
                    {loading ? (
                        <span className="flex items-center justify-center gap-2">
                            <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></span>
                            Swapping...
                        </span>
                    ) : !publicKey ? (
                        'Connect Wallet to Swap'
                    ) : !amount ? (
                        'Enter Amount'
                    ) : (
                        'Swap Tokens'
                    )}
                </button>

                {/* Status Message */}
                {status && (
                    <div
                        className={`mt-4 p-4 rounded-xl text-center text-sm font-medium ${
                            status.includes('Success')
                                ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                                : status.includes('Error') || status.includes('Failed')
                                ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                        }`}
                    >
                        {status}
                    </div>
                )}
                </div>

                {/* Right Sidebar - 1 column, NO BORDERS */}
                <div className="space-y-6">
                    {/* Timing Suggestion */}
                    <div className="glass rounded-2xl p-5">
                        <TimingSuggestion
                            sourceAsset={allAssets.find(a => a.key === sourceAsset)?.code || ''}
                            destAsset={allAssets.find(a => a.key === destAsset)?.code || ''}
                            amount={amount}
                        />
                    </div>

                    {/* Recent Transactions */}
                    <div className="glass rounded-2xl p-5">
                        <h3 className="text-lg font-bold text-white mb-4">Recent Transactions</h3>
                        <div className="text-center py-8 text-gray-400">
                            <p className="text-sm">No transactions yet</p>
                            <p className="text-xs mt-2">Make your first swap to see history</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
