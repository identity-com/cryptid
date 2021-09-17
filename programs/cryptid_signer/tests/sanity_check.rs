use solana_client::rpc_client::RpcClient;
use solana_generator::Pubkey;
use solana_sdk::commitment_config::CommitmentConfig;
use solana_sdk::instruction::Instruction;
use solana_sdk::native_token::LAMPORTS_PER_SOL;
use solana_sdk::signature::Keypair;
use solana_sdk::signer::Signer;
use solana_sdk::transaction::Transaction;
use solana_transaction_status::UiTransactionEncoding;
use std::error::Error;
use std::str::FromStr;
use std::thread::sleep;
use std::time::Duration;

const PROGRAM: &str = "CFE6uDuLK7Hd9HVQqWkXU3nTmdZUm5KCEtFcEfbSTZLy";

#[test]
fn sanity_check() -> Result<(), Box<dyn Error>> {
    let keypair = Keypair::new();
    let client = RpcClient::new_with_commitment(
        "http://localhost:8899".to_string(),
        CommitmentConfig::finalized(),
    );

    println!("Airdropping to {}", keypair.pubkey());
    let airdrop = client.request_airdrop(&keypair.pubkey(), LAMPORTS_PER_SOL)?;
    while !client.confirm_transaction(&airdrop)? {
        sleep(Duration::from_millis(100));
    }

    println!("Creating transaction...");
    let recent_block_hash = client.get_recent_blockhash()?.0;
    let transaction = Transaction::new_signed_with_payer(
        &[Instruction::new_with_bytes(
            Pubkey::from_str(PROGRAM)?,
            &[254],
            vec![],
        )],
        Some(&keypair.pubkey()),
        &[&keypair],
        recent_block_hash,
    );
    let transaction = client.get_transaction(
        &client.send_and_confirm_transaction(&transaction)?,
        UiTransactionEncoding::JsonParsed,
    )?;
    println!("Transaction: {:#?}", transaction);

    Ok(())
}
