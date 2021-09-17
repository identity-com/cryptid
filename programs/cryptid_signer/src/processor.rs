use crate::instruction::Instruction;
use solana_generator::{msg, GeneratorResult};

pub fn process_instruction(instruction: Instruction) -> GeneratorResult<()> {
    match instruction {
        Instruction::Test => {
            msg!("Test successful!");
            Ok(())
        }
    }
}
