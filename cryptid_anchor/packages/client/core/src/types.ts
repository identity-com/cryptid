import {IdlAccounts, IdlTypes} from "@project-serum/anchor";
import {Cryptid} from "@identity.com/cryptid-idl";

export { ExtendedCluster } from './types/solana';
export { Wallet } from './types/crypto';

export type TransactionAccountMeta = IdlTypes<Cryptid>["AbbreviatedAccountMeta"];
export type InstructionData = IdlTypes<Cryptid>["AbbreviatedInstructionData"];
export type TransactionAccount = IdlAccounts<Cryptid>["transactionAccount"];
    // ReturnType<AccountNamespace<Cryptid>["transactionAccount"]["fetch"]>
//TypeDef<Cryptid["accounts"], IdlTypes<typeof CryptidIDL>>