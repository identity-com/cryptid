use anchor_lang::prelude::*;
use std::str::FromStr;

pub const DISCRIMINATOR_SIZE: usize = 8;

#[derive(Debug, Clone)]
pub struct SolDID;

impl Id for SolDID {
    fn id() -> Pubkey {
        Pubkey::from_str("didso1Dpqpm4CsiCjzP766BGY89CAdD6ZBL68cRhFPc").unwrap()
    }
}