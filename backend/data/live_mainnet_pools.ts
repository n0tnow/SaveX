import axios from 'axios';

const HORIZON_API = 'https://horizon.stellar.org';
const USDC_ISSUER = 'GA5ZSEGWXGQGZNMJE4DQX6FLXJLDGLKLCCCHI5J7VGLXORWCH5HIS4A6'; // Circle USDC

async function fetchLiquidityPoolByAssets(assetA: any, assetB: any) {
  const assetAString = assetA.type === 'native' ? 'native' : `${assetA.code}:${assetA.issuer}`;
  const assetBString = assetB.type === 'native' ? 'native' : `${assetB.code}:${assetB.issuer}`;

  const url = `${HORIZON_API}/liquidity_pools?reserves=${assetAString},${assetBString}`;
  const resp = await axios.get(url);
  const pools = resp.data._embedded.records;
  return pools.length > 0 ? pools[0] : null;
}

async function fetchLiquidityPoolDetails(poolId: string) {
  const url = `${HORIZON_API}/liquidity_pools/${poolId}`;
  const resp = await axios.get(url);
  return resp.data;
}

(async () => {
  try {
    // Adım 1: Pool'u bul (XLM-USDC pair)
    const pool = await fetchLiquidityPoolByAssets(
      { type: 'native', code: 'XLM' },
      { type: 'credit_alphanum4', code: 'USDC', issuer: USDC_ISSUER }
    );
    if (!pool) {
      throw new Error('Mainnet XLM/USDC pool bulunamadı!');
    }

    console.log('POOL FOUND!');
    console.log('Pool-id:', pool.id);
    console.log('Assets:', pool.reserves);
    console.log('---');

    // Adım 2: Pool detayını al
    const poolDetails = await fetchLiquidityPoolDetails(pool.id);
    console.log('[Mainnet Liquidity Pool Details]');
    console.log('Pool ID:', poolDetails.id);
    console.log('Assets:', poolDetails.reserves.map((r:any)=>r.asset));
    console.log('Reserves:', poolDetails.reserves);
    console.log('Total Shares:', poolDetails.total_shares);
    console.log('Fee BP:', poolDetails.fee_bp);
    console.log('Last Modified:', poolDetails.last_modified_time);
  } catch (e) {
    console.error('[Error] Mainnet pool:', e?.message);
  }
})();
