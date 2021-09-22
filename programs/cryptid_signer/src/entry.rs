use crate::instruction::Instruction;
use crate::processor::process_instruction;
use solana_generator::{
  entrypoint, AccountArgument, AccountInfo, GeneratorResult, Pubkey, Take, msg
};

entrypoint!(entry);
use crate::instruction::CryptidInstruction;
use solana_generator::*;

entrypoint!(CryptidInstruction::process_instruction);
