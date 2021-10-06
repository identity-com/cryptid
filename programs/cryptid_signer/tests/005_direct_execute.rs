#![cfg(feature = "test-bpf")]

mod constants;

use constants::*;
use cryptid_signer::instruction::{
    CryptidInstruction, DirectExecuteBuild, DirectExecuteFlags, SigningKeyBuild,
};
use cryptid_signer::state::InstructionData;
use cryptid_signer::{DOASignerSeeder, GenerativeDOASeeder};
use dummy_program::DummyInstruction;
use log::trace;
use sol_did::id as sol_did_id;
use sol_did::state::get_sol_address_with_seed;
use solana_generator::solana_program::system_instruction::transfer;
use solana_generator::{build_instruction, PDAGenerator, SolanaAccountMeta, SolanaInstruction};
use solana_sdk::instruction::InstructionError;
use solana_sdk::signature::Signer;
use solana_sdk::signer::keypair::Keypair;
use solana_sdk::transaction::{Transaction, TransactionError};
use solana_sdk::transport::TransportError;
use std::array::IntoIter;
use std::collections::{HashMap, HashSet};
use std::error::Error;
use std::iter::once;
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
    let return_account = Keypair::generate(&mut rng);
    trace!(
        target: LOG_TARGET,
        "return_account: {}",
        return_account.pubkey()
    );
    let rent = banks.get_rent().await?.minimum_balance(9);
    let transaction = Transaction::new_signed_with_payer(
        &[transfer(&funder.pubkey(), &return_account.pubkey(), rent)],
        Some(&funder.pubkey()),
        &[&funder],
        banks.get_recent_blockhash().await?,
    );
    banks.send_transaction(transaction).await?;

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

    let dummy_instruction1: SolanaInstruction = build_instruction!(
        dummy_program_id,
        DummyInstruction,
        RequireSigner(doa_signer)
    )
    .expect("Could not create dummy instruction 1");
    trace!(
        target: LOG_TARGET,
        "dummy_instruction.accounts: {:?}",
        dummy_instruction1.accounts
    );

    let data = vec![1, 1, 2, 3, 5, 8, 13, 21, 34];
    let dummy_instruction2: SolanaInstruction = build_instruction!(
        dummy_program_id,
        DummyInstruction,
        ReturnVal((return_account.pubkey(), data.clone()))
    )
    .expect("Could not create dummy instruction 2");

    let dummy_instruction3: SolanaInstruction = build_instruction!(
        dummy_program_id,
        DummyInstruction,
        AssertAccountData((return_account.pubkey(), data.clone()))
    )
    .expect("Could not create dummy instruction 3");

    let instructions = [dummy_instruction1, dummy_instruction2, dummy_instruction3];
    let instruction_accounts = instructions
        .iter()
        .map(|instruction| {
            instruction
                .accounts
                .iter()
                .map(|account| account.pubkey)
                .chain(once(instruction.program_id))
        })
        .flatten()
        .collect::<HashSet<_>>()
        .into_iter()
        .collect::<Vec<_>>();
    let instruction_map = instruction_accounts
        .iter()
        .enumerate()
        .map(|(index, account)| (*account, index as u8))
        .collect::<HashMap<_, _>>();

    let instruction_data = IntoIter::new(instructions)
        .map(|instruction| InstructionData::from_instruction(instruction, &instruction_map))
        .collect::<Vec<_>>();

    trace!(
        target: LOG_TARGET,
        "instruction_accounts: {:#?}",
        instruction_accounts
    );
    trace!(
        target: LOG_TARGET,
        "instruction_data: {:#?}",
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
        instruction_accounts,
        instructions: instruction_data,
        flags: DirectExecuteFlags::DEBUG,
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
        &[&funder, &did, &return_account],
        banks.get_recent_blockhash().await?,
    );
    banks.process_transaction(transaction).await?;

    assert_eq!(
        banks
            .get_account(return_account.pubkey())
            .await?
            .unwrap()
            .data,
        data
    );
    Ok(())
}

#[tokio::test]
async fn direct_execute_generative_sig_missing() -> Result<(), Box<dyn Error>> {
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

    let dummy_instruction1: SolanaInstruction = build_instruction!(
        dummy_program_id,
        DummyInstruction,
        RequireSigner(doa_signer)
    )
    .expect("Could not create dummy instruction 1");

    let instructions = [dummy_instruction1];
    let instruction_accounts = instructions
        .iter()
        .map(|instruction| {
            instruction
                .accounts
                .iter()
                .map(|account| account.pubkey)
                .chain(once(instruction.program_id))
        })
        .flatten()
        .collect::<HashSet<_>>()
        .into_iter()
        .collect::<Vec<_>>();
    let instruction_map = instruction_accounts
        .iter()
        .enumerate()
        .map(|(index, account)| (*account, index as u8))
        .collect::<HashMap<_, _>>();

    let instruction_data = IntoIter::new(instructions)
        .map(|instruction| InstructionData::from_instruction(instruction, &instruction_map))
        .collect::<Vec<_>>();
    let direct_execute_data = DirectExecuteBuild {
        doa,
        did: SolanaAccountMeta::new_readonly(did_pda, false),
        did_program: sol_did_id(),
        signing_keys: vec![SigningKeyBuild {
            signing_key: SolanaAccountMeta::new_readonly(did.pubkey(), false),
            extra_accounts: vec![],
        }],
        instruction_accounts,
        instructions: instruction_data,
        flags: DirectExecuteFlags::DEBUG,
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
        &[&funder],
        banks.get_recent_blockhash().await?,
    );
    let error = banks.process_transaction(transaction).await.unwrap_err();
    match error {
        TransportError::TransactionError(TransactionError::InstructionError(
            0,
            InstructionError::MissingRequiredSignature,
        )) => {}
        error => panic!("Error `{:?}` not what was expected", error),
    }
    Ok(())
}
