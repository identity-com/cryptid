# Signer Program
This is the Cryptid Signer Program. It currently supports direct execution of transactions signing with a given did key.

## Instructions
| Instruction | Discriminant | Description |
| :--- | :--- | :--- |
| `CreateCryptid` | `0` | Creates a new Cryptid Account. Currently does not support upgrading Generative Cryptid Accounts |
| `DirectExecute` | `5` | Directly executes a transaction requiring all the needed signers. This can easily run into size limits for transactions |

## Data Types
The Cryptid Signer Program operates with 2 types of data accounts: Cryptid Accounts and Transaction Accounts.
There is also a single Cryptid Address for each Cryptid Account that is used for signing all transactions.

There are also generative versions of the Cryptid Account, meaning versions that store no data on chain. 
This is explained further in the Cryptid Account section.

### Cryptid Account
```rust
/// The data for an on-chain Cryptid Account
#[derive(Debug, Default, Account, BorshSerialize, BorshDeserialize, BorshSchema)]
#[account(discriminant = [1])]
pub struct CryptidAccount {
    /// The DID for this
    pub did: Pubkey,
    /// The program for the DID
    pub did_program: Pubkey,
    /// The nonce of the Cryptid Signer
    pub signer_nonce: u8,
    /// The number of keys needed for transactions to be executed
    pub key_threshold: u8,
    /// A tracker to invalidate transactions when settings change
    pub settings_sequence: u16,
}
```
The Cryptid account stores the did and program that it signs for. 
It also stores the nonce of the Cryptid address, the number of keys needed for signing and a tracker for settings changes.
A single did and program combo can have any number of Cryptid Accounts, but only a single Generative Cryptid Account.
A Generative Cryptid Account's address is derived from the did and did program combo.

Generative Cryptid Accounts have default values for fields other than the `did` and `did_program` that derived them: 
- `signer_nonce`: The largest valid nonce
- `key_threshold`: `1`
- `settings_sequence`: A value that is exclusive to generative Cryptid accounts

Instructions that accept an On-Chain Cryptid Account generally accept a Generative Cryptid Account as well.

### Transaction Account
Unused in current version. Planned to store a transaction that can be signed and executed later.

## Use Flows
Using either an On-Chain Cryptid Account or a Generative Cryptid Account the `DirectExecute` instruction is called. 
A signing key that is valid on the did is used along with the accounts needed for the instruction. 
The data contains the instruction definitions that reference indexes in the instruction accounts and a flag for debug printing which takes a large amount of the compute budget.

The overhead for this flow is a minimum of 4 extra accounts and serialized instruction data (overall ~200-250 bytes) and combining all instructions into a single one therefore unifying the compute budget.
The compute use is ~30,000 units (limit per instruction is 200,000). 
These can be avoided by splitting up the transaction into multiple (won't be atomic) or using the future propose flow (not available yet).

## Instruction Details
### Direct Execute
#### Accounts
```rust
/// The accounts for [`DirectExecute`]
#[derive(Debug, AccountArgument)]
#[account_argument(instruction_data = signers_extras: Vec<u8>)]
pub struct DirectExecuteAccounts {
    /// The DOA to execute with
    pub cryptid_account: CryptidAccountAddress,
    /// The DID on the DOA
    pub did: AccountInfo,
    /// The program for the DID
    pub did_program: AccountInfo,
    /// The set of keys that sign for this transaction
    #[account_argument(instruction_data = signers_extras)]
    pub signing_keys: Vec<SigningKey>,
    /// Accounts for the instructions, each should only appear once
    pub instruction_accounts: Rest<AccountInfo>,
}
```
#### Data
```rust
/// The instruction data for [`DirectExecute`]
#[derive(Debug, BorshSerialize, BorshDeserialize, BorshSchema)]
pub struct DirectExecuteData {
    /// A vector of the number of extras for each signer, signer count is the length
    pub signers_extras: Vec<u8>,
    /// The instructions to execute
    pub instructions: Vec<InstructionData>,
    /// Additional flags
    pub flags: DirectExecuteFlags,
}
```
