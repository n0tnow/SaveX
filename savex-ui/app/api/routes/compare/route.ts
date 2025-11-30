import { NextResponse } from 'next/server';
import * as StellarSDK from '@stellar/stellar-sdk';
import * as fs from 'fs';
import * as path from 'path';

const server = new StellarSDK.Horizon.Server('https://horizon-testnet.stellar.org');

interface Route {
    path: string[];
    estimatedOutput: number;
    duration: number;
    slippage: number;
    savings: number;
}

export async function POST(request: Request) {
    try {
        const { sourceAsset, destAsset, amount, userAddress } = await request.json();

        if (!sourceAsset || !destAsset || !amount) {
            return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
        }

        // Load pools
        const poolsPath = path.join(process.cwd(), '../backend/data/simple_testnet_pools.json');
        const poolsData = JSON.parse(fs.readFileSync(poolsPath, 'utf-8'));
        const pools = poolsData.pools;

        // Find all possible routes
        const routes: Route[] = [];

        // 1. Direct route
        const directPool = pools.find((p: any) =>
            (p.tokenA.code === sourceAsset && p.tokenB.code === destAsset) ||
            (p.tokenB.code === sourceAsset && p.tokenA.code === destAsset)
        );

        if (directPool) {
            const output = await estimateOutput(sourceAsset, destAsset, amount, [sourceAsset, destAsset]);
            routes.push({
                path: [sourceAsset, destAsset],
                estimatedOutput: output,
                duration: 5,
                slippage: 0.01,
                savings: 0
            });
        }

        // 2. One-hop routes (via intermediate token)
        const intermediateTokens = ['XLM', 'USDC', 'AQUA', 'yXLM'];

        for (const intermediate of intermediateTokens) {
            if (intermediate === sourceAsset || intermediate === destAsset) continue;

            const pool1 = pools.find((p: any) =>
                (p.tokenA.code === sourceAsset && p.tokenB.code === intermediate) ||
                (p.tokenB.code === sourceAsset && p.tokenA.code === intermediate)
            );

            const pool2 = pools.find((p: any) =>
                (p.tokenA.code === intermediate && p.tokenB.code === destAsset) ||
                (p.tokenB.code === intermediate && p.tokenA.code === destAsset)
            );

            if (pool1 && pool2) {
                const output = await estimateOutput(sourceAsset, destAsset, amount, [sourceAsset, intermediate, destAsset]);
                routes.push({
                    path: [sourceAsset, intermediate, destAsset],
                    estimatedOutput: output,
                    duration: 10,
                    slippage: 0.02,
                    savings: 0
                });
            }
        }

        // Calculate savings relative to best route
        if (routes.length > 0) {
            const bestOutput = Math.max(...routes.map(r => r.estimatedOutput));
            routes.forEach(route => {
                route.savings = ((route.estimatedOutput - bestOutput) / bestOutput) * 100;
            });
        }

        // Sort by estimated output (best first)
        routes.sort((a, b) => b.estimatedOutput - a.estimatedOutput);

        return NextResponse.json({
            routes,
            bestRoute: routes[0] || null,
            totalRoutes: routes.length
        });

    } catch (error: any) {
        console.error('Route comparison error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

async function estimateOutput(
    sourceAsset: string,
    destAsset: string,
    amount: string,
    pathArray: string[]
): Promise<number> {
    try {
        // Load mainnet pool data for price estimation
        const poolsPath = path.join(process.cwd(), '..', 'backend', 'data', 'mainnet_pools.json');
        const poolsData = JSON.parse(fs.readFileSync(poolsPath, 'utf-8'));
        const pools = poolsData.pools;

        let currentAmount = parseFloat(amount);

        // Simulate swap through each hop
        for (let i = 0; i < pathArray.length - 1; i++) {
            const from = pathArray[i];
            const to = pathArray[i + 1];

            const pool = pools.find((p: any) =>
                (p.tokenA.code === from && p.tokenB.code === to) ||
                (p.tokenA.code === to && p.tokenB.code === from)
            );

            if (pool) {
                const isForward = pool.tokenA.code === from;
                const reserveIn = parseFloat(isForward ? pool.reserveA : pool.reserveB);
                const reserveOut = parseFloat(isForward ? pool.reserveB : pool.reserveA);

                // Constant product formula with 0.3% fee
                const amountInWithFee = currentAmount * 0.997;
                currentAmount = (amountInWithFee * reserveOut) / (reserveIn + amountInWithFee);
            } else {
                // No pool found, return 0
                return 0;
            }
        }

        return currentAmount;
    } catch (error) {
        console.error('Estimation error:', error);
        return 0;
    }
}
