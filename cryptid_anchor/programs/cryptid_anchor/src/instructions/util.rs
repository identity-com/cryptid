use anchor_lang::prelude::*;
use anchor_lang::ToAccountInfo;

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
            if !signing_key.signing_key.is_signer {
                let error: Box<dyn solana_generator::Error> = CryptidSignerError::KeyMustBeSigner {
                    key: signing_key.signing_key.key,
                }
                    .into();
                return Err(error);
            }
            // msg!("Key to verify: {:?}", signing_key.signing_key.key.to_string());
            // Safety: This is safe because the generated references are not leaked or used after another use of the value they came from
            unsafe {
                let controlling_did_accounts: Vec<solana_program::account_info::AccountInfo> =
                    signing_key
                        .extra_accounts
                        .iter()
                        .map(|info| info.to_solana_account_info())
                        .collect();
                // .map(Cow::Owned),

                let signer_is_authority = sol_did::is_authority(
                    &did.to_solana_account_info(),
                    controlling_did_accounts.as_slice(),
                    &signing_key.signing_key.key,
                    &[],
                    None,
                    None,
                )
                    .map_err(|error| -> Box<dyn solana_generator::Error> {
                        msg!("Error executing is_authority: {}", error);
                        CryptidSignerError::KeyCannotChangeTransaction {
                            key: signing_key.to_key_data(),
                        }
                            .into()
                    })?;

                if !signer_is_authority {
                    msg!("Signer is not an authority on the DID");
                    return Err(CryptidSignerError::KeyCannotChangeTransaction {
                        key: signing_key.to_key_data(),
                    }
                        .into());
                }
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