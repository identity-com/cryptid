#![cfg(feature = "test-bpf")]

mod util;

use cryptid_signer::instruction::execute_transaction::ExecuteTransactionBuild;
use cryptid_signer::instruction::expand_transaction::SeedOrAccount;
use cryptid_signer::instruction::propose_transaction::ProposeTransactionBuild;
use cryptid_signer::instruction::{CryptidInstruction, SigningKeyBuild};
use cryptid_signer::state::InstructionData;
use cryptid_signer::CryptidSignerSeeder;
use dummy_program::DummyInstruction;
use log::trace;
use solana_generator::{build_instruction, system_program_id, PDAGenerator, SolanaAccountMeta};
use solana_sdk::signer::Signer;
use std::collections::HashMap;
use std::iter::{empty, once};
use util::*;

#[tokio::test]
async fn execute_transaction_test() {
    let mut program_values = create_program_values(true).await;
    let seed = program_values.gen_string(1, 3);
    trace!(target: LOG_TARGET, "Transaction seed: `{}`", seed);

    let signer = CryptidSignerSeeder {
        cryptid_account: program_values.cryptid_address.pubkey(),
    }
    .find_address(program_values.cryptid_program_id)
    .0;
    trace!(target: LOG_TARGET, "Cryptid Signer: `{}`", signer);

    let return_account = program_values.gen_keypair();
    trace!(
        target: LOG_TARGET,
        "Return Account: `{}`",
        return_account.pubkey()
    );
    let operation: u8 = program_values.gen_range(1, 10);
    let return_data = (0..operation)
        .map(|_| program_values.gen())
        .collect::<Vec<u8>>();
    trace!(target: LOG_TARGET, "Return data: `{:?}`", return_data);

    let accounts = vec![
        signer,
        program_values.dummy_program_id,
        return_account.pubkey(),
        system_program_id(),
    ];
    let accounts_map = accounts
        .iter()
        .enumerate()
        .map(|(index, key)| (*key, index as u8))
        .collect::<HashMap<_, _>>();

    let on_chain_transaction = OnChainTransaction {
        accounts,
        instructions: vec![
            InstructionData::from_instruction(
                build_instruction!(
                    program_values.dummy_program_id,
                    DummyInstruction,
                    RequireSigner(signer)
                )
                .expect("Could not build instruction 0"),
                &accounts_map,
            ),
            InstructionData::from_instruction(
                build_instruction!(
                    program_values.dummy_program_id,
                    DummyInstruction,
                    ReturnVal((return_account.pubkey(), return_data.clone()))
                )
                .expect("Could not build instruction 1"),
                &accounts_map,
            ),
        ],
    };

    let propose_build = ProposeTransactionBuild {
        funder: program_values.funder.pubkey(),
        cryptid_account: program_values.cryptid_address.pubkey(),
        did: SolanaAccountMeta::new_readonly(program_values.did_pda, false),
        did_program: program_values.did_program,
        signers: vec![(
            SigningKeyBuild {
                signing_key: SolanaAccountMeta::new_readonly(program_values.did.pubkey(), true),
                extra_accounts: vec![],
            },
            0, //TODO: Fix when expire times implemented
        )],
        accounts: on_chain_transaction.accounts,
        instructions: on_chain_transaction.instructions,
        ready_to_execute: true,
        account_size: 10000,
        account_seed: seed.clone(),
    };

    program_values
        .send_transaction(
            &[build_instruction!(
                program_values.cryptid_program_id,
                CryptidInstruction,
                ProposeTransaction(propose_build)
            )
            .expect("Could not build propose")],
            empty(),
            true,
            false,
        )
        .await;

    let funds_to = program_values.gen_keypair();
    trace!(target: LOG_TARGET, "Funds To: `{}`", funds_to.pubkey());

    let execute_build = ExecuteTransactionBuild {
        transaction_account: SeedOrAccount::Seed(seed),
        cryptid_account: program_values.cryptid_address.pubkey(),
        did: SolanaAccountMeta::new_readonly(program_values.did_pda, false),
        did_program: program_values.did_program,
        signing_key: SigningKeyBuild {
            signing_key: SolanaAccountMeta::new_readonly(program_values.did.pubkey(), true),
            extra_accounts: vec![],
        },
        funds_to: funds_to.pubkey(),
        execution_accounts: vec![
            SolanaAccountMeta::new_readonly(signer, false),
            SolanaAccountMeta::new(return_account.pubkey(), true),
            SolanaAccountMeta::new_readonly(program_values.dummy_program_id, false),
            SolanaAccountMeta::new_readonly(system_program_id(), false),
        ],
    };

    program_values
        .send_transaction(
            &[build_instruction!(
                program_values.cryptid_program_id,
                CryptidInstruction,
                ExecuteTransaction(execute_build)
            )
            .expect("Could not build execute")],
            once(&return_account),
            true,
            false,
        )
        .await;
}
