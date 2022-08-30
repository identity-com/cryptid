use std::collections::HashMap;
use anchor_lang::prelude::*;
use anchor_lang::solana_program::instruction::Instruction;
use crate::state::instruction_size::InstructionSize;
use crate::state::transaction_account_meta::TransactionAccountMeta;

/// The data about an instruction to be executed. Similar to Solana's [`Instruction`](SolanaInstruction).
#[derive(Clone, AnchorDeserialize, AnchorSerialize)]
pub struct InstructionData {
    /// The program to execute
    pub program_id: u8,
    /// The accounts to send to the program
    pub accounts: Vec<TransactionAccountMeta>,
    /// The data for the instruction
    pub data: Vec<u8>,
}
impl InstructionData {
    /// Calculates the on-chain size of a [`InstructionData`]
    pub const fn calculate_size(size: InstructionSize) -> usize {
        1 //program_id
            + 4 + TransactionAccountMeta::calculate_size() * size.accounts as usize //accounts
            + 4 + size.data_len as usize //data
    }

    /// Creates an [`InstructionData`] from a given [`SolanaInstruction`]
    pub fn from_instruction(
        instruction: Instruction,
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
    pub fn into_instruction(self, accounts: &[Pubkey]) -> Instruction {
        Instruction {
            program_id: accounts[self.program_id as usize],
            accounts: self
                .accounts
                .into_iter()
                .map(|meta| meta.into_solana_account_meta(accounts))
                .collect(),
            data: self.data,
        }
    }

    pub fn select_account_infos<'a>(self, account_infos: &'a [AccountInfo<'a>]) -> Vec<AccountInfo<'a>> {
        self.accounts
            .into_iter()
            .map(|meta| {
                account_infos[meta.key as usize].clone()
            })
            .collect()
    }
}
