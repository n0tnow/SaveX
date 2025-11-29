# SaveX - Realistic Testnet Pool Setup Plan

## Amaç
Mainnet benzeri likidite pool'ları oluşturup arbitraj ve swap testleri yapmak

## Token Listesi (Mainnet benzeri miktarlarda)

### 1. Stablecoin'ler
- **USDC**: 1,000,000 (1M USDC)
- **EURC**: 850,000 (850K EURC)
- **TRYC** (TRY Stablecoin): 30,000,000 (30M TRY)
- **BRLT** (Brazilian Real): 5,000,000 (5M BRL)

### 2. Major Tokens
- **XLM**: 10,000,000 (10M XLM)
- **AQUA**: 50,000,000 (50M AQUA)
- **yXLM**: 5,000,000 (5M yXLM)

### 3. Emerging Market Tokens
- **NGN** (Nigerian Naira): 500,000,000 (500M NGN)
- **KES** (Kenyan Shilling): 120,000,000 (120M KES)
- **INR** (Indian Rupee): 80,000,000 (80M INR)

## Pool Oluşturma (Soroswap Benzeri)

### Tier 1 Pools (Yüksek Likidite)
```
1. XLM/USDC
   - XLM: 2,000,000
   - USDC: 200,000
   - Hedef Fiyat: 1 XLM = $0.10

2. USDC/EURC
   - USDC: 300,000
   - EURC: 280,000
   - Hedef Fiyat: 1 USDC = 0.93 EUR

3. XLM/AQUA
   - XLM: 1,500,000
   - AQUA: 15,000,000
   - Hedef Fiyat: 1 XLM = 10 AQUA
```

### Tier 2 Pools (Orta Likidite - Arbitraj Fırsatları)
```
4. USDC/TRYC
   - USDC: 100,000
   - TRYC: 3,200,000
   - Hedef Fiyat: 1 USDC = 32 TRY

5. EURC/TRYC
   - EURC: 80,000
   - TRYC: 2,700,000
   - Hedef Fiyat: 1 EUR = 33.75 TRY

6. XLM/yXLM
   - XLM: 1,000,000
   - yXLM: 950,000
   - Hedef Fiyat: 1 yXLM = 1.05 XLM (staking premium)
```

### Tier 3 Pools (Düşük Likidite - Yüksek Arbitraj)
```
7. USDC/NGN
   - USDC: 50,000
   - NGN: 40,000,000
   - Hedef Fiyat: 1 USDC = 800 NGN

8. USDC/INR
   - USDC: 50,000
   - INR: 4,200,000
   - Hedef Fiyat: 1 USDC = 84 INR

9. EURC/BRLT
   - EURC: 40,000
   - BRLT: 200,000
   - Hedef Fiyat: 1 EUR = 5 BRL
```

### Cross Pools (Arbitraj Paths İçin)
```
10. AQUA/USDC
    - AQUA: 5,000,000
    - USDC: 45,000
    - Hedef Fiyat: 1 USDC = 111 AQUA

11. yXLM/USDC
    - yXLM: 500,000
    - USDC: 55,000
    - Hedef Fiyat: 1 yXLM = $0.11
```

## Arbitraj Senaryoları

### Senaryo 1: Triangular Arbitrage
```
XLM → USDC → AQUA → XLM
- Pool 1: XLM/USDC (1 XLM = $0.10)
- Pool 10: USDC/AQUA (1 USDC = 111 AQUA)
- Pool 3: AQUA/XLM (10 AQUA = 1 XLM)
- Potansiyel Kar: %1-2 (fiyat farklarından)
```

### Senaryo 2: Multi-Hop Remittance
```
USD → EUR → TRY arbitraj
- Pool 2: USDC/EURC (1 USDC = 0.93 EUR)
- Pool 5: EURC/TRYC (1 EUR = 33.75 TRY)
- Direct Pool 4: USDC/TRYC (1 USDC = 32 TRY)
- Kar: Multi-hop 31.38 TRY vs Direct 32 TRY (routing optimization)
```

### Senaryo 3: Emerging Markets
```
USDC → NGN → INR arbitrage
- Pool 7: USDC/NGN
- Pool 8: USDC/INR
- Cross rate optimization
```

## İmplementation Steps

### Step 1: Token Contract'ları Deploy Et
```bash
# Her token için ayrı contract
stellar contract build
stellar contract deploy
```

### Step 2: Token'ları Mint Et
```bash
# Her token için belirlenen miktarlarda
stellar contract invoke --id <TOKEN_ID> -- mint \
  --to <ADMIN_ADDRESS> \
  --amount <AMOUNT>
```

### Step 3: Soroswap Pool'ları Oluştur
```bash
# Factory üzerinden pair oluştur
stellar contract invoke --id <FACTORY> -- create_pair \
  --token_a <TOKEN_A> \
  --token_b <TOKEN_B>
```

### Step 4: Likidite Ekle
```bash
# Her pool için token'ları approve et ve ekle
stellar contract invoke --id <ROUTER> -- add_liquidity \
  --token_a <TOKEN_A> \
  --token_b <TOKEN_B> \
  --amount_a <AMOUNT_A> \
  --amount_b <AMOUNT_B>
```

### Step 5: SaveX Contract'ı Router ile Bağla
```bash
stellar contract invoke --id <SAVEX> -- set_router_address \
  --admin <ADMIN> \
  --router <ROUTER_ADDRESS>

stellar contract invoke --id <SAVEX> -- set_factory_address \
  --admin <ADMIN> \
  --factory <FACTORY_ADDRESS>
```

## Freighter Wallet Üzerinden Swap

Evet! Freighter wallet üzerinden swap yapabilirsin çünkü:

1. **Token'lar Stellar Asset olarak görünür**
2. **Soroswap DEX'i Freighter'a entegre**
3. **Direct swap fonksiyonu var**

### Freighter'da Swap Adımları:
```
1. Freighter'ı aç
2. Token'ları import et (contract address ile)
3. Soroswap interface üzerinden veya direkt contract invoke ile swap yap
4. SaveX contract'ı üzerinden de swap yapabilirsin (daha iyi fiyat)
```

## Test Scenarios

### Test 1: Basic Swap
```typescript
// XLM → USDC swap
const result = await savex.transfer_with_swap(
  from: userAddress,
  to: userAddress,
  from_token: XLM_ADDRESS,
  to_token: USDC_ADDRESS,
  amount: 100_0000000, // 100 XLM
  min_output_amount: 9_0000000, // Min 9 USDC (10% slippage)
  path: [] // Direct swap
);
```

### Test 2: Multi-Hop Swap
```typescript
// XLM → USDC → EURC multi-hop
const result = await savex.transfer_with_swap(
  from: userAddress,
  to: userAddress,
  from_token: XLM_ADDRESS,
  to_token: EURC_ADDRESS,
  amount: 100_0000000, // 100 XLM
  min_output_amount: 8_5000000, // Min 8.5 EURC
  path: [USDC_ADDRESS] // Hop through USDC
);
```

### Test 3: Arbitrage Bot
```typescript
// Triangular arbitrage detector
async function findArbitrage() {
  const paths = [
    [XLM, USDC, AQUA, XLM],
    [XLM, USDC, EURC, XLM],
    [USDC, TRYC, EURC, USDC]
  ];

  for (const path of paths) {
    const profit = await simulateArbitrage(path);
    if (profit > 0) {
      await executeArbitrage(path);
    }
  }
}
```

## Sonraki Adımlar

1. ✅ Token contract'larını deploy et
2. ✅ Token'ları mint et
3. ✅ Pool'ları oluştur
4. ✅ Likidite ekle
5. ✅ SaveX'i konfigüre et
6. ✅ UI'dan test et
7. ✅ Arbitraj bot'u implement et

## Notlar

- Testnet XLM Friendbot'tan alınabilir
- Token mint işlemi admin tarafından yapılır
- Pool oluşturma için Soroswap Factory kullanılır
- Arbitraj için minimum %0.5 kar hedefle (gas fees için)
