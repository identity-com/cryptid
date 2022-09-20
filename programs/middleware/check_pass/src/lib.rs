extern crate core;

use anchor_lang::prelude::*;
use anchor_lang::solana_program::program::invoke;
use cryptid::cpi::accounts::ApproveExecution;
use cryptid::program::Cryptid;
use cryptid::state::transaction_account::TransactionAccount;
use num_traits::cast::AsPrimitive;
use sol_did::state::DidAccount;
use solana_gateway::instruction::expire_token;
use solana_gateway::state::GatewayToken;
use solana_gateway::Gateway;
use std::str::FromStr;

declare_id!("midpT1DeQGnKUjmGbEtUMyugXL5oEBeXU3myBMntkKo");

#[derive(Debug, Clone)]
pub struct GatewayProgram;

impl Id for GatewayProgram {
    fn id() -> Pubkey {
        Pubkey::from_str("gatem74V238djXdzWnJf94Wo1DcnuGkfijbf3AuBhfs").unwrap()
    }
}

#[program]
pub mod check_pass {
    use super::*;
    use cryptid::instructions::util::verify_keys;
    use solana_gateway::Gateway;

    pub fn create(
        ctx: Context<Create>,
        gatekeeper_network: Pubkey,
        bump: u8,
        expire_on_use: bool,
    ) -> Result<()> {
        ctx.accounts.middleware_account.gatekeeper_network = gatekeeper_network;
        ctx.accounts.middleware_account.authority = ctx.accounts.authority.key();
        ctx.accounts.middleware_account.bump = bump;
        ctx.accounts.middleware_account.expire_on_use = expire_on_use;
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
                    verify_keys(did, &gateway_token.owner_wallet, controlling_did_accounts)
                        .map_err(|_| -> ErrorCode { ErrorCode::InvalidPassAuthority })?;
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
            lamports,
        )?;

        if ctx.accounts.middleware_account.expire_on_use {
            msg!("Expiring the gateway token");
            // Expire the gateway token
            // Note - this requires that the signer of this transaction is the owner of the gateway token
            // As only the owner can execute the expire instruction
            require_keys_eq!(
                ctx.accounts.authority.key(),
                gateway_token.owner_wallet,
                ErrorCode::InvalidPassAuthority
            );
            ExecuteMiddleware::expire_token(&ctx)?;
        }

        ExecuteMiddleware::approve(ctx)
    }
}

#[derive(Accounts)]
#[instruction(
/// The gatekeeper_network that passes must belong to
gatekeeper_network: Pubkey,
/// The bump seed for the middleware signer
bump: u8,
/// Expire a gateway token after it has been used
expire_on_use: bool
)]
pub struct Create<'info> {
    #[account(
    init,
    payer = authority,
    space = 8 + CheckPass::MAX_SIZE,
    seeds = [CheckPass::SEED_PREFIX, authority.key().as_ref(), gatekeeper_network.key().as_ref()],
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
    /// An authority on the DID.
    /// This is only needed for the expireOnUse case. In this case, the authority must be the owner
    /// of the gateway token.
    pub authority: Signer<'info>,
    /// The gatekeeper network expire feature
    /// Used only on the expireOnUse case.
    /// CHECK: The PDA derivation is checked by the Gateway program
    pub expire_feature_account: UncheckedAccount<'info>,
    /// The gateway token for the transaction
    /// Must be owned by the owner of the transaction
    /// CHECK: Constraints are checked by the gateway sdk
    #[account(mut)]
    pub gateway_token: UncheckedAccount<'info>,
    pub cryptid_program: Program<'info, Cryptid>,
    pub gateway_program: Program<'info, GatewayProgram>,
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
        let authority_key = ctx.accounts.middleware_account.authority.key();
        let gatekeeper_network_key = ctx.accounts.middleware_account.gatekeeper_network.key();
        let bump = ctx.accounts.middleware_account.bump.to_le_bytes();
        let seeds = &[
            CheckPass::SEED_PREFIX,
            authority_key.as_ref(),
            gatekeeper_network_key.as_ref(),
            bump.as_ref(),
        ][..];
        let signer = &[seeds][..];
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
        cryptid::cpi::approve_execution(cpi_ctx)
    }

    pub fn verify_gateway_token_state_and_gatekeeper_network(
        gateway_token: &GatewayToken,
        expected_gatekeeper_network: &Pubkey,
        expected_balance: u64,
    ) -> Result<()> {
        // We are using `verify_gateway_token` here rather than the more convenient `verify_gateway_token_account_info`
        // to avoid reparsing the gateway token.
        // TODO - ideally the Gateway SDK would be DID-aware and we could just make a single call to `verify_gateway_token_account_info`
        Gateway::verify_gateway_token(
            gateway_token,
            &gateway_token.owner_wallet, // Do not check the owner here. It may be a DID or a key on a DID.
            expected_gatekeeper_network,
            // parameters required when using verify_gateway_token as opposed to verify_gateway_token_account_info
            expected_balance,
            None,
        )
        .map_err(|_| error!(ErrorCode::InvalidPass))
    }

    pub fn expire_token(ctx: &Context<ExecuteMiddleware>) -> Result<()> {
        let instruction = expire_token(
            ctx.accounts.gateway_token.key(),
            ctx.accounts.authority.key(),
            ctx.accounts.middleware_account.gatekeeper_network,
        );

        invoke(
            &instruction,
            &[
                ctx.accounts.gateway_token.to_account_info(),
                ctx.accounts.authority.to_account_info(),
                ctx.accounts.expire_feature_account.to_account_info(),
                ctx.accounts.gateway_program.to_account_info(),
            ],
        )
        .map_err(|_| error!(ErrorCode::ExpiryError))
    }
}

#[account()]
pub struct CheckPass {
    pub gatekeeper_network: Pubkey,
    pub authority: Pubkey,
    pub bump: u8,
    pub expire_on_use: bool,
}
impl CheckPass {
    pub const SEED_PREFIX: &'static [u8] = b"check_pass";

    pub const MAX_SIZE: usize = 32 + 32 + 1 + 1;
}

#[error_code]
pub enum ErrorCode {
    #[msg("The provided pass is not valid")]
    InvalidPass,
    #[msg("The provided pass is not owned by a key on the transaction owner DID")]
    InvalidPassAuthority,
    #[msg("An error occured when expiring the single-use gateway token")]
    ExpiryError,
}
