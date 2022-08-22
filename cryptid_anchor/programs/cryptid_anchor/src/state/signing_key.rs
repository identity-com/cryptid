use anchor_lang::prelude::*;
use crate::state::signing_key_data::SigningKeyData;

/// A key that signs for a did.
/// Has a single account that is the signature (may or may not be a solana signature) and a variable number of accounts for the DID program.
/// // TODO: Can we change from using AccountInfo to something else without a lifetime?
#[derive(Debug)]
pub struct SigningKey<'info> {
    /// The key that constitutes the signature
    pub signing_key: AccountInfo<'info>,
    /// Extra accounts for the DID program
    // #[account_argument(instruction_data = extra_accounts as usize)]
    pub extra_accounts: Vec<AccountInfo<'info>>,
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

    /// Turns the keys into the on-chain data format
    pub fn to_key_data(&self) -> SigningKeyData {
        SigningKeyData {
            key: self.signing_key.key,
            extra_keys: self
                .extra_accounts
                .iter()
                .map(|account| account.key)
                .collect(),
        }
    }
}


impl FromAccounts<()> for SigningKey {
    fn from_accounts(
        _program_id: Pubkey,
        infos: &mut impl AccountInfoIterator,
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