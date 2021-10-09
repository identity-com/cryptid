import React, { useEffect, useState } from 'react';
import bs58 from 'bs58';
import { Divider, Typography } from '@material-ui/core';
import CardContent from '@material-ui/core/CardContent';
import CircularProgress from '@material-ui/core/CircularProgress';
import Box from '@material-ui/core/Box';
import { decodeMessage } from '../utils/transactions';
import { useConnection, useSolanaExplorerUrlSuffix } from '../utils/connection';
import NewOrder from './instructions/NewOrder';
import UnknownInstruction from './instructions/UnknownInstruction';
import StakeInstruction from '../components/instructions/StakeInstruction';
import SystemInstruction from '../components/instructions/SystemInstruction';
import DexInstruction from '../components/instructions/DexInstruction';
import TokenInstruction from '../components/instructions/TokenInstruction';
import {useCryptid} from "../utils/Cryptid/cryptid";

type UnpackArray<T> = T extends Array<infer U> ? U : T;
type UnpackPromise<T> = T extends Promise<infer U> ? U : T;
type TxType = UnpackPromise<ReturnType<typeof decodeMessage>>;

export default function SignTransactionFormContent(
  { origin, messages }: { origin: string, messages: Buffer[] }
) {
  const explorerUrlSuffix = useSolanaExplorerUrlSuffix();
  const { selectedCryptidAccount } = useCryptid();
  if (!selectedCryptidAccount){
    throw new Error("No cryptid account selected. Should have been selected by connection.");
  }

  const [parsing, setParsing] = useState(true);
  // An array of arrays, where each element is the set of instructions for a
  // single transaction.
  const [txInstructions, setTxInstructions] = useState<TxType[]>([]);

  const isMultiTx = messages.length > 1;

  const wallet = {
    publicKey: selectedCryptidAccount.address,
    signTransaction: selectedCryptidAccount.signTransaction
  }

  useEffect(() => {
    Promise.all(messages.map((m) => decodeMessage(wallet, m))).then(
      (txInstructions) => {
        setTxInstructions(txInstructions);
        setParsing(false);
      },
    );
  }, [messages, selectedCryptidAccount]);

  const onOpenAddress = (address?: string) => {
    address &&
      window.open(
        'https://solscan.io/account/' + address + explorerUrlSuffix,
        '_blank',
      );
  };

  const getContent = (instruction: UnpackArray<TxType>) => {
    console.log("Type: " + instruction?.instruction.type)
    switch (instruction?.instruction.type) {
      case 'cancelOrder':
      case 'cancelOrderV2':
      case 'matchOrders':
      case 'settleFunds':
        return (
          <DexInstruction
            instruction={{...instruction.instruction, rawData: instruction.rawData}}
            onOpenAddress={onOpenAddress}
          />
        );
      case 'closeAccount':
      case 'initializeAccount':
      case 'transfer':
      case 'approve':
      case 'revoke':
      case 'mintTo':
        return (
          <TokenInstruction
            instruction={{...instruction.instruction, rawData: instruction.rawData}}
            onOpenAddress={onOpenAddress}
          />
        );
      case 'systemCreateWithSeed':
      case 'systemCreate':
      case 'systemTransfer':
        return (
          <SystemInstruction
            instruction={{...instruction.instruction, rawData: instruction.rawData}}
            onOpenAddress={onOpenAddress}
          />
        );
      case 'stakeAuthorizeWithSeed':
      case 'stakeAuthorize':
      case 'stakeDeactivate':
      case 'stakeDelegate':
      case 'stakeInitialize':
      case 'stakeSplit':
      case 'stakeWithdraw':
        return (
          <StakeInstruction
            instruction={{...instruction.instruction, rawData: instruction.rawData}}
            onOpenAddress={onOpenAddress}
          />
        );
      case 'newOrder':
        return (
          <NewOrder instruction={{...instruction.instruction, rawData: instruction.rawData}} onOpenAddress={onOpenAddress} />
        );
      case 'newOrderV3':
        return (
          <NewOrder
            instruction={{...instruction.instruction, rawData: instruction.rawData}}
            onOpenAddress={onOpenAddress}
            v3={true}
          />
        );
      default:
        return (
          <UnknownInstruction
            instruction={{...instruction.instruction, rawData: instruction.rawData}}
            onOpenAddress={onOpenAddress}
          />
        );
    }
  };

  const txLabel = (idx: number) => {
    return (
      <>
        <Typography variant="h6" gutterBottom>
          Transaction {idx.toString()}
        </Typography>
        <Divider style={{ marginTop: 20 }} />
      </>
    );
  };

  const txListItem = (instructions: TxType, txIdx: number) => {
    const ixs = instructions.map((instruction, i) => (
      <Box style={{ marginTop: 20 }} key={i}>
        {getContent(instruction)}
        <Divider style={{ marginTop: 20 }} />
      </Box>
    ));

    if (!isMultiTx) {
      return ixs;
    }

    return (
      <Box style={{ marginTop: 20 }} key={txIdx}>
        {txLabel(txIdx)}
        {ixs}
      </Box>
    );
  };

  return (
    <div className="bg-white shadow overflow-hidden sm:rounded-md">
      <ul role="list" className="divide-y divide-gray-200">
        {txInstructions.map((instruction) => (
          <li>

          </li>
        ))}
      </ul>
    </div>
    // <CardContent>
    //   {parsing ? (
    //     <>
    //       <div
    //         style={{
    //           display: 'flex',
    //           alignItems: 'flex-end',
    //           marginBottom: 20,
    //         }}
    //       >
    //         <CircularProgress style={{ marginRight: 20 }} />
    //         <Typography
    //           variant="subtitle1"
    //           style={{ fontWeight: 'bold' }}
    //           gutterBottom
    //         >
    //           Parsing transaction{isMultiTx ? 's' : ''}:
    //         </Typography>
    //       </div>
    //       {messages.map((message, idx) => (
    //         <Typography key={idx} style={{ wordBreak: 'break-all' }}>
    //           {bs58.encode(message)}
    //         </Typography>
    //       ))}
    //     </>
    //   ) : (
    //     <>
    //       <Typography variant="h6" gutterBottom>
    //         {txInstructions
    //           ? `${origin} wants to:`
    //           : `Unknown transaction data`}
    //       </Typography>
    //       {txInstructions ? (
    //         txInstructions.map((instructions, txIdx) =>
    //           txListItem(instructions, txIdx),
    //         )
    //       ) : (
    //         <>
    //           <Typography
    //             variant="subtitle1"
    //             style={{ fontWeight: 'bold' }}
    //             gutterBottom
    //           >
    //             Unknown transaction{isMultiTx ? 's' : ''}:
    //           </Typography>
    //           {messages.map((message) => (
    //             <Typography style={{ wordBreak: 'break-all' }}>
    //               {bs58.encode(message)}
    //             </Typography>
    //           ))}
    //         </>
    //       )}
    //     </>
    //   )}
    // </CardContent>
  );
}
