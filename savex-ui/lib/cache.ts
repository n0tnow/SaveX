import { Redis } from '@upstash/redis';

/**
 * Redis cache utility for API routes
 * Uses Upstash Redis (serverless, free tier available)
 *
 * Setup:
 * 1. Create account at https://upstash.com
 * 2. Create Redis database
 * 3. Add to .env.local:
 *    UPSTASH_REDIS_REST_URL=https://...
 *    UPSTASH_REDIS_REST_TOKEN=...
 */

let redis: Redis | null = null;

/**
 * Get Redis client (lazy initialization)
 */
function getRedisClient(): Redis | null {
  // Check if Redis is configured
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    console.warn('Redis not configured. Caching disabled.');
    return null;
  }

  // Initialize client if not exists
  if (!redis) {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
  }

  return redis;
}

/**
 * Get cached value
 * @param key Cache key
 * @returns Cached value or null
 */
export async function getCache<T>(key: string): Promise<T | null> {
  const client = getRedisClient();
  if (!client) return null;

  try {
    const value = await client.get<T>(key);
    return value;
  } catch (error) {
    console.error('Cache get error:', error);
    return null;
  }
}

/**
 * Set cached value with TTL
 * @param key Cache key
 * @param value Value to cache
 * @param ttl Time to live in seconds (default: 30)
 */
export async function setCache<T>(key: string, value: T, ttl: number = 30): Promise<void> {
  const client = getRedisClient();
  if (!client) return;

  try {
    await client.setex(key, ttl, JSON.stringify(value));
  } catch (error) {
    console.error('Cache set error:', error);
  }
}

/**
 * Delete cached value
 * @param key Cache key
 */
export async function deleteCache(key: string): Promise<void> {
  const client = getRedisClient();
  if (!client) return;

  try {
    await client.del(key);
  } catch (error) {
    console.error('Cache delete error:', error);
  }
}

/**
 * Cache wrapper function
 * @param key Cache key
 * @param fn Function to execute if cache miss
 * @param ttl Time to live in seconds
 * @returns Cached or fresh value
 */
export async function withCache<T>(
  key: string,
  fn: () => Promise<T>,
  ttl: number = 30
): Promise<T> {
  // Try cache first
  const cached = await getCache<T>(key);
  if (cached !== null) {
    return cached;
  }

  // Cache miss - execute function
  const result = await fn();

  // Store in cache
  await setCache(key, result, ttl);

  return result;
}
