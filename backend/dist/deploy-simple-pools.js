#!/usr/bin/env tsx
import * as StellarSDK from '@stellar/stellar-sdk';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TESTNET_HORIZON = 'https://horizon-testnet.stellar.org';
const server = new StellarSDK.Horizon.Server(TESTNET_HORIZON);
// Popular trading pairs with realistic prices (as of Nov 2025)
const POPULAR_PAIRS = [
    // XLM pairs
    { tokenA: 'XLM', tokenB: 'USDC', price: 0.12 }, // 1 XLM = $0.12
    { tokenA: 'XLM', tokenB: 'USDT', price: 0.12 }, // 1 XLM = $0.12
    { tokenA: 'XLM', tokenB: 'BTC', price: 0.0000013 }, // 1 XLM = 0.0000013 BTC
    { tokenA: 'XLM', tokenB: 'ETH', price: 0.000035 }, // 1 XLM = 0.000035 ETH
    { tokenA: 'XLM', tokenB: 'AQUA', price: 10 }, // 1 XLM = 10 AQUA
    { tokenA: 'XLM', tokenB: 'yXLM', price: 1 }, // 1 XLM = 1 yXLM
    { tokenA: 'XLM', tokenB: 'MOBI', price: 0.5 }, // 1 XLM = 0.5 MOBI
    // Stablecoin pairs
    { tokenA: 'USDC', tokenB: 'USDT', price: 1 }, // 1 USDC = 1 USDT
    // AQUA pairs
    { tokenA: 'AQUA', tokenB: 'USDC', price: 0.012 }, // 1 AQUA = $0.012
    { tokenA: 'AQUA', tokenB: 'yXLM', price: 0.1 }, // 1 AQUA = 0.1 yXLM
    // yXLM pairs
    { tokenA: 'yXLM', tokenB: 'USDC', price: 0.12 }, // 1 yXLM = $0.12
    // MOBI pairs
    { tokenA: 'MOBI', tokenB: 'USDC', price: 0.24 }, // 1 MOBI = $0.24
    { tokenA: 'MOBI', tokenB: 'AQUA', price: 20 }, // 1 MOBI = 20 AQUA
    // Additional popular tokens
    { tokenA: 'XLM', tokenB: 'TERN', price: 50 }, // 1 XLM = 50 TERN
    { tokenA: 'XLM', tokenB: 'RIO', price: 2 }, // 1 XLM = 2 RIO
    { tokenA: 'TERN', tokenB: 'USDC', price: 0.0024 }, // 1 TERN = $0.0024
    { tokenA: 'RIO', tokenB: 'USDC', price: 0.06 }, // 1 RIO = $0.06
    // Cross pairs for arbitrage
    { tokenA: 'AQUA', tokenB: 'TERN', price: 5 }, // 1 AQUA = 5 TERN
    { tokenA: 'MOBI', tokenB: 'yXLM', price: 2 }, // 1 MOBI = 2 yXLM
    { tokenA: 'RIO', tokenB: 'AQUA', price: 5 }, // 1 RIO = 5 AQUA
];
// Load environment
function loadEnv() {
    let envPath = path.join(__dirname, '../.env');
    if (!fs.existsSync(envPath)) {
        envPath = path.join(__dirname, '../.env.local');
    }
    if (!fs.existsSync(envPath)) {
        throw new Error('.env or .env.local file not found');
    }
    const envContent = fs.readFileSync(envPath, 'utf-8');
    const lines = envContent.split('\n');
    const env = {};
    for (const line of lines) {
        if (line.trim() && !line.startsWith('#')) {
            const [key, ...valueParts] = line.split('=');
            env[key.trim()] = valueParts.join('=').trim();
        }
    }
    return env;
}
async function getTestnetAccount(secretKey) {
    if (secretKey && secretKey !== 'your_testnet_secret_key_here') {
        return StellarSDK.Keypair.fromSecret(secretKey);
    }
    const keypair = StellarSDK.Keypair.random();
    console.log('[Testnet] Generated new keypair:');
    console.log(`   Public Key: ${keypair.publicKey()}`);
    console.log(`   Secret Key: ${keypair.secret()}`);
    console.log('\n⚠️  Save this secret key to .env.local!\n');
    console.log('[Testnet] Funding account from friendbot...');
    try {
        await fetch(`https://friendbot.stellar.org?addr=${keypair.publicKey()}`);
        console.log('[Testnet] ✓ Account funded\n');
    }
    catch (error) {
        console.error('[Testnet] Friendbot error:', error);
    }
    return keypair;
}
async function deploySimplePools() {
    console.log('\n🚀 Deploying Simple Testnet Pools with Realistic Prices\n');
    console.log('='.repeat(70));
    const env = loadEnv();
    const sourceKeypair = await getTestnetAccount(env.TESTNET_SECRET_KEY);
    const publicKey = sourceKeypair.publicKey();
    console.log(`Source Account: ${publicKey}\n`);
    console.log(`Deploying ${POPULAR_PAIRS.length} popular trading pairs...\n`);
    const deployedPools = [];
    for (let i = 0; i < POPULAR_PAIRS.length; i++) {
        const pair = POPULAR_PAIRS[i];
        console.log(`[${i + 1}/${POPULAR_PAIRS.length}] ${pair.tokenA}/${pair.tokenB}`);
        try {
            // Create assets (we are the issuer for all non-native)
            const assetA = pair.tokenA === 'XLM'
                ? StellarSDK.Asset.native()
                : new StellarSDK.Asset(pair.tokenA, publicKey);
            const assetB = pair.tokenB === 'XLM'
                ? StellarSDK.Asset.native()
                : new StellarSDK.Asset(pair.tokenB, publicKey);
            // Calculate pool ID
            const poolId = StellarSDK.getLiquidityPoolId('constant_product', { assetA, assetB, fee: StellarSDK.LiquidityPoolFeeV18 }).toString('hex');
            // Load account
            const account = await server.loadAccount(publicKey);
            // High liquidity amounts (but within Friendbot limits)
            const liquidityA = 1000; // 1k of token A (Friendbot gives 10k XLM)
            const liquidityB = liquidityA * pair.price; // Maintain price ratio
            console.log(`  Price: 1 ${pair.tokenA} = ${pair.price} ${pair.tokenB}`);
            console.log(`  Liquidity: ${liquidityA} ${pair.tokenA} / ${liquidityB} ${pair.tokenB}`);
            // Build transaction
            const txBuilder = new StellarSDK.TransactionBuilder(account, {
                fee: StellarSDK.BASE_FEE,
                networkPassphrase: StellarSDK.Networks.TESTNET
            });
            // Trust the liquidity pool
            txBuilder.addOperation(StellarSDK.Operation.changeTrust({
                asset: new StellarSDK.LiquidityPoolAsset(assetA, assetB, StellarSDK.LiquidityPoolFeeV18)
            }));
            // Deposit liquidity - use very wide price range
            txBuilder.addOperation(StellarSDK.Operation.liquidityPoolDeposit({
                liquidityPoolId: poolId,
                maxAmountA: liquidityA.toFixed(7),
                maxAmountB: liquidityB.toFixed(7),
                minPrice: { n: 1, d: 1000000 }, // Very permissive
                maxPrice: { n: 1000000, d: 1 }
            }));
            const tx = txBuilder.setTimeout(180).build();
            tx.sign(sourceKeypair);
            const result = await server.submitTransaction(tx);
            console.log(`  ✓ Pool created: ${poolId.substring(0, 8)}...`);
            console.log(`  ✓ Transaction: ${result.hash}\n`);
            deployedPools.push({
                pairName: `${pair.tokenA}/${pair.tokenB}`,
                poolId: poolId,
                tokenA: {
                    symbol: pair.tokenA,
                    code: pair.tokenA,
                    issuer: pair.tokenA === 'XLM' ? undefined : publicKey,
                    type: pair.tokenA === 'XLM' ? 'native' : 'credit_alphanum4',
                    amount: liquidityA.toFixed(7)
                },
                tokenB: {
                    symbol: pair.tokenB,
                    code: pair.tokenB,
                    issuer: pair.tokenB === 'XLM' ? undefined : publicKey,
                    type: pair.tokenB === 'XLM' ? 'native' : 'credit_alphanum4',
                    amount: liquidityB.toFixed(7)
                },
                liquidityPoolId: poolId,
                price: pair.price,
                createdAt: new Date().toISOString()
            });
        }
        catch (error) {
            console.error(`  ❌ Error: ${error.message}`);
            if (error.response?.data?.extras) {
                console.error(`  Details:`, JSON.stringify(error.response.data.extras.result_codes, null, 2));
            }
        }
    }
    // Save deployed pools
    const outputPath = path.join(__dirname, '../data/simple_testnet_pools.json');
    const outputData = {
        timestamp: new Date().toISOString(),
        totalDeployed: deployedPools.length,
        sourceAccount: publicKey,
        pools: deployedPools
    };
    fs.writeFileSync(outputPath, JSON.stringify(outputData, null, 2));
    console.log('='.repeat(70));
    console.log(`✅ Deployed ${deployedPools.length} pools with realistic prices`);
    console.log(`✅ Saved to: ${outputPath}\n`);
}
// Run
deploySimplePools().catch(console.error);
