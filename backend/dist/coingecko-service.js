import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DATA_DIR = path.join(__dirname, '../data');
const COINGECKO_BASE_URL = 'https://api.coingecko.com/api/v3';
// Cache
const priceCache = new Map();
const CACHE_DURATION_MS = 60 * 1000; // 1 dakika
// Stellar token'larının CoinGecko ID mapping
const STELLAR_TO_COINGECKO = {
    'XLM': 'stellar',
    'USDC': 'usd-coin',
    'AQUA': 'aquarius',
    'yXLM': 'yxlm',
    'EURC': 'euro-coin',
    'XRP': 'ripple',
    'USDT': 'tether',
    'BTC': 'bitcoin',
    'ETH': 'ethereum',
    // Daha fazla eklenebilir
};
// Token fiyatı çek (cache ile)
export async function fetchTokenPrice(symbol) {
    // Cache kontrolü
    const cached = priceCache.get(symbol);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION_MS) {
        console.log(`[CoinGecko] Cache hit for ${symbol}`);
        return {
            symbol,
            price: cached.price,
            volume24h: 0,
            priceChange24h: 0,
            lastUpdated: new Date(cached.timestamp).toISOString(),
            source: 'coingecko',
        };
    }
    const coinId = STELLAR_TO_COINGECKO[symbol];
    if (!coinId) {
        console.log(`[CoinGecko] No mapping for ${symbol}`);
        return null;
    }
    try {
        const response = await axios.get(`${COINGECKO_BASE_URL}/simple/price`, {
            params: {
                ids: coinId,
                vs_currencies: 'usd',
                include_24hr_vol: true,
                include_24hr_change: true,
                include_market_cap: true,
            },
            timeout: 10000,
        });
        const data = response.data[coinId];
        if (!data) {
            console.log(`[CoinGecko] No data for ${symbol} (${coinId})`);
            return null;
        }
        const priceData = {
            symbol,
            price: data.usd || 0,
            volume24h: data.usd_24h_vol || 0,
            priceChange24h: data.usd_24h_change || 0,
            marketCap: data.usd_market_cap,
            lastUpdated: new Date().toISOString(),
            source: 'coingecko',
        };
        // Cache'e kaydet
        priceCache.set(symbol, { price: priceData.price, timestamp: Date.now() });
        console.log(`[CoinGecko] ✓ ${symbol}: $${priceData.price.toFixed(6)}`);
        return priceData;
    }
    catch (error) {
        console.error(`[CoinGecko] Error fetching ${symbol}:`, error.message);
        return null;
    }
}
// Birden fazla token fiyatı çek (batch)
export async function fetchMultipleTokens(symbols) {
    console.log(`[CoinGecko] Fetching prices for ${symbols.length} tokens...`);
    const results = {};
    const coinIds = symbols
        .map(s => STELLAR_TO_COINGECKO[s])
        .filter(Boolean);
    if (coinIds.length === 0) {
        console.log('[CoinGecko] No valid coin IDs found');
        return results;
    }
    try {
        const response = await axios.get(`${COINGECKO_BASE_URL}/simple/price`, {
            params: {
                ids: coinIds.join(','),
                vs_currencies: 'usd',
                include_24hr_vol: true,
                include_24hr_change: true,
                include_market_cap: true,
            },
            timeout: 15000,
        });
        for (const symbol of symbols) {
            const coinId = STELLAR_TO_COINGECKO[symbol];
            if (!coinId)
                continue;
            const data = response.data[coinId];
            if (!data)
                continue;
            const priceData = {
                symbol,
                price: data.usd || 0,
                volume24h: data.usd_24h_vol || 0,
                priceChange24h: data.usd_24h_change || 0,
                marketCap: data.usd_market_cap,
                lastUpdated: new Date().toISOString(),
                source: 'coingecko',
            };
            results[symbol] = priceData;
            priceCache.set(symbol, { price: priceData.price, timestamp: Date.now() });
        }
        console.log(`[CoinGecko] ✓ Fetched ${Object.keys(results).length} prices`);
        return results;
    }
    catch (error) {
        console.error('[CoinGecko] Batch fetch error:', error.message);
        return results;
    }
}
// Mainnet pool fiyatını hesapla
function calculatePoolPrice(reserves) {
    if (!reserves || reserves.length !== 2)
        return 0;
    const amount1 = parseFloat(reserves[0].amount || '0');
    const amount2 = parseFloat(reserves[1].amount || '0');
    if (amount1 === 0 || amount2 === 0)
        return 0;
    // Token2/Token1 fiyatı
    return amount2 / amount1;
}
export async function compareWithMainnet(poolData) {
    const mainnetPrice = calculatePoolPrice(poolData.reserves);
    if (mainnetPrice === 0)
        return null;
    // Pair'den token'ları çıkar (örn: "XLM/USDC" -> ["XLM", "USDC"])
    const tokens = poolData.pairName.split('/');
    if (tokens.length !== 2)
        return null;
    // External fiyatları çek
    const prices = await fetchMultipleTokens(tokens);
    const price1 = prices[tokens[0]]?.price || 0;
    const price2 = prices[tokens[1]]?.price || 0;
    if (price1 === 0 || price2 === 0)
        return null;
    const externalPrice = price2 / price1;
    const priceDifference = Math.abs(mainnetPrice - externalPrice);
    const percentDifference = (priceDifference / mainnetPrice) * 100;
    return {
        pairName: poolData.pairName,
        mainnetPrice,
        externalPrice,
        priceDifference,
        percentDifference,
        mainnetSource: 'pool',
        externalSource: 'coingecko',
        timestamp: new Date().toISOString(),
    };
}
// Seçilen pool'lar için fiyat verisi topla
export async function fetchPricesForSelectedPools() {
    console.log('[CoinGecko] Loading selected pools...');
    const selectedPath = path.join(DATA_DIR, 'selected_pools_500.json');
    if (!fs.existsSync(selectedPath)) {
        throw new Error('Selected pools not found. Run pool-selector.ts first.');
    }
    const data = JSON.parse(fs.readFileSync(selectedPath, 'utf-8'));
    const pools = data.selectedPools;
    // Unique token'ları çıkar
    const uniqueTokens = new Set();
    for (const pool of pools) {
        const tokens = pool.pairName.split('/');
        tokens.forEach((t) => uniqueTokens.add(t));
    }
    const tokenList = Array.from(uniqueTokens);
    console.log(`[CoinGecko] Found ${tokenList.length} unique tokens`);
    // CoinGecko'da olan token'ları filtrele
    const supportedTokens = tokenList.filter(t => STELLAR_TO_COINGECKO[t]);
    console.log(`[CoinGecko] ${supportedTokens.length} tokens supported by CoinGecko`);
    // Fiyatları çek (rate limiting için batch'ler halinde)
    const batchSize = 50;
    const allPrices = {};
    for (let i = 0; i < supportedTokens.length; i += batchSize) {
        const batch = supportedTokens.slice(i, i + batchSize);
        console.log(`[CoinGecko] Fetching batch ${Math.floor(i / batchSize) + 1}...`);
        const batchPrices = await fetchMultipleTokens(batch);
        Object.assign(allPrices, batchPrices);
        // Rate limiting için bekle
        if (i + batchSize < supportedTokens.length) {
            await new Promise(resolve => setTimeout(resolve, 1500));
        }
    }
    // Kaydet
    const outputPath = path.join(DATA_DIR, 'external_prices.json');
    fs.writeFileSync(outputPath, JSON.stringify({
        timestamp: new Date().toISOString(),
        totalTokens: Object.keys(allPrices).length,
        prices: allPrices,
    }, null, 2));
    console.log(`\n[CoinGecko] ✓ Saved ${Object.keys(allPrices).length} prices to: ${outputPath}`);
    return allPrices;
}
// CLI
if (import.meta.url === `file://${process.argv[1]}`) {
    fetchPricesForSelectedPools()
        .then(prices => {
        console.log('\n✅ CoinGecko price fetch completed!');
        console.log(`   Total prices: ${Object.keys(prices).length}`);
        process.exit(0);
    })
        .catch(error => {
        console.error('[Fatal Error]', error);
        process.exit(1);
    });
}
