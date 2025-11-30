interface MainnetPool {
    id: string;
    paging_token: string;
    fee_bp: number;
    type: string;
    total_trustlines: string;
    total_shares: string;
    reserves: Array<{
        amount: string;
        asset: string;
    }>;
    last_modified_ledger: number;
    last_modified_time: string;
}
interface DiscoveredToken {
    code: string;
    issuer: string;
    type: string;
    pools: number;
}
interface PoolAnalytics {
    totalPools: number;
    nativePools: number;
    tokenPools: number;
    totalTokens: number;
    tokens: Record<string, DiscoveredToken>;
    topPoolsByLiquidity: Array<{
        id: string;
        pairName: string;
        totalShares: string;
        reserves: any[];
    }>;
    poolsByCategory: {
        major: string[];
        stablecoin: string[];
        defi: string[];
        other: string[];
    };
}
export declare function fetchAllMainnetPools(): Promise<MainnetPool[]>;
export declare function analyzeMainnetPools(pools: MainnetPool[]): PoolAnalytics;
export declare function savePoolsToFile(pools: MainnetPool[], filename?: string): void;
export declare function saveAnalyticsReport(analytics: PoolAnalytics): void;
export declare function saveTokenList(analytics: PoolAnalytics): void;
export declare function printAnalyticsReport(analytics: PoolAnalytics): void;
export declare function discoverAndAnalyze(): Promise<{
    pools: MainnetPool[];
    analytics: PoolAnalytics;
} | undefined>;
export {};
