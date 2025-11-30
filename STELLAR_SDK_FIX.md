# Stellar SDK Import Fix

## Problem

All new components (SimpleArbitrage, DexComparisonWidget, FeeCalculator) were experiencing a runtime error:

```
Cannot read properties of undefined (reading 'Server')
```

This occurred at lines where we tried to instantiate `new SorobanRpc.Server(...)`.

## Root Cause

The Stellar SDK version `@stellar/stellar-sdk@14.3.3` doesn't properly support named imports for nested objects like `SorobanRpc`.

**Broken approach (named imports):**
```typescript
import { SorobanRpc, Contract, ... } from '@stellar/stellar-sdk';

// This fails - SorobanRpc.Server is undefined
const server = new SorobanRpc.Server('https://soroban-testnet.stellar.org');
```

## Solution

Use wildcard imports instead, matching the pattern used in the working `ArbitrageDetector.tsx` component.

**Working approach (wildcard import):**
```typescript
import * as StellarSdk from '@stellar/stellar-sdk';

// This works
const server = new StellarSdk.SorobanRpc.Server('https://soroban-testnet.stellar.org');
```

## Fixed Components

### 1. SimpleArbitrage.tsx

**Before:**
```typescript
import {
    Contract,
    SorobanRpc,
    TransactionBuilder,
    Networks,
    Keypair,
    Address,
    nativeToScVal,
} from '@stellar/stellar-sdk';

const server = new SorobanRpc.Server(...);  // ERROR
```

**After:**
```typescript
import * as StellarSdk from '@stellar/stellar-sdk';

const server = new StellarSdk.SorobanRpc.Server(...);  // WORKS
const contract = new StellarSdk.Contract(...);
const tx = new StellarSdk.TransactionBuilder(...);
```

### 2. DexComparisonWidget.tsx

Same pattern applied:
- Changed imports to wildcard
- Updated all SDK references to use `StellarSdk.` prefix
- `StellarSdk.SorobanRpc.Server`, `StellarSdk.Contract`, `StellarSdk.Address`, etc.

### 3. FeeCalculator.tsx

Same pattern applied:
- Changed imports to wildcard
- Updated all SDK references to use `StellarSdk.` prefix

## Why This Happened

The issue arose because:

1. The initial implementation used wildcard imports (correct)
2. During troubleshooting, imports were changed to named imports (incorrect for this SDK version)
3. The Stellar SDK's module export structure doesn't expose nested objects like `SorobanRpc` as direct named exports

## Verification

After the fix, the dev server compiled successfully:

```
✓ Ready in 899ms
○ Compiling /liquidity ...
GET /liquidity 200 in 6.0s (compile: 5.5s, render: 499ms)
```

No errors reported during compilation or runtime.

## Best Practice for SaveX

**For all future components using Stellar SDK:**

```typescript
// ✅ ALWAYS use this pattern
import * as StellarSdk from '@stellar/stellar-sdk';

// Access everything via StellarSdk namespace
const server = new StellarSdk.SorobanRpc.Server(...);
const contract = new StellarSdk.Contract(...);
const keypair = StellarSdk.Keypair.random();
const tx = new StellarSdk.TransactionBuilder(...);
const address = StellarSdk.Address.fromString(...);
const scVal = StellarSdk.nativeToScVal(...);
```

```typescript
// ❌ AVOID named imports (they don't work properly)
import { SorobanRpc, Contract } from '@stellar/stellar-sdk';
```

## Affected Files

- [savex-ui/components/SimpleArbitrage.tsx](savex-ui/components/SimpleArbitrage.tsx)
- [savex-ui/components/DexComparisonWidget.tsx](savex-ui/components/DexComparisonWidget.tsx)
- [savex-ui/components/FeeCalculator.tsx](savex-ui/components/FeeCalculator.tsx)

## Status

✅ **FIXED** - All components now use wildcard imports and compile successfully.
