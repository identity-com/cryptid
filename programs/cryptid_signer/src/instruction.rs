#[cfg(feature = "test-bpf")]
use crate::generate_doa_signer;
use crate::state::{DOAAccount, InstructionData, TransactionAccount};
use borsh::{BorshDeserialize, BorshSchema, BorshSerialize};
use solana_generator::{
    system_program_id, AccountArgument, AccountInfo, GeneratorError, GeneratorResult,
    InitOrZeroedAccount, ProgramAccount, Pubkey, Rest, SystemProgram, UnixTimestamp,
};
#[cfg(feature = "test-bpf")]
use solana_generator::{SolanaAccountMeta, SolanaInstruction};

#[allow(clippy::large_enum_variant)]
#[derive(Debug)]
pub enum Instruction {
    Test,
    CreateDOA(CreateDOAData, CreateDOA), // TODO: Somehow make these not tuples, kind of awkward
    ProposeTransaction(ProposeTransactionData, ProposeTransaction),
    DirectExecuteTransaction(DirectExecuteTransactionData, DirectExecuteTransaction),
}
impl AccountArgument for Instruction {
    type InstructionArg = u8;

    fn from_account_infos(
        program_id: Pubkey,
        infos: &mut impl Iterator<Item = AccountInfo>,
        data: &mut &[u8],
        arg: Self::InstructionArg,
    ) -> GeneratorResult<Self> {
        match arg {
            CreateDOA::DISCRIMINANT => Ok(Self::CreateDOA(
                BorshDeserialize::deserialize(data)?,
                CreateDOA::from_account_infos(program_id, infos, data, ())?,
            )),
            1 => {
                let instruction_data: ProposeTransactionData = BorshDeserialize::deserialize(data)?;
                let accounts = ProposeTransaction::from_account_infos(
                    program_id,
                    infos,
                    data,
                    (instruction_data.signers,),
                )?;
                Ok(Self::ProposeTransaction(instruction_data, accounts))
            }
            5 => {
                let instruction_data: DirectExecuteTransactionData =
                    BorshDeserialize::deserialize(data)?;
                let accounts = DirectExecuteTransaction::from_account_infos(
                    program_id,
                    infos,
                    data,
                    (instruction_data.signers,),
                )?;
                Ok(Self::DirectExecuteTransaction(instruction_data, accounts))
            }
            254 => Ok(Self::Test),
            _ => Err(GeneratorError::UnknownInstruction {
                instruction: arg.to_string(),
            }
            .into()),
        }
    }

    fn write_back(
        self,
        program_id: Pubkey,
        system_program: Option<&SystemProgram>,
    ) -> GeneratorResult<()> {
        match self {
            Instruction::Test => Ok(()),
            Instruction::CreateDOA(_, accounts) => accounts.write_back(program_id, system_program),
            Instruction::ProposeTransaction(_, accounts) => {
                accounts.write_back(program_id, system_program)
            }
            Instruction::DirectExecuteTransaction(_, accounts) => {
                accounts.write_back(program_id, system_program)
            }
        }
    }

    fn add_keys(&self, add: impl FnMut(Pubkey) -> GeneratorResult<()>) -> GeneratorResult<()> {
        match self {
            Instruction::Test => Ok(()),
            Instruction::CreateDOA(_, accounts) => accounts.add_keys(add),
            Instruction::ProposeTransaction(_, accounts) => accounts.add_keys(add),
            Instruction::DirectExecuteTransaction(_, accounts) => accounts.add_keys(add),
        }
    }
}

#[derive(Debug, AccountArgument)]
pub struct CreateDOA {
    #[account_argument(signer, writable, owner = system_program_id())]
    pub funder: AccountInfo,
    pub doa: InitOrZeroedAccount<DOAAccount>,
    pub doa_signer: AccountInfo,
    pub did: AccountInfo,
    pub did_program: AccountInfo,
    pub system_program: SystemProgram,
}
impl CreateDOA {
    const DISCRIMINANT: u8 = 0;

    #[cfg(feature = "test-bpf")]
    pub fn create_instruction(
        program_id: Pubkey,
        funder: Pubkey,
        doa: Pubkey,
        doa_is_zeroed: bool,
        did: SolanaAccountMeta,
        did_program: Pubkey,
        key_threshold: u8,
    ) -> GeneratorResult<SolanaInstruction> {
        let (doa_signer, signer_nonce) = generate_doa_signer(program_id, doa);
        let accounts = vec![
            SolanaAccountMeta::new(funder, true),
            SolanaAccountMeta::new(doa, !doa_is_zeroed),
            SolanaAccountMeta::new_readonly(doa_signer, false),
            did,
            SolanaAccountMeta::new_readonly(did_program, false),
            SolanaAccountMeta::new_readonly(system_program_id(), false),
        ];
        let data = CreateDOAData {
            signer_nonce,
            key_threshold,
        };
        let mut data_bytes = vec![Self::DISCRIMINANT];
        BorshSerialize::serialize(&data, &mut data_bytes)?;
        Ok(SolanaInstruction {
            program_id,
            accounts,
            data: data_bytes,
        })
    }
}
#[derive(Debug, BorshSerialize, BorshDeserialize, BorshSchema)]
pub struct CreateDOAData {
    pub signer_nonce: u8,
    pub key_threshold: u8,
    // TODO: Add when permissions added
    // pub sign_permissions: ?,
    // pub execute_permissions: ?,
    // pub remove_permissions: ?,
}

#[derive(Debug, AccountArgument)]
#[account_argument(instruction_data = (signers: u8))]
pub struct ProposeTransaction {
    #[account_argument(signer, writable, owner = system_program_id())]
    pub funder: AccountInfo,
    pub transaction_account: InitOrZeroedAccount<TransactionAccount>,
    pub doa: ProgramAccount<DOAAccount>,
    pub did: AccountInfo,
    pub did_program: AccountInfo,
    pub system_program: SystemProgram,
    // TODO: Clean up `instruction_data` to `singers as usize`, maybe a `size` argument?
    #[account_argument(instruction_data = (signers as usize, ()), signer)]
    pub signer_keys: Vec<AccountInfo>,
    pub extra_accounts: Rest<AccountInfo>,
}
#[derive(Debug, BorshSerialize, BorshDeserialize, BorshSchema)]
pub struct ProposeTransactionData {
    pub signers: u8,
    pub instructions: Vec<InstructionData>,
    pub expiry_times: Vec<UnixTimestamp>,
    pub extra_keyspace: u8, // TODO: Remove when flip flop or re-allocation added
}

#[derive(Debug, AccountArgument)]
#[account_argument(instruction_data = (signers: u8))]
pub struct DirectExecuteTransaction {
    pub doa: ProgramAccount<DOAAccount>,
    pub did: AccountInfo,
    pub did_program: AccountInfo,
    #[account_argument(instruction_data = (signers as usize, ()), signer)]
    pub signing_keys: Vec<AccountInfo>,
    /// Each account should only appear once
    pub instruction_accounts: Rest<AccountInfo>,
}
#[derive(Debug, BorshSerialize, BorshDeserialize, BorshSchema)]
pub struct DirectExecuteTransactionData {
    pub signers: u8,
    pub instructions: Vec<InstructionData>,
}
