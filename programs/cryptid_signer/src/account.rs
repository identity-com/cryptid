//! The account address types for cryptid

use std::iter::once;

use crate::error::CryptidSignerError;
use solana_generator::solana_program::program_error::ProgramError;
use solana_generator::*;

use crate::state::CryptidAccount;
use crate::{CryptidSignerSeeder, GenerativeCryptidSeeder};

/// A cryptid account address, supporting generative (derived from inputs) or on-chain (data stored on-chain)
#[derive(Debug)]
pub enum CryptidAccountAddress {
    /// Cryptid Account Data is stored on-chain
    OnChain(ProgramAccount<CryptidAccount>),
    /// Cryptid Account is not on-chain, deriving fields
    Generative(AccountInfo),
}
impl CryptidAccountAddress {
    /// The [`AccountInfo`] of the Cryptid Account
    pub fn info(&self) -> &AccountInfo {
        match self {
            CryptidAccountAddress::OnChain(account) => &account.info,
            CryptidAccountAddress::Generative(account) => account,
        }
    }

    /// Verifies that the account came from the proper seeds returning the nonce
    pub fn verify_seeds(
        account: Pubkey,
        program_id: Pubkey,
        did_program: Pubkey,
        did: Pubkey,
    ) -> GeneratorResult<u8> {
        GenerativeCryptidSeeder { did_program, did }.verify_address_find_nonce(program_id, account)
    }

    /// Verifies that the cryptid account has the given did and did_program
    pub fn verify_cryptid_account(
        &self,
        program_id: &Pubkey,
        did_program: &Pubkey,
        did: &Pubkey,
    ) -> GeneratorResult<()> {
        match self {
            Self::OnChain(account) => {
                if &account.did_program != did_program {
                    Err(CryptidSignerError::WrongDIDProgram {
                        expected: *did_program,
                        received: account.did_program,
                    }
                    .into())
                } else if &account.did != did {
                    Err(CryptidSignerError::WrongDID {
                        expected: *did,
                        received: account.did,
                    }
                    .into())
                } else {
                    Ok(())
                }
            }
            Self::Generative(info) => {
                Self::verify_seeds(info.key, *program_id, *did_program, *did)?;
                Ok(())
            }
        }
    }

    /// Gets the seed set for the cryptid signer
    pub fn get_signer(&self, program_id: &Pubkey) -> PDASeedSet<'_> {
        match self {
            CryptidAccountAddress::OnChain(account) => PDASeedSet::new(
                CryptidSignerSeeder {
                    cryptid_account: account.info.key,
                },
                account.signer_nonce,
            ),
            CryptidAccountAddress::Generative(account) => {
                let seeder = CryptidSignerSeeder {
                    cryptid_account: account.key,
                };
                let nonce = seeder.find_address(*program_id).1;
                PDASeedSet::new(seeder, nonce)
            }
        }
    }
}
impl AccountArgument for CryptidAccountAddress {
    fn write_back(
        self,
        program_id: Pubkey,
        system_program: Option<&SystemProgram>,
    ) -> GeneratorResult<()> {
        match self {
            CryptidAccountAddress::OnChain(account) => {
                account.write_back(program_id, system_program)
            }
            CryptidAccountAddress::Generative(account) => {
                account.write_back(program_id, system_program)
            }
        }
    }

    fn add_keys(&self, add: impl FnMut(Pubkey) -> GeneratorResult<()>) -> GeneratorResult<()> {
        match self {
            CryptidAccountAddress::OnChain(account) => account.add_keys(add),
            CryptidAccountAddress::Generative(account) => account.add_keys(add),
        }
    }
}
impl FromAccounts<()> for CryptidAccountAddress {
    fn from_accounts(
        program_id: Pubkey,
        infos: &mut impl AccountInfoIterator,
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
