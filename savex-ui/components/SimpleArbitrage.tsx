'use client';

import { useState } from 'react';
import { CONTRACTS, TOKENS } from '@/lib/config';
import { useWalletStore } from '@/lib/store';
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

export function SimpleArbitrage() {
    const { publicKey } = useWalletStore();
    const [tokenA, setTokenA] = useState('XLM');
    const [tokenB, setTokenB] = useState('USDC');
    const [amount, setAmount] = useState('100');
    const [estimatedProfit, setEstimatedProfit] = useState<number | null>(null);
    const [loading, setLoading] = useState(false);
    const [executing, setExecuting] = useState(false);

    const handleEstimateProfit = async () => {
        if (!publicKey || !amount || parseFloat(amount) <= 0) return;

        setLoading(true);
        try {
            const tokenAAddr = TOKENS[tokenA as keyof typeof TOKENS]?.address;
            const tokenBAddr = TOKENS[tokenB as keyof typeof TOKENS]?.address;

            if (!tokenAAddr || !tokenBAddr) return;

            const amountInStroops = Math.floor(parseFloat(amount) * 10_000_000);

            // Call estimate_arbitrage_profit
            const server = new StellarSdk.SorobanRpc.Server('https://soroban-testnet.stellar.org');
            const contract = new StellarSdk.Contract(CONTRACTS.SAVEX);

            const sourceKeypair = StellarSdk.Keypair.random();
            const sourceAccount = new StellarSdk.SorobanRpc.Account(sourceKeypair.publicKey(), '0');

            const tx = new StellarSdk.TransactionBuilder(sourceAccount, {
                fee: '100',
                networkPassphrase: StellarSdk.Networks.TESTNET,
            })
                .addOperation(
                    contract.call(
                        'estimate_arbitrage_profit',
                        StellarSdk.Address.fromString(tokenAAddr).toScVal(),
                        StellarSdk.Address.fromString(tokenBAddr).toScVal(),
                        StellarSdk.nativeToScVal(amountInStroops, { type: 'i128' })
                    )
                )
                .setTimeout(30)
                .build();

            const simulated = await server.simulateTransaction(tx);

            if (StellarSdk.SorobanRpc.Api.isSimulationSuccess(simulated) && simulated.result) {
                const profitInStroops = Number(simulated.result.retval);
                const profit = profitInStroops / 10_000_000;
                setEstimatedProfit(profit);
            }
        } catch (error) {
            console.error('Failed to estimate profit:', error);
            setEstimatedProfit(0);
        } finally {
            setLoading(false);
        }
    };

    const handleExecuteArbitrage = async () => {
        if (!window.freighterApi) {
            alert('Please install Freighter wallet');
            return;
        }

        if (!estimatedProfit || estimatedProfit <= 0) {
            alert('No profit opportunity detected');
            return;
        }

        setExecuting(true);
        try {
            const userPublicKey = await window.freighterApi.getPublicKey();

            const tokenAAddr = TOKENS[tokenA as keyof typeof TOKENS]?.address;
            const tokenBAddr = TOKENS[tokenB as keyof typeof TOKENS]?.address;

            if (!tokenAAddr || !tokenBAddr) throw new Error('Invalid tokens');

            const amountInStroops = Math.floor(parseFloat(amount) * 10_000_000);
            const minProfitInStroops = Math.floor(estimatedProfit * 0.95 * 10_000_000); // 5% slippage

            const server = new StellarSdk.SorobanRpc.Server('https://soroban-testnet.stellar.org');
            const contract = new StellarSdk.Contract(CONTRACTS.SAVEX);
            const sourceAccount = await server.getAccount(userPublicKey);

            const tx = new StellarSdk.TransactionBuilder(sourceAccount, {
                fee: '1000000',
                networkPassphrase: StellarSdk.Networks.TESTNET,
            })
                .addOperation(
                    contract.call(
                        'execute_arbitrage',
                        StellarSdk.Address.fromString(userPublicKey).toScVal(),
                        StellarSdk.Address.fromString(tokenAAddr).toScVal(),
                        StellarSdk.Address.fromString(tokenBAddr).toScVal(),
                        StellarSdk.nativeToScVal(amountInStroops, { type: 'i128' }),
                        StellarSdk.nativeToScVal(minProfitInStroops, { type: 'i128' })
                    )
                )
                .setTimeout(300)
                .build();

            const simulated = await server.simulateTransaction(tx);

            if (StellarSdk.SorobanRpc.Api.isSimulationError(simulated)) {
                throw new Error(`Simulation failed: ${simulated.error}`);
            }

            const prepared = StellarSdk.SorobanRpc.assembleTransaction(tx, simulated).build();

            const signedXdr = await window.freighterApi.signTransaction(prepared.toXDR(), {
                networkPassphrase: StellarSdk.Networks.TESTNET,
            });

            const signedTx = StellarSdk.TransactionBuilder.fromXDR(
                signedXdr,
                StellarSdk.Networks.TESTNET
            );

            const result = await server.sendTransaction(signedTx);

            if (result.status === 'PENDING') {
                alert(
                    `✅ Arbitrage executed!\n\n` +
                        `Transaction: ${result.hash}\n` +
                        `Estimated Profit: ${estimatedProfit.toFixed(4)} ${tokenA}\n\n` +
                        `Check status on Stellar Expert`
                );
                // Reset
                setAmount('100');
                setEstimatedProfit(null);
            } else {
                throw new Error(`Transaction failed: ${result.status}`);
            }
        } catch (error: any) {
            console.error('Arbitrage execution error:', error);
            alert(`❌ Execution failed:\n\n${error.message || error}`);
        } finally {
            setExecuting(false);
        }
    };

    return (
        <div className="glass rounded-2xl p-6 border border-white/10">
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <span>💱</span>
                Simple Arbitrage
            </h2>
            <p className="text-gray-400 mb-6 text-sm">
                Execute 2-token arbitrage between two DEXs. Buy low on one DEX, sell high on another.
            </p>

            <div className="space-y-4">
                {/* Token Pair Selection */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Token A
                        </label>
                        <select
                            value={tokenA}
                            onChange={(e) => setTokenA(e.target.value)}
                            className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                        >
                            {Object.keys(TOKENS).map((token) => (
                                <option key={token} value={token}>
                                    {TOKENS[token as keyof typeof TOKENS].icon}{' '}
                                    {token}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Token B
                        </label>
                        <select
                            value={tokenB}
                            onChange={(e) => setTokenB(e.target.value)}
                            className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                        >
                            {Object.keys(TOKENS).map((token) => (
                                <option key={token} value={token}>
                                    {TOKENS[token as keyof typeof TOKENS].icon}{' '}
                                    {token}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Amount Input */}
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                        Amount ({tokenA})
                    </label>
                    <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="100"
                        className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                    />
                </div>

                {/* Estimate Button */}
                <button
                    onClick={handleEstimateProfit}
                    disabled={loading || !publicKey}
                    className="w-full px-4 py-3 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? '⏳ Estimating...' : '🔍 Estimate Profit'}
                </button>

                {/* Profit Display */}
                {estimatedProfit !== null && (
                    <div
                        className={`p-4 rounded-lg border ${
                            estimatedProfit > 0
                                ? 'bg-green-500/10 border-green-500/50'
                                : 'bg-red-500/10 border-red-500/50'
                        }`}
                    >
                        <div className="flex items-center justify-between">
                            <span className="text-gray-300">Estimated Profit:</span>
                            <span
                                className={`text-2xl font-bold ${
                                    estimatedProfit > 0 ? 'text-green-400' : 'text-red-400'
                                }`}
                            >
                                {estimatedProfit > 0 ? '+' : ''}
                                {estimatedProfit.toFixed(4)} {tokenA}
                            </span>
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                            {estimatedProfit > 0
                                ? `Profit: ${((estimatedProfit / parseFloat(amount)) * 100).toFixed(2)}%`
                                : 'No profit opportunity'}
                        </div>
                    </div>
                )}

                {/* Execute Button */}
                {estimatedProfit !== null && estimatedProfit > 0 && (
                    <button
                        onClick={handleExecuteArbitrage}
                        disabled={executing}
                        className="w-full px-4 py-3 bg-green-500 text-white rounded-lg font-semibold hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {executing ? '⏳ Executing...' : '⚡ Execute Arbitrage'}
                    </button>
                )}

                {/* Info */}
                <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-3">
                    <p className="text-xs text-cyan-300">
                        💡 Simple arbitrage executes: {tokenA} → {tokenB} → {tokenA}
                        <br />
                        Automatically finds best prices across Soroswap and Stellar DEX
                    </p>
                </div>

                {!publicKey && (
                    <div className="text-center p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                        <p className="text-sm text-yellow-400">
                            Connect your wallet to execute arbitrage
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
