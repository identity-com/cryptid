use solana_generator::program;

#[program]
pub mod cool_program {
    pub fn print_x(accounts: u8) -> u8 {
        accounts
    }
}
