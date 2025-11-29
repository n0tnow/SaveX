/**
 * SaveX Arbitrage Bot
 * Main entry point
 */

import { CONFIG } from './config.js';
import { monitorPools, detectArbitrage } from './monitor.js';

console.log('🤖 SaveX Arbitrage Bot Starting...\n');
console.log(`Network: ${CONFIG.network}`);
console.log(`Poll Interval: ${CONFIG.pollIntervalMs}ms`);
console.log(`Min Profit: ${CONFIG.minProfitPercent}%`);
console.log(`Max Trade: ${CONFIG.maxTradeAmountXlm} XLM`);
console.log(`Max Slippage: ${CONFIG.maxSlippagePercent}%\n`);

if (!CONFIG.botSecretKey) {
  console.error('❌ BOT_SECRET_KEY not set in .env file');
  console.error('   Generate a key with: stellar keys generate bot-wallet --network testnet');
  console.error('   Then add it to .env file\n');
  process.exit(1);
}

let iterationCount = 0;

async function mainLoop() {
  iterationCount++;
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`Iteration #${iterationCount} - ${new Date().toISOString()}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

  try {
    // Monitor pools
    const pools = await monitorPools();

    if (pools.length === 0) {
      console.log('\n⚠️  No pools available for monitoring');
      return;
    }

    // Detect arbitrage
    const opportunity = detectArbitrage(pools);

    if (opportunity) {
      console.log(`\n🚨 ARBITRAGE OPPORTUNITY DETECTED!`);
      console.log(`   Path: ${opportunity.path.join(' → ')}`);
      console.log(`   Expected Profit: ${opportunity.profitPercent.toFixed(2)}%`);
      console.log(`   Status: Execution not implemented yet`);
      // TODO: Implement trade execution
    } else {
      console.log(`\n✅ No profitable arbitrage opportunities found`);
    }
  } catch (error) {
    console.error(`\n❌ Error in main loop:`, error);
  }
}

// Run initial iteration
mainLoop();

// Set up interval
setInterval(mainLoop, CONFIG.pollIntervalMs);

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n👋 Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n\n👋 Shutting down gracefully...');
  process.exit(0);
});
