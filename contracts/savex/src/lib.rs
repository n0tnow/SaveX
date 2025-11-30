//! SaveX - AI-Powered Cross-Border Remittance Platform
//!
//! A unified smart contract for time-locked transfers, rate locking,
//! batch transfers, and recurring payment packages on Stellar.

#![no_std]

mod types;
mod arbitrage;

use soroban_sdk::{contract, contractclient, contractimpl, token, Address, Env, Vec};

pub use types::*;
pub use arbitrage::*;

// ============================================================================
// Soroswap Interfaces
// ============================================================================

/// Soroswap Router contract interface for token swaps
/// Testnet Router: CCMAPXWVZD4USEKDWRYS7DA4Y3D7E2SDMGBFJUCEXTC7VN6CUBGWPFUS
#[contractclient(name = "SoroswapRouterClient")]
pub trait SoroswapRouter {
    /// Swap exact amount of input tokens for as many output tokens as possible
    fn swap_exact_tokens_for_tokens(
        env: Env,
        amount_in: i128,
        amount_out_min: i128,
        path: Vec<Address>,
        to: Address,
        deadline: u64,
    ) -> Vec<i128>;

    /// Get amounts out for a given input amount and path
    fn get_amounts_out(
        env: Env,
        amount_in: i128,
        path: Vec<Address>,
    ) -> Vec<i128>;
}

/// Soroswap Factory contract interface
#[contractclient(name = "SoroswapFactoryClient")]
pub trait SoroswapFactory {
    /// Get pair address for two tokens
    fn get_pair(env: Env, token_a: Address, token_b: Address) -> Address;
}

/// Soroswap Pair contract interface
#[contractclient(name = "SoroswapPairClient")]
pub trait SoroswapPair {
    /// Get reserves of the pair
    fn get_reserves(env: Env) -> (i128, i128, u64);

    /// Get token addresses
    fn token_0(env: Env) -> Address;
    fn token_1(env: Env) -> Address;
}

// Storage TTL constants
const DAY_IN_LEDGERS: u32 = 17280; // Approximately 1 day
const INSTANCE_BUMP_AMOUNT: u32 = 7 * DAY_IN_LEDGERS; // 7 days
const INSTANCE_LIFETIME_THRESHOLD: u32 = INSTANCE_BUMP_AMOUNT - DAY_IN_LEDGERS;

// ============================================================================
// Contract Definition
// ============================================================================

#[contract]
pub struct SaveXContract;

// ============================================================================
// Helper Functions
// ============================================================================

/// Check if the contract is initialized
fn is_initialized(env: &Env) -> bool {
    env.storage().instance().has(&DataKey::Admin)
}

/// Check if the contract is paused
fn is_paused(env: &Env) -> bool {
    env.storage()
        .instance()
        .get(&DataKey::IsPaused)
        .unwrap_or(false)
}

/// Helper: Store transfer in persistent storage with TTL
fn store_transfer(env: &Env, transfer: &Transfer) {
    let key = PersistentDataKey::Transfer(transfer.id);
    env.storage().persistent().set(&key, transfer);
    env.storage().persistent().extend_ttl(&key, INSTANCE_LIFETIME_THRESHOLD, INSTANCE_BUMP_AMOUNT);
}

/// Get the next transfer ID
fn next_transfer_id(env: &Env) -> u64 {
    let current: u64 = env.storage()
        .instance()
        .get(&DataKey::TransferCounter)
        .unwrap_or(0);
    let next = current + 1;
    env.storage().instance().set(&DataKey::TransferCounter, &next);
    next
}

/// Get the next rate lock ID
fn next_rate_lock_id(env: &Env) -> u64 {
    let current: u64 = env.storage()
        .instance()
        .get(&DataKey::RateLockCounter)
        .unwrap_or(0);
    let next = current + 1;
    env.storage().instance().set(&DataKey::RateLockCounter, &next);
    next
}

/// Check time bound validity
fn check_time_bound(env: &Env, time_bound: &TimeBound) -> bool {
    let ledger_timestamp = env.ledger().timestamp();

    match time_bound.kind {
        TimeBoundKind::Before => ledger_timestamp <= time_bound.timestamp,
        TimeBoundKind::After => ledger_timestamp >= time_bound.timestamp,
    }
}

/// Calculate basic fee (without discounts)
fn calculate_base_fee(amount: i128, fee_structure: &FeeStructure) -> i128 {
    // Calculate percentage fee
    let percentage_fee = (amount * fee_structure.percentage_fee as i128) / 10000;

    // Total fee = base + percentage
    let total_fee = fee_structure.base_fee + percentage_fee;

    // Apply min/max bounds
    if total_fee < fee_structure.min_fee {
        fee_structure.min_fee
    } else if total_fee > fee_structure.max_fee {
        fee_structure.max_fee
    } else {
        total_fee
    }
}

// ============================================================================
// Contract Implementation
// ============================================================================

#[contractimpl]
impl SaveXContract {

    // ========================================================================
    // Initialization & Admin
    // ========================================================================

    /// Initialize the contract with admin address
    pub fn initialize(env: Env, admin: Address) {
        if is_initialized(&env) {
            panic!("Already initialized");
        }

        admin.require_auth();

        // Set admin
        env.storage().instance().set(&DataKey::Admin, &admin);

        // Initialize counters
        env.storage().instance().set(&DataKey::TransferCounter, &0u64);
        env.storage().instance().set(&DataKey::RateLockCounter, &0u64);
        env.storage().instance().set(&DataKey::PackageCounter, &0u64);

        // Set default unpausedt
        env.storage().instance().set(&DataKey::IsPaused, &false);
    }

    /// Pause the contract (admin only)
    pub fn pause(env: Env, admin: Address) {
        admin.require_auth();

        let stored_admin: Address = env.storage()
            .instance()
            .get(&DataKey::Admin)
            .expect("Not initialized");

        if admin != stored_admin {
            panic!("Not authorized");
        }

        env.storage().instance().set(&DataKey::IsPaused, &true);
    }

    /// Unpause the contract (admin only)
    pub fn unpause(env: Env, admin: Address) {
        admin.require_auth();

        let stored_admin: Address = env.storage()
            .instance()
            .get(&DataKey::Admin)
            .expect("Not initialized");

        if admin != stored_admin {
            panic!("Not authorized");
        }

        env.storage().instance().set(&DataKey::IsPaused, &false);
    }

    /// Set Soroswap Router address for swap functionality (admin only)
    pub fn set_router_address(env: Env, admin: Address, router: Address) {
        admin.require_auth();

        let stored_admin: Address = env.storage()
            .instance()
            .get(&DataKey::Admin)
            .expect("Not initialized");

        if admin != stored_admin {
            panic!("Not authorized");
        }

        env.storage().instance().set(&DataKey::RouterAddress, &router);
    }

    /// Get configured Soroswap Router address
    pub fn get_router_address(env: Env) -> Address {
        env.storage()
            .instance()
            .get(&DataKey::RouterAddress)
            .expect("Router address not configured")
    }

    /// Set Soroswap Factory address for pool queries (admin only)
    pub fn set_factory_address(env: Env, admin: Address, factory: Address) {
        admin.require_auth();

        let stored_admin: Address = env.storage()
            .instance()
            .get(&DataKey::Admin)
            .expect("Not initialized");

        if admin != stored_admin {
            panic!("Not authorized");
        }

        env.storage().instance().set(&DataKey::FactoryAddress, &factory);
    }

    /// Get configured Soroswap Factory address
    pub fn get_factory_address(env: Env) -> Address {
        env.storage()
            .instance()
            .get(&DataKey::FactoryAddress)
            .expect("Factory address not configured")
    }

    // ========================================================================
    // Rate Locking Module
    // ========================================================================

    /// Lock an exchange rate for future use
    /// Rate should be provided with 7 decimal precision (e.g., 1.5 = 15000000)
    pub fn lock_rate(
        env: Env,
        owner: Address,
        from_token: Address,
        to_token: Address,
        locked_rate: i128,
        amount: i128,
        duration_seconds: u64,
    ) -> u64 {
        if is_paused(&env) {
            panic!("Contract is paused");
        }

        owner.require_auth();

        if amount <= 0 {
            panic!("Invalid amount");
        }

        if locked_rate <= 0 {
            panic!("Invalid rate");
        }

        // Maximum lock duration: 24 hours
        if duration_seconds > 86400 {
            panic!("Duration too long (max 24h)");
        }

        let current_time = env.ledger().timestamp();
        let expiry = current_time + duration_seconds;
        let id = next_rate_lock_id(&env);

        let rate_lock = RateLock {
            id,
            owner: owner.clone(),
            from_token,
            to_token,
            locked_rate,
            amount,
            expiry,
            is_active: true,
            created_at: current_time,
        };

        env.storage().persistent().set(&PersistentDataKey::RateLock(id), &rate_lock);
        env.storage().persistent().extend_ttl(&PersistentDataKey::RateLock(id), INSTANCE_LIFETIME_THRESHOLD, INSTANCE_BUMP_AMOUNT);

        id
    }

    /// Get rate lock details
    pub fn get_rate_lock(env: Env, lock_id: u64) -> RateLock {
        env.storage()
            .persistent()
            .get(&PersistentDataKey::RateLock(lock_id))
            .expect("Rate lock not found")
    }

    /// Cancel rate lock (owner only)
    pub fn cancel_rate_lock(env: Env, owner: Address, lock_id: u64) {
        owner.require_auth();

        let mut rate_lock: RateLock = env.storage()
            .persistent()
            .get(&PersistentDataKey::RateLock(lock_id))
            .expect("Rate lock not found");

        if rate_lock.owner != owner {
            panic!("Not authorized");
        }

        if !rate_lock.is_active {
            panic!("Rate lock not active");
        }

        rate_lock.is_active = false;
        env.storage().persistent().set(&PersistentDataKey::RateLock(lock_id), &rate_lock);
        env.storage().persistent().extend_ttl(&PersistentDataKey::RateLock(lock_id), INSTANCE_LIFETIME_THRESHOLD, INSTANCE_BUMP_AMOUNT);
    }

    // ========================================================================
    // Transfer Module
    // ========================================================================

    /// Create an immediate transfer
    pub fn transfer_immediate(
        env: Env,
        from: Address,
        to: Address,
        token: Address,
        amount: i128,
    ) -> u64 {
        if is_paused(&env) {
            panic!("Contract is paused");
        }

        from.require_auth();

        if amount <= 0 {
            panic!("Invalid amount");
        }

        let transfer_id = next_transfer_id(&env);
        let current_time = env.ledger().timestamp();

        // Execute transfer immediately
        token::Client::new(&env, &token).transfer(&from, &to, &amount);

        // Store transfer record
        let transfer = Transfer {
            id: transfer_id,
            from: from.clone(),
            to: to.clone(),
            token: token.clone(),
            amount,
            transfer_type: TransferType::Immediate,
            has_time_bound: false,
            time_bound_kind: TimeBoundKind::After,
            time_bound_timestamp: 0,
            status: TransferStatus::Completed,
            created_at: current_time,
            has_rate_lock: false,
            rate_lock_id: 0,
        };

        env.storage().persistent().set(&PersistentDataKey::Transfer(transfer_id), &transfer);
        env.storage().persistent().extend_ttl(&PersistentDataKey::Transfer(transfer_id), INSTANCE_LIFETIME_THRESHOLD, INSTANCE_BUMP_AMOUNT);

        transfer_id
    }

    /// Create a scheduled (time-locked) transfer
    pub fn transfer_scheduled(
        env: Env,
        from: Address,
        to: Address,
        token: Address,
        amount: i128,
        execute_after: u64,
    ) -> u64 {
        if is_paused(&env) {
            panic!("Contract is paused");
        }

        from.require_auth();

        if amount <= 0 {
            panic!("Invalid amount");
        }

        let current_time = env.ledger().timestamp();

        if execute_after <= current_time {
            panic!("Invalid timestamp (must be in future)");
        }

        let transfer_id = next_transfer_id(&env);

        // Lock tokens in contract
        token::Client::new(&env, &token).transfer(
            &from,
            &env.current_contract_address(),
            &amount
        );

        // Store transfer record
        let transfer = Transfer {
            id: transfer_id,
            from: from.clone(),
            to: to.clone(),
            token: token.clone(),
            amount,
            transfer_type: TransferType::Scheduled,
            has_time_bound: true,
            time_bound_kind: TimeBoundKind::After,
            time_bound_timestamp: execute_after,
            status: TransferStatus::Locked,
            created_at: current_time,
            has_rate_lock: false,
            rate_lock_id: 0,
        };

        env.storage().persistent().set(&PersistentDataKey::Transfer(transfer_id), &transfer);
        env.storage().persistent().extend_ttl(&PersistentDataKey::Transfer(transfer_id), INSTANCE_LIFETIME_THRESHOLD, INSTANCE_BUMP_AMOUNT);

        transfer_id
    }

    /// Execute a scheduled transfer (anyone can call, but only after time)
    pub fn execute_scheduled_transfer(env: Env, transfer_id: u64) {
        if is_paused(&env) {
            panic!("Contract is paused");
        }

        let mut transfer: Transfer = env.storage()
            .persistent()
            .get(&PersistentDataKey::Transfer(transfer_id))
            .expect("Transfer not found");

        if transfer.status != TransferStatus::Locked {
            panic!("Transfer not in locked state");
        }

        if !transfer.has_time_bound {
            panic!("No time bound set");
        }

        let time_bound = TimeBound {
            kind: transfer.time_bound_kind.clone(),
            timestamp: transfer.time_bound_timestamp,
        };

        if !check_time_bound(&env, &time_bound) {
            panic!("Time condition not met");
        }

        // Execute the transfer
        token::Client::new(&env, &transfer.token).transfer(
            &env.current_contract_address(),
            &transfer.to,
            &transfer.amount
        );

        // Update status
        transfer.status = TransferStatus::Completed;
        env.storage().persistent().set(&PersistentDataKey::Transfer(transfer_id), &transfer);
        env.storage().persistent().extend_ttl(&PersistentDataKey::Transfer(transfer_id), INSTANCE_LIFETIME_THRESHOLD, INSTANCE_BUMP_AMOUNT);
    }

    /// Cancel a scheduled transfer (owner only, before execution)
    pub fn cancel_scheduled_transfer(env: Env, owner: Address, transfer_id: u64) {
        owner.require_auth();

        let mut transfer: Transfer = env.storage()
            .persistent()
            .get(&PersistentDataKey::Transfer(transfer_id))
            .expect("Transfer not found");

        if transfer.from != owner {
            panic!("Not authorized");
        }

        if transfer.status != TransferStatus::Locked {
            panic!("Transfer not in locked state");
        }

        // Refund tokens
        token::Client::new(&env, &transfer.token).transfer(
            &env.current_contract_address(),
            &transfer.from,
            &transfer.amount
        );

        // Update status
        transfer.status = TransferStatus::Cancelled;
        env.storage().persistent().set(&PersistentDataKey::Transfer(transfer_id), &transfer);
        env.storage().persistent().extend_ttl(&PersistentDataKey::Transfer(transfer_id), INSTANCE_LIFETIME_THRESHOLD, INSTANCE_BUMP_AMOUNT);
    }

    /// Get transfer details
    pub fn get_transfer(env: Env, transfer_id: u64) -> Transfer {
        env.storage()
            .persistent()
            .get(&PersistentDataKey::Transfer(transfer_id))
            .expect("Transfer not found")
    }

    // ========================================================================
    // Transfer with Rate Lock
    // ========================================================================

    /// Create a transfer using a locked rate
    pub fn transfer_with_rate_lock(
        env: Env,
        from: Address,
        to: Address,
        token: Address,
        amount: i128,
        rate_lock_id: u64,
    ) -> u64 {
        if is_paused(&env) {
            panic!("Contract is paused");
        }

        from.require_auth();

        if amount <= 0 {
            panic!("Invalid amount");
        }

        // Validate rate lock
        let rate_lock: RateLock = env.storage()
            .persistent()
            .get(&PersistentDataKey::RateLock(rate_lock_id))
            .expect("Rate lock not found");

        if rate_lock.owner != from {
            panic!("Not rate lock owner");
        }

        if !rate_lock.is_active {
            panic!("Rate lock not active");
        }

        let current_time = env.ledger().timestamp();
        if current_time > rate_lock.expiry {
            panic!("Rate lock expired");
        }

        if amount > rate_lock.amount {
            panic!("Amount exceeds locked amount");
        }

        let transfer_id = next_transfer_id(&env);

        // Execute transfer immediately with locked rate
        // Note: Rate lock only locks the rate, actual swap still uses current pool state
        // This is a design limitation - true rate locking requires hedging mechanisms
        token::Client::new(&env, &token).transfer(&from, &to, &amount);

        // Store transfer record
        let transfer = Transfer {
            id: transfer_id,
            from: from.clone(),
            to: to.clone(),
            token: token.clone(),
            amount,
            transfer_type: TransferType::Immediate,
            has_time_bound: false,
            time_bound_kind: TimeBoundKind::After,
            time_bound_timestamp: 0,
            status: TransferStatus::Completed,
            created_at: current_time,
            has_rate_lock: true,
            rate_lock_id,
        };

        env.storage().persistent().set(&PersistentDataKey::Transfer(transfer_id), &transfer);
        env.storage().persistent().extend_ttl(&PersistentDataKey::Transfer(transfer_id), INSTANCE_LIFETIME_THRESHOLD, INSTANCE_BUMP_AMOUNT);

        transfer_id
    }

    // ========================================================================
    // Split Transfer
    // ========================================================================

    /// Split transfer: Send part now, part later
    /// Returns tuple of (immediate_transfer_id, scheduled_transfer_id)
    pub fn transfer_split(
        env: Env,
        from: Address,
        to: Address,
        token: Address,
        total_amount: i128,
        immediate_percentage: u32,  // 0-100, e.g., 50 = 50%
        schedule_after: u64,
    ) -> (u64, u64) {
        if is_paused(&env) {
            panic!("Contract is paused");
        }

        from.require_auth();

        if total_amount <= 0 {
            panic!("Invalid amount");
        }

        if immediate_percentage > 100 {
            panic!("Invalid percentage (max 100)");
        }

        let current_time = env.ledger().timestamp();
        if schedule_after <= current_time {
            panic!("Invalid timestamp (must be in future)");
        }

        // Calculate split amounts
        let immediate_amount = (total_amount * immediate_percentage as i128) / 100;
        let scheduled_amount = total_amount - immediate_amount;

        // Execute immediate transfer
        let immediate_id = if immediate_amount > 0 {
            let id = next_transfer_id(&env);
            token::Client::new(&env, &token).transfer(&from, &to, &immediate_amount);

            let transfer = Transfer {
                id,
                from: from.clone(),
                to: to.clone(),
                token: token.clone(),
                amount: immediate_amount,
                transfer_type: TransferType::Split,
                has_time_bound: false,
                time_bound_kind: TimeBoundKind::After,
                time_bound_timestamp: 0,
                status: TransferStatus::Completed,
                created_at: current_time,
                has_rate_lock: false,
                rate_lock_id: 0,
            };

            env.storage().persistent().set(&PersistentDataKey::Transfer(id), &transfer);
            env.storage().persistent().extend_ttl(&PersistentDataKey::Transfer(id), INSTANCE_LIFETIME_THRESHOLD, INSTANCE_BUMP_AMOUNT);
            id
        } else {
            0
        };

        // Create scheduled transfer
        let scheduled_id = if scheduled_amount > 0 {
            let id = next_transfer_id(&env);

            // Lock tokens in contract
            token::Client::new(&env, &token).transfer(
                &from,
                &env.current_contract_address(),
                &scheduled_amount
            );

            let transfer = Transfer {
                id,
                from: from.clone(),
                to: to.clone(),
                token: token.clone(),
                amount: scheduled_amount,
                transfer_type: TransferType::Split,
                has_time_bound: true,
                time_bound_kind: TimeBoundKind::After,
                time_bound_timestamp: schedule_after,
                status: TransferStatus::Locked,
                created_at: current_time,
                has_rate_lock: false,
                rate_lock_id: 0,
            };

            env.storage().persistent().set(&PersistentDataKey::Transfer(id), &transfer);
            env.storage().persistent().extend_ttl(&PersistentDataKey::Transfer(id), INSTANCE_LIFETIME_THRESHOLD, INSTANCE_BUMP_AMOUNT);
            id
        } else {
            0
        };

        (immediate_id, scheduled_id)
    }

    // ========================================================================
    // Batch Transfer
    // ========================================================================

    /// Batch multiple transfers to save on fees
    /// Returns vector of transfer IDs
    pub fn transfer_batch(
        env: Env,
        from: Address,
        recipients: soroban_sdk::Vec<Address>,
        token: Address,
        amounts: soroban_sdk::Vec<i128>,
    ) -> soroban_sdk::Vec<u64> {
        if is_paused(&env) {
            panic!("Contract is paused");
        }

        from.require_auth();

        if recipients.len() != amounts.len() {
            panic!("Recipients and amounts length mismatch");
        }

        if recipients.len() == 0 {
            panic!("Empty batch");
        }

        if recipients.len() > 50 {
            panic!("Batch too large (max 50)");
        }

        let current_time = env.ledger().timestamp();
        let mut transfer_ids = soroban_sdk::Vec::new(&env);

        // Execute all transfers
        for i in 0..recipients.len() {
            let recipient = recipients.get(i).unwrap();
            let amount = amounts.get(i).unwrap();

            if amount <= 0 {
                panic!("Invalid amount in batch");
            }

            // Execute transfer
            token::Client::new(&env, &token).transfer(&from, &recipient, &amount);

            // Store transfer record
            let transfer_id = next_transfer_id(&env);
            let transfer = Transfer {
                id: transfer_id,
                from: from.clone(),
                to: recipient,
                token: token.clone(),
                amount,
                transfer_type: TransferType::Batched,
                has_time_bound: false,
                time_bound_kind: TimeBoundKind::After,
                time_bound_timestamp: 0,
                status: TransferStatus::Completed,
                created_at: current_time,
                has_rate_lock: false,
                rate_lock_id: 0,
            };

            env.storage().persistent().set(&PersistentDataKey::Transfer(transfer_id), &transfer);
            env.storage().persistent().extend_ttl(&PersistentDataKey::Transfer(transfer_id), INSTANCE_LIFETIME_THRESHOLD, INSTANCE_BUMP_AMOUNT);
            transfer_ids.push_back(transfer_id);
        }

        transfer_ids
    }

    // ========================================================================
    // Package System
    // ========================================================================

    /// Subscribe to a package plan
    pub fn subscribe_package(
        env: Env,
        owner: Address,
        package_type: PackageType,
        duration_days: u32,
    ) {
        if is_paused(&env) {
            panic!("Contract is paused");
        }

        owner.require_auth();

        if duration_days == 0 || duration_days > 365 {
            panic!("Invalid duration (1-365 days)");
        }

        // Check if user already has an active package
        if let Some(existing_package) = env.storage()
            .persistent()
            .get::<PersistentDataKey, Package>(&PersistentDataKey::Package(owner.clone()))
        {
            if existing_package.is_active {
                let current_time = env.ledger().timestamp();
                if current_time < existing_package.end_date {
                    panic!("Already have active package");
                }
            }
        }

        let current_time = env.ledger().timestamp();
        let end_date = current_time + (duration_days as u64 * 86400); // 86400 seconds per day

        // Set discount rate based on package type
        let discount_rate = match package_type {
            PackageType::Family => 1500,    // 15% = 1500 basis points
            PackageType::Business => 2000,  // 20% = 2000 basis points
            PackageType::Premium => 2500,   // 25% = 2500 basis points
        };

        let package = Package {
            owner: owner.clone(),
            package_type,
            transfer_count: 0,
            total_volume: 0,
            discount_rate,
            start_date: current_time,
            end_date,
            is_active: true,
        };

        env.storage().persistent().set(&PersistentDataKey::Package(owner.clone()), &package);
        env.storage().persistent().extend_ttl(&PersistentDataKey::Package(owner), INSTANCE_LIFETIME_THRESHOLD, INSTANCE_BUMP_AMOUNT);

        // Increment package counter
        let counter: u64 = env.storage()
            .instance()
            .get(&DataKey::PackageCounter)
            .unwrap_or(0);
        env.storage().instance().set(&DataKey::PackageCounter, &(counter + 1));
    }

    /// Get package details
    pub fn get_package(env: Env, owner: Address) -> Option<Package> {
        env.storage()
            .persistent()
            .get(&PersistentDataKey::Package(owner))
    }

    /// Cancel package subscription
    pub fn cancel_package(env: Env, owner: Address) {
        owner.require_auth();

        let mut package: Package = env.storage()
            .persistent()
            .get(&PersistentDataKey::Package(owner.clone()))
            .expect("Package not found");

        if !package.is_active {
            panic!("Package not active");
        }

        package.is_active = false;
        env.storage().persistent().set(&PersistentDataKey::Package(owner.clone()), &package);
        env.storage().persistent().extend_ttl(&PersistentDataKey::Package(owner), INSTANCE_LIFETIME_THRESHOLD, INSTANCE_BUMP_AMOUNT);
    }


    // ========================================================================
    // DEX Aggregation (Phase 2)
    // ========================================================================

    /// Get quote from Soroswap for a token swap
    /// Queries actual pool reserves and calculates exact output using x*y=k formula
    /// Returns expected output amount
    pub fn get_soroswap_quote(
        env: Env,
        from_token: Address,
        to_token: Address,
        amount: i128,
    ) -> i128 {
        // Check if router and factory are configured
        let has_router = env.storage().instance().has(&DataKey::RouterAddress);
        let has_factory = env.storage().instance().has(&DataKey::FactoryAddress);

        if !has_router || !has_factory {
            panic!("Router or Factory not configured");
        }

        let router_address: Address = env.storage()
            .instance()
            .get(&DataKey::RouterAddress)
            .unwrap();

        let router = SoroswapRouterClient::new(&env, &router_address);

        // Build path for query
        let mut path = Vec::new(&env);
        path.push_back(from_token);
        path.push_back(to_token);

        // Get amounts out from router (this queries actual pool reserves)
        let amounts = router.get_amounts_out(&amount, &path);

        // Return output amount (last element)
        amounts.get(amounts.len() - 1).unwrap()
    }

    /// Get quote from Stellar Classic DEX
    /// Note: Stellar Classic DEX uses order books which cannot be queried directly from Soroban
    /// This returns a conservative estimate based on typical spreads
    /// For exact quotes, use off-chain Horizon API or rely on Soroswap quotes
    /// Returns expected output amount
    pub fn get_stellar_dex_quote(
        _env: Env,
        from_token: Address,
        to_token: Address,
        amount: i128,
    ) -> i128 {
        // Same token check
        if from_token == to_token {
            return amount;
        }

        // Conservative estimate: 99.85% of input (0.15% typical spread for liquid pairs)
        // This is based on historical Stellar DEX spread data for XLM/USDC and similar pairs
        // Real spread varies: 0.05-0.3% for liquid pairs, higher for illiquid pairs
        (amount * 9985) / 10000
    }

    /// Compare all available DEXs and return the best quote
    /// Returns tuple of (dex_name, expected_output)
    /// dex_name: 0 = Stellar DEX, 1 = Soroswap
    pub fn get_best_dex_quote(
        env: Env,
        from_token: Address,
        to_token: Address,
        amount: i128,
    ) -> (u32, i128) {
        let stellar_quote = Self::get_stellar_dex_quote(
            env.clone(),
            from_token.clone(),
            to_token.clone(),
            amount,
        );

        let soroswap_quote = Self::get_soroswap_quote(
            env.clone(),
            from_token,
            to_token,
            amount,
        );

        // Return the better quote
        if stellar_quote > soroswap_quote {
            (0, stellar_quote) // 0 = Stellar DEX
        } else {
            (1, soroswap_quote) // 1 = Soroswap
        }
    }

    // ========================================================================
    // Fee Calculation & Optimization
    // ========================================================================

    /// Calculate fee for a transfer with package discount applied
    pub fn calculate_fee(
        env: Env,
        from: Address,
        amount: i128,
        is_batch: bool,
        batch_size: u32,
    ) -> FeeBreakdown {
        // Default fee structure
        let fee_structure = FeeStructure {
            base_fee: 1000000,          // 0.1 XLM (1 XLM = 10,000,000 stroops)
            percentage_fee: 50,          // 0.5% = 50 basis points
            min_fee: 500000,            // 0.05 XLM minimum
            max_fee: 100000000,         // 10 XLM maximum
        };

        let base_fee = calculate_base_fee(amount, &fee_structure);

        // Apply batch discount (10% per additional transfer)
        let batch_discount = if is_batch && batch_size > 1 {
            let discount_percentage = (batch_size - 1) * 10; // 10% per extra transfer
            let max_discount = 50; // Max 50% discount
            let actual_discount = if discount_percentage > max_discount {
                max_discount
            } else {
                discount_percentage
            };
            (base_fee * actual_discount as i128) / 100
        } else {
            0
        };

        // Apply package discount
        let package_discount = if let Some(package) = env.storage()
            .persistent()
            .get::<PersistentDataKey, Package>(&PersistentDataKey::Package(from.clone()))
        {
            if package.is_active {
                let current_time = env.ledger().timestamp();
                if current_time <= package.end_date {
                    // Apply package discount rate
                    (base_fee * package.discount_rate as i128) / 10000
                } else {
                    0
                }
            } else {
                0
            }
        } else {
            0
        };

        let total_discount = batch_discount + package_discount;
        let total_fee = base_fee - total_discount;
        let final_fee = if total_fee < fee_structure.min_fee {
            fee_structure.min_fee
        } else {
            total_fee
        };

        FeeBreakdown {
            network_fee: base_fee / 2,      // Simulate network fee (half of base)
            service_fee: base_fee / 2,      // Simulate service fee (half of base)
            discount: total_discount,
            total: final_fee,
        }
    }

    /// Estimate savings from scheduling a transfer
    /// Note: This is a heuristic based on historical volatility patterns
    /// Actual savings depend on market conditions at execution time
    /// For more accurate predictions, use off-chain volatility analysis service
    pub fn estimate_schedule_savings(
        _env: Env,
        amount: i128,
        hours_delay: u32,
    ) -> i128 {
        // Heuristic based on historical Stellar DEX spread patterns
        // Night hours (22:00-03:00 UTC) typically show 30-50% lower spreads
        // This translates to 0.05-0.15% savings on the total amount
        let base_savings_bps = if hours_delay >= 24 {
            10  // 0.10% potential savings (24h allows optimal timing)
        } else if hours_delay >= 12 {
            7   // 0.07% potential savings
        } else if hours_delay >= 6 {
            5   // 0.05% potential savings
        } else if hours_delay >= 2 {
            3   // 0.03% potential savings
        } else {
            0   // Minimal savings for short delays
        };

        // Convert basis points to actual amount
        (amount * base_savings_bps) / 10000
    }

    // ========================================================================
    // Multi-Hop Token Swap
    // ========================================================================

    /// Execute a multi-hop token swap with transfer
    /// Automatically converts tokens through optimal DEX path
    /// Example: XLM → USDC → EUR stablecoin
    pub fn transfer_with_swap(
        env: Env,
        from: Address,
        to: Address,
        from_token: Address,
        to_token: Address,
        amount: i128,
        min_output_amount: i128,  // Slippage protection
        path: soroban_sdk::Vec<Address>,  // Intermediary tokens (empty for direct swap)
    ) -> u64 {
        if is_paused(&env) {
            panic!("Contract is paused");
        }

        from.require_auth();

        if amount <= 0 {
            panic!("Invalid amount");
        }

        if min_output_amount <= 0 {
            panic!("Invalid minimum output amount");
        }

        let current_time = env.ledger().timestamp();

        // Transfer input tokens to contract
        token::Client::new(&env, &from_token).transfer(
            &from,
            &env.current_contract_address(),
            &amount
        );

        // Execute swap through path
        let output_amount = if path.len() == 0 {
            // Direct swap: from_token → to_token
            execute_swap(&env, &from_token, &to_token, amount, min_output_amount)
        } else {
            // Multi-hop swap: from_token → path[0] → path[1] → ... → to_token
            execute_multi_hop_swap(&env, &from_token, &to_token, amount, min_output_amount, &path)
        };

        // Transfer output tokens to recipient
        token::Client::new(&env, &to_token).transfer(
            &env.current_contract_address(),
            &to,
            &output_amount
        );

        // Store transfer record
        let transfer_id = next_transfer_id(&env);
        let transfer = Transfer {
            id: transfer_id,
            from: from.clone(),
            to: to.clone(),
            token: to_token.clone(),  // Final token received
            amount: output_amount,
            transfer_type: TransferType::Immediate,
            has_time_bound: false,
            time_bound_kind: TimeBoundKind::After,
            time_bound_timestamp: 0,
            status: TransferStatus::Completed,
            created_at: current_time,
            has_rate_lock: false,
            rate_lock_id: 0,
        };

        store_transfer(&env, &transfer);

        transfer_id
    }

    /// Get optimal swap path between two tokens
    /// Returns suggested intermediary tokens for best rate
    /// Note: Currently returns direct path. For multi-hop optimization,
    /// use off-chain pathfinding service that analyzes all available pools
    pub fn get_swap_path(
        env: Env,
        from_token: Address,
        to_token: Address,
    ) -> SwapPath {
        // Direct swap path (no intermediaries)
        // For exotic pairs, off-chain service should calculate optimal multi-hop route
        // considering factors like:
        // - Pool liquidity
        // - Fee tiers
        // - Slippage
        // - Gas costs

        let intermediary_tokens = soroban_sdk::Vec::new(&env);

        SwapPath {
            from_token,
            to_token,
            intermediary_tokens,
        }
    }

    /// Estimate output amount for a swap
    /// Returns expected amount after swap (requires liquidity pool integration)
    pub fn estimate_swap_output(
        env: Env,
        from_token: Address,
        to_token: Address,
        amount: i128,
    ) -> i128 {
        // Query actual exchange rate from liquidity pool
        get_exchange_rate(&env, &from_token, &to_token, amount)
    }
}

// ============================================================================
// Helper Functions for Multi-Hop Swap
// ============================================================================

/// Execute a direct token swap via Soroswap Router
///
/// Integrates with Soroswap Router contract to perform token swaps through
/// liquidity pools on Stellar blockchain.
///
/// # Arguments
/// * `env` - Contract environment
/// * `from_token` - Input token address
/// * `to_token` - Output token address
/// * `amount` - Amount of input tokens to swap
/// * `min_output` - Minimum output tokens (slippage protection)
///
/// # Returns
/// Actual amount of output tokens received
fn execute_swap(
    env: &Env,
    from_token: &Address,
    to_token: &Address,
    amount: i128,
    min_output: i128,
) -> i128 {
    // Get configured Soroswap Router address
    let router_address: Address = env
        .storage()
        .instance()
        .get(&DataKey::RouterAddress)
        .expect("Router address not configured. Call set_router_address() first.");

    // Create Soroswap Router client
    let router = SoroswapRouterClient::new(env, &router_address);

    // Build swap path: from_token → to_token (direct swap)
    let mut path = Vec::new(env);
    path.push_back(from_token.clone());
    path.push_back(to_token.clone());

    // Set deadline: 5 minutes from now (300 seconds)
    let deadline = env.ledger().timestamp() + 300;

    // Execute swap via Soroswap Router
    // Router will handle token approvals and execute through liquidity pools
    let amounts = router.swap_exact_tokens_for_tokens(
        &amount,
        &min_output,
        &path,
        &env.current_contract_address(),  // Output tokens go to contract
        &deadline,
    );

    // Return actual output amount (last element in amounts vector)
    // amounts[0] = input amount, amounts[1] = output amount for direct swap
    amounts.get(amounts.len() - 1).unwrap()
}

/// Execute multi-hop swap through intermediary tokens
fn execute_multi_hop_swap(
    env: &Env,
    from_token: &Address,
    to_token: &Address,
    initial_amount: i128,
    min_final_output: i128,
    path: &soroban_sdk::Vec<Address>,
) -> i128 {
    let mut current_amount = initial_amount;
    let mut current_token = from_token.clone();

    // Swap through each intermediary token
    for i in 0..path.len() {
        let next_token = path.get(i).unwrap();
        let min_output = 0;  // Intermediate swaps don't need slippage check
        current_amount = execute_swap(env, &current_token, &next_token, current_amount, min_output);
        current_token = next_token;
    }

    // Final swap to destination token
    let final_output = execute_swap(env, &current_token, to_token, current_amount, min_final_output);

    final_output
}

/// Get estimated exchange rate for a swap (read-only preview)
/// Queries actual Soroswap pool reserves and calculates output using AMM formula
///
/// # Arguments
/// * `env` - Contract environment
/// * `from_token` - Input token address
/// * `to_token` - Output token address
/// * `amount` - Amount of input tokens
///
/// # Returns
/// Estimated amount of output tokens based on current pool state
fn get_exchange_rate(
    env: &Env,
    from_token: &Address,
    to_token: &Address,
    amount: i128,
) -> i128 {
    // Same token check
    if from_token == to_token {
        return amount;
    }

    // Check if router is configured
    let has_router = env.storage().instance().has(&DataKey::RouterAddress);
    let has_factory = env.storage().instance().has(&DataKey::FactoryAddress);

    if !has_router || !has_factory {
        panic!("Router and Factory must be configured for exchange rate queries");
    }

    let router_address: Address = env.storage()
        .instance()
        .get(&DataKey::RouterAddress)
        .unwrap();

    let router = SoroswapRouterClient::new(env, &router_address);

    // Build path
    let mut path = Vec::new(env);
    path.push_back(from_token.clone());
    path.push_back(to_token.clone());

    // Query actual amounts from router (uses real pool reserves)
    let amounts = router.get_amounts_out(&amount, &path);

    // Return output amount
    amounts.get(amounts.len() - 1).unwrap()
}

mod test;
