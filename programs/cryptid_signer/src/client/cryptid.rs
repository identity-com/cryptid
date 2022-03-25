use crate::seeds::GenerativeCryptidSeeder;
use cruiser::pda_seeds::PDAGenerator;
use cruiser::Pubkey;

pub trait CryptidAccount {
    fn pubkey(&self) -> &Pubkey;
}

#[derive(Debug, Clone)]
pub enum DefaultCryptidAccount {
    Generative(GenerativeCryptidAccount),
    OnChain(OnChainCryptid),
}
impl CryptidAccount for DefaultCryptidAccount {
    fn pubkey(&self) -> &Pubkey {
        match self {
            DefaultCryptidAccount::Generative(account) => account.pubkey(),
            DefaultCryptidAccount::OnChain(account) => account.pubkey(),
        }
    }
}

#[derive(Debug, Clone)]
pub struct GenerativeCryptidAccount {
    pub key: (Pubkey, u8),
}
impl GenerativeCryptidAccount {
    pub fn new(program_id: &Pubkey, did_program: &Pubkey, did: &Pubkey) -> Self {
        Self {
            key: GenerativeCryptidSeeder { did_program, did }.find_address(program_id),
        }
    }
}
impl CryptidAccount for GenerativeCryptidAccount {
    fn pubkey(&self) -> &Pubkey {
        &self.key.0
    }
}

#[derive(Debug, Clone)]
pub struct OnChainCryptid {
    pub key: Pubkey,
}
impl OnChainCryptid {
    pub fn new(key: Pubkey) -> Self {
        Self { key }
    }
}
impl CryptidAccount for OnChainCryptid {
    fn pubkey(&self) -> &Pubkey {
        &self.key
    }
}
