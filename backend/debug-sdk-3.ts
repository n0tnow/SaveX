import * as StellarSDK from '@stellar/stellar-sdk';

const pair = StellarSDK.Keypair.random();
const assetA = StellarSDK.Asset.native();
const assetB = new StellarSDK.Asset('USDC', pair.publicKey());

console.log('Testing with valid assets...');

try {
    const lpAsset = new StellarSDK.LiquidityPoolAsset(
        assetA,
        assetB,
        StellarSDK.LiquidityPoolFeeV18
    );
    console.log('LP Asset created successfully');
    console.log('LP Asset toString:', lpAsset.toString());
    
    // Check prototype
    console.log('Prototype methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(lpAsset)));
    
    // Try to find ID in properties
    // @ts-ignore
    if (lpAsset.id) console.log('lpAsset.id:', lpAsset.id);
    // @ts-ignore
    if (lpAsset.poolId) console.log('lpAsset.poolId:', lpAsset.poolId);
    
} catch (e) { console.log('LP Asset error:', e.message); }

try {
    // Try getLiquidityPoolId with object
    // @ts-ignore
    console.log('Trying getLiquidityPoolId with object...');
    // @ts-ignore
    console.log('Result:', StellarSDK.getLiquidityPoolId('constant_product', {
        assetA, assetB, fee: StellarSDK.LiquidityPoolFeeV18
    }));
} catch (e) { console.log('getLiquidityPoolId error:', e.message); }

