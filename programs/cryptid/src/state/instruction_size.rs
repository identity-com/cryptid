use crate::state::abbreviated_instruction_data::AbbreviatedInstructionData;
use anchor_lang::prelude::*;

/// A helper struct for calculating [`InstructionData`] size
#[derive(Clone, Copy, Debug, AnchorDeserialize, AnchorSerialize, PartialEq, Eq)]
pub struct InstructionSize {
    /// The number of accounts in the instruction
    pub accounts: u8,
    /// The size of the instruction data
    pub data_len: u16,
}
impl InstructionSize {
    /// Creates a size iterator from an iterator of data refs
    pub fn from_iter_to_iter<'a>(
        iter: impl Iterator<Item = &'a AbbreviatedInstructionData> + 'a,
    ) -> impl Iterator<Item = InstructionSize> + 'a {
        iter.map(|instruction| Self {
            accounts: instruction.accounts.len() as u8,
            data_len: instruction.data.len() as u16,
        })
    }
}
