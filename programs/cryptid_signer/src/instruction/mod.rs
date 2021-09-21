#[path = "./000_create_doa.rs"]
mod create_doa;
#[path = "./005_direct_execute_transaction.rs"]
mod direct_execute_transaction;
#[path = "./001_propose_transaction.rs"]
mod propose_transaction;

pub use create_doa::*;
pub use direct_execute_transaction::*;
pub use propose_transaction::*;

use borsh::BorshDeserialize;
use solana_generator::*;

#[allow(clippy::large_enum_variant)]
#[derive(Debug, Copy, Clone)]
pub enum CryptidInstruction {
    Test,
    CreateDOA, // TODO: Somehow make these not tuples, kind of awkward
    ProposeTransaction,
    DirectExecute,
}
impl InstructionList for CryptidInstruction {
    type BuildEnum = BuildCryptidInstruction;

    fn process_instruction(
        program_id: Pubkey,
        accounts: &mut impl Iterator<Item = AccountInfo>,
        mut data: &[u8],
    ) -> GeneratorResult<()> {
        let data = &mut data;
        match *data.take_single()? {
            0 => {
                let mut instruction_data = BorshDeserialize::deserialize(data)?;
                let instruction_arg = CreateDOA::data_to_instruction_arg(&mut instruction_data)?;
                let mut accounts = AccountArgument::from_account_infos(
                    program_id,
                    accounts,
                    data,
                    instruction_arg,
                )?;
                let system_program =
                    CreateDOA::process(program_id, instruction_data, &mut accounts)?;
                AccountArgument::write_back(accounts, program_id, system_program.as_ref())
            }
            1 => {
                let mut instruction_data = BorshDeserialize::deserialize(data)?;
                let instruction_arg =
                    ProposeTransaction::data_to_instruction_arg(&mut instruction_data)?;
                let mut accounts = AccountArgument::from_account_infos(
                    program_id,
                    accounts,
                    data,
                    instruction_arg,
                )?;
                let system_program =
                    ProposeTransaction::process(program_id, instruction_data, &mut accounts)?;
                AccountArgument::write_back(accounts, program_id, system_program.as_ref())
            }
            5 => {
                let mut instruction_data = BorshDeserialize::deserialize(data)?;
                let instruction_arg =
                    DirectExecute::data_to_instruction_arg(&mut instruction_data)?;
                let mut accounts = AccountArgument::from_account_infos(
                    program_id,
                    accounts,
                    data,
                    instruction_arg,
                )?;
                let system_program =
                    DirectExecute::process(program_id, instruction_data, &mut accounts)?;
                AccountArgument::write_back(accounts, program_id, system_program.as_ref())
            }
            254 => {
                msg!("Test successful!");
                Ok(())
            }
            x => Err(GeneratorError::UnknownInstruction {
                instruction: x.to_string(),
            }
            .into()),
        }
    }

    fn build_instruction(
        program_id: Pubkey,
        build_enum: Self::BuildEnum,
    ) -> GeneratorResult<SolanaInstruction> {
        match build_enum {
            BuildCryptidInstruction::CreateDOA(build) => {
                CreateDOA::build_instruction(program_id, &[0], build)
            }
            BuildCryptidInstruction::ProposeTransaction(build) => {
                ProposeTransaction::build_instruction(program_id, &[1], build)
            }
            BuildCryptidInstruction::DirectExecute(build) => {
                DirectExecute::build_instruction(program_id, &[5], build)
            }
        }
    }
}
#[derive(Debug)]
pub enum BuildCryptidInstruction {
    CreateDOA(<CreateDOA as Instruction>::BuildArg),
    ProposeTransaction(<ProposeTransaction as Instruction>::BuildArg),
    DirectExecute(<DirectExecute as Instruction>::BuildArg),
}
