import { NextResponse } from 'next/server';
import { withCache } from '@/lib/cache';

// Soroswap Router contract address (testnet)
const ROUTER_ADDRESS = 'CCMAPXWVZD4USEKDWRYS7DA4Y3D7E2SDMGBFJUCEXTC7VN6CUBGWPFUS';
const FACTORY_ADDRESS = process.env.NEXT_PUBLIC_FACTORY_ADDRESS || '';

interface PathFindingRequest {
  fromToken: string;
  toToken: string;
  amount: string;
}

interface Pool {
  address: string;
  token0: string;
  token1: string;
  reserve0: string;
  reserve1: string;
}

interface Path {
  tokens: string[];
  expectedOutput: string;
  totalFee: number;
  hops: number;
}

/**
 * POST /api/path-finding
 * Find optimal swap path using Dijkstra algorithm
 * Uses Redis cache for pool data (30s TTL)
 */
export async function POST(request: Request) {
  try {
    const body: PathFindingRequest = await request.json();
    const { fromToken, toToken, amount } = body;

    if (!fromToken || !toToken || !amount) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Cache key for this specific path query
    const cacheKey = `path:${fromToken}:${toToken}:${amount}`;

    // Try to get cached result (30 second TTL)
    const cachedResult = await withCache(
      cacheKey,
      async () => {
        // Cache miss - calculate paths
        return await calculateOptimalPaths(fromToken, toToken, amount);
      },
      30 // 30 seconds cache
    );

    return NextResponse.json(cachedResult);

  } catch (error) {
    console.error('Path finding error:', error);
    return NextResponse.json(
      { error: 'Failed to find optimal path' },
      { status: 500 }
    );
  }
}

/**
 * Calculate optimal paths (extracted for caching)
 */
async function calculateOptimalPaths(
  fromToken: string,
  toToken: string,
  amount: string
) {
    // For now, return direct path (optimal pathfinding requires querying all pools)
    // This will be enhanced with actual Dijkstra algorithm + pool queries

    // Direct swap path
    const directPath: Path = {
      tokens: [fromToken, toToken],
      expectedOutput: calculateDirectSwap(amount, 0.003), // 0.3% fee
      totalFee: 0.003,
      hops: 1,
    };

    // Common intermediary tokens for multi-hop
    const COMMON_TOKENS = {
      USDC: process.env.NEXT_PUBLIC_USDC_ADDRESS || '',
      XLM: process.env.NEXT_PUBLIC_XLM_ADDRESS || '',
    };

    // Try common 2-hop paths
    const paths: Path[] = [directPath];

    // XLM → USDC → Target
    if (fromToken !== COMMON_TOKENS.USDC && toToken !== COMMON_TOKENS.USDC) {
      paths.push({
        tokens: [fromToken, COMMON_TOKENS.USDC, toToken],
        expectedOutput: calculateMultiHopSwap(amount, 2),
        totalFee: 0.006, // 0.3% * 2
        hops: 2,
      });
    }

    // XLM intermediary
    if (fromToken !== COMMON_TOKENS.XLM && toToken !== COMMON_TOKENS.XLM) {
      paths.push({
        tokens: [fromToken, COMMON_TOKENS.XLM, toToken],
        expectedOutput: calculateMultiHopSwap(amount, 2),
        totalFee: 0.006,
        hops: 2,
      });
    }

    // Sort by expected output (descending)
    paths.sort((a, b) => parseFloat(b.expectedOutput) - parseFloat(a.expectedOutput));

    return {
      recommended: paths[0],
      alternatives: paths.slice(1, 3),
      timestamp: Date.now(),
    };
}

/**
 * Calculate output for direct swap (simplified)
 */
function calculateDirectSwap(inputAmount: string, feeRate: number): string {
  const input = parseFloat(inputAmount);
  const output = input * (1 - feeRate);
  return output.toString();
}

/**
 * Calculate output for multi-hop swap (simplified)
 */
function calculateMultiHopSwap(inputAmount: string, hops: number): string {
  const input = parseFloat(inputAmount);
  let output = input;

  // Apply fee for each hop
  for (let i = 0; i < hops; i++) {
    output = output * (1 - 0.003); // 0.3% fee per hop
  }

  return output.toString();
}

/**
 * GET /api/path-finding/pools
 * Get all available liquidity pools (for frontend caching)
 */
export async function GET() {
  try {
    // TODO: Query Soroswap Factory for all pools
    // For now, return empty array (will be implemented with actual pool queries)

    return NextResponse.json({
      pools: [],
      count: 0,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('Pool query error:', error);
    return NextResponse.json(
      { error: 'Failed to query pools' },
      { status: 500 }
    );
  }
}
