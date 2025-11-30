'use client';

import { useState, useEffect } from 'react';
import { CONTRACTS, TOKENS } from '@/lib/config';
import * as StellarSdk from '@stellar/stellar-sdk';

interface DexQuote {
    dex: string;
    price: number;
    savings: number;
    savingsPercent: number;
}

export function DexComparisonWidget({
    fromToken,
    toToken,
    amount,
}: {
    fromToken: string;
    toToken: string;
    amount: number;
}) {
    const [quotes, setQuotes] = useState<DexQuote[]>([]);
    const [loading, setLoading] = useState(false);
    const [bestDex, setBestDex] = useState<string>('');

    useEffect(() => {
        if (amount > 0 && fromToken && toToken && fromToken !== toToken) {
            fetchQuotes();
        }
    }, [fromToken, toToken, amount]);

    const fetchQuotes = async () => {
        setLoading(true);
        try {
            const fromTokenAddr = TOKENS[fromToken as keyof typeof TOKENS]?.address;
            const toTokenAddr = TOKENS[toToken as keyof typeof TOKENS]?.address;

            if (!fromTokenAddr || !toTokenAddr) {
                console.error('Token addresses not found');
                return;
            }

            const amountInStroops = Math.floor(amount * 10_000_000);

            // Get quotes from contract
            const server = new StellarSdk.SorobanRpc.Server('https://soroban-testnet.stellar.org');
            const contract = new StellarSdk.Contract(CONTRACTS.SAVEX);

            // Build source account for simulation
            const sourceKeypair = StellarSdk.Keypair.random();
            const sourceAccount = new StellarSdk.SorobanRpc.Account(sourceKeypair.publicKey(), '0');

            // Get Soroswap quote
            const soroswapTx = new StellarSdk.TransactionBuilder(sourceAccount, {
                fee: '100',
                networkPassphrase: StellarSdk.Networks.TESTNET,
            })
                .addOperation(
                    contract.call(
                        'get_soroswap_quote',
                        StellarSdk.Address.fromString(fromTokenAddr).toScVal(),
                        StellarSdk.Address.fromString(toTokenAddr).toScVal(),
                        StellarSdk.nativeToScVal(amountInStroops, { type: 'i128' })
                    )
                )
                .setTimeout(30)
                .build();

            // Get Stellar DEX quote
            const stellarTx = new StellarSdk.TransactionBuilder(sourceAccount, {
                fee: '100',
                networkPassphrase: StellarSdk.Networks.TESTNET,
            })
                .addOperation(
                    contract.call(
                        'get_stellar_dex_quote',
                        StellarSdk.Address.fromString(fromTokenAddr).toScVal(),
                        StellarSdk.Address.fromString(toTokenAddr).toScVal(),
                        StellarSdk.nativeToScVal(amountInStroops, { type: 'i128' })
                    )
                )
                .setTimeout(30)
                .build();

            // Simulate both transactions
            const [soroswapSim, stellarSim] = await Promise.all([
                server.simulateTransaction(soroswapTx).catch(() => null),
                server.simulateTransaction(stellarTx).catch(() => null),
            ]);

            const quotesData: DexQuote[] = [];

            // Parse Soroswap result
            if (soroswapSim && StellarSdk.SorobanRpc.Api.isSimulationSuccess(soroswapSim) && soroswapSim.result) {
                const soroswapOutput = Number(soroswapSim.result.retval) / 10_000_000;
                quotesData.push({
                    dex: 'Soroswap',
                    price: soroswapOutput,
                    savings: 0,
                    savingsPercent: 0,
                });
            }

            // Parse Stellar DEX result
            if (stellarSim && StellarSdk.SorobanRpc.Api.isSimulationSuccess(stellarSim) && stellarSim.result) {
                const stellarOutput = Number(stellarSim.result.retval) / 10_000_000;
                quotesData.push({
                    dex: 'Stellar DEX',
                    price: stellarOutput,
                    savings: 0,
                    savingsPercent: 0,
                });
            }

            // Calculate best and savings
            if (quotesData.length > 0) {
                const bestPrice = Math.max(...quotesData.map(q => q.price));
                quotesData.forEach(q => {
                    q.savings = bestPrice - q.price;
                    q.savingsPercent = q.price > 0 ? ((bestPrice - q.price) / q.price) * 100 : 0;
                });

                const best = quotesData.find(q => q.price === bestPrice);
                if (best) setBestDex(best.dex);
            }

            setQuotes(quotesData.sort((a, b) => b.price - a.price));
        } catch (error) {
            console.error('Failed to fetch DEX quotes:', error);
        } finally {
            setLoading(false);
        }
    };

    if (!fromToken || !toToken || fromToken === toToken) {
        return null;
    }

    return (
        <div className="glass rounded-xl p-4 border border-white/10 mb-4">
            <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-white flex items-center gap-2">
                    <span>💱</span>
                    DEX Comparison
                </h3>
                {loading && (
                    <span className="text-sm text-gray-400">Loading...</span>
                )}
            </div>

            {quotes.length === 0 && !loading && (
                <p className="text-sm text-gray-400">Enter amount to see DEX comparison</p>
            )}

            {quotes.length > 0 && (
                <div className="space-y-2">
                    {quotes.map((quote) => (
                        <div
                            key={quote.dex}
                            className={`flex items-center justify-between p-3 rounded-lg border ${
                                quote.dex === bestDex
                                    ? 'bg-green-500/10 border-green-500/50'
                                    : 'bg-gray-800/50 border-gray-700'
                            }`}
                        >
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="font-medium text-white">{quote.dex}</span>
                                    {quote.dex === bestDex && (
                                        <span className="text-xs px-2 py-0.5 bg-green-500/20 text-green-400 rounded-full font-semibold">
                                            Best Rate
                                        </span>
                                    )}
                                </div>
                                <div className="text-sm text-gray-400 mt-0.5">
                                    {quote.price.toFixed(6)} {toToken}
                                </div>
                            </div>
                            {quote.savings > 0 && (
                                <div className="text-right">
                                    <div className="text-sm text-red-400">
                                        -{quote.savings.toFixed(6)}
                                    </div>
                                    <div className="text-xs text-red-400/70">
                                        -{quote.savingsPercent.toFixed(2)}%
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {bestDex && (
                <div className="mt-3 text-xs text-gray-400 flex items-center gap-1">
                    <span>💡</span>
                    <span>SaveX will automatically use {bestDex} for best rate</span>
                </div>
            )}
        </div>
    );
}
