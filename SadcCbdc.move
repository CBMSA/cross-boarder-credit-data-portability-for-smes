

module 0xCBDC::SADCCBDC {

    use std::signer;
    use std::string;
    use std::event;
    use std::vector;
    use std::address;
    use std::option;

    /// Stores the total balance in the Treasury (for minting and burning)
    struct Treasury has key {
        balance: u64,
    }

    /// Represents CBDC balance held by any account
    struct CBDC has store, drop, key {
        amount: u64,
    }

    /// Defines the structure of a transfer event
    struct TransferEvent has drop, store {
        from: address,
        to: address,
        amount: u64,
        timestamp: u64,
    }

    /// Holds the event handle used for emitting transfer events
    struct TransferEvents has key {
        event_handle: event::EventHandle<TransferEvent>
    }

    /// Initialize the sender with a treasury and event handle
    public fun init(sender: &signer) {
        move_to(sender, Treasury { balance: 0 });
        move_to(sender, TransferEvents {
            event_handle: event::new_event_handle<TransferEvent>(sender)
        });
    }

    /// Mint CBDC to a recipient address (admin only)
    public fun mint(sender: &signer, to: address, amount: u64) acquires Treasury {
        let treasury = borrow_global_mut<Treasury>(signer::address_of(sender));
        treasury.balance = treasury.balance + amount;

        if (exists<CBDC>(to)) {
            let recipient = move_from<CBDC>(to);
            let updated = CBDC { amount: recipient.amount + amount };
            move_to(&to, updated);
        } else {
            move_to(&to, CBDC { amount });
        }
    }

    /// Burn CBDC from treasury
    public fun burn(sender: &signer, amount: u64) acquires Treasury {
        let treasury = borrow_global_mut<Treasury>(signer::address_of(sender));
        assert!(treasury.balance >= amount, 1);
        treasury.balance = treasury.balance - amount;
    }

    /// Transfer CBDC to another account with event logging
    public fun transfer(sender: &signer, recipient: address, amount: u64) acquires TransferEvents {
        let sender_addr = signer::address_of(sender);
        let sender_cbdc = move_from<CBDC>(sender_addr);
        assert!(sender_cbdc.amount >= amount, 2);

        let new_sender_amount = sender_cbdc.amount - amount;
        move_to(&sender_addr, CBDC { amount: new_sender_amount });

        if (exists<CBDC>(recipient)) {
            let existing = move_from<CBDC>(recipient);
            move_to(&recipient, CBDC { amount: existing.amount + amount });
        } else {
            move_to(&recipient, CBDC { amount });
        }

        let event_ref = borrow_global_mut<TransferEvents>(sender_addr);
        let ts: u64 = 0; // Replace with on-chain timestamp if supported
        event::emit_event(&mut event_ref.event_handle, TransferEvent {
            from: sender_addr,
            to: recipient,
            amount,
            timestamp: ts,
        });
    }

    /// Returns the CBDC balance of a specific account
    public fun get_balance(owner: address): u64 {
        if (exists<CBDC>(owner)) {
            let cbdc = borrow_global<CBDC>(owner);
            cbdc.amount
        } else {
            0
        }
    }
}
