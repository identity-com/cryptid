use anchor_lang::prelude::*;
use anchor_lang::ToAccountInfo;
use sol_did::state::DidAccount;
use crate::error::CryptidSignerError;

impl AllAccounts for Context<'_, '_, '_, '_, _> {
    fn all_accounts(&self) -> Vec<AccountInfo> {
        self.accounts.iter().collect::<Vec<_>>().into().append(self.remaining_accounts.into_vec())
    }
}

/// Verifies that the signer has the permission to sign for the DID
/// If the controller-chain is empty, it expects the signer to be a key on the did itself
/// Otherwise, the signer is a signer on a controller of the DID (either directly or indirectly)
pub fn verify_keys<'a>(
    did: &DidAccount,
    signer: &Signer,
    accounts: &[AccountInfo<'a>],
    controller_chain: &[u8]
) -> Result<()> {
    // convert the controller chain (an array of account indices) into an array of accounts
    // note - cryptid does not need to check that the chain is valid, or even that they are DIDs
    // sol_did does that
    let controlling_did_accounts: Vec<AccountInfo> =
        resolve_account_indexes(controller_chain, accounts)?;

    let signer_is_authority = sol_did::is_authority(
        &did.to_solana_account_info(),
        controlling_did_accounts.as_slice(),
        &signing_key.signing_key.key,
        &[],
        None,
        None,
    )
        .map_err(|error| -> CryptidSignerError {
            msg!("Error executing is_authority: {}", error);
            CryptidSignerError::KeyCannotChangeTransaction
        })?;

    if !signer_is_authority {
        msg!("Signer is not an authority on the DID");
        return err!(CryptidSignerError::KeyCannotChangeTransaction);
    }
    Ok(())
}

pub fn resolve_account_indexes(
    account_indexes: &[u8],
    accounts: &[AccountInfo],
) -> Result<Vec<AccountInfo>> {
    let mut resolved_accounts = Vec::new();
    for account_index in account_indexes {
        let account_index = account_index.to_usize()?;
        if account_index >= accounts.len() {
            msg!("Account index {} out of bounds", account_index);
            return err!(CryptidSignerError::IndexOutOfRange);
        }
        resolved_accounts.push(accounts[account_index].to_solana_account_info());
    }
    Ok(resolved_accounts)
}


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

/// A trait that indicates if an account represents a generative account (e.g. a Generative DID or Cryptid account)
/// By Generative, we mean that the account is not on chain, but derived from a public key and has default properties.
trait IsGenerative {
    fn is_generative(&self) -> bool;
}

impl IsGenerative for Account<'_, T> {
    fn is_generative(&self) -> bool {
        self.to_account_info().try_borrow_lamports().unwrap() == 0 && self.to_account_info().owner == System::id()
    }
}