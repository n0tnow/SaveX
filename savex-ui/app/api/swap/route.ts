import { NextResponse } from 'next/server';
import * as StellarSDK from '@stellar/stellar-sdk';
import * as fs from 'fs';
import * as path from 'path';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { sourceAsset, destAsset, amount, userAddress } = body;

        if (!sourceAsset || !destAsset || !amount || !userAddress) {
            return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
        }

        // Create assets
        const source = sourceAsset.type === 'native' || sourceAsset.code === 'XLM'
            ? StellarSDK.Asset.native()
            : new StellarSDK.Asset(sourceAsset.code, sourceAsset.issuer);

        const dest = destAsset.type === 'native' || destAsset.code === 'XLM'
            ? StellarSDK.Asset.native()
            : new StellarSDK.Asset(destAsset.code, destAsset.issuer);

        // Load account sequence and balances
        const server = new StellarSDK.Horizon.Server('https://horizon-testnet.stellar.org');
        let account;
        try {
            account = await server.loadAccount(userAddress);
        } catch (e) {
            return NextResponse.json({ error: 'Account not found on testnet. Please fund it with Friendbot.' }, { status: 404 });
        }

        const txBuilder = new StellarSDK.TransactionBuilder(account, {
            fee: StellarSDK.BASE_FEE,
            networkPassphrase: StellarSDK.Networks.TESTNET,
        });

        // IMPORTANT: Add trustlines FIRST, before any swap operations
        // Stellar processes operations sequentially, so trustline will be added before swap

        if (!dest.isNative()) {
            const hasTrustline = account.balances.some((balance: any) =>
                balance.asset_type !== 'native' &&
                balance.asset_code === dest.code &&
                balance.asset_issuer === dest.issuer
            );

            if (!hasTrustline) {
                console.log(`Adding ChangeTrust for destination ${dest.code}`);
                txBuilder.addOperation(StellarSDK.Operation.changeTrust({
                    asset: dest,
                }));
            }
        }

        // Find payment path using OUR deployed pools
        console.log(`Finding path from ${source.code || 'XLM'} to ${dest.code || 'XLM'}`);

        // Load our deployed pools
        const poolsPath = path.join(process.cwd(), '..', 'backend', 'data', 'simple_testnet_pools.json');
        const poolsData = JSON.parse(fs.readFileSync(poolsPath, 'utf-8'));
        const pools = poolsData.pools;

        // Find path through our pools
        let pathAssets: StellarSDK.Asset[] = [];
        const sourceCode = source.code || 'XLM';
        const destCode = dest.code || 'XLM';

        // ONLY use direct pools for now (multi-hop has intermediate asset issues)
        const directPool = pools.find((p: any) =>
            (p.tokenA.code === sourceCode && p.tokenB.code === destCode) ||
            (p.tokenB.code === sourceCode && p.tokenA.code === destCode)
        );

        if (!directPool) {
            return NextResponse.json({
                error: `No direct pool found between ${sourceCode} and ${destCode}. Multi-hop swaps temporarily disabled.`
            }, { status: 400 });
        }

        console.log(`Using direct pool: ${sourceCode} ↔ ${destCode}`);

        // For direct pool swaps, use pathPaymentStrictReceive
        // This is more reliable than strictSend for liquidity pools

        // Calculate expected destination amount based on pool ratio
        const pool = directPool;
        const isForward = pool.tokenA.code === sourceCode;
        const reserveIn = parseFloat(isForward ? pool.tokenA.amount : pool.tokenB.amount);
        const reserveOut = parseFloat(isForward ? pool.tokenB.amount : pool.tokenA.amount);

        // Constant product formula: amountOut = (amountIn * reserveOut) / (reserveIn + amountIn)
        const amountIn = parseFloat(amount);
        const amountInWithFee = amountIn * 0.997; // 0.3% fee
        const expectedOut = (amountInWithFee * reserveOut) / (reserveIn + amountInWithFee);
        const destAmount = (expectedOut * 0.95).toFixed(7); // 5% slippage tolerance

        console.log(`Expected output: ${expectedOut.toFixed(4)} ${destCode}`);
        console.log(`Minimum accepted: ${destAmount} ${destCode}`);

        // Use pathPaymentStrictReceive - we specify how much we want to receive
        // Stellar will figure out how much to send
        txBuilder.addOperation(StellarSDK.Operation.pathPaymentStrictReceive({
            sendAsset: source,
            sendMax: (amountIn * 1.05).toFixed(7), // Allow 5% more to be sent if needed
            destAsset: dest,
            destAmount: destAmount,
            destination: userAddress,
            path: [] // Empty path for direct swap
        }));

        const tx = txBuilder.setTimeout(180).build();

        return NextResponse.json({
            xdr: tx.toXDR(),
            pathFound: pathAssets.length >= 0,
            estimatedReceive: 'calculated from pools'
        });
    } catch (error: any) {
        console.error('Swap build error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
