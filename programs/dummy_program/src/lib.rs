use solana_generator::solana_program::system_instruction::{allocate, assign};
use solana_generator::*;
use std::array::IntoIter;

#[cfg(not(feature = "no-entrypoint"))]
entrypoint_list!(DummyInstruction);

#[derive(Debug, Copy, Clone, InstructionList)]
pub enum DummyInstruction {
    #[instruction_list(instruction = RequireSigner, discriminant = 0)]
    RequireSigner,
    #[instruction_list(instruction = ReturnVal, discriminant = 1)]
    ReturnVal,
    #[instruction_list(instruction = AssertAccountData, discriminant = 2)]
    AssertAccountData,
}

#[derive(Debug)]
pub struct RequireSigner;
impl Instruction for RequireSigner {
    type Data = ();
    type FromAccountsData = ();
    type Accounts = RequireSignerAccounts;
    type BuildArg = Pubkey;

    fn data_to_instruction_arg(_data: &mut Self::Data) -> GeneratorResult<Self::FromAccountsData> {
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
    type Data = Vec<u8>;
    type FromAccountsData = ();
    type Accounts = ReturnValAccounts;
    type BuildArg = (Pubkey, Vec<u8>);

    fn data_to_instruction_arg(_data: &mut Self::Data) -> GeneratorResult<Self::FromAccountsData> {
        Ok(())
    }

    fn process(
        program_id: Pubkey,
        data: Self::Data,
        accounts: &mut Self::Accounts,
    ) -> GeneratorResult<Option<SystemProgram>> {
        msg!("Allocating {} bytes", data.len() as u64);
        invoke(
            &allocate(&accounts.return_account.key, data.len() as u64),
            &[&accounts.system_program.info, &accounts.return_account],
        )?;
        msg!("Assigning to {}", program_id);
        invoke(
            &assign(&accounts.return_account.key, &program_id),
            &[&accounts.system_program.info, &accounts.return_account],
        )?;
        msg!("Setting data");
        accounts
            .return_account
            .data
            .borrow_mut()
            .copy_from_slice(&data);
        Ok(None)
    }

    fn build_instruction(
        program_id: Pubkey,
        discriminant: &[u8],
        arg: Self::BuildArg,
    ) -> GeneratorResult<SolanaInstruction> {
        Ok(SolanaInstruction {
            program_id,
            accounts: vec![
                SolanaAccountMeta::new(arg.0, true),
                SolanaAccountMeta::new_readonly(system_program_id(), false),
            ],
            data: discriminant
                .iter()
                .cloned()
                .chain(IntoIter::new((arg.1.len() as u32).to_le_bytes()))
                .chain(arg.1.into_iter())
                .collect(),
        })
    }
}
#[derive(Debug, AccountArgument)]
pub struct ReturnValAccounts {
    #[account_argument(signer, writable, owner = system_program_id())]
    return_account: AccountInfo,
    system_program: SystemProgram,
}

pub struct AssertAccountData;
impl Instruction for AssertAccountData {
    type Data = Vec<u8>;
    type FromAccountsData = ();
    type Accounts = AccountInfo;
    type BuildArg = (Pubkey, Vec<u8>);

    fn data_to_instruction_arg(_data: &mut Self::Data) -> GeneratorResult<Self::FromAccountsData> {
        Ok(())
    }

    fn process(
        _program_id: Pubkey,
        data: Self::Data,
        account: &mut Self::Accounts,
    ) -> GeneratorResult<Option<SystemProgram>> {
        match account.data.borrow().eq(&data) {
            true => Ok(None),
            false => Err(DummyError::AccountDataNotEqual {
                account: account.key,
                account_data: account.data.borrow().to_vec(),
                match_data: data,
            }
            .into()),
        }
    }

    fn build_instruction(
        program_id: Pubkey,
        discriminant: &[u8],
        arg: Self::BuildArg,
    ) -> GeneratorResult<SolanaInstruction> {
        Ok(SolanaInstruction {
            program_id,
            accounts: vec![SolanaAccountMeta::new_readonly(arg.0, false)],
            data: discriminant
                .iter()
                .cloned()
                .chain(IntoIter::new((arg.1.len() as u32).to_le_bytes()))
                .chain(arg.1.into_iter())
                .collect(),
        })
    }
}

#[derive(Debug, Error)]
pub enum DummyError {
    #[error_msg(
        "Account (`{}`) data mismatch\naccount data:  `{:?}`\nmismatch_data: `{:?}`",
        account,
        account_data,
        match_data
    )]
    AccountDataNotEqual {
        account: Pubkey,
        account_data: Vec<u8>,
        match_data: Vec<u8>,
    },
}
