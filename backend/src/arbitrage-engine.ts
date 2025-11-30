import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { ExternalPriceData } from './coingecko-service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DATA_DIR = path.join(__dirname, '../data');
const ARBITRAGE_THRESHOLD = 1.0; // %1.0 minimum profit

export interface ArbitrageOpportunity {
    type: 'direct' | 'triangular' | 'cross-dex';
    pairName: string;
    profitPercent: number;
    estimatedProfit: number;
    mainnetPrice: number;
    externalPrice: number;
    path?: string[];
    poolId: string;
    timestamp: string;
    confidence: 'high' | 'medium' | 'low';
}

interface PoolData {
    poolId: string;
    pairName: string;
    reserves: any[];
    totalShares: string;
    category: string;
}

// Pool fiyatını hesapla
function calculatePoolPrice(reserves: any[]): number {
    if (!reserves || reserves.length !== 2) return 0;

    const amount1 = parseFloat(reserves[0].amount || '0');
    const amount2 = parseFloat(reserves[1].amount || '0');

    if (amount1 === 0 || amount2 === 0) return 0;

    return amount2 / amount1;
}

// Direct arbitrage tespit et
function detectDirectArbitrage(
    pools: PoolData[],
    externalPrices: Record<string, ExternalPriceData>
): ArbitrageOpportunity[] {
    const opportunities: ArbitrageOpportunity[] = [];

    for (const pool of pools) {
        const tokens = pool.pairName.split('/');
        if (tokens.length !== 2) continue;

        const [token1, token2] = tokens;
        const price1 = externalPrices[token1]?.price;
        const price2 = externalPrices[token2]?.price;

        if (!price1 || !price2) continue;

        const mainnetPrice = calculatePoolPrice(pool.reserves);
        if (mainnetPrice === 0) continue;

        const externalPrice = price2 / price1;
        const priceDiff = Math.abs(mainnetPrice - externalPrice);
        const profitPercent = (priceDiff / mainnetPrice) * 100;

        if (profitPercent >= ARBITRAGE_THRESHOLD) {
            // Likiditeye göre estimated profit hesapla
            const shares = parseFloat(pool.totalShares || '0');
            const estimatedProfit = (shares * profitPercent) / 100;

            // Confidence hesapla
            let confidence: 'high' | 'medium' | 'low' = 'low';
            if (profitPercent > 5 && shares > 1000000) {
                confidence = 'high';
            } else if (profitPercent > 2 && shares > 100000) {
                confidence = 'medium';
            }

            opportunities.push({
                type: 'direct',
                pairName: pool.pairName,
                profitPercent,
                estimatedProfit,
                mainnetPrice,
                externalPrice,
                poolId: pool.poolId,
                timestamp: new Date().toISOString(),
                confidence,
            });
        }
    }

    return opportunities;
}

// Triangular arbitrage path'leri bul
function findTriangularPaths(pools: PoolData[]): string[][] {
    const paths: string[][] = [];
    const tokenGraph: Record<string, Set<string>> = {};

    // Graph oluştur
    for (const pool of pools) {
        const tokens = pool.pairName.split('/');
        if (tokens.length !== 2) continue;

        const [token1, token2] = tokens;
        if (!tokenGraph[token1]) tokenGraph[token1] = new Set();
        if (!tokenGraph[token2]) tokenGraph[token2] = new Set();

        tokenGraph[token1].add(token2);
        tokenGraph[token2].add(token1);
    }

    // XLM'den başlayan triangular path'leri bul
    const startToken = 'XLM';
    if (!tokenGraph[startToken]) return paths;

    for (const token2 of tokenGraph[startToken]) {
        if (!tokenGraph[token2]) continue;

        for (const token3 of tokenGraph[token2]) {
            if (token3 === startToken) continue;
            if (!tokenGraph[token3]) continue;

            // token3'ten startToken'a dönüş var mı?
            if (tokenGraph[token3].has(startToken)) {
                paths.push([startToken, token2, token3, startToken]);
            }
        }
    }

    return paths;
}

// Triangular arbitrage tespit et
function detectTriangularArbitrage(
    pools: PoolData[],
    externalPrices: Record<string, ExternalPriceData>
): ArbitrageOpportunity[] {
    const opportunities: ArbitrageOpportunity[] = [];
    const paths = findTriangularPaths(pools);

    console.log(`[Arbitrage] Found ${paths.length} triangular paths`);

    for (const path of paths) {
        // Path boyunca fiyat hesapla
        let cumulativeRate = 1.0;
        let allPricesAvailable = true;

        for (let i = 0; i < path.length - 1; i++) {
            const token1 = path[i];
            const token2 = path[i + 1];

            const price1 = externalPrices[token1]?.price;
            const price2 = externalPrices[token2]?.price;

            if (!price1 || !price2) {
                allPricesAvailable = false;
                break;
            }

            cumulativeRate *= price2 / price1;
        }

        if (!allPricesAvailable) continue;

        // Profit hesapla
        const profitPercent = (cumulativeRate - 1) * 100;

        if (profitPercent >= ARBITRAGE_THRESHOLD) {
            opportunities.push({
                type: 'triangular',
                pairName: path.join(' → '),
                profitPercent,
                estimatedProfit: 0, // Path-specific hesaplama gerekir
                mainnetPrice: 1.0,
                externalPrice: cumulativeRate,
                path: path,
                poolId: 'triangular',
                timestamp: new Date().toISOString(),
                confidence: profitPercent > 3 ? 'high' : 'medium',
            });
        }
    }

    return opportunities;
}

// Tüm arbitraj fırsatlarını tespit et
export async function detectAllArbitrageOpportunities(): Promise<ArbitrageOpportunity[]> {
    console.log('[Arbitrage] Loading data...');

    // Load selected pools
    const poolsPath = path.join(DATA_DIR, 'selected_pools_500.json');
    if (!fs.existsSync(poolsPath)) {
        throw new Error('Selected pools not found');
    }

    const poolsData = JSON.parse(fs.readFileSync(poolsPath, 'utf-8'));
    const pools: PoolData[] = poolsData.selectedPools;

    // Load external prices
    const pricesPath = path.join(DATA_DIR, 'external_prices.json');
    if (!fs.existsSync(pricesPath)) {
        throw new Error('External prices not found. Run coingecko-service.ts first.');
    }

    const pricesData = JSON.parse(fs.readFileSync(pricesPath, 'utf-8'));
    const externalPrices: Record<string, ExternalPriceData> = pricesData.prices;

    console.log(`[Arbitrage] Loaded ${pools.length} pools and ${Object.keys(externalPrices).length} prices`);

    // Detect arbitrage
    console.log('[Arbitrage] Detecting direct arbitrage...');
    const directOpportunities = detectDirectArbitrage(pools, externalPrices);

    console.log('[Arbitrage] Detecting triangular arbitrage...');
    const triangularOpportunities = detectTriangularArbitrage(pools, externalPrices);

    const allOpportunities = [...directOpportunities, ...triangularOpportunities];

    // Sort by profit
    allOpportunities.sort((a, b) => b.profitPercent - a.profitPercent);

    console.log(`\n[Arbitrage] ✓ Found ${allOpportunities.length} opportunities`);
    console.log(`   Direct: ${directOpportunities.length}`);
    console.log(`   Triangular: ${triangularOpportunities.length}`);

    // Top 10'u göster
    if (allOpportunities.length > 0) {
        console.log('\n[Arbitrage] Top 10 Opportunities:');
        allOpportunities.slice(0, 10).forEach((opp, i) => {
            console.log(`   ${i + 1}. ${opp.pairName} - ${opp.profitPercent.toFixed(2)}% (${opp.type}, ${opp.confidence})`);
        });
    }

    return allOpportunities;
}

// Sonuçları kaydet
export function saveArbitrageOpportunities(opportunities: ArbitrageOpportunity[]) {
    const outputPath = path.join(DATA_DIR, 'arbitrage_opportunities.json');

    const output = {
        timestamp: new Date().toISOString(),
        totalOpportunities: opportunities.length,
        highConfidence: opportunities.filter(o => o.confidence === 'high').length,
        mediumConfidence: opportunities.filter(o => o.confidence === 'medium').length,
        lowConfidence: opportunities.filter(o => o.confidence === 'low').length,
        opportunities: opportunities,
    };

    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
    console.log(`\n[Arbitrage] ✓ Saved to: ${outputPath}`);
}

// CLI
if (import.meta.url === `file://${process.argv[1]}`) {
    detectAllArbitrageOpportunities()
        .then(opportunities => {
            saveArbitrageOpportunities(opportunities);
            console.log('\n✅ Arbitrage detection completed!');
            process.exit(0);
        })
        .catch(error => {
            console.error('[Fatal Error]', error);
            process.exit(1);
        });
}
