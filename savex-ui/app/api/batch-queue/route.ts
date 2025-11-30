import { NextResponse } from 'next/server';

/**
 * Batch Queue API
 * Note: This is a stateless API for batch calculations and recommendations.
 * Actual queue management happens client-side (localStorage).
 */

interface SwapIntent {
  from: string;
  to: string;
  token: string;
  amount: string;
  timestamp: number;
}

interface BatchAnalysis {
  recommendedBatchSize: number;
  estimatedSavings: number;
  savingsPercentage: number;
  feeWithoutBatch: string;
  feeWithBatch: string;
  breakdownWithoutBatch: FeeBreakdown;
  breakdownWithBatch: FeeBreakdown;
}

interface FeeBreakdown {
  baseFee: string;
  networkFee: string;
  serviceFee: string;
  discount: string;
  total: string;
}

/**
 * POST /api/batch-queue/analyze
 * Analyze batch queue and calculate savings
 */
export async function POST(request: Request) {
  try {
    const { swaps } = await request.json() as { swaps: SwapIntent[] };

    if (!swaps || !Array.isArray(swaps)) {
      return NextResponse.json(
        { error: 'Invalid swaps array' },
        { status: 400 }
      );
    }

    if (swaps.length === 0) {
      return NextResponse.json(
        { error: 'No swaps in queue' },
        { status: 400 }
      );
    }

    // Calculate total amount
    const totalAmount = swaps.reduce((sum, swap) => {
      return sum + parseFloat(swap.amount);
    }, 0);

    // Calculate fees
    const batchSize = swaps.length;
    const feeWithoutBatch = calculateIndividualFees(swaps);
    const feeWithBatch = calculateBatchFee(totalAmount, batchSize);

    const savings = feeWithoutBatch.total - feeWithBatch.total;
    const savingsPercentage = (savings / feeWithoutBatch.total) * 100;

    const analysis: BatchAnalysis = {
      recommendedBatchSize: getRecommendedBatchSize(batchSize),
      estimatedSavings: parseFloat(savings.toFixed(7)),
      savingsPercentage: parseFloat(savingsPercentage.toFixed(2)),
      feeWithoutBatch: feeWithoutBatch.total.toFixed(7),
      feeWithBatch: feeWithBatch.total.toFixed(7),
      breakdownWithoutBatch: formatFeeBreakdown(feeWithoutBatch),
      breakdownWithBatch: formatFeeBreakdown(feeWithBatch),
    };

    return NextResponse.json(analysis);

  } catch (error) {
    console.error('Batch analysis error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze batch' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/batch-queue/recommendation?size=3
 * Get batch size recommendation
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const currentSize = parseInt(searchParams.get('size') || '0');

    const recommendation = getRecommendedBatchSize(currentSize);
    const shouldExecute = currentSize >= recommendation;

    return NextResponse.json({
      currentSize,
      recommendedSize: recommendation,
      shouldExecute,
      message: shouldExecute
        ? `✅ Execute now! You have ${currentSize} swaps (recommended: ${recommendation}+)`
        : `⏳ Add ${recommendation - currentSize} more swap(s) for optimal savings`,
    });

  } catch (error) {
    console.error('Batch recommendation error:', error);
    return NextResponse.json(
      { error: 'Failed to get recommendation' },
      { status: 500 }
    );
  }
}

/**
 * Calculate fees for individual swaps (no batching)
 */
function calculateIndividualFees(swaps: SwapIntent[]): {
  baseFee: number;
  networkFee: number;
  serviceFee: number;
  discount: number;
  total: number;
} {
  let totalBaseFee = 0;
  let totalNetworkFee = 0;
  let totalServiceFee = 0;

  swaps.forEach((swap) => {
    const amount = parseFloat(swap.amount);

    // Base fee: 0.5% of amount
    const baseFee = amount * 0.005;

    // Min 0.05 XLM, Max 10 XLM
    const clampedFee = Math.max(0.05, Math.min(10, baseFee));

    totalBaseFee += clampedFee;
    totalNetworkFee += clampedFee / 2;
    totalServiceFee += clampedFee / 2;
  });

  return {
    baseFee: totalBaseFee,
    networkFee: totalNetworkFee,
    serviceFee: totalServiceFee,
    discount: 0,
    total: totalBaseFee,
  };
}

/**
 * Calculate fee for batched swaps (with discount)
 */
function calculateBatchFee(totalAmount: number, batchSize: number): {
  baseFee: number;
  networkFee: number;
  serviceFee: number;
  discount: number;
  total: number;
} {
  // Base fee: 0.5% of total amount
  const baseFee = totalAmount * 0.005;

  // Min 0.05 XLM, Max 10 XLM
  const clampedFee = Math.max(0.05, Math.min(10, baseFee));

  // Batch discount based on size
  const discountRate = getBatchDiscount(batchSize);
  const discount = clampedFee * discountRate;

  const finalFee = clampedFee - discount;

  return {
    baseFee: clampedFee,
    networkFee: finalFee / 2,
    serviceFee: finalFee / 2,
    discount,
    total: finalFee,
  };
}

/**
 * Get batch discount rate based on batch size
 */
function getBatchDiscount(batchSize: number): number {
  if (batchSize >= 10) return 0.50; // 50% discount
  if (batchSize >= 7) return 0.40;  // 40% discount
  if (batchSize >= 5) return 0.30;  // 30% discount
  if (batchSize >= 3) return 0.20;  // 20% discount
  if (batchSize >= 2) return 0.10;  // 10% discount
  return 0; // No discount for single swap
}

/**
 * Get recommended batch size
 */
function getRecommendedBatchSize(currentSize: number): number {
  // Sweet spot: 5-7 swaps (30-40% discount)
  if (currentSize < 3) return 3;
  if (currentSize < 5) return 5;
  return 7; // Max recommended
}

/**
 * Format fee breakdown for response
 */
function formatFeeBreakdown(fees: {
  baseFee: number;
  networkFee: number;
  serviceFee: number;
  discount: number;
  total: number;
}): FeeBreakdown {
  return {
    baseFee: fees.baseFee.toFixed(7),
    networkFee: fees.networkFee.toFixed(7),
    serviceFee: fees.serviceFee.toFixed(7),
    discount: fees.discount.toFixed(7),
    total: fees.total.toFixed(7),
  };
}
