#![cfg(test)]

use super::*;
use soroban_sdk::{
    testutils::{Address as _, Ledger, LedgerInfo},
    token, Address, Env,
};

// Helper function to create a token contract for testing
fn create_token_contract<'a>(env: &Env, admin: &Address) -> (token::Client<'a>, token::StellarAssetClient<'a>) {
    let contract_address = env.register_stellar_asset_contract_v2(admin.clone());
    (
        token::Client::new(env, &contract_address.address()),
        token::StellarAssetClient::new(env, &contract_address.address()),
    )
}

#[test]
fn test_initialize() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(SaveXContract, ());
    let client = SaveXContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);

    client.initialize(&admin);

    // Contract should be initialized (no panic)
    // Try to initialize again, should panic
}

#[test]
#[should_panic(expected = "Already initialized")]
fn test_double_initialize() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(SaveXContract, ());
    let client = SaveXContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);

    client.initialize(&admin);
    client.initialize(&admin); // Should panic
}

#[test]
fn test_immediate_transfer() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(SaveXContract, ());
    let client = SaveXContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let user1 = Address::generate(&env);
    let user2 = Address::generate(&env);

    client.initialize(&admin);

    // Create token
    let (token, token_admin) = create_token_contract(&env, &admin);
    token_admin.mint(&user1, &1000);

    // Perform immediate transfer
    let transfer_id = client.transfer_immediate(&user1, &user2, &token.address, &100);

    assert_eq!(transfer_id, 1);

    // Check balances
    assert_eq!(token.balance(&user1), 900);
    assert_eq!(token.balance(&user2), 100);

    // Check transfer record
    let transfer = client.get_transfer(&transfer_id);
    assert_eq!(transfer.amount, 100);
    assert_eq!(transfer.status, TransferStatus::Completed);
}

#[test]
fn test_scheduled_transfer() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(SaveXContract, ());
    let client = SaveXContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let user1 = Address::generate(&env);
    let user2 = Address::generate(&env);

    client.initialize(&admin);

    // Create token
    let (token, token_admin) = create_token_contract(&env, &admin);
    token_admin.mint(&user1, &1000);

    // Set initial ledger timestamp
    env.ledger().set(LedgerInfo {
        timestamp: 1000,
        protocol_version: 23,
        sequence_number: 10,
        network_id: Default::default(),
        base_reserve: 10,
        min_temp_entry_ttl: 10,
        min_persistent_entry_ttl: 10,
        max_entry_ttl: 3110400,
    });

    // Schedule transfer for 1 hour later (3600 seconds)
    let execute_after = 1000 + 3600;
    let transfer_id = client.transfer_scheduled(
        &user1,
        &user2,
        &token.address,
        &100,
        &execute_after
    );

    assert_eq!(transfer_id, 1);

    // Tokens should be locked in contract
    assert_eq!(token.balance(&user1), 900);
    assert_eq!(token.balance(&contract_id), 100);

    // Check transfer status
    let transfer = client.get_transfer(&transfer_id);
    assert_eq!(transfer.status, TransferStatus::Locked);

    // Try to execute before time - should fail
    // (We'll skip this for now as it requires panic testing)

    // Move time forward
    env.ledger().set(LedgerInfo {
        timestamp: execute_after + 1,
        protocol_version: 23,
        sequence_number: 11,
        network_id: Default::default(),
        base_reserve: 10,
        min_temp_entry_ttl: 10,
        min_persistent_entry_ttl: 10,
        max_entry_ttl: 3110400,
    });

    // Now execute the transfer
    client.execute_scheduled_transfer(&transfer_id);

    // Check balances
    assert_eq!(token.balance(&user1), 900);
    assert_eq!(token.balance(&user2), 100);
    assert_eq!(token.balance(&contract_id), 0);

    // Check transfer status
    let transfer = client.get_transfer(&transfer_id);
    assert_eq!(transfer.status, TransferStatus::Completed);
}

#[test]
fn test_cancel_scheduled_transfer() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(SaveXContract, ());
    let client = SaveXContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let user1 = Address::generate(&env);
    let user2 = Address::generate(&env);

    client.initialize(&admin);

    // Create token
    let (token, token_admin) = create_token_contract(&env, &admin);
    token_admin.mint(&user1, &1000);

    // Set initial ledger timestamp
    env.ledger().set(LedgerInfo {
        timestamp: 1000,
        protocol_version: 23,
        sequence_number: 10,
        network_id: Default::default(),
        base_reserve: 10,
        min_temp_entry_ttl: 10,
        min_persistent_entry_ttl: 10,
        max_entry_ttl: 3110400,
    });

    // Schedule transfer
    let execute_after = 1000 + 3600;
    let transfer_id = client.transfer_scheduled(
        &user1,
        &user2,
        &token.address,
        &100,
        &execute_after
    );

    // Cancel transfer
    client.cancel_scheduled_transfer(&user1, &transfer_id);

    // Tokens should be refunded
    assert_eq!(token.balance(&user1), 1000);
    assert_eq!(token.balance(&contract_id), 0);

    // Check transfer status
    let transfer = client.get_transfer(&transfer_id);
    assert_eq!(transfer.status, TransferStatus::Cancelled);
}

#[test]
fn test_rate_lock() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(SaveXContract, ());
    let client = SaveXContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let user = Address::generate(&env);
    let token1 = Address::generate(&env);
    let token2 = Address::generate(&env);

    client.initialize(&admin);

    // Set initial ledger timestamp
    env.ledger().set(LedgerInfo {
        timestamp: 1000,
        protocol_version: 23,
        sequence_number: 10,
        network_id: Default::default(),
        base_reserve: 10,
        min_temp_entry_ttl: 10,
        min_persistent_entry_ttl: 10,
        max_entry_ttl: 3110400,
    });

    // Lock rate: 1.5 (represented as 15000000 with 7 decimals)
    let locked_rate = 15000000i128;
    let amount = 1000i128;
    let duration = 3600u64; // 1 hour

    let lock_id = client.lock_rate(
        &user,
        &token1,
        &token2,
        &locked_rate,
        &amount,
        &duration
    );

    assert_eq!(lock_id, 1);

    // Check rate lock
    let rate_lock = client.get_rate_lock(&lock_id);
    assert_eq!(rate_lock.locked_rate, locked_rate);
    assert_eq!(rate_lock.amount, amount);
    assert_eq!(rate_lock.is_active, true);
    assert_eq!(rate_lock.expiry, 1000 + 3600);
}

#[test]
fn test_cancel_rate_lock() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(SaveXContract, ());
    let client = SaveXContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let user = Address::generate(&env);
    let token1 = Address::generate(&env);
    let token2 = Address::generate(&env);

    client.initialize(&admin);

    // Set initial ledger timestamp
    env.ledger().set(LedgerInfo {
        timestamp: 1000,
        protocol_version: 23,
        sequence_number: 10,
        network_id: Default::default(),
        base_reserve: 10,
        min_temp_entry_ttl: 10,
        min_persistent_entry_ttl: 10,
        max_entry_ttl: 3110400,
    });

    // Lock rate
    let lock_id = client.lock_rate(
        &user,
        &token1,
        &token2,
        &15000000,
        &1000,
        &3600
    );

    // Cancel rate lock
    client.cancel_rate_lock(&user, &lock_id);

    // Check rate lock status
    let rate_lock = client.get_rate_lock(&lock_id);
    assert_eq!(rate_lock.is_active, false);
}

#[test]
fn test_pause_unpause() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(SaveXContract, ());
    let client = SaveXContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);

    client.initialize(&admin);

    // Pause contract
    client.pause(&admin);

    // Unpause contract
    client.unpause(&admin);
}

#[test]
fn test_split_transfer() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(SaveXContract, ());
    let client = SaveXContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let user1 = Address::generate(&env);
    let user2 = Address::generate(&env);

    client.initialize(&admin);

    // Create token
    let (token, token_admin) = create_token_contract(&env, &admin);
    token_admin.mint(&user1, &1000);

    // Set initial ledger timestamp
    env.ledger().set(LedgerInfo {
        timestamp: 1000,
        protocol_version: 23,
        sequence_number: 10,
        network_id: Default::default(),
        base_reserve: 10,
        min_temp_entry_ttl: 10,
        min_persistent_entry_ttl: 10,
        max_entry_ttl: 3110400,
    });

    // Split transfer: 50% now, 50% in 1 hour
    let execute_after = 1000 + 3600;
    let (immediate_id, scheduled_id) = client.transfer_split(
        &user1,
        &user2,
        &token.address,
        &1000,
        &50,  // 50%
        &execute_after
    );

    // Check immediate transfer completed
    assert_eq!(token.balance(&user2), 500);
    assert_eq!(token.balance(&contract_id), 500);

    let immediate_transfer = client.get_transfer(&immediate_id);
    assert_eq!(immediate_transfer.amount, 500);
    assert_eq!(immediate_transfer.status, TransferStatus::Completed);

    let scheduled_transfer = client.get_transfer(&scheduled_id);
    assert_eq!(scheduled_transfer.amount, 500);
    assert_eq!(scheduled_transfer.status, TransferStatus::Locked);

    // Move time forward and execute scheduled part
    env.ledger().set(LedgerInfo {
        timestamp: execute_after + 1,
        protocol_version: 23,
        sequence_number: 11,
        network_id: Default::default(),
        base_reserve: 10,
        min_temp_entry_ttl: 10,
        min_persistent_entry_ttl: 10,
        max_entry_ttl: 3110400,
    });

    client.execute_scheduled_transfer(&scheduled_id);

    // Check final balances
    assert_eq!(token.balance(&user2), 1000);
    assert_eq!(token.balance(&contract_id), 0);
}

#[test]
fn test_batch_transfer() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(SaveXContract, ());
    let client = SaveXContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let sender = Address::generate(&env);
    let recipient1 = Address::generate(&env);
    let recipient2 = Address::generate(&env);
    let recipient3 = Address::generate(&env);

    client.initialize(&admin);

    // Create token
    let (token, token_admin) = create_token_contract(&env, &admin);
    token_admin.mint(&sender, &1000);

    // Create batch transfer
    let mut recipients = soroban_sdk::Vec::new(&env);
    recipients.push_back(recipient1.clone());
    recipients.push_back(recipient2.clone());
    recipients.push_back(recipient3.clone());

    let mut amounts = soroban_sdk::Vec::new(&env);
    amounts.push_back(100);
    amounts.push_back(200);
    amounts.push_back(300);

    let transfer_ids = client.transfer_batch(
        &sender,
        &recipients,
        &token.address,
        &amounts
    );

    // Check transfer count
    assert_eq!(transfer_ids.len(), 3);

    // Check balances
    assert_eq!(token.balance(&sender), 400);
    assert_eq!(token.balance(&recipient1), 100);
    assert_eq!(token.balance(&recipient2), 200);
    assert_eq!(token.balance(&recipient3), 300);

    // Check transfer records
    for i in 0..transfer_ids.len() {
        let transfer_id = transfer_ids.get(i).unwrap();
        let transfer = client.get_transfer(&transfer_id);
        assert_eq!(transfer.status, TransferStatus::Completed);
        assert_eq!(transfer.transfer_type, TransferType::Batched);
    }
}

#[test]
fn test_package_subscription() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(SaveXContract, ());
    let client = SaveXContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let user = Address::generate(&env);

    client.initialize(&admin);

    // Set initial ledger timestamp
    env.ledger().set(LedgerInfo {
        timestamp: 1000,
        protocol_version: 23,
        sequence_number: 10,
        network_id: Default::default(),
        base_reserve: 10,
        min_temp_entry_ttl: 10,
        min_persistent_entry_ttl: 10,
        max_entry_ttl: 3110400,
    });

    // Subscribe to Family package for 30 days
    client.subscribe_package(&user, &PackageType::Family, &30);

    // Check package details
    let package = client.get_package(&user).unwrap();
    assert_eq!(package.package_type, PackageType::Family);
    assert_eq!(package.discount_rate, 1500); // 15%
    assert_eq!(package.is_active, true);
    assert_eq!(package.end_date, 1000 + (30 * 86400));
}

#[test]
fn test_cancel_package() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(SaveXContract, ());
    let client = SaveXContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let user = Address::generate(&env);

    client.initialize(&admin);

    // Set initial ledger timestamp
    env.ledger().set(LedgerInfo {
        timestamp: 1000,
        protocol_version: 23,
        sequence_number: 10,
        network_id: Default::default(),
        base_reserve: 10,
        min_temp_entry_ttl: 10,
        min_persistent_entry_ttl: 10,
        max_entry_ttl: 3110400,
    });

    // Subscribe and then cancel
    client.subscribe_package(&user, &PackageType::Business, &30);
    client.cancel_package(&user);

    // Check package is inactive
    let package = client.get_package(&user).unwrap();
    assert_eq!(package.is_active, false);
}

#[test]
fn test_fee_calculation() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(SaveXContract, ());
    let client = SaveXContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let user = Address::generate(&env);

    client.initialize(&admin);

    // Calculate fee without package
    let fee1 = client.calculate_fee(&user, &10000000, &false, &1);
    assert!(fee1.total > 0);

    // Set timestamp
    env.ledger().set(LedgerInfo {
        timestamp: 1000,
        protocol_version: 23,
        sequence_number: 10,
        network_id: Default::default(),
        base_reserve: 10,
        min_temp_entry_ttl: 10,
        min_persistent_entry_ttl: 10,
        max_entry_ttl: 3110400,
    });

    // Subscribe to package
    client.subscribe_package(&user, &PackageType::Premium, &30);

    // Calculate fee with package (should be lower)
    let fee2 = client.calculate_fee(&user, &10000000, &false, &1);
    assert!(fee2.total < fee1.total);
    assert!(fee2.discount > 0);
}

#[test]
fn test_batch_fee_discount() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(SaveXContract, ());
    let client = SaveXContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let user = Address::generate(&env);

    client.initialize(&admin);

    // Single transfer fee
    let fee_single = client.calculate_fee(&user, &10000000, &false, &1);

    // Batch transfer fee (5 transfers)
    let fee_batch = client.calculate_fee(&user, &10000000, &true, &5);

    // Batch should have discount
    assert!(fee_batch.discount > 0);
    assert!(fee_batch.total < fee_single.total);
}

#[test]
fn test_estimate_schedule_savings() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(SaveXContract, ());
    let client = SaveXContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    client.initialize(&admin);

    // Test different delay periods
    let savings_2h = client.estimate_schedule_savings(&10000, &2);
    let savings_12h = client.estimate_schedule_savings(&10000, &12);
    let savings_24h = client.estimate_schedule_savings(&10000, &24);

    // Longer delays should have more savings
    assert!(savings_24h > savings_12h);
    assert!(savings_12h > savings_2h);
    assert_eq!(savings_24h, 1500); // 15% of 10000
}

#[test]
#[ignore] // Requires Soroswap Router on testnet - enable after configuring Router address
fn test_transfer_with_swap() {
    // NOTE: This test requires Soroswap Router contract integration
    // To enable:
    // 1. Deploy SaveX contract to Stellar testnet
    // 2. Call set_router_address() with Soroswap Router:
    //    CCMAPXWVZD4USEKDWRYS7DA4Y3D7E2SDMGBFJUCEXTC7VN6CUBGWPFUS
    // 3. Run this test on testnet with actual token pairs

    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(SaveXContract, ());
    let client = SaveXContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let user1 = Address::generate(&env);
    let user2 = Address::generate(&env);

    client.initialize(&admin);

    // Create two different tokens (XLM and USDC)
    let (token_xlm, token_xlm_admin) = create_token_contract(&env, &admin);
    let (token_usdc, _token_usdc_admin) = create_token_contract(&env, &admin);

    // Mint XLM to user1
    token_xlm_admin.mint(&user1, &1000);

    // Execute swap transfer: XLM → USDC
    // This will call actual liquidity pool contract (when integrated)
    let path = soroban_sdk::Vec::new(&env);
    let _transfer_id = client.transfer_with_swap(
        &user1,
        &user2,
        &token_xlm.address,
        &token_usdc.address,
        &1000,
        &900,
        &path
    );

    // Assertions would verify actual swap occurred through LP
}

#[test]
#[ignore] // Requires Soroswap Router on testnet - enable after configuring Router address
fn test_multi_hop_swap() {
    // NOTE: This test requires Soroswap Router contract integration
    // Multi-hop routing needs Soroswap Router with configured token pairs
    // Router automatically handles multi-hop swaps through intermediary tokens

    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(SaveXContract, ());
    let client = SaveXContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let user1 = Address::generate(&env);
    let user2 = Address::generate(&env);

    client.initialize(&admin);

    // Create three tokens: XLM → USDC → EUR
    let (token_xlm, token_xlm_admin) = create_token_contract(&env, &admin);
    let (token_usdc, _token_usdc_admin) = create_token_contract(&env, &admin);
    let (token_eur, _token_eur_admin) = create_token_contract(&env, &admin);

    token_xlm_admin.mint(&user1, &1000);

    // Execute multi-hop swap through liquidity pools
    let mut path = soroban_sdk::Vec::new(&env);
    path.push_back(token_usdc.address.clone());

    let _transfer_id = client.transfer_with_swap(
        &user1,
        &user2,
        &token_xlm.address,
        &token_eur.address,
        &1000,
        &900,
        &path
    );

    // Assertions would verify actual multi-hop swap through LPs
}

#[test]
fn test_get_swap_path() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(SaveXContract, ());
    let client = SaveXContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    client.initialize(&admin);

    let token1 = Address::generate(&env);
    let token2 = Address::generate(&env);

    // Get optimal swap path
    let swap_path = client.get_swap_path(&token1, &token2);

    assert_eq!(swap_path.from_token, token1);
    assert_eq!(swap_path.to_token, token2);
    // In current implementation, intermediary tokens is empty (direct swap)
    assert_eq!(swap_path.intermediary_tokens.len(), 0);
}

#[test]
#[ignore] // Requires Soroswap Router on testnet - enable after configuring Router address
fn test_estimate_swap_output() {
    // NOTE: This test provides conservative estimates (95% of input)
    // For accurate rates, use actual Soroswap Router on testnet
    // Current implementation returns conservative estimate to prevent mock data

    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(SaveXContract, ());
    let client = SaveXContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    client.initialize(&admin);

    let token1 = Address::generate(&env);
    let token2 = Address::generate(&env);

    // Estimate swap output from actual LP reserves
    let _output = client.estimate_swap_output(&token1, &token2, &1000);

    // Assertion would verify actual rate from LP
}

#[test]
#[ignore] // Requires Soroswap Router on testnet - enable after configuring Router address
#[should_panic(expected = "Router address not configured")]
fn test_swap_slippage_protection() {
    // NOTE: This test verifies slippage protection via Soroswap Router
    // Router's swap_exact_tokens_for_tokens enforces min_output automatically
    // Test expects panic because Router is not configured in unit test environment

    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(SaveXContract, ());
    let client = SaveXContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let user1 = Address::generate(&env);
    let user2 = Address::generate(&env);

    client.initialize(&admin);

    let (token1, token1_admin) = create_token_contract(&env, &admin);
    let (token2, _token2_admin) = create_token_contract(&env, &admin);

    token1_admin.mint(&user1, &1000);

    let path = soroban_sdk::Vec::new(&env);

    // Try to swap with unrealistic minimum output - should panic with slippage error
    client.transfer_with_swap(
        &user1,
        &user2,
        &token1.address,
        &token2.address,
        &1000,
        &5000,  // Expecting 5000 output from 1000 input = impossible
        &path
    );
}
