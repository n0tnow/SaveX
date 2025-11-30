import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), '../backend/data');

function readDataFile(filename: string) {
    const filepath = path.join(DATA_DIR, filename);
    if (!fs.existsSync(filepath)) {
        return null;
    }
    return JSON.parse(fs.readFileSync(filepath, 'utf-8'));
}

export async function GET() {
    const poolsData = readDataFile('selected_pools_500.json');
    const arbitrageData = readDataFile('arbitrage_opportunities.json');
    const pricesData = readDataFile('external_prices.json');
    const syncState = readDataFile('auto_sync_state.json');

    return NextResponse.json({
        pools: poolsData ? {
            total: poolsData.selectedPools.length,
            categories: poolsData.statistics,
        } : null,
        arbitrage: arbitrageData ? {
            totalOpportunities: arbitrageData.totalOpportunities,
            highConfidence: arbitrageData.highConfidence,
            mediumConfidence: arbitrageData.mediumConfidence,
            lowConfidence: arbitrageData.lowConfidence,
            lastUpdated: arbitrageData.timestamp,
        } : null,
        prices: pricesData ? {
            totalTokens: pricesData.totalTokens,
            lastUpdated: pricesData.timestamp,
        } : null,
        sync: syncState || null,
        timestamp: new Date().toISOString(),
    });
}
