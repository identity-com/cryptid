use borsh::{BorshDeserialize, BorshSchema, BorshSerialize};

use solana_generator::*;

use crate::instruction::{verify_keys, SigningKey, SigningKeyBuild};
use crate::state::CryptidAccount;
use crate::CryptidSignerSeeder;
use std::iter::once;

/// Creates a new Cryptid Account on-chain
#[derive(Debug)]
pub struct CreateCryptid;
impl Instruction for CreateCryptid {
    type Data = CreateCryptidData;
    type FromAccountsData = u8;
    type Accounts = CreateCryptidAccounts;
    type BuildArg = CreateCryptidBuild;

    fn data_to_instruction_arg(data: &mut Self::Data) -> GeneratorResult<Self::FromAccountsData> {
        Ok(data.extra_signer_accounts)
    }

    fn process(
        program_id: Pubkey,
        data: Self::Data,
        accounts: &mut Self::Accounts,
    ) -> GeneratorResult<Option<SystemProgram>> {
        // Verify the cryptid signer can be made from the nonce
        PDAGenerator::new(
            program_id,
            CryptidSignerSeeder {
                cryptid_account: accounts.cryptid_account.info().key,
            },
        )
        .create_address(data.signer_nonce)?;

        verify_keys(
            &accounts.did_program,
            &accounts.did,
            once(&accounts.signing_key),
        )?;

        accounts.cryptid_account.set_funder(accounts.funder.clone());
        accounts.cryptid_account.did = accounts.did.key;
        accounts.cryptid_account.did_program = accounts.did_program.key;
        accounts.cryptid_account.signer_nonce = data.signer_nonce;
        accounts.cryptid_account.key_threshold = data.key_threshold;
        accounts.cryptid_account.settings_sequence = 1;
        Ok(Some(accounts.system_program.clone()))
    }

    fn build_instruction(
        program_id: Pubkey,
        arg: CreateCryptidBuild,
    ) -> GeneratorResult<(Vec<SolanaAccountMeta>, Self::Data)> {
        let (_cryptid_signer, signer_nonce) = PDAGenerator::new(
            program_id,
            CryptidSignerSeeder {
                cryptid_account: arg.cryptid_account,
            },
        )
        .find_address();
        let mut accounts = vec![
            SolanaAccountMeta::new(arg.funder, true),
            SolanaAccountMeta::new(arg.cryptid_account, !arg.cryptid_account_is_zeroed),
            arg.did,
            SolanaAccountMeta::new_readonly(arg.did_program, false),
        ];
        accounts.extend(arg.signing_key.to_metas());
        accounts.push(SolanaAccountMeta::new_readonly(system_program_id(), false));
        Ok((
            accounts,
            CreateCryptidData {
                extra_signer_accounts: arg.signing_key.extra_count(),
                signer_nonce,
                key_threshold: arg.key_threshold,
            },
        ))
    }
}

/// The accounts for [`CreateCryptid`]
#[derive(Debug, AccountArgument)]
#[account_argument(instruction_data = extra_signer_accounts: u8)]
pub struct CreateCryptidAccounts {
    /// The funder that will pay rent
    #[account_argument(signer, writable, owner = system_program_id())]
    pub funder: AccountInfo,
    /// The cryptid account that will be initialized.
    /// Can either be a un-allocated account owned by the system program (must sign or be generative) or an allocated rent-free account owned by this program.
    pub cryptid_account: InitOrZeroedAccount<CryptidAccount>,
    /// The DID for the the cryptid account
    pub did: AccountInfo,
    /// The program for the DID
    pub did_program: AccountInfo,
    /// The key that is valid for the DID to create the cryptid account
    #[account_argument(instruction_data = extra_signer_accounts)]
    pub signing_key: SigningKey,
    /// The system program
    pub system_program: SystemProgram,
}
/// The build arguments for [`CreateCryptid`]
#[derive(Debug)]
pub struct CreateCryptidBuild {
    /// The funder that will pay rent
    pub funder: Pubkey,
    /// The cryptid account that will be initialized.
    /// Can either be a un-allocated account owned by the system program (must sign or be generative) or an allocated rent-free account owned by this program.
    pub cryptid_account: Pubkey,
    /// [`true`] if the Cryptid Account should be treated as zeroed, [`false`] if init
    pub cryptid_account_is_zeroed: bool,
    /// The DID for the DOA
    pub did: SolanaAccountMeta,
    /// The program for the DID
    pub did_program: Pubkey,
    /// The key that is valid for the DID to create the DOA
    pub signing_key: SigningKeyBuild,
    /// The number of keys needed to sign transactions with the DOA
    pub key_threshold: u8,
}

/// The instruction data for [`CreateCryptid`]
#[derive(Debug, BorshSerialize, BorshDeserialize, BorshSchema)]
pub struct CreateCryptidData {
    /// The number of extra accounts the signer has
    pub extra_signer_accounts: u8,
    /// The nonce of the DOA signer generated
    pub signer_nonce: u8,
    /// The number of keys needed to sign transactions with the DOA
    pub key_threshold: u8,
    // TODO: Add when permissions added
    // pub sign_permissions: ?,
    // pub execute_permissions: ?,
    // pub remove_permissions: ?,
}
