/**
 * Pool Monitor - Queries pool reserves and detects arbitrage opportunities
 */

import * as StellarSdk from '@stellar/stellar-sdk';
import { CONFIG, KNOWN_POOLS } from './config.js';

interface PoolState {
  address: string;
  name: string;
  token0: string;
  token1: string;
  reserve0: bigint;
  reserve1: bigint;
  price: number; // token1 per token0
  lastUpdated: number;
}

/**
 * Query contract via simulation
 */
async function queryContract(
  contractId: string,
  functionName: string,
  args: any[] = []
): Promise<any> {
  const contract = new StellarSdk.Contract(contractId);

  const dummyAccount = new StellarSdk.Account(
    'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF',
    '0'
  );

  const operation = contract.call(functionName, ...args);

  const transaction = new StellarSdk.TransactionBuilder(dummyAccount, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase: CONFIG.networkPassphrase,
  })
    .addOperation(operation)
    .setTimeout(30)
    .build();

  const response = await fetch(CONFIG.rpcUrl, {
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

  if (data.error) {
    throw new Error(data.error.message || 'RPC error');
  }

  if (data.result?.results && data.result.results.length > 0) {
    const result = data.result.results[0];
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
    case 'scvU64':
      return scVal.u64().toString();
    case 'scvI64':
      return scVal.i64().toString();
    case 'scvU128':
      return scVal.u128().lo().toString();
    case 'scvI128':
      return scVal.i128().lo().toString();
    case 'scvVec':
      return scVal.vec().map((v: any) => parseScVal(v));
    default:
      return scVal.toString();
  }
}

/**
 * Get pool reserves
 */
export async function getPoolReserves(poolAddress: string): Promise<{
  reserve0: bigint;
  reserve1: bigint;
}> {
  try {
    const result = await queryContract(poolAddress, 'get_reserves');
    const reserves = parseScVal(result);

    if (Array.isArray(reserves) && reserves.length >= 2) {
      return {
        reserve0: BigInt(reserves[0]),
        reserve1: BigInt(reserves[1]),
      };
    }

    throw new Error('Invalid reserves format');
  } catch (error) {
    console.error(`Failed to get reserves for ${poolAddress}:`, error);
    return { reserve0: 0n, reserve1: 0n };
  }
}

/**
 * Monitor all pools and return current state
 */
export async function monitorPools(): Promise<PoolState[]> {
  const states: PoolState[] = [];

  console.log(`\n📊 Monitoring ${KNOWN_POOLS.length} pools...`);

  for (const pool of KNOWN_POOLS) {
    try {
      const { reserve0, reserve1 } = await getPoolReserves(pool.address);

      if (reserve0 === 0n || reserve1 === 0n) {
        console.log(`⚠️  ${pool.name}: No liquidity`);
        continue;
      }

      // Calculate price (token1 per token0)
      const price = Number(reserve1) / Number(reserve0);

      const state: PoolState = {
        address: pool.address,
        name: pool.name,
        token0: pool.token0,
        token1: pool.token1,
        reserve0,
        reserve1,
        price,
        lastUpdated: Date.now(),
      };

      states.push(state);

      console.log(
        `✅ ${pool.name}: ${(reserve0 / 10000000n).toLocaleString()} / ${(reserve1 / 10000000n).toLocaleString()} | Price: ${price.toFixed(6)}`
      );
    } catch (error) {
      console.error(`❌ Failed to monitor ${pool.name}:`, error);
    }
  }

  return states;
}

/**
 * Detect arbitrage opportunities
 */
export function detectArbitrage(pools: PoolState[]): {
  path: string[];
  expectedProfit: number;
  profitPercent: number;
} | null {
  // Simple 2-pool arbitrage detection (A -> B -> A)
  // For example: XLM -> USDC (pool1) -> XLM (pool2)

  for (let i = 0; i < pools.length; i++) {
    for (let j = i + 1; j < pools.length; j++) {
      const pool1 = pools[i];
      const pool2 = pools[j];

      // Check if pools share a common token pair
      const sharedTokens = [
        pool1.token0 === pool2.token0,
        pool1.token0 === pool2.token1,
        pool1.token1 === pool2.token0,
        pool1.token1 === pool2.token1,
      ];

      if (sharedTokens.filter(Boolean).length === 2) {
        // Pools have same token pair, check price difference
        const priceRatio = pool1.price / pool2.price;
        const profitPercent = Math.abs((priceRatio - 1) * 100);

        if (profitPercent > CONFIG.minProfitPercent) {
          return {
            path: [pool1.name, pool2.name],
            expectedProfit: profitPercent,
            profitPercent,
          };
        }
      }
    }
  }

  return null;
}

// Run monitor in standalone mode
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('🤖 SaveX Arbitrage Bot - Pool Monitor\n');
  console.log(`Network: ${CONFIG.network}`);
  console.log(`RPC: ${CONFIG.rpcUrl}\n`);

  async function run() {
    const pools = await monitorPools();
    const opportunity = detectArbitrage(pools);

    if (opportunity) {
      console.log(`\n🚨 ARBITRAGE OPPORTUNITY DETECTED!`);
      console.log(`   Path: ${opportunity.path.join(' → ')}`);
      console.log(`   Profit: ${opportunity.profitPercent.toFixed(2)}%`);
    } else {
      console.log(`\n✅ No arbitrage opportunities at this time.`);
    }
  }

  run().catch(console.error);
}
