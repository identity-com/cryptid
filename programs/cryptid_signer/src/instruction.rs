use crate::state::{DOAAccount, InstructionData, TransactionAccount};
use borsh::{BorshDeserialize, BorshSchema, BorshSerialize};
use solana_generator::{
    system_program_id, AccountArgument, AccountInfo, GeneratorError, GeneratorResult, InitAccount,
    ProgramAccount, Pubkey, Rest, SystemProgram, UnixTimestamp,
};

#[allow(clippy::large_enum_variant)]
#[derive(Debug)]
pub enum Instruction {
    Test,
    CreateDOA(CreateDOAData, CreateDOA), // TODO: Somehow make these not tuples, kind of awkward
    ProposeTransaction(ProposeTransactionData, ProposeTransaction),
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
            0 => Ok(Self::CreateDOA(
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
            Instruction::CreateDOA(_, create_doa) => {
                create_doa.write_back(program_id, system_program)
            }
            Instruction::ProposeTransaction(_, propose_transaction) => {
                propose_transaction.write_back(program_id, system_program)
            }
        }
    }

    fn add_keys(&self, add: impl FnMut(Pubkey) -> GeneratorResult<()>) -> GeneratorResult<()> {
        match self {
            Instruction::Test => Ok(()),
            Instruction::CreateDOA(_, create_doa) => create_doa.add_keys(add),
            Instruction::ProposeTransaction(_, propose_transaction) => {
                propose_transaction.add_keys(add)
            }
        }
    }
}

#[derive(Debug, AccountArgument)]
pub struct CreateDOA {
    #[account_argument(signer, writable, owner = system_program_id())]
    pub funder: AccountInfo,
    pub doa: InitAccount<DOAAccount>,
    pub doa_signer: AccountInfo,
    pub did: AccountInfo,
    pub did_program: AccountInfo,
    pub system_program: SystemProgram,
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
    pub transaction_account: InitAccount<TransactionAccount>,
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
