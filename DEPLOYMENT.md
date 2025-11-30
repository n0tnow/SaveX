# SaveX Deployment Guide

## 🎯 Deployment Stratejisi

SaveX'i Vercel'e deploy etmek için iki yaklaşım var:

### Yaklaşım 1: Vercel ile Serverless (Önerilen) ⭐
- Frontend: Next.js (Vercel)
- Backend Data: Next.js API Routes (Vercel Serverless Functions)
- Data Sync: GitHub Actions veya Vercel Cron Jobs

### Yaklaşım 2: Hybrid (Frontend Vercel + Backend Ayrı)
- Frontend: Next.js (Vercel)
- Backend API: Express server (Railway/Render/DigitalOcean)
- Data Sync: Backend server üzerinde cron job

**Bu guide Yaklaşım 1'i kullanıyor.**

---

## 📋 Ön Hazırlık

### 1. Backend Data Oluştur
```bash
cd backend

# Tüm data'yı oluştur
npm run full-setup

# Sonuç:
# ✅ data/selected_pools_500.json
# ✅ data/arbitrage_opportunities.json
# ✅ data/external_prices.json
# ✅ data/mainnet_tokens.json
```

### 2. Data Dosyalarını Kontrol Et
```bash
ls -lh backend/data/

# Olması gerekenler:
# - selected_pools_500.json
# - arbitrage_opportunities.json
# - external_prices.json
# - mainnet_tokens.json
# - pool_analytics.json
```

---

## 🚀 Vercel Deployment

### Adım 1: Vercel CLI Kur
```bash
npm install -g vercel
```

### Adım 2: Vercel'e Login
```bash
vercel login
```

### Adım 3: Project'i Deploy Et
```bash
# Root dizinde
vercel

# Sorulara cevaplar:
# ? Set up and deploy "~/SaveX"? [Y/n] y
# ? Which scope do you want to deploy to? [Your Account]
# ? Link to existing project? [y/N] n
# ? What's your project's name? savex
# ? In which directory is your code located? ./savex-ui
```

### Adım 4: Production Deploy
```bash
vercel --prod
```

---

## 🔄 Data Güncelleme Stratejisi

### Seçenek 1: GitHub Actions (Otomatik)

`.github/workflows/update-data.yml` oluştur:

```yaml
name: Update Shadow Pool Data

on:
  schedule:
    - cron: '0 */6 * * *'  # Her 6 saatte bir
  workflow_dispatch:  # Manuel tetikleme

jobs:
  update-data:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: |
          cd backend
          npm install
      
      - name: Update pool data
        run: |
          cd backend
          npm run select
          npm run prices
          npm run arbitrage
      
      - name: Commit and push
        run: |
          git config --global user.name 'GitHub Actions'
          git config --global user.email 'actions@github.com'
          git add backend/data/
          git commit -m "chore: update shadow pool data" || exit 0
          git push
      
      - name: Trigger Vercel deployment
        run: |
          curl -X POST https://api.vercel.com/v1/integrations/deploy/${{ secrets.VERCEL_DEPLOY_HOOK }}
```

**Secrets ekle** (GitHub repo → Settings → Secrets):
- `VERCEL_DEPLOY_HOOK`: Vercel deploy hook URL'i

### Seçenek 2: Vercel Cron Jobs (Basit)

`vercel.json`'a ekle:
```json
{
  "crons": [
    {
      "path": "/api/cron/update-data",
      "schedule": "0 */6 * * *"
    }
  ]
}
```

`savex-ui/app/api/cron/update-data/route.ts` oluştur:
```typescript
import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function GET(request: Request) {
  // Vercel cron secret kontrolü
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Backend script'leri çalıştır
    await execAsync('cd ../backend && npm run select');
    await execAsync('cd ../backend && npm run prices');
    await execAsync('cd ../backend && npm run arbitrage');

    return NextResponse.json({ 
      success: true, 
      timestamp: new Date().toISOString() 
    });
  } catch (error: any) {
    return NextResponse.json({ 
      error: error.message 
    }, { status: 500 });
  }
}
```

### Seçenek 3: Manuel Güncelleme
```bash
# Local'de çalıştır
cd backend
npm run full-setup

# Git'e commit et
git add backend/data/
git commit -m "chore: update shadow pool data"
git push

# Vercel otomatik deploy eder
```

---

## 🌐 Environment Variables (Vercel)

Vercel Dashboard → Project → Settings → Environment Variables:

```bash
# Testnet (opsiyonel, eğer deployment yapacaksanız)
TESTNET_SECRET_KEY=S...

# CoinGecko (opsiyonel, rate limit artırmak için)
COINGECKO_API_KEY=your_api_key

# Cron secret (eğer Vercel cron kullanıyorsanız)
CRON_SECRET=your_random_secret
```

---

## 📁 Deployment Checklist

### Pre-deployment
- [ ] Backend data oluşturuldu (`npm run full-setup`)
- [ ] Data dosyaları commit edildi
- [ ] Next.js API routes test edildi
- [ ] `.gitignore` doğru yapılandırıldı
- [ ] Environment variables ayarlandı

### Deployment
- [ ] Vercel CLI ile deploy edildi
- [ ] Production URL test edildi
- [ ] API endpoints çalışıyor
- [ ] Frontend pool listesi görünüyor

### Post-deployment
- [ ] Data güncelleme stratejisi seçildi
- [ ] Cron job/GitHub Actions kuruldu
- [ ] Monitoring kuruldu (opsiyonel)
- [ ] Custom domain bağlandı (opsiyonel)

---

## 🧪 Test Endpoints (Production)

```bash
# Stats
curl https://your-app.vercel.app/api/stats

# Pools
curl https://your-app.vercel.app/api/shadow-pools?limit=10

# Arbitrage
curl https://your-app.vercel.app/api/arbitrage?minProfit=1&limit=10
```

---

## 🐛 Troubleshooting

### "Data not found" hatası
```bash
# Backend data'yı oluştur
cd backend
npm run full-setup

# Commit et
git add backend/data/
git commit -m "Add shadow pool data"
git push
```

### API routes çalışmıyor
```bash
# Next.js dev server'da test et
cd savex-ui
npm run dev

# http://localhost:3000/api/stats
```

### Vercel build hatası
```bash
# Local'de build test et
cd savex-ui
npm run build

# Hataları düzelt
```

### Data güncellenmiyor
```bash
# GitHub Actions log'larını kontrol et
# Vercel Dashboard → Deployments → Logs
```

---

## 📊 Monitoring (Opsiyonel)

### Vercel Analytics
```bash
# savex-ui/package.json
{
  "dependencies": {
    "@vercel/analytics": "^1.0.0"
  }
}
```

```typescript
// savex-ui/app/layout.tsx
import { Analytics } from '@vercel/analytics/react';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
```

---

## 🎯 Production Optimizations

### 1. Data Caching
```typescript
// API route'larda cache header ekle
export async function GET() {
  const data = readDataFile('selected_pools_500.json');
  
  return NextResponse.json(data, {
    headers: {
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600'
    }
  });
}
```

### 2. Compression
Vercel otomatik compression yapıyor, ek ayar gerekmez.

### 3. Image Optimization
Next.js Image component kullan:
```typescript
import Image from 'next/image';

<Image src="/logo.png" width={200} height={200} alt="Logo" />
```

---

## 🚀 Quick Deploy

```bash
# Tek komutla deploy
./deploy.sh
```

`deploy.sh` oluştur:
```bash
#!/bin/bash

echo "🚀 SaveX Deployment Script"
echo "=========================="

# 1. Backend data güncelle
echo "📊 Updating backend data..."
cd backend
npm run full-setup
cd ..

# 2. Git commit
echo "📝 Committing changes..."
git add backend/data/
git commit -m "chore: update shadow pool data [skip ci]"

# 3. Vercel deploy
echo "🌐 Deploying to Vercel..."
vercel --prod

echo "✅ Deployment complete!"
```

```bash
chmod +x deploy.sh
./deploy.sh
```

---

## 📚 Kaynaklar

- [Vercel Documentation](https://vercel.com/docs)
- [Next.js API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
- [GitHub Actions](https://docs.github.com/en/actions)
- [Vercel Cron Jobs](https://vercel.com/docs/cron-jobs)
