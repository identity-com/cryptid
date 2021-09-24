use log::info;
use rand::{random, CryptoRng, RngCore, SeedableRng};
use rand_chacha::ChaCha20Rng;
use solana_generator::Pubkey;
use solana_program_test::ProgramTest;
use solana_sdk::signature::Signer;
use solana_sdk::signer::keypair::Keypair;
use std::collections::HashMap;

pub fn get_rng(log_target: &'static str, seed: Option<u64>) -> ChaCha20Rng {
    let seed = seed.unwrap_or_else(random);
    info!(target: log_target, "seed: {}", seed);
    ChaCha20Rng::seed_from_u64(seed)
}

pub fn add_program<'a>(
    rng: &mut (impl SeedableRng + CryptoRng + RngCore),
    test: &'a mut ProgramTest,
    program_name: &'static str,
    log_target: &'static str,
) -> Pubkey {
    let program_id = Keypair::generate(rng).pubkey();
    test.add_program(program_name, program_id, None);
    info!(
        target: log_target,
        "{} program_id: {}", program_name, program_id
    );
    program_id
}

pub fn generate_test(
    log_target: &'static str,
    programs: &[&'static str],
) -> (
    ProgramTest,
    HashMap<&'static str, Pubkey>,
    impl SeedableRng + CryptoRng + RngCore,
) {
    let mut test = ProgramTest::default();
    let mut rng = get_rng(
        log_target,
        option_env!("TEST_SEED").map(|env| env.parse().expect("TEST_SEED Not integer")),
    );
    let mut program_map = HashMap::new();

    for program in programs {
        program_map.insert(
            *program,
            add_program(&mut rng, &mut test, program, log_target),
        );
    }
    (test, program_map, rng)
}
