pub mod cryptid;
pub mod did;
pub mod util;

use crate::client::cryptid::{DefaultCryptidAccount, GenerativeCryptidAccount, OnChainCryptid};
use crate::client::did::{SigningDID, DID};
use crate::client::util::SendableOutput;
use crate::instruction::create_cryptid::{
    create_cryptid, upgrade_generative_cryptid, CreateCryptidArgs,
};
use crate::seeds::GenerativeCryptidSeeder;
use crate::state::{CryptidAccount, CryptidAccountList, MiddlewareCount};
use cruiser::account_list::AccountListItem;
use cruiser::account_types::system_program::SystemProgram;
use cruiser::compressed_numbers::CompressedNumber;
use cruiser::on_chain_size::OnChainSize;
use cruiser::pda_seeds::PDAGenerator;
use cruiser::program::Program;
use cruiser::Pubkey;
use solana_client::nonblocking::rpc_client::RpcClient;
use solana_sdk::account::Account;
use solana_sdk::commitment_config::CommitmentConfig;
use solana_sdk::entrypoint::MAX_PERMITTED_DATA_INCREASE;
use solana_sdk::signer::Signer;
use solana_sdk::system_instruction::create_account;
use solana_sdk::transaction::Transaction;
use std::error::Error;
use std::fmt::{Debug, Formatter};

pub struct CryptidInterface<S> {
    pub rpc_client: RpcClient,
    pub program_id: Pubkey,
    pub fee_payer: S,
    pub commitment: CommitmentConfig,
}
impl<S> Debug for CryptidInterface<S>
where
    S: Debug,
{
    fn fmt(&self, f: &mut Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("CryptidInterface")
            .field("program_id", &self.program_id)
            .field("fee_payer", &self.fee_payer)
            .field("commitment", &self.commitment)
            .finish_non_exhaustive()
    }
}

#[derive(Debug)]
pub struct CryptidClient<'a, S, D, C> {
    pub interface: &'a CryptidInterface<S>,
    pub did: D,
    pub cryptid_account: C,
}
impl<'a, S, D> CryptidClient<'a, S, D, DefaultCryptidAccount>
where
    D: DID,
{
    pub async fn fetch_default(
        interface: &'a CryptidInterface<S>,
        did: D,
    ) -> Result<CryptidClient<'a, S, D, DefaultCryptidAccount>, Box<dyn Error>> {
        let address = GenerativeCryptidSeeder {
            did_program: did.did_program(),
            did: did.key(),
        }
        .find_address(&interface.program_id);
        let account = interface
            .rpc_client
            .get_account_with_commitment(&address.0, interface.commitment)
            .await?
            .value
            .unwrap_or_else(|| Account {
                lamports: 0,
                data: vec![],
                owner: *SystemProgram::program_id(),
                executable: false,
                rent_epoch: 0,
            });
        let cryptid_account = if &account.owner == SystemProgram::program_id() {
            DefaultCryptidAccount::Generative(GenerativeCryptidAccount { key: address })
        } else if account.owner == interface.program_id {
            DefaultCryptidAccount::OnChain(OnChainCryptid::new(address.0))
        } else {
            panic!(
                "Account not owned by either program or system program. Owned by `{}`",
                account.owner
            );
        };
        Ok(CryptidClient {
            interface,
            did,
            cryptid_account,
        })
    }
}
impl<'a, S, D> CryptidClient<'a, S, D, GenerativeCryptidAccount>
where
    D: DID,
{
    pub fn init_generative(interface: &'a CryptidInterface<S>, did: D) -> Self {
        Self {
            cryptid_account: GenerativeCryptidAccount::new(
                &interface.program_id,
                did.did_program(),
                did.key(),
            ),
            interface,
            did,
        }
    }
}
impl<'a, S, D> CryptidClient<'a, S, D, GenerativeCryptidAccount>
where
    S: Signer,
    for<'b> D: SigningDID<'b>,
{
    pub async fn upgrade_generative(
        self,
        funder: &impl Signer,
        key_threshold: u8,
        max_middleware: u32,
    ) -> Result<SendableOutput<'a, CryptidClient<'a, S, D, OnChainCryptid>, S>, Box<dyn Error>>
    {
        let instruction = upgrade_generative_cryptid(CreateCryptidArgs {
            program_id: &self.interface.program_id,
            account: Some(self.cryptid_account.key),
            funder: &funder.pubkey(),
            did: self.did.key(),
            did_program: self.did.did_program(),
            signing_key: self.did.to_signing_key(),
            signer_nonce: None,
            key_threshold,
            max_middleware,
        })?;

        let mut signers = vec![&self.interface.fee_payer as &dyn Signer, funder];
        signers.extend(self.did.signers());
        dedup_signers(&mut signers);

        let transaction = Transaction::new_signed_with_payer(
            &[instruction],
            Some(&self.interface.fee_payer.pubkey()),
            &signers,
            self.interface.rpc_client.get_latest_blockhash().await?,
        );

        Ok(SendableOutput::new(
            CryptidClient {
                interface: self.interface,
                did: self.did,
                cryptid_account: OnChainCryptid::new(self.cryptid_account.key.0),
            },
            self.interface,
            transaction,
        ))
    }
}
impl<'a, S, D> CryptidClient<'a, S, D, OnChainCryptid>
where
    S: Signer,
    D: SigningDID<'a>,
{
    pub fn existing_on_chain(
        interface: &'a CryptidInterface<S>,
        did: D,
        cryptid_account: Pubkey,
    ) -> Self {
        Self {
            interface,
            did,
            cryptid_account: OnChainCryptid::new(cryptid_account),
        }
    }
}
impl<'a, S, D> CryptidClient<'a, S, D, OnChainCryptid>
where
    S: Signer,
    for<'b> D: SigningDID<'b>,
{
    pub async fn create_on_chain(
        interface: &'a CryptidInterface<S>,
        account: &dyn Signer,
        funder: &dyn Signer,
        did: D,
        key_threshold: u8,
        max_middleware: u32,
    ) -> Result<SendableOutput<'a, CryptidClient<'a, S, D, OnChainCryptid>, S>, Box<dyn Error>>
    {
        let account_size =
            <CryptidAccountList as AccountListItem<CryptidAccount>>::compressed_discriminant()
                .num_bytes() as usize
                + CryptidAccount::on_chain_max_size(MiddlewareCount(max_middleware as usize));
        let instructions = if account_size > MAX_PERMITTED_DATA_INCREASE {
            vec![create_cryptid(CreateCryptidArgs {
                program_id: &interface.program_id,
                account: &account.pubkey(),
                funder: &funder.pubkey(),
                did: did.key(),
                did_program: &sol_did::ID,
                signing_key: did.to_signing_key(),
                signer_nonce: None,
                key_threshold,
                max_middleware,
            })?]
        } else {
            vec![
                create_account(
                    &funder.pubkey(),
                    &account.pubkey(),
                    interface
                        .rpc_client
                        .get_minimum_balance_for_rent_exemption(account_size)
                        .await?,
                    account_size as u64,
                    &interface.program_id,
                ),
                create_cryptid(CreateCryptidArgs {
                    program_id: &interface.program_id,
                    account: &account.pubkey(),
                    funder: &funder.pubkey(),
                    did: did.key(),
                    did_program: &sol_did::ID,
                    signing_key: did.to_signing_key(),
                    signer_nonce: None,
                    key_threshold,
                    max_middleware,
                })?,
            ]
        };
        let mut signers = vec![&interface.fee_payer as &dyn Signer, funder];
        signers.extend(did.signers());
        dedup_signers(&mut signers);

        let blockhash = interface.rpc_client.get_latest_blockhash().await?;
        let transaction = Transaction::new_signed_with_payer(
            &instructions,
            Some(&interface.fee_payer.pubkey()),
            &signers,
            blockhash,
        );

        Ok(SendableOutput::new(
            Self {
                interface,
                did,
                cryptid_account: OnChainCryptid::new(account.pubkey()),
            },
            interface,
            transaction,
        ))
    }
}

/// Optimization to prevent multiple signature calculations, not required
fn dedup_signers(signers: &mut Vec<&dyn Signer>) {
    signers.dedup_by(|val1, val2| val1.pubkey() == val2.pubkey());
}
