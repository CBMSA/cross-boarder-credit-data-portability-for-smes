
📦 SadcCbdc.move — Move Smart Contract

module 0xYourAddress::SadcCbdc {
    use std::signer;
    use std::string;
    use std::vector;
    use std::timestamp;

    struct Wallet has key {
        owner: address,
        full_name: string::String,
        bank_name: string::String,
        created_at: u64,
    }

    struct Settlement has store {
        from_treasury: address,
        to_bank: address,
        amount: u64,
        tax: u64,
        gas_fee: u64,
        total: u64,
        timestamp: u64,
    }

    struct WalletRegistry has key {
        wallets: vector<Wallet>,
    }

    struct SettlementLog has key {
        logs: vector<Settlement>,
    }

    public entry fun init_registry(account: &signer) {
        move_to(account, WalletRegistry { wallets: vector::empty<Wallet>() });
        move_to(account, SettlementLog { logs: vector::empty<Settlement>() });
    }

    public entry fun register_wallet(
        account: &signer,
        full_name: string::String,
        bank_name: string::String
    ) {
        let wallet = Wallet {
            owner: signer::address_of(account),
            full_name,
            bank_name,
            created_at: timestamp::now_seconds(),
        };
        let registry = borrow_global_mut<WalletRegistry>(signer::address_of(account));
        vector::push_back(&mut registry.wallets, wallet);
    }

    public entry fun submit_settlement(
        treasury: &signer,
        to_bank: address,
        amount: u64
    ) {
        let tax = amount / 100 * 15;
        let gas_fee = amount / 100;
        let total = amount + tax + gas_fee;
        let record = Settlement {
            from_treasury: signer::address_of(treasury),
            to_bank,
            amount,
            tax,
            gas_fee,
            total,
            timestamp: timestamp::now_seconds(),
        };
        let logs = borrow_global_mut<SettlementLog>(signer::address_of(treasury));
        vector::push_back(&mut logs.logs, record);
    }

    public fun get_settlements(addr: address): &vector<Settlement> acquires SettlementLog {
        &borrow_global<SettlementLog>(addr).logs
    }

    public fun get_wallets(addr: address): &vector<Wallet> acquires WalletRegistry {
        &borrow_global<WalletRegistry>(addr).wallets
    }
}


