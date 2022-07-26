#![cfg(feature = "test-bpf")]

mod util;

use borsh::BorshDeserialize;
use cryptid_signer::instruction::create_cryptid::CreateCryptidBuild;
use cryptid_signer::instruction::{CryptidInstruction, SigningKeyBuild};
use cryptid_signer::state::CryptidAccount;
use cryptid_signer::CryptidSignerSeeder;
use log::trace;
use sol_did::id as sol_did_id;
use solana_generator::discriminant::Discriminant;
use solana_generator::{build_instruction, Account, PDAGenerator, SolanaAccountMeta};
use solana_sdk::signature::{Keypair, Signer};
use solana_sdk::transaction::Transaction;
use test_utils::rand::Rng;
use test_utils::{start_tests, ClientExpansion};
use util::*;

#[tokio::test]
async fn create_cryptid() {
    let (mut banks, funder, _genesis_hash, mut rng, [cryptid_id]) =
        start_tests(LOG_TARGET, [CRYPTID_SIGNER_PROGRAM_NAME]).await;

    let cryptid_address = Keypair::generate(&mut rng);
    trace!(
        target: LOG_TARGET,
        "cryptid_address: {}",
        cryptid_address.pubkey()
    );
    let did = Keypair::generate(&mut rng);
    trace!(target: LOG_TARGET, "did: {}", did.pubkey());
    let did_pda = sol_did::state::get_sol_address_with_seed(&did.pubkey()).0;
    trace!(target: LOG_TARGET, "did_pda: {}", did_pda);
    let did_program = sol_did_id();
    trace!(target: LOG_TARGET, "did_program: {}", did_program);
    let key_threshold = rng.gen();
    trace!(target: LOG_TARGET, "key_threshold: {}", key_threshold);
    let (signer, signer_nonce) = CryptidSignerSeeder {
        cryptid_account: cryptid_address.pubkey(),
    }
    .find_address(cryptid_id);
    trace!(
        target: LOG_TARGET,
        "(signer, nonce): ({}, {})",
        signer,
        signer_nonce
    );

    let transaction = Transaction::new_signed_with_payer(
        &[build_instruction!(
            cryptid_id,
            CryptidInstruction,
            CreateCryptid(CreateCryptidBuild {
                funder: funder.pubkey(),
                cryptid_account: cryptid_address.pubkey(),
                did_program,
                key_threshold,
                cryptid_account_is_zeroed: false,
                signing_key: SigningKeyBuild {
                    signing_key: SolanaAccountMeta::new_readonly(did.pubkey(), true),
                    extra_accounts: vec![],
                }, // Sign as generative
                did: SolanaAccountMeta::new_readonly(did_pda, false),
                account_nonce: None,
            })
        )
        .expect("Could not create instruction")],
        Some(&funder.pubkey()),
        &[&funder, &cryptid_address, &did],
        banks
            .get_latest_blockhash()
            .await
            .expect("Could not get recent block hash"),
    );
    trace!(target: LOG_TARGET, "transaction built");
    banks
        .process_transaction_longer_timeout(transaction)
        .await
        .expect("Transaction failed");

    let account = banks
        .get_account(cryptid_address.pubkey())
        .await
        .expect("Error getting account")
        .unwrap_or_else(|| panic!("Could not find account {}", cryptid_address.pubkey()));
    let data = &mut account.data.as_slice();
    let discriminant: Discriminant =
        BorshDeserialize::deserialize(data).expect("Could not deserialize discriminant");
    assert_eq!(discriminant, CryptidAccount::DISCRIMINANT);
    let data: CryptidAccount = BorshDeserialize::deserialize(data).expect("Could not deserialize");
    trace!(target: LOG_TARGET, "data: {:?}", data);
    assert_eq!(data.did, did_pda);
    assert_eq!(data.did_program, did_program);

    assert_eq!(data.signer_nonce, signer_nonce);
    assert_eq!(data.key_threshold, key_threshold);
    assert_eq!(data.settings_sequence, 1);
}
