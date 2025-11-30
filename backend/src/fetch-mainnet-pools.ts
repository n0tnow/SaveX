#!/usr/bin/env tsx

import * as StellarSDK from '@stellar/stellar-sdk';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MAINNET_HORIZON = 'https://horizon.stellar.org';
const mainnetServer = new StellarSDK.Horizon.Server(MAINNET_HORIZON);

async function fetchMainnetPools() {
    console.log('\n🌐 Fetching Mainnet Liquidity Pools\n');
    console.log('='.repeat(70));

    try {
        // Fetch top liquidity pools from mainnet
        const poolsResponse = await mainnetServer
            .liquidityPools()
            .limit(100)  // Increased to 100
            .order('desc')
            .call();

        const pools = poolsResponse.records.map((pool: any) => {
            const reserves = pool.reserves;
            const tokenA = reserves[0].asset === 'native'
                ? { code: 'XLM', type: 'native' }
                : {
                    code: reserves[0].asset.split(':')[0],
                    issuer: reserves[0].asset.split(':')[1],
                    type: 'credit_alphanum4'
                };

            const tokenB = reserves[1].asset === 'native'
                ? { code: 'XLM', type: 'native' }
                : {
                    code: reserves[1].asset.split(':')[0],
                    issuer: reserves[1].asset.split(':')[1],
                    type: 'credit_alphanum4'
                };

            return {
                pairName: `${tokenA.code}/${tokenB.code}`,
                poolId: pool.id,
                tokenA: {
                    symbol: tokenA.code,
                    code: tokenA.code,
                    issuer: tokenA.issuer,
                    type: tokenA.type,
                    amount: reserves[0].amount
                },
                tokenB: {
                    symbol: tokenB.code,
                    code: tokenB.code,
                    issuer: tokenB.issuer,
                    type: tokenB.type,
                    amount: reserves[1].amount
                },
                liquidityPoolId: pool.id,
                totalShares: pool.total_shares,
                totalTrustlines: pool.total_trustlines,
                reserveA: reserves[0].amount,
                reserveB: reserves[1].amount,
                source: 'mainnet',
                createdAt: new Date().toISOString()
            };
        });

        // Save to file
        const outputPath = path.join(__dirname, '../data/mainnet_pools.json');
        const data = {
            timestamp: new Date().toISOString(),
            totalPools: pools.length,
            source: 'Stellar Mainnet',
            pools: pools
        };

        fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));

        console.log(`✅ Fetched ${pools.length} mainnet pools`);
        console.log(`✅ Saved to: ${outputPath}\n`);
        console.log('='.repeat(70));
        console.log('🎉 Mainnet pools data ready!\n');

        // Show sample
        console.log('Sample pools:');
        pools.slice(0, 5).forEach((pool: any, i: number) => {
            console.log(`${i + 1}. ${pool.pairName} - Reserves: ${parseFloat(pool.reserveA).toFixed(2)} / ${parseFloat(pool.reserveB).toFixed(2)}`);
        });

    } catch (error: any) {
        console.error('❌ Error fetching mainnet pools:', error.message);
        throw error;
    }
}

// Run
fetchMainnetPools().catch(console.error);
