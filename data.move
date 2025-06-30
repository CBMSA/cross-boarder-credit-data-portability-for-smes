// File: move_contracts/sadc_credit/sources/data.move

module sadc_credit::data {
    use sui::object::{Self, UID};
    use sui::transfer;
    use sui::tx_context::TxContext;

    /// Structure to hold credit record for an SME
    struct CreditRecord has key, store {
        id: UID,
        name: vector<u8>,
        tax_id: vector<u8>,
        country: vector<u8>,
        financials: vector<u8>,
        document_url: vector<u8>,
        owner: address,
    }

    /// Function to submit an SME credit record
    public fun submit_credit_record(
        name: vector<u8>,
        tax_id: vector<u8>,
        country: vector<u8>,
        financials: vector<u8>,
        document_url: vector<u8>,
        ctx: &mut TxContext
    ) {
        let sender = TxContext::sender(ctx);
        let record = CreditRecord {
            id: object::new(ctx),
            name,
            tax_id,
            country,
            financials,
            document_url,
            owner: sender,
        };
        transfer::transfer(record, sender);
    }
}
