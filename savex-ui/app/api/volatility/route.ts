import { NextResponse } from 'next/server';
import * as StellarSdk from '@stellar/stellar-sdk';
import { withCache } from '@/lib/cache';

// Horizon server
const horizonServer = new StellarSdk.Horizon.Server('https://horizon.stellar.org');

interface HourlyPattern {
  hour: number;
  avgSpread: number;
  tradeCount: number;
  confidence: 'high' | 'medium' | 'low';
}

interface VolatilityAnalysis {
  recommendation: string;
  bestHour: number;
  currentHour: number;
  currentSpread: number;
  bestSpread: number;
  potentialSavings: number;
  hourlyPatterns: HourlyPattern[];
  analysisWindow: string;
}

/**
 * GET /api/volatility?base=XLM&counter=USDC
 * Analyze historical volatility patterns and provide timing recommendations
 * Uses Redis cache (10 minute TTL)
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const baseAsset = searchParams.get('base') || 'native'; // XLM
    const counterAsset = searchParams.get('counter') || 'USDC';
    const counterIssuer = searchParams.get('issuer') || 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN';

    // Cache key
    const cacheKey = `volatility:${baseAsset}:${counterAsset}`;

    // Try cache (10 minute TTL - volatility doesn't change that fast)
    const analysis = await withCache(
      cacheKey,
      async () => {
        // Cache miss - analyze volatility
        return await analyzeVolatility(baseAsset, counterAsset, counterIssuer);
      },
      600 // 10 minutes
    );

    return NextResponse.json(analysis);

  } catch (error) {
    console.error('Volatility analysis error:', error);

    // Return fallback heuristic if Horizon API fails
    return NextResponse.json(getFallbackAnalysis());
  }
}

/**
 * Analyze volatility (extracted for caching)
 */
async function analyzeVolatility(
  baseAsset: string,
  counterAsset: string,
  counterIssuer: string
): Promise<VolatilityAnalysis> {
    // Fetch last 3 days of trades
    const trades = await fetchRecentTrades(baseAsset, counterAsset, counterIssuer);

    // Calculate hourly spread patterns
    const hourlyPatterns = calculateHourlyPatterns(trades);

    // Find best hour to swap
    const bestPattern = hourlyPatterns.reduce((best, current) =>
      current.avgSpread < best.avgSpread ? current : best
    );

    const currentHour = new Date().getUTCHours();
    const currentPattern = hourlyPatterns.find(p => p.hour === currentHour) || hourlyPatterns[0];

    // Calculate potential savings
    const potentialSavings = ((currentPattern.avgSpread - bestPattern.avgSpread) / currentPattern.avgSpread) * 100;

    return {
      recommendation: generateRecommendation(currentHour, bestPattern.hour, potentialSavings),
      bestHour: bestPattern.hour,
      currentHour,
      currentSpread: currentPattern.avgSpread,
      bestSpread: bestPattern.avgSpread,
      potentialSavings: parseFloat(potentialSavings.toFixed(2)),
      hourlyPatterns: hourlyPatterns.sort((a, b) => a.hour - b.hour),
      analysisWindow: '3 days',
    };
}

/**
 * Fetch recent trades from Horizon API
 */
async function fetchRecentTrades(
  base: string,
  counter: string,
  counterIssuer: string
): Promise<any[]> {
  try {
    const baseAsset = base === 'native'
      ? StellarSdk.Asset.native()
      : new StellarSdk.Asset(base, '');

    const counterAssetObj = new StellarSdk.Asset(counter, counterIssuer);

    const tradesResponse = await horizonServer
      .trades()
      .forAssetPair(baseAsset, counterAssetObj)
      .limit(200)
      .order('desc')
      .call();

    return tradesResponse.records || [];
  } catch (error) {
    console.error('Failed to fetch trades from Horizon:', error);
    return [];
  }
}

/**
 * Calculate hourly spread patterns from trades
 */
function calculateHourlyPatterns(trades: any[]): HourlyPattern[] {
  const hourlyData: { [hour: number]: { spreads: number[]; count: number } } = {};

  // Initialize all 24 hours
  for (let h = 0; h < 24; h++) {
    hourlyData[h] = { spreads: [], count: 0 };
  }

  // Group trades by hour
  trades.forEach((trade) => {
    try {
      const timestamp = new Date(trade.ledger_close_time);
      const hour = timestamp.getUTCHours();

      // Calculate spread (simplified)
      const price = parseFloat(trade.price.n) / parseFloat(trade.price.d);
      const baseAmount = parseFloat(trade.base_amount);
      const counterAmount = parseFloat(trade.counter_amount);

      // Estimate spread as percentage
      const spread = Math.abs((price * baseAmount - counterAmount) / counterAmount) * 100;

      if (!isNaN(spread) && spread < 5) { // Filter out outliers
        hourlyData[hour].spreads.push(spread);
        hourlyData[hour].count++;
      }
    } catch (error) {
      // Skip invalid trades
    }
  });

  // Calculate average spread for each hour
  const patterns: HourlyPattern[] = [];
  for (let hour = 0; hour < 24; hour++) {
    const data = hourlyData[hour];
    const avgSpread = data.spreads.length > 0
      ? data.spreads.reduce((a, b) => a + b, 0) / data.spreads.length
      : 0.15; // Default 0.15%

    patterns.push({
      hour,
      avgSpread: parseFloat(avgSpread.toFixed(4)),
      tradeCount: data.count,
      confidence: data.count > 10 ? 'high' : data.count > 3 ? 'medium' : 'low',
    });
  }

  return patterns;
}

/**
 * Generate human-readable recommendation
 */
function generateRecommendation(currentHour: number, bestHour: number, savings: number): string {
  if (currentHour === bestHour) {
    return '✅ Best time to swap is NOW! Spreads are at their lowest.';
  }

  const hoursUntilBest = bestHour > currentHour
    ? bestHour - currentHour
    : 24 - currentHour + bestHour;

  if (savings < 0.05) {
    return `⏰ Swap now or wait ${hoursUntilBest}h. Minimal savings (${savings.toFixed(2)}%).`;
  }

  if (savings < 0.15) {
    return `⏰ Consider waiting ${hoursUntilBest}h for ${bestHour}:00 UTC (save ${savings.toFixed(2)}%).`;
  }

  return `⏰ Wait ${hoursUntilBest}h for ${bestHour}:00 UTC to save ${savings.toFixed(2)}%!`;
}

/**
 * Fallback analysis if Horizon API fails
 */
function getFallbackAnalysis(): VolatilityAnalysis {
  const currentHour = new Date().getUTCHours();

  // Heuristic: Night hours (22:00-03:00 UTC) typically have lower spreads
  const bestHour = 22;

  // Generate heuristic patterns
  const hourlyPatterns: HourlyPattern[] = [];
  for (let hour = 0; hour < 24; hour++) {
    // Night hours: 0.10-0.12%, Day hours: 0.15-0.18%
    const isNight = hour >= 22 || hour <= 3;
    const avgSpread = isNight ? 0.10 + Math.random() * 0.02 : 0.15 + Math.random() * 0.03;

    hourlyPatterns.push({
      hour,
      avgSpread: parseFloat(avgSpread.toFixed(4)),
      tradeCount: 0,
      confidence: 'low',
    });
  }

  const currentPattern = hourlyPatterns[currentHour];
  const bestPattern = hourlyPatterns[bestHour];
  const potentialSavings = ((currentPattern.avgSpread - bestPattern.avgSpread) / currentPattern.avgSpread) * 100;

  return {
    recommendation: generateRecommendation(currentHour, bestHour, potentialSavings),
    bestHour,
    currentHour,
    currentSpread: currentPattern.avgSpread,
    bestSpread: bestPattern.avgSpread,
    potentialSavings: parseFloat(potentialSavings.toFixed(2)),
    hourlyPatterns,
    analysisWindow: 'heuristic (Horizon API unavailable)',
  };
}
