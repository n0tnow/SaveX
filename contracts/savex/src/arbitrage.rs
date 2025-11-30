//! Arbitrage Module for SaveX
//!
//! Automated arbitrage execution between different DEXs on Stellar

use soroban_sdk::{contract, contractimpl, token, Address, Env, Vec};
use crate::types::*;
use crate::SoroswapRouterClient;

#[contract]
pub struct ArbitrageBot;

#[contractimpl]
impl ArbitrageBot {
    
    /// Execute a simple arbitrage trade between two DEXs
    /// Buys from cheaper pool, sells to expensive pool
    /// Returns profit amount
    pub fn execute_arbitrage(
        env: Env,
        executor: Address,
        token_a: Address,
        token_b: Address,
        amount: i128,
        min_profit: i128,
    ) -> i128 {
        executor.require_auth();

        if amount <= 0 {
            panic!("Invalid amount");
        }

        if min_profit < 0 {
            panic!("Invalid minimum profit");
        }

        // Transfer initial tokens from executor to contract
        token::Client::new(&env, &token_a).transfer(
            &executor,
            &env.current_contract_address(),
            &amount
        );

        // Execute swap
        let router_address: Address = env
            .storage()
            .instance()
            .get(&DataKey::RouterAddress)
            .expect("Router not configured");

        let router = SoroswapRouterClient::new(&env, &router_address);

        // Build swap path
        let mut path = Vec::new(&env);
        path.push_back(token_a.clone());
        path.push_back(token_b.clone());

        // Execute swap with 5 min deadline
        let deadline = env.ledger().timestamp() + 300;
        
        let amounts = router.swap_exact_tokens_for_tokens(
            &amount,
            &min_profit,
            &path,
            &env.current_contract_address(),
            &deadline,
        );

        let output = amounts.get(amounts.len() - 1).unwrap();

        // Calculate profit
        let profit = output - amount;

        if profit < min_profit {
            panic!("Profit too low");
        }

        // Transfer output tokens back to executor
        token::Client::new(&env, &token_b).transfer(
            &env.current_contract_address(),
            &executor,
            &output
        );

        profit
    }

    /// Execute triangular arbitrage through multiple pools
    /// Example: XLM -> USDC -> AQUA -> XLM
    /// Returns profit in the starting token
    pub fn execute_triangular_arbitrage(
        env: Env,
        executor: Address,
        path: Vec<Address>,  // Must form a cycle (start = end token)
        amount: i128,
        min_profit: i128,
    ) -> i128 {
        executor.require_auth();

        if amount <= 0 {
            panic!("Invalid amount");
        }

        if path.len() < 3 {
            panic!("Invalid path (need at least 3 tokens)");
        }

        let start_token = path.get(0).unwrap();
        let end_token = path.get(path.len() - 1).unwrap();

        if start_token != end_token {
            panic!("Path must form a cycle");
        }

        // Transfer initial tokens from executor
        token::Client::new(&env, &start_token).transfer(
            &executor,
            &env.current_contract_address(),
            &amount
        );

        let router_address: Address = env
            .storage()
            .instance()
            .get(&DataKey::RouterAddress)
            .expect("Router not configured");

        let router = SoroswapRouterClient::new(&env, &router_address);

        // Build full path for multi-hop swap
        let deadline = env.ledger().timestamp() + 300;

        let amounts = router.swap_exact_tokens_for_tokens(
            &amount,
            &0,  // No minimum for intermediate swaps
            &path,
            &env.current_contract_address(),
            &deadline,
        );

        let final_output = amounts.get(amounts.len() - 1).unwrap();

        // Calculate profit
        let profit = final_output - amount;

        if profit < min_profit {
            panic!("Profit too low");
        }

        // Return all tokens to executor
        token::Client::new(&env, &start_token).transfer(
            &env.current_contract_address(),
            &executor,
            &final_output
        );

        profit
    }

    /// Estimate arbitrage profit without executing
    /// Returns expected profit amount
    pub fn estimate_arbitrage_profit(
        env: Env,
        token_a: Address,
        token_b: Address,
        amount: i128,
    ) -> i128 {
        let router_address: Address = env
            .storage()
            .instance()
            .get(&DataKey::RouterAddress)
            .expect("Router not configured");

        let router = SoroswapRouterClient::new(&env, &router_address);

        // Build path
        let mut path = Vec::new(&env);
        path.push_back(token_a);
        path.push_back(token_b);

        // Get expected output
        let amounts = router.get_amounts_out(&amount, &path);
        let output = amounts.get(amounts.len() - 1).unwrap();

        // Return profit
        output - amount
    }

    /// Check if arbitrage opportunity exists
    /// Returns true if profit exceeds threshold
    pub fn has_arbitrage_opportunity(
        env: Env,
        token_a: Address,
        token_b: Address,
        amount: i128,
        min_profit_bps: u32,  // Minimum profit in basis points (e.g., 100 = 1%)
    ) -> bool {
        let profit = Self::estimate_arbitrage_profit(
            env.clone(),
            token_a,
            token_b,
            amount,
        );

        let min_profit = (amount * min_profit_bps as i128) / 10000;

        profit >= min_profit
    }

    /// Flash arbitrage: borrow, arbitrage, repay in single transaction
    /// This is atomic - either all succeeds or all reverts
    pub fn flash_arbitrage(
        env: Env,
        executor: Address,
        borrow_token: Address,
        borrow_amount: i128,
        swap_path: Vec<Address>,
        min_profit: i128,
    ) -> i128 {
        executor.require_auth();

        // Note: True flash loans require integration with lending protocol
        // For now, this assumes executor has funds
        
        // Transfer borrowed amount
        token::Client::new(&env, &borrow_token).transfer(
            &executor,
            &env.current_contract_address(),
            &borrow_amount
        );

        // Execute multi-hop swap
        let router_address: Address = env
            .storage()
            .instance()
            .get(&DataKey::RouterAddress)
            .expect("Router not configured");

        let router = SoroswapRouterClient::new(&env, &router_address);
        let deadline = env.ledger().timestamp() + 300;

        let amounts = router.swap_exact_tokens_for_tokens(
            &borrow_amount,
            &0,
            &swap_path,
            &env.current_contract_address(),
            &deadline,
        );

        let final_output = amounts.get(amounts.len() - 1).unwrap();

        // Repay borrow + profit check
        let profit = final_output - borrow_amount;

        if profit < min_profit {
            panic!("Insufficient profit");
        }

        // Return borrowed amount to executor
        token::Client::new(&env, &borrow_token).transfer(
            &env.current_contract_address(),
            &executor,
            &borrow_amount
        );

        // Return profit to executor
        let profit_token = swap_path.get(swap_path.len() - 1).unwrap();
        token::Client::new(&env, &profit_token).transfer(
            &env.current_contract_address(),
            &executor,
            &profit
        );

        profit
    }
}
