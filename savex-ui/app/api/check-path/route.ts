import { NextResponse } from 'next/server';
import * as StellarSDK from '@stellar/stellar-sdk';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { sourceAsset, destAsset, amount } = body;

        if (!sourceAsset || !destAsset || !amount) {
            return NextResponse.json({ pathExists: false });
        }

        // Create assets
        const source = sourceAsset.type === 'native' || sourceAsset.code === 'XLM'
            ? StellarSDK.Asset.native()
            : new StellarSDK.Asset(sourceAsset.code, sourceAsset.issuer);

        const dest = destAsset.type === 'native' || destAsset.code === 'XLM'
            ? StellarSDK.Asset.native()
            : new StellarSDK.Asset(destAsset.code, destAsset.issuer);

        // Check for path
        const server = new StellarSDK.Horizon.Server('https://horizon-testnet.stellar.org');

        try {
            const pathsResponse = await server
                .strictSendPaths(source, amount, [dest])
                .call();

            const pathExists = pathsResponse.records.length > 0;

            return NextResponse.json({
                pathExists,
                pathCount: pathsResponse.records.length
            });
        } catch (pathError) {
            return NextResponse.json({ pathExists: false });
        }
    } catch (error: any) {
        return NextResponse.json({ pathExists: false });
    }
}
