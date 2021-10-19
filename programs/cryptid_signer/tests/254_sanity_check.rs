#![cfg(feature = "test-bpf")]

mod constants;
use constants::{CRYPTID_SIGNER_PROGRAM_NAME, DUMMY_PROGRAM_NAME, LOG_TARGET};

use cryptid_signer::instruction::CryptidInstruction;
use dummy_program::DummyInstruction;
use solana_generator::build_instruction;
use solana_sdk::signature::Signer;
use solana_sdk::transaction::Transaction;
use test_utils::{start_tests, ClientExpansion};

#[tokio::test]
async fn sanity_check() {
    let (mut banks, funder, _genesis_hash, _rng, [cryptid_id, dummy_program_id]) = start_tests(
        LOG_TARGET,
        [CRYPTID_SIGNER_PROGRAM_NAME, DUMMY_PROGRAM_NAME],
    )
    .await;

    let transaction = Transaction::new_signed_with_payer(
        &[
            build_instruction!(cryptid_id, CryptidInstruction, Test(vec![1, 2, 3]))
                .expect("Could not build cryptid instruction"),
            build_instruction!(dummy_program_id, DummyInstruction, Test(()))
                .expect("Could not build dummy instruction"),
        ],
        Some(&funder.pubkey()),
        &[&funder],
        banks
            .get_recent_blockhash()
            .await
            .expect("Could not get recent blockhash"),
    );
    banks
        .process_transaction_longer_timeout(transaction)
        .await
        .expect("Could not process transaction");
}
