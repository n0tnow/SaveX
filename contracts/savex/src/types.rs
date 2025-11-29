//! Data types and structures for SaveX contract

use soroban_sdk::{contracttype, Address, String};

// ============================================================================
// Storage Keys
// ============================================================================

#[derive(Clone)]
#[contracttype]
pub enum DataKey {
    // Contract metadata
    Admin,
    TransferCounter,
    RateLockCounter,
    PackageCounter,
    IsPaused,
    RouterAddress,  // Soroswap Router contract address for swaps
    FactoryAddress, // Soroswap Factory contract address for pool queries
}

#[derive(Clone)]
#[contracttype]
pub enum PersistentDataKey {
    Transfer(u64),
    RateLock(u64),
    Package(Address),
}

// ============================================================================
// Time Bounds (from timelock example)
// ============================================================================

#[derive(Clone, Debug, PartialEq)]
#[contracttype]
pub enum TimeBoundKind {
    Before,
    After,
}

#[derive(Clone, Debug)]
#[contracttype]
pub struct TimeBound {
    pub kind: TimeBoundKind,
    pub timestamp: u64,
}

// ============================================================================
// Transfer Types
// ============================================================================

#[derive(Clone, Debug, PartialEq)]
#[contracttype]
pub enum TransferType {
    Immediate,
    Scheduled,
    Split,
    Batched,
}

#[derive(Clone, Debug, PartialEq)]
#[contracttype]
pub enum TransferStatus {
    Pending,
    Locked,
    Completed,
    Cancelled,
}

#[derive(Clone, Debug)]
#[contracttype]
pub struct Transfer {
    pub id: u64,
    pub from: Address,
    pub to: Address,
    pub token: Address,
    pub amount: i128,
    pub transfer_type: TransferType,
    pub has_time_bound: bool,
    pub time_bound_kind: TimeBoundKind,
    pub time_bound_timestamp: u64,
    pub status: TransferStatus,
    pub created_at: u64,
    pub has_rate_lock: bool,
    pub rate_lock_id: u64,
}

// ============================================================================
// Rate Locking
// ============================================================================

#[derive(Clone, Debug)]
#[contracttype]
pub struct RateLock {
    pub id: u64,
    pub owner: Address,
    pub from_token: Address,
    pub to_token: Address,
    pub locked_rate: i128,      // Rate with 7 decimal precision (e.g., 1.5000000 = 15000000)
    pub amount: i128,
    pub expiry: u64,
    pub is_active: bool,
    pub created_at: u64,
}

// ============================================================================
// Package System
// ============================================================================

#[derive(Clone, Debug, PartialEq)]
#[contracttype]
pub enum PackageType {
    Family,      // 15% discount
    Business,    // 20% discount
    Premium,     // 25% discount
}

#[derive(Clone, Debug)]
#[contracttype]
pub struct Package {
    pub owner: Address,
    pub package_type: PackageType,
    pub transfer_count: u32,
    pub total_volume: i128,
    pub discount_rate: u32,        // In basis points (150 = 1.5%)
    pub start_date: u64,
    pub end_date: u64,
    pub is_active: bool,
}

// ============================================================================
// Fee Management
// ============================================================================

#[derive(Clone, Debug)]
#[contracttype]
pub struct FeeStructure {
    pub base_fee: i128,            // Base fee in stroops
    pub percentage_fee: u32,       // In basis points (50 = 0.5%)
    pub min_fee: i128,
    pub max_fee: i128,
}

#[derive(Clone, Debug)]
#[contracttype]
pub struct FeeBreakdown {
    pub network_fee: i128,
    pub service_fee: i128,
    pub discount: i128,
    pub total: i128,
}

// ============================================================================
// Token Information
// ============================================================================

#[derive(Clone, Debug)]
#[contracttype]
pub struct TokenInfo {
    pub address: Address,
    pub symbol: String,
    pub decimals: u32,
    pub is_supported: bool,
}

// ============================================================================
// Multi-Hop Swap
// ============================================================================

#[derive(Clone, Debug)]
#[contracttype]
pub struct SwapPath {
    pub from_token: Address,
    pub to_token: Address,
    pub intermediary_tokens: soroban_sdk::Vec<Address>,  // Path through DEX
}

#[derive(Clone, Debug)]
#[contracttype]
pub struct SwapResult {
    pub input_amount: i128,
    pub output_amount: i128,
    pub path_used: soroban_sdk::Vec<Address>,
    pub executed_at: u64,
}

// ============================================================================
// Error Codes
// ============================================================================

#[derive(Clone, Copy, Debug, PartialEq)]
#[repr(u32)]
pub enum SaveXError {
    NotAuthorized = 1,
    InvalidAmount = 2,
    InsufficientBalance = 3,
    TransferNotFound = 4,
    RateLockExpired = 5,
    RateLockNotFound = 6,
    PackageNotActive = 7,
    InvalidTimestamp = 8,
    TokenNotSupported = 9,
    SlippageExceeded = 10,
    ContractPaused = 11,
    AlreadyInitialized = 12,
    NotInitialized = 13,
    InvalidTimebound = 14,
    TransferNotPending = 15,
    RouterNotConfigured = 16,
}
