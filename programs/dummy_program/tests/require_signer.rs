#![cfg(feature = "test-bpf")]

mod util;

use util::generate_test;

use dummy_program::DummyInstruction;
use log::trace;
use solana_generator::InstructionList;
use solana_sdk::signer::Signer;
use solana_sdk::transaction::Transaction;
use std::error::Error;
use std::str::FromStr;

pub const DUMMY_PROGRAM_LOG_TARGET: &str = "dummy_program";
pub const DUMMY_PROGRAM_NAME: &str = "dummy_program";

#[tokio::test]
async fn require_signer_should_succeed() -> Result<(), Box<dyn Error>> {
    let (test, program_map, mut tng) =
        generate_test(DUMMY_PROGRAM_LOG_TARGET, &[DUMMY_PROGRAM_NAME]);
    let dummy_program_id = program_map
        .get(DUMMY_PROGRAM_NAME)
        .expect("No dummy program");

    let (mut banks, funder, _genesis_hash) = test.start().await;
    trace!("funder: {}", funder.pubkey());
    let signer =

    let transaction = Transaction::new_signed_with_payer(&[DummyInstruction::build_instruction(dummy_program_id, DummyInstruction::BuildEnum::RequireSigner())]);

    Ok(())
}
