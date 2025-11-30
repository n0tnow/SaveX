import { NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';

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

export async function POST(request: Request) {
    try {
        const { startAsset = 'XLM', amount = '100' } = await request.json();

        // Load pools
        const poolsPath = path.join(process.cwd(), '..', 'backend', 'data', 'simple_testnet_pools.json');
        const poolsData = JSON.parse(fs.readFileSync(poolsPath, 'utf-8'));
        const pools = poolsData.pools;

        // Build price graph
        const priceMap = new Map<string, Map<string, number>>();

        pools.forEach((pool: any) => {
            const tokenA = pool.tokenA.code;
            const tokenB = pool.tokenB.code;

            const reserveA = parseFloat(pool.tokenA.amount);
            const reserveB = parseFloat(pool.tokenB.amount);

            // Rate A -> B
            const rateAtoB = reserveB / reserveA;
            if (!priceMap.has(tokenA)) priceMap.set(tokenA, new Map());
            priceMap.get(tokenA)!.set(tokenB, rateAtoB);

            // Rate B -> A
            const rateBtoA = reserveA / reserveB;
            if (!priceMap.has(tokenB)) priceMap.set(tokenB, new Map());
            priceMap.get(tokenB)!.set(tokenA, rateBtoA);
        });

        // Find triangular arbitrage opportunities
        const opportunities: ArbitrageOpportunity[] = [];
        const startAmount = parseFloat(amount);

        // Get all tokens connected to start asset
        const connectedTokens = Array.from(priceMap.get(startAsset)?.keys() || []);

        for (const intermediate1 of connectedTokens) {
            if (intermediate1 === startAsset) continue;

            const connected2 = Array.from(priceMap.get(intermediate1)?.keys() || []);

            for (const intermediate2 of connected2) {
                if (intermediate2 === startAsset || intermediate2 === intermediate1) continue;

                // Check if we can go back to start
                if (!priceMap.get(intermediate2)?.has(startAsset)) continue;

                // Calculate arbitrage
                const rate1 = priceMap.get(startAsset)!.get(intermediate1)!;
                const rate2 = priceMap.get(intermediate1)!.get(intermediate2)!;
                const rate3 = priceMap.get(intermediate2)!.get(startAsset)!;

                let currentAmount = startAmount;

                // Step 1: Start -> Intermediate1
                currentAmount = currentAmount * rate1 * 0.997; // 0.3% fee

                // Step 2: Intermediate1 -> Intermediate2
                currentAmount = currentAmount * rate2 * 0.997;

                // Step 3: Intermediate2 -> Start
                currentAmount = currentAmount * rate3 * 0.997;

                const profit = currentAmount - startAmount;
                const profitPercent = (profit / startAmount) * 100;

                // Only include if profitable (>0.5% to account for slippage)
                if (profitPercent > 0.5) {
                    opportunities.push({
                        path: [startAsset, intermediate1, intermediate2, startAsset],
                        profit,
                        profitPercent,
                        startAmount,
                        endAmount: currentAmount,
                        steps: [
                            { from: startAsset, to: intermediate1, rate: rate1 },
                            { from: intermediate1, to: intermediate2, rate: rate2 },
                            { from: intermediate2, to: startAsset, rate: rate3 }
                        ]
                    });
                }
            }
        }

        // Sort by profit percent (highest first)
        opportunities.sort((a, b) => b.profitPercent - a.profitPercent);

        return NextResponse.json({
            opportunities: opportunities.slice(0, 10), // Top 10
            totalFound: opportunities.length,
            startAsset,
            startAmount
        });

    } catch (error: any) {
        console.error('Arbitrage detection error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
