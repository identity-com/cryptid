//! The types that are stored in accounts for `cryptid_signer`

use crate::instruction::{ExtraKeys, SigningKeyData};
use bitflags::bitflags;
use borsh::{BorshDeserialize, BorshSchema, BorshSerialize};
use cruiser::account_list::AccountList;
use cruiser::error::Error;
use cruiser::on_chain_size::{OnChainSize, OnChainStaticSize};
use cruiser::{
    msg, CruiserResult, GenericError, Pubkey, SolanaAccountMeta, SolanaInstruction, UnixTimestamp,
};
use std::collections::HashMap;

/// The list of accounts used by the cryptid program
#[derive(Debug, AccountList)]
pub enum CryptidAccountList {
    /// [`CryptidAccount`]
    CryptidAccount(CryptidAccount),
    /// [`TransactionAccount`]
    TransactionAccount(TransactionAccount),
}

/// The data for an on-chain Cryptid Account
#[derive(Debug, Default, BorshSerialize, BorshDeserialize, BorshSchema)]
pub struct CryptidAccount {
    /// Version of the account
    pub version: u8,
    /// The DID for this
    pub did: Pubkey,
    /// The program for the DID
    pub did_program: Pubkey,
    /// The nonce of the Cryptid Signer
    pub signer_nonce: u8,
    /// The number of keys needed for transactions to be executed
    pub key_threshold: u8,
    /// A tracker to invalidate transactions when settings change
    pub settings_sequence: u16,
    /// Middlewares for this account
    pub middlewares: Vec<Pubkey>,
}
impl CryptidAccount {
    /// Current valid version
    pub const CURRENT_VERSION: u8 = 0;
    /// The value for [`CryptidAccount::key_threshold`] on a generative cryptid account
    pub const GENERATIVE_CRYPTID_KEY_THRESHOLD: u8 = 1;

    /// The [`CryptidAccount::settings_sequence`] value when the cryptid account is locked
    pub const LOCKED_CRYPTID_SETTINGS_SEQUENCE: u16 = 0;
    /// The [`CryptidAccount::settings_sequence`] value when the cryptid account is generative
    pub const GENERATIVE_CRYPTID_SETTINGS_SEQUENCE: u16 = 1;
    /// The [`CryptidAccount::settings_sequence`] start value
    pub const SETTINGS_SEQUENCE_START: u16 = 2;

    /// Creates a new on-chain version of self
    pub fn new_on_chain() -> Self {
        Self {
            version: Self::CURRENT_VERSION,
            did: Default::default(),
            did_program: Default::default(),
            signer_nonce: Default::default(),
            key_threshold: Self::GENERATIVE_CRYPTID_KEY_THRESHOLD,
            settings_sequence: Self::SETTINGS_SEQUENCE_START,
            middlewares: vec![],
        }
    }
}
/// Max number of middlewares
#[derive(Copy, Clone, Debug, Eq, PartialEq, Ord, PartialOrd)]
pub struct MiddlewareCount(pub usize);
impl OnChainSize<MiddlewareCount> for CryptidAccount {
    fn on_chain_max_size(arg: MiddlewareCount) -> usize {
        Pubkey::on_chain_static_size() * 2
            + u8::on_chain_static_size() * 2
            + u16::on_chain_static_size()
            + Vec::<Pubkey>::on_chain_max_size(arg.0)
    }
}

/// A helper struct for calculating [`InstructionData`] size
#[derive(Copy, Clone, Debug, BorshSerialize, BorshDeserialize, BorshSchema)]
pub struct InstructionSize {
    /// The number of accounts in the instruction
    pub accounts: u8,
    /// The size of the instruction data
    pub data_len: u32,
}
impl InstructionSize {
    /// Creates a size iterator from an iterator of data refs
    pub fn from_iter_to_iter<'a>(
        iter: impl Iterator<Item = &'a InstructionData> + 'a,
    ) -> impl Iterator<Item = InstructionSize> + 'a {
        iter.map(|instruction| Self {
            accounts: instruction.accounts.len() as u8,
            data_len: instruction.data.len() as u32,
        })
    }
}
impl OnChainSize<()> for InstructionSize {
    fn on_chain_max_size(_arg: ()) -> usize {
        u8::on_chain_static_size() + u16::on_chain_static_size()
    }
}

/// The data to store about a proposed transaction
#[derive(Debug, Default, BorshSerialize, BorshDeserialize, BorshSchema)]
pub struct TransactionAccount {
    /// The cryptid account for the transaction
    pub cryptid_account: Pubkey,
    /// The state of the transaction
    pub state: TransactionState,
    /// The value of [`CryptidAccount::settings_sequence`] when this was proposed, only valid while that's the same
    pub settings_sequence: u16,
    /// The accounts `transaction_instructions` references
    pub accounts: Vec<Pubkey>,
    /// The instructions that will be executed
    pub transaction_instructions: Vec<InstructionData>,
    /// The signers of the transaction with their expiry times
    pub signers: Vec<(SigningKeyData, UnixTimestamp)>,
}
impl TransactionAccount {
    fn instruction_index_error(&self, index: u8) -> impl Error {
        msg!("Instruction index out of range!");
        GenericError::IndexOutOfRange {
            index: index.to_string(),
            possible_range: format!("0..{}", self.transaction_instructions.len()),
        }
    }
    fn account_index_error(&self, index: u8) -> impl Error {
        msg!("Account index out of range!");
        GenericError::IndexOutOfRange {
            index: index.to_string(),
            possible_range: format!("0..{}", self.accounts.len()),
        }
    }

    /// Gets an instruction or errors if no instruction at index
    pub fn get_instruction_mut(&mut self, index: u8) -> CruiserResult<&mut InstructionData> {
        if index as usize >= self.transaction_instructions.len() {
            Err(self.instruction_index_error(index).into())
        } else {
            Ok(&mut self.transaction_instructions[index as usize])
        }
    }

    /// Checks if a given index is valid for the instructions list
    pub fn check_instruction_index(&self, index: u8) -> CruiserResult<()> {
        if index as usize >= self.transaction_instructions.len() {
            Err(self.instruction_index_error(index).into())
        } else {
            Ok(())
        }
    }

    /// Checks of a given index is valid for the accounts list
    pub fn check_account_index(&self, index: u8) -> CruiserResult<()> {
        if index as usize >= self.accounts.len() {
            Err(self.account_index_error(index).into())
        } else {
            Ok(())
        }
    }
}
struct TransactionAccountSize<I1, I2> {
    accounts: usize,
    instructions: I1,
    signers: I2,
}
impl<I1, I2> OnChainSize<TransactionAccountSize<I1, I2>> for TransactionAccount
where
    I1: IntoIterator<Item = InstructionSize>,
    I2: IntoIterator<Item = ExtraKeys>,
{
    fn on_chain_max_size(arg: TransactionAccountSize<I1, I2>) -> usize {
        Pubkey::on_chain_static_size()
            + TransactionState::on_chain_static_size()
            + u16::on_chain_static_size()
            + Vec::<Pubkey>::on_chain_max_size(arg.accounts)
            + Vec::<InstructionData>::on_chain_max_size((arg.instructions,))
            + Vec::<(SigningKeyData, UnixTimestamp)>::on_chain_max_size((arg
                .signers
                .into_iter()
                .map(|val| (val, ())),))
    }
}

/// A [`TransactionAccount`]'s state
#[derive(Debug, BorshSerialize, BorshDeserialize, BorshSchema, Eq, PartialEq, Copy, Clone)]
pub enum TransactionState {
    /// Transaction account is not ready to execute
    NotReady,
    /// Transaction account is ready to execute
    Ready,
    /// Transaction account has executed
    Executed,
}
impl OnChainSize<()> for TransactionState {
    fn on_chain_max_size(_arg: ()) -> usize {
        1
    }
}
impl Default for TransactionState {
    fn default() -> Self {
        Self::NotReady
    }
}

/// The data about an instruction to be executed. Similar to Solana's [`Instruction`](SolanaInstruction).
#[derive(Debug, BorshSerialize, BorshDeserialize, BorshSchema, Eq, PartialEq, Clone)]
pub struct InstructionData {
    /// The program to execute
    pub program_id: u8,
    /// The accounts to send to the program
    pub accounts: Vec<TransactionAccountMeta>,
    /// The data for the instruction
    pub data: Vec<u8>,
}
impl InstructionData {
    /// Creates an [`InstructionData`] from a given [`SolanaInstruction`]
    pub fn from_instruction(
        instruction: SolanaInstruction,
        accounts: &HashMap<Pubkey, u8>,
    ) -> Self {
        Self {
            program_id: *accounts.get(&instruction.program_id).unwrap_or_else(|| {
                panic!(
                    "Could not find program `{}` in accounts",
                    instruction.program_id
                )
            }),
            accounts: instruction
                .accounts
                .into_iter()
                .map(|meta| TransactionAccountMeta::from_solana_account_meta(meta, accounts))
                .collect(),
            data: instruction.data,
        }
    }

    /// Turns `self` into a [`SolanaInstruction`]
    pub fn into_instruction(self, accounts: &[&Pubkey]) -> SolanaInstruction {
        SolanaInstruction {
            program_id: *accounts[self.program_id as usize],
            accounts: self
                .accounts
                .into_iter()
                .map(|meta| meta.into_solana_account_meta(accounts))
                .collect(),
            data: self.data,
        }
    }
}
impl OnChainSize<InstructionSize> for InstructionData {
    fn on_chain_max_size(arg: InstructionSize) -> usize {
        u8::on_chain_static_size()
            + Vec::<TransactionAccountMeta>::on_chain_max_size(arg.accounts as usize)
            + Vec::<u8>::on_chain_max_size(arg.data_len as usize)
    }
}

/// An account for an instruction, similar to Solana's [`AccountMeta`](SolanaAccountMeta)
#[derive(Copy, Clone, Debug, BorshSerialize, BorshDeserialize, BorshSchema, Eq, PartialEq)]
pub struct TransactionAccountMeta {
    /// The key of the account
    pub key: u8,
    /// Information about the account
    pub meta: AccountMeta,
}
impl TransactionAccountMeta {
    /// Creates a [`TransactionAccountMeta`] from a given [`SolanaAccountMeta`]
    pub fn from_solana_account_meta(
        meta: SolanaAccountMeta,
        accounts: &HashMap<Pubkey, u8>,
    ) -> Self {
        Self {
            key: *accounts
                .get(&meta.pubkey)
                .unwrap_or_else(|| panic!("Could not find account `{}` in accounts", meta.pubkey)),
            meta: AccountMeta::new(meta.is_signer, meta.is_writable),
        }
    }

    /// Turns `self` into a [`SolanaAccountMeta`]
    pub fn into_solana_account_meta(self, accounts: &[&Pubkey]) -> SolanaAccountMeta {
        SolanaAccountMeta {
            pubkey: *accounts[self.key as usize],
            is_signer: self.meta.contains(AccountMeta::IS_SIGNER),
            is_writable: self.meta.contains(AccountMeta::IS_WRITABLE),
        }
    }
}
impl OnChainSize<()> for TransactionAccountMeta {
    fn on_chain_max_size(_arg: ()) -> usize {
        u8::on_chain_static_size() + AccountMeta::on_chain_static_size()
    }
}

bitflags! {
    /// The meta information about an instruction account
    #[derive(BorshSerialize, BorshDeserialize, BorshSchema)]
    pub struct AccountMeta: u8{
        /// The account is a signer
        const IS_SIGNER = 1 << 0;
        /// The account is writable
        const IS_WRITABLE = 1 << 1;
    }
}
impl AccountMeta {
    /// Creates a new [`AccountMeta`] from the given arguments
    pub fn new(is_signer: bool, is_writable: bool) -> Self {
        Self::from_bits(
            ((is_signer as u8) * Self::IS_SIGNER.bits)
                | ((is_writable as u8) * Self::IS_WRITABLE.bits),
        )
        .unwrap()
    }
}
impl OnChainSize<()> for AccountMeta {
    fn on_chain_max_size(_arg: ()) -> usize {
        1
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use std::iter::once;

    #[test]
    fn account_meta_from_bools() {
        assert_eq!(AccountMeta::new(false, false), AccountMeta::empty());
        assert_eq!(AccountMeta::new(true, false), AccountMeta::IS_SIGNER);
        assert_eq!(AccountMeta::new(false, true), AccountMeta::IS_WRITABLE);
        assert_eq!(AccountMeta::new(true, true), AccountMeta::all());
    }

    #[test]
    fn calculate_size() {
        let size = TransactionAccount::on_chain_max_size(TransactionAccountSize {
            accounts: 1,
            instructions: once(InstructionSize {
                accounts: 1,
                data_len: 1,
            }),
            signers: once(ExtraKeys(1)),
        });
        println!("Size: {}", size);

        let account = TransactionAccount {
            cryptid_account: Default::default(),
            accounts: vec![Default::default()],
            transaction_instructions: vec![InstructionData {
                program_id: 0,
                accounts: vec![TransactionAccountMeta {
                    key: 0,
                    meta: AccountMeta::empty(),
                }],
                data: vec![0],
            }],
            signers: vec![(
                SigningKeyData {
                    key: Default::default(),
                    extra_keys: vec![Default::default()],
                },
                0,
            )],
            state: Default::default(),
            settings_sequence: 0,
        };
        let ser_size = BorshSerialize::try_to_vec(&account).unwrap().len();
        println!("SerSize: {}", ser_size);
        assert_eq!(size, ser_size);
    }
}
