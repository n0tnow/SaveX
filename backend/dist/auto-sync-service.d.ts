interface SyncState {
    lastSync: string;
    syncCount: number;
    totalOpportunities: number;
    errors: number;
}
declare class AutoSyncService {
    private intervalId?;
    private syncState;
    private isRunning;
    constructor();
    private loadState;
    private saveState;
    performSync(): Promise<void>;
    start(): void;
    stop(): void;
    getStatus(): {
        isRunning: boolean;
        state: SyncState;
        nextSyncIn: string;
    };
}
export default AutoSyncService;
