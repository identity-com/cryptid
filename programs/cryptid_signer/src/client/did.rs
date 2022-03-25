use crate::instruction::SigningKeyBuild;
use sol_did::solana_program::pubkey::Pubkey;
use solana_sdk::instruction::AccountMeta;
use solana_sdk::signature::Signer;
use std::iter::{once, Once};

pub trait DID {
    fn did_program(&self) -> &Pubkey;
    fn key(&self) -> &Pubkey;
    fn to_signing_key(&self) -> SigningKeyBuild;
}
pub trait SigningDID<'a>: DID {
    type Iter: Iterator<Item = &'a dyn Signer>;
    fn signers(&'a self) -> Self::Iter;
}

#[derive(Debug, Clone)]
pub struct SolDID {
    pub did: Pubkey,
    pub did_pda: (Pubkey, u8),
}
impl SolDID {
    pub fn new(did: Pubkey) -> Self {
        Self {
            did,
            did_pda: sol_did::state::get_sol_address_with_seed(&did),
        }
    }

    pub fn with_signer<S>(self, signer: S) -> SigningSolDID<S>
    where
        S: Signer,
    {
        SigningSolDID { signer, did: self }
    }

    pub fn controlled_by<D>(self, controller: D) -> ControlledSolDID<D> {
        ControlledSolDID {
            did: self,
            controller,
        }
    }
}
impl DID for SolDID {
    #[inline]
    fn did_program(&self) -> &Pubkey {
        &sol_did::ID
    }

    #[inline]
    fn key(&self) -> &Pubkey {
        &self.did_pda.0
    }

    fn to_signing_key(&self) -> SigningKeyBuild {
        SigningKeyBuild {
            key: AccountMeta::new_readonly(self.did, true),
            extras: vec![],
        }
    }
}

#[derive(Debug, Clone)]
pub struct SigningSolDID<S> {
    pub signer: S,
    pub did: SolDID,
}
impl<S> SigningSolDID<S>
where
    S: Signer,
{
    pub fn new(did: S) -> Self {
        Self {
            did: SolDID::new(did.pubkey()),
            signer: did,
        }
    }
}
impl<S> DID for SigningSolDID<S> {
    #[inline]
    fn did_program(&self) -> &Pubkey {
        &sol_did::ID
    }

    #[inline]
    fn key(&self) -> &Pubkey {
        self.did.key()
    }

    fn to_signing_key(&self) -> SigningKeyBuild {
        self.did.to_signing_key()
    }
}
impl<'a, S> SigningDID<'a> for SigningSolDID<S>
where
    S: Signer,
{
    type Iter = Once<&'a dyn Signer>;

    fn signers(&'a self) -> Self::Iter {
        once(&self.signer)
    }
}

#[derive(Debug, Clone)]
pub struct ControlledSolDID<D> {
    pub did: SolDID,
    pub controller: D,
}
impl DID for ControlledSolDID<SolDID> {
    #[inline]
    fn did_program(&self) -> &Pubkey {
        &sol_did::ID
    }

    #[inline]
    fn key(&self) -> &Pubkey {
        self.did.key()
    }

    fn to_signing_key(&self) -> SigningKeyBuild {
        let mut out = self.controller.to_signing_key();
        out.extras
            .push(AccountMeta::new_readonly(self.controller.did_pda.0, false));
        out
    }
}
impl<S> DID for ControlledSolDID<SigningSolDID<S>> {
    #[inline]
    fn did_program(&self) -> &Pubkey {
        &sol_did::ID
    }

    #[inline]
    fn key(&self) -> &Pubkey {
        self.did.key()
    }

    fn to_signing_key(&self) -> SigningKeyBuild {
        let mut out = self.controller.to_signing_key();
        out.extras.push(AccountMeta::new_readonly(
            self.controller.did.did_pda.0,
            false,
        ));
        out
    }
}
impl<'a, D> SigningDID<'a> for ControlledSolDID<D>
where
    ControlledSolDID<D>: DID,
    D: DID + SigningDID<'a>,
{
    type Iter = D::Iter;

    fn signers(&'a self) -> Self::Iter {
        self.controller.signers()
    }
}
impl<D> DID for ControlledSolDID<ControlledSolDID<D>>
where
    ControlledSolDID<D>: DID,
{
    #[inline]
    fn did_program(&self) -> &Pubkey {
        &sol_did::ID
    }

    #[inline]
    fn key(&self) -> &Pubkey {
        self.did.key()
    }

    fn to_signing_key(&self) -> SigningKeyBuild {
        let mut out = self.controller.to_signing_key();
        out.extras.push(AccountMeta::new_readonly(
            self.controller.did.did_pda.0,
            false,
        ));
        out
    }
}
