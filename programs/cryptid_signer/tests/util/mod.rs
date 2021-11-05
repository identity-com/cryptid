#![allow(dead_code)]

use cryptid_signer::instruction::{
    propose_transaction::ProposeTransactionBuild, CryptidInstruction, SigningKeyBuild,
};
use cryptid_signer::state::{
    AccountMeta, InstructionData, InstructionSize, TransactionAccount, TransactionAccountMeta,
};
use cryptid_signer::{GenerativeCryptidSeeder, TransactionSeeder};
use log::*;
use num_traits::ToPrimitive;
use sol_did::solana_program::clock::UnixTimestamp;
use sol_did::solana_program::pubkey::Pubkey;
use solana_generator::{build_instruction, PDAGenerator, SolanaAccountMeta};
use solana_program_test::BanksClient;
use solana_sdk::account::Account;
use solana_sdk::hash::Hash;
use solana_sdk::signature::{Keypair, Signature, Signer, SignerError};
use solana_sdk::transaction::Transaction;
use std::iter::once;
use std::ops::Deref;
use test_utils::rand::distributions::uniform::{SampleBorrow, SampleUniform};
use test_utils::rand::distributions::{Distribution, Standard};
use test_utils::rand::{CryptoRng, Rng, RngCore, SeedableRng};
use test_utils::{start_tests, ClientExpansion};

pub const LOG_TARGET: &str = "cryptid_signer";
pub const CRYPTID_SIGNER_PROGRAM_NAME: &str = "cryptid_signer";
pub const DUMMY_PROGRAM_NAME: &str = "dummy_program";

pub struct OnChainTransaction {
    pub accounts: Vec<Pubkey>,
    pub instructions: Vec<InstructionData>,
}
impl OnChainTransaction {
    /// instructions len is number, value is data size
    pub fn random(
        accounts: u8,
        instructions: Vec<usize>,
        rng: &mut (impl SeedableRng + CryptoRng + RngCore),
    ) -> Self {
        let accounts = (0..accounts)
            .map(|_| Keypair::generate(rng).pubkey())
            .collect::<Vec<_>>();
        let instructions = instructions
            .into_iter()
            .map(|data_size| InstructionData {
                program_id: rng.gen_range(0, accounts.len()) as u8,
                accounts: (0..rng.gen_range(1, 10))
                    .map(|_| TransactionAccountMeta {
                        key: rng.gen_range(0, accounts.len()) as u8,
                        meta: AccountMeta::new(rng.gen(), rng.gen()),
                    })
                    .collect(),
                data: (0..data_size).map(|_| rng.gen()).collect(),
            })
            .collect::<Vec<_>>();
        Self {
            accounts,
            instructions,
        }
    }

    pub fn calculate_size(&self) -> usize {
        TransactionAccount::calculate_size(
            self.accounts.len(),
            InstructionSize::from_iter_to_iter(self.instructions.iter()),
            once(0),
        )
    }
}

pub struct ClonableKeypair(pub Keypair);
impl From<Keypair> for ClonableKeypair {
    fn from(from: Keypair) -> Self {
        Self(from)
    }
}
impl From<ClonableKeypair> for Keypair {
    fn from(from: ClonableKeypair) -> Self {
        from.0
    }
}
impl Clone for ClonableKeypair {
    fn clone(&self) -> Self {
        Self(Keypair::from_bytes(&self.0.to_bytes()).unwrap())
    }
}
impl Deref for ClonableKeypair {
    type Target = Keypair;

    fn deref(&self) -> &Self::Target {
        &self.0
    }
}
impl Signer for ClonableKeypair {
    fn pubkey(&self) -> Pubkey {
        self.0.pubkey()
    }

    fn try_pubkey(&self) -> Result<Pubkey, SignerError> {
        self.0.try_pubkey()
    }

    fn sign_message(&self, message: &[u8]) -> Signature {
        self.0.sign_message(message)
    }

    fn try_sign_message(&self, message: &[u8]) -> Result<Signature, SignerError> {
        self.0.try_sign_message(message)
    }

    fn is_interactive(&self) -> bool {
        self.0.is_interactive()
    }
}

#[derive(Clone)]
pub enum OptionalKeypair {
    Keypair(ClonableKeypair),
    Pubkey(Pubkey),
}
impl OptionalKeypair {
    pub fn pubkey(&self) -> Pubkey {
        match self {
            OptionalKeypair::Keypair(keypair) => keypair.pubkey(),
            OptionalKeypair::Pubkey(pubkey) => *pubkey,
        }
    }
}

#[derive(Clone)]
pub struct ProgramValues<R> {
    pub rng: R,
    pub banks: BanksClient,
    pub funder: ClonableKeypair,
    pub cryptid_program_id: Pubkey,
    pub dummy_program_id: Pubkey,
    pub genesis_hash: Hash,
    pub cryptid_address: OptionalKeypair,
    pub did: ClonableKeypair,
    pub did_pda: Pubkey,
    pub did_program: Pubkey,
}
impl<R> ProgramValues<R>
where
    R: SeedableRng + CryptoRng + RngCore,
{
    pub fn gen<T>(&mut self) -> T
    where
        Standard: Distribution<T>,
    {
        self.rng.gen()
    }

    pub fn gen_range<T: SampleUniform, B1, B2>(&mut self, low: B1, high: B2) -> T
    where
        B1: SampleBorrow<T> + Sized,
        B2: SampleBorrow<T> + Sized,
    {
        self.rng.gen_range(low, high)
    }

    pub fn gen_string(&mut self, low_size: usize, high_size: usize) -> String {
        (0..self.gen_range(low_size, high_size))
            .map(|_| self.gen::<char>())
            .collect()
    }

    //noinspection RsSelfConvention
    pub async fn get_account(&mut self, key: Pubkey) -> Account {
        self.get_account_optional(key)
            .await
            .unwrap_or_else(|| panic!("Cannot find account `{}`", key))
    }

    //noinspection RsSelfConvention
    pub async fn get_account_optional(&mut self, key: Pubkey) -> Option<Account> {
        self.banks
            .get_account(key)
            .await
            .unwrap_or_else(|_| panic!("Error getting account `{}`", key))
    }
}

pub async fn create_program_values(
    generative_cryptid: bool,
) -> ProgramValues<impl SeedableRng + CryptoRng + RngCore + Clone> {
    let (banks, funder, genesis_hash, mut rng, [cryptid_program_id, dummy_program_id]) =
        start_tests(
            LOG_TARGET,
            [CRYPTID_SIGNER_PROGRAM_NAME, DUMMY_PROGRAM_NAME],
        )
        .await;

    let did: ClonableKeypair = Keypair::generate(&mut rng).into();
    trace!(target: LOG_TARGET, "did: {}", did.pubkey());
    let did_pda = sol_did::state::get_sol_address_with_seed(&did.pubkey()).0;
    trace!(target: LOG_TARGET, "did_pda: {}", did_pda);
    let did_program = sol_did::id();
    trace!(target: LOG_TARGET, "did_program: {}", did_program);
    let cryptid_address = if generative_cryptid {
        OptionalKeypair::Pubkey(
            GenerativeCryptidSeeder {
                did_program,
                did: did_pda,
            }
            .find_address(cryptid_program_id)
            .0,
        )
    } else {
        OptionalKeypair::Keypair(Keypair::generate(&mut rng).into())
    };
    trace!(
        target: LOG_TARGET,
        "cryptid_address: {}",
        cryptid_address.pubkey()
    );

    ProgramValues {
        rng,
        banks,
        funder: funder.into(),
        cryptid_program_id,
        dummy_program_id,
        genesis_hash,
        cryptid_address,
        did,
        did_pda,
        did_program,
    }
}

pub async fn propose_transaction(
    on_chain_transaction: &OnChainTransaction,
    program_values: &mut ProgramValues<impl SeedableRng + CryptoRng + RngCore>,
    transaction_seed: String,
    size_override: Option<u16>,
) -> Vec<(SigningKeyBuild, UnixTimestamp)> {
    let did_pda = sol_did::state::get_sol_address_with_seed(&program_values.did.pubkey()).0;
    let account_size = size_override.unwrap_or_else(|| {
        on_chain_transaction
            .calculate_size()
            .to_u16()
            .expect("Account too big")
    });

    let signers = vec![(
        SigningKeyBuild {
            signing_key: SolanaAccountMeta::new_readonly(program_values.did.pubkey(), true),
            extra_accounts: vec![],
        },
        program_values.gen(),
    )];

    trace!(
        target: LOG_TARGET,
        "Transaction address: {}",
        TransactionSeeder {
            cryptid_account: program_values.cryptid_address.pubkey(),
            seed: transaction_seed.clone()
        }
        .find_address(program_values.cryptid_program_id)
        .0
    );

    let transaction = Transaction::new_signed_with_payer(
        &[build_instruction!(
            program_values.cryptid_program_id,
            CryptidInstruction,
            ProposeTransaction(ProposeTransactionBuild {
                funder: program_values.funder.pubkey(),
                cryptid_account: program_values.cryptid_address.pubkey(),
                did: SolanaAccountMeta::new_readonly(did_pda, false),
                did_program: program_values.did_program,
                signers: signers.clone(),
                accounts: on_chain_transaction.accounts.clone(),
                instructions: on_chain_transaction.instructions.clone(),
                ready_to_execute: program_values.rng.gen(),
                account_size,
                account_seed: transaction_seed.clone(),
            })
        )
        .expect("Could not create instruction")],
        Some(&program_values.funder.pubkey()),
        &[&program_values.funder, &program_values.did],
        program_values
            .banks
            .get_recent_blockhash()
            .await
            .expect("Could not get recent block hash"),
    );
    // trace!(target: LOG_TARGET, "Transaction : {:#?}", transaction);
    trace!(target: LOG_TARGET, "propose transaction built");
    program_values
        .banks
        .process_transaction_longer_timeout(transaction)
        .await
        .expect("Transaction failed");
    trace!(target: LOG_TARGET, "propose transaction processed");

    signers
}
