import * as StellarSDK from '@stellar/stellar-sdk';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

try {
  console.log('SDK Version:', require('@stellar/stellar-sdk/package.json').version);
} catch (e) { console.log('Could not get version'); }

console.log('getLiquidityPoolId type:', typeof StellarSDK.getLiquidityPoolId);
// @ts-ignore
if (typeof StellarSDK.getLiquidityPoolId === 'function') {
    // @ts-ignore
  console.log('getLiquidityPoolId length:', StellarSDK.getLiquidityPoolId.length);
}

const assetA = StellarSDK.Asset.native();
const assetB = new StellarSDK.Asset('USDC', 'GBNZILSTVQZ4R7IKQDGHYGY2QNO2ARQNMKLY9PJDNRX5WTHLQSZZ4XKZ');

try {
  // Try 2 args (Asset, Asset) -> maybe implies standard fee?
  // @ts-ignore
  console.log('Trying 2 args (A, B):', StellarSDK.getLiquidityPoolId(assetA, assetB));
} catch (e) { console.log('2 args failed:', e.message); }

try {
    // Try 3 args (Asset, Asset, Fee)
    // @ts-ignore
    console.log('Trying 3 args (A, B, Fee):', StellarSDK.getLiquidityPoolId(assetA, assetB, 30));
} catch (e) { console.log('3 args failed:', e.message); }

