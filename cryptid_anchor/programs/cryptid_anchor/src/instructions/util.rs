use anchor_lang::prelude::*;
use sol_did::state::DidAccount;
use crate::error::CryptidError;
use num_traits::cast::ToPrimitive;

/// A trait that extracts all accounts from an anchor instruction context, combining
pub trait AllAccounts<'a, 'b, 'c, 'info> {
    fn all_accounts(&self) -> Vec<&AccountInfo<'info>>;
    fn get_accounts_by_indexes(&self, indexes: &[u8]) -> Result<Vec<&AccountInfo<'info>>>;
}

pub fn resolve_by_index<'c, 'info>(indexes: &[u8], accounts: Vec<&'c AccountInfo<'info>>) -> Result<Vec<&'c AccountInfo<'info>>> {
    let mut resolved_accounts = Vec::new();
    for i in indexes {
        let i = *i as usize;
        if i >= accounts.len() {
            msg!("Account index {} out of bounds", i);
            return err!(CryptidError::IndexOutOfRange);
        }
        resolved_accounts.push(accounts[i]);
    }
    Ok(resolved_accounts)
}

/// A trait that indicates if an account represents a generative account (e.g. a Generative DID or Cryptid account)
/// By Generative, we mean that the account is not on chain, but derived from a public key and has default properties.
pub trait IsGenerative<T> {
    fn is_generative(&self) -> bool;
}

impl<T: AccountSerialize + AccountDeserialize + Owner + Clone> IsGenerative<T> for Account<'_, T> {
    fn is_generative(&self) -> bool {
        // TODO: I just want to check that it is zero. Why is this so hard!?
        self.to_account_info().try_borrow_lamports().unwrap().to_u64().unwrap() == 0 && *self.to_account_info().owner == System::id()
    }
}

/// Verifies that the signer has the permission to sign for the DID
/// If the controller-chain is empty, it expects the signer to be a key on the did itself
/// Otherwise, the signer is a signer on a controller of the DID (either directly or indirectly)
pub fn verify_keys<'a, 'b, 'c, 'info>(
    did: &Account<'a, DidAccount>,
    signer: &Signer,
    controlling_did_accounts: Vec<&AccountInfo<'info>>,
) -> Result<()> {

    let controlling_did_accounts = controlling_did_accounts
        .into_iter()
        .cloned()
        .collect::<Vec<_>>();
    let signer_is_authority = sol_did::is_authority(
        &did.to_account_info(),
        controlling_did_accounts.as_slice(),
        &signer.to_account_info().key,
        &[],
        None,
        None,
    )
        .map_err(|error| -> CryptidError {
            msg!("Error executing is_authority: {}", error);
            CryptidError::KeyCannotChangeTransaction
        })?;

    if !signer_is_authority {
        msg!("Signer is not an authority on the DID");
        return err!(CryptidError::KeyMustBeSigner);
    }
    Ok(())
}

// pub fn resolve_account_indexes<'a, 'b, 'info>(
//     account_indexes: &'a [u8],
//     accounts: &'b [&AccountInfo<'info>],
// ) -> Result<Vec<&'b AccountInfo<'info>>> {
//     let mut resolved_accounts = Vec::new();
//     for account_index in account_indexes {
//         let account_index = *account_index as usize;
//         if account_index >= accounts.len() {
//             msg!("Account index {} out of bounds", account_index);
//             return err!(CryptidError::IndexOutOfRange);
//         }
//         resolved_accounts.push(accounts[account_index]);
//     }
//     Ok(resolved_accounts)
// }


//
// /// The on-chain format of [`SigningKey`]
// #[derive(Debug, BorshSerialize, BorshDeserialize, BorshSchema, Eq, PartialEq, Clone)]
// pub struct SigningKeyData {
//     /// The signing key
//     pub key: Pubkey,
//     /// Extra keys needed for signing
//     pub extra_keys: Vec<Pubkey>,
// }
// impl SigningKeyData {
//     /// Calculates the on-chain size of a [`SigningKeyData`]
//     pub const fn calculate_size(num_extras: usize) -> usize {
//         32 //key
//             + 4 + 32 * num_extras //extra_keys
//     }
// }
//
// /// A builder for [`SigningKey`]
// #[derive(Debug, Clone)]
// pub struct SigningKeyBuild {
//     /// The key that constitutes the signature
//     pub signing_key: SolanaAccountMeta,
//     /// Extra accounts for the DID program
//     pub extra_accounts: Vec<SolanaAccountMeta>,
// }
// impl SigningKeyBuild {
//     /// Turns `self` into an iterator of [`SolanaAccountMeta`]s
//     pub fn to_metas(&self) -> impl Iterator<Item = SolanaAccountMeta> + '_ {
//         once(self.signing_key.clone()).chain(self.extra_accounts.iter().cloned())
//     }
//
//     /// Returns the size of [`SigningKeyBuild::extra_accounts`]
//     pub fn extra_count(&self) -> u8 {
//         self.extra_accounts.len() as u8
//     }
//
//     /// Turns this into a [`SigningKeyData`]
//     pub fn to_data(&self) -> SigningKeyData {
//         SigningKeyData {
//             key: self.signing_key.pubkey,
//             extra_keys: self
//                 .extra_accounts
//                 .iter()
//                 .map(|account| account.pubkey)
//                 .collect(),
//         }
//     }
// }

