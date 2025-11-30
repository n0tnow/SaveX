import { NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { sourceAsset, destAsset, amount } = body;

        if (!sourceAsset || !destAsset || !amount) {
            return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
        }

        // Always use testnet pools from API (live data)
        let pools;
        try {
            const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3001';
            const response = await fetch(`${baseUrl}/api/testnet-pools`, {
                cache: 'no-store'
            });
            const data = await response.json();
            pools = data.pools;
            console.log(`Loaded ${pools?.length || 0} testnet pools for estimation`);
        } catch (error) {
            console.error('Failed to fetch testnet pools:', error);
            return NextResponse.json({
                estimatedReceive: 'unknown',
                source: 'error',
                error: 'Failed to load pool data'
            });
        }

        if (!pools || pools.length === 0) {
            return NextResponse.json({
                estimatedReceive: 'unknown',
                source: 'unavailable',
                error: 'No pool data available'
            });
        }

        // Find matching pool (by token codes)
        const sourceCode = sourceAsset.code || 'XLM';
        const destCode = destAsset.code || 'XLM';

        console.log(`Looking for pool: ${sourceCode} <-> ${destCode}`);

        const matchingPool = pools.find((pool: any) =>
            (pool.tokenA?.code === sourceCode && pool.tokenB?.code === destCode) ||
            (pool.tokenA?.code === destCode && pool.tokenB?.code === sourceCode)
        );

        if (matchingPool) {
            // Calculate price based on pool reserves
            const isForward = matchingPool.tokenA.code === sourceCode;
            const reserveIn = parseFloat(isForward ? matchingPool.tokenA.amount : matchingPool.tokenB.amount);
            const reserveOut = parseFloat(isForward ? matchingPool.tokenB.amount : matchingPool.tokenA.amount);

            console.log(`Found pool: ${matchingPool.tokenA.code}/${matchingPool.tokenB.code}`);
            console.log(`Token amounts: ${matchingPool.tokenA.amount} / ${matchingPool.tokenB.amount}`);
            console.log(`Reserves: ${reserveIn} / ${reserveOut}`);

            // Simple constant product formula: amountOut = (amountIn * reserveOut) / (reserveIn + amountIn)
            const amountIn = parseFloat(amount);

            // Apply 0.3% fee (standard AMM fee)
            const amountInWithFee = amountIn * 0.997;
            const amountOut = (amountInWithFee * reserveOut) / (reserveIn + amountInWithFee);

            console.log(`Estimate: ${amountIn} ${sourceCode} -> ${amountOut.toFixed(7)} ${destCode}`);

            return NextResponse.json({
                estimatedReceive: amountOut.toFixed(7),
                source: 'pool_data',
                rate: (amountOut / amountIn).toFixed(6),
                poolId: matchingPool.poolId || 'unknown'
            });
        }

        console.log(`No direct pool found for ${sourceCode}/${destCode}`);

        // No matching pool found
        return NextResponse.json({
            estimatedReceive: 'unknown',
            source: 'no_pool_found',
            error: `No pool found for ${sourceCode}/${destCode}`
        });
    } catch (error: any) {
        console.error('Price estimation error:', error);
        return NextResponse.json({
            estimatedReceive: 'unknown',
            source: 'error',
            error: error.message
        });
    }
}
