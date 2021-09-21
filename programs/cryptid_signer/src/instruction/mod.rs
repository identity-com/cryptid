#[path = "./000_create_doa.rs"]
mod create_doa;
#[path = "./005_direct_execute_transaction.rs"]
mod direct_execute_transaction;
#[path = "./001_propose_transaction.rs"]
mod propose_transaction;

pub use create_doa::*;
pub use direct_execute_transaction::*;
pub use propose_transaction::*;

use borsh::BorshDeserialize;
use solana_generator::*;

#[allow(clippy::large_enum_variant)]
#[derive(Debug)]
pub enum CryptidInstruction {
    Test,
    CreateDOA, // TODO: Somehow make these not tuples, kind of awkward
    ProposeTransaction(ProposeTransactionData, ProposeTransaction),
    DirectExecuteTransaction(DirectExecuteTransactionData, DirectExecuteTransaction),
}
impl AccountArgument for CryptidInstruction {
    type InstructionArg = u8;

    fn from_account_infos(
        program_id: Pubkey,
        infos: &mut impl Iterator<Item = AccountInfo>,
        data: &mut &[u8],
        arg: Self::InstructionArg,
    ) -> GeneratorResult<Self> {
        match arg {
            CreateDOAAccounts::DISCRIMINANT => Ok(Self::CreateDOA),
            ProposeTransaction::DISCRIMINANT => {
                let instruction_data: ProposeTransactionData = BorshDeserialize::deserialize(data)?;
                let accounts = ProposeTransaction::from_account_infos(
                    program_id,
                    infos,
                    data,
                    (instruction_data.signers,),
                )?;
                Ok(Self::ProposeTransaction(instruction_data, accounts))
            }
            DirectExecuteTransaction::DISCRIMINANT => {
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
            CryptidInstruction::Test => Ok(()),
            CryptidInstruction::CreateDOA => Ok(()),
            CryptidInstruction::ProposeTransaction(_, accounts) => {
                accounts.write_back(program_id, system_program)
            }
            CryptidInstruction::DirectExecuteTransaction(_, accounts) => {
                accounts.write_back(program_id, system_program)
            }
        }
    }

    fn add_keys(&self, add: impl FnMut(Pubkey) -> GeneratorResult<()>) -> GeneratorResult<()> {
        match self {
            CryptidInstruction::Test => Ok(()),
            CryptidInstruction::CreateDOA => Ok(()),
            CryptidInstruction::ProposeTransaction(_, accounts) => accounts.add_keys(add),
            CryptidInstruction::DirectExecuteTransaction(_, accounts) => accounts.add_keys(add),
        }
    }
}
