
module 0xCBDC::SADCCBDC {
    use std::signer;
    use std::string;
    use std::event;
    use std::vector;
    use std::address;
    use std::option;

    /// Stores the total minted CBDC by treasury
    struct Treasury has key {
        balance: u64,
    }

    /// CBDC balance for an individual account
    struct CBDC has store, drop, key {
        amount: u64,
    }

    /// Event structure for logging transfers
    struct TransferEvent has drop, store {
        from: address,
        to: address,
        amount: u64,
        timestamp: u64,
    }

    /// Holds the event handle for a given account
    struct TransferEvents has key {
        event_handle: event::EventHandle<TransferEvent>
    }

    /// Initialize treasury and event log for the sender
    public fun init(sender: &signer) {
        let addr = signer::address_of(sender);
        assert!(!exists<Treasury>(addr), 100); // Already initialized
        move_to(sender, Treasury { balance: 0 });
        move_to(sender, TransferEvents {
            event_handle: event::new_event_handle<TransferEvent>(sender),
        });
    }

    /// Mint new CBDC tokens to a target account (only treasury)
    public fun mint(sender: &signer, to: address, amount: u64) acquires Treasury {
        let admin = signer::address_of(sender);
        let treasury = borrow_global_mut<Treasury>(admin);
        treasury.balance = treasury.balance + amount;

        if (exists<CBDC>(to)) {
            let balance_ref = borrow_global_mut<CBDC>(to);
            balance_ref.amount = balance_ref.amount + amount;
        } else {
            move_to(&to, CBDC { amount });
        }
    }

    /// Burn CBDC tokens from treasury
    public fun burn(sender: &signer, amount: u64) acquires Treasury {
        let treasury = borrow_global_mut<Treasury>(signer::address_of(sender));
        assert!(treasury.balance >= amount, 101); // Insufficient balance
        treasury.balance = treasury.balance - amount;
    }

    /// Transfer CBDC between accounts, emits TransferEvent
    public fun transfer(sender: &signer, recipient: address, amount: u64) acquires TransferEvents, CBDC {
        let sender_addr = signer::address_of(sender);
        assert!(exists<CBDC>(sender_addr), 102); // Sender must exist

        let sender_balance = borrow_global_mut<CBDC>(sender_addr);
        assert!(sender_balance.amount >= amount, 103); // Insufficient funds
        sender_balance.amount = sender_balance.amount - amount;

        if (exists<CBDC>(recipient)) {
            let recipient_balance = borrow_global_mut<CBDC>(recipient);
            recipient_balance.amount = recipient_balance.amount + amount;
        } else {
            move_to(&recipient, CBDC { amount });
        }

        // Emit transfer event
        let events = borrow_global_mut<TransferEvents>(sender_addr);
        let ts: u64 = 0; // Replace with blockchain time when available
        event::emit_event(&mut events.event_handle, TransferEvent {
            from: sender_addr,
            to: recipient,
            amount,
            timestamp: ts,
        });
    }

    /// Return CBDC balance for a given address
    public fun get_balance(owner: address): u64 {
        if (exists<CBDC>(owner)) {
            borrow_global<CBDC>(owner).amount
        } else {
            0
        }
    }

    /// Return total CBDC minted by treasury
    public fun get_total_supply(admin: address): u64 {
        if (exists<Treasury>(admin)) {
            borrow_global<Treasury>(admin).balance
        } else {
            0
        }
    }
}

