extern crate core;

use anchor_lang::prelude::*;
use cryptid_anchor::cpi::accounts::ApproveExecution;
use cryptid_anchor::program::CryptidAnchor;
use cryptid_anchor::state::transaction_account::TransactionAccount;
use solana_gateway::Gateway;
use solana_gateway::state::GatewayToken;
use sol_did::state::DidAccount;
use num_traits::cast::AsPrimitive;

declare_id!("midpT1DeQGnKUjmGbEtUMyugXL5oEBeXU3myBMntkKo");
#[program]
pub mod check_pass {
    use super::*;
    use solana_gateway::Gateway;
    use cryptid_anchor::instructions::util::verify_keys;

    pub fn create(ctx: Context<Create>, gatekeeper_network: Pubkey, bump: u8) -> Result<()> {
        ctx.accounts.middleware_account.gatekeeper_network = gatekeeper_network;
        ctx.accounts.middleware_account.bump = bump;
        Ok(())
    }

    pub fn execute_middleware(ctx: Context<ExecuteMiddleware>) -> Result<()> {
        let did = &ctx.accounts.owner;

        // We check if either
        // a) the DID is the owner of the GT or
        // b) the owner of the GT is a signer on the DID
        // TODO - this should be in the gateway SDK.
        let gateway_token_info = &ctx.accounts.gateway_token.to_account_info();
        let gateway_token = Gateway::parse_gateway_token(gateway_token_info)
            .map_err(|_| error!(ErrorCode::InvalidPass))?;

        match gateway_token.owner_identity {
            None => {
                // No owner DID on the Gateway Token.
                // No problem, the DID can still claim this gateway token, if the owner wallet
                // is an authority on the DID, or if the did is the the "owner_wallet"

                if gateway_token.owner_wallet != did.key() {
                    // The owner wallet is not the DID, so we check if the DID is a signer on the owner wallet
                    // TODO support controller relationships?
                    let controlling_did_accounts = vec![];
                    verify_keys(
                        &did,
                        &gateway_token.owner_wallet,
                        controlling_did_accounts,
                    ).map_err(|_| -> ErrorCode {
                        ErrorCode::InvalidPassAuthority
                    })?;
                }
            }
            Some(owner_did) => {
                // The Gateway Token has an owner DID.
                // The DID must be the owner of the Gateway Token
                require_keys_eq!(owner_did, did.key(), ErrorCode::InvalidPass);
            }
        }

        // Now we have verified ownership, check that the gateway token itself is valid
        let lamports: u64 = gateway_token_info.lamports.borrow().as_();
        ExecuteMiddleware::verify_gateway_token_state_and_gatekeeper_network(
            &gateway_token,
            &ctx.accounts.middleware_account.gatekeeper_network,
            lamports
        )?;

        ExecuteMiddleware::approve(ctx)
    }
}

#[derive(Accounts)]
#[instruction(
/// The gatekeeper_network that passes must belong to
gatekeeper_network: Pubkey,
/// The bump seed for the middleware signer
bump: u8
)]
pub struct Create<'info> {
    #[account(
    init,
    payer = authority,
    space = 8 + CheckPass::MAX_SIZE,
    seeds = [CheckPass::SEED_PREFIX, gatekeeper_network.key().as_ref()],
    bump,
    )]
    pub middleware_account: Account<'info, CheckPass>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ExecuteMiddleware<'info> {
    #[account()]
    pub middleware_account: Account<'info, CheckPass>,
    #[account(
        mut,
        has_one = owner,
    )]
    pub transaction_account: Account<'info, TransactionAccount>,
    /// The owner of the Cryptid instance, typically a DID account
    /// Passed here so that the DID document can be parsed.
    /// The gateway token can be on any key provably owned by the DID.
    #[account()]
    pub owner: Account<'info, DidAccount>, // TODO allow generative/non-generative
    /// The gateway token for the transaction
    /// Must be owned by the owner of the transaction
    /// CHECK: Constraints are checked by the gateway sdk
    gateway_token: UncheckedAccount<'info>,
    pub cryptid_program: Program<'info, CryptidAnchor>,
}
impl<'info> ExecuteMiddleware<'info> {
    // TODO abstract this into shared?
    pub fn approve(ctx: Context<ExecuteMiddleware>) -> Result<()> {
        let cpi_program = ctx.accounts.cryptid_program.to_account_info();
        let cpi_accounts = ApproveExecution {
            middleware_account: ctx.accounts.middleware_account.to_account_info(),
            transaction_account: ctx.accounts.transaction_account.to_account_info(),
        };
        // define seeds inline here rather than extract to a function
        // in order to avoid having to convert Vec<Vec<u8>> to &[&[u8]]
        let gatekeeper_network_key = ctx.accounts.middleware_account.gatekeeper_network.key();
        let bump = ctx.accounts.middleware_account.bump.to_le_bytes();
        let seeds = &[
            CheckPass::SEED_PREFIX,
            gatekeeper_network_key.as_ref(),
            bump.as_ref(),
        ][..];
        let signer = &[seeds][..];
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
        cryptid_anchor::cpi::approve_execution(cpi_ctx)
    }

    pub fn verify_gateway_token_state_and_gatekeeper_network(gateway_token: &GatewayToken, expected_gatekeeper_network: &Pubkey, expected_balance: u64) -> Result<()> {
        msg!("Verifying gateway token state");
        msg!("State: {:?}", gateway_token.state);

        // We are using `verify_gateway_token` here rather than the more convenient `verify_gateway_token_account_info`
        // to avoid reparsing the gateway token.
        // TODO - ideally the Gateway SDK would be DID-aware and we could just make a single call to `verify_gateway_token_account_info`
        Gateway::verify_gateway_token(
            gateway_token,
            &gateway_token.owner_wallet,    // Do not check the owner here. It may be a DID or a key on a DID.
            expected_gatekeeper_network,
            // parameters required when using verify_gateway_token as opposed to verify_gateway_token_account_info
            expected_balance,
            None,
        )
            .map_err(|_| error!(ErrorCode::InvalidPass))
    }
}

#[account()]
pub struct CheckPass {
    pub gatekeeper_network: Pubkey,
    pub bump: u8,
}
impl CheckPass {
    pub const SEED_PREFIX: &'static [u8] = b"check_pass";

    pub const MAX_SIZE: usize = 32 + 1;
}

#[error_code]
pub enum ErrorCode {
    #[msg("The provided pass is not valid")]
    InvalidPass,
    #[msg("The provided pass is not owned by a key on the transaction owner DID")]
    InvalidPassAuthority,
}
