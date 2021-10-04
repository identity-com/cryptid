use crate::{AccountInfoIterator, GeneratorResult, Pubkey, SolanaInstruction};
pub use solana_generator_derive::InstructionList;

/// A list of possible instructions for a program.
pub trait InstructionList: Copy {
    /// The enum of instruction builders.
    type BuildEnum;

    /// Processes a given instruction. Usually delegates to [`crate::Instruction`].
    fn process_instruction(
        program_id: Pubkey,
        accounts: &mut impl AccountInfoIterator,
        data: &[u8],
    ) -> GeneratorResult<()>;
    /// Builds an instruction from [`BuildEnum`].
    fn build_instruction(
        program_id: Pubkey,
        build_enum: Self::BuildEnum,
    ) -> GeneratorResult<SolanaInstruction>;
    /// Gets the discriminant for the instruction
    fn discriminant(self) -> u8;
}
