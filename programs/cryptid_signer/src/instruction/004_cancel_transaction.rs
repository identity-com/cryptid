use crate::account::CryptidAccountAddress;
use crate::error::CryptidSignerError;
use crate::instruction::expand_transaction::SeedOrAccount;
use crate::instruction::{verify_keys, SigningKey, SigningKeyBuild};
use crate::state::TransactionAccount;
use num_traits::ToPrimitive;
use solana_generator::*;
use std::iter::once;

/// Cancels an on-chain transaction
#[derive(Debug)]
pub struct CancelTransaction;
impl Instruction for CancelTransaction {
    type Data = u8;
    type FromAccountsData = u8;
    type Accounts = CancelTransactionAccounts;
    type BuildArg = CancelTransactionBuild;

    fn data_to_instruction_arg(data: &mut Self::Data) -> GeneratorResult<Self::FromAccountsData> {
        Ok(*data)
    }

    fn process(
        program_id: Pubkey,
        _data: Self::Data,
        accounts: &mut Self::Accounts,
    ) -> GeneratorResult<Option<SystemProgram>> {
        verify_keys(
            &accounts.did_program,
            &accounts.did,
            once(&accounts.signing_key),
        )?;
        msg!("Verified keys");
        accounts.cryptid_account.verify_cryptid_account(
            &program_id,
            &accounts.did_program.key,
            &accounts.did.key,
        )?;
        msg!("Verified cryptid account");

        if accounts.transaction_account.cryptid_account != accounts.cryptid_account.info().key {
            return Err(GeneratorError::InvalidAccount {
                account: accounts.cryptid_account.info().key,
                expected: accounts.transaction_account.cryptid_account,
            }
            .into());
        }
        msg!("Verified cryptid account is owner of transaction");

        let signing_key_data = accounts.signing_key.to_key_data();
        if !accounts
            .transaction_account
            .signers
            .iter()
            .any(|signer| signer.0 == signing_key_data)
        {
            return Err(CryptidSignerError::KeyCannotChangeTransaction {
                key: signing_key_data,
            }
            .into());
        }
        msg!("Verified key can cancel");

        msg!(
            "Execution accounts length: {}",
            accounts.execution_accounts.len()
        );
        for account in accounts.execution_accounts.iter() {
            msg!("Account: {}", account.key);
        }

        let mut transaction_lamports = accounts.transaction_account.info.lamports.borrow_mut();
        **accounts.funds_to.lamports.borrow_mut() += **transaction_lamports;
        **transaction_lamports = 0;

        Ok(None)
    }

    fn build_instruction(
        program_id: Pubkey,
        arg: Self::BuildArg,
    ) -> GeneratorResult<(Vec<SolanaAccountMeta>, Self::Data)> {
        let data = arg
            .signing_key
            .extra_accounts
            .len()
            .to_u8()
            .expect("Too many extras");
        let mut accounts = vec![
            SolanaAccountMeta::new(
                arg.transaction_account
                    .into_key(&arg.cryptid_account, &program_id),
                false,
            ),
            SolanaAccountMeta::new_readonly(arg.cryptid_account, false),
            arg.did,
            SolanaAccountMeta::new_readonly(arg.did_program, false),
        ];
        accounts.extend(arg.signing_key.to_metas());
        accounts.push(SolanaAccountMeta::new(arg.funds_to, false));
        accounts.extend(arg.execution_accounts.into_iter());
        Ok((accounts, data))
    }
}

/// The accounts for [`CancelTransaction`]
#[derive(Debug, AccountArgument)]
#[account_argument(instruction_data = signer_extras: u8)]
pub struct CancelTransactionAccounts {
    /// The transaction to cancel
    #[account_argument(writable)]
    pub transaction_account: ProgramAccount<TransactionAccount>,
    /// The cryptid account for the transaction
    pub cryptid_account: CryptidAccountAddress,
    /// The did for the cryptid account
    pub did: AccountInfo,
    /// The did program for the did
    pub did_program: AccountInfo,
    /// The key that's signing the execution of the transaction
    #[account_argument(instruction_data = signer_extras)]
    pub signing_key: SigningKey,
    /// The account where the transaction's rent will go
    #[account_argument(writable)]
    pub funds_to: AccountInfo,
    /// The accounts needed for execution
    pub execution_accounts: Rest<AccountInfo>,
}

/// The builder for [`CancelTransaction`]
#[derive(Debug)]
pub struct CancelTransactionBuild {
    /// The transaction to cancel
    pub transaction_account: SeedOrAccount,
    /// The cryptid account for the transaction
    pub cryptid_account: Pubkey,
    /// The did for the cryptid account
    pub did: SolanaAccountMeta,
    /// The did program for the did
    pub did_program: Pubkey,
    /// The key that is signing the execution. Must be a signer of the transaction
    pub signing_key: SigningKeyBuild,
    /// Where the transaction's rent goes
    pub funds_to: Pubkey,
    /// The accounts for execution
    pub execution_accounts: Vec<SolanaAccountMeta>,
}
