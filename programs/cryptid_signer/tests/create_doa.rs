#![cfg(feature = "test-bpf")]

mod constants;
use constants::{CRYPTID_SIGNER_PROGRAM_NAME, LOG_TARGET};

use borsh::BorshDeserialize;
use cryptid_signer::generate_doa_signer;
use cryptid_signer::instruction::{CreateDOABuild, CryptidInstruction, SigningKeyBuild};
use cryptid_signer::state::DOAAccount;
use log::trace;
use solana_generator::{InstructionList, SolanaAccountMeta};
use solana_sdk::signature::{Keypair, Signer};
use solana_sdk::transaction::Transaction;
use std::error::Error;
use test_utils::rand::Rng;
use test_utils::start_tests;

#[tokio::test]
async fn create_doa() -> Result<(), Box<dyn Error>> {
    let (mut banks, funder, _genesis_hash, mut rng, [cryptid_id]) =
        start_tests(LOG_TARGET, [CRYPTID_SIGNER_PROGRAM_NAME]).await;

    let doa = Keypair::generate(&mut rng);
    trace!(target: LOG_TARGET, "doa: {}", doa.pubkey());
    let did = Keypair::generate(&mut rng);
    trace!(target: LOG_TARGET, "did: {}", did.pubkey());
    let did_program = Keypair::generate(&mut rng).pubkey(); // TODO: Replace with actual did program
    trace!(target: LOG_TARGET, "did_program: {}", did_program);
    let key_threshold = rng.gen();
    trace!(target: LOG_TARGET, "key_threshold: {}", key_threshold);
    let (signer, signer_nonce) = generate_doa_signer(cryptid_id, doa.pubkey());
    trace!(
        target: LOG_TARGET,
        "(signer, nonce): ({}, {})",
        signer,
        signer_nonce
    );

    let create_doa = CryptidInstruction::build_instruction(
        cryptid_id,
        <CryptidInstruction as InstructionList>::BuildEnum::CreateDOA(CreateDOABuild {
            funder: funder.pubkey(),
            doa: doa.pubkey(),
            did_program,
            key_threshold,
            doa_is_zeroed: false,
            signing_key: SigningKeyBuild {
                signing_key: SolanaAccountMeta::new_readonly(did.pubkey(), true),
                extra_accounts: vec![],
            }, // Sign as generative
            did: SolanaAccountMeta::new_readonly(did.pubkey(), false),
        }),
    )
    .expect("Could not create instruction");

    let transaction = Transaction::new_signed_with_payer(
        &[create_doa],
        Some(&funder.pubkey()),
        &[&funder, &doa, &did],
        banks.get_recent_blockhash().await?,
    );
    banks.process_transaction(transaction).await?;

    let account = banks
        .get_account(doa.pubkey())
        .await?
        .unwrap_or_else(|| panic!("Could not find account {}", doa.pubkey()));
    let data: DOAAccount = BorshDeserialize::deserialize(&mut &account.data.as_slice()[2..])?; // TODO: This slice index skips the discriminant. Should find a better way to do this.
    trace!(target: "cryptid_signer", "data: {:?}", data);
    assert_eq!(data.did, did.pubkey());
    assert_eq!(data.did_program, did_program);

    assert_eq!(data.signer_nonce, signer_nonce);
    assert_eq!(data.key_threshold, key_threshold);
    assert_eq!(data.settings_sequence, 1);

    Ok(())
}
