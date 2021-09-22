use crate::{AccountArgument, GeneratorResult, Pubkey, SolanaInstruction, SystemProgram};
use borsh::{BorshDeserialize, BorshSchema, BorshSerialize};

/// An instruction for a program with it's accounts and data.
pub trait Instruction: Sized {
    /// The data type minus the discriminant.
    type Data: BorshSerialize + BorshDeserialize + BorshSchema;
    /// The list of accounts for this instruction.
    type Accounts: AccountArgument;
    /// The argument for creating this instruction.
    type BuildArg;

    /// Turns the [`Self::Data`] into the instruction arg for [`Self::Accounts`].
    fn data_to_instruction_arg(
        data: &mut Self::Data,
    ) -> GeneratorResult<<Self::Accounts as AccountArgument>::InstructionArg>;
    /// Processes the instruction, writing back after this instruction.
    fn process(
        program_id: Pubkey,
        data: Self::Data,
        accounts: &mut Self::Accounts,
    ) -> GeneratorResult<Option<SystemProgram>>;

    /// Creates this instruction from a given discriminant and argument
    fn build_instruction(
        program_id: Pubkey,
        discriminant: &[u8],
        arg: Self::BuildArg,
    ) -> GeneratorResult<SolanaInstruction>;
}
