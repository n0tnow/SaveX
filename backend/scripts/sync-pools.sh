#!/bin/bash

# Mainnet pool verilerini çek ve testnet'e senkronize et

echo "=== SaveX Pool Sync Service ==="
echo ""

# Environment variables
export SYNC_INTERVAL_MINUTES=${SYNC_INTERVAL_MINUTES:-5}
export TESTNET_SECRET_KEY=${TESTNET_SECRET_KEY:-""}

if [ -z "$TESTNET_SECRET_KEY" ]; then
  echo "Error: TESTNET_SECRET_KEY environment variable not set"
  exit 1
fi

echo "Starting pool sync service..."
echo "  Sync Interval: ${SYNC_INTERVAL_MINUTES} minutes"
echo ""

# TypeScript servisini çalıştır
cd "$(dirname "$0")/.."
npx ts-node src/pool-sync-service.ts

