use crate::error::CryptidSignerError;
use bitflags::bitflags;
use borsh::{BorshDeserialize, BorshSchema, BorshSerialize};
use solana_generator::{Account, GeneratorResult, Pubkey, SolanaAccountMeta, UnixTimestamp};

#[derive(Debug, Default, Account, BorshSerialize, BorshDeserialize, BorshSchema)]
#[account(discriminant = [1])]
pub struct DOAAccount {
    pub did: Pubkey,
    pub did_program: Pubkey,
    pub signer_nonce: u8,
    pub key_threshold: u8,
    pub settings_sequence: u16,
    // TODO: Implement when permissions added
    // pub sign_permissions: ?,
    // pub execute_permissions: ?,
    // pub remove_permissions: ?,
}
impl DOAAccount {
    pub const GENERATIVE_DOA_KEY_THRESHOLD: u8 = 1;

    pub const LOCKED_DOA_SETTINGS_SEQUENCE: u16 = 0;
    pub const GENERATIVE_DOA_SETTINGS_SEQUENCE: u16 = 1;
    pub const SETTINGS_SEQUENCE_START: u16 = 2;

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

#[derive(Debug, Default, Account, BorshSerialize, BorshDeserialize, BorshSchema)]
#[account(discriminant = [2])]
pub struct TransactionAccount {
    pub doa: Pubkey,
    pub transaction_instructions: Vec<InstructionData>,
    pub signers: Vec<(Pubkey, UnixTimestamp)>,
    pub has_executed: bool,
    pub settings_sequence: u16,
}

#[derive(Debug, BorshSerialize, BorshDeserialize, BorshSchema)]
pub struct InstructionData {
    pub program_id: Pubkey,
    pub accounts: Vec<TransactionAccountMeta>,
    pub data: Vec<u8>,
}

#[derive(Copy, Clone, Debug, BorshSerialize, BorshDeserialize, BorshSchema)]
pub struct TransactionAccountMeta {
    pub key: Pubkey,
    pub meta: AccountMeta,
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
    #[derive(BorshSerialize, BorshDeserialize, BorshSchema)]
    pub struct AccountMeta: u8{
        const IS_SIGNER = 1 << 0;
        const IS_WRITABLE = 1 << 1;
    }
}
