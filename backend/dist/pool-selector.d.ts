interface PoolScore {
    poolId: string;
    pairName: string;
    totalScore: number;
    liquidityScore: number;
    popularityScore: number;
    activityScore: number;
    category: 'major' | 'stablecoin' | 'defi' | 'longtail';
    totalShares: string;
    lastModified: string;
    reserves: any[];
}
interface SelectionResult {
    selectedPools: PoolScore[];
    statistics: {
        total: number;
        major: number;
        stablecoin: number;
        defi: number;
        longtail: number;
    };
    timestamp: string;
}
export declare function selectTop500Pools(): Promise<SelectionResult>;
export declare function saveSelectedPools(result: SelectionResult): void;
export {};
