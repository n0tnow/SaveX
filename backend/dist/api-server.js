import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const app = express();
const PORT = process.env.PORT || 3001;
const DATA_DIR = path.join(__dirname, '../data');
// Middleware
app.use(cors());
app.use(express.json());
// Helper: Read JSON file
function readDataFile(filename) {
    const filepath = path.join(DATA_DIR, filename);
    if (!fs.existsSync(filepath)) {
        return null;
    }
    return JSON.parse(fs.readFileSync(filepath, 'utf-8'));
}
// ============================================================================
// API ENDPOINTS
// ============================================================================
// GET /api/health - Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        service: 'SaveX Shadow Pool API',
    });
});
// GET /api/pools - Get all selected pools
app.get('/api/pools', (req, res) => {
    const data = readDataFile('selected_pools_500.json');
    if (!data) {
        return res.status(404).json({ error: 'Pools not found. Run npm run select first.' });
    }
    const { limit = 100, offset = 0, category } = req.query;
    let pools = data.selectedPools;
    // Filter by category
    if (category && typeof category === 'string') {
        pools = pools.filter((p) => p.category === category);
    }
    // Pagination
    const start = parseInt(offset);
    const end = start + parseInt(limit);
    const paginatedPools = pools.slice(start, end);
    res.json({
        total: pools.length,
        limit: parseInt(limit),
        offset: start,
        pools: paginatedPools,
        statistics: data.statistics,
    });
});
// GET /api/pools/:id - Get specific pool
app.get('/api/pools/:id', (req, res) => {
    const data = readDataFile('selected_pools_500.json');
    if (!data) {
        return res.status(404).json({ error: 'Pools not found' });
    }
    const pool = data.selectedPools.find((p) => p.poolId === req.params.id);
    if (!pool) {
        return res.status(404).json({ error: 'Pool not found' });
    }
    res.json(pool);
});
// GET /api/testnet-pools - Get deployed testnet pools
app.get('/api/testnet-pools', (req, res) => {
    const data = readDataFile('deployed_testnet_pools.json');
    if (!data) {
        return res.status(404).json({ error: 'Testnet pools not found. Run npm run deploy first.' });
    }
    res.json(data);
});
// GET /api/arbitrage - Get arbitrage opportunities
app.get('/api/arbitrage', (req, res) => {
    const data = readDataFile('arbitrage_opportunities.json');
    if (!data) {
        return res.status(404).json({ error: 'Arbitrage data not found. Run npm run arbitrage first.' });
    }
    const { minProfit, confidence, limit = 50 } = req.query;
    let opportunities = data.opportunities;
    // Filter by minimum profit
    if (minProfit) {
        const minProfitNum = parseFloat(minProfit);
        opportunities = opportunities.filter((o) => o.profitPercent >= minProfitNum);
    }
    // Filter by confidence
    if (confidence && typeof confidence === 'string') {
        opportunities = opportunities.filter((o) => o.confidence === confidence);
    }
    // Limit results
    opportunities = opportunities.slice(0, parseInt(limit));
    res.json({
        total: data.totalOpportunities,
        filtered: opportunities.length,
        highConfidence: data.highConfidence,
        mediumConfidence: data.mediumConfidence,
        lowConfidence: data.lowConfidence,
        opportunities,
        timestamp: data.timestamp,
    });
});
// GET /api/prices - Get external prices
app.get('/api/prices', (req, res) => {
    const data = readDataFile('external_prices.json');
    if (!data) {
        return res.status(404).json({ error: 'Price data not found. Run npm run prices first.' });
    }
    const { symbols } = req.query;
    let prices = data.prices;
    // Filter by symbols
    if (symbols && typeof symbols === 'string') {
        const symbolList = symbols.split(',');
        const filtered = {};
        symbolList.forEach(symbol => {
            if (prices[symbol]) {
                filtered[symbol] = prices[symbol];
            }
        });
        prices = filtered;
    }
    res.json({
        timestamp: data.timestamp,
        totalTokens: data.totalTokens,
        prices,
    });
});
// GET /api/tokens - Get token list
app.get('/api/tokens', (req, res) => {
    const data = readDataFile('mainnet_tokens.json');
    if (!data) {
        return res.status(404).json({ error: 'Token data not found' });
    }
    const { limit = 100, minPools } = req.query;
    let tokens = data.tokens;
    // Filter by minimum pools
    if (minPools) {
        const minPoolsNum = parseInt(minPools);
        tokens = tokens.filter((t) => t.pools >= minPoolsNum);
    }
    // Limit results
    tokens = tokens.slice(0, parseInt(limit));
    res.json({
        total: data.total,
        filtered: tokens.length,
        tokens,
        lastUpdated: data.lastUpdated,
    });
});
// GET /api/stats - Get overall statistics
app.get('/api/stats', (req, res) => {
    const poolsData = readDataFile('selected_pools_500.json');
    const arbitrageData = readDataFile('arbitrage_opportunities.json');
    const pricesData = readDataFile('external_prices.json');
    const syncState = readDataFile('auto_sync_state.json');
    res.json({
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
    });
});
// POST /api/swap/simulate - Simulate a swap
app.post('/api/swap/simulate', (req, res) => {
    const { fromToken, toToken, amount } = req.body;
    if (!fromToken || !toToken || !amount) {
        return res.status(400).json({ error: 'Missing required fields: fromToken, toToken, amount' });
    }
    // Simple simulation (gerçek hesaplama için pool reserves kullanılmalı)
    const pricesData = readDataFile('external_prices.json');
    if (!pricesData || !pricesData.prices[fromToken] || !pricesData.prices[toToken]) {
        return res.status(404).json({ error: 'Price data not available for these tokens' });
    }
    const fromPrice = pricesData.prices[fromToken].price;
    const toPrice = pricesData.prices[toToken].price;
    const estimatedOutput = (parseFloat(amount) * fromPrice) / toPrice;
    const slippage = 0.5; // %0.5 slippage
    const minOutput = estimatedOutput * (1 - slippage / 100);
    res.json({
        fromToken,
        toToken,
        inputAmount: amount,
        estimatedOutput: estimatedOutput.toFixed(6),
        minimumOutput: minOutput.toFixed(6),
        priceImpact: slippage,
        route: [fromToken, toToken],
        timestamp: new Date().toISOString(),
    });
});
// ============================================================================
// START SERVER
// ============================================================================
app.listen(PORT, () => {
    console.log('\n🚀 SaveX Shadow Pool API Server');
    console.log('='.repeat(70));
    console.log(`   Port: ${PORT}`);
    console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`   Data Directory: ${DATA_DIR}`);
    console.log('='.repeat(70));
    console.log('\n📡 Available Endpoints:');
    console.log('   GET  /api/health');
    console.log('   GET  /api/pools');
    console.log('   GET  /api/pools/:id');
    console.log('   GET  /api/arbitrage');
    console.log('   GET  /api/prices');
    console.log('   GET  /api/tokens');
    console.log('   GET  /api/stats');
    console.log('   POST /api/swap/simulate');
    console.log('\n✅ Server is running!\n');
});
export default app;
