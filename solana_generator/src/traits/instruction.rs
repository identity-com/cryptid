use crate::{FromAccounts, GeneratorResult, Pubkey, SolanaAccountMeta, SystemProgram};
use borsh::{BorshDeserialize, BorshSchema, BorshSerialize};

/// An instruction for a program with it's accounts and data.
pub trait Instruction: Sized {
    /// The data type minus the discriminant.
    type Data: BorshSerialize + BorshDeserialize + BorshSchema;
    /// The type used for passing data to accounts.
    type FromAccountsData;
    /// The list of accounts for this instruction.
    type Accounts: FromAccounts<Self::FromAccountsData>;
    /// The argument for creating this instruction.
    type BuildArg;

    /// Turns the [`Self::Data`] into the instruction arg for [`Self::Accounts`].
    fn data_to_instruction_arg(data: &mut Self::Data) -> GeneratorResult<Self::FromAccountsData>;
    /// Processes the instruction, writing back after this instruction.
    fn process(
        program_id: Pubkey,
        data: Self::Data,
        accounts: &mut Self::Accounts,
    ) -> GeneratorResult<Option<SystemProgram>>;

    /// Creates this instruction from a given argument
    fn build_instruction(
        program_id: Pubkey,
        arg: Self::BuildArg,
    ) -> GeneratorResult<(Vec<SolanaAccountMeta>, Self::Data)>;
}
