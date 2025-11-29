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
