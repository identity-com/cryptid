use crate::{AccountInfo, GeneratorResult, Pubkey, SolanaInstruction};

pub trait InstructionList: Copy {
    type BuildEnum;

    fn process_instruction(
        program_id: Pubkey,
        accounts: &mut impl Iterator<Item = AccountInfo>,
        data: &[u8],
    ) -> GeneratorResult<()>;
    fn build_instruction(
        program_id: Pubkey,
        build_enum: Self::BuildEnum,
    ) -> GeneratorResult<SolanaInstruction>;
}
