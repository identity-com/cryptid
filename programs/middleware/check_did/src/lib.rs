#![allow(clippy::result_large_err)]
extern crate core;

use anchor_lang::prelude::*;
use cryptid::cpi::accounts::ApproveExecution;
use cryptid::error::CryptidError;
use cryptid::program::Cryptid;
use cryptid::state::transaction_account::TransactionAccount;
use num_traits::*;
use sol_did::errors::DidSolError;
use sol_did::state::{DidAccount, VerificationMethodFlags, VerificationMethodType};

declare_id!("midb3GKX7wF1minPXeDKqGRKCK9NeR8ns9V8BQUMJDr");

#[program]
pub mod check_did {
    use super::*;
    use sol_did::state::{DidAccount, VerificationMethodType};

    pub fn create(
        ctx: Context<Create>,
        verification_method_matcher: VerificationMethodMatcher,
        service_matcher: ServiceMatcher,
        controller_matcher: ControllerMatcher,
        previous_middleware: Option<Pubkey>,
    ) -> Result<()> {
        ctx.accounts.middleware_account.verification_method_matcher = verification_method_matcher;
        ctx.accounts.middleware_account.service_matcher = service_matcher;
        ctx.accounts.middleware_account.controller_matcher = controller_matcher;

        ctx.accounts.middleware_account.authority = ctx.accounts.authority.key();
        ctx.accounts.middleware_account.bump = *ctx.bumps.get("middleware_account").unwrap();
        ctx.accounts.middleware_account.previous_middleware = previous_middleware;

        Ok(())
    }

    pub fn execute_middleware(ctx: Context<ExecuteMiddleware>) -> Result<()> {
        // Check the previous middleware has passed the transaction
        if let Some(required_previous_middleware) =
            ctx.accounts.middleware_account.previous_middleware
        {
            match ctx.accounts.transaction_account.approved_middleware {
                None => err!(CryptidError::IncorrectMiddleware),
                Some(approved_previous_middleware) => {
                    require_keys_eq!(
                        required_previous_middleware,
                        approved_previous_middleware,
                        CryptidError::IncorrectMiddleware
                    );
                    Ok(())
                }
            }?;
        }

        let did = &ctx.accounts.did;
        let authority = &ctx.accounts.authority.key();

        let did = DidAccount::try_from(did, authority, None)?;
        let authority_exists = did
            .find_authority(
                &authority.to_bytes(),
                Some(&[VerificationMethodType::Ed25519VerificationKey2018]),
                None,
            )
            .is_some();

        if !authority_exists {
            return Err(error!(DidSolError::WrongAuthorityForDid));
        }

        // Check Matchers
        let verification_method_result = ctx
            .accounts
            .middleware_account
            .verification_method_matcher
            .match_account(&did);
        if !verification_method_result {
            return Err(error!(ErrorCode::VerificationMethodMatcherError));
        }

        let service_result = ctx
            .accounts
            .middleware_account
            .service_matcher
            .match_account(&did);
        if !service_result {
            return Err(error!(ErrorCode::ServiceMatcherError));
        }

        let controller_result = ctx
            .accounts
            .middleware_account
            .controller_matcher
            .match_account(&did);
        if !controller_result {
            return Err(error!(ErrorCode::ControllerMatcherError));
        }

        ExecuteMiddleware::approve(ctx)
    }
}

#[derive(Accounts)]
#[instruction(
// Matcher for Verification Methods
verification_method_matcher: VerificationMethodMatcher,
// Matcher for Services
service_matcher: ServiceMatcher,
// Matcher for Controllers
controller_matcher: ControllerMatcher,
/// The previous middleware account, if any.
previous_middleware: Option<Pubkey>
)]
pub struct Create<'info> {
    #[account(
    init,
    payer = authority,
    space = 8 + CheckDid::INITIAL_SIZE + verification_method_matcher.size() + service_matcher.size() + controller_matcher.size(),
    seeds = [
        CheckDid::SEED_PREFIX,
        authority.key().as_ref(),
        previous_middleware.as_ref().map(|p| p.as_ref()).unwrap_or(&[0u8; 32])
    ],
    bump,
    )]
    pub middleware_account: Account<'info, CheckDid>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ExecuteMiddleware<'info> {
    #[account()]
    pub middleware_account: Account<'info, CheckDid>,
    #[account(
        mut,
        has_one = did,
    )]
    pub transaction_account: Account<'info, TransactionAccount>,
    /// The owner of the Cryptid instance, typically a DID account
    /// Passed here so that the DID document can be parsed.
    /// The gateway token can be on any key provably owned by the DID.
    /// CHECK: DID Account can be generative or not
    #[account()]
    pub did: UncheckedAccount<'info>,
    /// An authority on the DID.
    pub authority: Signer<'info>,
    /// The gateway token for the transaction
    /// Must be owned by the owner of the transaction
    /// CHECK: Constraints are checked by the gateway sdk
    pub cryptid_program: Program<'info, Cryptid>,
}

impl<'info> ExecuteMiddleware<'info> {
    pub fn approve(ctx: Context<ExecuteMiddleware>) -> Result<()> {
        let cpi_program = ctx.accounts.cryptid_program.to_account_info();
        let cpi_accounts = ApproveExecution {
            middleware_account: ctx.accounts.middleware_account.to_account_info(),
            transaction_account: ctx.accounts.transaction_account.to_account_info(),
        };
        // define seeds inline here rather than extract to a function
        // in order to avoid having to convert Vec<Vec<u8>> to &[&[u8]]
        let authority_key = ctx.accounts.middleware_account.authority.key();
        let bump = ctx.accounts.middleware_account.bump.to_le_bytes();
        let seeds = &[
            CheckDid::SEED_PREFIX,
            authority_key.as_ref(),
            ctx.accounts
                .middleware_account
                .previous_middleware
                .as_ref()
                .map(|p| p.as_ref())
                .unwrap_or(&[0u8; 32]),
            bump.as_ref(),
        ][..];
        let signer = &[seeds][..];
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
        cryptid::cpi::approve_execution(cpi_ctx)
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct VerificationMethodMatcher {
    // TODO: Cannot use external types in IDL
    // IdlError: Type not found: {"type":{"defined":"VerificationMethodType"}}
    // pub filter_types: Option<Vec<VerificationMethodType>>,
    pub filter_types: Option<Vec<u8>>,
    pub filter_flags: Option<u16>,
    pub filter_key_data: Option<Vec<u8>>,
    pub filter_fragment: Option<String>,
}

impl VerificationMethodMatcher {
    pub const INITIAL_SIZE: usize = 4; // 4 * Option

    pub fn match_account(&self, account: &DidAccount) -> bool {
        if self.is_empty() {
            return true;
        }

        // Map to Option<Vec<VerificationMethodType>>
        let filter_types = self.filter_types.as_ref().map(|filter_types| {
            filter_types
                .iter()
                .map(|t| VerificationMethodType::from_u8(*t).unwrap())
                .collect::<Vec<VerificationMethodType>>()
        });

        !account
            .verification_methods(
                filter_types.as_deref(),
                self.filter_flags
                    .map(|f| VerificationMethodFlags::from_bits(f).unwrap()),
                self.filter_key_data.as_deref(),
                self.filter_fragment.as_ref(),
            )
            .is_empty()
    }

    pub fn is_empty(&self) -> bool {
        self.filter_fragment.is_none()
            && self.filter_flags.is_none()
            && self.filter_types.is_none()
            && self.filter_key_data.is_none()
    }

    pub fn size(&self) -> usize {
        VerificationMethodMatcher::INITIAL_SIZE
            + if let Some(filter_fragment) = &self.filter_fragment {
                4 + filter_fragment.len()
            } else {
                0
            }
            + if let Some(_filter_flags) = &self.filter_flags {
                2
            } else {
                0
            }
            + if let Some(filter_types) = &self.filter_types {
                4 + filter_types.len()
            } else {
                0
            }
            + if let Some(filter_key_data) = &self.filter_key_data {
                4 + filter_key_data.len()
            } else {
                0
            }
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct ServiceMatcher {
    pub filter_fragment: Option<String>,
    pub filter_service_type: Option<String>,
    pub filter_service_endpoint: Option<String>,
}

impl ServiceMatcher {
    pub const INITIAL_SIZE: usize = 3; // 3 * Option

    pub fn is_empty(&self) -> bool {
        self.filter_fragment.is_none()
            && self.filter_service_type.is_none()
            && self.filter_service_endpoint.is_none()
    }

    pub fn match_account(&self, account: &DidAccount) -> bool {
        if self.is_empty() {
            return true;
        }

        let has_matches = account
            .services
            .iter()
            .filter(|service| match &self.filter_fragment {
                Some(filter_fragment) => service.fragment == *filter_fragment,
                None => true,
            })
            .filter(|service| match &self.filter_service_type {
                Some(filter_service_type) => service.service_type == *filter_service_type,
                None => true,
            })
            .filter(|service| match &self.filter_service_endpoint {
                Some(filter_service_endpoint) => {
                    service.service_endpoint == *filter_service_endpoint
                }
                None => true,
            })
            .any(|_| true);

        has_matches
    }

    pub fn size(&self) -> usize {
        ServiceMatcher::INITIAL_SIZE
            + if let Some(filter_fragment) = &self.filter_fragment {
                4 + filter_fragment.len()
            } else {
                0
            }
            + if let Some(filter_service_type) = &self.filter_service_type {
                4 + filter_service_type.len()
            } else {
                0
            }
            + if let Some(filter_service_endpoint) = &self.filter_service_endpoint {
                4 + filter_service_endpoint.len()
            } else {
                0
            }
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct ControllerMatcher {
    pub filter_native_controller: Option<Pubkey>,
    pub filter_other_controller: Option<String>,
}

impl ControllerMatcher {
    pub const INITIAL_SIZE: usize = 2; // 2 * Option

    pub fn match_account(&self, account: &DidAccount) -> bool {
        let native_controller_matches = match &self.filter_native_controller {
            Some(filter_native_controller) => account
                .native_controllers
                .iter()
                .any(|c| c == filter_native_controller),
            None => true,
        };

        let other_controller_matches = match &self.filter_other_controller {
            Some(filter_other_controller) => account
                .other_controllers
                .iter()
                .any(|c| c == filter_other_controller),
            None => true,
        };

        native_controller_matches && other_controller_matches
    }

    pub fn size(&self) -> usize {
        ControllerMatcher::INITIAL_SIZE
            + if let Some(_native_controller) = &self.filter_native_controller {
                32
            } else {
                0
            }
            + if let Some(other_controller) = &self.filter_other_controller {
                4 + other_controller.len()
            } else {
                0
            }
    }
}

#[account()]
pub struct CheckDid {
    /// The authority of this CheckDid acccount
    pub authority: Pubkey,
    pub bump: u8,

    pub verification_method_matcher: VerificationMethodMatcher,
    pub service_matcher: ServiceMatcher,
    pub controller_matcher: ControllerMatcher,

    /// The previous middleware in the chain, if any
    pub previous_middleware: Option<Pubkey>,
}
impl CheckDid {
    pub const SEED_PREFIX: &'static [u8] = b"check_did";

    pub const INITIAL_SIZE: usize = 32 + 1 + (1 + 32);
}

#[error_code]
pub enum ErrorCode {
    #[msg("The signer is not a valid authority for this DID")]
    InvalidAuthority,
    #[msg("VerificationMethodMatcher not satisfied")]
    VerificationMethodMatcherError,
    #[msg("ServiceMatcherError not satisfied")]
    ServiceMatcherError,
    #[msg("ControllerMatcher not satisfied")]
    ControllerMatcherError,
}
