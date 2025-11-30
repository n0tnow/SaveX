import * as StellarSDK from '@stellar/stellar-sdk';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DATA_DIR = path.join(__dirname, '../data');
// Testnet configuration
const HORIZON_TESTNET = 'https://horizon-testnet.stellar.org';
const NETWORK_PASSPHRASE = StellarSDK.Networks.TESTNET;
// Load environment
function loadEnv() {
    const envPath = path.join(__dirname, '../.env.local');
    if (!fs.existsSync(envPath)) {
        throw new Error('.env.local not found. Please create it with TESTNET_SECRET_KEY');
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
// Create or load testnet account
async function getTestnetAccount(secretKey) {
    if (secretKey && secretKey !== 'your_testnet_secret_key_here') {
        return StellarSDK.Keypair.fromSecret(secretKey);
    }
    // Generate new keypair
    const keypair = StellarSDK.Keypair.random();
    console.log('[Testnet] Generated new keypair:');
    console.log(`   Public Key: ${keypair.publicKey()}`);
    console.log(`   Secret Key: ${keypair.secret()}`);
    console.log('\n⚠️  Save this secret key to .env.local!');
    // Fund from friendbot
    console.log('[Testnet] Funding account from friendbot...');
    try {
        await fetch(`https://friendbot.stellar.org?addr=${keypair.publicKey()}`);
        console.log('[Testnet] ✓ Account funded');
    }
    catch (error) {
        console.error('[Testnet] Friendbot error:', error);
    }
    return keypair;
}
// Create custom asset (Classic Stellar Asset, not Soroban)
async function createCustomAsset(server, issuer, assetCode) {
    console.log(`[Token] Creating asset: ${assetCode}`);
    // Stellar Classic Asset
    const asset = new StellarSDK.Asset(assetCode, issuer.publicKey());
    console.log(`[Token] ✓ Asset created: ${assetCode}:${issuer.publicKey().substring(0, 8)}...`);
    return asset;
}
// Create liquidity pool
async function createLiquidityPool(server, source, assetA, assetB, amountA, amountB) {
    console.log(`[Pool] Creating liquidity pool: ${assetA.code}/${assetB.code}`);
    try {
        const account = await server.loadAccount(source.publicKey());
        // Get liquidity pool ID using static function with object params
        const poolId = StellarSDK.getLiquidityPoolId('constant_product', {
            assetA,
            assetB,
            fee: StellarSDK.LiquidityPoolFeeV18
        }).toString('hex');
        // Liquidity pool asset for trustline
        const liquidityPoolAsset = new StellarSDK.LiquidityPoolAsset(assetA, assetB, StellarSDK.LiquidityPoolFeeV18);
        const transaction = new StellarSDK.TransactionBuilder(account, {
            fee: StellarSDK.BASE_FEE,
            networkPassphrase: NETWORK_PASSPHRASE,
        })
            .addOperation(StellarSDK.Operation.changeTrust({
            asset: liquidityPoolAsset,
        }))
            .addOperation(StellarSDK.Operation.liquidityPoolDeposit({
            liquidityPoolId: poolId,
            maxAmountA: amountA,
            maxAmountB: amountB,
            minPrice: { n: 1, d: 1 },
            maxPrice: { n: 1, d: 1 },
        }))
            .setTimeout(180)
            .build();
        transaction.sign(source);
        const result = await server.submitTransaction(transaction);
        console.log(`[Pool] ✓ Pool created: ${poolId}`);
        return poolId;
    }
    catch (error) {
        console.error(`[Pool] Error creating pool:`, error.message);
        throw error;
    }
}
// Deploy top N pools
export async function deployTopPools(count = 10) {
    console.log('\n🚀 SaveX Testnet Pool Deployment');
    console.log('='.repeat(70));
    console.log(`   Deploying top ${count} pools to testnet`);
    console.log('='.repeat(70) + '\n');
    // Load environment
    const env = loadEnv();
    const server = new StellarSDK.Horizon.Server(HORIZON_TESTNET);
    // Get testnet account
    const sourceKeypair = await getTestnetAccount(env.TESTNET_SECRET_KEY);
    console.log(`[Testnet] Using account: ${sourceKeypair.publicKey()}\n`);
    // Load selected pools
    const poolsPath = path.join(DATA_DIR, 'selected_pools_500.json');
    if (!fs.existsSync(poolsPath)) {
        throw new Error('Selected pools not found');
    }
    const poolsData = JSON.parse(fs.readFileSync(poolsPath, 'utf-8'));
    const topPools = poolsData.selectedPools.slice(0, count);
    console.log(`[Deploy] Loaded ${topPools.length} pools to deploy\n`);
    const deployedPools = [];
    const deployedTokens = new Map();
    for (let i = 0; i < topPools.length; i++) {
        const pool = topPools[i];
        console.log(`\n[${i + 1}/${topPools.length}] Deploying: ${pool.pairName}`);
        try {
            const tokens = pool.pairName.split('/');
            const [tokenACode, tokenBCode] = tokens;
            // Create or reuse assets
            let assetA;
            let assetB;
            if (tokenACode === 'XLM') {
                assetA = StellarSDK.Asset.native();
            }
            else {
                if (!deployedTokens.has(tokenACode)) {
                    const asset = await createCustomAsset(server, sourceKeypair, tokenACode);
                    deployedTokens.set(tokenACode, {
                        symbol: tokenACode,
                        issuer: sourceKeypair.publicKey(),
                        code: tokenACode,
                        deployedAt: new Date().toISOString(),
                        testnetAddress: sourceKeypair.publicKey(),
                    });
                }
                assetA = new StellarSDK.Asset(tokenACode, sourceKeypair.publicKey());
            }
            if (tokenBCode === 'XLM') {
                assetB = StellarSDK.Asset.native();
            }
            else {
                if (!deployedTokens.has(tokenBCode)) {
                    const asset = await createCustomAsset(server, sourceKeypair, tokenBCode);
                    deployedTokens.set(tokenBCode, {
                        symbol: tokenBCode,
                        issuer: sourceKeypair.publicKey(),
                        code: tokenBCode,
                        deployedAt: new Date().toISOString(),
                        testnetAddress: sourceKeypair.publicKey(),
                    });
                }
                assetB = new StellarSDK.Asset(tokenBCode, sourceKeypair.publicKey());
            }
            // Create liquidity pool
            const poolId = await createLiquidityPool(server, sourceKeypair, assetA, assetB, '1000', '1000');
            deployedPools.push({
                pairName: pool.pairName,
                poolId: pool.poolId,
                tokenA: deployedTokens.get(tokenACode) || {
                    symbol: 'XLM',
                    issuer: 'native',
                    code: 'XLM',
                    deployedAt: new Date().toISOString(),
                    testnetAddress: 'native',
                },
                tokenB: deployedTokens.get(tokenBCode) || {
                    symbol: 'XLM',
                    issuer: 'native',
                    code: 'XLM',
                    deployedAt: new Date().toISOString(),
                    testnetAddress: 'native',
                },
                liquidityPoolId: poolId,
                createdAt: new Date().toISOString(),
            });
            // Rate limiting
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
        catch (error) {
            console.error(`[Deploy] Failed to deploy ${pool.pairName}:`, error.message);
        }
    }
    // Save deployment state
    const outputPath = path.join(DATA_DIR, 'deployed_testnet_pools.json');
    fs.writeFileSync(outputPath, JSON.stringify({
        timestamp: new Date().toISOString(),
        totalDeployed: deployedPools.length,
        totalTokens: deployedTokens.size,
        sourceAccount: sourceKeypair.publicKey(),
        pools: deployedPools,
        tokens: Array.from(deployedTokens.values()),
    }, null, 2));
    console.log('\n' + '='.repeat(70));
    console.log('✅ Deployment completed!');
    console.log(`   Pools deployed: ${deployedPools.length}`);
    console.log(`   Tokens created: ${deployedTokens.size}`);
    console.log(`   Saved to: ${outputPath}`);
    console.log('='.repeat(70) + '\n');
    return deployedPools;
}
// CLI
if (import.meta.url === `file://${process.argv[1]}`) {
    const count = parseInt(process.argv[2] || '10', 10);
    deployTopPools(count)
        .then(() => {
        console.log('\n✅ Testnet deployment completed successfully!');
        process.exit(0);
    })
        .catch(error => {
        console.error('[Fatal Error]', error);
        process.exit(1);
    });
}
