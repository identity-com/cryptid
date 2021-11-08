#![cfg(feature = "test-bpf")]

mod util;

use borsh::BorshDeserialize;
use cryptid_signer::state::TransactionAccount;
use cryptid_signer::TransactionSeeder;
use futures::join;
use log::trace;
use solana_generator::discriminant::Discriminant;
use solana_generator::{Account, PDAGenerator};
use test_utils::rand::{CryptoRng, RngCore, SeedableRng};
use util::*;

async fn verify(
    mut program_values: ProgramValues<impl SeedableRng + CryptoRng + RngCore>,
    transaction_seed: String,
    size_override: Option<u16>,
) {
    trace!(target: LOG_TARGET, "Transaction Seed: {}", transaction_seed);
    let on_chain_transaction = OnChainTransaction::random(
        program_values.gen_range(2, 10),
        (0..program_values.gen_range(2, 5))
            .map(|_| program_values.gen_range(10, 100))
            .collect(),
        &mut program_values,
    );

    let mut overrides = ProposeOverrides::default();
    if let Some(size) = size_override {
        overrides = overrides.size(size);
    }

    let signers = propose_transaction(
        &on_chain_transaction,
        &mut program_values,
        transaction_seed.clone(),
        overrides,
    )
    .await;

    let transaction_address = TransactionSeeder {
        cryptid_account: program_values.cryptid_address.pubkey(),
        seed: transaction_seed,
    }
    .find_address(program_values.cryptid_program_id)
    .0;
    let account = program_values.get_account(transaction_address).await;
    let data = &mut account.data.as_slice();

    let discriminant: Discriminant =
        BorshDeserialize::deserialize(data).expect("Could not deserialize discriminant");
    assert_eq!(discriminant, TransactionAccount::DISCRIMINANT);
    let data: TransactionAccount =
        BorshDeserialize::deserialize(data).expect("Could not deserialize");
    trace!(target: LOG_TARGET, "data: {:?}", data);

    assert_eq!(
        program_values.cryptid_address.pubkey(),
        data.cryptid_account
    );
    assert_eq!(on_chain_transaction.accounts, data.accounts);
    assert_eq!(
        on_chain_transaction.instructions,
        data.transaction_instructions
    );
    assert_eq!(
        signers
            .iter()
            .map(|(build, expire_time)| (build.to_data(), *expire_time))
            .collect::<Vec<_>>(),
        data.signers
    );
    if let Some(size) = size_override {
        assert_eq!(account.data.len(), size as usize);
    }
}

#[tokio::test]
async fn propose_transaction_test() {
    let mut program_values = create_program_values(true).await;
    let [seed0, seed1] = [
        program_values.gen_string(1, 3),
        program_values.gen_string(1, 3),
    ];

    join!(
        verify(program_values.clone(), seed0, None),
        verify(program_values.clone(), seed1, Some(10000)),
    );
}
