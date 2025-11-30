/**
 * Pool Data Management
 * Fetches and caches pool data from Soroswap
 */
import * as StellarSdk from '@stellar/stellar-sdk';
const RPC_URL = process.env.RPC_URL || 'https://soroban-testnet.stellar.org';
const NETWORK_PASSPHRASE = 'Test SDF Network ; September 2015';
const KNOWN_POOLS = [
    {
        address: 'CDIEPNPMEYBKZZVXNB2PLJMGFVLWJ32YNU5RIF4DOF7G6DTEZFBJHIDS',
        token0: 'CCSV3Y6QKAPRZCPLCMC5W7OCS5BFPKMYFK5GC25SSSS44U2WA4Y7QRKE',
        token1: 'CDWEFYYHMGEZEFC5TBUDXM3IJJ7K7W5BDGE765UIYQEV4JFWDOLSTOEK',
        name: 'XTAR/USDC',
    },
    {
        address: 'CDT3AHGQC4PYFGMJWBIY2VLZIZ7CBMCKZ7BZMYC55WIVPDPRYWYBHD4I',
        token0: 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC',
        token1: 'CDWEFYYHMGEZEFC5TBUDXM3IJJ7K7W5BDGE765UIYQEV4JFWDOLSTOEK',
        name: 'XLM/USDC',
    },
    {
        address: 'CDE3I665APUHQYMATNLEODUPIWTEWXB5NB5IEV6NNNDQ3ZYRJ3SSWZKM',
        token0: 'CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA',
        token1: 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC',
        name: 'USDC/XLM',
    },
    {
        address: 'CCJQDQ3Y3WXJJQIDMAWK77DGDETT5U222OU2ARGYZWYSPDDFXYAJVWSR',
        token0: 'CAUL6I3KR55BAOSOE23VRR5FUFD2EEBWF3DHGWUZN7N3ZGVR4QQU6DQM',
        token1: 'CDWEFYYHMGEZEFC5TBUDXM3IJJ7K7W5BDGE765UIYQEV4JFWDOLSTOEK',
        name: 'EURC/USDC',
    },
    {
        address: 'CAP6V6SHXYTT7X3NDMXA3N3T4DPBQOEFHKSHTVMJ4LNGJDBTU7OESN3H',
        token0: 'CCSV3Y6QKAPRZCPLCMC5W7OCS5BFPKMYFK5GC25SSSS44U2WA4Y7QRKE',
        token1: 'CD56OXOMAZ55LIKCYVFXH5CP2AKCLYMPMBFRN5XIJVOTWOVY2KFGLZVJ',
        name: 'XTAR/AQUA',
    },
];
// In-memory cache
let poolsCache = [];
let lastFetch = 0;
const CACHE_TTL = 10000; // 10 seconds
/**
 * Query contract via simulation
 */
async function queryContract(contractId, functionName, args = []) {
    const contract = new StellarSdk.Contract(contractId);
    const dummyAccount = new StellarSdk.Account('GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF', '0');
    const operation = contract.call(functionName, ...args);
    const transaction = new StellarSdk.TransactionBuilder(dummyAccount, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: NETWORK_PASSPHRASE,
    })
        .addOperation(operation)
        .setTimeout(30)
        .build();
    const response = await fetch(RPC_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'simulateTransaction',
            params: { transaction: transaction.toXDR() },
        }),
    });
    const data = await response.json();
    if (data.error)
        throw new Error(data.error.message || 'RPC error');
    if (data.result?.results?.[0]?.xdr) {
        return StellarSdk.xdr.ScVal.fromXDR(data.result.results[0].xdr, 'base64');
    }
    return null;
}
/**
 * Parse ScVal to JavaScript value
 */
function parseScVal(scVal) {
    if (!scVal)
        return null;
    const switchName = scVal.switch().name;
    switch (switchName) {
        case 'scvU64':
            return scVal.u64().toString();
        case 'scvI64':
            return scVal.i64().toString();
        case 'scvU128':
            return scVal.u128().lo().toString();
        case 'scvI128':
            return scVal.i128().lo().toString();
        case 'scvVec':
            return scVal.vec().map((v) => parseScVal(v));
        default:
            return scVal.toString();
    }
}
/**
 * Fetch pool reserves
 */
async function fetchPoolData(pool) {
    try {
        const result = await queryContract(pool.address, 'get_reserves');
        const reserves = parseScVal(result);
        const reserve0Bigint = Array.isArray(reserves) && reserves.length >= 2 ? BigInt(reserves[0]) : 0n;
        const reserve1Bigint = Array.isArray(reserves) && reserves.length >= 2 ? BigInt(reserves[1]) : 0n;
        const price = reserve0Bigint > 0n ? Number(reserve1Bigint) / Number(reserve0Bigint) : 0;
        // Calculate TVL (simplified - would need price oracle in production)
        const tvl = ((Number(reserve0Bigint) + Number(reserve1Bigint)) / 10000000).toFixed(2);
        return {
            address: pool.address,
            name: pool.name,
            token0: pool.token0,
            token1: pool.token1,
            reserve0: reserve0Bigint.toString(),
            reserve1: reserve1Bigint.toString(),
            price,
            tvl,
            lastUpdated: Date.now(),
        };
    }
    catch (error) {
        console.error(`Failed to fetch pool ${pool.name}:`, error);
        return {
            address: pool.address,
            name: pool.name,
            token0: pool.token0,
            token1: pool.token1,
            reserve0: '0',
            reserve1: '0',
            price: 0,
            tvl: '0',
            lastUpdated: Date.now(),
        };
    }
}
/**
 * Get all pools data with caching
 */
export async function getPoolsData() {
    const now = Date.now();
    // Return cache if still valid
    if (poolsCache.length > 0 && now - lastFetch < CACHE_TTL) {
        return poolsCache;
    }
    console.log('📊 Fetching fresh pool data...');
    // Fetch all pools in parallel
    const pools = await Promise.all(KNOWN_POOLS.map(pool => fetchPoolData(pool)));
    poolsCache = pools;
    lastFetch = now;
    return pools;
}
/**
 * Get specific pool by address
 */
export async function getPoolById(address) {
    const pools = await getPoolsData();
    return pools.find(p => p.address === address) || null;
}
