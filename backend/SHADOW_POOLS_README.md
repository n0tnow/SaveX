# SaveX Shadow Pool Ecosystem

Stellar mainnet'ten pool verilerini çekerek testnet'te simüle eden, arbitraj fırsatlarını tespit eden ve otomatik sync yapan ekosistem.

## 🎯 Özellikler

- ✅ **37,480+ Mainnet Pool Keşfi**: Stellar mainnet'teki tüm liquidity pool'ları otomatik keşfeder
- ✅ **Akıllı Pool Seçimi**: Top 500 pool'u likidite, popülerlik ve aktiviteye göre seçer
- ✅ **CoinGecko Entegrasyonu**: External fiyat verisi çeker ve karşılaştırır
- ✅ **Arbitraj Tespiti**: Direct ve triangular arbitraj fırsatlarını otomatik bulur
- ✅ **Testnet Deployment**: Gerçek Stellar assets ve liquidity pools oluşturur
- ✅ **Otomatik Sync**: 5 dakikada bir güncellemeleri çeker

## 📊 Mevcut Durum

### Keşfedilen Veriler
- **Total Pools**: 37,480
- **Unique Tokens**: 19,337
- **Selected Pools**: 500 (dengeli dağılım)
- **External Prices**: 7 major token
- **Arbitrage Opportunities**: 59 tespit edildi

### Kategori Dağılımı (Top 500)
- **Major Pairs**: 50 (XLM/USDC, XLM/AQUA vb.)
- **Stablecoin Pairs**: 100
- **DeFi Tokens**: 200
- **Long-tail**: 150

## 🚀 Kurulum

### 1. Dependencies Yükle
```bash
cd backend
npm install
```

### 2. Environment Ayarla
`.env.local` dosyasını düzenle:
```bash
TESTNET_SECRET_KEY=your_testnet_secret_key_here
```

Eğer testnet account'unuz yoksa, `npm run deploy` çalıştırıldığında otomatik oluşturulacak.

### 3. İlk Kurulum (Tüm Adımlar)
```bash
npm run full-setup
```

Bu komut sırasıyla:
1. Mainnet pool'ları keşfeder (~3 dakika)
2. Top 500'ü seçer (~10 saniye)
3. External fiyatları çeker (~5 saniye)
4. Arbitraj fırsatlarını tespit eder (~5 saniye)

## 📝 Kullanım

### Manuel Komutlar

#### 1. Mainnet Pool Keşfi
```bash
npm run discover
```
- Stellar mainnet'teki TÜM liquidity pool'ları çeker
- Output: `data/all_mainnet_pools.json` (46 MB)
- Süre: ~3 dakika

#### 2. Pool Seçimi
```bash
npm run select
```
- 37K pool'dan en iyi 500'ünü seçer
- Kriterleri: Likidite (40%) + Popülerlik (30%) + Aktivite (30%)
- Output: `data/selected_pools_500.json`

#### 3. External Fiyat Çekme
```bash
npm run prices
```
- CoinGecko'dan token fiyatları çeker
- Cache mekanizması (1 dakika)
- Output: `data/external_prices.json`

#### 4. Arbitraj Tespiti
```bash
npm run arbitrage
```
- Direct ve triangular arbitrage tespit eder
- Minimum threshold: %1.0
- Output: `data/arbitrage_opportunities.json`

#### 5. Testnet Deployment
```bash
npm run deploy 10
```
- İlk 10 pool'u testnet'e deploy eder
- Stellar Classic assets ve liquidity pools oluşturur
- Output: `data/deployed_testnet_pools.json`

⚠️ **Not**: Her pool ~2-3 saniye sürer. 500 pool için ~40-60 dakika gerekir.

#### 6. Otomatik Sync Servisi
```bash
npm run auto-sync
```
- 5 dakikada bir otomatik sync yapar
- İlk sync hemen başlar
- CTRL+C ile durdurabilirsiniz

### Otomatik Sync İşlemleri
1. External fiyatları günceller (CoinGecko)
2. Arbitraj fırsatlarını tespit eder
3. State'i kaydeder (`data/auto_sync_state.json`)

## 📁 Veri Dosyaları

```
backend/data/
├── all_mainnet_pools.json          # 37K pool verisi (46 MB)
├── mainnet_tokens.json             # 19K token listesi (4.5 MB)
├── pool_analytics.json             # İstatistikler (6.9 MB)
├── selected_pools_500.json         # Seçilen 500 pool
├── pool_selection_report.json      # Seçim raporu
├── external_prices.json            # CoinGecko fiyatları
├── arbitrage_opportunities.json    # Tespit edilen fırsatlar
├── deployed_testnet_pools.json     # Deploy edilen pool'lar
└── auto_sync_state.json            # Sync durumu
```

## 🔧 Konfigürasyon

### `.env.local`
```bash
# Testnet
TESTNET_SECRET_KEY=S...
TESTNET_NETWORK_PASSPHRASE=Test SDF Network ; September 2015

# Horizon
HORIZON_MAINNET=https://horizon.stellar.org
HORIZON_TESTNET=https://horizon-testnet.stellar.org

# CoinGecko
COINGECKO_BASE_URL=https://api.coingecko.com/api/v3

# Sync
SYNC_INTERVAL_MINUTES=5
ARBITRAGE_THRESHOLD_PERCENT=1.0
```

## 📊 Arbitraj Örnekleri

Top 10 tespit edilen fırsatlar:
```
1. AQUA/EURC - 386382752.40% (direct, low)
2. AQUA/USDC - 287011448.32% (direct, medium)
3. USDC/USDC - 19035467.18% (direct, high)
4. USDC/USDC - 19780.46% (direct, high)
5. USDC/USDC - 5177.58% (direct, high)
```

⚠️ **Not**: Yüksek profit'ler genellikle düşük likidite veya veri tutarsızlığından kaynaklanır.

## 🎯 Sonraki Adımlar

### Kısa Vadeli (6 saat içinde)
- [x] Pool discovery ve selection
- [x] CoinGecko integration
- [x] Arbitrage detection
- [x] Auto-sync service
- [ ] Testnet'e ilk 10-50 pool deploy
- [ ] Frontend API endpoints

### Orta Vadeli
- [ ] Soroban contract deployment (Stellar Classic yerine)
- [ ] Freighter wallet entegrasyonu
- [ ] Frontend swap UI
- [ ] TimeSwap integration

### Uzun Vadeli
- [ ] Multi-hop path optimization
- [ ] Slippage hesaplama
- [ ] Gas optimization
- [ ] Production deployment

## 🐛 Troubleshooting

### "Selected pools not found"
```bash
npm run select
```

### "External prices not found"
```bash
npm run prices
```

### Rate Limiting (CoinGecko)
- Free tier: 10-50 calls/minute
- Cache mekanizması otomatik çalışır
- Gerekirse batch size'ı azaltın

### Testnet Deployment Hataları
- Friendbot'tan XLM alın: https://friendbot.stellar.org
- Secret key'i `.env.local`'de doğru ayarlayın
- Network bağlantısını kontrol edin

## 📚 Kaynaklar

- [Stellar SDK](https://github.com/stellar/js-stellar-sdk)
- [Horizon API](https://developers.stellar.org/api/horizon)
- [CoinGecko API](https://www.coingecko.com/en/api)
- [Soroswap](https://soroswap.finance/)

## 📄 Lisans

MIT
