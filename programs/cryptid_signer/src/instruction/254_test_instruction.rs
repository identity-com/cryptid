use solana_generator::*;

/// A test instruction that logs a success message
#[derive(Debug)]
pub struct TestInstruction;
impl Instruction for TestInstruction {
    type Data = Vec<u8>;
    type FromAccountsData = ();
    type Accounts = ();
    type BuildArg = ();

    fn data_to_instruction_arg(_data: &mut Self::Data) -> GeneratorResult<Self::FromAccountsData> {
        Ok(())
    }

    fn process(
        _program_id: Pubkey,
        data: Self::Data,
        _accounts: &mut Self::Accounts,
    ) -> GeneratorResult<Option<SystemProgram>> {
        msg!("Test successful!");
        msg!("data: {:?}", data);
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
