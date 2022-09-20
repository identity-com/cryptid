import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {useCryptid} from '../utils/Cryptid/cryptid';
import {PublicKey, Transaction} from '@solana/web3.js';
import bs58 from 'bs58';
import {
  CardContent,
  Typography,
  Card,
  CardActions, Divider,
} from '@material-ui/core';
import {makeStyles} from '@material-ui/core/styles';
import SignTransactionFormContent from '../components/SignTransactionFormContent';
import SignFormContent from '../components/SignFormContent';
import {CryptidSummary} from "../components/Cryptid/CryptidSummary";
import IdentitySelector from "../components/selectors/IdentitySelector";
import {CheckCircleIcon, XCircleIcon, CubeTransparentIcon} from "@heroicons/react/solid";
import {CryptidButton} from "../components/balances/CryptidButton";
import {useWalletContext} from '../utils/wallet';
import {useConnection} from '../utils/connection';

type ID = any;


type RequestMessage = {
  id: ID,
} & ({
  method: 'connect'
} | {
  method: 'signTransaction',
  params: { transaction: string }
} | {
  method: 'signAllTransactions',
  params: { transactions: string[], failed?: boolean[], singleTx?: boolean },
} | {
  method: 'proposeTransactions',
  params: {
    transactions: { transactions: string[], propose: boolean }[],
    singleTx?: boolean
  },
} | {
  method: 'sign',
  params: { data: any, display: string },
} | {
  method: 'signWithDIDKey',
  params: { message: Uint8Array },
} | {
  method: 'getDID',
})

type ResponseMessage = {
  error: string,
  id?: ID,
} | {
  method: 'disconnected',
} | {
  method: 'connected',
  params: { publicKey: string, autoApprove: boolean },
} | {
  result: { transaction: string },
} | {
  result: { transactions: string[] },
} | {
  did: string,
  keyName: string,
} | {
  signature: Uint8Array,
}

export default function PopupPage({opener}: { opener: Window }) {
  const origin = useMemo(() => {
    let params = new URLSearchParams(window.location.hash.slice(1));
    const origin = params.get('origin');
    if (!origin) {
      throw new Error('No origin');
    }
    return origin;
  }, []);
  const connection = useConnection();
  const {selectedCryptidAccount} = useCryptid();

  const [connectedAccount, setConnectedAccount] = useState<PublicKey | null>(null);
  const hasConnectedAccount = useMemo(() => {
    return !!connectedAccount;
  }, [connectedAccount]);
  const [requests, setRequests] = useState<RequestMessage[]>([]);
  const [autoApprove, setAutoApprove] = useState(false);
  const postMessage = useCallback((
    (message: ResponseMessage) => {
      opener.postMessage({jsonrpc: '2.0', ...message}, origin);
    }
  ), [opener, origin]);

  const {wallet} = useWalletContext();

  useEffect(() => {
    if (hasConnectedAccount) {
      function unloadHandler() {
        postMessage({method: 'disconnected'});
      }

      window.addEventListener('beforeunload', unloadHandler);
      return () => {
        unloadHandler();
        window.removeEventListener('beforeunload', unloadHandler);
      };
    }
  }, [hasConnectedAccount, postMessage, origin]);

  useEffect(() => {
    if (
      selectedCryptidAccount &&
      connectedAccount &&
      (!selectedCryptidAccount.address || !connectedAccount.equals(selectedCryptidAccount.address))) {
      setConnectedAccount(null);
    }
  }, [connectedAccount, selectedCryptidAccount]);

  useEffect(() => {
    function messageHandler(e: MessageEvent<RequestMessage>) {
      if (e.origin === origin && e.source === window.opener) {
        if (
          e.data.method !== 'signTransaction' &&
          e.data.method !== 'signAllTransactions' &&
          e.data.method !== 'sign' &&
          e.data.method !== 'getDID' &&
          e.data.method !== 'signWithDIDKey'
        ) {
          postMessage({error: 'Unsupported method', id: e.data.id});
        }

        setRequests((requests) => [...requests, e.data]);
      }
    }

    window.addEventListener('message', messageHandler);
    return () => window.removeEventListener('message', messageHandler);
  }, [origin, postMessage]);

  const request = requests.length > 0 ? requests[0] : null;
  const popRequest = () => setRequests((requests) => requests.slice(1));

  const {payloads, messageDisplay}: {
      payloads: (Buffer | Uint8Array)[],
      messageDisplay: 'tx' | 'utf8' | 'hex' | 'message'
    } = useMemo(() => {
        if (!request || request.method === 'connect') {
          return {payloads: [], messageDisplay: 'tx'};
        }
        switch (request.method) {
          case 'signTransaction':
            window.focus();
            return {
              payloads: [bs58.decode(request.params.transaction)],
              messageDisplay: 'tx',
            };
          case 'signAllTransactions':
            window.focus();
            return {
              payloads: request.params.transactions.map((t) => bs58.decode(t)),
              messageDisplay: 'tx',
            };
          case 'proposeTransactions':
            window.focus();
            return {
              payloads: request.params.transactions.reduce((previousValue: Buffer[], currentValue: { transactions: string[], propose: boolean }) => {
                currentValue.transactions.forEach(t => {
                  previousValue.push(bs58.decode(t))
                });

                return previousValue;
              }, []),
              messageDisplay: 'tx',
            };
          case 'sign':
            if (!(request.params.data instanceof Uint8Array)) {
              throw new Error('Data must be instance of Uint8Array');
            }
            window.focus();
            return {
              payloads: [request.params.data],
              messageDisplay: request.params.display === 'utf8' ? 'utf8' : 'hex',
            };
          case 'getDID':
            if (!selectedCryptidAccount) {
              postMessage({
                error: 'No selected cryptid account',
                id: request.id,
              });
            } else {
              postMessage({
                did: selectedCryptidAccount.did,
                keyName: selectedCryptidAccount.baseAccount().activeSigningKeyAlias,
              });
            }
            popRequest();
            return {payloads: [], messageDisplay: 'tx'}
          case
          'signWithDIDKey':
            if (wallet.signMessage !== undefined) {
              return {payloads: [request.params.message], messageDisplay: 'message'}
            } else {
              postMessage({
                error: 'Wallet does not support signing messages',
                id: request.id,
              });
              popRequest();
              return {payloads: [], messageDisplay: 'tx'}
            }
        }
      },
      [request, postMessage, selectedCryptidAccount, wallet]
    )
  ;

  if (hasConnectedAccount && requests.length === 0) {
    focusParent();

    return (
      <Typography>
        Please keep this window open in the background.
      </Typography>
    );
  }

  const mustConnect =
    !connectedAccount || (
      selectedCryptidAccount &&
      selectedCryptidAccount.address &&
      !connectedAccount.equals(selectedCryptidAccount.address)
    );

  if (mustConnect) {
    function connect(autoApprove: boolean) {
      if (!selectedCryptidAccount || !selectedCryptidAccount.address) {
        throw new Error('No selected address');
      }
      setConnectedAccount(selectedCryptidAccount.address);
      postMessage({
        method: 'connected',
        params: {publicKey: selectedCryptidAccount.address.toBase58(), autoApprove},
      });
      setAutoApprove(autoApprove);
      focusParent();
    }

    return <ApproveConnectionForm origin={origin} onApprove={connect} autoApprove={autoApprove}/>;
  }

  if (!request) {
    throw new Error('No request');
  }
  if (!(request.method === 'signTransaction' ||
    request.method === 'signAllTransactions' ||
    request.method === 'proposeTransactions' ||
    request.method === 'sign' ||
    request.method === 'getDID' ||
    request.method === 'signWithDIDKey')) {
    throw new Error('Unknown method');
  }
  if (!selectedCryptidAccount) {
    throw new Error('No selected cryptid account');
  }

  async function onExpand() {
    if (!selectedCryptidAccount) {
      throw new Error('No selected cryptid account');
    }
    if (request?.method !== 'signAllTransactions') {
      throw new Error(`Invalid method ${request?.method}`);
    }

    if (!request.params.failed) {
      throw new Error('No failures found');
    }

    const groups: { transactions: string[], propose: boolean }[] = [];

    for (const i in request.params.transactions) {
      const transaction = request.params.transactions[i];
      if (request.params.failed[i]) {
        const {
          setupTransactions,
          executeTransaction
        } = await selectedCryptidAccount.signLargeTransaction(Transaction.from(bs58.decode(transaction)));

        groups.push({
          transactions: [...setupTransactions, executeTransaction].map(t => bs58.encode(t.serialize())),
          propose: true
        });
      } else {
        groups.push({
          transactions: [transaction],
          propose: false
        });
      }
    }

    setRequests([
      {
        id: request?.id,
        method: 'proposeTransactions',
        params: {
          transactions: groups,
          singleTx: !!request.params.singleTx
        }
      }
    ]);
  }

  async function onApprove() {
    if (!request) {
      throw new Error('onApprove: No request');
    }

    switch (request.method) {
      case 'sign':
        popRequest();
        throw new Error('onApprove: Not supported');
      case 'signTransaction':
        if (await sendTransaction(payloads[0])) {
          popRequest();
          opener.focus();
        } else {
          // scroll to top so user can see the error
          window.scrollTo(0, 0);
        }
        break;
      case 'signAllTransactions':
        if (await sendTransactions(payloads)) {
          popRequest();
          opener.focus();
        } else {
          // scroll to top so user can see the error
          window.scrollTo(0, 0);
        }
        break;
      case 'proposeTransactions':
        await sendProposeTransactions();
        popRequest();
        opener.focus();
        break;
      case 'signWithDIDKey':
        popRequest();
        if (wallet.signMessage !== undefined) {
          postMessage({
            signature: await wallet.signMessage(request.params.message),
          })
        } else {
          postMessage({
            error: 'Wallet does not support signing messages',
            id: request.id,
          })
        }
        break;
      default:
        popRequest();
        throw new Error('onApprove: Unexpected method: ' + request.method);
    }
  }

  async function sendTransaction(transactionBuffer: Buffer | Uint8Array) {
    const transaction = Transaction.from(transactionBuffer);
    if (!request) {
      throw new Error('sendTransaction: no request');
    }
    if (!selectedCryptidAccount) {
      throw new Error('sendTransaction: no selected cryptid account');
    }

    try {
      postMessage({
        result: {
          transaction: await selectedCryptidAccount
            .signTransaction(transaction)
            .then((signedTx) => signedTx.serialize({verifySignatures: false}))
            .then(bs58.encode),
        },
        id: request.id,
      });

      return true;
    } catch (e) {
      setRequests([
        {
          id: request?.id,
          method: 'signAllTransactions',
          params: {
            transactions: [bs58.encode(transactionBuffer)],
            failed: [true],
            singleTx: true
          }
        }
      ]);

      return false;
    }
  }

  async function sendTransactions(transactionBuffers: (Buffer | Uint8Array)[]): Promise<boolean> {
    if (!request) {
      throw new Error('sendTransactions: no request');
    }
    if (!selectedCryptidAccount) {
      throw new Error('sendTransactions: no selected cryptid account');
    }

    const transactions = transactionBuffers.map(Transaction.from);

    const failed: boolean[] = []
    const txs: string[] = [];
    for (const tx of transactions) {
      try {
        const encoded = await selectedCryptidAccount
          .signTransaction(tx)
          .then((signedTx) => signedTx.serialize({verifySignatures: false}))
          .then(bs58.encode);

        txs.push(encoded);
        failed.push(false);
      } catch (e) {
        txs.push(bs58.encode(tx.serialize({verifySignatures: false})));
        failed.push(true);
      }
    }

    // No failures
    if (failed.filter(f => f).length === 0) {
      postMessage({
        result: {
          transactions: txs,
        },
        id: request.id,
      });

      return true;
    } else {
      setRequests([
        {
          id: request?.id,
          method: 'signAllTransactions',
          params: {
            transactions: txs,
            failed
          }
        }
      ]);
      return false;
    }
  }

  async function sendProposeTransactions() {
    if (!request) {
      throw new Error('sendProposeTransactions: no request');
    }
    if (!selectedCryptidAccount) {
      throw new Error('sendProposeTransactions: no selected cryptid account');
    }

    if (request.method !== 'proposeTransactions') {
      throw new Error('Invalid method for propose');
    }

    try {
      const signedTransactions: string[] = [];
      for (let transactions of request.params.transactions) {
        let lastSignature: string | undefined;
        for (let i in transactions.transactions) {
          let signedTransaction = transactions.transactions[i];
          // if it is not a propose tx, or it is the last tx, send back to client - else execute
          if (!transactions.propose || transactions.transactions.length === (parseInt(i) + 1)) {
            signedTransactions.push(signedTransaction);
          } else {
            lastSignature = await connection.sendRawTransaction(bs58.decode(signedTransaction));
            await connection.confirmTransaction(lastSignature, 'confirmed');
          }
        }
      }

      if (request.params.singleTx) {
        postMessage({
          result: {
            transaction: signedTransactions[0],
          },
          id: request.id,
        });
      } else {
        postMessage({
          result: {
            transactions: signedTransactions,
          },
          id: request.id,
        });
      }
    } catch(e) {
      postMessage({
        error: 'An error occured while proposing transactions: ' + e,
        id: request.id,
      });
    }
  }

  function sendReject() {
    if (!request) {
      throw new Error('sendTransactions: no request');
    }
    popRequest();
    if (request.method === 'signWithDIDKey') {
      postMessage({
        error: 'Message signing cancelled',
        id: request.id,
      })
    } else {
      postMessage({
        error: 'Transaction cancelled',
        id: request.id,
      });
    }
  }

  const numFailed = (request.method === 'signAllTransactions' && request.params.failed)
    ? request.params.failed.filter(f => f).length
    : 0;

  const isPropose = request.method === 'proposeTransactions';
  let payloadMeta: { failed: boolean | undefined, index: number, group: number, grouped: boolean }[] = [];

  if (request.method === 'signAllTransactions') {
    payloadMeta = request.params.transactions.map((t, i) => ({
      failed: request.params.failed ? request.params.failed[i] : undefined,
      group: i,
      index: i,
      grouped: false
    }));
  } else if (request.method === 'proposeTransactions') {
    request.params.transactions.forEach((transactions, group) => {
      transactions.transactions.forEach((transaction, index) => {
        payloadMeta.push({
          failed: undefined,
          group,
          index: index + 1,
          grouped: transactions.transactions.length > 1
        })
      });
    });
  }

  return (
    <ApproveSignatureForm
      key={request.id}
      autoApprove={autoApprove}
      origin={origin}
      payloads={payloads}
      payloadMeta={payloadMeta}
      messageDisplay={messageDisplay}
      onApprove={onApprove}
      onReject={sendReject}
      onExpand={onExpand}
      isLargeTransaction={isPropose}
      numFailed={numFailed}
    />
  );
}

function focusParent() {
  try {
    window.open('', 'parent');
  } catch (err) {
    console.log('err', err);
  }
}

const useStyles = makeStyles((theme) => ({
  connection: {
    // marginTop: theme.spacing(3),
    // marginBottom: theme.spacing(3),
    // textAlign: 'center',
    // fontSize: 24,
  },
  transaction: {
    wordBreak: 'break-all',
  },
  approveButton: {
    backgroundColor: '#43a047',
    color: 'white',
  },
  actions: {
    justifyContent: 'space-between',
  },
  snackbarRoot: {
    backgroundColor: theme.palette.background.paper,
  },
  warningMessage: {
    margin: theme.spacing(1),
    color: theme.palette.text.primary,
  },
  warningIcon: {
    marginRight: theme.spacing(1),
    fontSize: 24,
  },
  warningTitle: {
    color: theme.palette.warning.light,
    fontWeight: 600,
    fontSize: 16,
    alignItems: 'center',
    display: 'flex',
  },
  warningContainer: {
    marginTop: theme.spacing(1),
  },
  divider: {
    marginTop: theme.spacing(2),
    marginBottom: theme.spacing(2),
  },
}));

function ApproveConnectionForm({origin, onApprove, autoApprove}: {
  origin: string,
  onApprove: (boolean) => void,
  autoApprove: boolean,
}) {
  const classes = useStyles();
  let {selectedCryptidAccount} = useCryptid();
  return (
    <>
      {selectedCryptidAccount && <CryptidSummary cryptidAccount={selectedCryptidAccount}/>}
      {/*Workaround for https://github.com/tailwindlabs/headlessui/issues/30  and https://github.com/mui-org/material-ui/issues/2623*/}
      <Card style={{overflow: 'visible'}}>
        <CardContent>
          <Typography variant="h6" component="h1" gutterBottom>
            Connect identity {selectedCryptidAccount?.alias}{' '}
            {selectedCryptidAccount?.isControlled && `(controlled by ${selectedCryptidAccount?.baseAccount().alias})`}{' '}
            with {origin}?
          </Typography>
          <div className={classes.connection}>
            {(() => {
              if (!selectedCryptidAccount) {
                return (<Typography variant="h6">
                  No selected Cryptid account.
                </Typography>);
              } else {
                return (
                  <div className="justify-center align-middle h-32 flex">
                    <IdentitySelector isSignerWindow={true}/>
                  </div>
                );
              }
            })()}

          </div>
          {/*<Typography>Only connect with sites you trust.</Typography>*/}
          {/*<Divider className={classes.divider} />*/}
        </CardContent>
        <CardActions className='justify-end'>
          <CryptidButton label='Deny' Icon={XCircleIcon} onClick={window.close}/>
          <CryptidButton label='Allow' Icon={CheckCircleIcon} disabled={!selectedCryptidAccount || !selectedCryptidAccount.activeSigningKey} onClick={() => onApprove(autoApprove)}/>
        </CardActions>
      </Card>
    </>
  );
}

type ApproveSignerFormProps = {
  origin: string,
  payloads: (Buffer | Uint8Array)[],
  payloadMeta: { failed: boolean | undefined, group: number, index: number, grouped: boolean }[],
  messageDisplay: 'tx' | 'utf8' | 'hex' | 'message',
  onApprove: () => void,
  onReject: () => void,
  onExpand: () => void,
  autoApprove: boolean,
  isLargeTransaction: boolean,
  numFailed: number,
};

function ApproveSignatureForm({
                                origin,
                                payloads,
                                payloadMeta,
                                messageDisplay,
                                onApprove,
                                onReject,
                                onExpand,
                                autoApprove,
                                isLargeTransaction,
                                numFailed
                              }: ApproveSignerFormProps) {
  const isMultiTx = messageDisplay === 'tx' && payloads.length > 1;
  const mapTransactionToMessageBuffer = (tx) => Transaction.from(tx).serializeMessage();

  const buttonRef = useRef<any>();

  if (autoApprove) {
    onApprove();
    return (<></>);
  }

  const renderFormContent = () => {
    if (messageDisplay === 'tx') {
      return (
        <SignTransactionFormContent
          autoApprove={autoApprove}
          origin={origin}
          messages={payloads.map(mapTransactionToMessageBuffer)}
          messageMeta={payloadMeta}
          onApprove={onApprove}
          buttonRef={buttonRef}
          isLargeTransaction={isLargeTransaction}
          numFailed={numFailed}
        />
      );
    } else if (messageDisplay === 'message') {
      return <CardContent>
        <Typography variant="h6" gutterBottom>
          {`${origin} wants to sign a message: `}
        </Typography>
        <Divider style={{ margin: 20 }} />
        <Typography style={{ wordBreak: 'break-all' }}>{bs58.encode(payloads[0])}</Typography>
        <Divider style={{ margin: 20 }} />
      </CardContent>;
    } else {
      return <SignFormContent
        origin={origin}
        message={mapTransactionToMessageBuffer(payloads[0])}
        messageDisplay={messageDisplay}
        buttonRef={buttonRef}
      />;
    }
  };

  return (
    <Card>
      {renderFormContent()}
      <CardActions className='justify-end'>
        {numFailed > 0 && <CryptidButton label='Expand' Icon={CubeTransparentIcon} onClick={onExpand}/>}
        <CryptidButton label='Cancel' Icon={XCircleIcon} onClick={onReject}/>
        <CryptidButton label={'Approve' + (isMultiTx ? ' All' : '')} Icon={CheckCircleIcon} onClick={onApprove}
                       disabled={numFailed > 0}/>
      </CardActions>
    </Card>
  );
}
