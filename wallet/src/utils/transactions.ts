import bs58 from 'bs58';
import { Connection, Message, StakeInstruction, StakeProgram, SystemInstruction, SystemProgram } from '@solana/web3.js';
import {
  decodeInstruction,
  Market,
  MARKETS,
  SETTLE_FUNDS_BASE_WALLET_INDEX,
  SETTLE_FUNDS_QUOTE_WALLET_INDEX,
  NEW_ORDER_OPEN_ORDERS_INDEX,
  NEW_ORDER_OWNER_INDEX,
  NEW_ORDER_V3_OPEN_ORDERS_INDEX,
  NEW_ORDER_V3_OWNER_INDEX,
} from '@project-serum/serum';
import { decodeTokenInstruction } from '@project-serum/token';
import { PublicKey } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from './tokens/instructions';
import { StrictWalletInterface } from "./wallet";

type DecodedInstructionView = {
  programId: PublicKey,
  type: string,
  data?: any,
  accountMetas?: {
    publicKey: PublicKey,
    isWritable: boolean
  }[]
}

const RAYDIUM_STAKE_PROGRAM_ID = new PublicKey(
  'EhhTKczWMGQt46ynNeRX1WfeagwwJd7ufHvCDjRxjo5Q',
);
const RAYDIUM_LP_PROGRAM_ID = new PublicKey(
  'RVKd61ztZW9GUwhRbbLoYVRE5Xf1B2tVscKqwZqXgEr',
);

const MANGO_PROGRAM_ID = new PublicKey(
  'JD3bq9hGdy38PuWQ4h2YJpELmHVGPPfFSuFkpzAd9zfu',
);
const MANGO_PROGRAM_ID_V2 = new PublicKey(
  '5fNfvyp5czQVX77yoACa3JJVEhdRaWjPuazuWgjhTqEH',
);
const MARKET_PROGRAM_ID = new PublicKey('DESVgJVGajEgKGXhb6XmqDHGz3VjdgP7rEVESBgxmroY');

export const getProgram = (instruction) => {
  if (!instruction?.programId) return 'Unknown Program';
  
  switch (instruction.programId.toBase58()) {
    case MARKET_PROGRAM_ID.toBase58(): return 'Serum'
    case TOKEN_PROGRAM_ID.toBase58(): return 'Token Program'
    case SystemProgram.programId.toBase58(): return 'System Program'
  }
}

const marketCache = {};
let marketCacheConnection = null;
const cacheDuration = 15 * 1000;

export const decodeMessage = async (connection: Connection, wallet: StrictWalletInterface, message: Buffer) => {
  // get message object
  const transactionMessage = Message.from(message);
  if (!transactionMessage?.instructions || !transactionMessage?.accountKeys) {
    return;
  }

  // get owned keys (used for security checks)
  const publicKey = wallet.publicKey;

  // get instructions
  const instructions: any[] = [];
  for (var i = 0; i < transactionMessage.instructions.length; i++) {
    let transactionInstruction = transactionMessage.instructions[i];
    const instruction = await toInstruction(
      connection,
      publicKey,
      transactionMessage?.accountKeys,
      transactionInstruction,
      transactionMessage,
      i,
    );
    instructions.push({
      ...instruction,
      rawData: transactionInstruction?.data,
    });
  }
  return instructions;
};

const toInstruction = async (
  connection: Connection,
  publicKey: PublicKey,
  accountKeys,
  instruction,
  transactionMessage: Message,
  index: number,
):Promise<DecodedInstructionView|undefined> => {
  if (
    instruction?.data == null ||
    !instruction?.accounts ||
    !instruction?.programIdIndex
  ) {
    return;
  }

  // get instruction data
  const decoded = bs58.decode(instruction.data);

  const programId = getAccountByIndex(
    [instruction.programIdIndex],
    accountKeys,
    0,
  );
  if (!programId) {
    return;
  }

  try {
    if (programId.equals(SystemProgram.programId)) {
      console.log('[' + index + '] Handled as system instruction');
      return handleSystemInstruction(publicKey, instruction, accountKeys);
    } else if (programId.equals(StakeProgram.programId)) {
      console.log('[' + index + '] Handled as stake instruction');
      return handleStakeInstruction(publicKey, instruction, accountKeys);
    } else if (programId.equals(TOKEN_PROGRAM_ID)) {
      console.log('[' + index + '] Handled as token instruction');
      return handleTokenInstruction(publicKey, instruction, accountKeys);
    // } else if (programId.equals(MARKET_PROGRAM_ID)) {
    //   console.log('[' + index + '] Handled as dex instruction');
    //   let decodedInstruction = decodeInstruction(decoded);
    //   const details = handleDexInstruction(
    //     connection,
    //     instruction,
    //     accountKeys,
    //     decodedInstruction,
    //   );
    //   console.log(details);
    //   return details;
    } else if (programId.equals(RAYDIUM_STAKE_PROGRAM_ID)) {
      console.log('[' + index + '] Handled as raydium stake instruction');
      // @ts-ignore
      const decodedInstruction = decodeStakeInstruction(decoded);
      return await handleRayStakeInstruction(
        connection,
        instruction,
        accountKeys,
        decodedInstruction,
      );
    } else if (programId.equals(RAYDIUM_LP_PROGRAM_ID)) {
      console.log('[' + index + '] Handled as raydium lp instruction');
      // @ts-ignore
      const decodedInstruction = decodeLpInstruction(decoded);
      return await handleRayLpInstruction(
        connection,
        instruction,
        accountKeys,
        decodedInstruction,
      );
    } else if (programId.equals(MANGO_PROGRAM_ID) || programId.equals(MANGO_PROGRAM_ID_V2)) {
      console.log('[' + index + '] Handled as mango markets instruction');
      // @ts-ignore
      let decodedInstruction = decodeMangoInstruction(decoded);
      return await handleMangoInstruction(
        connection,
        instruction,
        accountKeys,
        decodedInstruction,
      );
    } else {
      return {
        type: 'Unknown',
        accountMetas: instruction.accounts.map((index) => ({
          publicKey: accountKeys[index],
          isWritable: transactionMessage.isAccountWritable(index),
        })),
        programId,
      };
    }
  } catch (e) {
    console.log(`Failed to decode instruction: ${e}`);
  }

  // all decodings failed
  console.log('[' + index + '] Failed, data: ' + JSON.stringify(decoded));

  return;
};

const handleMangoInstruction = async (
  connection,
  instruction,
  accountKeys,
  decodedInstruction,
):Promise<DecodedInstructionView | undefined> => {
  // TODO
  return {
    type: 'mango',
    data: [],
    programId: MANGO_PROGRAM_ID
  };
};

const handleRayStakeInstruction = async (
  connection,
  instruction,
  accountKeys,
  decodedInstruction,
):Promise<DecodedInstructionView | undefined> => {
  // TODO
  return {
    type: 'raydium',
    data: [],
    programId: RAYDIUM_STAKE_PROGRAM_ID
  };
};

const handleRayLpInstruction = async (
  connection,
  instruction,
  accountKeys,
  decodedInstruction,
):Promise<DecodedInstructionView | undefined>  => {
  // TODO
  return {
    type: 'raydium',
    data: [],
    programId: RAYDIUM_LP_PROGRAM_ID
  };
};

const decodeMangoInstruction = () => {
  // TODO
  return undefined;
};

const decodeStakeInstruction = () => {
  // TODO
  return undefined;
};

const decodeLpInstruction = () => {
  // TODO
  return undefined;
};

const handleDexInstruction = (
  connection,
  instruction,
  accountKeys,
  decodedInstruction,
):DecodedInstructionView|undefined => {
  if (!decodedInstruction || Object.keys(decodedInstruction).length > 1) {
    return;
  }

  const { accounts, programIdIndex } = instruction;

  // get data
  const type = Object.keys(decodedInstruction)[0];
  let data = decodedInstruction[type];
  if (type === 'settleFunds') {
    const settleFundsData = getSettleFundsData(accounts, accountKeys);
    if (!settleFundsData) {
      return;
    } else {
      data = { ...data, ...settleFundsData };
    }
  } else if (type === 'newOrder') {
    const newOrderData = getNewOrderData(accounts, accountKeys);
    data = { ...data, ...newOrderData };
  } else if (type === 'newOrderV3') {
    const newOrderData = getNewOrderV3Data(accounts, accountKeys);
    data = { ...data, ...newOrderData };
  }
  return {
    type,
    data,
    programId: accountKeys[programIdIndex]
  };
};

const handleSystemInstruction = (publicKey, instruction, accountKeys):DecodedInstructionView|undefined => {
  const { programIdIndex, accounts, data } = instruction;
  if (!programIdIndex || !accounts || !data) {
    return;
  }

  // construct system instruction
  const systemInstruction = {
    programId: accountKeys[programIdIndex],
    keys: accounts.map((accountIndex) => ({
      pubkey: accountKeys[accountIndex],
    })),
    data: bs58.decode(data),
  };

  // get layout
  let decoded;
  const type = SystemInstruction.decodeInstructionType(systemInstruction);
  switch (type) {
    case 'Create':
      decoded = SystemInstruction.decodeCreateAccount(systemInstruction);
      break;
    case 'CreateWithSeed':
      decoded = SystemInstruction.decodeCreateWithSeed(systemInstruction);
      break;
    case 'Allocate':
      decoded = SystemInstruction.decodeAllocate(systemInstruction);
      break;
    case 'AllocateWithSeed':
      decoded = SystemInstruction.decodeAllocateWithSeed(systemInstruction);
      break;
    case 'Assign':
      decoded = SystemInstruction.decodeAssign(systemInstruction);
      break;
    case 'AssignWithSeed':
      decoded = SystemInstruction.decodeAssignWithSeed(systemInstruction);
      break;
    case 'Transfer':
      decoded = SystemInstruction.decodeTransfer(systemInstruction);
      break;
    case 'AdvanceNonceAccount':
      decoded = SystemInstruction.decodeNonceAdvance(systemInstruction);
      break;
    case 'WithdrawNonceAccount':
      decoded = SystemInstruction.decodeNonceWithdraw(systemInstruction);
      break;
    case 'InitializeNonceAccount':
      decoded = SystemInstruction.decodeNonceInitialize(systemInstruction);
      break;
    case 'AuthorizeNonceAccount':
      decoded = SystemInstruction.decodeNonceAuthorize(systemInstruction);
      break;
    default:
      return;
  }

  if (
    !decoded ||
    (decoded.fromPubkey && !publicKey.equals(decoded.fromPubkey))
  ) {
    return;
  }

  return {
    type: 'system' + type,
    data: decoded,
    programId: systemInstruction.programId
  };
};

const handleStakeInstruction = (publicKey, instruction, accountKeys):DecodedInstructionView|undefined => {
  const { programIdIndex, accounts, data } = instruction;
  if (!programIdIndex || !accounts || !data) {
    return;
  }

  // construct stake instruction
  const stakeInstruction = {
    programId: accountKeys[programIdIndex],
    keys: accounts.map((accountIndex) => ({
      pubkey: accountKeys[accountIndex],
    })),
    data: bs58.decode(data),
  };

  let decoded;
  const type = StakeInstruction.decodeInstructionType(stakeInstruction);
  switch (type) {
    case 'AuthorizeWithSeed':
      decoded = StakeInstruction.decodeAuthorizeWithSeed(stakeInstruction);
      break;
    case 'Authorize':
      decoded = StakeInstruction.decodeAuthorize(stakeInstruction);
      break;
    case 'Deactivate':
      decoded = StakeInstruction.decodeDeactivate(stakeInstruction);
      break;
    case 'Delegate':
      decoded = StakeInstruction.decodeDelegate(stakeInstruction);
      break;
    case 'Initialize':
      decoded = StakeInstruction.decodeInitialize(stakeInstruction);
      // Lockup inactive if all zeroes
      const lockup = decoded.lockup;
      if (lockup && lockup.unixTimestamp === 0 && lockup.epoch === 0 && lockup.custodian.equals(PublicKey.default)) {
        decoded.lockup = 'Inactive';
      }
      else {
        decoded.lockup = `unixTimestamp: ${lockup.unixTimestamp}, custodian: ${lockup.epoch}, custodian: ${lockup.custodian.toBase58()}`;
      }
      // flatten authorized to allow address render
      decoded.authorizedStaker = decoded.authorized.staker
      decoded.authorizedWithdrawer = decoded.authorized.withdrawer
      delete decoded.authorized
      break;
    case 'Split':
      decoded = StakeInstruction.decodeSplit(stakeInstruction);
      break;
    case 'Withdraw':
      decoded = StakeInstruction.decodeWithdraw(stakeInstruction);
      break;
    default:
      return;
  }

  if (
    !decoded ||
    (decoded.fromPubkey && !publicKey.equals(decoded.fromPubkey))
  ) {
    return;
  }

  return {
    type: 'stake' + type,
    data: decoded,
    programId: stakeInstruction.programId
  };
};

const handleTokenInstruction = (
  publicKey: PublicKey,
  instruction,
  accountKeys,
):DecodedInstructionView|undefined => {
  const { programIdIndex, accounts, data } = instruction;
  if (!programIdIndex || !accounts || !data) {
    return;
  }

  // construct token instruction
  const tokenInstruction = {
    programId: accountKeys[programIdIndex],
    keys: accounts.map((accountIndex) => ({
      pubkey: accountKeys[accountIndex],
    })),
    data: bs58.decode(data),
  };

  let decoded = decodeTokenInstruction(tokenInstruction);

  return {
    type: decoded.type,
    data: decoded.params,
    programId: tokenInstruction.programId
  }
};

const getNewOrderData = (accounts, accountKeys) => {
  const openOrdersPubkey = getAccountByIndex(
    accounts,
    accountKeys,
    NEW_ORDER_OPEN_ORDERS_INDEX,
  );
  const ownerPubkey = getAccountByIndex(
    accounts,
    accountKeys,
    NEW_ORDER_OWNER_INDEX,
  );
  return { openOrdersPubkey, ownerPubkey };
};

const getNewOrderV3Data = (accounts, accountKeys) => {
  const openOrdersPubkey = getAccountByIndex(
    accounts,
    accountKeys,
    NEW_ORDER_V3_OPEN_ORDERS_INDEX,
  );
  const ownerPubkey = getAccountByIndex(
    accounts,
    accountKeys,
    NEW_ORDER_V3_OWNER_INDEX,
  );
  return { openOrdersPubkey, ownerPubkey };
};

const getSettleFundsData = (accounts, accountKeys) => {
  const basePubkey = getAccountByIndex(
    accounts,
    accountKeys,
    SETTLE_FUNDS_BASE_WALLET_INDEX,
  );

  const quotePubkey = getAccountByIndex(
    accounts,
    accountKeys,
    SETTLE_FUNDS_QUOTE_WALLET_INDEX,
  );

  if (!basePubkey || !quotePubkey) {
    return;
  }

  return { basePubkey, quotePubkey };
};

const getAccountByIndex = (accounts, accountKeys, accountIndex) => {
  const index = accounts.length > accountIndex && accounts[accountIndex];
  return accountKeys?.length > index && accountKeys[index];
};
