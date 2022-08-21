#![allow(dead_code)]

use cryptid_signer::instruction::expand_transaction::{
    AccountOperation, ExpandTransactionBuild, InstructionOperation, SeedOrAccount,
};
use cryptid_signer::instruction::{
    propose_transaction::ProposeTransactionBuild, CryptidInstruction, SigningKeyBuild,
};
use cryptid_signer::state::{
    AccountMeta, InstructionData, InstructionSize, TransactionAccount, TransactionAccountMeta,
};
use cryptid_signer::{GenerativeCryptidSeeder, TransactionSeeder};
use log::*;
use num_traits::ToPrimitive;
use solana_generator::{build_instruction, PDAGenerator, SolanaAccountMeta, SolanaInstruction};
use solana_program_test::BanksClient;
use solana_sdk::account::Account;
use solana_sdk::clock::UnixTimestamp;
use solana_sdk::hash::Hash;
use solana_sdk::pubkey::Pubkey;
use solana_sdk::signature::{Keypair, Signature, Signer, SignerError};
use solana_sdk::transaction::Transaction;
use std::iter::{empty, once};
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
        program_values: &mut ProgramValues<impl CryptoRng + RngCore>,
    ) -> Self {
        let accounts = (0..accounts)
            .map(|_| program_values.gen_keypair().pubkey())
            .collect::<Vec<_>>();
        let mut out = Self {
            accounts,
            instructions: vec![],
        };
        out.instructions = instructions
            .into_iter()
            .map(|data_size| out.random_instruction(data_size, program_values))
            .collect::<Vec<_>>();
        out
    }

    fn random_instruction(
        &self,
        data_size: usize,
        program_values: &mut ProgramValues<impl RngCore>,
    ) -> InstructionData {
        let operation: u8 = program_values.gen_range(1, 10);
        InstructionData {
            program_id: program_values.gen_range(0, self.accounts.len()) as u8,
            accounts: (0..operation)
                .map(|_| TransactionAccountMeta {
                    key: program_values.gen_range(0, self.accounts.len()) as u8,
                    meta: AccountMeta::new(program_values.gen(), program_values.gen()),
                })
                .collect(),
            data: (0..data_size).map(|_| program_values.gen()).collect(),
        }
    }

    pub fn calculate_size(&self) -> usize {
        TransactionAccount::calculate_size(
            self.accounts.len(),
            InstructionSize::from_iter_to_iter(self.instructions.iter()),
            once(0),
        )
    }

    pub fn apply_instruction_operation(&mut self, operation: InstructionOperation) {
        match operation {
            InstructionOperation::Push(instruction) => {
                self.instructions.push(instruction);
            }
            InstructionOperation::Pop => {
                self.instructions.pop();
            }
            InstructionOperation::AddAccount { index, account } => {
                self.instructions[index as usize].accounts.push(account);
            }
            InstructionOperation::AddAccounts { index, accounts } => {
                self.instructions[index as usize].accounts.extend(accounts);
            }
            InstructionOperation::ClearAccounts(index) => {
                self.instructions[index as usize].accounts.clear();
            }
            InstructionOperation::AddData { index, data } => {
                self.instructions[index as usize].data.extend(data);
            }
            InstructionOperation::ClearData(index) => {
                self.instructions[index as usize].data.clear();
            }
            InstructionOperation::Clear => self.instructions.clear(),
        }
    }

    pub fn apply_account_operation(&mut self, operation: AccountOperation) {
        match operation {
            AccountOperation::Add(account) => self.accounts.push(account),
            AccountOperation::Clear => self.accounts.clear(),
            AccountOperation::AddMany(accounts) => self.accounts.extend(accounts),
        }
    }

    pub fn random_instruction_operation(
        &self,
        program_values: &mut ProgramValues<impl RngCore>,
    ) -> InstructionOperation {
        if self.accounts.is_empty() {
            InstructionOperation::Clear
        } else if self.instructions.is_empty() {
            let operation = program_values.gen_range(0, 1);
            match operation {
                0 => InstructionOperation::Push(
                    self.random_instruction(program_values.gen_range(0, 10), program_values),
                ),
                1 => InstructionOperation::Clear,
                _ => unreachable!(),
            }
        } else {
            let operation8: u8 = program_values.gen_range(0, 8);
            let operation4: u8 = program_values.gen_range(0, 4);
            match operation8 {
                0 => InstructionOperation::Push(
                    self.random_instruction(program_values.gen_range(0, 10), program_values),
                ),
                1 => InstructionOperation::Pop,
                2 => InstructionOperation::AddAccount {
                    index: program_values.gen_range(0, self.instructions.len() as u8),
                    account: TransactionAccountMeta {
                        key: program_values.gen_range(0, self.accounts.len() as u8),
                        meta: AccountMeta::new(program_values.gen(), program_values.gen()),
                    },
                },
                3 => InstructionOperation::AddAccounts {
                    index: program_values.gen_range(0, self.instructions.len() as u8),
                    accounts: (0..operation4)
                        .map(|_| TransactionAccountMeta {
                            key: program_values.gen_range(0, self.accounts.len() as u8),
                            meta: AccountMeta::new(program_values.gen(), program_values.gen()),
                        })
                        .collect(),
                },
                4 => InstructionOperation::ClearAccounts(
                    program_values.gen_range(0, self.instructions.len()) as u8,
                ),
                5 => InstructionOperation::AddData {
                    index: program_values.gen_range(0, self.instructions.len() as u8),
                    data: (0..program_values.gen_range(0, 10))
                        .map(|_| program_values.gen())
                        .collect(),
                },
                6 => InstructionOperation::ClearData(
                    program_values.gen_range(0, self.instructions.len() as u8),
                ),
                7 => InstructionOperation::Clear,
                _ => unreachable!(),
            }
        }
    }

    pub fn random_account_operation(
        &self,
        program_values: &mut ProgramValues<impl CryptoRng + RngCore>,
    ) -> AccountOperation {
        let can_clear = self.instructions.is_empty();
        match program_values.gen_range(0, 2 + can_clear as u8) {
            0 => AccountOperation::Add(program_values.gen_keypair().pubkey()),
            1 => AccountOperation::AddMany(
                (0..program_values.gen_range(0, 4))
                    .map(|_| program_values.gen_keypair().pubkey())
                    .collect(),
            ),
            2 => AccountOperation::Clear,
            _ => unreachable!(),
        }
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

    pub fn keypair(&self) -> Option<&ClonableKeypair> {
        if let Self::Keypair(keypair) = self {
            Some(keypair)
        } else {
            None
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
impl<R> ProgramValues<R> {
    pub async fn send_transaction<'a>(
        &'a mut self,
        instructions: &[SolanaInstruction],
        signers: impl IntoIterator<Item = &'a Keypair>,
        did_signs: bool,
        cryptid_account_signs: bool,
    ) {
        let mut signers = signers
            .into_iter()
            .chain(once(&self.funder.0))
            .collect::<Vec<_>>();
        if did_signs {
            signers.push(&self.did.0);
        }
        if cryptid_account_signs {
            signers.push(
                &self
                    .cryptid_address
                    .keypair()
                    .expect("Cryptid is not keypair")
                    .0,
            )
        }
        let transaction = Transaction::new_signed_with_payer(
            instructions,
            Some(&self.funder.pubkey()),
            &signers,
            self.banks
                .get_recent_blockhash()
                .await
                .expect("Could not get recent block hash"),
        );
        self.banks
            .process_transaction_longer_timeout(transaction)
            .await
            .expect("Transaction failed");
    }

    pub async fn send_expand_transaction_instruction(
        &mut self,
        transaction_account: SeedOrAccount,
        signing_key: SigningKeyBuild,
        ready_to_execute: bool,
        account_operations: Vec<AccountOperation>,
        instruction_operations: Vec<InstructionOperation>,
    ) {
        let build = ExpandTransactionBuild {
            transaction_account,
            cryptid_account: self.cryptid_address.pubkey(),
            did: SolanaAccountMeta::new_readonly(self.did_pda, false),
            did_program: self.did_program,
            signing_key,
            ready_to_execute,
            account_operations,
            instruction_operations,
        };
        self.send_transaction(
            &[build_instruction!(
                self.cryptid_program_id,
                CryptidInstruction,
                ExpandTransaction(build)
            )
            .expect("Could not build instruction")],
            empty(),
            true,
            false,
        )
        .await;
    }
}
impl<R> ProgramValues<R>
where
    R: RngCore,
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
impl<R> ProgramValues<R>
where
    R: CryptoRng + RngCore,
{
    pub fn gen_keypair(&mut self) -> Keypair {
        Keypair::generate(&mut self.rng)
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
    let did_pda = sol_did::derive_did_account(&did.pubkey()).0;
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

#[derive(Default, Clone)]
pub struct ProposeOverrides {
    size: Option<u16>,
    ready_to_execute: Option<bool>,
}
impl ProposeOverrides {
    pub const fn size(self, size: u16) -> Self {
        Self {
            size: Some(size),
            ..self
        }
    }

    pub const fn ready_to_execute(self, ready_to_execute: bool) -> Self {
        Self {
            ready_to_execute: Some(ready_to_execute),
            ..self
        }
    }
}

pub async fn propose_transaction(
    on_chain_transaction: &OnChainTransaction,
    program_values: &mut ProgramValues<impl CryptoRng + RngCore>,
    transaction_seed: String,
    overrides: ProposeOverrides,
) -> Vec<(SigningKeyBuild, UnixTimestamp)> {
    let did_pda = sol_did::derive_did_account(&program_values.did.pubkey()).0;
    let account_size = overrides.size.unwrap_or_else(|| {
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
                ready_to_execute: overrides
                    .ready_to_execute
                    .unwrap_or_else(|| program_values.rng.gen()),
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
