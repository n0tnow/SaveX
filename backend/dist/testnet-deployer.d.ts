interface DeployedToken {
    symbol: string;
    issuer: string;
    code: string;
    deployedAt: string;
    testnetAddress: string;
}
interface DeployedPool {
    pairName: string;
    poolId: string;
    tokenA: DeployedToken;
    tokenB: DeployedToken;
    liquidityPoolId?: string;
    createdAt: string;
}
export declare function deployTopPools(count?: number): Promise<DeployedPool[]>;
export {};
