import * as StellarSdk from '@stellar/stellar-sdk';
import { NETWORK_CONFIG, CONTRACTS } from './config';
import freighterApi from '@stellar/freighter-api';

export class StellarService {
  private server: StellarSdk.Horizon.Server;
  private publicKey: string | null = null;

  constructor() {
    this.server = new StellarSdk.Horizon.Server(NETWORK_CONFIG.horizonUrl);
  }

  /**
   * Call Soroban RPC endpoint directly
   */
  private async callSorobanRPC(method: string, params: any): Promise<any> {
    const response = await fetch(NETWORK_CONFIG.rpcUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method,
        params,
      }),
    });

    const data = await response.json();

    console.log('RPC request:', { method, params });
    console.log('RPC response:', data);

    if (data.error) {
      throw new Error(data.error.message || 'RPC error');
    }

    return data.result;
  }

  /**
   * Check if Freighter wallet extension is installed
   * Uses Freighter API's isConnected method
   */
  async waitForFreighter(): Promise<boolean> {
    if (typeof window === 'undefined') {
      console.log('Not in browser environment');
      return false;
    }

    console.log('Checking for Freighter using freighterApi.isConnected()...');

    try {
      // Try to check if Freighter is connected
      const result = await freighterApi.isConnected();
      console.log('Freighter connection check result:', result);

      if (result.error) {
        console.error('Freighter connection check error:', result.error);
        return false;
      }

      return result.isConnected;
    } catch (error) {
      console.error('Error checking Freighter connection:', error);
      return false;
    }
  }

  /**
   * Check if Freighter wallet extension is installed
   */
  async isFreighterInstalled(): Promise<boolean> {
    if (typeof window === 'undefined') {
      return false;
    }

    const result = await freighterApi.isConnected();
    return !result.error;
  }

  /**
   * Connect to Freighter wallet using freighterApi
   * This will ALWAYS show the Freighter popup for user confirmation
   */
  async connectWallet(): Promise<string | null> {
    if (typeof window === 'undefined') {
      throw new Error('Window object not available - are you running on the server?');
    }

    console.log('Attempting to connect to Freighter...');
    console.log('NOTE: If you previously granted access, Freighter may not show a popup.');
    console.log('You can revoke permissions in Freighter settings to see the popup again.');

    try {
      // Check if already allowed (this won't show popup if already granted)
      const allowedCheck = await freighterApi.isAllowed();
      console.log('Permission status:', allowedCheck);

      // Use requestAccess to get public key (triggers Freighter popup for first time)
      const result = await freighterApi.requestAccess();

      console.log('Freighter requestAccess result:', result);

      if (result.error) {
        console.error('Freighter access error:', result.error);
        throw new Error(
          result.error.message || 'Freighter wallet is not installed. Please install Freighter from https://www.freighter.app/'
        );
      }

      if (!result.address) {
        throw new Error('No address returned from Freighter');
      }

      this.publicKey = result.address;
      console.log('✅ Connected to wallet:', result.address);
      console.log('📋 Copy this address to fund it on testnet: https://laboratory.stellar.org/#account-creator');
      return result.address;
    } catch (error) {
      console.error('Freighter connection error:', error);
      if (error instanceof Error) {
        if (error.message.includes('User declined access')) {
          throw new Error('User declined wallet access. Please try again and approve the connection.');
        }
        if (error.message.includes('extension is locked')) {
          throw new Error('Freighter wallet is locked. Please unlock it and try again.');
        }
        throw error;
      }
      throw new Error('Failed to connect to Freighter wallet');
    }
  }

  /**
   * Get current connected public key
   */
  getPublicKey(): string | null {
    return this.publicKey;
  }

  /**
   * Disconnect wallet
   */
  async disconnectWallet(): Promise<void> {
    this.publicKey = null;
  }

  /**
   * Sign a transaction with Freighter
   */
  async signTransaction(xdr: string): Promise<string> {
    if (!this.publicKey) {
      throw new Error('No wallet connected');
    }

    try {
      const result = await freighterApi.signTransaction(xdr, {
        networkPassphrase: NETWORK_CONFIG.networkPassphrase,
        address: this.publicKey,
      });

      if (result.error) {
        throw new Error(result.error.message || 'Failed to sign transaction');
      }

      return result.signedTxXdr;
    } catch (error) {
      console.error('Transaction signing error:', error);
      throw error;
    }
  }

  /**
   * Get real account balance from Stellar network
   * For native XLM or Stellar assets
   */
  async getAccountBalance(address: string, assetCode?: string, assetIssuer?: string): Promise<string> {
    try {
      console.log(`Fetching balance for ${address}, asset: ${assetCode || 'XLM'}`);

      // Load account from Stellar Horizon
      const account = await this.server.loadAccount(address);

      // Find the specific balance
      const balance = account.balances.find((b: any) => {
        // Native XLM
        if (!assetCode && b.asset_type === 'native') {
          return true;
        }
        // Other assets
        if (assetCode && b.asset_code === assetCode && b.asset_issuer === assetIssuer) {
          return true;
        }
        return false;
      });

      if (!balance) {
        console.log(`No balance found for ${assetCode || 'XLM'}`);
        return '0';
      }

      // Convert to stroops (1 XLM = 10,000,000 stroops)
      const balanceInStroops = Math.floor(parseFloat(balance.balance) * 10_000_000).toString();
      console.log(`Balance for ${assetCode || 'XLM'}: ${balance.balance} (${balanceInStroops} stroops)`);

      return balanceInStroops;
    } catch (error: any) {
      console.error('Error fetching balance:', error);

      // Account doesn't exist on network
      if (error?.response?.status === 404) {
        console.log('Account not found on network (not funded yet)');
        return '0';
      }

      return '0';
    }
  }

  /**
   * Get Soroban token balance (for SAC tokens)
   * Calls the balance() method on the token contract
   */
  async getSorobanTokenBalance(address: string, tokenContractId: string): Promise<string> {
    try {
      console.log(`Fetching Soroban token balance for ${address}, token: ${tokenContractId}`);

      // Build contract function call for balance()
      // balance() function signature: fn balance(e: Env, id: Address) -> i128
      const contract = new StellarSdk.Contract(tokenContractId);

      // Create ScVal for address parameter
      const addressScVal = new StellarSdk.Address(address).toScVal();

      // Build the operation
      const operation = contract.call('balance', addressScVal);

      // Create a temporary source account for simulation
      const sourceAccount = await this.server.loadAccount(address).catch(() => {
        // If account doesn't exist, create a dummy one for simulation
        return new StellarSdk.Account(address, '0');
      });

      // Build transaction for simulation
      const transaction = new StellarSdk.TransactionBuilder(sourceAccount, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: NETWORK_CONFIG.networkPassphrase,
      })
        .addOperation(operation)
        .setTimeout(30)
        .build();

      // Simulate the transaction using RPC
      const simulateResponse = await this.callSorobanRPC('simulateTransaction', {
        transaction: transaction.toXDR(),
      });

      console.log('Simulate response:', simulateResponse);

      // Parse the result
      if (simulateResponse.results && simulateResponse.results.length > 0) {
        const result = simulateResponse.results[0];

        if (result.xdr) {
          // Decode the XDR result
          const scVal = StellarSdk.xdr.ScVal.fromXDR(result.xdr, 'base64');

          // Extract balance value (i128)
          if (scVal.switch().name === 'scvI128') {
            const i128Parts = scVal.i128();
            const lo = i128Parts.lo().toString();

            // For most balances, hi will be 0, so we just use lo
            console.log(`Soroban balance for ${tokenContractId}: ${lo}`);
            return lo;
          }
        }
      }

      console.log('No balance found or invalid response');
      return '0';
    } catch (error) {
      console.error('Error fetching Soroban token balance:', error);

      // If error is account not found, return 0
      if (error instanceof Error && error.message.includes('404')) {
        console.log('Account not found, returning 0 balance');
        return '0';
      }

      return '0';
    }
  }

  /**
   * Invoke SaveX contract method
   * This builds, simulates, and submits a transaction to call a contract method
   */
  async invokeSaveXContract(
    method: string,
    params: any[],
    publicKey: string
  ): Promise<{ success: boolean; result?: any; error?: string }> {
    try {
      console.log('Invoking SaveX contract:', { method, params, publicKey });

      // Build contract call
      const contract = new StellarSdk.Contract(CONTRACTS.SAVEX);

      // Convert params to ScVals if they aren't already
      const scValParams = params.map(p => {
        if (typeof p === 'object' && p._switch) {
          return p; // Already an ScVal
        }
        return this.toScVal(p);
      });

      // Build the operation
      const operation = contract.call(method, ...scValParams);

      // Load source account
      const sourceAccount = await this.server.loadAccount(publicKey);

      // Build transaction
      const transaction = new StellarSdk.TransactionBuilder(sourceAccount, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: NETWORK_CONFIG.networkPassphrase,
      })
        .addOperation(operation)
        .setTimeout(30)
        .build();

      // Simulate first to get the result
      console.log('Simulating transaction...');
      const simulateResponse = await this.callSorobanRPC('simulateTransaction', {
        transaction: transaction.toXDR(),
      });

      console.log('Simulation result:', simulateResponse);

      // Check for simulation errors
      if (simulateResponse.error) {
        return {
          success: false,
          error: simulateResponse.error.message || 'Simulation failed',
        };
      }

      // Extract result from simulation
      if (simulateResponse.results && simulateResponse.results.length > 0) {
        const result = simulateResponse.results[0];

        if (result.xdr) {
          const scVal = StellarSdk.xdr.ScVal.fromXDR(result.xdr, 'base64');
          const parsedResult = this.parseScVal(scVal);

          console.log('Contract method result:', parsedResult);

          return {
            success: true,
            result: parsedResult,
          };
        }
      }

      return {
        success: false,
        error: 'No result returned from simulation',
      };
    } catch (error) {
      console.error('Contract invocation error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Convert JavaScript values to ScVal
   */
  private toScVal(value: any): any {
    if (typeof value === 'string') {
      // Check if it's an address
      if (value.startsWith('G') || value.startsWith('C')) {
        return new StellarSdk.Address(value).toScVal();
      }
      // Otherwise treat as string
      return StellarSdk.xdr.ScVal.scvString(value);
    }

    if (typeof value === 'number' || typeof value === 'bigint') {
      // Convert to i128
      return StellarSdk.nativeToScVal(value, { type: 'i128' });
    }

    if (typeof value === 'boolean') {
      return StellarSdk.xdr.ScVal.scvBool(value);
    }

    // Default: try native conversion
    return StellarSdk.nativeToScVal(value);
  }

  /**
   * Parse ScVal to JavaScript value
   */
  private parseScVal(scVal: any): any {
    const switchName = scVal.switch().name;

    switch (switchName) {
      case 'scvBool':
        return scVal.b();

      case 'scvU32':
        return scVal.u32();

      case 'scvI32':
        return scVal.i32();

      case 'scvU64':
        return scVal.u64().toString();

      case 'scvI64':
        return scVal.i64().toString();

      case 'scvU128':
        const u128Parts = scVal.u128();
        return u128Parts.lo().toString();

      case 'scvI128':
        const i128Parts = scVal.i128();
        return i128Parts.lo().toString();

      case 'scvString':
        return scVal.str().toString();

      case 'scvAddress':
        return StellarSdk.Address.fromScVal(scVal).toString();

      case 'scvVec':
        return scVal.vec().map((v: any) => this.parseScVal(v));

      case 'scvMap':
        const mapEntries = scVal.map();
        const result: any = {};
        mapEntries.forEach((entry: any) => {
          const key = this.parseScVal(entry.key());
          const val = this.parseScVal(entry.val());
          result[key] = val;
        });
        return result;

      default:
        console.warn('Unknown ScVal type:', switchName);
        return scVal.toString();
    }
  }

  // Helper to create ScVal parameters
  createScVal = {
    address: (addr: string) => new StellarSdk.Address(addr).toScVal(),
    i128: (value: bigint | string) => StellarSdk.nativeToScVal(value, { type: 'i128' }),
    u128: (value: bigint | string) => StellarSdk.nativeToScVal(value, { type: 'u128' }),
    i64: (value: bigint | string) => StellarSdk.xdr.ScVal.scvI64(new StellarSdk.xdr.Int64(BigInt(value))),
    u64: (value: number | bigint) => StellarSdk.xdr.ScVal.scvU64(new StellarSdk.xdr.Uint64(BigInt(value))),
    u32: (value: number) => StellarSdk.xdr.ScVal.scvU32(value),
    i32: (value: number) => StellarSdk.xdr.ScVal.scvI32(value),
    bool: (value: boolean) => StellarSdk.xdr.ScVal.scvBool(value),
    string: (value: string) => StellarSdk.xdr.ScVal.scvString(value),
    vec: (values: any[]) => StellarSdk.xdr.ScVal.scvVec(values),
  };
}

export const stellarService = new StellarService();