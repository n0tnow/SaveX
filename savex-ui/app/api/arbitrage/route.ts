import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), '../backend/data');

export async function GET() {
    try {
        const arbitragePath = path.join(DATA_DIR, 'arbitrage_opportunities.json');
        
        if (!fs.existsSync(arbitragePath)) {
            console.log('[Arbitrage API] No arbitrage data found');
            return NextResponse.json({
                opportunities: [],
                totalOpportunities: 0,
                message: 'No arbitrage data available. Run arbitrage engine first.'
            });
        }
        
        const data = fs.readFileSync(arbitragePath, 'utf-8');
        const arbitrageData = JSON.parse(data);
        
        console.log(`[Arbitrage API] Loaded ${arbitrageData.totalOpportunities} opportunities`);
        console.log(`  High confidence: ${arbitrageData.highConfidence}`);
        console.log(`  Medium confidence: ${arbitrageData.mediumConfidence}`);
        console.log(`  Low confidence: ${arbitrageData.lowConfidence}`);
        
        // Filter only high confidence opportunities for the popup
        const highConfidenceOpps = arbitrageData.opportunities.filter(
            (opp: any) => opp.confidence === 'high' && opp.profitPercent > 2
        );
        
        return NextResponse.json({
            ...arbitrageData,
            opportunities: highConfidenceOpps.slice(0, 10), // Return top 10 high confidence
        });
    } catch (error: any) {
        console.error('[Arbitrage API] Error:', error);
        return NextResponse.json({
            opportunities: [],
            totalOpportunities: 0,
            error: error.message
        }, { status: 500 });
    }
}
