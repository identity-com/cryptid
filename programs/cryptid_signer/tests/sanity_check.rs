#![cfg(feature = "test-bpf")]

use log::info;
use rand::{random, SeedableRng};
use rand_chacha::ChaCha20Rng;
use solana_program_test::ProgramTest;
use solana_sdk::instruction::Instruction;
use solana_sdk::signature::Keypair;
use solana_sdk::signer::Signer;
use solana_sdk::transaction::Transaction;
use std::error::Error;

#[tokio::test]
async fn sanity_check() -> Result<(), Box<dyn Error>> {
    let seed = random();
    info!(target: "cryptid_signer", "sanity_check seed: {}", seed);
    let mut rng = ChaCha20Rng::seed_from_u64(seed);
    let program_id = Keypair::generate(&mut rng).pubkey();
    info!(target: "cryptid_signer", "sanity_check program_id: {}", program_id);
    let test = ProgramTest::new("cryptid_signer", program_id, None);
    let (mut banks, payer, _genesis_hash) = test.start().await;

    let transaction = Transaction::new_signed_with_payer(
        &[Instruction::new_with_bytes(program_id, &[254], vec![])],
        Some(&payer.pubkey()),
        &[&payer],
        banks.get_recent_blockhash().await?,
    );
    banks.process_transaction(transaction).await?;

    Ok(())
}
