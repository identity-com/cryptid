//! The types that are stored in accounts for `cryptid_signer`

use crate::error::CryptidSignerError;
use crate::instruction::SigningKeyData;
use bitflags::bitflags;
use borsh::{BorshDeserialize, BorshSchema, BorshSerialize};
use solana_generator::*;
use std::collections::HashMap;

/// The data for an on-chain Cryptid Account
#[derive(Debug, Default, Account, BorshSerialize, BorshDeserialize, BorshSchema)]
#[account(discriminant = [1])]
pub struct CryptidAccount {
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
    // TODO: Implement when permissions added
    // pub sign_permissions: ?,
    // pub execute_permissions: ?,
    // pub remove_permissions: ?,
}
impl CryptidAccount {
    /// The value for [`CryptidAccount::key_threshold`] on a generative cryptid account
    pub const GENERATIVE_CRYPTID_KEY_THRESHOLD: u8 = 1;

    /// The [`CryptidAccount::settings_sequence`] value when the cryptid account is locked
    pub const LOCKED_CRYPTID_SETTINGS_SEQUENCE: u16 = 0;
    /// The [`CryptidAccount::settings_sequence`] value when the cryptid account is generative
    pub const GENERATIVE_CRYPTID_SETTINGS_SEQUENCE: u16 = 1;
    /// The [`CryptidAccount::settings_sequence`] start value
    pub const SETTINGS_SEQUENCE_START: u16 = 2;

    /// Verifies that this Cryptid Account comes from the DID and DID Program
    pub fn verify_did_and_program(&self, did: Pubkey, did_program: Pubkey) -> GeneratorResult<()> {
        if did != self.did {
            Err(CryptidSignerError::WrongDID {
                expected: self.did,
                received: did,
            }
            .into())
        } else if did_program != self.did_program {
            Err(CryptidSignerError::WrongDIDProgram {
                expected: self.did_program,
                received: did_program,
            }
            .into())
        } else {
            Ok(())
        }
    }
}

/// The data to store about a proposed transaction
#[derive(Debug, Default, Account, BorshSerialize, BorshDeserialize, BorshSchema)]
#[account(discriminant = [2])]
pub struct TransactionAccount {
    /// The cryptid account for the transaction
    pub cryptid_account: Pubkey,
    /// The accounts `transaction_instructions` references
    pub accounts: Vec<Pubkey>,
    /// The instructions that will be executed
    pub transaction_instructions: Vec<InstructionData>,
    /// The signers of the transaction with their expiry times
    pub signers: Vec<(SigningKeyData, UnixTimestamp)>,
    /// The state of the transaction
    pub state: TransactionState,
    /// The value of [`CryptidAccount::settings_sequence`] when this was proposed, only valid while that's the same
    pub settings_sequence: u16,
}
impl TransactionAccount {
    fn instruction_index_error(&self, index: u8) -> Box<dyn Error> {
        msg!("Instruction index out of range!");
        GeneratorError::IndexOutOfRange {
            index: index.to_string(),
            possible_range: format!("0..{}", self.transaction_instructions.len()),
        }
        .into()
    }
    fn account_index_error(&self, index: u8) -> Box<dyn Error> {
        msg!("Account index out of range!");
        GeneratorError::IndexOutOfRange {
            index: index.to_string(),
            possible_range: format!("0..{}", self.accounts.len()),
        }
        .into()
    }

    /// Gets an instruction or errors if no instruction at index
    pub fn get_instruction_mut(&mut self, index: u8) -> GeneratorResult<&mut InstructionData> {
        if index as usize >= self.transaction_instructions.len() {
            Err(self.instruction_index_error(index))
        } else {
            Ok(&mut self.transaction_instructions[index as usize])
        }
    }

    /// Checks if a given index is valid for the instructions list
    pub fn check_instruction_index(&self, index: u8) -> GeneratorResult<()> {
        if index as usize >= self.transaction_instructions.len() {
            Err(self.instruction_index_error(index))
        } else {
            Ok(())
        }
    }

    /// Checks of a given index is valid for the accounts list
    pub fn check_account_index(&self, index: u8) -> GeneratorResult<()> {
        if index as usize >= self.accounts.len() {
            Err(self.account_index_error(index))
        } else {
            Ok(())
        }
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
impl Default for TransactionState {
    fn default() -> Self {
        Self::NotReady
    }
}

/// The data about an instruction to be executed. Similar to Solana's [`Instruction`](SolanaInstruction).
#[derive(Debug, BorshSerialize, BorshDeserialize, BorshSchema)]
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
    pub fn into_instruction(self, accounts: &[Pubkey]) -> SolanaInstruction {
        SolanaInstruction {
            program_id: accounts[self.program_id as usize],
            accounts: self
                .accounts
                .into_iter()
                .map(|meta| meta.into_solana_account_meta(accounts))
                .collect(),
            data: self.data,
        }
    }
}

/// An account for an instruction, similar to Solana's [`AccountMeta`](SolanaAccountMeta)
#[derive(Copy, Clone, Debug, BorshSerialize, BorshDeserialize, BorshSchema)]
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
    pub fn into_solana_account_meta(self, accounts: &[Pubkey]) -> SolanaAccountMeta {
        SolanaAccountMeta {
            pubkey: accounts[self.key as usize],
            is_signer: self.meta.contains(AccountMeta::IS_SIGNER),
            is_writable: self.meta.contains(AccountMeta::IS_WRITABLE),
        }
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

#[cfg(test)]
mod test {
    use crate::state::AccountMeta;

    #[test]
    fn account_meta_from_bools() {
        assert_eq!(AccountMeta::new(false, false), AccountMeta::empty());
        assert_eq!(AccountMeta::new(true, false), AccountMeta::IS_SIGNER);
        assert_eq!(AccountMeta::new(false, true), AccountMeta::IS_WRITABLE);
        assert_eq!(AccountMeta::new(true, true), AccountMeta::all());
    }
}
