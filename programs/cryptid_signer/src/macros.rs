macro_rules! doa_signer_seeds {
    ($doa_key:expr) => {
        &[$crate::DOA_SIGNER_SEED, &$doa_key.to_bytes()]
    };
    ($doa_key:expr, $doa_signer_nonce:expr) => {
        &[
            $crate::DOA_SIGNER_SEED,
            &$doa_key.to_bytes(),
            &[$doa_signer_nonce],
        ]
    };
}
