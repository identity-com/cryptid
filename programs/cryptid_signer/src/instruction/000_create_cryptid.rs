use borsh::{BorshDeserialize, BorshSchema, BorshSerialize};

use crate::instruction::{RestAreExtras, SigningKey};
use crate::seeds::{CryptidSignerSeeder, GenerativeCryptidSeeder};
use crate::state::{CryptidAccount, CryptidAccountList, MiddlewareCount};
use cruiser::account_argument::{
    AccountArgument, AccountInfoIterator, FromAccounts, MultiIndexable, Single, SingleIndexable,
    ValidateArgument,
};
use cruiser::account_types::init_account::{InitAccount, InitArgs};
use cruiser::account_types::init_or_zeroed_account::InitOrZeroedAccount;
use cruiser::account_types::system_program::SystemProgram;
use cruiser::instruction::Instruction;
use cruiser::on_chain_size::OnChainSize;
use cruiser::pda_seeds::{PDAGenerator, PDASeedSet};
use cruiser::program::Program;
use cruiser::solana_program::rent::Rent;
use cruiser::{AccountInfo, CruiserResult, Pubkey};
use std::ops::{Deref, DerefMut};

/// The accounts for [`CreateCryptid`]
#[allow(missing_debug_implementations)] // TODO: Remove when InitOrZeroed impls Debug
#[derive(AccountArgument)]
#[from(data = (cryptid_nonce: Option<u8>))]
#[validate(data = (max_middleware: MiddlewareCount, cryptid_nonce: Option<u8>, signer_nonce: u8, key_threshold: u8))]
pub struct CreateCryptidAccounts {
    /// The funder that will pay rent
    #[validate(signer, writable, owner = SystemProgram::program_id())]
    pub funder: AccountInfo,
    /// The cryptid account that will be initialized.
    /// Can either be a un-allocated account owned by the system program (must sign or be generative) or an allocated rent-free account owned by this program.
    #[from(data = CryptidAccountInitFrom{
        seeds: cryptid_nonce.is_some(),
    })]
    #[validate(data = CryptidAccountInitValidate{
        cryptid_nonce,
        system_program: &self.system_program,
        max_middleware,
        funder: &self.funder,
        funder_seeds: None,
        rent: None,
        did: self.did.key,
        did_program: self.did_program.key,
        signer_nonce,
        key_threshold,
    })]
    pub cryptid_account: CryptidAccountInit,
    /// The DID for the the cryptid account
    pub did: AccountInfo,
    /// The program for the DID
    pub did_program: AccountInfo,
    /// The system program
    pub system_program: SystemProgram,
    /// The key that is valid for the DID to create the cryptid account
    #[from(data = RestAreExtras)]
    pub signing_key: SigningKey,
}
/// The instruction data for [`CreateCryptid`]
#[derive(Debug, BorshSerialize, BorshDeserialize, BorshSchema)]
pub struct CreateCryptidData {
    /// The nonce of the DOA signer generated
    pub signer_nonce: u8,
    /// The number of keys needed to sign transactions with the DOA
    pub key_threshold: u8,
    /// The maximum middleware count for the account
    pub max_middleware: u32,
    /// The nonce of the cryptid account if upgrading generative
    pub account_nonce: Option<u8>,
}

/// Creates a new Cryptid Account on-chain
#[derive(Debug)]
pub struct CreateCryptid;
impl Instruction for CreateCryptid {
    type Data = CreateCryptidData;
    type Accounts = CreateCryptidAccounts;
}
#[cfg(feature = "processor")]
mod processor {
    use super::*;
    use cruiser::instruction::InstructionProcessor;

    impl InstructionProcessor<CreateCryptid> for CreateCryptid {
        type FromAccountsData = Option<u8>;
        type ValidateData = (MiddlewareCount, Option<u8>, u8, u8);
        type InstructionData = ();

        fn data_to_instruction_arg(
            data: <CreateCryptid as Instruction>::Data,
        ) -> CruiserResult<(
            Self::FromAccountsData,
            Self::ValidateData,
            Self::InstructionData,
        )> {
            Ok((
                data.account_nonce,
                (
                    MiddlewareCount(data.max_middleware as usize),
                    data.account_nonce,
                    data.signer_nonce,
                    data.key_threshold,
                ),
                (),
            ))
        }

        fn process(
            _program_id: &'static Pubkey,
            _data: Self::InstructionData,
            _accounts: &mut <CreateCryptid as Instruction>::Accounts,
        ) -> CruiserResult<()> {
            Ok(())
        }
    }
}
#[cfg(feature = "client")]
pub use build::*;
#[cfg(feature = "client")]
mod build {
    use super::*;
    use crate::instruction::{CryptidInstruction, SigningKeyBuild};
    use cruiser::instruction_list::InstructionList;
    use cruiser::program::Program;
    use cruiser::{SolanaAccountMeta, SolanaInstruction};

    #[derive(Debug)]
    pub struct CreateCryptidArgs<'a, A> {
        pub program_id: &'a Pubkey,
        pub account: A,
        pub funder: &'a Pubkey,
        pub did: &'a Pubkey,
        pub did_program: &'a Pubkey,
        pub signing_key: SigningKeyBuild,
        pub signer_nonce: Option<u8>,
        pub key_threshold: u8,
        pub max_middleware: u32,
    }

    pub fn create_cryptid(args: CreateCryptidArgs<&Pubkey>) -> CruiserResult<SolanaInstruction> {
        let create_data = CreateCryptidData {
            signer_nonce: match args.signer_nonce {
                None => {
                    CryptidSignerSeeder {
                        cryptid_account: args.account,
                    }
                    .find_address(args.program_id)
                    .1
                }
                Some(nonce) => nonce,
            },
            key_threshold: args.key_threshold,
            max_middleware: args.max_middleware,
            account_nonce: None,
        };
        let mut accounts = vec![
            SolanaAccountMeta::new(*args.funder, true),
            SolanaAccountMeta::new(*args.account, true),
            SolanaAccountMeta::new_readonly(*args.did, false),
            SolanaAccountMeta::new_readonly(*args.did_program, false),
            SolanaAccountMeta::new_readonly(*SystemProgram::program_id(), false),
        ];
        accounts.extend(args.signing_key.into_metas());
        let mut data = CryptidInstruction::CreateCryptid
            .discriminant_compressed()
            .try_to_vec()?;
        create_data.serialize(&mut data)?;
        Ok(SolanaInstruction {
            program_id: *args.program_id,
            accounts,
            data,
        })
    }

    pub fn upgrade_generative_cryptid(
        args: CreateCryptidArgs<Option<(Pubkey, u8)>>,
    ) -> CruiserResult<SolanaInstruction> {
        let (account, account_nonce) = args.account.unwrap_or_else(|| {
            GenerativeCryptidSeeder {
                did_program: args.did_program,
                did: args.did,
            }
            .find_address(args.program_id)
        });
        let create_data = CreateCryptidData {
            signer_nonce: match args.signer_nonce {
                None => {
                    CryptidSignerSeeder {
                        cryptid_account: &account,
                    }
                    .find_address(args.program_id)
                    .1
                }
                Some(nonce) => nonce,
            },
            key_threshold: args.key_threshold,
            max_middleware: args.max_middleware,
            account_nonce: Some(account_nonce),
        };
        let mut accounts = vec![
            SolanaAccountMeta::new(*args.funder, true),
            SolanaAccountMeta::new(account, false),
            SolanaAccountMeta::new_readonly(*args.did, false),
            SolanaAccountMeta::new_readonly(*args.did_program, false),
            SolanaAccountMeta::new_readonly(*SystemProgram::program_id(), false),
        ];
        accounts.extend(args.signing_key.into_metas());
        let mut data = CryptidInstruction::CreateCryptid
            .discriminant_compressed()
            .try_to_vec()?;
        create_data.serialize(&mut data)?;
        Ok(SolanaInstruction {
            program_id: *args.program_id,
            accounts,
            data,
        })
    }
}

/// Inits a cryptid account
#[allow(missing_debug_implementations)] // TODO: Remove when InitOrZeroed impls Debug
pub enum CryptidAccountInit {
    /// Upgrading a default cryptid account
    DefaultUpgrade(InitAccount<CryptidAccountList, CryptidAccount>),
    /// Making a new cryptid account
    New(InitOrZeroedAccount<CryptidAccountList, CryptidAccount>),
}
impl AccountArgument for CryptidAccountInit {
    fn write_back(self, program_id: &'static Pubkey) -> CruiserResult<()> {
        match self {
            CryptidAccountInit::DefaultUpgrade(account) => account.write_back(program_id),
            CryptidAccountInit::New(account) => account.write_back(program_id),
        }
    }

    fn add_keys(&self, add: impl FnMut(&'static Pubkey) -> CruiserResult<()>) -> CruiserResult<()> {
        match self {
            CryptidAccountInit::DefaultUpgrade(account) => account.add_keys(add),
            CryptidAccountInit::New(account) => account.add_keys(add),
        }
    }
}
impl Deref for CryptidAccountInit {
    type Target = CryptidAccount;

    fn deref(&self) -> &Self::Target {
        match self {
            CryptidAccountInit::DefaultUpgrade(account) => account,
            CryptidAccountInit::New(account) => account,
        }
    }
}
impl DerefMut for CryptidAccountInit {
    fn deref_mut(&mut self) -> &mut Self::Target {
        match self {
            CryptidAccountInit::DefaultUpgrade(account) => account,
            CryptidAccountInit::New(account) => account,
        }
    }
}
/// The from data for [`CryptidAccountInit`]
// TODO: Replace with enum `AccountArgument` derive when supported
#[derive(Debug)]
pub struct CryptidAccountInitFrom {
    seeds: bool,
}
impl FromAccounts<CryptidAccountInitFrom> for CryptidAccountInit {
    fn from_accounts(
        program_id: &'static Pubkey,
        infos: &mut impl AccountInfoIterator,
        arg: CryptidAccountInitFrom,
    ) -> CruiserResult<Self> {
        Ok(match arg.seeds {
            false => Self::New(InitOrZeroedAccount::from_accounts(
                program_id,
                infos,
                CryptidAccount::new_on_chain(),
            )?),
            true => Self::DefaultUpgrade(InitAccount::from_accounts(
                program_id,
                infos,
                CryptidAccount::new_on_chain(),
            )?),
        })
    }

    fn accounts_usage_hint(_arg: &CryptidAccountInitFrom) -> (usize, Option<usize>) {
        (1, Some(1))
    }
}
/// The validate argument for [`CryptidAccountInit`]
#[derive(Debug)]
pub struct CryptidAccountInitValidate<'a> {
    cryptid_nonce: Option<u8>,
    system_program: &'a SystemProgram,
    max_middleware: MiddlewareCount,
    funder: &'a AccountInfo,
    funder_seeds: Option<&'a PDASeedSet<'a>>,
    rent: Option<Rent>,
    did: &'static Pubkey,
    did_program: &'static Pubkey,
    signer_nonce: u8,
    key_threshold: u8,
}
impl<'a> ValidateArgument<CryptidAccountInitValidate<'a>> for CryptidAccountInit {
    fn validate(
        &mut self,
        program_id: &'static Pubkey,
        arg: CryptidAccountInitValidate<'a>,
    ) -> CruiserResult<()> {
        self.did_program = *arg.did_program;
        self.did = *arg.did;
        self.signer_nonce = arg.signer_nonce;
        self.key_threshold = arg.key_threshold;
        match self {
            CryptidAccountInit::DefaultUpgrade(account) => {
                let seeds = PDASeedSet::new(
                    GenerativeCryptidSeeder {
                        did_program: arg.did_program,
                        did: arg.did,
                    },
                    arg.cryptid_nonce.unwrap(),
                );
                seeds.verify_address(program_id, account.info.key)?;
                account.validate(
                    program_id,
                    InitArgs {
                        system_program: arg.system_program,
                        space: CryptidAccount::on_chain_max_size(arg.max_middleware),
                        funder: arg.funder,
                        funder_seeds: arg.funder_seeds,
                        account_seeds: Some(&seeds),
                        rent: arg.rent,
                    },
                )?;
            }
            CryptidAccountInit::New(account) => {
                account.validate(
                    program_id,
                    InitArgs {
                        system_program: arg.system_program,
                        space: CryptidAccount::on_chain_max_size(arg.max_middleware),
                        funder: arg.funder,
                        funder_seeds: arg.funder_seeds,
                        account_seeds: None,
                        rent: arg.rent,
                    },
                )?;
            }
        };
        CryptidSignerSeeder {
            cryptid_account: self.get_info().key,
        }
        .create_address(program_id, self.signer_nonce)?;
        Ok(())
    }
}
impl<T> MultiIndexable<T> for CryptidAccountInit
where
    InitAccount<CryptidAccountList, CryptidAccount>: MultiIndexable<T>,
    InitOrZeroedAccount<CryptidAccountList, CryptidAccount>: MultiIndexable<T>,
{
    fn is_signer(&self, indexer: T) -> CruiserResult<bool> {
        match self {
            CryptidAccountInit::DefaultUpgrade(account) => account.is_signer(indexer),
            CryptidAccountInit::New(account) => account.is_signer(indexer),
        }
    }

    fn is_writable(&self, indexer: T) -> CruiserResult<bool> {
        match self {
            CryptidAccountInit::DefaultUpgrade(account) => account.is_writable(indexer),
            CryptidAccountInit::New(account) => account.is_writable(indexer),
        }
    }

    fn is_owner(&self, owner: &Pubkey, indexer: T) -> CruiserResult<bool> {
        match self {
            CryptidAccountInit::DefaultUpgrade(account) => account.is_owner(owner, indexer),
            CryptidAccountInit::New(account) => account.is_owner(owner, indexer),
        }
    }
}
impl<T> SingleIndexable<T> for CryptidAccountInit
where
    InitAccount<CryptidAccountList, CryptidAccount>: SingleIndexable<T>,
    InitOrZeroedAccount<CryptidAccountList, CryptidAccount>: SingleIndexable<T>,
{
    fn info(&self, indexer: T) -> CruiserResult<&AccountInfo> {
        match self {
            CryptidAccountInit::DefaultUpgrade(account) => account.info(indexer),
            CryptidAccountInit::New(account) => account.info(indexer),
        }
    }
}
