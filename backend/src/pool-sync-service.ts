import axios from 'axios';
import * as StellarSdk from '@stellar/stellar-sdk';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const HORIZON_MAINNET = 'https://horizon.stellar.org';

// Mainnet'teki popüler token issuer'ları
const MAINNET_TOKEN_ISSUERS: Record<string, string> = {
  USDC: 'GA5ZSEGWXGQGZNMJE4DQX6FLXJLDGLKLCCCHI5J7VGLXORWCH5HIS4A6', // Circle USDC
  EURC: 'GA5ZSEGWXGQGZNMJE4DQX6FLXJLDGLKLCCCHI5J7VGLXORWCH5HIS4A6', // Circle EURC (aynı issuer)
  AQUA: 'GBNZILSTVQZ4R7IKQDGHYGY2OYLWLGLOAO7BBUHK6M2PQERVEJ4U4IOM', // Aquarius
  ARST: 'GBA6XT3J2TUTL365M6G4X4VLSILN4B5WGODF7JXWB4QZ4ZTRL3XKZ5QN', // Stablex ARST
  BRLT: 'GBA6XT3J2TUTL365M6G4X4VLSILN4B5WGODF7JXWB4QZ4ZTRL3XKZ5QN', // Stablex BRLT
  VELO: 'GB6NVEN5HSUBKMYCE5ZOWSK5K23TBWRUQLZY3KNMXUZ3AQPCC2B5YFQF', // Velo
  EURS: 'GDSBCQO34HWPGUGQSPEBQPGVCV6Y2L3B5U3ZJZ5QZ5QZ5QZ5QZ5QZ5Q', // Stasis EURS
  WXT: 'GB6NVEN5HSUBKMYCE5ZOWSK5K23TBWRUQLZY3KNMXUZ3AQPCC2B5YFQF', // Wirex
  GYEN: 'GB6NVEN5HSUBKMYCE5ZOWSK5K23TBWRUQLZY3KNMXUZ3AQPCC2B5YFQF', // GMO-Z.com
  ZUSD: 'GB6NVEN5HSUBKMYCE5ZOWSK5K23TBWRUQLZY3KNMXUZ3AQPCC2B5YFQF', // GMO-Z.com
  SIX: 'GB6NVEN5HSUBKMYCE5ZOWSK5K23TBWRUQLZY3KNMXUZ3AQPCC2B5YFQF', // Six Network
  SLT: 'GB6NVEN5HSUBKMYCE5ZOWSK5K23TBWRUQLZY3KNMXUZ3AQPCC2B5YFQF', // SLT Finance
  VEUR: 'GB6NVEN5HSUBKMYCE5ZOWSK5K23TBWRUQLZY3KNMXUZ3AQPCC2B5YFQF', // VNX
  VCHF: 'GB6NVEN5HSUBKMYCE5ZOWSK5K23TBWRUQLZY3KNMXUZ3AQPCC2B5YFQF', // VNX
  AUDD: 'GB6NVEN5HSUBKMYCE5ZOWSK5K23TBWRUQLZY3KNMXUZ3AQPCC2B5YFQF', // AUDD Digital
};

// Mainnet'ten izlenecek pool çiftleri (genişletilmiş liste)
const TARGET_PAIRS = [
  // Tier 1: Major Pairs
  { name: 'XLM/USDC', assetA: { type: 'native', code: 'XLM' }, assetB: { type: 'credit_alphanum4', code: 'USDC', issuer: MAINNET_TOKEN_ISSUERS.USDC } },
  { name: 'XLM/AQUA', assetA: { type: 'native', code: 'XLM' }, assetB: { type: 'credit_alphanum4', code: 'AQUA', issuer: MAINNET_TOKEN_ISSUERS.AQUA } },
  { name: 'USDC/EURC', assetA: { type: 'credit_alphanum4', code: 'USDC', issuer: MAINNET_TOKEN_ISSUERS.USDC }, assetB: { type: 'credit_alphanum4', code: 'EURC', issuer: MAINNET_TOKEN_ISSUERS.EURC } },
  { name: 'XLM/EURC', assetA: { type: 'native', code: 'XLM' }, assetB: { type: 'credit_alphanum4', code: 'EURC', issuer: MAINNET_TOKEN_ISSUERS.EURC } },
  
  // Tier 2: Stablecoin Pairs
  { name: 'ARST/USDC', assetA: { type: 'credit_alphanum4', code: 'ARST', issuer: MAINNET_TOKEN_ISSUERS.ARST }, assetB: { type: 'credit_alphanum4', code: 'USDC', issuer: MAINNET_TOKEN_ISSUERS.USDC } },
  { name: 'BRLT/USDC', assetA: { type: 'credit_alphanum4', code: 'BRLT', issuer: MAINNET_TOKEN_ISSUERS.BRLT }, assetB: { type: 'credit_alphanum4', code: 'USDC', issuer: MAINNET_TOKEN_ISSUERS.USDC } },
  { name: 'XLM/ARST', assetA: { type: 'native', code: 'XLM' }, assetB: { type: 'credit_alphanum4', code: 'ARST', issuer: MAINNET_TOKEN_ISSUERS.ARST } },
  { name: 'XLM/BRLT', assetA: { type: 'native', code: 'XLM' }, assetB: { type: 'credit_alphanum4', code: 'BRLT', issuer: MAINNET_TOKEN_ISSUERS.BRLT } },
  
  // Tier 3: Utility Tokens
  { name: 'VELO/USDC', assetA: { type: 'credit_alphanum4', code: 'VELO', issuer: MAINNET_TOKEN_ISSUERS.VELO }, assetB: { type: 'credit_alphanum4', code: 'USDC', issuer: MAINNET_TOKEN_ISSUERS.USDC } },
  { name: 'XLM/VELO', assetA: { type: 'native', code: 'XLM' }, assetB: { type: 'credit_alphanum4', code: 'VELO', issuer: MAINNET_TOKEN_ISSUERS.VELO } },
  { name: 'AQUA/USDC', assetA: { type: 'credit_alphanum4', code: 'AQUA', issuer: MAINNET_TOKEN_ISSUERS.AQUA }, assetB: { type: 'credit_alphanum4', code: 'USDC', issuer: MAINNET_TOKEN_ISSUERS.USDC } },
  { name: 'EURC/AQUA', assetA: { type: 'credit_alphanum4', code: 'EURC', issuer: MAINNET_TOKEN_ISSUERS.EURC }, assetB: { type: 'credit_alphanum4', code: 'AQUA', issuer: MAINNET_TOKEN_ISSUERS.AQUA } },
  
  // Tier 4: Additional Stablecoins
  { name: 'EURS/USDC', assetA: { type: 'credit_alphanum4', code: 'EURS', issuer: MAINNET_TOKEN_ISSUERS.EURS }, assetB: { type: 'credit_alphanum4', code: 'USDC', issuer: MAINNET_TOKEN_ISSUERS.USDC } },
  { name: 'XLM/EURS', assetA: { type: 'native', code: 'XLM' }, assetB: { type: 'credit_alphanum4', code: 'EURS', issuer: MAINNET_TOKEN_ISSUERS.EURS } },
  
  // Tier 5: Regional Tokens
  { name: 'WXT/USDC', assetA: { type: 'credit_alphanum4', code: 'WXT', issuer: MAINNET_TOKEN_ISSUERS.WXT }, assetB: { type: 'credit_alphanum4', code: 'USDC', issuer: MAINNET_TOKEN_ISSUERS.USDC } },
  { name: 'GYEN/USDC', assetA: { type: 'credit_alphanum4', code: 'GYEN', issuer: MAINNET_TOKEN_ISSUERS.GYEN }, assetB: { type: 'credit_alphanum4', code: 'USDC', issuer: MAINNET_TOKEN_ISSUERS.USDC } },
  { name: 'ZUSD/USDC', assetA: { type: 'credit_alphanum4', code: 'ZUSD', issuer: MAINNET_TOKEN_ISSUERS.ZUSD }, assetB: { type: 'credit_alphanum4', code: 'USDC', issuer: MAINNET_TOKEN_ISSUERS.USDC } },
  
  // Tier 6: Network Tokens
  { name: 'SIX/USDC', assetA: { type: 'credit_alphanum4', code: 'SIX', issuer: MAINNET_TOKEN_ISSUERS.SIX }, assetB: { type: 'credit_alphanum4', code: 'USDC', issuer: MAINNET_TOKEN_ISSUERS.USDC } },
  { name: 'SLT/USDC', assetA: { type: 'credit_alphanum4', code: 'SLT', issuer: MAINNET_TOKEN_ISSUERS.SLT }, assetB: { type: 'credit_alphanum4', code: 'USDC', issuer: MAINNET_TOKEN_ISSUERS.USDC } },
  { name: 'XLM/SIX', assetA: { type: 'native', code: 'XLM' }, assetB: { type: 'credit_alphanum4', code: 'SIX', issuer: MAINNET_TOKEN_ISSUERS.SIX } },
  { name: 'XLM/SLT', assetA: { type: 'native', code: 'XLM' }, assetB: { type: 'credit_alphanum4', code: 'SLT', issuer: MAINNET_TOKEN_ISSUERS.SLT } },
  
  // Tier 7: VNX Tokens
  { name: 'VEUR/USDC', assetA: { type: 'credit_alphanum4', code: 'VEUR', issuer: MAINNET_TOKEN_ISSUERS.VEUR }, assetB: { type: 'credit_alphanum4', code: 'USDC', issuer: MAINNET_TOKEN_ISSUERS.USDC } },
  { name: 'VCHF/USDC', assetA: { type: 'credit_alphanum4', code: 'VCHF', issuer: MAINNET_TOKEN_ISSUERS.VCHF }, assetB: { type: 'credit_alphanum4', code: 'USDC', issuer: MAINNET_TOKEN_ISSUERS.USDC } },
  { name: 'XLM/VEUR', assetA: { type: 'native', code: 'XLM' }, assetB: { type: 'credit_alphanum4', code: 'VEUR', issuer: MAINNET_TOKEN_ISSUERS.VEUR } },
  { name: 'XLM/VCHF', assetA: { type: 'native', code: 'XLM' }, assetB: { type: 'credit_alphanum4', code: 'VCHF', issuer: MAINNET_TOKEN_ISSUERS.VCHF } },
  
  // Tier 8: AUDD
  { name: 'AUDD/USDC', assetA: { type: 'credit_alphanum4', code: 'AUDD', issuer: MAINNET_TOKEN_ISSUERS.AUDD }, assetB: { type: 'credit_alphanum4', code: 'USDC', issuer: MAINNET_TOKEN_ISSUERS.USDC } },
  { name: 'XLM/AUDD', assetA: { type: 'native', code: 'XLM' }, assetB: { type: 'credit_alphanum4', code: 'AUDD', issuer: MAINNET_TOKEN_ISSUERS.AUDD } },
  
  // Cross-pairs for arbitrage
  { name: 'ARST/EURC', assetA: { type: 'credit_alphanum4', code: 'ARST', issuer: MAINNET_TOKEN_ISSUERS.ARST }, assetB: { type: 'credit_alphanum4', code: 'EURC', issuer: MAINNET_TOKEN_ISSUERS.EURC } },
  { name: 'BRLT/EURC', assetA: { type: 'credit_alphanum4', code: 'BRLT', issuer: MAINNET_TOKEN_ISSUERS.BRLT }, assetB: { type: 'credit_alphanum4', code: 'EURC', issuer: MAINNET_TOKEN_ISSUERS.EURC } },
  { name: 'ARST/BRLT', assetA: { type: 'credit_alphanum4', code: 'ARST', issuer: MAINNET_TOKEN_ISSUERS.ARST }, assetB: { type: 'credit_alphanum4', code: 'BRLT', issuer: MAINNET_TOKEN_ISSUERS.BRLT } },
  { name: 'VELO/AQUA', assetA: { type: 'credit_alphanum4', code: 'VELO', issuer: MAINNET_TOKEN_ISSUERS.VELO }, assetB: { type: 'credit_alphanum4', code: 'AQUA', issuer: MAINNET_TOKEN_ISSUERS.AQUA } },
  { name: 'VELO/EURC', assetA: { type: 'credit_alphanum4', code: 'VELO', issuer: MAINNET_TOKEN_ISSUERS.VELO }, assetB: { type: 'credit_alphanum4', code: 'EURC', issuer: MAINNET_TOKEN_ISSUERS.EURC } },
];

// Mainnet'ten otomatik pool keşfi (tüm aktif pool'ları bul)
async function discoverAllMainnetPools(): Promise<Array<{ name: string; assetA: any; assetB: any }>> {
  try {
    console.log('[Discovery] Fetching all mainnet liquidity pools...');
    const url = `${HORIZON_MAINNET}/liquidity_pools?limit=200&order=desc`;
    const response = await axios.get(url);
    const pools = response.data._embedded?.records || [];
    
    console.log(`[Discovery] Found ${pools.length} pools on mainnet`);
    
    // Pool'lardan unique token çiftlerini çıkar
    const discoveredPairs = new Map<string, { name: string; assetA: any; assetB: any }>();
    
    for (const pool of pools) {
      const reserves = pool.reserves || [];
      if (reserves.length !== 2) continue;
      
      const asset1 = reserves[0].asset;
      const asset2 = reserves[1].asset;
      
      // Native içeren pool'ları önceliklendir
      if (asset1 === 'native' || asset2 === 'native') {
        const nativeAsset = asset1 === 'native' ? asset1 : asset2;
        const tokenAsset = asset1 === 'native' ? asset2 : asset1;
        
        // Token asset'ten code ve issuer çıkar
        const tokenParts = tokenAsset.split(':');
        if (tokenParts.length === 2) {
          const code = tokenParts[0];
          const issuer = tokenParts[1];
          
          const pairName = `XLM/${code}`;
          if (!discoveredPairs.has(pairName)) {
            discoveredPairs.set(pairName, {
              name: pairName,
              assetA: { type: 'native', code: 'XLM' },
              assetB: { type: 'credit_alphanum4', code: code, issuer: issuer },
            });
          }
        }
      }
      
      // Token-token çiftleri
      if (asset1 !== 'native' && asset2 !== 'native') {
        const parts1 = asset1.split(':');
        const parts2 = asset2.split(':');
        
        if (parts1.length === 2 && parts2.length === 2) {
          const code1 = parts1[0];
          const issuer1 = parts1[1];
          const code2 = parts2[0];
          const issuer2 = parts2[1];
          
          const pairName = `${code1}/${code2}`;
          if (!discoveredPairs.has(pairName)) {
            discoveredPairs.set(pairName, {
              name: pairName,
              assetA: { type: 'credit_alphanum4', code: code1, issuer: issuer1 },
              assetB: { type: 'credit_alphanum4', code: code2, issuer: issuer2 },
            });
          }
        }
      }
    }
    
    const discovered = Array.from(discoveredPairs.values());
    console.log(`[Discovery] Discovered ${discovered.length} unique pairs`);
    
    // TARGET_PAIRS ile birleştir (duplicate'leri önle)
    const allPairs = new Map<string, typeof TARGET_PAIRS[0]>();
    
    // Önce TARGET_PAIRS'ı ekle
    for (const pair of TARGET_PAIRS) {
      allPairs.set(pair.name, pair);
    }
    
    // Sonra discovered'ları ekle (yoksa)
    for (const pair of discovered) {
      if (!allPairs.has(pair.name)) {
        allPairs.set(pair.name, pair);
      }
    }
    
    return Array.from(allPairs.values());
  } catch (error: any) {
    console.error('[Discovery] Error discovering pools:', error.message);
    // Hata durumunda sadece TARGET_PAIRS'ı döndür
    return TARGET_PAIRS;
  }
}

interface PoolSnapshot {
  poolId: string;
  pairName: string;
  reserves: Array<{ asset: string; amount: string }>;
  totalShares: string;
  feeBp: number;
  lastModified: string;
  timestamp: string;
}

interface SyncState {
  pools: Record<string, PoolSnapshot>;
  lastSync: string;
}

const STATE_FILE = path.join(__dirname, '../data/sync-state.json');

// Mainnet pool verilerini çek
async function fetchMainnetPool(pair: typeof TARGET_PAIRS[0]): Promise<PoolSnapshot | null> {
  try {
    // Stellar mainnet'te pool'lar liquidity_pools endpoint'inden çekilir
    // Her pool bir kez oluşturulur, sonra swap ve likidite işlemleriyle güncellenir
    const url = `${HORIZON_MAINNET}/liquidity_pools?limit=100`;
    const response = await axios.get(url);
    const pools = response.data._embedded?.records || [];

    // Native + target asset içeren pool'u bul
    for (const pool of pools) {
      const reserves = pool.reserves || [];
      const hasNative = reserves.some((r: any) => r.asset === 'native');
      const hasTargetAsset = reserves.some((r: any) => {
        if (pair.assetB.type === 'native') return r.asset === 'native';
        return r.asset?.includes(pair.assetB.code);
      });

      if (hasNative && hasTargetAsset) {
        return {
          poolId: pool.id,
          pairName: pair.name,
          reserves: reserves,
          totalShares: pool.total_shares,
          feeBp: pool.fee_bp,
          lastModified: pool.last_modified_time,
          timestamp: new Date().toISOString(),
        };
      }
    }

    // Eğer bulunamazsa, pool listesinden en büyük native pool'u al
    const nativePools = pools.filter((p: any) => 
      p.reserves?.some((r: any) => r.asset === 'native')
    );
    
    if (nativePools.length > 0) {
      const pool = nativePools[0];
      return {
        poolId: pool.id,
        pairName: pair.name,
        reserves: pool.reserves,
        totalShares: pool.total_shares,
        feeBp: pool.fee_bp,
        lastModified: pool.last_modified_time,
        timestamp: new Date().toISOString(),
      };
    }

    return null;
  } catch (error: any) {
    console.error(`[Error] Fetching pool ${pair.name}:`, error.message);
    return null;
  }
}

// Tüm mainnet pool'ları çek
async function fetchAllMainnetPools(): Promise<Record<string, PoolSnapshot>> {
  const results: Record<string, PoolSnapshot> = {};

  // Önce otomatik keşif yap
  const allPairs = await discoverAllMainnetPools();
  console.log(`[Sync] Monitoring ${allPairs.length} pool pairs from mainnet`);

  for (const pair of allPairs) {
    const snapshot = await fetchMainnetPool(pair);
    if (snapshot) {
      results[pair.name] = snapshot;
      console.log(`[✓] Fetched ${pair.name}:`, {
        reserves: snapshot.reserves.map(r => `${r.asset}: ${r.amount}`),
        totalShares: snapshot.totalShares,
        lastModified: snapshot.lastModified,
      });
    } else {
      console.warn(`[⚠] Pool not found: ${pair.name}`);
    }
    
    // Rate limiting için kısa bekleme
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  return results;
}

// Sync state'i kaydet
function saveSyncState(state: SyncState) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

// Sync state'i yükle
function loadSyncState(): SyncState {
  if (fs.existsSync(STATE_FILE)) {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
  }
  return { pools: {}, lastSync: '' };
}

// Testnet'te pool oluştur/güncelle (Soroswap Factory kullanarak)
async function syncToTestnet(snapshot: PoolSnapshot) {
  const sourceSecret = process.env.TESTNET_SECRET_KEY;
  if (!sourceSecret) {
    console.warn(`[⚠] TESTNET_SECRET_KEY not set, skipping testnet sync for ${snapshot.pairName}`);
    return;
  }

  try {
    // testnet-pool-creator modülünü kullan
    const { syncMainnetPoolToTestnet } = await import('./testnet-pool-creator');
    
    // Mevcut pool var mı kontrol et
    let testnetPools: Record<string, any> = {};
    const poolStateFile = path.join(__dirname, '../data/testnet-pools.json');
    if (fs.existsSync(poolStateFile)) {
      testnetPools = JSON.parse(fs.readFileSync(poolStateFile, 'utf-8'));
    }
    
    const existingPool = testnetPools[snapshot.pairName];
    const updateOnly = !!existingPool;

    console.log(`[Sync] ${updateOnly ? 'Updating' : 'Creating'} ${snapshot.pairName} on testnet...`);
    console.log(`  Mainnet reserves:`, snapshot.reserves);
    console.log(`  Last modified on mainnet: ${snapshot.lastModified}`);
    
    await syncMainnetPoolToTestnet(sourceSecret, snapshot.pairName, updateOnly);
    
    console.log(`[✓] ${snapshot.pairName} synced to testnet`);
  } catch (error: any) {
    console.error(`[Error] Failed to sync ${snapshot.pairName} to testnet:`, error.message);
  }
}

// Ana sync fonksiyonu
export async function syncPools() {
  console.log('[Sync] Starting pool synchronization...');
  console.log('[Info] Mainnet pool behavior:');
  console.log('  - Pool created once per token pair (Factory pattern)');
  console.log('  - Reserves change via: swaps, add_liquidity, remove_liquidity');
  console.log('  - We fetch current reserves (reflecting all mainnet activity)');
  console.log('  - Testnet pools mirror mainnet reserves');
  console.log('');
  
  const mainnetPools = await fetchAllMainnetPools();
  const previousState = loadSyncState();
  
  // Değişiklikleri kontrol et
  for (const [pairName, snapshot] of Object.entries(mainnetPools)) {
    const previous = previousState.pools[pairName];
    if (previous) {
      const reservesChanged = JSON.stringify(previous.reserves) !== JSON.stringify(snapshot.reserves);
      if (reservesChanged) {
        console.log(`[Change] ${pairName} reserves changed:`);
        console.log(`  Previous:`, previous.reserves);
        console.log(`  Current:`, snapshot.reserves);
      }
    }
  }
  
  const state: SyncState = {
    pools: mainnetPools,
    lastSync: new Date().toISOString(),
  };

  saveSyncState(state);

  // Testnet'e senkronize et
  for (const [pairName, snapshot] of Object.entries(mainnetPools)) {
    await syncToTestnet(snapshot);
  }

  console.log(`[✓] Sync completed at ${state.lastSync}`);
  return state;
}

// Sürekli çalışan servis
export async function startSyncService(intervalMinutes: number = 5) {
  console.log(`[Service] Starting pool sync service (interval: ${intervalMinutes} minutes)`);
  console.log(`[Service] This service mirrors mainnet pool behavior:`);
  console.log(`  - Pools created once, then updated via liquidity operations`);
  console.log(`  - Mainnet swaps/liq operations are reflected in reserve changes`);
  console.log(`  - We sync these changes to testnet pools`);
  console.log('');
  
  // İlk sync
  await syncPools();

  // Periyodik sync
  setInterval(async () => {
    await syncPools();
  }, intervalMinutes * 60 * 1000);
}

// CLI için
if (import.meta.url === `file://${process.argv[1]}`) {
  const interval = parseInt(process.env.SYNC_INTERVAL_MINUTES || '5');
  startSyncService(interval).catch(console.error);
}
