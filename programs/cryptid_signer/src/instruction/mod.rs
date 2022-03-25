//! Instructions for `cryptid_signer`

/// Crates a cryptid account
#[path = "./000_create_cryptid.rs"]
pub mod create_cryptid;
/// Directly executes a transaction
#[path = "./005_direct_execute.rs"]
pub mod direct_execute;
// /// Executes a transaction
// #[path = "./003_execute_transaction.rs"]
// pub mod execute_transaction;
// /// Expands a proposed transaction
// #[path = "./002_expand_transaction.rs"]
// pub mod expand_transaction;
// /// Proposes a transaction
// #[path = "./001_propose_transaction.rs"]
// pub mod propose_transaction;
/// A test instruction
#[path = "./254_test_instruction.rs"]
pub mod test_instruction;

use std::borrow::Cow;

use crate::error::CryptidSignerError;
use crate::state::CryptidAccountList;
use borsh::{BorshDeserialize, BorshSchema, BorshSerialize};
use cruiser::account_argument::{AccountArgument, AccountInfoIterator, FromAccounts};
use cruiser::account_types::rest::Rest;
use cruiser::instruction_list::InstructionList;
use cruiser::on_chain_size::{OnChainSize, OnChainStaticSize};
use cruiser::{AccountInfo, CruiserResult, Pubkey};

/// The instructions for `cryptid_signer`
#[derive(Debug, Copy, Clone, InstructionList)]
#[instruction_list(account_list = CryptidAccountList, processor_feature = "processor")]
pub enum CryptidInstruction {
    /// Creates a new Cryptid Account on-chain
    #[instruction(instruction_type = create_cryptid::CreateCryptid)]
    CreateCryptid = 0,
    // /// Proposes a new transaction that can be approved and appended to
    // #[instruction(instruction_type = ProposeTransaction)]
    // ProposeTransaction = 1,
    // /// Expands a transaction
    // #[instruction(instruction_type = ExpandTransaction)]
    // ExpandTransaction = 2,
    // /// Executes a transaction
    // #[instruction(instruction_type = ExecuteTransaction)]
    // ExecuteTransaction = 3,
    /// Executes a transaction directly if all required keys sign
    #[instruction(instruction_type = direct_execute::DirectExecute)]
    DirectExecute = 5,
    /// A test instruction that logs a success message
    #[instruction(instruction_type = test_instruction::TestInstruction)]
    Test = 254,
}

/// Verifies the given keys are valid.
/// Currently only checks that there is a single valid key for `sol-did` and lets all other program through without checks
pub fn verify_keys<'a>(
    did_program: &AccountInfo,
    did: &AccountInfo,
    signing_keys: impl Iterator<Item = &'a SigningKey>,
) -> CruiserResult<()> {
    // TODO: Handle higher key threshold than 1
    if did_program.key == &sol_did::id() {
        for signing_key in signing_keys {
            // Safety: This is safe because the generated references are not leaked or used after another use of the value they came from
            unsafe {
                sol_did::validate_owner(
                    &did.to_solana_account_info(),
                    &signing_key.signing_key.to_solana_account_info(),
                    signing_key
                        .extra_accounts
                        .iter()
                        .map(|info| info.to_solana_account_info())
                        .map(Cow::Owned),
                )?;
            }
        }
        Ok(())
    } else {
        //TODO: Verify signing key against did using interface
        Err(CryptidSignerError::UnsupportedDIDProgram {
            program: did_program.key,
        }
        .into())
    }
}

/// A key that signs for a did.
/// Has a single account that is the signature (may or may not be a solana signature) and a variable number of accounts for the DID program.
#[derive(Debug, AccountArgument)]
#[from(data = (extra_accounts: u8))]
#[from(id = unit, data = ())]
pub struct SigningKey {
    /// The key that constitutes the signature
    pub signing_key: AccountInfo,
    /// Extra accounts for the DID program
    #[from(data = extra_accounts as usize)]
    #[from(id = unit, data = 0)]
    pub extra_accounts: Vec<AccountInfo>,
}
impl SigningKey {
    /// Turns the keys into a string
    pub fn to_key_string(&self) -> String {
        format!(
            "({}, {:?})",
            self.signing_key.key,
            self.extra_accounts
                .iter()
                .map(|extra| extra.key)
                .collect::<Vec<_>>()
        )
    }

    /// Turns the keys into the on-chain data format
    pub fn to_key_data(&self) -> SigningKeyData {
        SigningKeyData {
            key: *self.signing_key.key,
            extra_keys: self
                .extra_accounts
                .iter()
                .map(|account| *account.key)
                .collect(),
        }
    }
}
#[derive(Debug)]
/// Marks that the rest of the accounts are signing key extras
pub struct RestAreExtras;
impl FromAccounts<RestAreExtras> for SigningKey {
    fn from_accounts(
        program_id: &'static Pubkey,
        infos: &mut impl AccountInfoIterator,
        _arg: RestAreExtras,
    ) -> CruiserResult<Self> {
        let mut out = Self::from_accounts(program_id, infos, ())?;
        out.extra_accounts = Rest::from_accounts(program_id, infos, ())?.0;
        Ok(out)
    }

    fn accounts_usage_hint(_arg: &RestAreExtras) -> (usize, Option<usize>) {
        (1, None)
    }
}

/// The on-chain format of [`SigningKey`]
#[derive(Debug, BorshSerialize, BorshDeserialize, BorshSchema, Eq, PartialEq, Clone)]
pub struct SigningKeyData {
    /// The signing key
    pub key: Pubkey,
    /// Extra keys needed for signing
    pub extra_keys: Vec<Pubkey>,
}
/// Number of extra keys
#[derive(Copy, Clone, Debug, Ord, PartialOrd, Eq, PartialEq)]
pub struct ExtraKeys(pub usize);
impl OnChainSize<ExtraKeys> for SigningKeyData {
    fn on_chain_max_size(arg: ExtraKeys) -> usize {
        Pubkey::on_chain_static_size() + Vec::<Pubkey>::on_chain_max_size(arg.0)
    }
}
#[cfg(feature = "client")]
pub use build::*;
#[cfg(feature = "client")]
mod build {
    use cruiser::SolanaAccountMeta;
    use std::iter::once;

    #[derive(Debug, Copy, Clone)]
    pub struct CryptidInstruction;

    #[derive(Debug, Clone)]
    pub struct SigningKeyBuild {
        pub key: SolanaAccountMeta,
        pub extras: Vec<SolanaAccountMeta>,
    }
    impl SigningKeyBuild {
        pub fn into_metas(self) -> impl Iterator<Item = SolanaAccountMeta> {
            once(self.key).chain(self.extras.into_iter())
        }
    }
}
