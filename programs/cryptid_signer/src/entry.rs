use crate::instruction::Instruction;
use crate::processor::process_instruction;
use solana_generator::{
    entrypoint, msg, AccountArgument, AccountInfo, GeneratorResult, Pubkey, Take,
};

entrypoint!(entry);

fn entry(
    program_id: Pubkey,
    account_infos: Vec<AccountInfo>,
    mut data: &[u8],
) -> GeneratorResult<()> {
    let data = &mut data;
    let instruction_discriminant = *data.take_single()?;

    let instruction = Instruction::from_account_infos(
        program_id,
        &mut account_infos.into_iter(),
        data,
        instruction_discriminant,
    )?;

    msg!("Instruction: {:?}", instruction);

    process_instruction(program_id, instruction)
}
