import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DATA_DIR = path.join(__dirname, '../data');

interface MainnetPool {
    id: string;
    paging_token: string;
    fee_bp: number;
    type: string;
    total_trustlines: string;
    total_shares: string;
    reserves: Array<{
        amount: string;
        asset: string;
    }>;
    last_modified_ledger: number;
    last_modified_time: string;
}

interface TokenInfo {
    code: string;
    issuer: string;
    type: string;
    pools: number;
}

interface PoolScore {
    poolId: string;
    pairName: string;
    totalScore: number;
    liquidityScore: number;
    popularityScore: number;
    activityScore: number;
    category: 'major' | 'stablecoin' | 'defi' | 'longtail';
    totalShares: string;
    lastModified: string;
    reserves: any[];
}

interface SelectionResult {
    selectedPools: PoolScore[];
    statistics: {
        total: number;
        major: number;
        stablecoin: number;
        defi: number;
        longtail: number;
    };
    timestamp: string;
}

// Major token issuer'ları
const MAJOR_TOKENS: Record<string, string> = {
    'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN': 'USDC',
    'GBNZILSTVQZ4R7IKQDGHYGY2QNO2ARQNMKLY9PJDNRX5WTHLQSZZ4XKZ': 'AQUA',
    'GARDNV3Q7YGT4AKSDF25LT32YSCCW4EV22Y2TV3I2PU2MMXJTEDL5T55': 'yXLM',
    'GDHU6WRG4IEQXM5NZ4BMPKOXHW76MZM4Y2IEMFDVXBSDP6SJY4ITNPP2': 'EURC',
};

const STABLECOIN_KEYWORDS = ['USD', 'EUR', 'USDT', 'USDC', 'EURC', 'DAI', 'BUSD'];

// Asset parsing helper
function parseAsset(asset: string): { code: string; issuer: string; type: string } {
    if (asset === 'native') {
        return { code: 'XLM', issuer: 'native', type: 'native' };
    }
    const parts = asset.split(':');
    return {
        code: parts[0] || 'UNKNOWN',
        issuer: parts[1] || '',
        type: parts[0]?.length <= 4 ? 'credit_alphanum4' : 'credit_alphanum12',
    };
}

// Pool kategorisini belirle
function categorizePool(pool: MainnetPool, tokenMap: Record<string, TokenInfo>): PoolScore['category'] {
    const reserves = pool.reserves || [];
    if (reserves.length !== 2) return 'longtail';

    const asset1 = parseAsset(reserves[0].asset);
    const asset2 = parseAsset(reserves[1].asset);

    // Major pair kontrolü
    const isMajor = (issuer: string) => MAJOR_TOKENS[issuer] !== undefined;
    if (isMajor(asset1.issuer) || isMajor(asset2.issuer) || asset1.code === 'XLM' || asset2.code === 'XLM') {
        if (isMajor(asset1.issuer) || isMajor(asset2.issuer)) {
            return 'major';
        }
    }

    // Stablecoin pair kontrolü
    const isStablecoin = (code: string) => STABLECOIN_KEYWORDS.some(kw => code.includes(kw));
    if (isStablecoin(asset1.code) && isStablecoin(asset2.code)) {
        return 'stablecoin';
    }

    // DeFi token kontrolü (yüksek popülerlik)
    const key1 = `${asset1.code}:${asset1.issuer}`;
    const key2 = `${asset2.code}:${asset2.issuer}`;
    const popularity1 = tokenMap[key1]?.pools || 0;
    const popularity2 = tokenMap[key2]?.pools || 0;

    if (popularity1 > 50 || popularity2 > 50) {
        return 'defi';
    }

    return 'longtail';
}

// Pool skorunu hesapla
function calculatePoolScore(
    pool: MainnetPool,
    tokenMap: Record<string, TokenInfo>,
    maxShares: number,
    maxPopularity: number
): PoolScore {
    const reserves = pool.reserves || [];
    const asset1 = parseAsset(reserves[0]?.asset || '');
    const asset2 = parseAsset(reserves[1]?.asset || '');
    const pairName = `${asset1.code}/${asset2.code}`;

    // 1. Likidite Skoru (40%)
    const shares = parseFloat(pool.total_shares || '0');
    const liquidityScore = (shares / maxShares) * 0.4;

    // 2. Token Popülerliği Skoru (30%)
    const key1 = `${asset1.code}:${asset1.issuer}`;
    const key2 = `${asset2.code}:${asset2.issuer}`;
    const popularity1 = tokenMap[key1]?.pools || 0;
    const popularity2 = tokenMap[key2]?.pools || 0;
    const avgPopularity = (popularity1 + popularity2) / 2;
    const popularityScore = (avgPopularity / maxPopularity) * 0.3;

    // 3. Aktivite Skoru (30%)
    const lastModified = new Date(pool.last_modified_time);
    const now = new Date();
    const daysSinceUpdate = (now.getTime() - lastModified.getTime()) / (1000 * 60 * 60 * 24);
    const activityScore = daysSinceUpdate <= 30 ? 0.3 : Math.max(0, 0.3 * (1 - daysSinceUpdate / 365));

    const totalScore = liquidityScore + popularityScore + activityScore;
    const category = categorizePool(pool, tokenMap);

    return {
        poolId: pool.id,
        pairName,
        totalScore,
        liquidityScore,
        popularityScore,
        activityScore,
        category,
        totalShares: pool.total_shares,
        lastModified: pool.last_modified_time,
        reserves: pool.reserves,
    };
}

// Top 500 pool seç
export async function selectTop500Pools(): Promise<SelectionResult> {
    console.log('[PoolSelector] Loading mainnet pools...');

    // Load data
    const poolsPath = path.join(DATA_DIR, 'all_mainnet_pools.json');
    const tokensPath = path.join(DATA_DIR, 'mainnet_tokens.json');

    if (!fs.existsSync(poolsPath) || !fs.existsSync(tokensPath)) {
        throw new Error('Mainnet data not found. Run mainnet-pool-discovery.ts first.');
    }

    const pools: MainnetPool[] = JSON.parse(fs.readFileSync(poolsPath, 'utf-8'));
    const tokensData = JSON.parse(fs.readFileSync(tokensPath, 'utf-8'));

    // Token map oluştur
    const tokenMap: Record<string, TokenInfo> = {};
    for (const token of tokensData.tokens) {
        tokenMap[token.key] = token;
    }

    console.log(`[PoolSelector] Loaded ${pools.length} pools and ${tokensData.total} tokens`);

    // Max değerleri bul
    const maxShares = Math.max(...pools.map(p => parseFloat(p.total_shares || '0')));
    const maxPopularity = Math.max(...tokensData.tokens.map((t: TokenInfo) => t.pools));

    console.log(`[PoolSelector] Max shares: ${maxShares.toFixed(2)}, Max popularity: ${maxPopularity}`);

    // Tüm pool'ları skorla
    console.log('[PoolSelector] Scoring pools...');
    const scoredPools = pools
        .filter(p => p.reserves && p.reserves.length === 2) // Sadece valid pool'lar
        .map(p => calculatePoolScore(p, tokenMap, maxShares, maxPopularity));

    // Kategorilere göre ayır
    const byCategory = {
        major: scoredPools.filter(p => p.category === 'major').sort((a, b) => b.totalScore - a.totalScore),
        stablecoin: scoredPools.filter(p => p.category === 'stablecoin').sort((a, b) => b.totalScore - a.totalScore),
        defi: scoredPools.filter(p => p.category === 'defi').sort((a, b) => b.totalScore - a.totalScore),
        longtail: scoredPools.filter(p => p.category === 'longtail').sort((a, b) => b.totalScore - a.totalScore),
    };

    console.log('[PoolSelector] Category distribution:');
    console.log(`   Major: ${byCategory.major.length}`);
    console.log(`   Stablecoin: ${byCategory.stablecoin.length}`);
    console.log(`   DeFi: ${byCategory.defi.length}`);
    console.log(`   Long-tail: ${byCategory.longtail.length}`);

    // Dengeli seçim yap
    const selectedPools: PoolScore[] = [
        ...byCategory.major.slice(0, 50),        // Top 50 major
        ...byCategory.stablecoin.slice(0, 100),  // Top 100 stablecoin
        ...byCategory.defi.slice(0, 200),        // Top 200 DeFi
        ...byCategory.longtail.slice(0, 150),    // Top 150 long-tail
    ];

    // Eğer 500'den az ise, en yüksek skorluları ekle
    if (selectedPools.length < 500) {
        const remaining = 500 - selectedPools.length;
        const allSorted = scoredPools.sort((a, b) => b.totalScore - a.totalScore);
        const selectedIds = new Set(selectedPools.map(p => p.poolId));
        const additional = allSorted.filter(p => !selectedIds.has(p.poolId)).slice(0, remaining);
        selectedPools.push(...additional);
    }

    // İlk 500'ü al
    const top500 = selectedPools.slice(0, 500);

    const result: SelectionResult = {
        selectedPools: top500,
        statistics: {
            total: top500.length,
            major: top500.filter(p => p.category === 'major').length,
            stablecoin: top500.filter(p => p.category === 'stablecoin').length,
            defi: top500.filter(p => p.category === 'defi').length,
            longtail: top500.filter(p => p.category === 'longtail').length,
        },
        timestamp: new Date().toISOString(),
    };

    console.log('\n[PoolSelector] ✓ Selection complete!');
    console.log(`   Total selected: ${result.statistics.total}`);
    console.log(`   Major: ${result.statistics.major}`);
    console.log(`   Stablecoin: ${result.statistics.stablecoin}`);
    console.log(`   DeFi: ${result.statistics.defi}`);
    console.log(`   Long-tail: ${result.statistics.longtail}`);

    return result;
}

// Sonuçları kaydet
export function saveSelectedPools(result: SelectionResult) {
    const outputPath = path.join(DATA_DIR, 'selected_pools_500.json');
    fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
    console.log(`\n[PoolSelector] ✓ Saved to: ${outputPath}`);

    // Özet rapor
    const reportPath = path.join(DATA_DIR, 'pool_selection_report.json');
    const report = {
        timestamp: result.timestamp,
        totalSelected: result.statistics.total,
        categoryDistribution: result.statistics,
        topPools: result.selectedPools.slice(0, 20).map(p => ({
            pairName: p.pairName,
            category: p.category,
            score: p.totalScore.toFixed(4),
            shares: parseFloat(p.totalShares).toFixed(2),
        })),
    };
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`[PoolSelector] ✓ Report saved to: ${reportPath}`);
}

// CLI
if (import.meta.url === `file://${process.argv[1]}`) {
    selectTop500Pools()
        .then(result => {
            saveSelectedPools(result);
            console.log('\n✅ Pool selection completed successfully!');
            process.exit(0);
        })
        .catch(error => {
            console.error('[Fatal Error]', error);
            process.exit(1);
        });
}
