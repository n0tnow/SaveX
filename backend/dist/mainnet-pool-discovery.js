import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const HORIZON_MAINNET = 'https://horizon.stellar.org';
const DATA_DIR = path.join(__dirname, '../data');
// Tüm liquidity pool'ları çek (pagination ile)
export async function fetchAllMainnetPools() {
    console.log('[Discovery] Fetching ALL mainnet liquidity pools...');
    console.log('[Discovery] This may take a few minutes...\n');
    const allPools = [];
    let nextUrl = `${HORIZON_MAINNET}/liquidity_pools?limit=200&order=desc`;
    let page = 1;
    try {
        while (nextUrl) {
            console.log(`[Page ${page}] Fetching ${nextUrl.substring(0, 80)}...`);
            const response = await axios.get(nextUrl, {
                timeout: 30000,
                headers: {
                    'Accept': 'application/json'
                }
            });
            const records = response.data._embedded?.records || [];
            allPools.push(...records);
            console.log(`[Page ${page}] Found ${records.length} pools (Total: ${allPools.length})`);
            // Next page var mı?
            const links = response.data._links;
            if (links && links.next && links.next.href && records.length > 0) {
                nextUrl = links.next.href;
                page++;
                // Rate limiting için kısa bekleme
                await new Promise(resolve => setTimeout(resolve, 500));
            }
            else {
                nextUrl = '';
            }
        }
        console.log(`\n[✓] Total pools discovered: ${allPools.length}`);
        return allPools;
    }
    catch (error) {
        console.error('[Error] Failed to fetch pools:', error.message);
        if (error.response) {
            console.error('[Error] Response status:', error.response.status);
            console.error('[Error] Response data:', error.response.data);
        }
        return allPools; // Return what we have so far
    }
}
// Pool'ları analiz et
export function analyzeMainnetPools(pools) {
    console.log('\n[Analysis] Analyzing pools...');
    const tokens = {};
    const poolsByCategory = {
        major: [],
        stablecoin: [],
        defi: [],
        other: [],
    };
    let nativePools = 0;
    let tokenPools = 0;
    // Major stablecoin issuer'ları
    const MAJOR_STABLECOINS = {
        'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN': 'USDC', // Circle USDC
        'GDHU6WRG4IEQXM5NZ4BMPKOXHW76MZM4Y2IEMFDVXBSDP6SJY4ITNPP2': 'EURC', // Circle EURC
        'GBNZILSTVQZ4R7IKQDGHYGY2QNO2ARQNMKLY9PJDNRX5WTHLQSZZ4XKZ': 'AQUA', // Aquarius
    };
    for (const pool of pools) {
        const reserves = pool.reserves || [];
        if (reserves.length !== 2)
            continue;
        const asset1 = reserves[0].asset;
        const asset2 = reserves[1].asset;
        // Asset parsing
        const parseAsset = (asset) => {
            if (asset === 'native') {
                return { code: 'XLM', issuer: 'native', type: 'native' };
            }
            const parts = asset.split(':');
            return {
                code: parts[0] || 'UNKNOWN',
                issuer: parts[1] || '',
                type: parts[0]?.length <= 4 ? 'credit_alphanum4' : 'credit_alphanum12',
            };
        };
        const parsedAsset1 = parseAsset(asset1);
        const parsedAsset2 = parseAsset(asset2);
        // Token tracking
        for (const asset of [parsedAsset1, parsedAsset2]) {
            if (asset.code === 'XLM')
                continue;
            const key = `${asset.code}:${asset.issuer}`;
            if (!tokens[key]) {
                tokens[key] = {
                    code: asset.code,
                    issuer: asset.issuer,
                    type: asset.type,
                    pools: 0,
                };
            }
            tokens[key].pools++;
        }
        // Categorize
        const hasNative = asset1 === 'native' || asset2 === 'native';
        const pairName = `${parsedAsset1.code}/${parsedAsset2.code}`;
        if (hasNative) {
            nativePools++;
            // Major pairs
            if (Object.values(MAJOR_STABLECOINS).some(code => pairName.includes(code))) {
                poolsByCategory.major.push(pool.id);
            }
            else {
                poolsByCategory.other.push(pool.id);
            }
        }
        else {
            tokenPools++;
            // Stablecoin pairs
            const isStablecoin = (code) => code.includes('USD') || code.includes('EUR') ||
                code === 'USDT' || code === 'USDC' || code === 'EURC';
            if (isStablecoin(parsedAsset1.code) && isStablecoin(parsedAsset2.code)) {
                poolsByCategory.stablecoin.push(pool.id);
            }
            else {
                poolsByCategory.defi.push(pool.id);
            }
        }
    }
    // Top pools by total shares
    const topPools = pools
        .map(p => {
        const reserves = p.reserves || [];
        const asset1 = reserves[0]?.asset || '';
        const asset2 = reserves[1]?.asset || '';
        const parseCode = (asset) => {
            if (asset === 'native')
                return 'XLM';
            return asset.split(':')[0] || 'UNKNOWN';
        };
        return {
            id: p.id,
            pairName: `${parseCode(asset1)}/${parseCode(asset2)}`,
            totalShares: p.total_shares,
            reserves: p.reserves,
        };
    })
        .sort((a, b) => parseFloat(b.totalShares) - parseFloat(a.totalShares))
        .slice(0, 20);
    return {
        totalPools: pools.length,
        nativePools,
        tokenPools,
        totalTokens: Object.keys(tokens).length,
        tokens,
        topPoolsByLiquidity: topPools,
        poolsByCategory,
    };
}
// Pool'ları kaydet
export function savePoolsToFile(pools, filename = 'all_mainnet_pools.json') {
    const filepath = path.join(DATA_DIR, filename);
    // Data dizini yoksa oluştur
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(filepath, JSON.stringify(pools, null, 2));
    console.log(`\n[✓] Pools saved to: ${filepath}`);
    console.log(`[✓] File size: ${(fs.statSync(filepath).size / 1024 / 1024).toFixed(2)} MB`);
}
// Analytics raporunu kaydet
export function saveAnalyticsReport(analytics) {
    const filepath = path.join(DATA_DIR, 'pool_analytics.json');
    fs.writeFileSync(filepath, JSON.stringify(analytics, null, 2));
    console.log(`[✓] Analytics saved to: ${filepath}`);
}
// Token listesini kaydet (Soroban deployment için)
export function saveTokenList(analytics) {
    const filepath = path.join(DATA_DIR, 'mainnet_tokens.json');
    // Token'ları popülerlik sırasına göre sırala
    const sortedTokens = Object.entries(analytics.tokens)
        .sort(([, a], [, b]) => b.pools - a.pools)
        .map(([key, token]) => ({
        key,
        ...token,
    }));
    const tokenList = {
        total: sortedTokens.length,
        lastUpdated: new Date().toISOString(),
        tokens: sortedTokens,
    };
    fs.writeFileSync(filepath, JSON.stringify(tokenList, null, 2));
    console.log(`[✓] Token list saved to: ${filepath}`);
}
// Konsol raporu
export function printAnalyticsReport(analytics) {
    console.log('\n' + '='.repeat(70));
    console.log('MAINNET POOL ANALYTICS REPORT');
    console.log('='.repeat(70));
    console.log('\n📊 OVERVIEW:');
    console.log(`   Total Pools: ${analytics.totalPools}`);
    console.log(`   Native (XLM) Pools: ${analytics.nativePools}`);
    console.log(`   Token-Token Pools: ${analytics.tokenPools}`);
    console.log(`   Unique Tokens: ${analytics.totalTokens}`);
    console.log('\n🏆 TOP 20 POOLS BY LIQUIDITY:');
    analytics.topPoolsByLiquidity.forEach((pool, i) => {
        console.log(`   ${(i + 1).toString().padStart(2)}. ${pool.pairName.padEnd(20)} - Shares: ${parseFloat(pool.totalShares).toFixed(2)}`);
    });
    console.log('\n📂 POOLS BY CATEGORY:');
    console.log(`   Major Pairs: ${analytics.poolsByCategory.major.length}`);
    console.log(`   Stablecoin Pairs: ${analytics.poolsByCategory.stablecoin.length}`);
    console.log(`   DeFi Pairs: ${analytics.poolsByCategory.defi.length}`);
    console.log(`   Other: ${analytics.poolsByCategory.other.length}`);
    console.log('\n🪙 TOP 20 TOKENS BY POOL COUNT:');
    const topTokens = Object.entries(analytics.tokens)
        .sort(([, a], [, b]) => b.pools - a.pools)
        .slice(0, 20);
    topTokens.forEach(([key, token], i) => {
        console.log(`   ${(i + 1).toString().padStart(2)}. ${token.code.padEnd(12)} - ${token.pools} pools`);
    });
    console.log('\n' + '='.repeat(70));
}
// Ana fonksiyon
export async function discoverAndAnalyze() {
    console.log('🚀 STELLAR MAINNET POOL DISCOVERY');
    console.log('='.repeat(70));
    console.log('Bu işlem mainnet\'teki TÜM liquidity pool\'ları keşfeder ve analiz eder.');
    console.log('Beklenen süre: 2-5 dakika');
    console.log('='.repeat(70) + '\n');
    // 1. Tüm pool'ları çek
    const pools = await fetchAllMainnetPools();
    if (pools.length === 0) {
        console.error('[Error] No pools found!');
        return;
    }
    // 2. Kaydet
    savePoolsToFile(pools);
    // 3. Analiz et
    const analytics = analyzeMainnetPools(pools);
    // 4. Raporları kaydet
    saveAnalyticsReport(analytics);
    saveTokenList(analytics);
    // 5. Konsol raporu
    printAnalyticsReport(analytics);
    console.log('\n✅ Discovery completed!');
    console.log('\nNext steps:');
    console.log('  1. Review: backend/data/all_mainnet_pools.json');
    console.log('  2. Review: backend/data/pool_analytics.json');
    console.log('  3. Review: backend/data/mainnet_tokens.json');
    console.log('  4. Use these files to configure testnet pool sync');
    return { pools, analytics };
}
// CLI
if (import.meta.url === `file://${process.argv[1]}`) {
    discoverAndAnalyze()
        .then(() => process.exit(0))
        .catch((error) => {
        console.error('[Fatal Error]', error);
        process.exit(1);
    });
}
