use crate::client::CryptidInterface;
use solana_client::rpc_config::RpcSendTransactionConfig;
use solana_sdk::commitment_config::CommitmentConfig;
use solana_sdk::hash::Hash;
use solana_sdk::signature::Signature;
use solana_sdk::transaction;
use solana_sdk::transaction::Transaction;
use std::error::Error;
use std::time::Duration;
use tokio::time::sleep;

#[derive(Debug)]
pub struct SendableTransaction<'a, S> {
    pub interface: &'a CryptidInterface<S>,
    pub transaction: Transaction,
}
impl<'a, S> SendableTransaction<'a, S> {
    pub async fn send(self) -> Result<ConfirmableSignature<'a, S>, Box<dyn Error>> {
        let signature = self
            .interface
            .rpc_client
            .send_transaction(&self.transaction)
            .await?;
        Ok(ConfirmableSignature {
            interface: self.interface,
            signature,
            blockhash: self.transaction.message.recent_blockhash,
        })
    }

    pub async fn send_with_config(
        self,
        config: RpcSendTransactionConfig,
    ) -> Result<ConfirmableSignature<'a, S>, Box<dyn Error>> {
        let signature = self
            .interface
            .rpc_client
            .send_transaction_with_config(&self.transaction, config)
            .await?;
        Ok(ConfirmableSignature {
            interface: self.interface,
            signature,
            blockhash: self.transaction.message.recent_blockhash,
        })
    }

    pub async fn send_and_confirm(self) -> Result<Signature, Box<dyn Error>> {
        Ok(self
            .interface
            .rpc_client
            .send_and_confirm_transaction(&self.transaction)
            .await?)
    }
}

#[derive(Debug)]
pub struct ConfirmableSignature<'a, S> {
    pub interface: &'a CryptidInterface<S>,
    pub signature: Signature,
    pub blockhash: Hash,
}
impl<'a, S> ConfirmableSignature<'a, S> {
    #[inline]
    pub async fn confirm(self) -> Result<(Signature, transaction::Result<()>), Box<dyn Error>> {
        self.confirm_with_frequency(Duration::from_millis(500))
            .await
    }

    #[inline]
    pub async fn confirm_with_frequency(
        self,
        poll_frequency: Duration,
    ) -> Result<(Signature, transaction::Result<()>), Box<dyn Error>> {
        let commitment = self.interface.commitment;
        self.confirm_with_commitment(poll_frequency, commitment)
            .await
    }

    pub async fn confirm_with_commitment(
        self,
        poll_frequency: Duration,
        commitment: CommitmentConfig,
    ) -> Result<(Signature, transaction::Result<()>), Box<dyn Error>> {
        loop {
            if let Some(status) = self
                .interface
                .rpc_client
                .get_signature_status_with_commitment(&self.signature, self.interface.commitment)
                .await?
            {
                return Ok((self.signature, status));
            }
            sleep(poll_frequency).await;
            if !self
                .interface
                .rpc_client
                .is_blockhash_valid(&self.blockhash, commitment)
                .await?
            {
                return Err("Blockhash is no longer valid".into());
            }
        }
    }
}

#[derive(Debug)]
pub struct SendableOutput<'a, T, S> {
    pub output: T,
    pub transaction: SendableTransaction<'a, S>,
}
impl<'a, T, S> SendableOutput<'a, T, S> {
    pub fn new(output: T, interface: &'a CryptidInterface<S>, transaction: Transaction) -> Self {
        Self {
            output,
            transaction: SendableTransaction {
                interface,
                transaction,
            },
        }
    }
}
