use crate::error::CryptidError;
use crate::state::cryptid_account::CryptidAccount;
use crate::state::did_reference::DIDReference;
use crate::util::SolDID;
use anchor_lang::prelude::*;
use anchor_lang::prelude::Error::AnchorError;
use bitflags::bitflags;
use num_traits::cast::ToPrimitive;
use sol_did::state::VerificationMethodType;

/// A trait that extracts all accounts from an anchor instruction context, combining
pub trait AllAccounts<'a, 'b, 'c, 'info> {
    fn all_accounts(&self) -> Vec<&AccountInfo<'info>>;
    fn get_accounts_by_indexes(&self, indexes: &[u8]) -> Result<Vec<&AccountInfo<'info>>>;
}

pub fn resolve_by_index<'c, 'info>(
    indexes: &[u8],
    accounts: &Vec<&'c AccountInfo<'info>>,
) -> Result<Vec<&'c AccountInfo<'info>>> {
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
        self.to_account_info()
            .try_borrow_lamports()
            .unwrap()
            .to_u64()
            .unwrap()
            == 0
            && *self.to_account_info().owner == System::id()
    }
}

/// Verifies that the signer has the permission to sign for the DID
/// If the controller-chain is empty, it expects the signer to be a key on the did itself
/// Otherwise, the signer is a signer on a controller of the DID (either directly or indirectly)
pub fn verify_keys<'info1, 'info2>(
    did: &AccountInfo<'info1>,
    did_account_bump: Option<u8>,
    signer: &Pubkey,
    controlling_did_accounts: Vec<(&AccountInfo<'info2>, Pubkey)>,
) -> Result<()> {
    let signer_is_authority = sol_did::integrations::is_authority(
        did,
        did_account_bump,
        controlling_did_accounts.as_slice(),
        &signer.to_bytes(),
        Some(&[VerificationMethodType::Ed25519VerificationKey2018]),
        None,
    )
    .map_err(|error| -> CryptidError {
        msg!("Error executing is_authority: {}", error);
        CryptidError::KeyMustBeSigner
    })?;

    if !signer_is_authority {
        msg!("Signer is not an authority on the DID");
        return err!(CryptidError::KeyMustBeSigner);
    }
    Ok(())
}

/// Check that the authority is allowed to access the cryptid account
/// And if so, return it
pub fn get_cryptid_account_checked<'info>(
    all_accounts: &[&AccountInfo],
    controller_chain: &[DIDReference],
    cryptid_account: &UncheckedAccount<'info>,
    did: &UncheckedAccount<'info>,
    did_program: &Program<'info, SolDID>,
    authority: &Signer<'info>,
    did_account_bump: u8,
    cryptid_account_index: u32,
    cryptid_account_bump: u8,
    allow_unauthorized_signer: bool,
) -> Result<CryptidAccount> {
    // Check that the authority has permissions on the DID

    // convert the controller chain (an array of account indices) into an array of accounts
    // note - cryptid does not need to check that the chain is valid, or even that they are DIDs
    // sol_did does that.
    let controlling_did_accounts = controller_chain
        .iter()
        .map(|controller_reference| {
            (
                all_accounts[controller_reference.account_index as usize],
                controller_reference.authority_key,
            )
        })
        .collect::<Vec<(&AccountInfo, Pubkey)>>();

    // Perform seed verification here
    let cryptid_account_obj = CryptidAccount::try_from(
        cryptid_account,
        &did_program.key(),
        &did.key(),
        cryptid_account_index,
        cryptid_account_bump,
    )?;

    // Assume at this point that anchor has verified the cryptid account and did account (but not the controller chain)
    // We now need to verify that the signer (at the moment, only one is supported) is a valid signer for the cryptid account
    verify_keys(
        did,
        Some(did_account_bump),
        authority.to_account_info().key,
        controlling_did_accounts,
    ).or_else(|error| {
        if allow_unauthorized_signer && !cryptid_account_obj.superuser_middleware.is_empty() {
            match &error {
                AnchorError(x) => {
                    if x.error_code_number == CryptidError::KeyMustBeSigner.into() {
                        msg!("Signer is not an authority on the DID, but the cryptid account has a superuser middleware. Allowing the transaction.");
                        Ok(())
                    } else {
                        Err(error)
                    }
                },
                _ => Err(error),
            }
        } else {
            msg!("Signer is not an authority on the DID and the cryptid account has no superuser middleware. Rejecting transaction.");
            msg!("Allow unauthorized: {}", allow_unauthorized_signer);
            msg!("Superuser middleware: {:?}", cryptid_account_obj.superuser_middleware);
            Err(error)
        }
    })?;

    Ok(cryptid_account_obj)
}

bitflags! {
    /// Extra flags passed to execution instructions
    #[derive(AnchorDeserialize, AnchorSerialize)]
    pub struct ExecuteFlags: u8{
        /// Print debug logs, uses a large portion of the compute budget
        const DEBUG = 1 << 0;
    }
}

/// The index of the authority key in the accounts array of an instruction
/// This is a slightly "special" key as it is the only one that is allowed to change
/// between "propose" and "execute".
/// As long as the authority is valid for the DID, any authority can sign the transaction.
pub const AUTHORITY_ACCOUNT_INDEX: usize = 3;
