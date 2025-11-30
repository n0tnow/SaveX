#!/usr/bin/env ts-node
/**
 * Pool Sync Test Script
 * 
 * Bu script SHADOW_POOL_SIMULATION.md'de belirtilen pool'ları test eder:
 * 1. Mainnet'ten güncel pool verilerini çeker
 * 2. Testnet'te pool'ları oluşturur/günceller
 * 3. Sonuçları raporlar
 */

import { syncPools, startSyncService } from '../src/pool-sync-service.js';
import { syncMainnetPoolToTestnet } from '../src/testnet-pool-creator.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const TESTNET_SECRET_KEY = process.env.TESTNET_SECRET_KEY;
const POOLS_TO_TEST = ['XLM/USDC', 'XLM/AQUA'];

async function testMainnetDataFetch() {
  console.log('='.repeat(60));
  console.log('TEST 1: Mainnet Pool Verilerini Çekme');
  console.log('='.repeat(60));
  
  try {
    const state = await syncPools();
    console.log('\n[✓] Mainnet verileri başarıyla çekildi!');
    console.log(`   Toplam pool sayısı: ${Object.keys(state.pools).length}`);
    
    for (const [pairName, pool] of Object.entries(state.pools)) {
      console.log(`\n   ${pairName}:`);
      console.log(`     Pool ID: ${pool.poolId}`);
      console.log(`     Reserves:`, pool.reserves);
      console.log(`     Total Shares: ${pool.totalShares}`);
      console.log(`     Last Modified: ${pool.lastModified}`);
    }
    
    return true;
  } catch (error: any) {
    console.error('\n[✗] Mainnet veri çekme hatası:', error.message);
    return false;
  }
}

async function testTestnetPoolCreation() {
  console.log('\n' + '='.repeat(60));
  console.log('TEST 2: Testnet Pool Oluşturma/Güncelleme');
  console.log('='.repeat(60));
  
  if (!TESTNET_SECRET_KEY) {
    console.error('\n[✗] TESTNET_SECRET_KEY environment variable gerekli!');
    console.log('   Örnek: export TESTNET_SECRET_KEY="your_secret_key"');
    return false;
  }
  
  const results: Record<string, { success: boolean; error?: string }> = {};
  
  for (const pairName of POOLS_TO_TEST) {
    console.log(`\n[Testing] ${pairName}...`);
    
    try {
      const result = await syncMainnetPoolToTestnet(
        TESTNET_SECRET_KEY,
        pairName,
        false // İlk oluşturma
      );
      
      results[pairName] = { success: true };
      console.log(`[✓] ${pairName} başarıyla oluşturuldu/güncellendi`);
      console.log(`   Pool Address: ${result.poolAddress}`);
      console.log(`   Token A: ${result.tokenAAddress}`);
      console.log(`   Token B: ${result.tokenBAddress}`);
    } catch (error: any) {
      results[pairName] = { success: false, error: error.message };
      console.error(`[✗] ${pairName} hatası:`, error.message);
    }
  }
  
  return results;
}

async function testPoolUpdate() {
  console.log('\n' + '='.repeat(60));
  console.log('TEST 3: Mevcut Pool Güncelleme');
  console.log('='.repeat(60));
  
  if (!TESTNET_SECRET_KEY) {
    console.error('\n[✗] TESTNET_SECRET_KEY environment variable gerekli!');
    return false;
  }
  
  const poolStateFile = path.join(__dirname, '../data/testnet-pools.json');
  if (!fs.existsSync(poolStateFile)) {
    console.log('\n[⚠] Testnet pool state dosyası bulunamadı. Önce pool oluşturulmalı.');
    return false;
  }
  
  const testnetPools = JSON.parse(fs.readFileSync(poolStateFile, 'utf-8'));
  const existingPools = Object.keys(testnetPools);
  
  if (existingPools.length === 0) {
    console.log('\n[⚠] Testnet\'te mevcut pool yok. Önce pool oluşturulmalı.');
    return false;
  }
  
  console.log(`\n[Info] Mevcut pool'lar: ${existingPools.join(', ')}`);
  
  for (const pairName of existingPools) {
    console.log(`\n[Updating] ${pairName}...`);
    
    try {
      await syncMainnetPoolToTestnet(
        TESTNET_SECRET_KEY,
        pairName,
        true // Update-only mode
      );
      console.log(`[✓] ${pairName} başarıyla güncellendi`);
    } catch (error: any) {
      console.error(`[✗] ${pairName} güncelleme hatası:`, error.message);
    }
  }
  
  return true;
}

async function showCurrentState() {
  console.log('\n' + '='.repeat(60));
  console.log('MEVCUT DURUM');
  console.log('='.repeat(60));
  
  // Mainnet state
  const mainnetStateFile = path.join(__dirname, '../data/sync-state.json');
  if (fs.existsSync(mainnetStateFile)) {
    const mainnetState = JSON.parse(fs.readFileSync(mainnetStateFile, 'utf-8'));
    console.log('\n[Mainnet State]');
    console.log(`   Son sync: ${mainnetState.lastSync}`);
    console.log(`   Pool sayısı: ${Object.keys(mainnetState.pools).length}`);
  } else {
    console.log('\n[Mainnet State] Henüz sync yapılmamış');
  }
  
  // Testnet state
  const testnetStateFile = path.join(__dirname, '../data/testnet-pools.json');
  if (fs.existsSync(testnetStateFile)) {
    const testnetState = JSON.parse(fs.readFileSync(testnetStateFile, 'utf-8'));
    console.log('\n[Testnet State]');
    console.log(`   Pool sayısı: ${Object.keys(testnetState).length}`);
    for (const [pairName, pool] of Object.entries(testnetState as any)) {
      console.log(`   ${pairName}:`);
      console.log(`     Pool Address: ${(pool as any).poolAddress}`);
      console.log(`     Oluşturulma: ${(pool as any).createdAt}`);
      console.log(`     Son güncelleme: ${(pool as any).lastUpdated}`);
    }
  } else {
    console.log('\n[Testnet State] Henüz pool oluşturulmamış');
  }
}

async function runAllTests() {
  console.log('\n');
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║   SHADOW POOL SYNC TEST SUITE                           ║');
  console.log('║   SHADOW_POOL_SIMULATION.md Pool Testleri              ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log('');
  
  // Mevcut durumu göster
  await showCurrentState();
  
  // Test 1: Mainnet veri çekme
  const test1Result = await testMainnetDataFetch();
  if (!test1Result) {
    console.log('\n[✗] Test 1 başarısız. Devam edilemiyor.');
    process.exit(1);
  }
  
  // Test 2: Testnet pool oluşturma
  const test2Results = await testTestnetPoolCreation();
  const test2Success = Object.values(test2Results).every(r => r.success);
  
  // Test 3: Pool güncelleme
  const test3Result = await testPoolUpdate();
  
  // Özet
  console.log('\n' + '='.repeat(60));
  console.log('TEST ÖZETİ');
  console.log('='.repeat(60));
  console.log(`Test 1 (Mainnet Veri Çekme): ${test1Result ? '✓' : '✗'}`);
  console.log(`Test 2 (Pool Oluşturma): ${test2Success ? '✓' : '✗'}`);
  console.log(`Test 3 (Pool Güncelleme): ${test3Result ? '✓' : '✗'}`);
  
  // Son durum
  await showCurrentState();
  
  console.log('\n[✓] Testler tamamlandı!');
}

// CLI
if (import.meta.url === `file://${process.argv[1]}`) {
  const command = process.argv[2];
  
  switch (command) {
    case 'fetch':
      testMainnetDataFetch().then(() => process.exit(0));
      break;
    case 'create':
      testTestnetPoolCreation().then(() => process.exit(0));
      break;
    case 'update':
      testPoolUpdate().then(() => process.exit(0));
      break;
    case 'status':
      showCurrentState().then(() => process.exit(0));
      break;
    case 'all':
    default:
      runAllTests().then(() => process.exit(0));
      break;
  }
}

export { testMainnetDataFetch, testTestnetPoolCreation, testPoolUpdate, showCurrentState };

