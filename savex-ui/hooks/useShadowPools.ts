"use client";

import { useState, useEffect } from 'react';

interface Pool {
    poolId: string;
    pairName: string;
    category: string;
    totalScore: number;
    totalShares: string;
    reserves: any[];
}

interface ArbitrageOpportunity {
    type: string;
    pairName: string;
    profitPercent: number;
    confidence: string;
    timestamp: string;
}

interface Stats {
    pools: {
        total: number;
        categories: any;
    } | null;
    arbitrage: {
        totalOpportunities: number;
        highConfidence: number;
        mediumConfidence: number;
        lowConfidence: number;
        lastUpdated: string;
    } | null;
    prices: {
        totalTokens: number;
        lastUpdated: string;
    } | null;
    sync: any;
    timestamp: string;
}

export function useShadowPools(limit = 100, category?: string) {
    const [pools, setPools] = useState<Pool[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchPools() {
            try {
                const params = new URLSearchParams({
                    limit: limit.toString(),
                });
                if (category) params.append('category', category);

                const response = await fetch(`/api/shadow-pools?${params}`);
                if (!response.ok) throw new Error('Failed to fetch pools');

                const data = await response.json();
                setPools(data.pools);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }

        fetchPools();
    }, [limit, category]);

    return { pools, loading, error };
}

export function useArbitrageOpportunities(minProfit = 1, confidence?: string) {
    const [opportunities, setOpportunities] = useState<ArbitrageOpportunity[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchOpportunities() {
            try {
                const params = new URLSearchParams({
                    minProfit: minProfit.toString(),
                    limit: '50',
                });
                if (confidence) params.append('confidence', confidence);

                const response = await fetch(`/api/arbitrage?${params}`);
                if (!response.ok) throw new Error('Failed to fetch arbitrage opportunities');

                const data = await response.json();
                setOpportunities(data.opportunities);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }

        fetchOpportunities();
    }, [minProfit, confidence]);

    return { opportunities, loading, error };
}

export function useStats() {
    const [stats, setStats] = useState<Stats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchStats() {
            try {
                const response = await fetch('/api/stats');
                if (!response.ok) throw new Error('Failed to fetch stats');

                const data = await response.json();
                setStats(data);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }

        fetchStats();

        // Auto-refresh every 5 minutes
        const interval = setInterval(fetchStats, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    return { stats, loading, error };
}

export function useTestnetPools() {
    const [pools, setPools] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchPools() {
            try {
                const response = await fetch('/api/testnet-pools');
                if (!response.ok) throw new Error('Failed to fetch testnet pools');

                const data = await response.json();
                setPools(data.pools);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }

        fetchPools();
    }, []);

    return { pools, loading, error };
}
