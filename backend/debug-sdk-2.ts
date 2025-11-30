import * as StellarSDK from '@stellar/stellar-sdk';

const assetA = StellarSDK.Asset.native();
// Valid issuer key (randomly generated valid key)
const assetB = new StellarSDK.Asset('USDC', 'GBNZILSTVQZ4R7IKQDGHYGY2QNO2ARQNMKLY9PJDNRX5WTHLQSZZ4XKZ'); 

console.log('LiquidityPoolFeeV18:', StellarSDK.LiquidityPoolFeeV18);

try {
    // Try passing parameters as object
    // @ts-ignore
    console.log('Trying object arg:', StellarSDK.getLiquidityPoolId(
        'constant_product',
        {
            assetA: assetA,
            assetB: assetB,
            fee: StellarSDK.LiquidityPoolFeeV18
        }
    ));
} catch (e) { console.log('Object arg failed:', e.message); }

try {
    // Try constructing LiquidityPoolAsset and checking properties
    const lpAsset = new StellarSDK.LiquidityPoolAsset(
        assetA,
        assetB,
        StellarSDK.LiquidityPoolFeeV18
    );
    console.log('LP Asset created');
    console.log('Keys:', Object.keys(lpAsset));
    // @ts-ignore
    console.log('getLiquidityPoolId method?', typeof lpAsset.getLiquidityPoolId);
    // @ts-ignore
    if (typeof lpAsset.getLiquidityPoolId === 'function') {
         // @ts-ignore
        console.log('ID from method:', lpAsset.getLiquidityPoolId());
    }
} catch (e) { console.log('LP Asset failed:', e.message); }

