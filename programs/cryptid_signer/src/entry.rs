use crate::instruction::CryptidInstruction;
use crate::processor::process_instruction;
use solana_generator::*;

entrypoint!(entry);

fn entry(
    program_id: Pubkey,
    account_infos: Vec<AccountInfo>,
    mut data: &[u8],
) -> GeneratorResult<()> {
    let data = &mut data;
    let instruction_discriminant = *data.take_single()?;
    msg!("instruction_discriminant = {}", instruction_discriminant);

    let mut iter = account_infos.into_iter();
    let instruction = CryptidInstruction::from_account_infos(
        program_id,
        &mut iter,
        data,
        instruction_discriminant,
    )?;

    process_instruction(program_id, instruction, data, &mut iter)
}
