//! Default logging:
//! `RUST_LOG=solana_rbpf::vm=debug,solana_runtime::message_processor=debug,solana_runtime::system_instruction_processor=trace,solana_program_test=info`

pub extern crate rand;

use array_init::array_init;
use log::{info, trace};
use rand::{random, CryptoRng, RngCore, SeedableRng};
use rand_chacha::ChaCha20Rng;
use solana_program_test::{BanksClient, ProgramTest};
use solana_sdk::hash::Hash;
use solana_sdk::pubkey::Pubkey;
use solana_sdk::signature::Signer;
use solana_sdk::signer::keypair::Keypair;
use std::array::IntoIter;
use std::collections::HashMap;

pub async fn start_tests<const N: usize>(
    log_target: &'static str,
    programs: [&'static str; N],
) -> (
    BanksClient,
    Keypair,
    Hash,
    impl SeedableRng + CryptoRng + RngCore,
    [Pubkey; N],
) {
    let (test, program_map, rng) = generate_test(log_target, programs);

    let (banks, funder, genesis_hash) = test.start().await;
    trace!(target: log_target, "funder: {}", funder.pubkey());
    let mut programs_iter = IntoIter::new(programs);

    (
        banks,
        funder,
        genesis_hash,
        rng,
        array_init(|_| {
            let program = programs_iter.next().unwrap();
            *program_map
                .get(program)
                .unwrap_or_else(|| panic!("Could not find program `{}`", program))
        }),
    )
}

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

pub fn generate_test<const N: usize>(
    log_target: &'static str,
    programs: [&'static str; N],
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

    for program in programs.iter() {
        program_map.insert(
            *program,
            add_program(&mut rng, &mut test, program, log_target),
        );
    }
    (test, program_map, rng)
}
