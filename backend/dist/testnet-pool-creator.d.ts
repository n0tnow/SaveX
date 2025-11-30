interface TestnetPoolState {
    mainnetPoolId: string;
    pairName: string;
    poolAddress: string;
    tokenAAddress: string;
    tokenBAddress: string;
    createdAt: string;
    lastUpdated: string;
}
export declare function syncMainnetPoolToTestnet(sourceSecret: string, pairName: string, updateOnly?: boolean): Promise<TestnetPoolState>;
export {};
