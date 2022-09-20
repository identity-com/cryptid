import {IdlAccounts, IdlTypes} from "@project-serum/anchor";
import {Cryptid} from "@identity.com/cryptid-idl";

export type { ExtendedCluster } from './types/solana';
export type { Wallet } from './types/crypto';
export type { MiddlewareClient, GenericMiddlewareParams, ExecuteMiddlewareParams } from './types/middleware';

export type TransactionAccountMeta = IdlTypes<Cryptid>["AbbreviatedAccountMeta"];
export type InstructionData = IdlTypes<Cryptid>["AbbreviatedInstructionData"];
export type TransactionAccount = IdlAccounts<Cryptid>["transactionAccount"];
export type CryptidAccount = IdlAccounts<Cryptid>["cryptidAccount"];
    // ReturnType<AccountNamespace<Cryptid>["transactionAccount"]["fetch"]>
//TypeDef<Cryptid["accounts"], IdlTypes<typeof CryptidIDL>>
