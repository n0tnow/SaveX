export interface ExternalPriceData {
    symbol: string;
    price: number;
    volume24h: number;
    priceChange24h: number;
    marketCap?: number;
    lastUpdated: string;
    source: 'coingecko';
}
export declare function fetchTokenPrice(symbol: string): Promise<ExternalPriceData | null>;
export declare function fetchMultipleTokens(symbols: string[]): Promise<Record<string, ExternalPriceData>>;
export interface PriceComparison {
    pairName: string;
    mainnetPrice: number;
    externalPrice: number;
    priceDifference: number;
    percentDifference: number;
    mainnetSource: 'pool';
    externalSource: 'coingecko';
    timestamp: string;
}
export declare function compareWithMainnet(poolData: {
    pairName: string;
    reserves: any[];
}): Promise<PriceComparison | null>;
export declare function fetchPricesForSelectedPools(): Promise<Record<string, ExternalPriceData>>;
