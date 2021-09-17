use solana_generator::{
    AccountArgument, AccountInfo, GeneratorError, GeneratorResult, Pubkey, SystemProgram,
};

#[derive(Debug)]
pub enum Instruction {
    Test,
}
impl AccountArgument for Instruction {
    type InstructionArg = u8;

    fn from_account_infos(
        _program_id: Pubkey,
        _infos: &mut impl Iterator<Item = AccountInfo>,
        arg: Self::InstructionArg,
    ) -> GeneratorResult<Self> {
        match arg {
            254 => Ok(Self::Test),
            _ => Err(GeneratorError::UnknownInstruction {
                instruction: arg.to_string(),
            }
            .into()),
        }
    }

    fn write_back(
        self,
        _program_id: Pubkey,
        _system_program: Option<&SystemProgram>,
    ) -> GeneratorResult<()> {
        match self {
            Instruction::Test => Ok(()),
        }
    }

    fn add_keys(&self, _add: impl FnMut(Pubkey) -> GeneratorResult<()>) -> GeneratorResult<()> {
        Ok(())
    }
}
