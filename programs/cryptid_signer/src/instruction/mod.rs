//! Instructions for `cryptid_signer`

#[path = "./000_create_doa.rs"]
mod create_doa;
#[path = "./005_direct_execute.rs"]
mod direct_execute;
#[path = "./001_propose_transaction.rs"]
mod propose_transaction;
#[path = "./254_test_instruction.rs"]
mod test_instruction;

pub use create_doa::*;
pub use direct_execute::*;
pub use propose_transaction::*;
use std::borrow::Cow;
pub use test_instruction::*;

use crate::error::CryptidSignerError;
use solana_generator::solana_program::program_error::ProgramError;
use solana_generator::*;
use std::iter::once;

/// The instructions for `cryptid_signer`
#[allow(clippy::large_enum_variant)]
#[derive(Debug, Copy, Clone, InstructionList)]
pub enum CryptidInstruction {
    /// A test instruction that logs a success message
    #[instruction_list(instruction = TestInstruction, discriminant = 254)]
    Test,
    /// Creates a new DOA account on-chain
    #[instruction_list(instruction = CreateDOA, discriminant = 0)]
    CreateDOA,
    /// Proposes a new transaction that can be approved and appended to
    #[instruction_list(instruction = ProposeTransaction, discriminant = 1)]
    ProposeTransaction,
    /// Executes a transaction directly if all required keys sign
    #[instruction_list(instruction = DirectExecute, discriminant = 5)]
    DirectExecute,
}

/// Verifies the given keys are valid.
/// Currently only checks that there is a single valid key for `sol-did` and lets all other program through without checks
pub fn verify_keys<'a>(
    did_program: &AccountInfo,
    did: &AccountInfo,
    signing_keys: impl Iterator<Item = &'a SigningKey>,
) -> GeneratorResult<()> {
    // TODO: Handle higher key threshold than 1
    if did_program.key == sol_did::id() {
        for signing_key in signing_keys {
            // Safety: This is safe because the generated references are not leaked or used after another use of the value they came from
            unsafe {
                sol_did::validate_owner(
                    &did.to_solana_account_info(),
                    &signing_key.signing_key.to_solana_account_info(),
                    signing_key
                        .extra_accounts
                        .iter()
                        .map(|info| info.to_solana_account_info())
                        .map(Cow::Owned),
                )?;
            }
        }
        Ok(())
    } else {
        //TODO: Verify signing key against did using interface
        Err(CryptidSignerError::UnsupportedDIDProgram {
            program: did_program.key,
        }
        .into())
    }
}

/// A key that signs for a did.
/// Has a single account that is the signature (may or may not be a solana signature) and a variable number of accounts for the DID program.
#[derive(Debug, AccountArgument)]
#[account_argument(instruction_data = extra_accounts: u8)]
pub struct SigningKey {
    /// The key that constitutes the signature
    pub signing_key: AccountInfo,
    /// Extra accounts for the DID program
    #[account_argument(instruction_data = extra_accounts as usize)]
    pub extra_accounts: Vec<AccountInfo>,
}
impl SigningKey {
    /// Turns the keys into a string
    pub fn to_key_string(&self) -> String {
        format!(
            "({}, {:?})",
            self.signing_key.key,
            self.extra_accounts
                .iter()
                .map(|extra| extra.key)
                .collect::<Vec<_>>()
        )
    }
}
impl FromAccounts<()> for SigningKey {
    fn from_accounts(
        _program_id: Pubkey,
        infos: &mut impl AccountInfoIterator<Item = AccountInfo>,
        _arg: (),
    ) -> GeneratorResult<Self> {
        let signing_key = infos.next().ok_or(ProgramError::NotEnoughAccountKeys)?;
        let extra_accounts = infos.collect();
        Ok(Self {
            signing_key,
            extra_accounts,
        })
    }
}

/// A builder for [`SigningKey`]
#[derive(Debug)]
pub struct SigningKeyBuild {
    /// The key that constitutes the signature
    pub signing_key: SolanaAccountMeta,
    /// Extra accounts for the DID program
    pub extra_accounts: Vec<SolanaAccountMeta>,
}
impl SigningKeyBuild {
    /// Turns `self` into an iterator of [`SolanaAccountMeta`]s
    pub fn to_metas(&self) -> impl Iterator<Item = SolanaAccountMeta> + '_ {
        once(self.signing_key.clone()).chain(self.extra_accounts.iter().cloned())
    }

    /// Returns the size of [`SigningKeyBuild::extra_accounts`]
    pub fn extra_count(&self) -> u8 {
        self.extra_accounts.len() as u8
    }
}
