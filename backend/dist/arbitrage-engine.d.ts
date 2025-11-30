export interface ArbitrageOpportunity {
    type: 'direct' | 'triangular' | 'cross-dex';
    pairName: string;
    profitPercent: number;
    estimatedProfit: number;
    mainnetPrice: number;
    externalPrice: number;
    path?: string[];
    poolId: string;
    timestamp: string;
    confidence: 'high' | 'medium' | 'low';
}
export declare function detectAllArbitrageOpportunities(): Promise<ArbitrageOpportunity[]>;
export declare function saveArbitrageOpportunities(opportunities: ArbitrageOpportunity[]): void;
