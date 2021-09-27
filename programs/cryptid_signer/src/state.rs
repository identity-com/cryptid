//! The types that are stored in accounts for `cryptid_signer`

use crate::error::CryptidSignerError;
use bitflags::bitflags;
use borsh::{BorshDeserialize, BorshSchema, BorshSerialize};
use solana_generator::{
    Account, GeneratorResult, Pubkey, SolanaAccountMeta, SolanaInstruction, UnixTimestamp,
};

/// The data for an on-chain DOA
#[derive(Debug, Default, Account, BorshSerialize, BorshDeserialize, BorshSchema)]
#[account(discriminant = [1])]
pub struct DOAAccount {
    /// The DID for this DOA
    pub did: Pubkey,
    /// The program for the DID
    pub did_program: Pubkey,
    /// The nonce of tje DOA Signer
    pub signer_nonce: u8,
    /// The number of keys needed for transactions to be executed
    pub key_threshold: u8,
    /// A tracker to invalidate transactions when DOA settings change
    pub settings_sequence: u16,
    // TODO: Implement when permissions added
    // pub sign_permissions: ?,
    // pub execute_permissions: ?,
    // pub remove_permissions: ?,
}
impl DOAAccount {
    /// The value for [`DOAAccount::key_threshold`] on a generative DOA
    pub const GENERATIVE_DOA_KEY_THRESHOLD: u8 = 1;

    /// The [`DOAAccount::settings_sequence`] value when the DOA is locked
    pub const LOCKED_DOA_SETTINGS_SEQUENCE: u16 = 0;
    /// The [`DOAAccount::settings_sequence`] value when the DOA is generative
    pub const GENERATIVE_DOA_SETTINGS_SEQUENCE: u16 = 1;
    /// The [`DOAAccount::settings_sequence`] start value
    pub const SETTINGS_SEQUENCE_START: u16 = 2;

    /// Verifies that this DOA comes from the DID and DID Program
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
    /// The DOA for the transaction
    pub doa: Pubkey,
    /// The instructions that will be executed
    pub transaction_instructions: Vec<InstructionData>,
    /// The signers of the transaction with their expiry times
    pub signers: Vec<(Pubkey, UnixTimestamp)>,
    /// Whether or not this has executed
    pub has_executed: bool,
    /// The value of [`DOAAccount::settings_sequence`] when this was proposed, only claid while that's the same
    pub settings_sequence: u16,
}

/// The data about an instruction to be executed. Similar to Solana's [`Instruction`](SolanaInstruction).
#[derive(Debug, BorshSerialize, BorshDeserialize, BorshSchema)]
pub struct InstructionData {
    /// The program to execute
    pub program_id: Pubkey,
    /// The accounts to send to the program
    pub accounts: Vec<TransactionAccountMeta>,
    /// The data for the instruction
    pub data: Vec<u8>,
}
impl From<SolanaInstruction> for InstructionData {
    fn from(from: SolanaInstruction) -> Self {
        Self {
            program_id: from.program_id,
            accounts: from
                .accounts
                .into_iter()
                .map(TransactionAccountMeta::from)
                .collect(),
            data: from.data,
        }
    }
}
impl From<InstructionData> for SolanaInstruction {
    fn from(from: InstructionData) -> Self {
        Self {
            program_id: from.program_id,
            accounts: from
                .accounts
                .into_iter()
                .map(SolanaAccountMeta::from)
                .collect(),
            data: from.data,
        }
    }
}

/// An account for an instruction, similar to Solana's [`AccountMeta`](SolanaAccountMeta)
#[derive(Copy, Clone, Debug, BorshSerialize, BorshDeserialize, BorshSchema)]
pub struct TransactionAccountMeta {
    /// The key of the account
    pub key: Pubkey,
    /// Information about the account
    pub meta: AccountMeta,
}
impl From<SolanaAccountMeta> for TransactionAccountMeta {
    fn from(from: SolanaAccountMeta) -> Self {
        Self {
            key: from.pubkey,
            meta: AccountMeta::new(from.is_signer, from.is_writable),
        }
    }
}
impl From<TransactionAccountMeta> for SolanaAccountMeta {
    fn from(from: TransactionAccountMeta) -> Self {
        SolanaAccountMeta {
            pubkey: from.key,
            is_signer: from.meta.contains(AccountMeta::IS_SIGNER),
            is_writable: from.meta.contains(AccountMeta::IS_WRITABLE),
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
