use cruiser::instruction::{Instruction, InstructionProcessor};
use cruiser::{msg, CruiserResult, Pubkey};

/// A test instruction that logs a success message
#[derive(Debug)]
pub struct TestInstruction;
impl Instruction for TestInstruction {
    type Data = Vec<u8>;
    type Accounts = ();
}
impl InstructionProcessor<TestInstruction> for TestInstruction {
    type FromAccountsData = ();
    type ValidateData = ();
    type InstructionData = Vec<u8>;

    fn data_to_instruction_arg(
        data: <Self as Instruction>::Data,
    ) -> CruiserResult<(
        Self::FromAccountsData,
        Self::ValidateData,
        Self::InstructionData,
    )> {
        Ok(((), (), data))
    }

    fn process(
        _program_id: &'static Pubkey,
        data: Self::InstructionData,
        _accounts: &mut <Self as Instruction>::Accounts,
    ) -> CruiserResult<()> {
        msg!("Test successful!");
        msg!("data: {:?}", data);
        Ok(())
    }
}
