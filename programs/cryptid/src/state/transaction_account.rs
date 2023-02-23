use crate::error::CryptidError;
use crate::state::abbreviated_instruction_data::AbbreviatedInstructionData;
use crate::state::instruction_size::InstructionSize;
use crate::state::transaction_state::TransactionState;
use anchor_lang::prelude::*;
use std::fmt;

pub const DISCRIMINATOR_SIZE: usize = 8;

/// A proposed transaction stored on-chain, in preparation to be executed
#[account]
pub struct TransactionAccount {
    /// The cryptid account for the transaction
    pub cryptid_account: Pubkey,
    /// The owner of the cryptid account (Typically a DID account)
    pub did: Pubkey,
    /// The accounts `instructions` references (excluding the cryptid account)
    pub accounts: Vec<Pubkey>,
    /// The instructions that will be executed
    pub instructions: Vec<AbbreviatedInstructionData>,
    /// The most recent middleware PDA that approved the transaction
    pub approved_middleware: Option<Pubkey>,
    /// The transaction state, to prevent replay attacks
    /// in case an executed transaction account is not immediately
    /// garbage-collected by the runtime
    pub state: TransactionState,
    /// If the transaction account is proposed by an authority on the DID, (the standard case)
    /// then this is set to None.
    /// If the transaction account is proposed by an unauthorized cryptid client, then
    /// it is set to to that signer, and only a `superUser` middleware can approve it.
    pub unauthorized_signer: Option<Pubkey>,
    /// This vector contains a list of middleware program ids that are allowed to
    /// approve the execution. Important, is not used for passing transactions execution
    /// checks. (approved_middleware: Option<Pubkey>) is used for that.
    pub whitelisted_middleware_programs: Vec<Pubkey>,
    pub authorized: bool,
}
impl TransactionAccount {
    /// Calculates the on-chain size of a [`TransactionAccount`]
    pub fn calculate_size(
        num_accounts: usize,
        instruction_sizes: impl Iterator<Item = InstructionSize>,
        num_whitelisted_middleware_programs: usize,
    ) -> usize {
        DISCRIMINATOR_SIZE
            + 32 // cryptid_account
            + 32 // did (owner)
            + 4 + 32 * (num_accounts + 4) //accounts (+4 for the named accounts)
            + 4 + instruction_sizes.into_iter().map(AbbreviatedInstructionData::calculate_size).sum::<usize>() //transaction_instructions
            + 1 + 32 // approved_middleware
            + 1 // state
            + 1 + 32 // unauthorized signer
            + 4 + 32 * num_whitelisted_middleware_programs // whitelisted_middleware_programs
            + 1 // authorized
    }

    pub fn check_account(&self, index: u8, account: &Pubkey) -> Result<()> {
        require_keys_eq!(
            self.accounts[index as usize],
            *account,
            CryptidError::AccountMismatch
        );
        Ok(())
    }
}
impl fmt::Display for TransactionAccount {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        writeln!(f, "Accounts:")?;
        for (index, account) in self.accounts.iter().enumerate() {
            writeln!(f, "{index}: {account}")?;
        }
        for (index, instruction) in self.instructions.iter().enumerate() {
            writeln!(f, "Instruction {index}:",)?;
            writeln!(f, "{instruction}",)?;
        }
        Ok(())
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use crate::state::abbreviated_account_meta::AbbreviatedAccountMeta;
    use crate::state::abbreviated_instruction_data::AbbreviatedInstructionData;
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
            1,
        );
        println!("Size: {size}");

        let account = TransactionAccount {
            cryptid_account: Default::default(),
            did: Default::default(),
            accounts: vec![Default::default()],
            instructions: vec![AbbreviatedInstructionData {
                program_id: 0,
                accounts: vec![AbbreviatedAccountMeta { key: 0, meta: 0 }],
                data: vec![0],
            }],
            approved_middleware: None,
            state: TransactionState::Ready,
            unauthorized_signer: None,
            whitelisted_middleware_programs: vec![Default::default()],
            authorized: true,
        };
        let ser_size = BorshSerialize::try_to_vec(&account).unwrap().len();
        println!("SerSize: {ser_size}");
        assert_eq!(size, ser_size);
    }
}
