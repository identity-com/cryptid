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
    let mut rng = ChaCha20Rng::seed_from_u64(seed);
    let program_id = Keypair::generate(&mut rng).pubkey();
    let test = ProgramTest::new("cryptid_signer", program_id, None);
    info!(target: "cryptid_signer", "create_doa seed: {}", seed);
    info!(target: "cryptid_signer", "create_doa program_id: {}", program_id);
    
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
