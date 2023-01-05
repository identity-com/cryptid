use anchor_lang::prelude::*;

/// A struct that represents a DID, eg for use in a controller chain in a cryptid instruction
/// The account index is the index of the did account in the all_accounts array.
/// The DID may be generative or non-generative.
/// In the generative case, the did_account provides no information, as it is empty and owned
/// by the system program.
/// Therefore, the authority key is also needed in order to derive the did account with the correct identifier etc.
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct DIDReference {
    /// The index in the all_accounts array for the DID Account
    pub account_index: u8,
    /// The did authority key (did:sol:<authority_key>).
    pub authority_key: Pubkey,
}
