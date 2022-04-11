import React, { useEffect, useMemo, useState } from 'react';
import bs58 from 'bs58';
import { Typography } from '@material-ui/core';
import CardContent from '@material-ui/core/CardContent';
import CircularProgress from '@material-ui/core/CircularProgress';
import { decodeMessage, getProgram } from '../utils/transactions';
import { useConnection, useSolanaExplorerUrlSuffix } from '../utils/connection';
import NewOrder from './instructions/views/NewOrder';
import UnknownInstruction from './instructions/views/UnknownInstruction';
import StakeInstruction from '../components/instructions/views/StakeInstruction';
import SystemInstruction from '../components/instructions/views/SystemInstruction';
import DexInstruction from '../components/instructions/views/DexInstruction';
import TokenInstruction from '../components/instructions/views/TokenInstruction';
import {useCryptid, useCryptidAccountPublicKeys} from "../utils/Cryptid/cryptid";
import TransactionView from "./instructions/layout/TransactionView";

function isSafeInstruction(publicKeys, owner, txInstructions) {
  let unsafe = false;
  const states = {
    CREATED: 0,
    OWNED: 1,
    CLOSED_TO_OWNED_DESTINATION: 2,
  };
  const accountStates = {};

  function isOwned(pubkey) {
    if (!pubkey) {
      return false;
    }
    if (
      publicKeys?.some((ownedAccountPubkey) =>
        ownedAccountPubkey.equals(pubkey),
      )
    ) {
      return true;
    }
    return accountStates[pubkey.toBase58()] === states.OWNED;
  }

  txInstructions.forEach((instructions) => {
    instructions.forEach((instruction) => {
      if (!instruction) {
        unsafe = true;
      } else {
        if (instruction.type === 'raydium') {
          // Whitelist raydium for now.
        } else if (instruction.type === 'mango') {
          // Whitelist mango for now.
        } else if (
          ['cancelOrder', 'matchOrders', 'cancelOrderV3'].includes(
            instruction.type,
          )
        ) {
          // It is always considered safe to cancel orders, match orders
        } else if (instruction.type === 'systemCreate') {
          let { newAccountPubkey } = instruction.data;
          if (!newAccountPubkey) {
            unsafe = true;
          } else {
            accountStates[newAccountPubkey.toBase58()] = states.CREATED;
          }
        } else if (['newOrder', 'newOrderV3'].includes(instruction.type)) {
          // New order instructions are safe if the owner is this wallet
          let { openOrdersPubkey, ownerPubkey } = instruction.data;
          if (ownerPubkey && owner.equals(ownerPubkey)) {
            accountStates[openOrdersPubkey.toBase58()] = states.OWNED;
          } else {
            unsafe = true;
          }
        } else if (instruction.type === 'initializeAccount') {
          // New SPL token accounts are only considered safe if they are owned by this wallet and newly created
          let { ownerPubkey, accountPubkey } = instruction.data;
          if (
            owner &&
            ownerPubkey &&
            owner.equals(ownerPubkey) &&
            accountPubkey &&
            accountStates[accountPubkey.toBase58()] === states.CREATED
          ) {
            accountStates[accountPubkey.toBase58()] = states.OWNED;
          } else {
            unsafe = true;
          }
        } else if (instruction.type === 'settleFunds') {
          // Settling funds is only safe if the destinations are owned
          let { basePubkey, quotePubkey } = instruction.data;
          if (!isOwned(basePubkey) || !isOwned(quotePubkey)) {
            unsafe = true;
          }
        } else if (instruction.type === 'closeAccount') {
          // Closing is only safe if the destination is owned
          let { sourcePubkey, destinationPubkey } = instruction.data;
          if (isOwned(destinationPubkey)) {
            accountStates[sourcePubkey.toBase58()] =
              states.CLOSED_TO_OWNED_DESTINATION;
          } else {
            unsafe = true;
          }
        } else {
          unsafe = true;
        }
      }
    });
  });

  // Check that all accounts are owned
  if (
    Object.values(accountStates).some(
      (state) =>
        ![states.CLOSED_TO_OWNED_DESTINATION, states.OWNED].includes(state),
    )
  ) {
    unsafe = true;
  }

  return !unsafe;
}

export default function SignTransactionFormContent({
                                                     origin,
                                                     messages,
                                                     messageMeta,
                                                     onApprove,
                                                     autoApprove,
                                                     buttonRef,
                                                     isLargeTransaction,
                                                     numFailed
                                                  }) {

  const explorerUrlSuffix = useSolanaExplorerUrlSuffix();
  const connection = useConnection();
  const { selectedCryptidAccount } = useCryptid();
  const [publicKeys] = useCryptidAccountPublicKeys(selectedCryptidAccount);

  const [parsing, setParsing] = useState(true);
  // An array of arrays, where each element is the set of instructions for a
  // single transaction.
  const [txInstructions, setTxInstructions] = useState(null);

  const [expandedTransaction, setExpandedTransaction] = useState(0);
  const [expandedInstruction, setExpandedInstruction] = useState();

  const isMultiTx = messages.length > 1;

  const wallet = {
    publicKey: selectedCryptidAccount.address,
    signTransaction: selectedCryptidAccount.signTransaction
  }

  useEffect(() => {
    Promise.all(messages.map((m) => decodeMessage(connection, wallet, m))).then(
      (txInstructions) => {
        setTxInstructions(txInstructions);
        setParsing(false);
      },
    );
  }, [messages, connection, selectedCryptidAccount]);

  const validator = useMemo(() => {
    return {
      safe:
        publicKeys &&
        txInstructions &&
        isSafeInstruction(publicKeys, selectedCryptidAccount.address, txInstructions),
    };
  }, [publicKeys, txInstructions, selectedCryptidAccount]);

  useEffect(() => {
    if (validator.safe && autoApprove) {
      console.log('Auto approving safe transaction');
      onApprove();
    } else {
      // brings window to front when we receive new instructions
      // this needs to be executed from wallet instead of adapter
      // to ensure chrome brings window to front
      window.focus();

      // Scroll to approve button and focus it to enable approve with enter.
      // Keep currentButtonRef in local variable, so the reference can't become
      // invalid until the timeout is over. this was happening to all auto-
      // approvals for unknown reasons.
      let currentButtonRef = buttonRef.current;
      if (currentButtonRef) {
        currentButtonRef.scrollIntoView({ behavior: 'smooth' });
        setTimeout(() => currentButtonRef.focus(), 50);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [validator, autoApprove, buttonRef]);

  const onOpenAddress = (address) => {
    address &&
    window.open(
      'https://explorer.identity.com/address/' + address + explorerUrlSuffix,
      '_blank',
    );
  };

  const getContent = (instruction, props) => {
    switch (instruction?.type) {
      case 'cancelOrder':
      case 'cancelOrderV2':
      case 'matchOrders':
      case 'settleFunds':
        return (
          <DexInstruction
            instruction={instruction}
            onOpenAddress={onOpenAddress}
            {...props}
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
            instruction={instruction}
            onOpenAddress={onOpenAddress}
            {...props}
          />
        );
      case 'systemCreateWithSeed':
      case 'systemCreate':
      case 'systemTransfer':
        return (
          <SystemInstruction
            instruction={instruction}
            onOpenAddress={onOpenAddress}
            {...props}
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
            instruction={instruction}
            onOpenAddress={onOpenAddress}
            {...props}
          />
        );
      case 'newOrder':
        return (
          <NewOrder instruction={instruction} onOpenAddress={onOpenAddress} {...props}/>
        );
      case 'newOrderV3':
        return (
          <NewOrder
            instruction={instruction}
            onOpenAddress={onOpenAddress}
            v3={true}
            {...props}
          />
        );
      default:
        return (
          <UnknownInstruction
            instruction={instruction}
            onOpenAddress={onOpenAddress}
            {...props}
          />
        );
    }
  };

  const txListItem = (instructions, txIdx) => {
    const ixs = instructions.map((instruction, i) => (
      getContent(instruction, {
        index: i,
        expanded: expandedInstruction === i,
        setExpanded: (expand) => {
          expand ?
            setExpandedInstruction(i) : // expand this instruction
            (expandedInstruction === i && setExpandedInstruction(undefined))  // contract this isntruction if expanded
        },
        program: getProgram(instruction)
      })
    ));

    if (!isMultiTx) {
      return ixs;
    }
    const meta = messageMeta.length >= txIdx ? messageMeta[txIdx] : {failed: undefined, group: txIdx};

    return (
      <TransactionView index={txIdx} meta={meta}>
        {ixs}
      </TransactionView>
      // <Box style={{ marginTop: 20 }} key={txIdx}>
      //   {txLabel(txIdx)}
      //   {ixs}
      // </Box>
    );
  };

  return (
    <CardContent>
      {parsing ? (
        <>
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-end',
              marginBottom: 20,
            }}
          >
            <CircularProgress style={{ marginRight: 20 }} />
            <Typography
              variant="subtitle1"
              style={{ fontWeight: 'bold' }}
              gutterBottom
            >
              Parsing transaction{isMultiTx > 0 ? 's' : ''}:
            </Typography>
          </div>
          {messages.map((message, idx) => (
            <Typography key={idx} style={{ wordBreak: 'break-all' }}>
              {bs58.encode(message)}
            </Typography>
          ))}
        </>
      ) : (
        <>
          <div className='text-2xl pb-3'>
            {txInstructions
              ? (isLargeTransaction ? `Propose from ${origin}:` : `Approve from ${origin}:`)
              : `Unknown transaction data`}
          </div>
          {numFailed == 0 || <div class="text-red-800 px-2 pb-2">
            {numFailed > 1 ? `${numFailed} transactions have ` : `1 transaction has `} failed for being too large. Click
            the expand button below to split the transaction.
          </div>}
          {txInstructions ? (
            txInstructions.map((instructions, txIdx) =>
              txListItem(instructions, txIdx),
            )
          ) : (
            <>
              <Typography
                variant="subtitle1"
                style={{ fontWeight: 'bold' }}
                gutterBottom
              >
                Unknown transaction{isMultiTx > 0 ? 's' : ''}:
              </Typography>
              {messages.map((message) => (
                <Typography style={{ wordBreak: 'break-all' }}>
                  {bs58.encode(message)}
                </Typography>
              ))}
            </>
          )}
        </>
      )}
    </CardContent>
  );
}
