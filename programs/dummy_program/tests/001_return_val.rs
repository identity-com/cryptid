#![cfg(feature = "test-bpf")]

mod constants;
use constants::{DUMMY_PROGRAM_NAME, LOG_TARGET};

use dummy_program::DummyInstruction;
use solana_generator::InstructionList;
use solana_sdk::signature::Signer;
use solana_sdk::signer::keypair::Keypair;
use solana_sdk::transaction::Transaction;
use std::error::Error;
use test_utils::rand::Rng;
use test_utils::{start_tests, ClientExpansion};

#[tokio::test]
#[ignore] // Return val is questionable with testing
async fn return_val_should_succeed() -> Result<(), Box<dyn Error>> {
    let (mut banks, funder, _genesis_hash, mut rng, [dummy_program_id]) =
        start_tests(LOG_TARGET, [DUMMY_PROGRAM_NAME]).await;
    let return_account = Keypair::generate(&mut rng);
    let data_len = rng.gen_range(16, 1024);
    let data: Vec<u8> = (0..data_len).map(|_| rng.gen()).collect();

    let transaction = Transaction::new_signed_with_payer(
        &[
            DummyInstruction::build_instruction(
                dummy_program_id,
                <DummyInstruction as InstructionList>::BuildEnum::ReturnVal((
                    return_account.pubkey(),
                    data.clone(),
                )),
            )
            .expect("Could not build return instruction"),
            DummyInstruction::build_instruction(
                dummy_program_id,
                <DummyInstruction as InstructionList>::BuildEnum::AssertAccountData((
                    return_account.pubkey(),
                    data,
                )),
            )
            .expect("Could not build assert instruction"),
        ],
        Some(&funder.pubkey()),
        &[&funder, &return_account],
        banks.get_recent_blockhash().await?,
    );
    banks
        .process_transaction_longer_timeout(transaction)
        .await?;

    assert_eq!(banks.get_account(return_account.pubkey()).await?, None);

    Ok(())
}
