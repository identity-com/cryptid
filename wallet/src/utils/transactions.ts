import bs58 from 'bs58';
import {
  AccountMeta,
  AdvanceNonceParams,
  AllocateParams,
  AllocateWithSeedParams,
  AssignParams,
  AssignWithSeedParams,
  AuthorizeNonceParams, AuthorizeStakeParams, AuthorizeWithSeedStakeParams,
  // Connection,
  CreateAccountParams,
  CreateAccountWithSeedParams, DeactivateStakeParams, DelegateStakeParams,
  InitializeNonceParams, InitializeStakeParams, MergeStakeParams,
  Message,
  StakeInstruction,
  // StakeInstructionType,
  StakeProgram,
  SystemInstruction,
  SystemProgram,
  TransactionInstruction,
  TransferParams,
  TransferWithSeedParams,
  WithdrawNonceParams,
} from '@solana/web3.js';
// import {
//   decodeInstruction,
//   Market,
//   MARKETS,
//   SETTLE_FUNDS_BASE_WALLET_INDEX,
//   SETTLE_FUNDS_QUOTE_WALLET_INDEX,
//   NEW_ORDER_OPEN_ORDERS_INDEX,
//   NEW_ORDER_OWNER_INDEX,
//   NEW_ORDER_V3_OPEN_ORDERS_INDEX,
//   NEW_ORDER_V3_OWNER_INDEX,
// } from '@project-serum/serum';
import {decodeTokenInstruction, TokenInstruction} from '@project-serum/token';
import {PublicKey} from '@solana/web3.js';
import {TOKEN_PROGRAM_ID} from './tokens/instructions';
import {StrictWalletInterface} from './wallet';

// const RAYDIUM_STAKE_PROGRAM_ID = new PublicKey(
//   'EhhTKczWMGQt46ynNeRX1WfeagwwJd7ufHvCDjRxjo5Q',
// );
// const RAYDIUM_LP_PROGRAM_ID = new PublicKey(
//   'RVKd61ztZW9GUwhRbbLoYVRE5Xf1B2tVscKqwZqXgEr',
// );
//
// const MANGO_PROGRAM_ID = new PublicKey(
//   'JD3bq9hGdy38PuWQ4h2YJpELmHVGPPfFSuFkpzAd9zfu',
// );
// const MANGO_PROGRAM_ID_V2 = new PublicKey(
//   '5fNfvyp5czQVX77yoACa3JJVEhdRaWjPuazuWgjhTqEH',
// );
//
// const marketCache = {};
// let marketCacheConnection = null;
// const cacheDuration = 15 * 1000;

export const decodeMessage = async (
  // connection: Connection,
  wallet: StrictWalletInterface,
  message: Buffer
): Promise<{ rawData: Buffer, instruction: InstructionType<InstructionParams>}[]> => {
  // get message object
  const transactionMessage = Message.from(message);
  if (!transactionMessage?.instructions || !transactionMessage?.accountKeys) {
    return [];
  }

  // get owned keys (used for security checks)
  const walletKey = wallet.publicKey;

  const metas = toAccountMetas(transactionMessage);

  // get instructions
  return await Promise.all(transactionMessage.instructions
    .map((instruction) => toTransactionInstruction(instruction, metas))
    .map(async (transactionInstruction, index) => {
      const instruction = await toInstruction(
        // connection,
        walletKey,
        transactionInstruction,
        metas,
        index,
      );
      return {
        instruction,
        rawData: transactionInstruction?.data,
      };
    }),
  );
};

type ExcludeFunctions<T> = {
  [K in keyof T as T[K] extends (...args: any[]) => any ? never : K]: T[K];
}

export class DisplayInstruction{
  name: string;
  instruction: DisplayInstructionEnum;

  constructor(instruction: DisplayInstructionEnum) {
    this.instruction = instruction;
    this.name = instruction.name();
  }

  static fromInstruction(transactionInstruction: TransactionInstruction): DisplayInstruction{
    return new DisplayInstruction(DisplayInstructionEnum.fromInstruction(transactionInstruction));
  }
}
export class DisplayInstructionEnum{
  readonly systemInstruction?: DisplaySystemInstruction;
  // readonly stakeInstruction?: DisplayStakeInstruction;
  // readonly tokenInstruction?: DisplayTokenInstruction;
  readonly unknown?: TransactionInstruction;

  constructor(
    instruction:
      DisplaySystemInstruction
      // | DisplayStakeInstruction
      // | DisplayTokenInstruction
      | TransactionInstruction
  ) {
    if (instruction instanceof DisplaySystemInstruction){
      this.systemInstruction = instruction;
    // } else if (instruction instanceof DisplayStakeInstruction){
    //   this.stakeInstruction = instruction
    // } else if (instruction instanceof DisplayTokenInstruction) {
    //   this.tokenInstruction = instruction;
    } else {
      this.unknown = instruction;
    }
  }

  static fromInstruction(instruction: TransactionInstruction): DisplayInstructionEnum{
    if(instruction.programId.equals(SystemProgram.programId)){
      return new DisplayInstructionEnum(DisplaySystemInstruction.fromInstruction(instruction));
    } else if (instruction.programId.equals(StakeProgram.programId)){
      return new DisplayInstructionEnum(DisplayStakeInstruction.fromInstruction(instruction));
    } else if (instruction.programId.equals(TOKEN_PROGRAM_ID)){
      return new DisplayInstructionEnum(DisplayTokenInstruction.fromInstruction(instruction));
    } else {
      return new DisplayInstructionEnum(instruction);
    }
  }

  match<T>(functions: { [K in keyof ExcludeFunctions<DisplayInstructionEnum>]-?: (param:  NonNullable<ExcludeFunctions<DisplayInstructionEnum>[K]>) => T}): T {
    const key = Object.keys(this).find((key) => {
      const indexKey = key as keyof this;
      return this[indexKey] !== undefined;
    });
    if (!key){
      throw new Error("Unknown variant for this: " + this);
    }
    const classKey = key as keyof this;
    const specificKey = key as keyof ExcludeFunctions<DisplayInstructionEnum>;
    return (functions[specificKey] as unknown as (param: any) => T)(this[classKey]);
  }

  matchNoArg<T>(functions: { [K in keyof ExcludeFunctions<DisplayInstructionEnum>]-?:() => T}): T {
    const key = Object.keys(this).find((key) => {
      const indexKey = key as keyof this;
      return this[indexKey] !== undefined;
    });
    if (!key){
      throw new Error("Unknown variant for this: " + this);
    }
    const specificKey = key as keyof ExcludeFunctions<DisplayInstructionEnum>;
    return functions[specificKey]();
  }

  matchNoFunc<T>(values: { [K in keyof ExcludeFunctions<DisplayInstructionEnum>]-?: T}): T {
    const key = Object.keys(this).find((key) => {
      const indexKey = key as keyof DisplayInstructionEnum;
      return this[indexKey] !== undefined;
    });
    if (!key){
      throw new Error("Unknown variant for this: " + this);
    }
    const specificKey = key as keyof ExcludeFunctions<DisplayInstructionEnum>;
    return values[specificKey];
  }

  matchDefault<T>(functions: { [K in keyof ExcludeFunctions<DisplayInstructionEnum>]?: (param: NonNullable<ExcludeFunctions<DisplayInstructionEnum>[K]>) => T}, defaultT: () => T): T {
    const key = Object.keys(this).find((key) => {
      const indexKey = key as keyof this;
      return this[indexKey] !== undefined;
    });
    if (!key){
      throw new Error("Unknown variant for this: " + this);
    }
    const classKey = key as keyof this;
    const specificKey = key as keyof ExcludeFunctions<DisplayInstructionEnum>;
    if(functions[specificKey]) {
      return (functions[specificKey] as unknown as (param: any) => T)(this[classKey]);
    } else {
      return defaultT();
    }
  }

  matchDefaultNoArg<T>(functions: { [K in keyof ExcludeFunctions<DisplayInstructionEnum>]?: () => T}, defaultT: () => T): T {
    const key = Object.keys(this).find((key) => {
      const indexKey = key as keyof this;
      return this[indexKey] !== undefined;
    });
    if (!key){
      throw new Error("Unknown variant for this: " + this);
    }
    const specificKey = key as keyof ExcludeFunctions<DisplayInstructionEnum>;
    const func = functions[specificKey]
    if(func) {
      return func();
    } else {
      return defaultT();
    }
  }

  matchDefaultNoFunc<T>(values: { [K in keyof ExcludeFunctions<DisplayInstructionEnum>]?: T}, defaultT: T): T {
    const key = Object.keys(this).find((key) => {
      const indexKey = key as keyof this;
      return this[indexKey] !== undefined;
    });
    if (!key){
      throw new Error("Unknown variant for this: " + this);
    }
    const specificKey = key as keyof ExcludeFunctions<DisplayInstructionEnum>;
    const value = values[specificKey]
    if(value !== undefined) {
      return value;
    } else {
      return defaultT;
    }
  }

  name(): string{
    return this.match({
      systemInstruction: (system_instruction: DisplaySystemInstruction) => system_instruction.name(),
      stakeInstruction: () => "",
      tokenInstruction: () => "",
      unknown: () => "Unknown Instruction",
    });
  }
}

export class DisplaySystemInstruction{
  readonly createAccount?: CreateAccountParams;
  readonly createAccountWithSeeds?: CreateAccountWithSeedParams;
  readonly assign?: AssignParams;
  readonly assignWithSeeds?: AssignWithSeedParams;
  readonly allocate?: AllocateParams;
  readonly allocateWithSeeds?: AllocateWithSeedParams;
  readonly transfer?: TransferParams;
  readonly transferWithSeeds?: TransferWithSeedParams;
  readonly advanceNonce?: AdvanceNonceParams;
  readonly withdrawNonce?: WithdrawNonceParams
  readonly initializeNonce?: InitializeNonceParams;
  readonly authorizeNonce?: AuthorizeNonceParams;

  constructor(param: DisplaySystemInstructionBuild) {
    switch (param.type){
      case 'createAccount':
        this.createAccount = param.param;
        break;
      case 'createAccountWithSeeds':
        this.createAccountWithSeeds = param.param;
        break;
      case 'assign':
        this.assign = param.param;
        break;
      case 'assignWithSeeds':
        this.assignWithSeeds = param.param;
        break;
      case 'allocate':
        this.allocate = param.param;
        break;
      case 'allocateWithSeeds':
        this.allocateWithSeeds = param.param;
        break;
      case 'transfer':
        this.transfer = param.param;
        break;
      case 'transferWithSeeds':
        this.transferWithSeeds = param.param;
        break;
      case 'advanceNonce':
        this.advanceNonce = param.param;
        break;
      case 'withdrawNonce':
        this.withdrawNonce = param.param;
        break;
      case 'initializeNonce':
        this.initializeNonce = param.param;
        break;
      case 'authorizeNonce':
        this.authorizeNonce = param.param;
        break;
      default:
        assertNever(param);
    }
  }

  static fromInstruction(instruction: TransactionInstruction): DisplaySystemInstruction{
    if (!instruction.programId.equals(SystemProgram.programId)){
      throw new Error("Invalid program id for system program: " + instruction.programId.toBase58());
    }
    const type = SystemInstruction.decodeInstructionType(instruction);
    switch (type) {
      case 'Create':
        return new DisplaySystemInstruction({ type: 'createAccount', param: SystemInstruction.decodeCreateAccount(instruction)});
      case 'CreateWithSeed':
        return new DisplaySystemInstruction({ type: 'createAccountWithSeeds', param: SystemInstruction.decodeCreateWithSeed(instruction)});
      case 'Assign':
        return new DisplaySystemInstruction({ type: 'assign', param: SystemInstruction.decodeAssign(instruction)});
      case 'AssignWithSeed':
        return new DisplaySystemInstruction({ type: 'assignWithSeeds', param: SystemInstruction.decodeAssignWithSeed(instruction)});
      case 'Allocate':
        return new DisplaySystemInstruction({ type: 'allocate', param: SystemInstruction.decodeAllocate(instruction)});
      case 'AllocateWithSeed':
        return new DisplaySystemInstruction({ type: 'allocateWithSeeds', param: SystemInstruction.decodeAllocateWithSeed(instruction)});
      case 'Transfer':
        return new DisplaySystemInstruction({ type: 'transfer', param: SystemInstruction.decodeTransfer(instruction)});
      case 'TransferWithSeed':
        return new DisplaySystemInstruction({ type: 'transferWithSeeds', param: SystemInstruction.decodeTransferWithSeed(instruction)});
      case 'AdvanceNonceAccount':
        return new DisplaySystemInstruction({ type: 'advanceNonce', param: SystemInstruction.decodeNonceAdvance(instruction)});
      case 'WithdrawNonceAccount':
        return new DisplaySystemInstruction({ type: 'withdrawNonce', param: SystemInstruction.decodeNonceWithdraw(instruction)});
      case 'InitializeNonceAccount':
        return new DisplaySystemInstruction({ type: 'initializeNonce', param: SystemInstruction.decodeNonceInitialize(instruction)});
      case 'AuthorizeNonceAccount':
        return new DisplaySystemInstruction({ type: 'authorizeNonce', param: SystemInstruction.decodeNonceAuthorize(instruction)});
      default:
        assertNever(type);
        throw new Error("Unknown Instruction: " + type);
    }
  }

  match<T>(functions: { [K in keyof ExcludeFunctions<DisplaySystemInstruction>]-?: (param:  NonNullable<ExcludeFunctions<DisplaySystemInstruction>[K]>) => T}): T {
    const key = Object.keys(this).find((key) => {
      const indexKey = key as keyof this;
      return this[indexKey] !== undefined;
    });
    if (!key){
      throw new Error("Unknown variant for this: " + this);
    }
    const classKey = key as keyof this;
    const specificKey = key as keyof ExcludeFunctions<DisplaySystemInstruction>;
    return (functions[specificKey] as unknown as (param: any) => T)(this[classKey]);
  }

  matchNoArg<T>(functions: { [K in keyof ExcludeFunctions<DisplaySystemInstruction>]-?:() => T}): T {
    const key = Object.keys(this).find((key) => {
      const indexKey = key as keyof this;
      return this[indexKey] !== undefined;
    });
    if (!key){
      throw new Error("Unknown variant for this: " + this);
    }
    const specificKey = key as keyof ExcludeFunctions<DisplaySystemInstruction>;
    return functions[specificKey]();
  }

  matchNoFunc<T>(values: { [K in keyof ExcludeFunctions<DisplaySystemInstruction>]-?: T}): T {
    const key = Object.keys(this).find((key) => {
      const indexKey = key as keyof DisplaySystemInstruction;
      return this[indexKey] !== undefined;
    });
    if (!key){
      throw new Error("Unknown variant for this: " + this);
    }
    const specificKey = key as keyof ExcludeFunctions<DisplaySystemInstruction>;
    return values[specificKey];
  }

  matchDefault<T>(functions: { [K in keyof ExcludeFunctions<DisplaySystemInstruction>]?: (param: NonNullable<ExcludeFunctions<DisplaySystemInstruction>[K]>) => T}, defaultT: () => T): T {
    const key = Object.keys(this).find((key) => {
      const indexKey = key as keyof this;
      return this[indexKey] !== undefined;
    });
    if (!key){
      throw new Error("Unknown variant for this: " + this);
    }
    const classKey = key as keyof this;
    const specificKey = key as keyof ExcludeFunctions<DisplaySystemInstruction>;
    if(functions[specificKey]) {
      return (functions[specificKey] as unknown as (param: any) => T)(this[classKey]);
    } else {
      return defaultT();
    }
  }

  matchDefaultNoArg<T>(functions: { [K in keyof ExcludeFunctions<DisplaySystemInstruction>]?: () => T}, defaultT: () => T): T {
    const key = Object.keys(this).find((key) => {
      const indexKey = key as keyof this;
      return this[indexKey] !== undefined;
    });
    if (!key){
      throw new Error("Unknown variant for this: " + this);
    }
    const specificKey = key as keyof ExcludeFunctions<DisplaySystemInstruction>;
    const func = functions[specificKey]
    if(func) {
      return func();
    } else {
      return defaultT();
    }
  }

  matchDefaultNoFunc<T>(values: { [K in keyof ExcludeFunctions<DisplaySystemInstruction>]?: T}, defaultT: T): T {
    const key = Object.keys(this).find((key) => {
      const indexKey = key as keyof this;
      return this[indexKey] !== undefined;
    });
    if (!key){
      throw new Error("Unknown variant for this: " + this);
    }
    const specificKey = key as keyof ExcludeFunctions<DisplaySystemInstruction>;
    const value = values[specificKey]
    if(value !== undefined) {
      return value;
    } else {
      return defaultT;
    }
  }

  name(): string{
    return this.matchNoFunc({
      createAccount: "Create Account",
      createAccountWithSeeds: "Create Account With Seeds",
      assign: "Assign",
      assignWithSeeds: "Assign With Seeds",
      allocate:  "Allocate",
      allocateWithSeeds: "Allocate With Seeds",
      transfer: "Transfer",
      transferWithSeeds: "Transfer With Seeds",
      advanceNonce: "Advance Nonce",
      withdrawNonce: "Withdraw Nonce",
      initializeNonce: "Initialize Nonce",
      authorizeNonce: "Authorize Nonce",
    });
  }
}

export type DisplaySystemInstructionBuild =
  { type: 'createAccount', param: CreateAccountParams }
  | { type: 'createAccountWithSeeds', param: CreateAccountWithSeedParams }
  | { type: 'assign', param: AssignParams }
  | { type: 'assignWithSeeds', param: AssignWithSeedParams }
  | { type: 'allocate', param: AllocateParams }
  | { type: 'allocateWithSeeds', param: AllocateWithSeedParams }
  | { type: 'transfer', param: TransferParams }
  | { type: 'transferWithSeeds', param: TransferWithSeedParams }
  | { type: 'advanceNonce', param: AdvanceNonceParams }
  | { type: 'withdrawNonce', param: WithdrawNonceParams}
  | { type: 'initializeNonce', param: InitializeNonceParams }
  | { type: 'authorizeNonce', param: AuthorizeNonceParams };

export class DisplayStakeInstruction{

  static fromInstruction(instruction: TransactionInstruction): DisplayStakeInstruction{
    if(!instruction.programId.equals(StakeProgram.programId)){
      throw new Error("Invalid program for stake: " + instruction.programId.toBase58());
    }
    return new DisplayStakeInstruction();
  }
}

export class DisplayTokenInstruction{

  static fromInstruction(instruction: TransactionInstruction): DisplayTokenInstruction{
    if(!instruction.programId.equals(TOKEN_PROGRAM_ID)){
      throw new Error("Invalid program for stake: " + instruction.programId.toBase58());
    }
    return new DisplayTokenInstruction();
  }
}

function toAccountMetas(message: Message): AccountMeta[] {
  return message.accountKeys.map((key, index) => {
    return {
      pubkey: key,
      isSigner: index < message.header.numRequiredSignatures,
      isWritable: message.isAccountWritable(index),
    };
  });
}

function toInstructions(message: Message): TransactionInstruction[] {
  const metas = toAccountMetas(message);
  return message.instructions.map((instruction) => new TransactionInstruction({
    keys: instruction.accounts.map((index) => metas[index]),
    programId: metas[instruction.programIdIndex].pubkey,
    data: bs58.decode(instruction.data),
  }));
}

const toInstruction = async (
  // connection: Connection,
  walletKey: PublicKey,
  instruction: TransactionInstruction,
  metas: AccountMeta[],
  index: number,
): Promise<InstructionType<InstructionParams>> => {
  // get instruction data

  let out: InstructionType<InstructionParams> | undefined = undefined;
  try {
    if (instruction.programId.equals(SystemProgram.programId)) {
      console.log('[' + index + '] Handled as system instruction');
      out = handleSystemInstruction(walletKey, instruction);
    } else if (instruction.programId.equals(StakeProgram.programId)) {
      console.log('[' + index + '] Handled as stake instruction');
      out = handleStakeInstruction(walletKey, instruction);
    } else if (instruction.programId.equals(TOKEN_PROGRAM_ID)) {
      console.log('[' + index + '] Handled as token instruction');
      out = handleTokenInstruction(walletKey, instruction);
    // } else if (
    //   MARKETS.some(
    //     (market) => market.programId && market.programId.equals(instruction.programId),
    //   )
    // ) {
    //   console.log('[' + index + '] Handled as dex instruction');
    //   let decodedInstruction = decodeInstruction(instruction.data);
    //   return await handleDexInstruction(
    //     connection,
    //     instruction,
    //     accountKeys,
    //     decodedInstruction,
    //   );
    // } else if (programId.equals(RAYDIUM_STAKE_PROGRAM_ID)) {
    //   console.log('[' + index + '] Handled as raydium stake instruction');
    //   // @ts-ignore
    //   const decodedInstruction = decodeStakeInstruction(decoded);
    //   return await handleRayStakeInstruction(
    //     connection,
    //     instruction,
    //     accountKeys,
    //     decodedInstruction,
    //   );
    // } else if (programId.equals(RAYDIUM_LP_PROGRAM_ID)) {
    //   console.log('[' + index + '] Handled as raydium lp instruction');
    //   // @ts-ignore
    //   const decodedInstruction = decodeLpInstruction(decoded);
    //   return await handleRayLpInstruction(
    //     connection,
    //     instruction,
    //     accountKeys,
    //     decodedInstruction,
    //   );
    // } else if (programId.equals(MANGO_PROGRAM_ID) || programId.equals(MANGO_PROGRAM_ID_V2)) {
    //   console.log('[' + index + '] Handled as mango markets instruction');
    //   // @ts-ignore
    //   let decodedInstruction = decodeMangoInstruction(decoded);
    //   return await handleMangoInstruction(
    //     connection,
    //     instruction,
    //     accountKeys,
    //     decodedInstruction,
    //   );
    }
    if(out) {
      return out;
    } else {
      return {
        type: 'Unknown',
        accountMetas: metas,
        programId: instruction.programId,
      };
    }
  } catch (e) {
    console.log(`Failed to decode instruction: ${e}`);
  }

  // all decodings failed
  console.log('[' + index + '] Failed, instruction: ' + JSON.stringify(instruction));

  return {
    type: 'Unknown',
    accountMetas: metas,
    programId: instruction.programId,
  };
};

type InstructionType<P> = {
  type: string,
  data: P,
} | {
  type: 'Unknown',
  accountMetas: AccountMeta[],
  programId: PublicKey,
}

type InstructionParams =
  SystemInstructionParams
  | StakeInstructionParams
  | TokenInstruction['params'];

// const handleMangoInstruction = async (
//   connection,
//   instruction,
//   accountKeys,
//   decodedInstruction,
// ) => {
//   // TODO
//   return {
//     type: 'mango',
//   };
// };
//
// const handleRayStakeInstruction = async (
//   connection,
//   instruction,
//   accountKeys,
//   decodedInstruction,
// ) => {
//   // TODO
//   return {
//     type: 'raydium',
//   };
// };
//
// const handleRayLpInstruction = async (
//   connection,
//   instruction,
//   accountKeys,
//   decodedInstruction,
// ) => {
//   // TODO
//   return {
//     type: 'raydium',
//   };
// };
//
// const decodeMangoInstruction = () => {
//   // TODO
//   return undefined;
// };
//
// const decodeStakeInstruction = () => {
//   // TODO
//   return undefined;
// };
//
// const decodeLpInstruction = () => {
//   // TODO
//   return undefined;
// };
//
// const handleDexInstruction = async (
//   connection: Connection,
//   instruction: TransactionInstruction,
//   decodedInstruction: any,
// ) => {
//   if (!decodedInstruction || Object.keys(decodedInstruction).length > 1) {
//     return;
//   }
//
//   // get market info
//   const marketInfo =
//     MARKETS.find(
//       (market) =>
//         accountKeys.findIndex((accountKey) =>
//           accountKey.equals(market.address),
//         ) > -1,
//     );
//
//   // get market
//   let market, programIdAddress;
//   try {
//     const marketAddress =
//       marketInfo?.address || getAccountByIndex(accounts, accountKeys, 0);
//     programIdAddress =
//       marketInfo?.programId ||
//       getAccountByIndex([programIdIndex], accountKeys, 0);
//     const strAddress = marketAddress.toBase58();
//     const now = new Date().getTime();
//     if (
//       !(
//         connection === marketCacheConnection &&
//         strAddress in marketCache &&
//         now - marketCache[strAddress].ts < cacheDuration
//       )
//     ) {
//       marketCacheConnection = connection;
//       console.log('Loading market', strAddress);
//       marketCache[strAddress] = {
//         market: await Market.load(
//           connection,
//           marketAddress,
//           {},
//           programIdAddress,
//         ),
//         ts: now,
//       };
//     }
//     market = marketCache[strAddress].market;
//   } catch (e) {
//     console.log('Error loading market: ' + e.message);
//   }
//
//   // get data
//   const type = Object.keys(decodedInstruction)[0];
//   let data = decodedInstruction[type];
//   if (type === 'settleFunds') {
//     const settleFundsData = getSettleFundsData(accounts, accountKeys);
//     if (!settleFundsData) {
//       return;
//     } else {
//       data = {...data, ...settleFundsData};
//     }
//   } else if (type === 'newOrder') {
//     const newOrderData = getNewOrderData(accounts, accountKeys);
//     data = {...data, ...newOrderData};
//   } else if (type === 'newOrderV3') {
//     const newOrderData = getNewOrderV3Data(accounts, accountKeys);
//     data = {...data, ...newOrderData};
//   }
//   return {
//     type,
//     data,
//     market,
//     marketInfo,
//   };
// };

const handleSystemInstruction = (walletKey: PublicKey, instruction: TransactionInstruction): InstructionType<SystemInstructionParams> | undefined => {
  let decoded: SystemInstructionParams | undefined = undefined;
  const type = SystemInstruction.decodeInstructionType(instruction);
  switch (type) {
    case 'Create':
      decoded = SystemInstruction.decodeCreateAccount(instruction);
      break;
    case 'CreateWithSeed':
      decoded = SystemInstruction.decodeCreateWithSeed(instruction);
      break;
    case 'Allocate':
      decoded = SystemInstruction.decodeAllocate(instruction);
      break;
    case 'AllocateWithSeed':
      decoded = SystemInstruction.decodeAllocateWithSeed(instruction);
      break;
    case 'Assign':
      decoded = SystemInstruction.decodeAssign(instruction);
      break;
    case 'AssignWithSeed':
      decoded = SystemInstruction.decodeAssignWithSeed(instruction);
      break;
    case 'Transfer':
      decoded = SystemInstruction.decodeTransfer(instruction);
      break;
    case 'TransferWithSeed':
      decoded = SystemInstruction.decodeTransferWithSeed(instruction);
      break;
    case 'AdvanceNonceAccount':
      decoded = SystemInstruction.decodeNonceAdvance(instruction);
      break;
    case 'WithdrawNonceAccount':
      decoded = SystemInstruction.decodeNonceWithdraw(instruction);
      break;
    case 'InitializeNonceAccount':
      decoded = SystemInstruction.decodeNonceInitialize(instruction);
      break;
    case 'AuthorizeNonceAccount':
      decoded = SystemInstruction.decodeNonceAuthorize(instruction);
      break;
    default:
      assertNever(type);
  }

  if (!decoded || fromPubKeyNotEquals(decoded, walletKey)) {
    return undefined;
  }

  return {
    type: 'system' + type,
    data: decoded,
  };
};

type SystemInstructionParams =
  CreateAccountParams
  | CreateAccountWithSeedParams
  | AllocateParams
  | AllocateWithSeedParams
  | AssignParams
  | AssignWithSeedParams
  | TransferParams
  | TransferWithSeedParams
  | AdvanceNonceParams
  | WithdrawNonceParams
  | InitializeNonceParams
  | AuthorizeNonceParams;

function fromPubKeyNotEquals<T>(params: T, key: PublicKey): boolean | undefined{
  const paramsKey = params['fromPubkey'];
  if(paramsKey instanceof PublicKey){
    return !paramsKey.equals(key)
  }
  else{
    return undefined;
  }
}

function assertNever(never: never): asserts never is never {
  if (never) {
    throw new Error('Encountered value for never: ' + never);
  }
}

const handleStakeInstruction = (walletKey: PublicKey, instruction: TransactionInstruction): InstructionType<StakeInstructionParams> | undefined => {
  let decoded: StakeInstructionParams | undefined = undefined;
  const type = StakeInstruction.decodeInstructionType(instruction);
  switch (type) {
    case 'AuthorizeWithSeed':
      decoded = StakeInstruction.decodeAuthorizeWithSeed(instruction);
      break;
    case 'Merge':
      decoded = StakeInstruction.decodeMerge(instruction);
      break;
    case 'Authorize':
      decoded = StakeInstruction.decodeAuthorize(instruction);
      break;
    case 'Deactivate':
      decoded = StakeInstruction.decodeDeactivate(instruction);
      break;
    case 'Delegate':
      decoded = StakeInstruction.decodeDelegate(instruction);
      break;
    case 'Initialize':
      const initialize = StakeInstruction.decodeInitialize(instruction);
      let lockup;
      if (initialize.lockup && initialize.lockup.unixTimestamp === 0 && initialize.lockup.epoch === 0 && initialize.lockup.custodian.equals(PublicKey.default)) {
        lockup = 'Inactive';
      } else if (initialize.lockup) {
        lockup = `unixTimestamp: ${initialize.lockup.unixTimestamp}, custodian: ${initialize.lockup.epoch}, custodian: ${initialize.lockup.custodian.toBase58()}`;
      } else{
        lockup = `undefined`;
      }
      decoded = {
        stakePubkey: initialize.stakePubkey,
        lockup,
        authorizedStaker: initialize.authorized.staker,
        authorizedWithdrawer: initialize.authorized.withdrawer,
      }
      break;
    case 'Split':
      decoded = StakeInstruction.decodeSplit(instruction);
      break;
    case 'Withdraw':
      decoded = StakeInstruction.decodeWithdraw(instruction);
      break;
    default:
      assertNever(type);
  }

  if (!decoded || fromPubKeyNotEquals(decoded, walletKey)) {
    return undefined;
  }

  return {
    type: 'stake' + type,
    data: decoded,
  };
};

type StakeInstructionParams =
  AuthorizeWithSeedStakeParams
  | AuthorizeStakeParams
  | MergeStakeParams
  | DeactivateStakeParams
  | DelegateStakeParams
  | Omit<InitializeStakeParams, 'authorized' | 'lockup'> & { lockup: string, authorizedStaker: PublicKey, authorizedWithdrawer: PublicKey};


const handleTokenInstruction = (
  walletKey: PublicKey,
  instruction: TransactionInstruction,
): InstructionType<TokenInstruction['params']> => {
  let decoded = decodeTokenInstruction(instruction);

  return {
    type: decoded.type,
    data: decoded.params,
  };
};

// const getNewOrderData = (accounts, accountKeys) => {
//   const openOrdersPubkey = getAccountByIndex(
//     accounts,
//     accountKeys,
//     NEW_ORDER_OPEN_ORDERS_INDEX,
//   );
//   const ownerPubkey = getAccountByIndex(
//     accounts,
//     accountKeys,
//     NEW_ORDER_OWNER_INDEX,
//   );
//   return {openOrdersPubkey, ownerPubkey};
// };

// const getNewOrderV3Data = (accounts, accountKeys) => {
//   const openOrdersPubkey = getAccountByIndex(
//     accounts,
//     accountKeys,
//     NEW_ORDER_V3_OPEN_ORDERS_INDEX,
//   );
//   const ownerPubkey = getAccountByIndex(
//     accounts,
//     accountKeys,
//     NEW_ORDER_V3_OWNER_INDEX,
//   );
//   return {openOrdersPubkey, ownerPubkey};
// };

// const getSettleFundsData = (accounts, accountKeys) => {
//   const basePubkey = getAccountByIndex(
//     accounts,
//     accountKeys,
//     SETTLE_FUNDS_BASE_WALLET_INDEX,
//   );
//
//   const quotePubkey = getAccountByIndex(
//     accounts,
//     accountKeys,
//     SETTLE_FUNDS_QUOTE_WALLET_INDEX,
//   );
//
//   if (!basePubkey || !quotePubkey) {
//     return;
//   }
//
//   return {basePubkey, quotePubkey};
// };
