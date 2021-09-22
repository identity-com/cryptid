#[path = "./000_create_doa.rs"]
mod create_doa;
#[path = "./005_direct_execute_transaction.rs"]
mod direct_execute_transaction;
#[path = "./001_propose_transaction.rs"]
mod propose_transaction;
#[path = "./254_test_instruction.rs"]
mod test_instruction;

pub use create_doa::*;
pub use direct_execute_transaction::*;
pub use propose_transaction::*;
pub use test_instruction::*;

use solana_generator::*;

#[allow(clippy::large_enum_variant)]
#[derive(Debug, Copy, Clone, InstructionList)]
pub enum CryptidInstruction {
    #[instruction_list(instruction = TestInstruction, discriminant = 254)]
    Test,
    #[instruction_list(instruction = CreateDOA, discriminant = 0)]
    CreateDOA,
    #[instruction_list(instruction = ProposeTransaction, discriminant = 1)]
    ProposeTransaction,
    #[instruction_list(instruction = DirectExecute, discriminant = 5)]
    DirectExecute,
}
