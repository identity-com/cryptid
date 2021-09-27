#![cfg(feature = "test-bpf")]

mod constants;

use constants::*;
use cryptid_signer::instruction::{CryptidInstruction, DirectExecuteBuild, SigningKeyBuild};
use cryptid_signer::state::InstructionData;
use cryptid_signer::{DOASignerSeeder, GenerativeDOASeeder};
use dummy_program::DummyInstruction;
use log::trace;
use sol_did::id as sol_did_id;
use sol_did::state::get_sol_address_with_seed;
use solana_generator::{build_instruction, PDAGenerator, SolanaAccountMeta, SolanaInstruction};
use solana_sdk::signature::Signer;
use solana_sdk::signer::keypair::Keypair;
use solana_sdk::transaction::Transaction;
use std::error::Error;
use test_utils::start_tests;

#[tokio::test]
async fn direct_execute_generative_should_succeed() -> Result<(), Box<dyn Error>> {
    let (mut banks, funder, _genesis_hash, mut rng, [cryptid_id, dummy_program_id]) = start_tests(
        LOG_TARGET,
        [CRYPTID_SIGNER_PROGRAM_NAME, DUMMY_PROGRAM_NAME],
    )
    .await;

    let did = Keypair::generate(&mut rng);
    trace!(target: LOG_TARGET, "did: {}", did.pubkey());
    let (did_pda, _did_pda_nonce) = get_sol_address_with_seed(&did.pubkey());
    trace!(target: LOG_TARGET, "did_pda: {}", did_pda);
    let (doa, _doa_nonce) = PDAGenerator::new(
        cryptid_id,
        GenerativeDOASeeder {
            did_program: sol_did_id(),
            did: did_pda,
        },
    )
    .find_address();
    trace!(target: LOG_TARGET, "doa: {}", doa);
    let (doa_signer, _doa_signer_nonce) =
        PDAGenerator::new(cryptid_id, DOASignerSeeder { doa }).find_address();
    trace!(target: LOG_TARGET, "doa_signer: {}", doa_signer);

    let dummy_instruction: SolanaInstruction = build_instruction!(
        dummy_program_id,
        DummyInstruction,
        RequireSigner(doa_signer)
    )
    .expect("Could not create dummy instruction");
    trace!(
        target: LOG_TARGET,
        "dummy_instruction.accounts: {:?}",
        dummy_instruction.accounts
    );

    let instruction_data = InstructionData::from(dummy_instruction);
    trace!(
        target: LOG_TARGET,
        "instruction_data: {:?}",
        instruction_data
    );

    let direct_execute_data = DirectExecuteBuild {
        doa,
        did: SolanaAccountMeta::new_readonly(did_pda, false),
        did_program: sol_did_id(),
        signing_keys: vec![SigningKeyBuild {
            signing_key: SolanaAccountMeta::new_readonly(did.pubkey(), true),
            extra_accounts: vec![],
        }],
        instructions: vec![instruction_data],
    };
    let direct_execute_instruction = build_instruction!(
        cryptid_id,
        CryptidInstruction,
        DirectExecute(direct_execute_data)
    )
    .expect("Could not create cryptid instruction");

    let transaction = Transaction::new_signed_with_payer(
        &[direct_execute_instruction],
        Some(&funder.pubkey()),
        &[&funder, &did],
        banks.get_recent_blockhash().await?,
    );
    banks.process_transaction(transaction).await?;
    Ok(())
}
