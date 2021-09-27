use std::iter::once;

use solana_generator::solana_program::program_error::ProgramError;
use solana_generator::*;

use crate::state::DOAAccount;
use crate::GenerativeDOASeeder;

#[derive(Debug)]
pub enum DOAAddress {
    OnChain(ProgramAccount<DOAAccount>),
    Generative(AccountInfo),
}
impl DOAAddress {
    pub fn info(&self) -> &AccountInfo {
        match self {
            DOAAddress::OnChain(account) => &account.info,
            DOAAddress::Generative(account) => account,
        }
    }

    /// Returns the nonce
    pub fn verify_seeds(
        account: Pubkey,
        program_id: Pubkey,
        did_program: Pubkey,
        did: Pubkey,
    ) -> GeneratorResult<u8> {
        PDAGenerator::new(program_id, GenerativeDOASeeder { did_program, did })
            .verify_address_without_nonce(account)
    }
}
impl AccountArgument for DOAAddress {
    fn write_back(
        self,
        program_id: Pubkey,
        system_program: Option<&SystemProgram>,
    ) -> GeneratorResult<()> {
        match self {
            DOAAddress::OnChain(account) => account.write_back(program_id, system_program),
            DOAAddress::Generative(account) => account.write_back(program_id, system_program),
        }
    }

    fn add_keys(&self, add: impl FnMut(Pubkey) -> GeneratorResult<()>) -> GeneratorResult<()> {
        match self {
            DOAAddress::OnChain(account) => account.add_keys(add),
            DOAAddress::Generative(account) => account.add_keys(add),
        }
    }
}
impl FromAccounts<()> for DOAAddress {
    fn from_accounts(
        program_id: Pubkey,
        infos: &mut impl Iterator<Item = AccountInfo>,
        arg: (),
    ) -> GeneratorResult<Self> {
        let account = infos.next().ok_or(ProgramError::NotEnoughAccountKeys)?;
        let owner = **account.owner.borrow();
        if owner == program_id {
            Ok(Self::OnChain(ProgramAccount::from_accounts(
                program_id,
                &mut once(account),
                arg,
            )?))
        } else if owner == system_program_id() {
            Ok(Self::Generative(account))
        } else {
            Err(GeneratorError::AccountOwnerNotEqual {
                account: account.key,
                owner,
                expected_owner: vec![program_id, system_program_id()],
            }
            .into())
        }
    }
}
