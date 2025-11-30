# Pool Sync Test Kılavuzu

Bu kılavuz, SHADOW_POOL_SIMULATION.md'de belirtilen pool'ları test etmek için adım adım talimatlar içerir.

## Hızlı Başlangıç

### 1. Environment Variable Ayarla

```bash
export TESTNET_SECRET_KEY="your_testnet_secret_key_here"
```

**Not:** Testnet secret key'inizi [Stellar Laboratory](https://laboratory.stellar.org/#account-creator?network=test) üzerinden oluşturabilirsiniz.

### 2. Test Scriptini Çalıştır

```bash
cd backend
./scripts/test-pool-sync.sh all
```

Bu komut:
- ✅ Mainnet'ten güncel pool verilerini çeker
- ✅ Testnet'te pool'ları oluşturur
- ✅ Pool'ları günceller
- ✅ Sonuçları raporlar

## Detaylı Test Adımları

### Adım 1: Mainnet Verilerini Çek

```bash
./scripts/test-pool-sync.sh fetch
```

**Beklenen Çıktı:**
```
[✓] Mainnet verileri başarıyla çekildi!
   Toplam pool sayısı: 2
   
   XLM/USDC:
     Pool ID: 0000a8198b5e...
     Reserves: [...]
     Total Shares: 5494.2144063
```

**Kontrol:** `backend/data/sync-state.json` dosyası oluşturulmalı.

### Adım 2: Testnet Pool'ları Oluştur

```bash
./scripts/test-pool-sync.sh create
```

**Beklenen Çıktı:**
```
[Testing] XLM/USDC...
[✓] XLM/USDC başarıyla oluşturuldu/güncellendi
   Pool Address: POOL_...
   Token A: native
   Token B: TESTNET_USDC_...
```

**Kontrol:** `backend/data/testnet-pools.json` dosyası oluşturulmalı.

### Adım 3: Pool'ları Güncelle

```bash
./scripts/test-pool-sync.sh update
```

Bu komut mainnet'teki değişiklikleri testnet pool'larına yansıtır.

**Beklenen Çıktı:**
```
[Updating] XLM/USDC...
[✓] XLM/USDC başarıyla güncellendi
```

### Adım 4: Mevcut Durumu Kontrol Et

```bash
./scripts/test-pool-sync.sh status
```

**Beklenen Çıktı:**
```
[Mainnet State]
   Son sync: 2025-11-29T23:00:00Z
   Pool sayısı: 2

[Testnet State]
   Pool sayısı: 2
   XLM/USDC:
     Pool Address: POOL_...
     Oluşturulma: 2025-11-29T23:00:00Z
     Son güncelleme: 2025-11-29T23:05:00Z
```

## Sürekli Çalışan Servis

Mainnet'teki değişiklikleri otomatik olarak testnet'e yansıtmak için:

```bash
export TESTNET_SECRET_KEY="your_secret_key"
export SYNC_INTERVAL_MINUTES=5
npm run sync:pools
```

Bu servis:
- Her 5 dakikada bir mainnet verilerini çeker
- Testnet pool'larını günceller
- Değişiklikleri loglar

## Sorun Giderme

### Hata: "TESTNET_SECRET_KEY not set"

```bash
export TESTNET_SECRET_KEY="your_secret_key"
```

### Hata: "Pool not found in mainnet data"

Mainnet'te ilgili pool bulunamadı. `TARGET_PAIRS` listesini kontrol edin veya farklı bir pool deneyin.

### Hata: "Failed to create pool"

- Soroswap Factory adresinin doğru olduğundan emin olun
- Testnet'te yeterli XLM bakiyeniz olduğundan emin olun
- Contract invoke işlemleri için gerekli izinlerin olduğundan emin olun

## Test Sonuçlarını Kontrol Etme

### State Dosyaları

1. **Mainnet State:** `backend/data/sync-state.json`
   - Mainnet'ten çekilen pool verileri
   - Son sync zamanı

2. **Testnet State:** `backend/data/testnet-pools.json`
   - Testnet'te oluşturulan pool'lar
   - Pool adresleri ve token adresleri
   - Oluşturulma ve güncelleme zamanları

### Log Dosyaları

Test scripti konsolda detaylı loglar gösterir:
- ✅ Başarılı işlemler
- ✗ Hatalar
- ⚠️ Uyarılar

## Örnek Test Senaryosu

```bash
# 1. İlk kurulum
export TESTNET_SECRET_KEY="your_key"
cd backend

# 2. Tüm testleri çalıştır
./scripts/test-pool-sync.sh all

# 3. Sadece güncelleme yap
./scripts/test-pool-sync.sh update

# 4. Durumu kontrol et
./scripts/test-pool-sync.sh status

# 5. Sürekli sync servisi başlat
npm run sync:pools
```

## Notlar

- İlk pool oluşturma işlemi biraz zaman alabilir (token deploy + pool creation)
- Güncelleme işlemleri daha hızlıdır (sadece likidite güncelleme)
- Mainnet'teki swap işlemleri otomatik olarak rezerv değişikliklerine yansır
- Testnet pool'ları mainnet rezervleriyle senkronize tutulur

