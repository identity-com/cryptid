//! The account address types for cryptid

use cruiser::account_argument::{
    AccountArgument, AccountInfoIterator, FromAccounts, ValidateArgument,
};
use cruiser::account_types::program_account::ProgramAccount;
use cruiser::account_types::system_program::SystemProgram;
use cruiser::pda_seeds::{PDAGenerator, PDASeedSet};
use cruiser::program::Program;
use cruiser::{AccountInfo, CruiserResult, GenericError, Pubkey};
use std::iter::once;

use crate::error::CryptidSignerError;

use crate::seeds::{CryptidSignerSeeder, GenerativeCryptidSeeder};
use crate::state::{CryptidAccount, CryptidAccountList};

/// A cryptid account address, supporting generative (derived from inputs) or on-chain (data stored on-chain)
#[derive(Debug)]
pub enum CryptidAccountAddress {
    /// Cryptid Account Data is stored on-chain
    OnChain(ProgramAccount<CryptidAccountList, CryptidAccount>),
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

    /// Gets the key_threshold for the cryptid account
    pub fn key_threshold(&self) -> u8 {
        match self {
            CryptidAccountAddress::OnChain(account) => account.key_threshold,
            CryptidAccountAddress::Generative(_) => {
                CryptidAccount::GENERATIVE_CRYPTID_KEY_THRESHOLD
            }
        }
    }

    /// Gets the signer seeds fot the cryptid account
    pub fn signer_seed_set(
        &self,
        program_id: &'static Pubkey,
        signer_nonce: Option<u8>,
    ) -> (PDASeedSet, Option<Pubkey>) {
        match (self, signer_nonce) {
            (Self::OnChain(account), _) => (
                PDASeedSet::new(
                    CryptidSignerSeeder {
                        cryptid_account: account.info.key,
                    },
                    account.signer_nonce,
                ),
                None,
            ),
            (Self::Generative(info), Some(nonce)) => (
                PDASeedSet::new(
                    CryptidSignerSeeder {
                        cryptid_account: info.key,
                    },
                    nonce,
                ),
                None,
            ),
            (Self::Generative(info), None) => {
                let seeds = CryptidSignerSeeder {
                    cryptid_account: info.key,
                };
                let (key, nonce) = seeds.find_address(program_id);
                (PDASeedSet::new(seeds, nonce), Some(key))
            }
        }
    }
}
impl AccountArgument for CryptidAccountAddress {
    fn write_back(self, program_id: &'static Pubkey) -> CruiserResult<()> {
        match self {
            CryptidAccountAddress::OnChain(account) => account.write_back(program_id),
            CryptidAccountAddress::Generative(account) => account.write_back(program_id),
        }
    }

    fn add_keys(&self, add: impl FnMut(&'static Pubkey) -> CruiserResult<()>) -> CruiserResult<()> {
        match self {
            CryptidAccountAddress::OnChain(account) => account.add_keys(add),
            CryptidAccountAddress::Generative(account) => account.add_keys(add),
        }
    }
}
impl FromAccounts<()> for CryptidAccountAddress {
    fn from_accounts(
        program_id: &'static Pubkey,
        infos: &mut impl AccountInfoIterator,
        arg: (),
    ) -> CruiserResult<Self> {
        let account = AccountInfo::from_accounts(program_id, infos, arg)?;
        let owner = account.owner.borrow();
        if *owner == program_id {
            drop(owner);
            Ok(Self::OnChain(ProgramAccount::from_accounts(
                program_id,
                &mut once(account),
                arg,
            )?))
        } else if *owner == SystemProgram::program_id() {
            drop(owner);
            Ok(Self::Generative(account))
        } else {
            Err(GenericError::AccountOwnerNotEqual {
                account: account.key,
                owner: **owner,
                expected_owner: vec![*program_id, *SystemProgram::program_id()],
            }
            .into())
        }
    }

    fn accounts_usage_hint(_arg: &()) -> (usize, Option<usize>) {
        (1, Some(1))
    }
}
/// Validation for cryptid account
#[derive(Debug)]
pub struct CryptidAddressValidate<'a> {
    /// The did passed in
    pub did: &'a Pubkey,
    /// The did program passed in
    pub did_program: &'a Pubkey,
    /// The account nonce if generative
    pub account_nonce: Option<u8>,
}
impl<'a> ValidateArgument<CryptidAddressValidate<'a>> for CryptidAccountAddress {
    fn validate(
        &mut self,
        program_id: &'static Pubkey,
        arg: CryptidAddressValidate,
    ) -> CruiserResult<()> {
        match self {
            CryptidAccountAddress::OnChain(account) => {
                account.validate(program_id, ())?;
                if &account.did != arg.did {
                    Err(CryptidSignerError::WrongDID {
                        expected: account.did,
                        received: *arg.did,
                    }
                    .into())
                } else if &account.did_program != arg.did_program {
                    Err(CryptidSignerError::WrongDIDProgram {
                        expected: account.did_program,
                        received: *arg.did_program,
                    }
                    .into())
                } else {
                    Ok(())
                }
            }
            CryptidAccountAddress::Generative(account) => {
                account.validate(program_id, ())?;
                let seeder = GenerativeCryptidSeeder {
                    did_program: arg.did_program,
                    did: arg.did,
                };
                match arg.account_nonce {
                    None => seeder.verify_address(program_id, account.key),
                    Some(nonce) => seeder.verify_address_with_nonce(program_id, account.key, nonce),
                }
            }
        }
    }
}
