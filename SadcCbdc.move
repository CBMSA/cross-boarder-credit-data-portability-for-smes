module 0xCBDC::SADCCBDC {

    use std::signer;
    use std::string;
    use std::event;
    use std::vector;
    use std::address;

    struct Treasury has key {
        balance: u64,
    }

    struct CBDC has store, drop, key {
        amount: u64,
    }

    struct TransferEvent has drop, store {
        from: address,
        to: address,
        amount: u64,
        timestamp: u64,
    }

    struct TransferEvents has key {
        event_handle: event::EventHandle<TransferEvent>
    }

    public fun init(sender: &signer) {
        move_to(sender, Treasury { balance: 0 });
        move_to(sender, TransferEvents {
            event_handle: event::new_event_handle<TransferEvent>(sender)
        });
    }

    public fun mint(sender: &signer, to: address, amount: u64) {
        let treasury = borrow_global_mut<Treasury>(signer::address_of(sender));
        treasury.balance = treasury.balance + amount;
        move_to(&signer::borrow_address(to), CBDC { amount });
    }

    public fun burn(sender: &signer, amount: u64) acquires Treasury {
        let treasury = borrow_global_mut<Treasury>(signer::address_of(sender));
        assert!(treasury.balance >= amount, 1);
        treasury.balance = treasury.balance - amount;
    }

    public fun transfer(sender: &signer, recipient: address, amount: u64) acquires TransferEvents {
        let sender_addr = signer::address_of(sender);
        let sender_cbdc = move_from<CBDC>(sender_addr);
        assert!(sender_cbdc.amount >= amount, 2);

        let recipient_cbdc: CBDC;
        if (exists<CBDC>(recipient)) {
            recipient_cbdc = move_from<CBDC>(recipient);
            recipient_cbdc.amount = recipient_cbdc.amount + amount;
        } else {
            recipient_cbdc = CBDC { amount };
        }

        move_to(&recipient, recipient_cbdc);
        move_to(&sender_addr, CBDC { amount: sender_cbdc.amount - amount });

        let event_ref = borrow_global_mut<TransferEvents>(sender_addr);
        event::emit_event(&mut event_ref.event_handle, TransferEvent {
            from: sender_addr,
            to: recipient,
            amount,
            timestamp: 0,
        });
    }

    public fun get_balance(owner: address): u64 {
        if (exists<CBDC>(owner)) {
            let cbdc = borrow_global<CBDC>(owner);
            cbdc.amount
        } else {
            0
        }
    }
} 
