#!/usr/bin/env tsx

import * as StellarSDK from '@stellar/stellar-sdk';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TESTNET_HORIZON = 'https://horizon-testnet.stellar.org';
const server = new StellarSDK.Horizon.Server(TESTNET_HORIZON);

// Load environment variables from .env file
function loadEnv(): Record<string, string> {
    let envPath = path.join(__dirname, '../.env');
    if (!fs.existsSync(envPath)) {
        envPath = path.join(__dirname, '../.env.local');
    }
    if (!fs.existsSync(envPath)) {
        throw new Error('.env or .env.local file not found');
    }

    const envContent = fs.readFileSync(envPath, 'utf-8');
    const lines = envContent.split('\n');
    const env: Record<string, string> = {};

    for (const line of lines) {
        if (line.trim() && !line.startsWith('#')) {
            const [key, ...valueParts] = line.split('=');
            env[key.trim()] = valueParts.join('=').trim();
        }
    }

    return env;
}

// Create or load testnet account
async function getTestnetAccount(secretKey?: string): Promise<StellarSDK.Keypair> {
    if (secretKey && secretKey !== 'your_testnet_secret_key_here') {
        return StellarSDK.Keypair.fromSecret(secretKey);
    }

    // Check deployed pools for existing account
    const deployedPoolsPath = path.join(__dirname, '../data/deployed_testnet_pools.json');
    if (fs.existsSync(deployedPoolsPath)) {
        const deployedData = JSON.parse(fs.readFileSync(deployedPoolsPath, 'utf-8'));
        if (deployedData.sourceAccount) {
            console.log(`\n⚠️  Using existing source account from deployed pools: ${deployedData.sourceAccount}`);
            console.log('⚠️  If you have the secret key, add it to .env.local as TESTNET_SECRET_KEY\n');

            // Try to use the same account - but we don't have the secret key
            // So we'll generate a new one
        }
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
        console.log('[Testnet] ✓ Account funded\n');
    } catch (error) {
        console.error('[Testnet] Friendbot error:', error);
    }

    return keypair;
}

async function deployXLMPool() {
    console.log('\n🚀 Deploying Native XLM/AQUA Pool to Testnet\n');
    console.log('='.repeat(70));

    // Load environment
    const env = loadEnv();
    const sourceKeypair = await getTestnetAccount(env.TESTNET_SECRET_KEY);
    const publicKey = sourceKeypair.publicKey();

    console.log(`Source Account: ${publicKey}\n`);

    // Load existing deployed pools to get AQUA issuer
    const deployedPoolsPath = path.join(__dirname, '../data/deployed_testnet_pools.json');
    const deployedData = JSON.parse(fs.readFileSync(deployedPoolsPath, 'utf-8'));

    // Find AQUA token
    let aquaIssuer: string | null = null;
    for (const pool of deployedData.pools) {
        if (pool.tokenA?.code === 'AQUA') {
            aquaIssuer = pool.tokenA.issuer;
            break;
        }
        if (pool.tokenB?.code === 'AQUA') {
            aquaIssuer = pool.tokenB.issuer;
            break;
        }
    }

    if (!aquaIssuer) {
        throw new Error('AQUA token not found in deployed pools');
    }

    console.log(`✓ Found AQUA issuer: ${aquaIssuer}\n`);

    // Create assets
    const xlmAsset = StellarSDK.Asset.native();
    const aquaAsset = new StellarSDK.Asset('AQUA', aquaIssuer);

    // Calculate pool ID
    const poolId = StellarSDK.getLiquidityPoolId(
        'constant_product',
        {
            assetA: xlmAsset,
            assetB: aquaAsset,
            fee: StellarSDK.LiquidityPoolFeeV18
        }
    ).toString('hex');

    console.log(`Pool ID: ${poolId}\n`);

    // Load account
    const account = await server.loadAccount(publicKey);

    // Build transaction - just create pool trustline, no deposit
    // User will deposit from their own account later
    const transaction = new StellarSDK.TransactionBuilder(account, {
        fee: StellarSDK.BASE_FEE,
        networkPassphrase: StellarSDK.Networks.TESTNET
    })
        // First, trust AQUA token
        .addOperation(StellarSDK.Operation.changeTrust({
            asset: aquaAsset
        }))
        // Trust the liquidity pool (this creates the pool)
        .addOperation(StellarSDK.Operation.changeTrust({
            asset: new StellarSDK.LiquidityPoolAsset(
                xlmAsset,
                aquaAsset,
                StellarSDK.LiquidityPoolFeeV18
            )
        }))
        .setTimeout(180)
        .build();

    console.log('Note: Pool will be created but empty. Users can deposit liquidity later.\\n');

    // Sign and submit
    transaction.sign(sourceKeypair);

    console.log('Submitting transaction...\n');

    try {
        const result = await server.submitTransaction(transaction);
        console.log('✅ Pool created successfully!');
        console.log(`Transaction Hash: ${result.hash}\n`);

        // Update deployed pools file
        const newPool = {
            pairName: 'XLM/AQUA',
            poolId: poolId,
            tokenA: {
                symbol: 'XLM',
                code: 'XLM',
                type: 'native'
            },
            tokenB: {
                symbol: 'AQUA',
                issuer: aquaIssuer,
                code: 'AQUA',
                deployedAt: new Date().toISOString(),
                testnetAddress: aquaIssuer
            },
            liquidityPoolId: poolId,
            createdAt: new Date().toISOString(),
            isNativeXLM: true
        };

        deployedData.pools.unshift(newPool); // Add to beginning
        deployedData.totalDeployed += 1;
        deployedData.timestamp = new Date().toISOString();

        fs.writeFileSync(deployedPoolsPath, JSON.stringify(deployedData, null, 2));

        console.log('✅ Updated deployed_testnet_pools.json\n');
        console.log('='.repeat(70));
        console.log('🎉 Native XLM pool is now available for swapping!\n');

    } catch (error: any) {
        console.error('❌ Error creating pool:', error);
        if (error.response?.data?.extras) {
            console.error('Details:', JSON.stringify(error.response.data.extras, null, 2));
        }
        throw error;
    }
}

// Run
deployXLMPool().catch(console.error);
