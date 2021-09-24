use crate::state::DOAAccount;
use solana_generator::solana_program::program_error::ProgramError;
use solana_generator::*;
use std::iter::once;

pub const DOA_NONCE_STR: &str = "cryptid_doa";
pub const DOA_NONCE: &[u8] = DOA_NONCE_STR.as_bytes();

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
        nonce: Option<u8>,
    ) -> GeneratorResult<()> {
        match nonce {
            None => {
                let (key, _) = Pubkey::find_program_address(
                    &[did_program.as_ref(), did.as_ref(), DOA_NONCE],
                    &program_id,
                );
                if account != key {
                    return Err(GeneratorError::AccountNotFromSeeds {
                        account,
                        seeds: format!("{:?} no nonce", (did_program, did, DOA_NONCE_STR)),
                        program_id,
                    }
                    .into());
                }
                Ok(())
            }
            Some(nonce) => {
                let created_key = Pubkey::create_program_address(
                    &[did_program.as_ref(), did.as_ref(), DOA_NONCE, &[nonce]],
                    &program_id,
                );
                if created_key.is_err() || account != created_key? {
                    return Err(GeneratorError::AccountNotFromSeeds {
                        account,
                        seeds: format!("{:?}", (did_program, did, DOA_NONCE_STR, nonce)),
                        program_id,
                    }
                    .into());
                }
                Ok(())
            }
        }
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
