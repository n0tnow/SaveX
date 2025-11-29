# SaveX Backend API

REST API for Soroswap pool monitoring and analytics on Stellar Testnet.

## Features

- ✅ Real-time pool data API
- ✅ In-memory caching (10s TTL)
- ✅ Pool statistics and analytics
- ✅ CORS enabled for frontend integration
- ✅ Health check endpoint

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` if needed (defaults work for testnet).

### 3. Start Server

```bash
# Development (with auto-reload)
npm run dev

# Production
npm run build
npm start
```

## API Endpoints

### `GET /health`

Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-11-30T12:00:00.000Z",
  "uptime": 123.456
}
```

### `GET /api/pools`

Get all Soroswap pools with current reserves and prices.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "address": "CDT3AHGQ...",
      "name": "XLM/USDC",
      "token0": "CDLZFC3S...",
      "token1": "CDWEFYYH...",
      "reserve0": "540241170794",
      "reserve1": "10527988821",
      "price": 0.019488,
      "tvl": "55076.92",
      "lastUpdated": 1701349200000
    }
  ],
  "count": 5,
  "timestamp": 1701349200000
}
```

### `GET /api/pools/:address`

Get specific pool by contract address.

**Example:**
```bash
curl http://localhost:3001/api/pools/CDT3AHGQC4PYFGMJWBIY2VLZIZ7CBMCKZ7BZMYC55WIVPDPRYWYBHD4I
```

**Response:**
```json
{
  "success": true,
  "data": {
    "address": "CDT3AHGQ...",
    "name": "XLM/USDC",
    "reserve0": "540241170794",
    "reserve1": "10527988821",
    "price": 0.019488,
    "tvl": "55076.92",
    "lastUpdated": 1701349200000
  },
  "timestamp": 1701349200000
}
```

### `GET /api/stats`

Get aggregate statistics across all pools.

**Response:**
```json
{
  "success": true,
  "data": {
    "totalPools": 5,
    "totalLiquidity": 1234567890000,
    "averagePrice": 0.583,
    "lastUpdated": 1701349200000
  },
  "timestamp": 1701349200000
}
```

## Configuration

Environment variables in `.env`:

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 3001 |
| `NODE_ENV` | Environment | development |
| `NETWORK` | Stellar network | testnet |
| `RPC_URL` | Soroban RPC URL | https://soroban-testnet.stellar.org |
| `CACHE_TTL_SECONDS` | Cache lifetime | 10 |

## Caching

The API uses in-memory caching to reduce RPC calls:

- **Cache TTL**: 10 seconds
- **Cache Strategy**: Stale-while-revalidate
- **Cache Invalidation**: Automatic after TTL

For production, consider using Redis for distributed caching.

## Integration with Frontend

Add to your Next.js frontend:

```typescript
// lib/api.ts
const API_URL = 'http://localhost:3001';

export async function getPools() {
  const response = await fetch(`${API_URL}/api/pools`);
  const data = await response.json();
  return data.data;
}

export async function getPoolStats() {
  const response = await fetch(`${API_URL}/api/stats`);
  const data = await response.json();
  return data.data;
}
```

## Performance

- **Cold start**: ~2-3 seconds (fetches all pools)
- **Cached response**: <10ms
- **Concurrent requests**: Shared cache prevents duplicate RPC calls
- **Rate limiting**: None (uses public RPC)

## Monitored Pools

Currently monitoring 5 Soroswap testnet pools:

1. XTAR/USDC
2. XLM/USDC
3. USDC/XLM
4. EURC/USDC
5. XTAR/AQUA

See [../LIQUIDITY_POOLS.md](../LIQUIDITY_POOLS.md) for full details.

## Roadmap

- [x] REST API for pool data
- [x] In-memory caching
- [x] Statistics endpoint
- [ ] WebSocket for real-time updates
- [ ] PostgreSQL for historical data
- [ ] Redis for distributed caching
- [ ] Rate limiting
- [ ] Authentication
- [ ] GraphQL API

## License

MIT
