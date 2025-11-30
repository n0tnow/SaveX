/**
 * Pool Data Management
 * Fetches and caches pool data from Soroswap
 */
interface PoolData {
    address: string;
    name: string;
    token0: string;
    token1: string;
    reserve0: string;
    reserve1: string;
    price: number;
    tvl: string;
    lastUpdated: number;
}
/**
 * Get all pools data with caching
 */
export declare function getPoolsData(): Promise<PoolData[]>;
/**
 * Get specific pool by address
 */
export declare function getPoolById(address: string): Promise<PoolData | null>;
export {};
