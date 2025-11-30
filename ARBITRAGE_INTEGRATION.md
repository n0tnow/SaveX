# 🔄 SaveX Arbitrage Integration Guide

**Otomatik Arbitraj Sistemi - Frontend Entegrasyonu**

## 📋 Özet

SaveX arbitraj modülü başarıyla deploy edildi ve frontend'e entegre edildi. Kullanıcılar artık triangular arbitrage fırsatlarını keşfedebilir ve tek tıkla execute edebilirler.

## 🎯 Arbitraj Kontratı

### Kontrat Adresi (Testnet)
```
CDK4XKO56J7ULHTCNFT6OVPY2FBO6FJEYSXCCQ7QR4TBMQE6XY5DPNGT
```

### Kontrat Fonksiyonları

#### 1️⃣ `execute_arbitrage` - Basit 2-Token Arbitraj
```rust
pub fn execute_arbitrage(
    env: Env,
    executor: Address,
    token_a: Address,
    token_b: Address,
    amount: i128,
    min_profit: i128,
) -> i128
```
**Kullanım:** Token A'yı Token B'ye swap et, kar elde et.

#### 2️⃣ `execute_triangular_arbitrage` - Çoklu Hop Arbitraj
```rust
pub fn execute_triangular_arbitrage(
    env: Env,
    executor: Address,
    path: Vec<Address>,  // [XLM, USDC, AQUA, XLM]
    amount: i128,
    min_profit: i128,
) -> i128
```
**Kullanım:** Çoklu token üzerinden döngüsel arbitraj (örn: XLM→USDC→AQUA→XLM)

#### 3️⃣ `estimate_arbitrage_profit` - Kar Tahmini
```rust
pub fn estimate_arbitrage_profit(
    env: Env,
    token_a: Address,
    token_b: Address,
    amount: i128,
) -> i128
```
**Kullanım:** Arbitraj execute etmeden kar tahmini al.

#### 4️⃣ `has_arbitrage_opportunity` - Fırsat Kontrolü
```rust
pub fn has_arbitrage_opportunity(
    env: Env,
    token_a: Address,
    token_b: Address,
    amount: i128,
    min_profit_bps: u32,  // 100 = 1%
) -> bool
```
**Kullanım:** Belirli bir kar eşiğinin üzerinde fırsat var mı kontrol et.

#### 5️⃣ `flash_arbitrage` - Flash Loan Arbitraj
```rust
pub fn flash_arbitrage(
    env: Env,
    executor: Address,
    borrow_token: Address,
    borrow_amount: i128,
    swap_path: Vec<Address>,
    min_profit: i128,
) -> i128
```
**Kullanım:** Ödünç al, arbitraj yap, geri öde (tek transaction).

---

## 🎨 Frontend Entegrasyonu

### Dosya Yapısı

```
savex-ui/
├── components/
│   └── ArbitrageDetector.tsx     # ✅ Güncellendi - Kontrat entegrasyonu
├── app/
│   ├── arbitrage/
│   │   └── page.tsx               # ✅ Arbitraj sayfası
│   └── api/
│       └── arbitrage/
│           └── detect/
│               └── route.ts       # ✅ API - Fırsat tespiti
├── lib/
│   └── config.ts                  # ✅ Güncellendi - Kontrat adresi
└── .env.local                     # ✅ Güncellendi - Çevre değişkenleri
```

### Kod Değişiklikleri

#### 1. Config Güncellendi
**Dosya:** `savex-ui/lib/config.ts`

```typescript
export const CONTRACTS = {
  SAVEX: 'CDK4XKO56J7ULHTCNFT6OVPY2FBO6FJEYSXCCQ7QR4TBMQE6XY5DPNGT',  // ✅ Yeni
  SOROSWAP_ROUTER: 'CCMAPXWVZD4USEKDWRYS7DA4Y3D7E2SDMGBFJUCEXTC7VN6CUBGWPFUS',
  SOROSWAP_FACTORY: 'CDJTMBYKNUGINFQALHDMPLZYNGUV42GPN4B7QOYTWHRC4EE5IYJM6AES',
} as const;
```

#### 2. ArbitrageDetector Component Güncellendi
**Dosya:** `savex-ui/components/ArbitrageDetector.tsx`

**Yeni Özellikler:**
- ✅ Freighter wallet entegrasyonu
- ✅ Stellar SDK ile transaction oluşturma
- ✅ `execute_triangular_arbitrage` kontrat çağrısı
- ✅ Transaction simülasyonu ve imzalama
- ✅ Kullanıcı dostu hata mesajları

**Örnek Kullanım:**
```typescript
const executeArbitrage = async (opp: ArbitrageOpportunity) => {
    // 1. Freighter kontrolü
    if (!window.freighterApi) {
        alert('Please install Freighter wallet');
        return;
    }

    // 2. Kullanıcı public key al
    const publicKey = await window.freighterApi.getPublicKey();

    // 3. Token path oluştur
    const tokenPath = opp.path.map(symbol =>
        TOKENS[symbol].address
    );

    // 4. Transaction oluştur
    const contract = new StellarSdk.Contract(CONTRACTS.SAVEX);
    const tx = new StellarSdk.TransactionBuilder(sourceAccount, {...})
        .addOperation(
            contract.call(
                'execute_triangular_arbitrage',
                publicKey,
                tokenPath,
                amount,
                minProfit
            )
        )
        .build();

    // 5. Simüle et, imzala, gönder
    const simulated = await server.simulateTransaction(tx);
    const prepared = StellarSdk.SorobanRpc.assembleTransaction(tx, simulated).build();
    const signedXdr = await window.freighterApi.signTransaction(prepared.toXDR());
    const result = await server.sendTransaction(signedTx);
}
```

---

## 🚀 Kullanım Adımları

### 1. Frontend'i Başlat

```bash
cd savex-ui
npm run dev
```

Frontend şu adreste çalışacak: `http://localhost:3000`

### 2. Arbitraj Sayfasına Git

URL: `http://localhost:3000/arbitrage`

### 3. Freighter Wallet Kur

- Chrome Extension: [Freighter Wallet](https://freighter.app/)
- Test account oluştur veya mevcut hesabı import et
- Testnet'e geç

### 4. Arbitraj Fırsatlarını Keşfet

1. **Start Asset** seç (XLM, USDC, AQUA)
2. **Amount** gir (örn: 100)
3. **"🔍 Scan Now"** butonuna tıkla

### 5. Arbitraj Execute Et

1. Yeşil/sarı/beyaz kartlardan birini seç
2. Kar yüzdesini ve path'i kontrol et
3. **"Execute Arbitrage"** butonuna tıkla
4. Freighter popup'ında transaction'ı onayla
5. Transaction hash'i kopyala ve Stellar Expert'te kontrol et

---

## 📊 Arbitraj Tespit Algoritması

### Backend API: `/api/arbitrage/detect`

**Algoritma:**
1. Pool verilerini yükle (`backend/data/simple_testnet_pools.json`)
2. Fiyat grafiği oluştur (token pairs → exchange rates)
3. Triangular arbitrage path'lerini bul:
   - Start Token → Intermediate1 → Intermediate2 → Start Token
4. Her path için kar hesapla:
   ```
   Amount_1 = Amount_0 * Rate_1 * 0.997  // 0.3% fee
   Amount_2 = Amount_1 * Rate_2 * 0.997
   Amount_3 = Amount_2 * Rate_3 * 0.997
   Profit = Amount_3 - Amount_0
   ```
5. Karlı fırsatları filtrele (>0.5% kar)
6. En karlı 10 tanesini döndür

### Örnek Response

```json
{
  "opportunities": [
    {
      "path": ["XLM", "USDC", "AQUA", "XLM"],
      "profit": 2.4567,
      "profitPercent": 2.45,
      "startAmount": 100,
      "endAmount": 102.4567,
      "steps": [
        { "from": "XLM", "to": "USDC", "rate": 0.25 },
        { "from": "USDC", "to": "AQUA", "rate": 2.1 },
        { "from": "AQUA", "to": "XLM", "rate": 1.95 }
      ]
    }
  ],
  "totalFound": 5,
  "startAsset": "XLM",
  "startAmount": 100
}
```

---

## 🔧 Teknik Detaylar

### Stellar SDK Kullanımı

```typescript
import * as StellarSdk from '@stellar/stellar-sdk';

// 1. Contract instance
const contract = new StellarSdk.Contract(CONTRACTS.SAVEX);

// 2. Transaction builder
const tx = new StellarSdk.TransactionBuilder(sourceAccount, {
  fee: '1000000',  // 0.1 XLM
  networkPassphrase: StellarSdk.Networks.TESTNET,
})
.addOperation(
  contract.call(
    'execute_triangular_arbitrage',
    StellarSdk.Address.fromString(publicKey).toScVal(),
    StellarSdk.nativeToScVal(tokenPath, { type: 'address[]' }),
    StellarSdk.nativeToScVal(amountInStroops, { type: 'i128' }),
    StellarSdk.nativeToScVal(minProfit, { type: 'i128' })
  )
)
.setTimeout(300)
.build();

// 3. Simulate
const server = new StellarSdk.SorobanRpc.Server('https://soroban-testnet.stellar.org');
const simulated = await server.simulateTransaction(tx);

// 4. Prepare
const prepared = StellarSdk.SorobanRpc.assembleTransaction(tx, simulated).build();

// 5. Sign with Freighter
const signedXdr = await window.freighterApi.signTransaction(
  prepared.toXDR(),
  { networkPassphrase: StellarSdk.Networks.TESTNET }
);

// 6. Submit
const signedTx = StellarSdk.TransactionBuilder.fromXDR(signedXdr, StellarSdk.Networks.TESTNET);
const result = await server.sendTransaction(signedTx);
```

### Token Adresleri (Testnet)

```typescript
export const TOKENS = {
  XLM: {
    address: 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC',
    symbol: 'XLM',
    decimals: 7,
  },
  USDC: {
    address: 'CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA',
    symbol: 'USDC',
    decimals: 7,
  },
  AQUA: {
    address: 'CD56OXOMAZ55LIKCYVFXH5CP2AKCLYMPMBFRN5XIJVOTWOVY2KFGLZVJ',
    symbol: 'AQUA',
    decimals: 7,
  },
  EURC: {
    address: 'CAUL6I3KR55BAOSOE23VRR5FUFD2EEBWF3DHGWUZN7N3ZGVR4QQU6DQM',
    symbol: 'EURC',
    decimals: 7,
  },
};
```

---

## ✅ Tamamlanan İşlemler

1. ✅ Arbitraj modülü oluşturuldu ([contracts/savex/src/arbitrage.rs](contracts/savex/src/arbitrage.rs))
2. ✅ Ana kontrata entegre edildi ([contracts/savex/src/lib.rs](contracts/savex/src/lib.rs))
3. ✅ Kontrat build edildi ve deploy edildi
4. ✅ Router adresi yapılandırıldı
5. ✅ Frontend config güncellendi
6. ✅ ArbitrageDetector component güncellendi
7. ✅ Freighter wallet entegrasyonu eklendi
8. ✅ Transaction oluşturma ve imzalama implementasyonu

---

## 🧪 Test Senaryosu

### Manuel Test

1. Frontend'i başlat: `npm run dev`
2. Arbitraj sayfasına git: `/arbitrage`
3. Freighter wallet'ı bağla
4. XLM seç, 100 amount gir
5. "Scan Now" tıkla
6. Bulunan fırsatları gözden geçir
7. En karlı olanı seç ve "Execute Arbitrage" tıkla
8. Freighter'da transaction'ı onayla
9. Transaction hash ile Stellar Expert'te kontrol et

### Beklenen Sonuçlar

- ✅ Arbitraj fırsatları başarıyla listeleniyor
- ✅ Kar yüzdesi doğru hesaplanıyor
- ✅ Execute butonu Freighter açıyor
- ✅ Transaction başarıyla submit ediliyor
- ✅ Kar kullanıcı hesabına geliyor

---

## 🔗 Faydalı Linkler

- **Contract on Stellar Expert:** [Link](https://stellar.expert/explorer/testnet/contract/CDK4XKO56J7ULHTCNFT6OVPY2FBO6FJEYSXCCQ7QR4TBMQE6XY5DPNGT)
- **Soroswap Router:** [Link](https://stellar.expert/explorer/testnet/contract/CCMAPXWVZD4USEKDWRYS7DA4Y3D7E2SDMGBFJUCEXTC7VN6CUBGWPFUS)
- **Freighter Wallet:** https://freighter.app/
- **Stellar Testnet Horizon:** https://horizon-testnet.stellar.org
- **Stellar Testnet Soroban RPC:** https://soroban-testnet.stellar.org

---

## 📝 Notlar

- Arbitraj fırsatları gerçek zamanlı pool verilerine göre hesaplanıyor
- Minimum %0.5 kar eşiği uygulanıyor (slippage için buffer)
- Transaction fee: ~0.1 XLM
- Auto-refresh özelliği 10 saniyede bir fırsatları güncelliyor
- Flash arbitrage henüz lending protokolü entegrasyonu bekliyor

---

## 🎯 Sonraki Adımlar

1. 🔜 Mainnet deployment hazırlığı
2. 🔜 Gerçek lending protokolü entegrasyonu (flash loans)
3. 🔜 Multi-DEX arbitrage (Phoenix + Soroswap)
4. 🔜 MEV protection implementasyonu
5. 🔜 Otomatik bot (off-chain monitoring + auto-execute)

---

**Hazırlayan:** Claude
**Tarih:** 2025-11-30
**Versiyon:** 1.0
