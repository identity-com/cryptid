#![cfg(feature = "test-bpf")]

mod util;

use borsh::BorshDeserialize;
use cryptid_signer::instruction::expand_transaction::SeedOrAccount;
use cryptid_signer::instruction::SigningKeyBuild;
use cryptid_signer::state::{TransactionAccount, TransactionState};
use cryptid_signer::TransactionSeeder;
use log::trace;
use solana_generator::discriminant::Discriminant;
use solana_generator::{Account, PDAGenerator, Pubkey, UnixTimestamp};
use test_utils::rand::{CryptoRng, RngCore, SeedableRng};
use util::*;

#[tokio::test]
async fn expand_transaction_test() {
    let mut program_values = create_program_values(true).await;
    let seed = program_values.gen_string(1, 3);
    trace!(target: LOG_TARGET, "Transaction seed: `{}`", seed);

    let mut on_chain_transaction =
        OnChainTransaction::random(program_values.gen_range(2, 10), vec![], &mut program_values);

    let signers = propose_transaction(
        &on_chain_transaction,
        &mut program_values,
        seed.clone(),
        ProposeOverrides::default()
            .size(10000)
            .ready_to_execute(false),
    )
    .await;

    let transaction_address = TransactionSeeder {
        cryptid_account: program_values.cryptid_address.pubkey(),
        seed,
    }
    .find_address(program_values.cryptid_program_id)
    .0;

    verify_transaction(
        &mut program_values,
        transaction_address,
        &on_chain_transaction,
        &signers,
        TransactionState::NotReady,
    )
    .await;
    for _ in 0..10 {
        let account_operations = (0..program_values.gen_range(0, 10))
            .map(|_| {
                let operation = on_chain_transaction.random_account_operation(&mut program_values);
                on_chain_transaction.apply_account_operation(operation.clone());
                operation
            })
            .collect::<Vec<_>>();

        let instruction_operations = (0..program_values.gen_range(0, 10))
            .map(|_| {
                let operation =
                    on_chain_transaction.random_instruction_operation(&mut program_values);
                on_chain_transaction.apply_instruction_operation(operation.clone());
                operation
            })
            .collect::<Vec<_>>();

        program_values
            .send_expand_transaction_instruction(
                SeedOrAccount::Account(transaction_address),
                signers[0].0.clone(),
                false,
                account_operations,
                instruction_operations,
            )
            .await;

        verify_transaction(
            &mut program_values,
            transaction_address,
            &on_chain_transaction,
            &signers,
            TransactionState::NotReady,
        )
        .await;
    }
}

async fn verify_transaction(
    program_values: &mut ProgramValues<impl SeedableRng + CryptoRng + RngCore + Clone>,
    transaction_address: Pubkey,
    on_chain_transaction: &OnChainTransaction,
    signers: &[(SigningKeyBuild, UnixTimestamp)],
    transaction_state: TransactionState,
) {
    let account = program_values.get_account(transaction_address).await;
    let data = &mut account.data.as_slice();

    let discriminant: Discriminant =
        BorshDeserialize::deserialize(data).expect("Could not deserialize discriminant");
    assert_eq!(discriminant, TransactionAccount::DISCRIMINANT);
    let data: TransactionAccount =
        BorshDeserialize::deserialize(data).expect("Could not deserialize");
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
    assert_eq!(transaction_state, data.state);
    assert_eq!(account.data.len(), 10000);
}
