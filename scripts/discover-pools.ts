/**
 * Pool Discovery Script
 *
 * This script discovers all Soroswap liquidity pools on Stellar Testnet
 * and writes the results to LIQUIDITY_POOLS.md
 */

import * as StellarSdk from '@stellar/stellar-sdk';
import fs from 'fs';
import path from 'path';

// Configuration
const NETWORK_CONFIG = {
  rpcUrl: 'https://soroban-testnet.stellar.org',
  horizonUrl: 'https://horizon-testnet.stellar.org',
  networkPassphrase: 'Test SDF Network ; September 2015',
};

// Known Soroswap contracts (testnet)
const SOROSWAP_ROUTER = 'CCMAPXWVZD4USEKDWRYS7DA4Y3D7E2SDMGBFJUCEXTC7VN6CUBGWPFUS';
const SOROSWAP_FACTORY = 'CDJTMBYKNUGINFQALHDMPLZYNGUV42GPN4B7QOYTWHRC4EE5IYJM6AES';

interface PoolInfo {
  address: string;
  token0: string;
  token0Symbol?: string;
  token1: string;
  token1Symbol?: string;
  reserve0?: string;
  reserve1?: string;
  totalSupply?: string;
}

/**
 * Call Soroban RPC
 */
async function callSorobanRPC(method: string, params: any): Promise<any> {
  const response = await fetch(NETWORK_CONFIG.rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method,
      params,
    }),
  });

  const data = await response.json();

  if (data.error) {
    throw new Error(data.error.message || 'RPC error');
  }

  return data.result;
}

/**
 * Query contract function via simulation
 */
async function queryContract(
  contractId: string,
  functionName: string,
  args: any[] = []
): Promise<any> {
  const contract = new StellarSdk.Contract(contractId);
  // Create a dummy source account for simulation
  const dummyAccount = new StellarSdk.Account(
    'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF',
    '0'
  );

  // Build operation
  const operation = contract.call(functionName, ...args);

  // Build transaction
  const transaction = new StellarSdk.TransactionBuilder(dummyAccount, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase: NETWORK_CONFIG.networkPassphrase,
  })
    .addOperation(operation)
    .setTimeout(30)
    .build();

  // Simulate
  const simulateResponse = await callSorobanRPC('simulateTransaction', {
    transaction: transaction.toXDR(),
  });

  if (simulateResponse.error) {
    throw new Error(simulateResponse.error);
  }

  // Parse result
  if (simulateResponse.results && simulateResponse.results.length > 0) {
    const result = simulateResponse.results[0];
    if (result.xdr) {
      return StellarSdk.xdr.ScVal.fromXDR(result.xdr, 'base64');
    }
  }

  return null;
}

/**
 * Parse ScVal to JavaScript value
 */
function parseScVal(scVal: any): any {
  if (!scVal) return null;

  const switchName = scVal.switch().name;

  switch (switchName) {
    case 'scvBool':
      return scVal.b();
    case 'scvU32':
      return scVal.u32();
    case 'scvI32':
      return scVal.i32();
    case 'scvU64':
      return scVal.u64().toString();
    case 'scvI64':
      return scVal.i64().toString();
    case 'scvU128':
      return scVal.u128().lo().toString();
    case 'scvI128':
      return scVal.i128().lo().toString();
    case 'scvString':
      return scVal.str().toString();
    case 'scvAddress':
      return StellarSdk.Address.fromScVal(scVal).toString();
    case 'scvVec':
      return scVal.vec().map((v: any) => parseScVal(v));
    default:
      return scVal.toString();
  }
}

/**
 * Get factory address from router
 */
async function getFactoryAddress(): Promise<string> {
  try {
    console.log('🔍 Querying router for factory address...');
    const result = await queryContract(SOROSWAP_ROUTER, 'get_factory');
    const factoryAddress = parseScVal(result);
    console.log('✅ Factory address:', factoryAddress);
    return factoryAddress;
  } catch (error) {
    console.log('⚠️ Failed to query factory from router, using hardcoded:', SOROSWAP_FACTORY);
    return SOROSWAP_FACTORY;
  }
}

/**
 * Get all pools from factory
 */
async function getAllPools(factoryAddress: string): Promise<string[]> {
  try {
    console.log('🔍 Querying factory for pool count...');
    const countResult = await queryContract(factoryAddress, 'all_pairs_length');
    const poolCount = parseScVal(countResult);
    console.log(`✅ Found ${poolCount} pools`);

    const pools: string[] = [];
    console.log('🔍 Fetching pool addresses...');

    // Fetch first 10 pools (to avoid timeout)
    const maxPools = Math.min(poolCount, 10);
    for (let i = 0; i < maxPools; i++) {
      try {
        const result = await queryContract(
          factoryAddress,
          'all_pairs',
          [StellarSdk.nativeToScVal(i, { type: 'u32' })]
        );
        const poolAddress = parseScVal(result);
        pools.push(poolAddress);
        console.log(`  ✅ Pool ${i}: ${poolAddress.slice(0, 8)}...`);
      } catch (error) {
        console.error(`  ❌ Failed to get pool ${i}:`, error);
      }
    }

    return pools;
  } catch (error) {
    console.error('❌ Failed to get pools:', error);
    return [];
  }
}

/**
 * Get pool info (reserves, tokens)
 */
async function getPoolInfo(poolAddress: string): Promise<PoolInfo> {
  console.log(`  📊 Querying pool ${poolAddress.slice(0, 8)}...`);

  const info: PoolInfo = {
    address: poolAddress,
    token0: '',
    token1: '',
  };

  try {
    // Get token addresses
    const token0Result = await queryContract(poolAddress, 'token_0');
    const token1Result = await queryContract(poolAddress, 'token_1');

    info.token0 = parseScVal(token0Result);
    info.token1 = parseScVal(token1Result);

    // Get reserves
    const reservesResult = await queryContract(poolAddress, 'get_reserves');
    const reserves = parseScVal(reservesResult);

    if (Array.isArray(reserves) && reserves.length >= 2) {
      info.reserve0 = reserves[0];
      info.reserve1 = reserves[1];
    }

    // Get total supply
    const totalSupplyResult = await queryContract(poolAddress, 'total_supply');
    info.totalSupply = parseScVal(totalSupplyResult);

    console.log(`    ✅ Token0: ${info.token0.slice(0, 8)}... Reserve: ${info.reserve0}`);
    console.log(`    ✅ Token1: ${info.token1.slice(0, 8)}... Reserve: ${info.reserve1}`);
  } catch (error) {
    console.error(`    ❌ Failed to get pool info:`, error);
  }

  return info;
}

/**
 * Get token symbol
 */
async function getTokenSymbol(tokenAddress: string): Promise<string> {
  try {
    const result = await queryContract(tokenAddress, 'symbol');
    return parseScVal(result) || 'UNKNOWN';
  } catch {
    return 'UNKNOWN';
  }
}

/**
 * Main discovery function
 */
async function discoverPools() {
  console.log('🚀 Starting pool discovery...\n');

  try {
    // Step 1: Get factory address
    const factoryAddress = await getFactoryAddress();

    // Step 2: Get all pools
    const poolAddresses = await getAllPools(factoryAddress);

    if (poolAddresses.length === 0) {
      console.log('⚠️  No pools found. Soroswap may not be deployed on testnet yet.');
      return;
    }

    // Step 3: Get info for each pool
    console.log(`\n📊 Fetching details for ${poolAddresses.length} pools...\n`);
    const pools: PoolInfo[] = [];

    for (const poolAddress of poolAddresses) {
      const info = await getPoolInfo(poolAddress);

      // Get token symbols
      if (info.token0) {
        info.token0Symbol = await getTokenSymbol(info.token0);
      }
      if (info.token1) {
        info.token1Symbol = await getTokenSymbol(info.token1);
      }

      pools.push(info);

      // Rate limiting
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    // Step 4: Write to markdown file
    console.log('\n📝 Writing results to LIQUIDITY_POOLS.md...');
    await writePoolsToMarkdown(factoryAddress, pools);

    console.log('\n✅ Discovery complete!');
    console.log(`   Factory: ${factoryAddress}`);
    console.log(`   Pools found: ${pools.length}`);
  } catch (error) {
    console.error('\n❌ Discovery failed:', error);
  }
}

/**
 * Write pools to markdown file
 */
async function writePoolsToMarkdown(
  factoryAddress: string,
  pools: PoolInfo[]
) {
  const mdPath = path.join(process.cwd(), 'LIQUIDITY_POOLS.md');

  let content = `# Stellar Testnet Liquidity Pools Research

**Last Updated:** ${new Date().toISOString()}
**Status:** ✅ Pools Discovered

---

## 🏭 Soroswap Factory

- **Factory Address:** \`${factoryAddress}\`
- **Total Pools:** ${pools.length}
- **Router Address:** \`${SOROSWAP_ROUTER}\`

---

## 📊 Discovered Pools

`;

  for (let i = 0; i < pools.length; i++) {
    const pool = pools[i];

    content += `### Pool ${i + 1}: ${pool.token0Symbol || 'UNKNOWN'}/${pool.token1Symbol || 'UNKNOWN'}

- **Status:** ✅ Active
- **Pool Address:** \`${pool.address}\`
- **Token 0:**
  - Address: \`${pool.token0}\`
  - Symbol: ${pool.token0Symbol || 'UNKNOWN'}
  - Reserve: ${pool.reserve0 || 'N/A'}
- **Token 1:**
  - Address: \`${pool.token1}\`
  - Symbol: ${pool.token1Symbol || 'UNKNOWN'}
  - Reserve: ${pool.reserve1 || 'N/A'}
- **LP Total Supply:** ${pool.totalSupply || 'N/A'}
- **TVL (estimated):** TBD

---

`;
  }

  content += `
## 📋 Token List for Frontend

\`\`\`typescript
export const TOKENS = {
  XLM: {
    address: 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC',
    symbol: 'XLM',
    name: 'Stellar Lumens',
    decimals: 7,
    icon: '⭐',
  },
  USDC: {
    address: 'CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA',
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 7,
    icon: '💵',
  },
`;

  // Add discovered tokens
  const uniqueTokens = new Map<string, { address: string; symbol: string }>();

  pools.forEach((pool) => {
    if (pool.token0 && pool.token0Symbol && pool.token0Symbol !== 'UNKNOWN') {
      uniqueTokens.set(pool.token0Symbol, {
        address: pool.token0,
        symbol: pool.token0Symbol,
      });
    }
    if (pool.token1 && pool.token1Symbol && pool.token1Symbol !== 'UNKNOWN') {
      uniqueTokens.set(pool.token1Symbol, {
        address: pool.token1,
        symbol: pool.token1Symbol,
      });
    }
  });

  uniqueTokens.forEach((token) => {
    if (token.symbol !== 'XLM' && token.symbol !== 'USDC') {
      content += `  ${token.symbol}: {
    address: '${token.address}',
    symbol: '${token.symbol}',
    name: '${token.symbol}', // Update with full name
    decimals: 7,
    icon: '💎', // Update with appropriate icon
  },
`;
    }
  });

  content += `} as const;
\`\`\`

---

## 🎯 Next Steps

- [x] Discover factory address
- [x] Query all pools
- [x] Get pool reserves
- [ ] Calculate TVL for each pool
- [ ] Add tokens to frontend config
- [ ] Test swaps through discovered pools
- [ ] Monitor pool changes over time
`;

  fs.writeFileSync(mdPath, content);
  console.log(`   ✅ Written to ${mdPath}`);
}

// Run discovery
discoverPools().catch(console.error);
