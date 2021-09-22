use solana_generator::*;

#[derive(Debug)]
pub struct TestInstruction;
impl Instruction for TestInstruction {
    type Data = ();
    type Accounts = ();
    type BuildArg = ();

    fn data_to_instruction_arg(
        _data: &mut Self::Data,
    ) -> GeneratorResult<<Self::Accounts as AccountArgument>::InstructionArg> {
        Ok(())
    }

    fn process(
        _program_id: Pubkey,
        _data: Self::Data,
        _accounts: &mut Self::Accounts,
    ) -> GeneratorResult<Option<SystemProgram>> {
        msg!("Test successful!");
        Ok(None)
    }

    fn build_instruction(
        program_id: Pubkey,
        discriminant: &[u8],
        _arg: Self::BuildArg,
    ) -> GeneratorResult<SolanaInstruction> {
        Ok(SolanaInstruction {
            program_id,
            accounts: vec![],
            data: discriminant.to_vec(),
        })
    }
}
