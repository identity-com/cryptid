#![cfg(feature = "client")]

pub const LOG_TARGET: &str = "cryptid_signer";
pub const CRYPTID_SIGNER_PROGRAM_NAME: &str = "cryptid_signer";
pub const DUMMY_PROGRAM_NAME: &str = "dummy_program";

use cruiser::Pubkey;
use cryptid_signer::client::did::SigningSolDID;
use cryptid_signer::client::{CryptidClient, CryptidInterface};
use rand::SeedableRng;
use rand_chacha::ChaCha20Rng;
use solana_client::nonblocking::rpc_client::RpcClient;
use solana_sdk::commitment_config::CommitmentConfig;
use solana_sdk::native_token::LAMPORTS_PER_SOL;
use solana_sdk::signature::{Keypair, Signer};
use std::env::var;
use std::error::Error;
use std::str::FromStr;
use std::time::Duration;
use tokio::time::sleep;

const CRYPTID_PROGRAM_ID_ENV: &str = "CRYPTID_PROGRAM_ID";

fn get_pubkey_from_env(env: &str) -> Pubkey {
    let val = var(env).unwrap_or_else(|err| panic!("Could not find `{}`: {}", env, err));
    Pubkey::from_str(&val).unwrap_or_else(|err| {
        panic!(
            "Could not parse `{}` (val: `{}`) as Pubkey: {}",
            env, val, err
        )
    })
}

#[tokio::test]
async fn direct_execute_flow() -> Result<(), Box<dyn Error>> {
    let mut rng = ChaCha20Rng::from_entropy();
    let interface = CryptidInterface {
        rpc_client: RpcClient::new("http://localhost:8899".to_string()),
        program_id: get_pubkey_from_env(CRYPTID_PROGRAM_ID_ENV),
        fee_payer: Keypair::generate(&mut rng),
        commitment: CommitmentConfig::confirmed(),
    };
    let airdrop_sig = interface
        .rpc_client
        .request_airdrop(&interface.fee_payer.pubkey(), LAMPORTS_PER_SOL)
        .await?;
    loop {
        if interface
            .rpc_client
            .confirm_transaction(&airdrop_sig)
            .await?
        {
            break;
        }
        sleep(Duration::from_millis(500));
    }
    let user = Keypair::generate(&mut rng);
    let did = SigningSolDID::new(user);
    let client = CryptidClient::init_generative(&interface, did);
    let result = client
        .upgrade_generative(&interface.fee_payer, 1, 1)
        .await?;
    let client = result.output;
    let create_sig = result.transaction.send_and_confirm().await?;
    Ok(())
}
