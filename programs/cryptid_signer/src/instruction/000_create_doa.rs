use borsh::{BorshDeserialize, BorshSchema, BorshSerialize};

use solana_generator::*;

use crate::instruction::{verify_keys, SigningKey, SigningKeyBuild};
use crate::state::DOAAccount;
use crate::{generate_doa_signer, verify_doa_signer};
use std::iter::once;

#[derive(Debug)]
pub struct CreateDOA;
impl Instruction for CreateDOA {
    type Data = CreateDOAData;
    type FromAccountsData = u8;
    type Accounts = CreateDOAAccounts;
    type BuildArg = CreateDOABuild;

    fn data_to_instruction_arg(data: &mut Self::Data) -> GeneratorResult<Self::FromAccountsData> {
        Ok(data.extra_signer_accounts)
    }

    fn process(
        program_id: Pubkey,
        data: Self::Data,
        accounts: &mut Self::Accounts,
    ) -> GeneratorResult<Option<SystemProgram>> {
        verify_doa_signer(
            program_id,
            accounts.doa.info().key,
            accounts.doa_signer.key,
            data.signer_nonce,
        )?;

        verify_keys(
            accounts.did_program.key,
            &accounts.did,
            once(&accounts.signing_key),
        )?;

        accounts.doa.set_funder(accounts.funder.clone());
        accounts.doa.did = accounts.did.key;
        accounts.doa.did_program = accounts.did_program.key;
        accounts.doa.signer_nonce = data.signer_nonce;
        accounts.doa.key_threshold = data.key_threshold;
        accounts.doa.settings_sequence = 1;
        Ok(Some(accounts.system_program.clone()))
    }

    fn build_instruction(
        program_id: Pubkey,
        discriminant: &[u8],
        arg: CreateDOABuild,
    ) -> GeneratorResult<SolanaInstruction> {
        let mut data = discriminant.to_vec();
        let (doa_signer, signer_nonce) = generate_doa_signer(program_id, arg.doa);
        let mut accounts = vec![
            SolanaAccountMeta::new(arg.funder, true),
            SolanaAccountMeta::new(arg.doa, !arg.doa_is_zeroed),
            SolanaAccountMeta::new_readonly(doa_signer, false),
            arg.did,
            SolanaAccountMeta::new_readonly(arg.did_program, false),
        ];
        accounts.extend(arg.signing_key.to_metas());
        accounts.push(SolanaAccountMeta::new_readonly(system_program_id(), false));
        BorshSerialize::serialize(
            &CreateDOAData {
                extra_signer_accounts: arg.signing_key.extra_count(),
                signer_nonce,
                key_threshold: arg.key_threshold,
            },
            &mut data,
        )?;
        Ok(SolanaInstruction {
            program_id,
            accounts,
            data,
        })
    }
}

#[derive(Debug, AccountArgument)]
#[account_argument(instruction_data = extra_signer_accounts: u8)]
pub struct CreateDOAAccounts {
    #[account_argument(signer, writable, owner = system_program_id())]
    pub funder: AccountInfo,
    pub doa: InitOrZeroedAccount<DOAAccount>,
    pub doa_signer: AccountInfo,
    pub did: AccountInfo,
    pub did_program: AccountInfo,
    #[account_argument(instruction_data = extra_signer_accounts)]
    pub signing_key: SigningKey,
    pub system_program: SystemProgram,
}
#[derive(Debug)]
pub struct CreateDOABuild {
    pub funder: Pubkey,
    pub doa: Pubkey,
    pub doa_is_zeroed: bool,
    pub did: SolanaAccountMeta,
    pub did_program: Pubkey,
    pub signing_key: SigningKeyBuild,
    pub key_threshold: u8,
}

#[derive(Debug, BorshSerialize, BorshDeserialize, BorshSchema)]
pub struct CreateDOAData {
    pub extra_signer_accounts: u8,
    pub signer_nonce: u8,
    pub key_threshold: u8,
    // TODO: Add when permissions added
    // pub sign_permissions: ?,
    // pub execute_permissions: ?,
    // pub remove_permissions: ?,
}
