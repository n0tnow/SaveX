#!/usr/bin/env tsx
import * as StellarSDK from '@stellar/stellar-sdk';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TESTNET_HORIZON = 'https://horizon-testnet.stellar.org';
const server = new StellarSDK.Horizon.Server(TESTNET_HORIZON);
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
async function deployPoolsWithMainnetRatios(limit = 20) {
    console.log('\n🚀 Deploying Testnet Pools with Mainnet Ratios\n');
    console.log('='.repeat(70));
    const env = loadEnv();
    const sourceKeypair = await getTestnetAccount(env.TESTNET_SECRET_KEY);
    const publicKey = sourceKeypair.publicKey();
    console.log(`Source Account: ${publicKey}\n`);
    // Load mainnet pools
    const mainnetPoolsPath = path.join(__dirname, '../data/mainnet_pools.json');
    const mainnetData = JSON.parse(fs.readFileSync(mainnetPoolsPath, 'utf-8'));
    const mainnetPools = mainnetData.pools.slice(0, limit);
    console.log(`Deploying ${mainnetPools.length} pools...\n`);
    const deployedPools = [];
    const deployedTokens = new Map();
    for (let i = 0; i < mainnetPools.length; i++) {
        const pool = mainnetPools[i];
        console.log(`[${i + 1}/${mainnetPools.length}] ${pool.pairName}`);
        try {
            // Create assets
            const assetA = pool.tokenA.type === 'native'
                ? StellarSDK.Asset.native()
                : new StellarSDK.Asset(pool.tokenA.code, publicKey); // Use our account as issuer
            const assetB = pool.tokenB.type === 'native'
                ? StellarSDK.Asset.native()
                : new StellarSDK.Asset(pool.tokenB.code, publicKey);
            // Calculate pool ID
            const poolId = StellarSDK.getLiquidityPoolId('constant_product', {
                assetA,
                assetB,
                fee: StellarSDK.LiquidityPoolFeeV18
            }).toString('hex');
            // Load account
            const account = await server.loadAccount(publicKey);
            // Build transaction
            const txBuilder = new StellarSDK.TransactionBuilder(account, {
                fee: StellarSDK.BASE_FEE,
                networkPassphrase: StellarSDK.Networks.TESTNET
            });
            // Note: Issuer doesn't need trustlines for their own tokens
            // Only need to trust the liquidity pool
            // Trust the liquidity pool
            txBuilder.addOperation(StellarSDK.Operation.changeTrust({
                asset: new StellarSDK.LiquidityPoolAsset(assetA, assetB, StellarSDK.LiquidityPoolFeeV18)
            }));
            // Calculate scaled amounts maintaining mainnet ratio
            // Use HIGH liquidity to minimize slippage
            const reserveA = parseFloat(pool.reserveA);
            const reserveB = parseFloat(pool.reserveB);
            const ratio = reserveB / reserveA;
            // Start with HIGH base amount for good liquidity
            const BASE_LIQUIDITY = 100000; // 100k tokens for good depth
            let scaledAmountA = BASE_LIQUIDITY;
            let scaledAmountB = scaledAmountA * ratio;
            // Cap at 1M to avoid issues
            const MAX_AMOUNT = 1000000;
            const MIN_AMOUNT = 1; // Minimum 1 token
            if (scaledAmountB > MAX_AMOUNT) {
                scaledAmountB = MAX_AMOUNT;
                scaledAmountA = scaledAmountB / ratio;
            }
            if (scaledAmountA > MAX_AMOUNT) {
                scaledAmountA = MAX_AMOUNT;
                scaledAmountB = scaledAmountA * ratio;
            }
            // Skip if either amount is too small
            if (scaledAmountA < MIN_AMOUNT || scaledAmountB < MIN_AMOUNT) {
                console.log(`  ⏭️  Skipping - amounts too small: ${scaledAmountA.toExponential(2)} / ${scaledAmountB.toExponential(2)}`);
                continue;
            }
            console.log(`  Mainnet ratio: 1 ${pool.tokenA.code} = ${ratio.toExponential(2)} ${pool.tokenB.code}`);
            console.log(`  Testnet liquidity: ${scaledAmountA.toExponential(2)} ${pool.tokenA.code} / ${scaledAmountB.toExponential(2)} ${pool.tokenB.code}`);
            // Simple price range - very permissive
            // Price = B/A
            const depositRatio = scaledAmountB / scaledAmountA;
            // Use simple fraction: just multiply ratio by 1000 for precision
            let priceN = Math.round(depositRatio * 1000);
            let priceD = 1000;
            // Very wide range to avoid op_bad_price
            const minN = 1;
            const maxN = 2000000000; // Max i32
            console.log(`  Price: ${priceN}/${priceD} (range: ${minN}/${priceD} to ${maxN}/${priceD})`);
            // Deposit liquidity
            txBuilder.addOperation(StellarSDK.Operation.liquidityPoolDeposit({
                liquidityPoolId: poolId,
                maxAmountA: scaledAmountA.toFixed(7),
                maxAmountB: scaledAmountB.toFixed(7),
                minPrice: { n: minN, d: priceD },
                maxPrice: { n: maxN, d: priceD }
            }));
            const tx = txBuilder.setTimeout(180).build();
            tx.sign(sourceKeypair);
            const result = await server.submitTransaction(tx);
            console.log(`  ✓ Pool created: ${poolId.substring(0, 8)}...`);
            console.log(`  ✓ Ratio: 1 ${pool.tokenA.code} = ${ratio.toFixed(6)} ${pool.tokenB.code}`);
            deployedPools.push({
                pairName: pool.pairName,
                poolId: poolId,
                tokenA: {
                    symbol: pool.tokenA.code,
                    code: pool.tokenA.code,
                    issuer: pool.tokenA.type === 'native' ? undefined : publicKey,
                    type: pool.tokenA.type,
                    amount: scaledAmountA.toFixed(7)
                },
                tokenB: {
                    symbol: pool.tokenB.code,
                    code: pool.tokenB.code,
                    issuer: pool.tokenB.type === 'native' ? undefined : publicKey,
                    type: pool.tokenB.type,
                    amount: scaledAmountB.toFixed(7)
                },
                liquidityPoolId: poolId,
                mainnetRatio: ratio,
                mainnetPoolId: pool.poolId,
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
    const outputPath = path.join(__dirname, '../data/testnet_pools_with_mainnet_ratios.json');
    const outputData = {
        timestamp: new Date().toISOString(),
        totalDeployed: deployedPools.length,
        totalTokens: deployedTokens.size,
        sourceAccount: publicKey,
        pools: deployedPools
    };
    fs.writeFileSync(outputPath, JSON.stringify(outputData, null, 2));
    console.log('\n' + '='.repeat(70));
    console.log(`✅ Deployed ${deployedPools.length} pools with mainnet ratios`);
    console.log(`✅ Saved to: ${outputPath}\n`);
}
// Run
const poolCount = parseInt(process.argv[2] || '20');
deployPoolsWithMainnetRatios(poolCount).catch(console.error);
