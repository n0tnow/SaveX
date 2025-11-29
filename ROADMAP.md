# SaveX Project Roadmap

## 📋 Project Overview
SaveX is a DeFi protocol on Stellar Soroban that provides:
- Token swaps with automatic routing optimization
- Scheduled transfers
- Package subscriptions for fee discounts
- Batch transfers
- Arbitrage opportunities

---

## ✅ Completed Features

### Smart Contracts (Rust/Soroban)
- [x] Core SaveX contract structure
- [x] Transfer operations (immediate, scheduled, split, batch)
- [x] Package subscription system
- [x] Swap integration with Soroswap router
- [x] Fee calculation and discounts

### Frontend (Next.js 15 + React 19)
- [x] Wallet connection with Freighter
- [x] Real-time balance fetching (XLM & Soroban tokens)
- [x] Token swap interface
- [x] Immediate transfers
- [x] Scheduled transfers
- [x] Package subscriptions
- [x] Batch manager
- [x] Modern UI/UX with improved colors and typography
- [x] Real Soroban RPC integration
- [x] Transaction simulation
- [x] No mock data - all real blockchain data

### Infrastructure
- [x] Stellar Testnet integration
- [x] Soroban RPC calls
- [x] Transaction building and signing
- [x] ScVal encoding/decoding

---

## 🚧 In Progress

### 1. Market Data & Analytics API
**Status:** 🔴 Not Started
**Priority:** HIGH

#### Requirements:
- [ ] Integrate Stellar DEX aggregator API (e.g., StellarExpert, StellarTerm API)
- [ ] Fetch 30-day historical trade data
- [ ] Cache market data with Redis/Upstash (TTL: 10 minutes)
- [ ] Calculate hourly volatility patterns
- [ ] Identify best trading hours based on spread analysis
- [ ] Real-time price feed integration

#### Implementation Plan:
```typescript
// File: /api/market-data/route.ts
// - Fetch from StellarExpert API: https://api.stellar.expert/explorer/testnet/market/{pair}
// - Store in Redis with 10min TTL
// - Calculate volatility metrics
// - Return timing recommendations
```

**Estimated Time:** 2-3 days

---

### 2. Contract Deployment & Testing
**Status:** 🔴 Not Started
**Priority:** CRITICAL

#### Contracts to Deploy:
- [ ] SaveX Main Contract (`savex_contract`)
- [ ] Test Token Contracts (for testing purposes)
- [ ] Verify integration with Soroswap Router

#### Deployment Steps:
1. **Build Contracts:**
   ```bash
   cd contracts/savex_contract
   cargo build --target wasm32-unknown-unknown --release
   stellar contract optimize --wasm target/wasm32-unknown-unknown/release/savex_contract.wasm
   ```

2. **Deploy to Testnet:**
   ```bash
   stellar contract deploy \
     --wasm target/wasm32-unknown-unknown/release/savex_contract.wasm \
     --source ADMIN_SECRET_KEY \
     --network testnet
   ```

3. **Initialize Contract:**
   ```bash
   stellar contract invoke \
     --id CONTRACT_ID \
     --source ADMIN_SECRET_KEY \
     --network testnet \
     -- initialize \
     --router SOROSWAP_ROUTER_ADDRESS
   ```

4. **Test All Functions:**
   - [ ] `transfer_immediate`
   - [ ] `transfer_scheduled`
   - [ ] `transfer_with_swap`
   - [ ] `subscribe_package`
   - [ ] `estimate_swap_output`
   - [ ] `get_swap_path`

**Estimated Time:** 1-2 days

---

### 3. Multi-Token Support
**Status:** 🔴 Not Started
**Priority:** HIGH

#### Current Tokens:
- XLM (Native)
- USDC (Soroban Token)

#### Tokens to Add:
Research Stellar Testnet liquidity pools and add support for:

- [ ] **AQUA** (Aquarius token)
- [ ] **yXLM** (Ultra Stellar yield-bearing XLM)
- [ ] **EURC** (Euro Coin)
- [ ] **Other SAC tokens with liquidity**

#### Research Required:
```bash
# Query Stellar Testnet for liquid pools
stellar contract invoke \
  --id SOROSWAP_FACTORY \
  --network testnet \
  -- all_pools

# For each pool, check:
# 1. Reserve amounts
# 2. Trading volume
# 3. Fee structure
```

#### File to Create:
`/home/bkaya/SaveX/LIQUIDITY_POOLS.md`

**Format:**
```markdown
# Stellar Testnet Liquidity Pools

## Soroswap Pools

### XLM/USDC
- **Pool Address:** CA...
- **Reserve XLM:** 1,000,000
- **Reserve USDC:** 500,000
- **TVL:** $1,500,000
- **24h Volume:** $50,000
- **Fee:** 0.3%
- **Status:** ✅ Active

### XLM/AQUA
- **Pool Address:** CB...
- [similar details]
```

**Estimated Time:** 2-3 days

---

### 4. Arbitrage Bot
**Status:** 🔴 Not Started
**Priority:** MEDIUM

#### Bot Requirements:
- Monitor price differences across pools
- Execute profitable arbitrage trades automatically
- Risk management (slippage limits, max trade size)
- Profit tracking and reporting

#### Architecture:
```
┌─────────────────────────────────────────┐
│         Arbitrage Bot (Node.js)          │
│                                          │
│  ┌────────────────────────────────────┐ │
│  │   Pool Monitor Service              │ │
│  │   - Query all pools every 5s       │ │
│  │   - Calculate price differentials   │ │
│  └────────────────────────────────────┘ │
│                                          │
│  ┌────────────────────────────────────┐ │
│  │   Arbitrage Detection               │ │
│  │   - Find profitable paths          │ │
│  │   - Calculate expected profit      │ │
│  └────────────────────────────────────┘ │
│                                          │
│  ┌────────────────────────────────────┐ │
│  │   Trade Execution                   │ │
│  │   - Build swap transaction         │ │
│  │   - Sign & submit                  │ │
│  │   - Verify profit                  │ │
│  └────────────────────────────────────┘ │
│                                          │
│  ┌────────────────────────────────────┐ │
│  │   Risk Management                   │ │
│  │   - Max slippage: 2%               │ │
│  │   - Max trade size: 1000 XLM       │ │
│  │   - Min profit threshold: 0.5%     │ │
│  └────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

#### File Structure:
```
/arbitrage-bot/
├── src/
│   ├── monitor.ts       # Pool monitoring
│   ├── detector.ts      # Arbitrage detection
│   ├── executor.ts      # Trade execution
│   ├── risk.ts          # Risk management
│   └── index.ts         # Main bot loop
├── package.json
└── tsconfig.json
```

**Estimated Time:** 4-5 days

---

### 5. Backend Pool Monitoring Service
**Status:** 🔴 Not Started
**Priority:** MEDIUM

#### Service Requirements:
- REST API for pool data
- WebSocket for real-time updates
- Database for historical data
- Caching layer (Redis)

#### Architecture:
```
┌─────────────────────────────────────────┐
│      Pool Monitoring Backend             │
│                                          │
│  ┌────────────────────────────────────┐ │
│  │   API Server (Express/Fastify)      │ │
│  │   - GET /api/pools                 │ │
│  │   - GET /api/pools/:id             │ │
│  │   - WS /ws/pools                   │ │
│  └────────────────────────────────────┘ │
│                                          │
│  ┌────────────────────────────────────┐ │
│  │   Data Collector (Cron Job)         │ │
│  │   - Runs every 10 seconds          │ │
│  │   - Queries all Soroswap pools     │ │
│  │   - Stores in PostgreSQL           │ │
│  └────────────────────────────────────┘ │
│                                          │
│  ┌────────────────────────────────────┐ │
│  │   Cache Layer (Redis)               │ │
│  │   - TTL: 10 seconds                │ │
│  │   - Pool reserves                  │ │
│  │   - Price data                     │ │
│  └────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

#### File Structure:
```
/backend/
├── src/
│   ├── api/
│   │   ├── routes/
│   │   │   ├── pools.ts
│   │   │   └── stats.ts
│   │   └── server.ts
│   ├── collectors/
│   │   └── pool-collector.ts
│   ├── db/
│   │   ├── schema.sql
│   │   └── client.ts
│   └── index.ts
├── package.json
└── docker-compose.yml
```

**Estimated Time:** 3-4 days

---

## 📊 Additional Features to Implement

### 6. Enhanced Frontend Features
- [ ] **Portfolio Dashboard**
  - Total value locked
  - Transaction history
  - P&L tracking

- [ ] **Advanced Charts**
  - Price charts (TradingView integration)
  - Volume charts
  - Liquidity depth

- [ ] **Transaction History**
  - Filter by type
  - Export to CSV
  - Detailed transaction view

- [ ] **Notifications**
  - Transaction confirmations
  - Price alerts
  - Arbitrage opportunities

**Estimated Time:** 5-6 days

---

### 7. Testing & Quality Assurance
- [ ] Unit tests for contracts (Rust)
- [ ] Integration tests for API
- [ ] E2E tests for frontend
- [ ] Load testing for backend
- [ ] Security audit

**Estimated Time:** 3-4 days

---

### 8. Documentation
- [ ] API documentation (OpenAPI/Swagger)
- [ ] Contract documentation
- [ ] User guide
- [ ] Developer guide
- [ ] Deployment guide

**Estimated Time:** 2-3 days

---

## 🗂️ Files to Create/Update

### New Files Needed:
1. ✅ `/home/bkaya/SaveX/ROADMAP.md` (this file)
2. 🔴 `/home/bkaya/SaveX/LIQUIDITY_POOLS.md`
3. 🔴 `/home/bkaya/SaveX/CONTRACT_DEPLOYMENT.md`
4. 🔴 `/home/bkaya/SaveX/arbitrage-bot/` (entire directory)
5. 🔴 `/home/bkaya/SaveX/backend/` (entire directory)
6. 🔴 `/home/bkaya/SaveX/savex-ui/app/api/market-data/route.ts`
7. 🔴 `/home/bkaya/SaveX/savex-ui/lib/tokens.ts` (extended token list)

---

## 📅 Timeline Estimates

| Phase | Duration | Status |
|-------|----------|--------|
| Market Data API | 2-3 days | 🔴 Not Started |
| Contract Deployment | 1-2 days | 🔴 Not Started |
| Multi-Token Support | 2-3 days | 🔴 Not Started |
| Arbitrage Bot | 4-5 days | 🔴 Not Started |
| Backend Service | 3-4 days | 🔴 Not Started |
| Enhanced Frontend | 5-6 days | 🔴 Not Started |
| Testing & QA | 3-4 days | 🔴 Not Started |
| Documentation | 2-3 days | 🔴 Not Started |
| **Total** | **22-30 days** | |

---

## 🎯 Next Immediate Steps

### Week 1: Core Infrastructure
1. Research Stellar DEX liquidity pools
2. Create LIQUIDITY_POOLS.md
3. Deploy SaveX contracts to testnet
4. Implement market data API with 30-day caching

### Week 2: Trading Features
5. Add multi-token support
6. Build arbitrage bot (MVP)
7. Implement backend pool monitoring

### Week 3: Polish & Testing
8. Enhanced frontend features
9. Testing & QA
10. Documentation

---

## 📝 Notes

### API Endpoints to Research:
- **StellarExpert:** `https://api.stellar.expert/explorer/testnet/`
- **StellarTerm:** (check if they have public API)
- **Soroswap Subgraph:** (if available)
- **Horizon API:** `https://horizon-testnet.stellar.org/`

### Key Resources:
- Stellar SDK: `@stellar/stellar-sdk`
- Soroban CLI: `stellar` command
- Soroswap Docs: https://docs.soroswap.finance/
- Stellar Laboratory: https://laboratory.stellar.org/

---

## ⚡ Quick Commands Reference

### Build Contracts:
```bash
cd contracts/savex_contract
stellar contract build
```

### Deploy Contract:
```bash
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/savex_contract.wasm \
  --network testnet \
  --source ADMIN_KEY
```

### Query Pool:
```bash
stellar contract invoke \
  --id POOL_ADDRESS \
  --network testnet \
  -- get_reserves
```

### Start Frontend:
```bash
cd savex-ui
npm run dev
```

---

**Last Updated:** 2025-11-30
**Version:** 1.0
**Status:** 🚧 In Progress
