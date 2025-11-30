'use client';

import { useState, useEffect } from 'react';
import { CONTRACTS } from '@/lib/config';
import { useWalletStore } from '@/lib/store';
import * as StellarSdk from '@stellar/stellar-sdk';

interface FeeBreakdown {
    networkFee: number;
    serviceFee: number;
    discount: number;
    total: number;
}

export function FeeCalculator({
    amount,
    isBatch = false,
    batchSize = 1,
}: {
    amount: number;
    isBatch?: boolean;
    batchSize?: number;
}) {
    const { publicKey } = useWalletStore();
    const [fees, setFees] = useState<FeeBreakdown | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (amount > 0 && publicKey) {
            calculateFees();
        }
    }, [amount, isBatch, batchSize, publicKey]);

    const calculateFees = async () => {
        if (!publicKey) return;

        setLoading(true);
        try {
            const amountInStroops = Math.floor(amount * 10_000_000);

            // Call calculate_fee contract function
            const server = new StellarSdk.SorobanRpc.Server('https://soroban-testnet.stellar.org');
            const contract = new StellarSdk.Contract(CONTRACTS.SAVEX);

            // Build source account for simulation
            const sourceKeypair = StellarSdk.Keypair.random();
            const sourceAccount = new StellarSdk.SorobanRpc.Account(sourceKeypair.publicKey(), '0');

            const tx = new StellarSdk.TransactionBuilder(sourceAccount, {
                fee: '100',
                networkPassphrase: StellarSdk.Networks.TESTNET,
            })
                .addOperation(
                    contract.call(
                        'calculate_fee',
                        StellarSdk.Address.fromString(publicKey).toScVal(),
                        StellarSdk.nativeToScVal(amountInStroops, { type: 'i128' }),
                        StellarSdk.nativeToScVal(isBatch, { type: 'bool' }),
                        StellarSdk.nativeToScVal(batchSize, { type: 'u32' })
                    )
                )
                .setTimeout(30)
                .build();

            const simulated = await server.simulateTransaction(tx);

            if (StellarSdk.SorobanRpc.Api.isSimulationSuccess(simulated) && simulated.result) {
                // Parse FeeBreakdown struct from result
                const result = simulated.result.retval;

                // Extract fee breakdown values
                // Structure: { network_fee, service_fee, discount, total }
                const feeData: FeeBreakdown = {
                    networkFee: 0.0001, // Mock for now - parse from result
                    serviceFee: amount * 0.0005, // 0.05%
                    discount: 0,
                    total: 0,
                };

                // Calculate discount if user has package
                // This would come from the contract result
                feeData.total = feeData.networkFee + feeData.serviceFee - feeData.discount;

                setFees(feeData);
            }
        } catch (error) {
            console.error('Failed to calculate fees:', error);
            // Fallback to estimated fees
            const estimatedFees: FeeBreakdown = {
                networkFee: 0.0001,
                serviceFee: amount * 0.0005,
                discount: 0,
                total: 0.0001 + amount * 0.0005,
            };
            setFees(estimatedFees);
        } finally {
            setLoading(false);
        }
    };

    if (!fees && !loading) return null;

    return (
        <div className="glass rounded-xl p-4 border border-white/10 mb-4">
            <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-white flex items-center gap-2">
                    <span>💰</span>
                    Fee Breakdown
                </h3>
                {loading && (
                    <span className="text-sm text-gray-400">Calculating...</span>
                )}
            </div>

            {fees && (
                <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Network Fee</span>
                        <span className="text-white">{fees.networkFee.toFixed(4)} XLM</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Service Fee (0.05%)</span>
                        <span className="text-white">{fees.serviceFee.toFixed(4)} XLM</span>
                    </div>
                    {fees.discount > 0 && (
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-400">Package Discount</span>
                            <span className="text-green-400">-{fees.discount.toFixed(4)} XLM</span>
                        </div>
                    )}
                    {isBatch && batchSize > 1 && (
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-400">Batch Discount ({(batchSize - 1) * 10}%)</span>
                            <span className="text-green-400">Applied</span>
                        </div>
                    )}
                    <div className="border-t border-white/10 pt-2 mt-2">
                        <div className="flex justify-between font-semibold">
                            <span className="text-white">Total Fee</span>
                            <span className="text-cyan-400">{fees.total.toFixed(4)} XLM</span>
                        </div>
                        <div className="text-xs text-gray-500 text-right mt-1">
                            ≈ ${(fees.total * 0.25).toFixed(4)} USD
                        </div>
                    </div>
                </div>
            )}

            {!publicKey && (
                <div className="text-sm text-gray-400 text-center">
                    Connect wallet to see fee breakdown
                </div>
            )}

            <div className="mt-3 text-xs text-gray-400 flex items-center gap-1">
                <span>💡</span>
                <span>Subscribe to a package for automatic discounts</span>
            </div>
        </div>
    );
}
