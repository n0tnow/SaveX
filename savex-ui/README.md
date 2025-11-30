# SaveX Testing Dashboard

A comprehensive frontend for testing SaveX smart contracts on Stellar Testnet.

## 🚀 Features

### ✅ Implemented
1. **Wallet Connection** - Freighter wallet integration with balance display
2. **Token Swap** - XLM ↔ USDC swaps with slippage control
3. **Immediate Transfer** - Instant token transfers with fee calculation
4. **Rate Locking** - Lock exchange rates for up to 24 hours
5. **Package Subscriptions** - Family/Business/Premium discount packages
6. **Advanced Transfers**
   - ⏰ Scheduled Transfers (time-locked)
   - ✂️ Split Transfers (partial now, rest later)
   - 📦 Batch Transfers (multiple recipients)

## 🛠 Tech Stack

- **Next.js 15** - Latest React framework
- **React 19** - Latest React version
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Stellar SDK** - Blockchain integration
- **Freighter API** - Wallet connection
- **Zustand** - State management

## 📦 Installation

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## 🔧 Configuration

Contract addresses and network settings are configured in `lib/config.ts`:

- **Network**: Stellar Testnet
- **SaveX Contract**: `CAU6XWIC354GJVA3UBEED2FH4SMROTNZA6JG26WF6TMJIL3WBKB2C6MJ`
- **Soroswap Router**: `CCMAPXWVZD4USEKDWRYS7DA4Y3D7E2SDMGBFJUCEXTC7VN6CUBGWPFUS`

## 🧪 Testing Guide

### 1. Install Freighter Wallet
Download from [freighter.app](https://www.freighter.app/)

### 2. Get Testnet XLM
Use Stellar Friendbot: `https://friendbot.stellar.org/?addr=YOUR_ADDRESS`

### 3. Get Test USDC
Use Circle's USDC Faucet: [faucet.circle.com](https://faucet.circle.com/)

### 4. Test Features

#### Token Swap
1. Select tokens (XLM → USDC)
2. Enter amount
3. Click "Estimate" to see output
4. Adjust slippage if needed
5. Click "Execute Swap"

#### Rate Locking
1. Choose token pair
2. Enter exchange rate
3. Set amount and duration
4. Click "Lock Rate"
5. Use lock ID to view/cancel

#### Package Subscriptions
1. Select package (Family/Business/Premium)
2. Choose duration (30/90/180/365 days)
3. Click "Subscribe"
4. Enjoy automatic discounts on all transfers

#### Advanced Transfers
- **Scheduled**: Set future execution time
- **Split**: Send partial amount now, rest later
- **Batch**: Send to multiple recipients at once

## 📁 Project Structure

```
savex-ui/
├── app/
│   ├── layout.tsx          # Root layout
│   ├── page.tsx            # Main dashboard
│   └── globals.css         # Global styles
├── components/
│   ├── WalletConnect.tsx   # Wallet connection & balances
│   ├── TokenSwap.tsx       # Token swap interface
│   ├── ImmediateTransfer.tsx
│   ├── RateLocking.tsx
│   ├── PackageSubscriptions.tsx
│   └── AdvancedTransfers.tsx
├── lib/
│   ├── config.ts           # Contract addresses & constants
│   ├── stellar.ts          # Stellar SDK integration
│   ├── store.ts            # Zustand state management
│   └── utils.ts            # Helper functions
└── README.md
```

## 🎨 UI Components

All components are fully responsive and feature:
- Real-time balance updates
- Transaction status feedback
- Error handling with user-friendly messages
- Loading states
- Gradient designs matching SaveX brand

## 🔐 Security Notes

- All transactions require Freighter wallet signature
- Network: Testnet only (no real funds)
- Contract addresses are hardcoded for safety
- Private keys never leave your wallet

## 📊 Contract Methods Tested

- `estimate_swap_output` - Get swap rate estimation
- `transfer_with_swap` - Execute token swap
- `transfer_immediate` - Instant transfer
- `transfer_scheduled` - Time-locked transfer
- `transfer_split` - Split payment
- `transfer_batch` - Batch transfers
- `lock_rate` - Lock exchange rate
- `get_rate_lock` - Query rate lock
- `cancel_rate_lock` - Cancel rate lock
- `subscribe_package` - Subscribe to discount package
- `get_package` - View package details
- `cancel_package` - Cancel package
- `calculate_fee` - Fee calculation

## 🐛 Troubleshooting

### Wallet Not Connecting
- Ensure Freighter is installed and unlocked
- Check you're on Stellar Testnet in Freighter settings
- Refresh the page

### Transaction Failing
- Verify sufficient balance (including fees)
- Check recipient address is valid
- Ensure contract is not paused
- Try increasing slippage for swaps

### Balance Not Showing
- Click "Refresh" button
- Ensure you have testnet tokens
- Check network connection

## 📝 Development

```bash
# Run with turbopack (faster)
npm run dev --turbo

# Type checking
npx tsc --noEmit

# Linting
npm run lint
```

## 🚀 Deployment

```bash
# Build optimized production bundle
npm run build

# Start production server
npm start
```

Or deploy to Vercel:
```bash
vercel deploy
```

## 📖 Documentation

- [SaveX Contract Docs](../docs/)
- [Stellar SDK Documentation](https://stellar.github.io/js-stellar-sdk/)
- [Freighter Wallet API](https://docs.freighter.app/)

---

**Built with ❤️ for SaveX | Stellar Testnet**