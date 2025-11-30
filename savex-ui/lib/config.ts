/**
 * SaveX Contract Configuration
 * Network: Stellar Testnet
 */

export const NETWORK_CONFIG = {
  network: 'TESTNET' as const,
  networkPassphrase: 'Test SDF Network ; September 2015',
  rpcUrl: 'https://soroban-testnet.stellar.org',
  horizonUrl: 'https://horizon-testnet.stellar.org',
};

export const CONTRACTS = {
  SAVEX: 'CDK4XKO56J7ULHTCNFT6OVPY2FBO6FJEYSXCCQ7QR4TBMQE6XY5DPNGT',  // Updated with arbitrage functions
  SOROSWAP_ROUTER: 'CCMAPXWVZD4USEKDWRYS7DA4Y3D7E2SDMGBFJUCEXTC7VN6CUBGWPFUS',
  SOROSWAP_FACTORY: 'CDJTMBYKNUGINFQALHDMPLZYNGUV42GPN4B7QOYTWHRC4EE5IYJM6AES',
} as const;

export const TOKENS = {
  XLM: {
    address: 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC',
    symbol: 'XLM',
    name: 'Stellar Lumens',
    decimals: 7,
    icon: '⭐',
  },
  USDC: {
    address: 'CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA',
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 7,
    icon: '💵',
  },
  EURC: {
    address: 'CAUL6I3KR55BAOSOE23VRR5FUFD2EEBWF3DHGWUZN7N3ZGVR4QQU6DQM',
    symbol: 'EURC',
    name: 'Euro Coin',
    decimals: 7,
    icon: '💶',
  },
  AQUA: {
    address: 'CD56OXOMAZ55LIKCYVFXH5CP2AKCLYMPMBFRN5XIJVOTWOVY2KFGLZVJ',
    symbol: 'AQUA',
    name: 'Aquarius',
    decimals: 7,
    icon: '💧',
  },
} as const;

export const PACKAGE_TYPES = {
  Family: {
    discount: 15,
    label: 'Family',
    description: '15% discount on all transfers',
    color: 'blue',
  },
  Business: {
    discount: 20,
    label: 'Business',
    description: '20% discount on all transfers',
    color: 'purple',
  },
  Premium: {
    discount: 25,
    label: 'Premium',
    description: '25% discount on all transfers',
    color: 'gold',
  },
} as const;

export const TEST_ACCOUNTS = {
  ALICE: 'GAQC4KNS3P6JB2GLE453ZPZGSYAUTQ5R3MAQYOCOO44XX5RNH25DSX2S',
  BOB: 'GBD363V2QHZ4RDEUCXIM76X5PDAYBCORKADXBYFEJKEHNDDPYZSTP5BX',
} as const;

// Helper to convert stroops to XLM
export const stroopsToXlm = (stroops: bigint | string): string => {
  const amount = typeof stroops === 'string' ? BigInt(stroops) : stroops;
  return (Number(amount) / 10_000_000).toFixed(7);
};

// Helper to convert XLM to stroops
export const xlmToStroops = (xlm: string | number): bigint => {
  const amount = typeof xlm === 'string' ? parseFloat(xlm) : xlm;
  return BigInt(Math.floor(amount * 10_000_000));
};