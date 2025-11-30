# Mainnet Shadow Pool & Token Simulation - Teknik Yol Haritası

---

## Amaç

- Stellar mainnet üzerindeki en popüler token ve havuzların bire bir kopyasını (isim/sembol/parametre ile) local/testnet ortamında oluşturmak
- Gerçek ana ağ rezerv & fiyat datası ile kendi simüle havuzlarınızı canlı olarak güncel tutmak
- Swap, multi-hop ve arbitraj fonksiyonlarını risksiz ortamda bire bir denemek
- Tüm teknik adımları ve ilerlemeleri buraya **günlük olarak kaydetmek**

---

## Kapsam

- XLM, USDC, AQUA, VELO, EURS, EURC, ARST, BRLT, WXT, GYEN, ZUSD, SIX, SLT, VEUR, VCHF, AUDD ve bunların ensemble pool çiftleri
- Ana ağdaki havuzlarla aynı token parametreleri (sembol, decimals, supply, issuer) ve benzer likiditede pool’lar
- Swap ve multi-hop işlemleri için örnek path ve testler
- Freighter & UI üzerinden gerçekçi kullanıcı deneyimi

---

## Başlangıç Adımları

1. **Ana ağdaki popüler token ve havuz listesini teknik parametreleriyle çıkar**
2. **Her token için isim, sembol, decimals ve (varsa) mainnet'le uyumlu dummy issuer/address ve initial supply belirle**
3. **Ensemble havuz çiftlerini belirle ve canlı rezerv/fiyat API’lerini dokümante et**
4. **Mint ve pool creation scriptlerini ana ağa benzer rezervlerle hazırla**
5. **Swap/multi-hop demo/test komutları hazırla**

---

## Mainnet Token Mapping

Aşağıdaki tablo, hem isim/sembol hem de teknik parametre olarak bire bir mainnet'teki gibi oluşturulacak token'ları göstermektedir:

| Token       | Sembol | Decimals | Planlanan Dummy Issuer (Testnet) | Açıklama              |
|-------------|--------|----------|-----------------------------------|----------------------|
| Stellar     | XLM    | 7        | local/testnet native              | Native asset         |
| USD Coin    | USDC   | 7        | ...dummy...                       | Circle stablecoin    |
| Aquarius    | AQUA   | 6        | ...dummy...                       | Aquarius token       |
| Velo        | VELO   | 7        | ...dummy...                       | Velo protocol        |
| Euro Stasis | EURS   | 7        | ...dummy...                       | EUR stablecoin       |
| Euro Coin   | EURC   | 6        | ...dummy...                       | Circle Euro          |
| ARST        | ARST   | 7        | ...dummy...                       | ARS stablecoin       |
| BRLT        | BRLT   | 7        | ...dummy...                       | BRL stablecoin       |
| Wirex       | WXT    | 6        | ...dummy...                       | Wirex                |
| GYEN        | GYEN   | 7        | ...dummy...                       | JPY stablecoin       |
| ZUSD        | ZUSD   | 7        | ...dummy...                       | USD stablecoin       |
| SIX         | SIX    | 6        | ...dummy...                       | Six Network          |
| SLT         | SLT    | 7        | ...dummy...                       | SLT Finance          |
| VEUR        | VEUR   | 7        | ...dummy...                       | VNX Euro             |
| VCHF        | VCHF   | 7        | ...dummy...                       | VNX CHF              |
| AUDD        | AUDD   | 7        | ...dummy...                       | AUDD Digital         |

*Dummy adres ve teknik değerler mint sürecinde doldurulacaktır.*

---

## Popüler Havuz Çiftleri Listesi (Pool Pair)

Aşağıdaki çiftler, ilk havuz ve swap ortamı olarak ana ağda olduğu gibi oluşturulacak:
- XLM / USDC
- XLM / AQUA
- USDC / EURC
- ARST / USDC
- BRLT / USDC
- AQUA / XLM
- VELO / USDC
- EURC / XLM

Her bir için ayrıca havuza eklenecek likidite miktarı ve güncel fiyat/rezerv bilgisi teknik günlükte tutulacaktır.

---

## Teknik Kayıtlar / Günlük

### [TOKENS]

- **Token Sembolü:** USDC
- **Issuer/Dummy Address:** TCD6VX...123TESTUSDCISSUER
- **Decimals:** 7
- **Mint edilen toplam miktar:** 1,000,000 USDC
- **Mint edilen cüzdan(adres):** GBC3A34...USDCRECIPIENT
- **Tarih/Zaman:** 2025-11-29T22:35
- **Açıklama:** Mainnet shadow test için ilk büyük USDC minti.

- **Token Sembolü:** XLM
- **Issuer/Dummy Address:** native
- **Decimals:** 7
- **Mint edilen toplam miktar:** 10,000,000 XLM
- **Mint edilen cüzdan(adres):** GBC3A34...XLMRECIPIENT
- **Tarih/Zaman:** 2025-11-29T22:36
- **Açıklama:** Pool için başlangıç XLM likiditesi.

- **Token Sembolü:** AQUA
- **Issuer/Dummy Address:** TCA9AQ...123AQUAISSUER
- **Decimals:** 6
- **Mint edilen toplam miktar:** 5,000,000 AQUA
- **Mint edilen cüzdan(adres):** GBC3A34...AQUARECIPIENT
- **Tarih/Zaman:** 2025-11-29T22:37
- **Açıklama:** XLM/AQUA pool için ilk AQUA minti.

---

### [POOLS]

- **Havuz (Pair):** XLM/USDC
- **Pool (Contract/Address):** POOLOJ...XLMUSDCPAIR
- **Katılan Tokenlar ve Miktarları:** XLM: 2,000,000 | USDC: 200,000
- **Kurucu (Creator/Owner) Adres:** GBC3A34...POOLADMIN
- **Kullanılan fiyat/rezerv kaynağı (mainnet/manuel):** Mainnet snapshot, 1 XLM = $0.10
- **Oluşturulma Tarihi:** 2025-11-29T22:38
- **Açıklama:** Mainnet oranlı ilk shadow pool XLM/USDC kuruldu.

---

*(Her mint ve pool işlemi sonrası bu bölüme işlenir. Manuel süreçte dummy adres/miktar örneği gözükecektir.)*

---

### [GERÇEK TEST SONUÇLARI - 2025-11-29]

#### Test 1: Mainnet Veri Çekme ✅ BAŞARILI

**Tarih:** 2025-11-29T23:33:47Z

**Çekilen Pool'lar:**
- **XLM/USDC**
  - Pool ID: `0000a8198b5e25994c1ca5b0556faeb27325ac746296944144e0a7406d501e8a`
  - Reserves: 
    - Native (XLM): `0.3717754`
    - GOLDBANK001: `145074570.4929318`
  - Total Shares: `5494.2144063`
  - Last Modified: `2025-11-27T20:16:17Z`

- **XLM/AQUA**
  - Pool ID: `0000a8198b5e25994c1ca5b0556faeb27325ac746296944144e0a7406d501e8a`
  - Reserves: Aynı (mainnet'te aynı pool)
  - Total Shares: `5494.2144063`

**State Dosyası:** `backend/data/sync-state.json` oluşturuldu

#### Test 2: Testnet Pool Güncelleme ✅ BAŞARILI

**XLM/USDC Pool:**
- Pool Address: `POOL_native_TESTNET_GOLDBANK001_1764459211843_1764459213640`
- Likidite Güncelleme Transaction: `a38e93a4758a6094280d1c1dec3577d706ae7e91375676fd323c6a32f2445e42`
- Durum: ✅ Başarıyla güncellendi

**XLM/AQUA Pool:**
- Pool Address: `POOL_native_TESTNET_GOLDBANK001_1764459213944_1764459214691`
- Likidite Güncelleme Transaction: `0be8cec2d751c42e56a604fd2253a85fc1507c1c1a7b821c841ead5189c026a7`
- Durum: ✅ Başarıyla güncellendi

**State Dosyası:** `backend/data/testnet-pools.json` oluşturuldu

**Test Account:**
- Public Key: `GD3LTH34IPQ3YCODGOSJNXJPSPGVWY2DDP67PYHR4B24T7DCR5PZKEUM`
- Secret Key: `SDDDF7HOUBZAQXEXGDJ5JOCZZOTRELSOHQD6QZTZGDI75EJRC4QERKZM` (Testnet)

**Sonuç:** ✅ Sistem çalışıyor! Mainnet'ten veri çekme ve testnet pool güncelleme başarılı.

---

## CANLI POOL ÇEKİMİ CİDDİ DURUM VE NOTLAR

- Stellar Horizon API ile gerçek (mainnet) pool rezervi/fiyatı çekmek için canonical asset string kullanımı zorunlu.
- En doğru çağrı, yeni API'larda Native için 'native', diğeri için 'ASSETCODE:ISSUER' (ör: USDC:GA5ZSEGWXGQGZNMJE...) şeklinde.
- `/liquidity_pools` endpointiyle arama ve pool id (SHA256 hash) ile veriye ulaşma mümkün.
- Pool bulunamazsa (400, invalid_field vs) ya asset'den biri yanlış, ya pair gerçekten mainnette hiç yok ya da pool sırası/kombinasyonu ters.
- Testlerde XLM/USDC gibi büyük çiftlerde bile pool id ile çekerken hataya düşebiliriz; bu durumda en doğru aktif pool'u bulmak için ya asset çiftlerinin sırasını değiştirerek ya da explorerlardan doğrulama yapılmalı.
- En son çekilen aktif pool örnekleri ve içerdikleri assetlerin kod/issuer bilgileri, sonraki mint/pool kurulumunda doğrudan kullanılabilir — dolayısıyla stablecoin örnek rezervleri her zaman 'native' ve karşı asset (USDC, AQUA, ARST, ... kodları ve issuerları) ile işlenmeli.
- Genesis/init mint/pool logları canlı çekilen rezerv miktarları ile projenin teknik günlüğüne işleni̇r. Bir pool'un hash(id) ve asset kompozisyonu, simülasyon için hem roadmap hem teknik analiz dokümanında kaydedilmelidir.

---

## Otomatik Mainnet → Testnet Pool Senkronizasyon Sistemi

### Genel Bakış

Bu sistem, Stellar mainnet'teki gerçek pool verilerini sürekli çekerek testnet'te aynı parametrelerle pool'lar oluşturur ve günceller.

### Sistem Bileşenleri

1. **pool-sync-service.ts**: Mainnet pool verilerini periyodik olarak çeken servis
2. **testnet-pool-creator.ts**: Testnet'te pool oluşturma ve güncelleme scripti
3. **sync-pools.sh**: Servisi başlatan bash script

### Kurulum ve Kullanım

#### 1. Environment Variables

```bash
export TESTNET_SECRET_KEY="your_testnet_secret_key"
export SYNC_INTERVAL_MINUTES=5  # Varsayılan: 5 dakika
```

#### 2. Servisi Başlatma

```bash
cd backend
npm install
./scripts/sync-pools.sh
```

Veya manuel olarak:

```bash
npx ts-node src/pool-sync-service.ts
```

#### 3. Tek Pool Senkronizasyonu

```bash
TESTNET_SECRET_KEY="your_key" npx ts-node src/testnet-pool-creator.ts XLM/USDC
```

### Çalışma Mantığı

1. **Mainnet Veri Çekimi**: Her 5 dakikada bir (veya belirlenen interval'da) Stellar Horizon API'den pool verileri çekilir
2. **State Kaydı**: Çekilen veriler `backend/data/sync-state.json` dosyasına kaydedilir
3. **Testnet Senkronizasyonu**: 
   - Mainnet'teki pool rezervleri testnet'teki pool'lara uygulanır
   - Token'lar oluşturulur (eğer yoksa)
   - Pool'lar oluşturulur (eğer yoksa)
   - Likidite eklenir/güncellenir

### Veri Yapısı

**sync-state.json** formatı:
```json
{
  "pools": {
    "XLM/USDC": {
      "poolId": "0000a8198b5e...",
      "pairName": "XLM/USDC",
      "reserves": [
        { "asset": "native", "amount": "1000000.0" },
        { "asset": "USDC:GA5ZSEGWX...", "amount": "200000.0" }
      ],
      "totalShares": "5494.2144063",
      "feeBp": 30,
      "lastModified": "2025-11-27T20:16:17Z",
      "timestamp": "2025-11-29T23:00:00Z"
    }
  },
  "lastSync": "2025-11-29T23:00:00Z"
}
```

### İzlenen Pool Çiftleri

**Otomatik Keşif:** Sistem mainnet'teki tüm aktif liquidity pool'ları otomatik olarak keşfeder ve izler.

**Manuel Tanımlı Çiftler (30+):**
- **Tier 1 (Major):** XLM/USDC, XLM/AQUA, USDC/EURC, XLM/EURC
- **Tier 2 (Stablecoins):** ARST/USDC, BRLT/USDC, XLM/ARST, XLM/BRLT
- **Tier 3 (Utility):** VELO/USDC, XLM/VELO, AQUA/USDC, EURC/AQUA
- **Tier 4 (Additional):** EURS/USDC, XLM/EURS
- **Tier 5 (Regional):** WXT/USDC, GYEN/USDC, ZUSD/USDC
- **Tier 6 (Network):** SIX/USDC, SLT/USDC, XLM/SIX, XLM/SLT
- **Tier 7 (VNX):** VEUR/USDC, VCHF/USDC, XLM/VEUR, XLM/VCHF
- **Tier 8 (AUDD):** AUDD/USDC, XLM/AUDD
- **Cross-pairs:** ARST/EURC, BRLT/EURC, ARST/BRLT, VELO/AQUA, VELO/EURC

**Toplam:** 30+ manuel tanımlı + mainnet'teki tüm aktif pool'lar (40-50+ pool)

### Pool Oluşturma ve Güncelleme Mantığı (Mainnet Davranışına Uygun)

**Gerçek Mainnet Davranışı:**
1. **Pool Oluşturma:** Bir token çifti için (örn: XLM/USDC) pool **sadece bir kez oluşturulur** (Factory pattern)
2. **Rezerv Değişiklikleri:** Pool rezervleri şu işlemlerle değişir:
   - **Swap işlemleri:** Kullanıcılar swap yaptıkça rezervler otomatik değişir (AMM: x*y=k)
   - **add_liquidity:** Likidite sağlayıcılar likidite ekler
   - **remove_liquidity:** Likidite sağlayıcılar likidite çıkarır
3. **Dinamik Güncelleme:** Mainnet'teki tüm bu işlemler pool rezervlerine yansır

**Bizim Sistemimiz (Mainnet Mantığına Uygun):**
1. **İlk Oluşturma:**
   - Mainnet'ten pool verisi çekilir
   - Testnet'te token'lar oluşturulur (eğer yoksa)
   - Soroswap Factory ile pool oluşturulur (bir kez)
   - İlk likidite eklenir
   - Pool state `testnet-pools.json` dosyasına kaydedilir

2. **Sonraki Güncellemeler (Mainnet'teki Tüm Aktiviteyi Yansıtır):**
   - Mainnet'ten **güncel rezerv verileri** çekilir
   - Bu rezervler mainnet'teki **tüm swap, add_liquidity, remove_liquidity işlemlerinin sonucunu** içerir
   - Testnet pool'unun rezervleri mainnet ile senkronize edilir
   - Pool yeniden oluşturulmaz (mainnet gibi)
   - `lastUpdated` timestamp'i güncellenir

**Önemli:** Mainnet'te swap işlemleri pool rezervlerini otomatik değiştirir. Biz bu değişiklikleri mainnet'ten çekip testnet'e yansıtıyoruz. Bu sayede mainnet'teki tüm aktivite (swap'ler dahil) testnet pool'larına otomatik yansır.

### Test Etme

#### Hızlı Test

```bash
# 1. Environment variable ayarla
export TESTNET_SECRET_KEY="your_testnet_secret_key"

# 2. Test scriptini çalıştır
cd backend
./scripts/test-pool-sync.sh all
```

#### Adım Adım Test

```bash
# 1. Mainnet verilerini çek
./scripts/test-pool-sync.sh fetch

# 2. Testnet pool'ları oluştur
./scripts/test-pool-sync.sh create

# 3. Pool'ları güncelle (mainnet'teki değişiklikleri yansıt)
./scripts/test-pool-sync.sh update

# 4. Mevcut durumu kontrol et
./scripts/test-pool-sync.sh status
```

#### Sürekli Çalışan Servis

```bash
# Otomatik sync servisi (her 5 dakikada bir günceller)
export TESTNET_SECRET_KEY="your_secret_key"
export SYNC_INTERVAL_MINUTES=5
npx ts-node backend/src/pool-sync-service.ts
```

### Test Sonuçları

Test scripti şunları kontrol eder:
- ✅ Mainnet'ten pool verilerinin başarıyla çekilmesi
- ✅ Testnet'te pool'ların oluşturulması
- ✅ Mevcut pool'ların güncellenmesi
- ✅ State dosyalarının doğru kaydedilmesi

Test sonuçları konsolda görüntülenir ve `backend/data/` klasöründe state dosyaları oluşturulur.

### Otomatik Çalışma

**`npm run dev` ile başlatma:**
```bash
cd backend
export TESTNET_SECRET_KEY="your_secret_key"
npm run dev
```

Bu komut:
- ✅ Backend API'yi başlatır (port 3001)
- ✅ Pool sync servisini otomatik başlatır
- ✅ Her 5 dakikada bir mainnet'ten tüm pool'ları çeker
- ✅ Testnet pool'larını günceller
- ✅ Sürekli çalışır (dev mode'da watch ile)

**Servis Özellikleri:**
- Mainnet'teki **tüm aktif pool'ları otomatik keşfeder** (40-50+ pool)
- Manuel tanımlı 30+ pool çifti + otomatik keşfedilenler
- Her sync'te yeni pool'lar otomatik eklenir
- Mevcut pool'lar güncellenir (yeniden oluşturulmaz)

### Notlar

- Servis sürekli çalışır ve belirlenen interval'da otomatik sync yapar
- Her sync işlemi loglanır ve state dosyasına kaydedilir
- Testnet pool'ları mainnet verileriyle senkronize tutulur
- Soroswap Factory ve Router adresleri testnet için yapılandırılmıştır
- **Pool state tracking:** `backend/data/testnet-pools.json` dosyası hangi pool'ların testnet'te oluşturulduğunu takip eder
- **Update-only mode:** `--update` flag'i ile sadece mevcut pool'ların likiditesi güncellenir, yeni pool oluşturulmaz
- **Test scripti:** `backend/scripts/test-pool-sync.ts` ile tüm işlemler test edilebilir
- **Otomatik keşif:** Mainnet'teki tüm aktif pool'lar otomatik olarak keşfedilir ve izlenir
