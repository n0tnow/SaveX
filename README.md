# SaveX - Smart Remittance Platform for Stellar

**AI-powered cross-border transfers with package subscriptions, rate locking, and automated arbitrage**

SaveX is a comprehensive DeFi platform on Stellar that combines smart transfers, subscription packages, rate locking, DEX aggregation, and arbitrage opportunities to minimize costs and maximize savings for users.

---

## 🎯 What is SaveX?

SaveX revolutionizes cross-border money transfers by combining multiple DeFi features:

- **Package Subscriptions**: Get automatic discounts (15-25%) on all transfers
- **Rate Locking**: Lock exchange rates for up to 24 hours
- **DEX Aggregation**: Auto-select cheapest DEX (Soroswap vs Stellar DEX)
- **Arbitrage Tools**: Execute profitable arbitrage opportunities
- **Smart Transfers**: Scheduled, batch, split, and swap transfers
- **Fee Optimization**: Real-time fee calculator with package discounts

**Real savings: 2-5% per transfer** ($20-50 on $1000 transfer)

---

## ✨ Key Features

### 📦 Package Subscriptions
Subscribe to packages for automatic discounts on all transfers:

| Package | Discount | Price |
|---------|----------|-------|
| **Family** | 15% off | $9.99/month |
| **Business** | 20% off | $19.99/month |
| **Premium** | 25% off | $49.99/month |

- ✅ Automatic discount application
- ✅ Flexible duration: 30, 90, 180, 365 days
- ✅ Cancel anytime
- ✅ View package stats (transfers, volume, savings)

### 💱 DEX Aggregation
Automatically compare Soroswap vs Stellar DEX:
- Real-time price comparison
- Auto-select cheapest DEX
- Savings: 0.1-0.3% per swap
- Transparent fee breakdown

### 🔄 Arbitrage Tools

**Triangular Arbitrage:**
- Automated detection (XLM→USDC→AQUA→XLM)
- Real-time profit estimation
- One-click execution
- Auto-refresh every 10 seconds

**Simple Arbitrage:**
- 2-token arbitrage (XLM ↔ USDC)
- Estimate profit before execution
- Buy low on one DEX, sell high on another
- Freighter wallet integration

### 💸 Smart Transfers

**1. Immediate Transfer**
- Instant send to any address
- Multi-token support
- Slippage protection

**2. Scheduled Transfer**
- Time-locked transfers
- Execute after specific time
- Cancellable before execution

**3. Batch Transfer**
- Multiple recipients in one transaction
- Gas cost optimization
- Batch discount (10% per recipient)

**4. Split Transfer**
- Send part now, part later
- Percentage-based splitting
- Flexible allocation

**5. Transfer with Swap**
- Swap + send in one transaction
- Multi-hop routing (XLM→USDC→TRY)
- Optimal path finding

---

## 🏗️ Architecture

### Smart Contract (Stellar Soroban)

**Contract Address (Testnet):**
```
CDK4XKO56J7ULHTCNFT6OVPY2FBO6FJEYSXCCQ7QR4TBMQE6XY5DPNGT
```

**34 Functions Available:**
```
Transfer Functions:
├── transfer_immediate
├── transfer_scheduled
├── transfer_batch
├── transfer_split
├── transfer_with_swap
└── transfer_with_rate_lock

Package Functions:
├── subscribe_package
├── get_package
└── cancel_package

Rate Lock Functions:
├── lock_rate
├── get_rate_lock
└── cancel_rate_lock

Arbitrage Functions:
├── execute_arbitrage (simple 2-token)
├── execute_triangular_arbitrage (multi-hop)
├── estimate_arbitrage_profit
├── has_arbitrage_opportunity
└── flash_arbitrage

DEX Functions:
├── get_soroswap_quote
├── get_stellar_dex_quote
├── get_best_dex_quote
└── get_swap_path

Utility Functions:
├── calculate_fee
├── estimate_swap_output
├── estimate_schedule_savings
└── execute_scheduled_transfer

Admin Functions:
├── initialize
├── set_router_address
├── set_factory_address
├── pause
└── unpause
```

### Frontend (Next.js 16 + TypeScript)

**Pages:**
- `/` - Landing page
- `/swap` - Swap interface with DEX comparison & fee calculator
- `/analytics` - Subscription management
- `/arbitrage` - Triangular arbitrage detector
- `/liquidity` - Liquidity pools & simple arbitrage

**Components:**
```
components/
├── SwapInterface.tsx           # Main swap UI
├── ArbitrageDetector.tsx       # Triangular arbitrage
├── SimpleArbitrage.tsx         # 2-token arbitrage
├── DexComparisonWidget.tsx     # DEX price comparison
├── FeeCalculator.tsx           # Fee breakdown
├── PackageSubscriptions.tsx    # Subscription management
├── RateLocking.tsx             # Rate lock UI
├── ImmediateTransfer.tsx       # Instant transfers
├── AdvancedTransfers.tsx       # Scheduled transfers
├── BatchManager.tsx            # Batch transfers
├── SplitTransfer.tsx           # Split transfers
└── TokenSwap.tsx               # Swap with routing
```

---

## 📊 Savings Breakdown

| Feature | Savings | Applied |
|---------|---------|---------|
| **Package Discount** | 15-25% | Every transfer |
| **DEX Aggregation** | 0.1-0.3% | Every swap |
| **Batch Transfers** | 10% per recipient | Batch operations |
| **Timing Optimization** | 0.05-0.15% | Scheduled transfers |
| **Arbitrage** | 0.5-5% | When opportunities exist |

**Example: $1000 XLM → USDC transfer**
- Without SaveX: $3.50 (0.35% Soroswap fee)
- With SaveX (Business package):
  - Base fee: $3.50
  - DEX aggregation savings: -$1.00 (use Stellar DEX)
  - Package discount: -$0.70 (20% off)
  - **Total: $1.80 (saved $1.70)** ✅

vs Traditional:
- Western Union: $35 (3.5%)
- **SaveX saves: $33.20 vs Western Union** 💰

---

## 🚀 Quick Start

### Prerequisites
- Freighter Wallet ([Install](https://freighter.app/))
- Stellar testnet account with funds
- Node.js 18+

### 1. Setup Wallet

1. Install Freighter browser extension
2. Create/import testnet account
3. Get testnet XLM: https://laboratory.stellar.org/#account-creator

### 2. Run Frontend

```bash
# Clone repo
git clone https://github.com/yourusername/SaveX.git
cd SaveX/savex-ui

# Install dependencies
npm install

# Start development server
npm run dev
```

Open http://localhost:3000

### 3. Connect Wallet

1. Click "Connect Wallet" in header
2. Approve connection in Freighter
3. Your balance will load automatically

### 4. Try Features

**Subscribe to Package:**
1. Go to `/analytics`
2. Select package (Family/Business/Premium)
3. Choose duration
4. Click "Subscribe to Package"
5. Approve in Freighter

**Execute Swap:**
1. Go to `/swap`
2. Select tokens (FROM → TO)
3. Enter amount
4. View DEX comparison (auto-selects cheapest)
5. Check fee breakdown
6. Click "Swap"
7. Approve in Freighter

**Find Arbitrage:**
1. Go to `/arbitrage`
2. View detected opportunities
3. Click "Execute Arbitrage"
4. Approve in Freighter
5. Profit! 🎉

---

## 🎮 Usage Examples

### Subscribe to Package

```typescript
// Family package for 90 days
const result = await stellarService.invokeSaveXContract(
  'subscribe_package',
  [
    stellarService.createScVal.address(userAddress),
    stellarService.createScVal.string('Family'),
    stellarService.createScVal.u32(90), // days
  ],
  userAddress
);
```

### Lock Exchange Rate

```typescript
// Lock XLM/USDC rate for 12 hours
const rateLockId = await stellarService.invokeSaveXContract(
  'lock_rate',
  [
    stellarService.createScVal.address(userAddress),
    stellarService.createScVal.address(XLM_ADDRESS),
    stellarService.createScVal.address(USDC_ADDRESS),
    stellarService.createScVal.i128(100_0000000), // 100 XLM
    stellarService.createScVal.u64(12 * 3600), // 12 hours
  ],
  userAddress
);
```

### Execute Triangular Arbitrage

```typescript
// XLM → USDC → AQUA → XLM
const contract = new Contract(CONTRACTS.SAVEX);
const tx = new TransactionBuilder(sourceAccount, {...})
  .addOperation(
    contract.call(
      'execute_triangular_arbitrage',
      Address.fromString(userAddress).toScVal(),
      nativeToScVal([USDC_ADDRESS, AQUA_ADDRESS], { type: 'address[]' }),
      nativeToScVal(100_0000000, { type: 'i128' }), // 100 XLM
      nativeToScVal(1_0000000, { type: 'i128' }), // Min 1 XLM profit
    )
  )
  .build();
```

### Compare DEX Prices

```typescript
// Get quotes from both DEXs
const soroswapQuote = await contract.call('get_soroswap_quote', [
  fromToken, toToken, amount
]);

const stellarQuote = await contract.call('get_stellar_dex_quote', [
  fromToken, toToken, amount
]);

// Auto-select best
const bestQuote = await contract.call('get_best_dex_quote', [
  fromToken, toToken, amount
]);
```

---

## 📈 Contract Deployment

### Build Contract

```bash
cd contracts/savex

# Build
stellar contract build

# Deploy to testnet
stellar contract deploy \
  --wasm target/wasm32v1-none/release/savex_contract.wasm \
  --source alice \
  --network testnet

# Initialize
stellar contract invoke \
  --id <CONTRACT_ID> \
  --source alice \
  --network testnet \
  -- initialize \
  --admin <ADMIN_ADDRESS>

# Set router
stellar contract invoke \
  --id <CONTRACT_ID> \
  --source alice \
  --network testnet \
  -- set_router_address \
  --admin <ADMIN_ADDRESS> \
  --router CCMAPXWVZD4USEKDWRYS7DA4Y3D7E2SDMGBFJUCEXTC7VN6CUBGWPFUS
```

### Test Contract

```bash
# Run tests
cd contracts/savex
cargo test

# Test specific function
stellar contract invoke \
  --id <CONTRACT_ID> \
  --source alice \
  --network testnet \
  -- calculate_fee \
  --user <USER_ADDRESS> \
  --amount 100_0000000 \
  --is_batch false \
  --batch_size 1
```

---

## 🔐 Security

- **No Custody**: Funds only in contract during transaction execution
- **Slippage Protection**: Min output amount enforced
- **Time Locks**: Scheduled transfers cancellable before execution
- **Package Validation**: Subscription expiry checks
- **Admin Controls**: Pause functionality for emergencies
- **Open Source**: Fully auditable smart contracts

---

## 📚 Documentation

- [Contract Coverage Analysis](./CONTRACT_FRONTEND_COVERAGE_ANALYSIS.md)
- [Arbitrage Integration Guide](./ARBITRAGE_INTEGRATION.md)
- [Feature Implementation Summary](./FEATURE_IMPLEMENTATION_SUMMARY.md)
- [Deployment Guide](./DEPLOYMENT.md)
- [Integration Guide](./INTEGRATION_GUIDE.md)

---

## 🗺️ Roadmap

### ✅ Q1 2025: Core Features (DONE)
- [x] Package subscription system
- [x] Rate locking (24h max)
- [x] Multi-hop swap routing
- [x] Scheduled/batch/split transfers
- [x] Soroswap integration
- [x] Arbitrage detection & execution
- [x] DEX aggregation
- [x] Fee calculator

### 🔄 Q2 2025: Enhancement
- [ ] Mobile app (React Native)
- [ ] Advanced analytics dashboard
- [ ] Historical savings tracking
- [ ] Referral program
- [ ] Flash loan integration
- [ ] Cross-DEX market making

### 📊 Q3 2025: AI Optimization
- [ ] ML-based timing optimization
- [ ] Volatility prediction
- [ ] Auto-batch coordination
- [ ] Smart route caching
- [ ] Price impact estimation

### 🚀 Q4 2025: Scale
- [ ] Phoenix DEX integration
- [ ] Multi-chain bridges
- [ ] Enterprise API
- [ ] Liquidity provision
- [ ] Governance token
      
### 🔒 Rate Locking
Lock current exchange rate for future transfers:
- Lock rate for up to 24 hours
- Execute transfer at locked rate
- Cancel lock before expiry
- Perfect for volatile markets

---

## 🤝 Contributing

Contributions welcome! Please:
1. Fork the repo
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

---

## 📞 Contact

- GitHub: [@n0tnow](https://github.com/yourusername)

---

**Built on Stellar 🌟 | Powered by Soroban ⚡ | Optimized with AI 🤖**

*Making cross-border transfers cheaper, faster, and smarter.*
