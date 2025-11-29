# SaveX Arbitrage Bot

Automated arbitrage trading bot for Soroswap liquidity pools on Stellar Testnet.

## Features

- ✅ Real-time pool monitoring (10 Soroswap pools)
- ✅ Arbitrage opportunity detection
- ✅ Multi-token support (XLM, USDC, EURC, AQUA)
- ⏳ Automatic trade execution (coming soon)
- ⏳ Risk management (slippage protection, max trade size)
- ⏳ Profit tracking and reporting

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

### 3. Generate Bot Wallet

```bash
stellar keys generate bot-wallet --network testnet
```

Copy the secret key to `.env`:

```
BOT_SECRET_KEY=SXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

### 4. Fund Bot Wallet

```bash
# Get public key
stellar keys address bot-wallet

# Fund with friendbot
curl "https://friendbot.stellar.org?addr=YOUR_PUBLIC_KEY"
```

## Usage

### Monitor Pools (Single Run)

```bash
npm run monitor
```

### Run Bot (Continuous)

```bash
npm run dev
```

The bot will:
1. Poll all known pools every 5 seconds
2. Calculate price differences
3. Detect arbitrage opportunities (>0.5% profit)
4. Log opportunities to console
5. Execute trades automatically (when implemented)

## Configuration

Edit `.env` to customize bot behavior:

| Variable | Description | Default |
|----------|-------------|---------|
| `POLL_INTERVAL_MS` | How often to check pools | 5000 (5s) |
| `MIN_PROFIT_PERCENT` | Minimum profit to trade | 0.5% |
| `MAX_TRADE_AMOUNT_XLM` | Maximum trade size | 1000 XLM |
| `MAX_SLIPPAGE_PERCENT` | Maximum slippage tolerance | 2% |

## Monitored Pools

The bot currently monitors these Soroswap testnet pools:

1. **XTAR/USDC** - `CDIEPNPM...`
2. **XLM/USDC** - `CDT3AHGQ...`
3. **USDC/XLM** - `CDE3I665...`
4. **EURC/USDC** - `CCJQDQ3Y...`
5. **XTAR/AQUA** - `CAP6V6SH...`

See [LIQUIDITY_POOLS.md](../LIQUIDITY_POOLS.md) for full pool details.

## Architecture

```
arbitrage-bot/
├── src/
│   ├── config.ts      # Configuration and constants
│   ├── monitor.ts     # Pool monitoring and arbitrage detection
│   ├── executor.ts    # Trade execution (coming soon)
│   ├── risk.ts        # Risk management (coming soon)
│   └── index.ts       # Main bot loop
├── package.json
├── tsconfig.json
└── .env
```

## Example Output

```
🤖 SaveX Arbitrage Bot Starting...

Network: testnet
Poll Interval: 5000ms
Min Profit: 0.5%
Max Trade: 1000 XLM

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Iteration #1 - 2025-11-30T12:00:00.000Z
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 Monitoring 5 pools...
✅ XTAR/USDC: 199,665 / 125,209 | Price: 0.627150
✅ XLM/USDC: 54,024 / 1,052 | Price: 0.019477
✅ USDC/XLM: 51,249 / 50,940 | Price: 0.993967
✅ EURC/USDC: 200,000 / 125,000 | Price: 0.625000
✅ XTAR/AQUA: 200,000 / 125,000 | Price: 0.625000

🚨 ARBITRAGE OPPORTUNITY DETECTED!
   Path: XLM/USDC → USDC/XLM
   Expected Profit: 1.92%
   Status: Execution not implemented yet

✅ Waiting 5 seconds for next iteration...
```

## Roadmap

- [x] Pool monitoring infrastructure
- [x] Arbitrage detection algorithm
- [ ] Trade execution via Soroswap router
- [ ] Integration with SaveX contract
- [ ] Slippage protection
- [ ] Profit tracking database
- [ ] Web dashboard for monitoring
- [ ] Telegram/Discord notifications
- [ ] Multi-hop arbitrage (3+ pools)

## Safety Features

The bot includes several safety mechanisms:

1. **Max Trade Size**: Limits exposure per trade
2. **Slippage Protection**: Cancels if price moves too much
3. **Minimum Profit**: Only trades if profit > threshold
4. **Dry Run Mode**: Test without real trades (coming soon)

## Troubleshooting

### "No pools available for monitoring"

The pools may be empty or not deployed. Check [LIQUIDITY_POOLS.md](../LIQUIDITY_POOLS.md) for current pool status.

### "BOT_SECRET_KEY not set"

Generate a wallet and add the secret key to `.env` file.

### RPC errors

The Stellar testnet RPC may be rate-limited. Increase `POLL_INTERVAL_MS` to reduce request frequency.

## License

MIT
