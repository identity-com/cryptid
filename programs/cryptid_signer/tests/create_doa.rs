#![cfg(feature = "test-bpf")]

use borsh::BorshDeserialize;
use cryptid_signer::generate_doa_signer;
use cryptid_signer::instruction::CreateDOA;
use cryptid_signer::state::DOAAccount;
use log::{info, trace};
use rand::{random, Rng, SeedableRng};
use rand_chacha::ChaCha20Rng;
use solana_generator::SolanaAccountMeta;
use solana_program_test::ProgramTest;
use solana_sdk::signature::{Keypair, Signer};
use solana_sdk::transaction::Transaction;
use std::error::Error;

#[tokio::test]
async fn create_doa() -> Result<(), Box<dyn Error>> {
    let seed = random();
    info!(target: "cryptid_signer", "create_doa seed: {}", seed);
    let mut rng = ChaCha20Rng::seed_from_u64(seed);
    let program_id = Keypair::generate(&mut rng).pubkey();
    info!(target: "cryptid_signer", "create_doa program_id: {}", program_id);
    let test = ProgramTest::new("cryptid_signer", program_id, None);
    let (mut banks, funder, _genesis_hash) = test.start().await;
    trace!(target: "cryptid_signer", "funder: {}", funder.pubkey());

    let doa = Keypair::generate(&mut rng);
    trace!(target: "cryptid_signer", "doa: {}", doa.pubkey());
    let did = Keypair::generate(&mut rng).pubkey();
    trace!(target: "cryptid_signer", "did: {}", did);
    let did_program = Keypair::generate(&mut rng).pubkey(); // TODO: Replace with actual did program
    trace!(target: "cryptid_signer", "did_program: {}", did_program);
    let key_threshold = rng.gen();
    trace!(target: "cryptid_signer", "key_threshold: {}", key_threshold);
    let (signer, signer_nonce) = generate_doa_signer(program_id, doa.pubkey());
    trace!(target: "cryptid_signer", "(signer, nonce): ({}, {})", signer, signer_nonce);

    let create_doa = CreateDOA::create_instruction(
        program_id,
        funder.pubkey(),
        doa.pubkey(),
        false,
        SolanaAccountMeta::new_readonly(did, false),
        did_program,
        key_threshold,
    )
    .expect("Could not create instruction");
    let transaction = Transaction::new_signed_with_payer(
        &[create_doa],
        Some(&funder.pubkey()),
        &[&funder, &doa],
        banks.get_recent_blockhash().await?,
    );
    banks.process_transaction(transaction).await?;

    let account = banks
        .get_account(doa.pubkey())
        .await?
        .unwrap_or_else(|| panic!("Could not find account {}", doa.pubkey()));
    let data: DOAAccount = BorshDeserialize::deserialize(&mut &account.data.as_slice()[2..])?; // TODO: This slice index skips the discriminant. Should find a better way to do this.
    trace!(target: "cryptid_signer", "data: {:?}", data);
    assert_eq!(data.did, did);
    assert_eq!(data.did_program, did_program);

    assert_eq!(data.signer_nonce, signer_nonce);
    assert_eq!(data.key_threshold, key_threshold);
    assert_eq!(data.settings_sequence, 1);

    Ok(())
}
