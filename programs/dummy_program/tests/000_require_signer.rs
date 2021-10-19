#![cfg(feature = "test-bpf")]

mod constants;
use constants::{DUMMY_PROGRAM_NAME, LOG_TARGET};

use dummy_program::DummyInstruction;
use solana_generator::solana_program::instruction::InstructionError;
use solana_generator::{
    GeneratorErrorDiscriminants, InstructionList, SolanaAccountMeta, SolanaInstruction,
};
use solana_sdk::signer::keypair::Keypair;
use solana_sdk::signer::Signer;
use solana_sdk::transaction::{Transaction, TransactionError};
use solana_sdk::transport::TransportError;
use std::error::Error;
use test_utils::{start_tests, ClientExpansion};

#[tokio::test]
async fn require_signer_should_succeed() -> Result<(), Box<dyn Error>> {
    let (mut banks, funder, _genesis_hash, mut rng, [dummy_program_id]) =
        start_tests(LOG_TARGET, [DUMMY_PROGRAM_NAME]).await;
    let signer = Keypair::generate(&mut rng);

    let transaction = Transaction::new_signed_with_payer(
        &[DummyInstruction::build_instruction(
            dummy_program_id,
            <DummyInstruction as InstructionList>::BuildEnum::RequireSigner(signer.pubkey()),
        )
        .expect("Could not create instruction")],
        Some(&funder.pubkey()),
        &[&signer, &funder],
        banks.get_recent_blockhash().await?,
    );
    banks
        .process_transaction_longer_timeout(transaction)
        .await?;

    Ok(())
}

#[tokio::test]
async fn require_signer_should_fail() -> Result<(), Box<dyn Error>> {
    let (mut banks, funder, _genesis_hash, mut rng, [dummy_program_id]) =
        start_tests(LOG_TARGET, [DUMMY_PROGRAM_NAME]).await;
    let signer = Keypair::generate(&mut rng);

    let transaction = Transaction::new_signed_with_payer(
        &[SolanaInstruction {
            program_id: dummy_program_id,
            accounts: vec![SolanaAccountMeta::new_readonly(signer.pubkey(), false)],
            data: vec![0],
        }],
        Some(&funder.pubkey()),
        &[&funder],
        banks.get_recent_blockhash().await?,
    );
    match banks.process_transaction_longer_timeout(transaction).await {
        Ok(_) => panic!("Transaction did not err!"),
        Err(TransportError::TransactionError(TransactionError::InstructionError(
            0,
            InstructionError::Custom(error),
        ))) => {
            assert_eq!(
                error,
                GeneratorErrorDiscriminants::AccountsSignerError as u32
            );
            Ok(())
        }
        Err(error) => panic!("Transaction errored unexpectedly: {}", error),
    }
}
