/**
 * SaveX Backend API
 * REST API for pool data and analytics
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { getPoolsData, getPoolById } from './pools.js';
import { startSyncService } from './pool-sync-service.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Get all pools
app.get('/api/pools', async (req, res) => {
  try {
    const pools = await getPoolsData();
    res.json({
      success: true,
      data: pools,
      count: pools.length,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('Error fetching pools:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Get specific pool by address
app.get('/api/pools/:address', async (req, res) => {
  try {
    const { address } = req.params;
    const pool = await getPoolById(address);

    if (!pool) {
      return res.status(404).json({
        success: false,
        error: 'Pool not found',
      });
    }

    res.json({
      success: true,
      data: pool,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('Error fetching pool:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Get pool statistics
app.get('/api/stats', async (req, res) => {
  try {
    const pools = await getPoolsData();

    const stats = {
      totalPools: pools.length,
      totalLiquidity: pools.reduce((sum, p) => sum + Number(p.reserve0) + Number(p.reserve1), 0),
      averagePrice: pools.reduce((sum, p) => sum + p.price, 0) / pools.length,
      lastUpdated: Math.max(...pools.map(p => p.lastUpdated)),
    };

    res.json({
      success: true,
      data: stats,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`\n🚀 SaveX Backend API`);
  console.log(`   Server running on http://localhost:${PORT}`);
  console.log(`   Network: ${process.env.NETWORK || 'testnet'}`);
  console.log(`\n📡 Available endpoints:`);
  console.log(`   GET  /health               - Health check`);
  console.log(`   GET  /api/pools            - Get all pools`);
  console.log(`   GET  /api/pools/:address   - Get specific pool`);
  console.log(`   GET  /api/stats            - Get statistics\n`);
  
  // Start pool sync service (sürekli çalışır)
  if (process.env.TESTNET_SECRET_KEY) {
    const syncInterval = parseInt(process.env.SYNC_INTERVAL_MINUTES || '5');
    console.log(`🔄 Starting Pool Sync Service...`);
    console.log(`   Interval: ${syncInterval} minutes`);
    console.log(`   Mainnet → Testnet pool synchronization active\n`);
    
    startSyncService(syncInterval).catch((error) => {
      console.error('❌ Pool sync service failed to start:', error);
    });
  } else {
    console.log(`⚠️  Pool sync service disabled (TESTNET_SECRET_KEY not set)\n`);
  }
});
