# SaveX - Frontend & Backend Integration Guide

## 🎯 Sistem Mimarisi

```
SaveX/
├── backend/                    # Data processing & API
│   ├── src/
│   │   ├── mainnet-pool-discovery.ts
│   │   ├── pool-selector.ts
│   │   ├── coingecko-service.ts
│   │   ├── arbitrage-engine.ts
│   │   ├── auto-sync-service.ts
│   │   └── api-server.ts      # Express API (opsiyonel)
│   └── data/                   # Generated data files
│
├── savex-ui/                   # Next.js Frontend
│   ├── app/
│   │   └── api/               # Next.js API Routes
│   │       ├── shadow-pools/
│   │       ├── arbitrage/
│   │       └── stats/
│   ├── components/
│   │   └── ShadowPoolDashboard.tsx
│   └── hooks/
│       └── useShadowPools.ts
│
└── DEPLOYMENT.md              # Vercel deployment guide
```

---

## 🚀 Quick Start

### 1. Backend Setup (İlk Kez)
```bash
cd backend

# Dependencies
npm install

# Data oluştur (3-5 dakika)
npm run full-setup

# Sonuç:
# ✅ 37,480 pool keşfedildi
# ✅ 500 pool seçildi
# ✅ 7 token fiyatı çekildi
# ✅ 59 arbitraj fırsatı bulundu
```

### 2. Frontend Development
```bash
cd savex-ui

# Dependencies
npm install

# Dev server başlat
npm run dev

# http://localhost:3000
```

**Frontend otomatik olarak backend data'yı kullanır!**
Backend server'ı ayrıca başlatmanıza gerek yok.

---

## 📡 API Endpoints

### Next.js API Routes (Frontend içinde)

```typescript
// Stats
GET /api/stats

// Pools
GET /api/shadow-pools?limit=100&category=major

// Arbitrage
GET /api/arbitrage?minProfit=1&confidence=high
```

### Express API Server (Opsiyonel)

```bash
# Backend API server'ı başlat
cd backend
npm run api

# http://localhost:3001
```

**Not**: Vercel deployment için Express server gerekmez, Next.js API routes yeterli.

---

## 🔄 Data Güncelleme

### Manuel (Development)
```bash
cd backend

# Tüm data'yı güncelle
npm run full-setup

# Veya tek tek:
npm run select      # Pool seçimi
npm run prices      # External fiyatlar
npm run arbitrage   # Arbitraj tespiti
```

### Otomatik (Production)
```bash
# Auto-sync servisi (5 dakikada bir)
cd backend
npm run auto-sync

# Veya GitHub Actions/Vercel Cron
# (Detaylar DEPLOYMENT.md'de)
```

---

## 💻 Frontend Kullanımı

### 1. React Hooks Kullan

```typescript
import { useShadowPools, useArbitrageOpportunities, useStats } from '@/hooks/useShadowPools';

function MyComponent() {
  const { pools, loading } = useShadowPools(10, 'major');
  const { opportunities } = useArbitrageOpportunities(1, 'high');
  const { stats } = useStats();

  return (
    <div>
      <h1>Total Pools: {stats?.pools?.total}</h1>
      {pools.map(pool => (
        <div key={pool.poolId}>{pool.pairName}</div>
      ))}
    </div>
  );
}
```

### 2. Örnek Dashboard Kullan

```typescript
import ShadowPoolDashboard from '@/components/ShadowPoolDashboard';

export default function Page() {
  return <ShadowPoolDashboard />;
}
```

---

## 🌐 Vercel Deployment

### Tek Komutla Deploy

```bash
# Root dizinde
vercel --prod
```

### Detaylı Adımlar

1. **Backend data oluştur**
   ```bash
   cd backend && npm run full-setup
   ```

2. **Data'yı commit et**
   ```bash
   git add backend/data/
   git commit -m "Add shadow pool data"
   ```

3. **Vercel'e deploy et**
   ```bash
   vercel --prod
   ```

4. **Test et**
   ```bash
   curl https://your-app.vercel.app/api/stats
   ```

**Detaylı guide**: `DEPLOYMENT.md`

---

## 🔧 Sık Sorulan Sorular

### Q: Backend server'ı ayrıca başlatmam gerekiyor mu?
**A**: Hayır! Next.js API routes backend data'yı direkt okuyor. Sadece `npm run dev` yeterli.

### Q: Data nasıl güncellenir?
**A**: 
- **Development**: `cd backend && npm run full-setup`
- **Production**: GitHub Actions veya Vercel Cron (DEPLOYMENT.md'de detaylar)

### Q: Vercel'de backend data'ya nasıl erişilir?
**A**: Next.js API routes `../backend/data/` dizininden okur. Vercel build sırasında bu dosyalar dahil edilir.

### Q: Auto-sync servisi Vercel'de çalışır mı?
**A**: Hayır, Vercel serverless. Bunun yerine:
- GitHub Actions (önerilen)
- Vercel Cron Jobs
- External cron service

### Q: Pool deployment testnet'e nasıl yapılır?
**A**: Şu an için manuel simülasyon. Gerçek Soroban deployment için:
```bash
cd backend
npm run deploy 10  # İlk 10 pool
```
(Stellar SDK liquidity pool API düzeltmesi gerekiyor)

---

## 📊 Mevcut Durum

### ✅ Tamamlanan
- [x] 37,480 pool keşfi
- [x] Top 500 pool seçimi
- [x] CoinGecko entegrasyonu
- [x] Arbitraj tespiti
- [x] Auto-sync servisi
- [x] Next.js API routes
- [x] React hooks
- [x] Örnek dashboard
- [x] Vercel deployment guide

### 🔧 Devam Eden
- [ ] Stellar SDK liquidity pool deployment
- [ ] Soroban contract entegrasyonu
- [ ] Freighter wallet bağlantısı
- [ ] Gerçek swap işlemleri

---

## 🎯 Sonraki Adımlar

### Kısa Vadeli (Bugün)
1. Frontend'de Shadow Pool Dashboard'u entegre et
2. Vercel'e ilk deployment yap
3. Data güncelleme stratejisi seç (GitHub Actions önerilen)

### Orta Vadeli (Bu Hafta)
1. Stellar SDK liquidity pool API'sini düzelt
2. İlk 10-50 pool'u testnet'e deploy et
3. Freighter wallet entegrasyonu
4. Swap UI geliştir

### Uzun Vadeli (Gelecek)
1. Soroban contract deployment
2. TimeSwap entegrasyonu
3. Multi-hop path optimization
4. Production monitoring

---

## 📚 Dosya Referansları

- `DEPLOYMENT.md` - Vercel deployment detayları
- `backend/SHADOW_POOLS_README.md` - Backend kullanım kılavuzu
- `savex-ui/hooks/useShadowPools.ts` - React hooks
- `savex-ui/components/ShadowPoolDashboard.tsx` - Örnek component

---

## 🆘 Yardım

### Backend sorunları
```bash
cd backend
npm run full-setup  # Data'yı yeniden oluştur
```

### Frontend sorunları
```bash
cd savex-ui
rm -rf .next node_modules
npm install
npm run dev
```

### API sorunları
```bash
# Local test
curl http://localhost:3000/api/stats

# Production test
curl https://your-app.vercel.app/api/stats
```

---

## ✅ Deployment Checklist

- [ ] Backend data oluşturuldu
- [ ] Data commit edildi
- [ ] Frontend build test edildi
- [ ] API endpoints test edildi
- [ ] Vercel'e deploy edildi
- [ ] Production URL test edildi
- [ ] Data güncelleme stratejisi kuruldu

---

**Hazır! 🚀**

Frontend'i başlattığınızda backend'i ayrıca başlatmanıza gerek yok. Next.js API routes her şeyi hallediyor. Vercel deployment için `DEPLOYMENT.md`'e bakın.
