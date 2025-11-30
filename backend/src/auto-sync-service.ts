import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { fetchPricesForSelectedPools } from './coingecko-service.js';
import { detectAllArbitrageOpportunities, saveArbitrageOpportunities } from './arbitrage-engine.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DATA_DIR = path.join(__dirname, '../data');
const SYNC_INTERVAL_MS = 5 * 60 * 1000; // 5 dakika

interface SyncState {
    lastSync: string;
    syncCount: number;
    totalOpportunities: number;
    errors: number;
}

class AutoSyncService {
    private intervalId?: NodeJS.Timeout;
    private syncState: SyncState;
    private isRunning = false;

    constructor() {
        this.syncState = this.loadState();
    }

    private loadState(): SyncState {
        const statePath = path.join(DATA_DIR, 'auto_sync_state.json');
        if (fs.existsSync(statePath)) {
            return JSON.parse(fs.readFileSync(statePath, 'utf-8'));
        }
        return {
            lastSync: '',
            syncCount: 0,
            totalOpportunities: 0,
            errors: 0,
        };
    }

    private saveState() {
        const statePath = path.join(DATA_DIR, 'auto_sync_state.json');
        fs.writeFileSync(statePath, JSON.stringify(this.syncState, null, 2));
    }

    async performSync() {
        if (this.isRunning) {
            console.log('[AutoSync] ⚠️  Previous sync still running, skipping...');
            return;
        }

        this.isRunning = true;
        const startTime = Date.now();

        console.log('\n' + '='.repeat(70));
        console.log(`[AutoSync] Starting sync #${this.syncState.syncCount + 1}`);
        console.log(`[AutoSync] Time: ${new Date().toISOString()}`);
        console.log('='.repeat(70));

        try {
            // 1. Fetch external prices
            console.log('\n[AutoSync] Step 1/2: Fetching external prices...');
            const externalPrices = await fetchPricesForSelectedPools();
            console.log(`[AutoSync] ✓ Fetched ${Object.keys(externalPrices).length} prices`);

            // 2. Detect arbitrage opportunities
            console.log('\n[AutoSync] Step 2/2: Detecting arbitrage opportunities...');
            const opportunities = await detectAllArbitrageOpportunities();
            saveArbitrageOpportunities(opportunities);
            console.log(`[AutoSync] ✓ Found ${opportunities.length} opportunities`);

            // Update state
            this.syncState.lastSync = new Date().toISOString();
            this.syncState.syncCount++;
            this.syncState.totalOpportunities = opportunities.length;
            this.saveState();

            const duration = ((Date.now() - startTime) / 1000).toFixed(2);
            console.log('\n' + '='.repeat(70));
            console.log(`[AutoSync] ✅ Sync completed in ${duration}s`);
            console.log(`[AutoSync] Next sync in 5 minutes...`);
            console.log('='.repeat(70) + '\n');
        } catch (error: any) {
            console.error('\n[AutoSync] ❌ Sync failed:', error.message);
            this.syncState.errors++;
            this.saveState();
        } finally {
            this.isRunning = false;
        }
    }

    start() {
        console.log('\n🚀 SaveX Auto-Sync Service Starting...');
        console.log('='.repeat(70));
        console.log(`   Sync Interval: ${SYNC_INTERVAL_MS / 1000 / 60} minutes`);
        console.log(`   Previous Syncs: ${this.syncState.syncCount}`);
        console.log(`   Last Sync: ${this.syncState.lastSync || 'Never'}`);
        console.log('='.repeat(70) + '\n');

        // İlk sync'i hemen yap
        this.performSync();

        // Periyodik sync başlat
        this.intervalId = setInterval(() => {
            this.performSync();
        }, SYNC_INTERVAL_MS);

        console.log('[AutoSync] ✓ Service started successfully\n');
    }

    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = undefined;
        }
        console.log('[AutoSync] Service stopped');
    }

    getStatus() {
        return {
            isRunning: this.isRunning,
            state: this.syncState,
            nextSyncIn: this.intervalId ? `${SYNC_INTERVAL_MS / 1000 / 60} minutes` : 'Not scheduled',
        };
    }
}

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n[AutoSync] Received SIGINT, shutting down gracefully...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n[AutoSync] Received SIGTERM, shutting down gracefully...');
    process.exit(0);
});

// CLI
if (import.meta.url === `file://${process.argv[1]}`) {
    const service = new AutoSyncService();
    service.start();

    // Keep process alive
    process.stdin.resume();
}

export default AutoSyncService;
