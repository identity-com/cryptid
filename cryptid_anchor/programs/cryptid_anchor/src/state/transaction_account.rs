use std::collections::HashMap;
use anchor_lang::prelude::*;
use anchor_lang::solana_program::clock::UnixTimestamp;
use anchor_lang::solana_program::instruction::Instruction;
use anchor_lang::solana_program::msg;
use crate::error::CryptidSignerError;
use crate::state::account_meta_props::AccountMetaProps;
use crate::state::instruction_data::InstructionData;
use crate::state::instruction_size::InstructionSize;
use crate::state::transaction_account_meta::TransactionAccountMeta;
use crate::state::transaction_state::TransactionState;
use crate::util::DISCRIMINATOR_SIZE;

/// The data to store about a proposed transaction
#[account]
pub struct TransactionAccount {
    /// The cryptid account for the transaction
    pub cryptid_account: Pubkey,
    /// The accounts `transaction_instructions` references
    pub accounts: Vec<Pubkey>,
    /// The instructions that will be executed
    pub transaction_instructions: Vec<InstructionData>,
    /// The signers of the transaction with their expiry times
    pub signers: Vec<(Pubkey, UnixTimestamp)>, //TODO: this was changed from SigningKeyData in the original version - Check if we are safe to leave it as PublicKey
    /// The state of the transaction
    pub state: TransactionState,
    /// The value of [`CryptidAccount::settings_sequence`] when this was proposed, only valid while that's the same
    pub settings_sequence: u16,
}
impl TransactionAccount {
    /// Calculates the on-chain size of a [`TransactionAccount`]
    pub fn calculate_size(
        num_accounts: usize,
        instruction_sizes: impl Iterator<Item = InstructionSize>,
        signer_extras: impl Iterator<Item = usize>,
    ) -> usize {
        DISCRIMINATOR_SIZE
            + 32 //cryptid_account
            + 4 + 32 * num_accounts //accounts
            + 4 + instruction_sizes.into_iter().map(InstructionData::calculate_size).sum::<usize>() //transaction_instructions
            + 4 + signer_extras
            .into_iter()
            .map(32 + 8)    // pubkey + expiry time
            // .map(|size|size + 8) //Expiry time
            .sum::<usize>() //signers
            + TransactionState::calculate_size() //state
            + 2 //settings_sequence
    }

    /// Gets an instruction or errors if no instruction at index
    pub fn get_instruction_mut(&mut self, index: u8) -> Result<&mut InstructionData> {
        require_gte!(index as usize, self.transaction_instructions.len(), CryptidSignerError::IndexOutOfRange);
        Ok(&mut self.transaction_instructions[index as usize])
    }

    /// Checks if a given index is valid for the instructions list
    pub fn check_instruction_index(&self, index: u8) -> Result<()> {
        require_gte!(index as usize, self.transaction_instructions.len(), CryptidSignerError::IndexOutOfRange);
        Ok(())
    }

    /// Checks of a given index is valid for the accounts list
    pub fn check_account_index(&self, index: u8) -> Result<()> {
        require_gte!(index as usize, self.accounts.len(), CryptidSignerError::IndexOutOfRange);
        Ok(())
    }
}

#[cfg(test)]
mod test {
    use std::iter::once;
    use anchor_lang::prelude::borsh::BorshSerialize;
    use crate::state::cryptid_account_meta::AccountMetaProps;
    use crate::state::instruction_data::InstructionData;
    use super::*;

    #[test]
    fn calculate_size() {
        let size = TransactionAccount::calculate_size(
            1,
            once(InstructionSize {
                accounts: 1,
                data_len: 1,
            }),
            once(1),
        );
        println!("Size: {}", size);

        let account = TransactionAccount {
            cryptid_account: Default::default(),
            accounts: vec![Default::default()],
            transaction_instructions: vec![InstructionData {
                program_id: 0,
                accounts: vec![TransactionAccountMeta {
                    key: 0,
                    meta: AccountMetaProps::empty(),
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
        let ser_size = BorshSerialize::try_to_vec(&account).unwrap().len()
            + TransactionAccount::DISCRIMINANT
            .discriminant_serialized_length()
            .unwrap();
        println!("SerSize: {}", ser_size);
        assert_eq!(size, ser_size);
    }
}
