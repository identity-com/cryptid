use crate::instruction::Instruction;
use crate::processor::process_instruction;
use solana_generator::{
  entrypoint, AccountArgument, AccountInfo, GeneratorResult, Pubkey, Take, msg
};

entrypoint!(entry);

fn entry(
    program_id: Pubkey,
    account_infos: Vec<AccountInfo>,
    mut data: &[u8],
) -> GeneratorResult<()> {
    let data = &mut data;
    let instruction_discriminant = *data.take_single()?;

  // msg!("instruction_discriminant {}", instruction_discriminant);
  // msg!("data {:?}", data);
  // msg!("accounts: {:?}", account_infos);

    let instruction = Instruction::from_account_infos(
        program_id,
        &mut account_infos.into_iter(),
        data,
        instruction_discriminant,
    )?;

    process_instruction(program_id, instruction)
}
