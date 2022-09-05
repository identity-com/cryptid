use crate::error::CryptidError;
use crate::state::abbreviated_instruction_data::AbbreviatedInstructionData;
use crate::state::instruction_size::InstructionSize;
use anchor_lang::prelude::*;

pub const DISCRIMINATOR_SIZE: usize = 8;

/// A proposed transaction stored on-chain, in preparation to be executed
#[account]
pub struct TransactionAccount {
    /// The cryptid account for the transaction
    pub cryptid_account: Pubkey,
    /// The accounts `instructions` references (excluding the cryptid account
    pub accounts: Vec<Pubkey>,
    /// The instructions that will be executed
    pub instructions: Vec<AbbreviatedInstructionData>,
    /// The most recent middleware PDA that approved the transaction
    pub approved_middleware: Option<Pubkey>,
    /// The slot in which the transaction was proposed
    /// This is used to prevent replay attacks TODO: Do we need it?
    pub slot: u8,
}
impl TransactionAccount {
    /// Calculates the on-chain size of a [`TransactionAccount`]
    pub fn calculate_size(
        num_accounts: usize,
        instruction_sizes: impl Iterator<Item = InstructionSize>,
    ) -> usize {
        DISCRIMINATOR_SIZE
            + 32 //cryptid_account
            + 4 + 32 * num_accounts //accounts
            + 4 + instruction_sizes.into_iter().map(AbbreviatedInstructionData::calculate_size).sum::<usize>() //transaction_instructions
            + 1 + 32 // approved_middleware
            + 1 // slot
    }

    /// Gets an instruction or errors if no instruction at index
    pub fn get_instruction_mut(&mut self, index: u8) -> Result<&mut AbbreviatedInstructionData> {
        require_gte!(
            index as usize,
            self.instructions.len(),
            CryptidError::IndexOutOfRange
        );
        Ok(&mut self.instructions[index as usize])
    }

    /// Checks if a given index is valid for the instructions list
    pub fn check_instruction_index(&self, index: u8) -> Result<()> {
        require_gte!(
            index as usize,
            self.instructions.len(),
            CryptidError::IndexOutOfRange
        );
        Ok(())
    }

    /// Checks of a given index is valid for the accounts list
    pub fn check_account_index(&self, index: u8) -> Result<()> {
        require_gte!(
            index as usize,
            self.accounts.len(),
            CryptidError::IndexOutOfRange
        );
        Ok(())
    }

    /// When an account index as defined in AbbreviatedInstructionData
    /// is used to reference an entry in transactionAccount.accounts, it should
    /// not include the implicit accounts that are passed to the ExecuteTransaction instruction
    pub fn normalize_transaction_account_index(index: u8) -> usize {
        // Implicit Execute Transaction Accounts:
        // 0 - cryptid account
        // 1 - did
        // 2 - did program
        // 3 - signer
        // ... remaining accounts
        (index - 4) as usize
    }

    pub fn check_account(&self, index: u8, account: &Pubkey) -> Result<()> {
        let normalized_index = Self::normalize_transaction_account_index(index);
        require_keys_eq!(
            self.accounts[normalized_index],
            *account,
            CryptidError::AccountMismatch
        );
        Ok(())
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use crate::state::abbreviated_instruction_data::AbbreviatedInstructionData;
    use crate::state::account_meta_props::AccountMetaProps;
    use crate::state::cryptid_account_meta::AccountMetaProps;
    use anchor_lang::prelude::borsh::BorshSerialize;
    use std::iter::once;

    #[test]
    fn calculate_size() {
        let size = TransactionAccount::calculate_size(
            1,
            once(InstructionSize {
                accounts: 1,
                data_len: 1,
            }),
        );
        println!("Size: {}", size);

        let account = TransactionAccount {
            cryptid_account: Default::default(),
            accounts: vec![Default::default()],
            instructions: vec![AbbreviatedInstructionData {
                program_id: 0,
                accounts: vec![TransactionAccountMeta {
                    key: 0,
                    meta: AccountMetaProps::empty(),
                }],
                data: vec![0],
            }],
            approved_middleware: None,
            slot: 0,
        };
        let ser_size = BorshSerialize::try_to_vec(&account).unwrap().len()
            + TransactionAccount::DISCRIMINANT
                .discriminant_serialized_length()
                .unwrap();
        println!("SerSize: {}", ser_size);
        assert_eq!(size, ser_size);
    }
}
