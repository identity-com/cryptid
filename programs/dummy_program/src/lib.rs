use solana_generator::solana_program::system_instruction::{allocate, assign};
use solana_generator::*;
use std::iter::once;

#[derive(Debug, Copy, Clone, InstructionList)]
pub enum DummyInstruction {
    #[instruction_list(instruction = RequireSigner, discriminant = 0)]
    RequireSigner,
    #[instruction_list(instruction = ReturnVal, discriminant = 1)]
    ReturnVal,
}

#[derive(Debug)]
pub struct RequireSigner;
impl Instruction for RequireSigner {
    type Data = ();
    type Accounts = RequireSignerAccounts;
    type BuildArg = Pubkey;

    fn data_to_instruction_arg(
        _data: &mut Self::Data,
    ) -> GeneratorResult<<Self::Accounts as AccountArgument>::InstructionArg> {
        Ok(())
    }

    fn process(
        _program_id: Pubkey,
        _data: Self::Data,
        accounts: &mut Self::Accounts,
    ) -> GeneratorResult<Option<SystemProgram>> {
        msg!("Require signer worked! Signer: {}", accounts.signer.key);
        Ok(None)
    }

    fn build_instruction(
        program_id: Pubkey,
        discriminant: &[u8],
        arg: Self::BuildArg,
    ) -> GeneratorResult<SolanaInstruction> {
        Ok(SolanaInstruction {
            program_id,
            accounts: vec![SolanaAccountMeta::new_readonly(arg, true)],
            data: discriminant.to_vec(),
        })
    }
}
#[derive(Debug, AccountArgument)]
pub struct RequireSignerAccounts {
    #[account_argument(signer)]
    pub signer: AccountInfo,
}

#[derive(Debug)]
pub struct ReturnVal;
impl Instruction for ReturnVal {
    type Data = u8;
    type Accounts = ReturnValAccounts;
    type BuildArg = (Pubkey, u8);

    fn data_to_instruction_arg(
        _data: &mut Self::Data,
    ) -> GeneratorResult<<Self::Accounts as AccountArgument>::InstructionArg> {
        Ok(())
    }

    fn process(
        program_id: Pubkey,
        data: Self::Data,
        accounts: &mut Self::Accounts,
    ) -> GeneratorResult<Option<SystemProgram>> {
        invoke(
            &allocate(&accounts.return_account.key, 1),
            &[&accounts.system_program.info, &accounts.return_account],
        )?;
        invoke(
            &assign(&accounts.return_account.key, &program_id),
            &[&accounts.system_program.info, &accounts.return_account],
        )?;
        accounts.return_account.data.borrow_mut()[0] = data;
        Ok(None)
    }

    fn build_instruction(
        program_id: Pubkey,
        discriminant: &[u8],
        arg: Self::BuildArg,
    ) -> GeneratorResult<SolanaInstruction> {
        Ok(SolanaInstruction {
            program_id,
            accounts: vec![SolanaAccountMeta::new(arg.0, true)],
            data: discriminant.iter().cloned().chain(once(arg.1)).collect(),
        })
    }
}
#[derive(Debug, AccountArgument)]
pub struct ReturnValAccounts {
    #[account_argument(signer, writable, owner = system_program_id())]
    return_account: AccountInfo,
    system_program: SystemProgram,
}
