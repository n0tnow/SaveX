interface PoolSnapshot {
    poolId: string;
    pairName: string;
    reserves: Array<{
        asset: string;
        amount: string;
    }>;
    totalShares: string;
    feeBp: number;
    lastModified: string;
    timestamp: string;
}
interface SyncState {
    pools: Record<string, PoolSnapshot>;
    lastSync: string;
}
export declare function syncPools(): Promise<SyncState>;
export declare function startSyncService(intervalMinutes?: number): Promise<void>;
export {};
