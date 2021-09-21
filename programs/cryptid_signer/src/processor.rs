use crate::instruction::*;
use borsh::BorshDeserialize;
use solana_generator::*;

pub fn process_instruction(
    program_id: Pubkey,
    mut instruction: CryptidInstruction,
    data: &mut &[u8],
    infos: &mut impl Iterator<Item = AccountInfo>,
) -> GeneratorResult<()> {
    let system_program = match &mut instruction {
        CryptidInstruction::Test => {
            msg!("Test successful!");
            None
        }
        CryptidInstruction::CreateDOA => {
            let mut instruction_data = BorshDeserialize::deserialize(data)?;
            let instruction_arg = CreateDOA::data_to_instruction_arg(&mut instruction_data)?;
            let mut accounts =
                AccountArgument::from_account_infos(program_id, infos, data, instruction_arg)?;
            let out = CreateDOA::process(program_id, instruction_data, &mut accounts)?;
            AccountArgument::write_back(accounts, program_id, out.as_ref())?;
            out
        }
        CryptidInstruction::ProposeTransaction(data, accounts) => {
            process_propose_transaction(program_id, data, accounts)?;
            Some(accounts.system_program.clone())
        }
        CryptidInstruction::DirectExecuteTransaction(data, accounts) => {
            process_direct_execute_transaction(program_id, data, accounts)?;
            None
        }
    };
    instruction.write_back(program_id, system_program.as_ref())
}
