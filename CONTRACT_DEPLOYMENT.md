# SaveX Contract Deployment Guide

## 📦 Contract Information

**Contract Name:** savex-contract
**Version:** 0.1.0
**Wasm Size:** 28,727 bytes
**Wasm Hash:** `24d5817b85cc608098c7fb4a2981ec04ac336c76cd2424be1bdbec5065aa5cb8`

### Exported Functions (29 total):
- ✅ `initialize` - Initialize contract with router address
- ✅ `transfer_immediate` - Instant transfer
- ✅ `transfer_scheduled` - Schedule a transfer for future execution
- ✅ `transfer_split` - Split transfer (immediate + scheduled)
- ✅ `transfer_batch` - Batch multiple transfers
- ✅ `transfer_with_swap` - Transfer with automatic token swap
- ✅ `transfer_with_rate_lock` - Transfer with locked exchange rate
- ✅ `execute_scheduled_transfer` - Execute a scheduled transfer
- ✅ `cancel_scheduled_transfer` - Cancel a scheduled transfer
- ✅ `subscribe_package` - Subscribe to fee discount package
- ✅ `cancel_package` - Cancel package subscription
- ✅ `lock_rate` - Lock exchange rate for future swap
- ✅ `cancel_rate_lock` - Cancel rate lock
- ✅ `get_transfer` - Get transfer details
- ✅ `get_package` - Get package subscription details
- ✅ `get_rate_lock` - Get rate lock details
- ✅ `calculate_fee` - Calculate transfer fee
- ✅ `estimate_swap_output` - Estimate swap output amount
- ✅ `estimate_schedule_savings` - Estimate savings from scheduling
- ✅ `get_swap_path` - Get optimal swap path
- ✅ `get_router_address` - Get Soroswap router address
- ✅ `get_factory_address` - Get Soroswap factory address
- ✅ `set_router_address` - Set Soroswap router address (admin)
- ✅ `set_factory_address` - Set Soroswap factory address (admin)
- ✅ `get_soroswap_quote` - Get quote from Soroswap
- ✅ `get_stellar_dex_quote` - Get quote from Stellar DEX
- ✅ `get_best_dex_quote` - Get best quote across DEXes
- ✅ `pause` - Pause contract (admin)
- ✅ `unpause` - Unpause contract (admin)

---

## 🔑 Prerequisites

### 1. Generate Deployment Wallet
```bash
# Generate new keypair for deployment
stellar keys generate deployer --network testnet

# Get the public key
stellar keys address deployer

# Fund the account with testnet XLM
# Visit: https://laboratory.stellar.org/#account-creator?network=test
# Or use friendbot:
curl "https://friendbot.stellar.org?addr=$(stellar keys address deployer)"
```

### 2. Verify Stellar CLI Installation
```bash
stellar --version
# Should show: stellar 23.0.1 or higher
```

---

## 🚀 Deployment Steps

### Step 1: Build Contract
```bash
cd /home/bkaya/SaveX/contracts/savex
stellar contract build
```

**Expected Output:**
```
✅ Build Complete
Wasm File: target/wasm32v1-none/release/savex_contract.wasm (28727 bytes)
```

### Step 2: Deploy Contract
```bash
stellar contract deploy \
  --wasm target/wasm32v1-none/release/savex_contract.wasm \
  --source deployer \
  --network testnet
```

**Expected Output:**
```
Contract deployed successfully!
Contract ID: CABC...XYZ
```

**📝 Save this Contract ID! Update it in:**
- `/home/bkaya/SaveX/savex-ui/lib/config.ts`
- `/home/bkaya/SaveX/CONTRACT_DEPLOYMENT.md` (this file)

### Step 3: Initialize Contract
```bash
# Set the Soroswap Router address
stellar contract invoke \
  --id <CONTRACT_ID_FROM_STEP_2> \
  --source deployer \
  --network testnet \
  -- initialize \
  --router CCMAPXWVZD4USEKDWRYS7DA4Y3D7E2SDMGBFJUCEXTC7VN6CUBGWPFUS
```

**Expected Output:**
```
✅ Contract initialized successfully
```

---

## ✅ Post-Deployment Testing

### Test 1: Verify Initialization
```bash
stellar contract invoke \
  --id <CONTRACT_ID> \
  --source deployer \
  --network testnet \
  -- get_router_address
```

**Expected:** Should return the Soroswap router address

### Test 2: Calculate Fee (No Transaction)
```bash
stellar contract invoke \
  --id <CONTRACT_ID> \
  --source deployer \
  --network testnet \
  -- calculate_fee \
  --amount 10000000 \
  --has_package false
```

**Expected:** Should return fee amount (e.g., 30000 for 0.3% fee)

### Test 3: Estimate Swap Output
```bash
stellar contract invoke \
  --id <CONTRACT_ID> \
  --source deployer \
  --network testnet \
  -- estimate_swap_output \
  --from_token CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC \
  --to_token CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA \
  --amount 10000000
```

**Expected:** Should return estimated output amount

---

## 📋 Deployment Checklist

- [ ] Build contract successfully
- [ ] Generate deployment wallet
- [ ] Fund deployment wallet with testnet XLM
- [ ] Deploy contract to testnet
- [ ] Save Contract ID
- [ ] Initialize contract with router address
- [ ] Test `get_router_address` function
- [ ] Test `calculate_fee` function
- [ ] Test `estimate_swap_output` function
- [ ] Update frontend config with new Contract ID
- [ ] Verify all 29 functions are accessible
- [ ] Document any deployment issues

---

## 🔧 Deployment Status

### Current Deployment:
- **Status:** ✅ Successfully Deployed
- **Network:** Stellar Testnet
- **Contract ID:** `CD62XQRCEXAEZL4KOGOINLVZSKPTI4VNAHDDCSZZFL3EX3Y4B4PDMKBC`
- **Deployer Address:** `GACZMPBKJYKINYN67KFY3KZFDLKAQ2WROG4VBBIEBZNGUJLOOH2ITSUE`
- **Deployment Date:** 2025-11-30
- **Initialization Status:** ✅ Initialized

### Configuration:
- **Router Address:** `CCMAPXWVZD4USEKDWRYS7DA4Y3D7E2SDMGBFJUCEXTC7VN6CUBGWPFUS`
- **Factory Address:** `[TO BE RESEARCHED]`
- **Admin Address:** `[DEPLOYER_ADDRESS]`

---

## 📊 Gas Costs (Estimated)

| Operation | Estimated Cost (XLM) |
|-----------|---------------------|
| Deploy Contract | ~0.5 XLM |
| Initialize | ~0.01 XLM |
| transfer_immediate | ~0.005 XLM |
| transfer_scheduled | ~0.005 XLM |
| transfer_with_swap | ~0.01 XLM |
| subscribe_package | ~0.005 XLM |

**Total for Initial Deployment:** ~0.52 XLM

---

## 🐛 Troubleshooting

### Issue: "Account not found"
**Solution:** Fund your deployer account using friendbot:
```bash
curl "https://friendbot.stellar.org?addr=$(stellar keys address deployer)"
```

### Issue: "Contract already initialized"
**Solution:** Contract can only be initialized once. If you need to change settings, deploy a new instance.

### Issue: "Router address invalid"
**Solution:** Verify the Soroswap router address is correct for testnet.

### Issue: "Insufficient balance"
**Solution:** Ensure deployer account has enough XLM (minimum 1 XLM recommended).

---

## 🔄 Update Frontend Config

After successful deployment, update:

**File:** `/home/bkaya/SaveX/savex-ui/lib/config.ts`

```typescript
export const CONTRACTS = {
  SAVEX: '<NEW_CONTRACT_ID_HERE>',
  SOROSWAP_ROUTER: 'CCMAPXWVZD4USEKDWRYS7DA4Y3D7E2SDMGBFJUCEXTC7VN6CUBGWPFUS',
} as const;
```

---

## 📝 Next Steps After Deployment

1. ✅ Update frontend config
2. ✅ Test all functions via frontend
3. ✅ Monitor contract activity on Stellar Expert
4. ✅ Set up factory address (once discovered)
5. ✅ Document any bugs or issues
6. ✅ Create test transactions for all features

---

## 🔗 Useful Links

- **Stellar Laboratory:** https://laboratory.stellar.org/
- **Stellar Expert (Testnet):** https://stellar.expert/explorer/testnet
- **Soroban RPC:** https://soroban-testnet.stellar.org/
- **Friendbot (Fund Testnet):** https://friendbot.stellar.org/

---

**Last Updated:** 2025-11-30
**Version:** 1.0
**Status:** 🔴 Ready for Deployment
