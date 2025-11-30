#!/bin/bash

# Pool Sync Test Script
# SHADOW_POOL_SIMULATION.md'deki pool'ları test eder

set -e

echo "=========================================="
echo "SHADOW POOL SYNC TEST"
echo "=========================================="
echo ""

# Environment check
if [ -z "$TESTNET_SECRET_KEY" ]; then
    echo "⚠️  UYARI: TESTNET_SECRET_KEY environment variable ayarlanmamış!"
    echo ""
    echo "Kullanım:"
    echo "  export TESTNET_SECRET_KEY=\"your_secret_key\""
    echo "  ./scripts/test-pool-sync.sh [command]"
    echo ""
    echo "Komutlar:"
    echo "  all     - Tüm testleri çalıştır (varsayılan)"
    echo "  fetch   - Sadece mainnet verilerini çek"
    echo "  create  - Testnet pool'ları oluştur"
    echo "  update  - Mevcut pool'ları güncelle"
    echo "  status  - Mevcut durumu göster"
    echo ""
    exit 1
fi

cd "$(dirname "$0")/.."

COMMAND=${1:-all}

case $COMMAND in
    fetch)
        echo "📥 Mainnet verilerini çekiyor..."
        npx ts-node scripts/test-pool-sync.ts fetch
        ;;
    create)
        echo "🏗️  Testnet pool'ları oluşturuyor..."
        npx ts-node scripts/test-pool-sync.ts create
        ;;
    update)
        echo "🔄 Pool'ları güncelliyor..."
        npx ts-node scripts/test-pool-sync.ts update
        ;;
    status)
        echo "📊 Mevcut durumu gösteriyor..."
        npx ts-node scripts/test-pool-sync.ts status
        ;;
    all)
        echo "🚀 Tüm testleri çalıştırıyor..."
        npx ts-node scripts/test-pool-sync.ts all
        ;;
    *)
        echo "❌ Bilinmeyen komut: $COMMAND"
        echo "Kullanım: ./scripts/test-pool-sync.sh [all|fetch|create|update|status]"
        exit 1
        ;;
esac

