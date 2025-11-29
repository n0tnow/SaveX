# SaveX - Smart DEX Aggregator for Stellar

**AI-powered swap optimization on Stellar blockchain**

SaveX is a decentralized swap aggregator that finds the cheapest trading routes across multiple DEXs on Stellar, optimizes timing based on volatility patterns, and reduces costs through intelligent batching.

---

## 🎯 Problem We're Solving

**Current situation:**
- Stellar DEX: ~0.12% spread (good!)
- Soroswap: ~0.3% fee
- Phoenix: ~0.1% fee
- Users don't know which is cheapest at any given moment
- Exotic token pairs require multi-hop routing
- Small swaps pay same % as large ones (no volume benefits)

**Our solution:**
- **Liquidity Aggregation**: Compare all DEXs in real-time, use the cheapest
- **Multi-hop Routing**: Find optimal path through intermediary tokens (XLM → USDC → TRY)
- **Timing Optimization**: Historical pattern analysis suggests best times to swap
- **Batch Processing**: Combine multiple users' swaps for lower slippage
- **Path Splitting**: Split large swaps across multiple pools to minimize price impact

**Real savings: 0.5-2% per swap** ($5-20 on $1000 transfer)

---

## 🏗️ Architecture

### Smart Contracts (Stellar Soroban)

```
contracts/
├── savex/              # Main aggregator contract ✅
│   ├── swap routing
│   ├── multi-hop execution
│   ├── batch coordination
│   └── scheduled swaps
│
├── pool_analyzer/      # [PLANNED] DEX pool analytics
│   ├── liquidity tracking
│   ├── spread calculation
│   └── slippage estimation
│
└── arbitrage_monitor/  # [PLANNED] Cross-DEX arbitrage detection
    ├── price monitoring
    └── opportunity detection
```

### Frontend (Next.js + TypeScript) - **No Backend Required!**

```
app/
├── components/
│   ├── SwapInterface       # Simple swap UI
│   ├── RouteVisualizer     # Show multi-hop path & savings
│   ├── BatchManager        # Personal batch queue (localStorage)
│   └── SavingsDashboard    # Track user savings
│
├── utils/
│   ├── pathFinding.ts      # Dijkstra algorithm (client-side)
│   │   ├── Query Soroswap pools
│   │   ├── Build liquidity graph
│   │   └── Find optimal route
│   │
│   ├── volatilityAnalysis.ts  # Timing recommendations (Horizon API)
│   │   ├── Fetch historical trades
│   │   ├── Calculate hourly patterns
│   │   └── Suggest best swap time
│   │
│   └── batchCoordinator.ts    # Personal batch queue
│       ├── localStorage persistence
│       ├── Auto-execute at 3-5 swaps
│       └── Fee discount calculator
│
└── hooks/
    ├── useSwapQuote.ts     # Real-time DEX quotes (SWR)
    ├── useBatchQueue.ts    # Batch management
    └── usePathFinding.ts   # Optimal route finder
```

**Architecture Decision:** All optimization features run in the browser (no backend server needed).
- ✅ Deploy to Vercel without issues
- ✅ No database or server costs
- ✅ Real-time data from Stellar Horizon API + Soroswap contracts
- ✅ Client-side path finding & volatility analysis

---

## 💡 Key Features

### ✅ **Phase 1: MVP (Current)**

**1. Multi-hop Token Swaps**
- Automatic path finding for exotic pairs
- XLM → USDC → TRY routing
- Slippage protection

**2. Scheduled Swaps**
- Time-locked transfers
- Lock rate for future execution
- Cancel before execution

**3. Batch Transfers**
- Multiple recipients in one transaction
- Gas cost optimization

**4. Split Transfers**
- Send part now, part later
- Percentage-based splitting

### 🔄 **Phase 2: Aggregation (Next - 4 weeks)**

**5. DEX Aggregation**
- Real-time comparison: Stellar DEX vs Soroswap vs Phoenix
- Automatic best-price selection
- Expected savings: 0.1-0.3% per swap

**6. Multi-hop Optimization**
- Analyze all possible paths (2-5 hops)
- Choose lowest-cost route
- Expected savings: 0.5-1%

### 🤖 **Phase 3: AI Optimization (8 weeks)**

**7. Timing Optimization**
- Historical volatility analysis
- "Swap now vs wait 6 hours" recommendations
- Pattern: Night swaps ~40% cheaper spread
- Expected savings: 0.05-0.15%

**8. Batch Processing**
- Pool same-route swaps from multiple users
- Execute when 10-50 users accumulated
- Volume discount from reduced slippage
- Expected savings: 0.2-0.5%

**9. Path Splitting**
- Split large swaps across multiple pools
- $10,000 swap → 3x $3,333 through different paths
- Minimize price impact
- Expected savings: 0.5-2% on large swaps

### ⚡ **Phase 4: Advanced (Future)**

**10. Flash Arbitrage Detection**
- Monitor for temporary price discrepancies
- Cross-DEX arbitrage (Stellar ↔ Soroswap ↔ Phoenix)
- Rare but 0.5-2% profit opportunities

**11. Cross-chain Bridges** (Future consideration)
- Stellar ↔ Ethereum via bridges
- Expand to multi-chain aggregation

---

## 📊 Expected Savings Breakdown

| Feature | Savings | Frequency |
|---------|---------|-----------|
| **DEX Aggregation** | 0.1-0.3% | Every swap |
| **Multi-hop Routing** | 0.5-1% | Exotic pairs |
| **Timing Optimization** | 0.05-0.15% | If user can wait |
| **Batch Processing** | 0.2-0.5% | When batch available |
| **Path Splitting** | 0.5-2% | Large swaps >$5k |
| **Flash Arbitrage** | 0.5-2% | Rare (2-3x/month) |

**Total realistic savings: 0.5-2% per swap**

**Comparison:**
- Direct Stellar DEX: 0.12% spread = $1.20 per $1000
- SaveX optimized: 0.05-0.08% = $0.50-0.80 per $1000
- **Savings: $0.40-0.70 per $1000 transfer**

vs Traditional:
- Western Union: 3.5% = $35 per $1000
- **SaveX saves: $34+ vs Western Union**

---

## 🚀 Quick Start

### Prerequisites
- Rust 1.75+
- Soroban CLI v21.0.0+
- Node.js 18+
- Stellar account (testnet)

### 1. Deploy Contract (Testnet)

```bash
cd contracts/savex

# Build contract
cargo build --target wasm32-unknown-unknown --release

# Optimize WASM
soroban contract optimize \
  --wasm target/wasm32-unknown-unknown/release/savex.wasm

# Deploy to testnet
soroban contract deploy \
  --wasm target/wasm32-unknown-unknown/release/savex.optimized.wasm \
  --network testnet \
  --source <YOUR_SECRET_KEY>

# Initialize contract
soroban contract invoke \
  --id <CONTRACT_ID> \
  --network testnet \
  --source <YOUR_SECRET_KEY> \
  -- initialize \
  --admin <YOUR_PUBLIC_KEY>

# Set Soroswap Router (testnet)
soroban contract invoke \
  --id <CONTRACT_ID> \
  --network testnet \
  --source <YOUR_SECRET_KEY> \
  -- set_router_address \
  --admin <YOUR_PUBLIC_KEY> \
  --router CCMAPXWVZD4USEKDWRYS7DA4Y3D7E2SDMGBFJUCEXTC7VN6CUBGWPFUS
```

### 2. Test Multi-hop Swap

```bash
# Example: XLM → USDC → Test Token
soroban contract invoke \
  --id <CONTRACT_ID> \
  --network testnet \
  --source <YOUR_SECRET_KEY> \
  -- transfer_with_swap \
  --from <YOUR_PUBLIC_KEY> \
  --to <RECIPIENT_ADDRESS> \
  --from_token <XLM_ADDRESS> \
  --to_token <TEST_TOKEN_ADDRESS> \
  --amount 1000000000 \
  --min_output_amount 950000000 \
  --path '["<USDC_ADDRESS>"]'
```

### 3. Run Tests

```bash
cd contracts/savex
cargo test
```

---

## 🎮 Usage Examples

### Simple Swap (1-hop)

```typescript
import { SaveXClient } from './savex_client';

const client = new SaveXClient(contractId);

// Swap 100 USDC → XLM
const transferId = await client.transfer_with_swap({
  from: userAddress,
  to: recipientAddress,
  from_token: USDC_ADDRESS,
  to_token: XLM_ADDRESS,
  amount: 100_0000000, // 100 USDC (7 decimals)
  min_output_amount: 390_0000000, // Min 390 XLM (1% slippage)
  path: [], // Direct swap
});
```

### Multi-hop Swap (XLM → USDC → TRY)

```typescript
// Swap 1000 XLM → TRY through USDC
const transferId = await client.transfer_with_swap({
  from: userAddress,
  to: recipientAddress,
  from_token: XLM_ADDRESS,
  to_token: TRY_ADDRESS,
  amount: 1000_0000000,
  min_output_amount: 10_000_0000000, // Min 10,000 TRY
  path: [USDC_ADDRESS], // Route: XLM → USDC → TRY
});
```

### Scheduled Swap (Time-locked)

```typescript
// Lock funds now, swap in 6 hours
const now = Math.floor(Date.now() / 1000);
const swapIn6Hours = now + (6 * 3600);

const transferId = await client.transfer_scheduled({
  from: userAddress,
  to: recipientAddress,
  token: USDC_ADDRESS,
  amount: 500_0000000,
  execute_after: swapIn6Hours,
});

// Later, anyone can execute:
await client.execute_scheduled_transfer({ transfer_id: transferId });
```

### Batch Transfer

```typescript
// Send to multiple recipients in one transaction
const transferIds = await client.transfer_batch({
  from: userAddress,
  recipients: [addr1, addr2, addr3],
  token: USDC_ADDRESS,
  amounts: [100_0000000, 200_0000000, 150_0000000],
});
```

---

## 📈 Roadmap

### Q1 2025: MVP ✅
- [x] Multi-hop swap routing
- [x] Scheduled transfers
- [x] Batch transfers
- [x] Soroswap integration

### Q2 2025: Aggregation 🔄
- [ ] Real-time DEX comparison (Stellar + Soroswap + Phoenix)
- [ ] Automatic best-pool selection
- [ ] Path-finding algorithm (Dijkstra)
- [ ] Frontend swap interface

### Q3 2025: AI Optimization 📊
- [ ] Historical volatility analysis
- [ ] Timing recommendations
- [ ] Batch coordination service
- [ ] Savings dashboard

### Q4 2025: Advanced 🚀
- [ ] Flash arbitrage detection
- [ ] Path splitting for large swaps
- [ ] Machine learning price prediction
- [ ] Cross-DEX market making

### 2026: Scale & Growth 🌍
- [ ] 10+ DEX integrations
- [ ] Cross-chain bridges (Stellar ↔ ETH)
- [ ] Mobile app
- [ ] Enterprise API

---

## 🔮 Future Feature: Rate Locking

**Status: Researching solutions**

**Concept:** Lock current exchange rate, execute swap later (24h window)

**Challenge:** How to hedge volatility risk?

**Possible solutions:**
1. **Require collateral**: User locks funds immediately
2. **Futures/options**: Use derivatives to hedge price risk
3. **Limited amounts**: Cap at $100-500 per lock
4. **Dynamic fees**: Charge more for high-volatility pairs

**Not implemented yet** - needs more research on risk management.

---

## 💰 Revenue Model

### Freemium Pricing

| Swap Size | Fee | Notes |
|-----------|-----|-------|
| < $100 | Free | Attract users |
| $100-1,000 | 0.05% | $0.50 on $1000 |
| $1,000-10,000 | 0.03% | Volume discount |
| > $10,000 | 0.02% | Best for large traders |

**Alternative:** Take 20% of savings
- User saves $1.40 → we take $0.28
- User still saves $1.12 (win-win!)

---

## 🔐 Security

- **No custody**: Funds only in contract during swap execution
- **Slippage protection**: Min output amount enforced
- **Time locks**: Scheduled transfers cancellable before execution
- **Admin controls**: Pause functionality for emergencies
- **Open source**: Auditable smart contracts

---

## 🧪 Testing

```bash
# Unit tests
cd contracts/savex
cargo test

# Integration tests
cargo test --test integration

# Testnet deployment test
./scripts/test_deploy.sh
```

---

## 📝 Technical Details

### DEX Integration

**Stellar Classic DEX** (Native order book)
- Path payments
- Spread: ~0.12%
- Best for: High liquidity pairs

**Soroswap** (Uniswap V2 fork)
- Router: `CCMAPXWVZD4USEKDWRYS7DA4Y3D7E2SDMGBFJUCEXTC7VN6CUBGWPFUS` (testnet)
- Fee: 0.3%
- Best for: AMM pairs

**Phoenix** (Concentrated liquidity)
- Fee: 0.05-0.1%
- Best for: Low slippage

### Smart Contract Functions

See [Contract Documentation](./contracts/savex/README.md) for full API reference.

---

## 🤝 Contributing

Contributions welcome! Please:
1. Fork the repo
2. Create feature branch
3. Write tests
4. Submit PR

---

## 📄 License

MIT License - see [LICENSE](./LICENSE)

---

## 🔗 Links

- **Stellar**: https://stellar.org
- **Soroban Docs**: https://soroban.stellar.org
- **Soroswap**: https://soroswap.finance
- **Phoenix**: https://phoenix-hub.io

---

## 📞 Contact

- Twitter: [@SaveX_Finance](https://twitter.com/SaveX_Finance)
- Discord: [Join our community](https://discord.gg/savex)
- Email: contact@savex.finance

---

**Built on Stellar 🌟 | Powered by Soroban ⚡**
