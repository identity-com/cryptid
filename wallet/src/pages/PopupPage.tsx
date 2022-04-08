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
import {CheckCircleIcon, XCircleIcon} from "@heroicons/react/solid";
import {CryptidButton} from "../components/balances/CryptidButton";
import {useWalletContext} from '../utils/wallet';
import {useConnection} from "../utils/connection";
import {JsonSerializedTransaction, deserializeTransaction} from "@identity.com/wallet-adapter-cryptid";

type ID = any;


type RequestMessage = {
  id: ID,
} & ({
  method: 'connect'
} | {
  method: 'signTransaction',
  params: { transaction: string, largeTransaction?: JsonSerializedTransaction }
} | {
  method: 'signAllTransactions',
  params: { transactions: string[], execute?: string[], largeTransactions?: JsonSerializedTransaction[] },
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


/**
 * Maximum over-the-wire size of a Transaction
 *
 * 1280 is IPv6 minimum MTU
 * 40 bytes is the size of the IPv6 header
 * 8 bytes is the size of the fragment header
 */
// export const PACKET_DATA_SIZE = 1280 - 40 - 8;
export const PACKET_DATA_SIZE = 1000;
const SIGNATURE_LENGTH = 64;
const isLargeTransaction = (transaction) => {
  const len = transaction.serializeMessage().length + transaction.signatures.length * SIGNATURE_LENGTH;

  return len > PACKET_DATA_SIZE;
};

const convertTransactionDataIfNeeded = (transactionsDatum: string[]) => {
  const converted: string[] = [];
  const execute: string[] = [];

  transactionsDatum.forEach(transactionData => {
    const transaction = Transaction.from(bs58.decode(transactionData));
    if (isLargeTransaction(transaction)) {


      const proposeEncoded = '2x8BgryrsWE9TMcJNLFtyAMc2XobZvR1m2KvNiocdgZErthEZJuQLQAVhqMYQE9oHdxFRH9ZDccVCjvvDejKpQQkWZ7a6HHdoZMBD64fgaY7ojXXkRvPizzTV7m3rLemgfwHzCTg7dSFLC9ZgFFCHEiixrDbC1ttcVKeVQMqprwsL5oiNhQbGvjmHQgQvf436DRPSkMZ1pvA1vXNQdw1ZQnErPfkgBVQjYvJnwU8oNxNMKjhzcsMcUdmVkN5c4fcFUpWMuJp1FEccRU5iwx6yEyNHhkQBahExU46KiCJ7hwhFx517fHEYspxZqMm7oqpwc5VyghQKowxyReqPNt4QvLSsWP3dJepeAXE6BQJeePwjrsK5HnxtsMFBJdZcY6m9J85iucec9wxgxpu1MNV8ATLCqDkJMBcgmfRtfmcVvdAWPQVfcNe6om98ah1oCGaWckz2GSPUfWiAWeQnBfzHp9KpFaDskzZXLf3fnmgq7nGVPLe3zzMow36ANuyiibQWnR16LZeVbUa4k5T59zHVyGHrvfkpSsiW2Y7FjNPKMap1ZgdpqFuwQQVHMe6TvBQEPCB5qZELe1vU4XQ8Z29FCGkSJ8SzrykWd2Lwgcs2AwcYjfyXQixUsfY3drcxYK3knbu2GetooD9bxndkTaKFiU8xXm4zxGaRrGK9GVF4cfZREC2CupVgR2KMQLNmoNGS1Xyg2CNaRMudjBncjTcZw';
      const expandEncoded = '4J29eFKUpnWMuktTAFQervdYSa83QKjdTQYw7QpwnnUuaHYCbzybabQSTua2MaxmHzS5ie3j9pMVQMT3fP4USziXyRsHK7P4qQPw36PABF1gkxwHJgeubYQfSt2fn9pTsGdY6bsHYt8EpENwuUMeLVARZ4jra65K9cyhRmwMDunfeMdEa537ntgLMjf4pK2pSfg6FKR28bjPwHeD6dP546R69xmaHUDwcWEeMhSDXCVJ9TMDurq6NHi22Qs6jRXMNBa6nyyz6jysWgbUVAnkhVpQZrXN6snxgK8EvTsmqCw4i1fZURApNGUWfqxHzQ1LT9mWzfSoUctVhhYnTUNznwMHRojVVPTWSFtrRRSxF2JtayYxZ5ctkvpoyuzde1djqf9q4RnvZdTBAdpnQsVLboD4h9hVbnuM1BaM1S3A3PE2u9ZKTJn2UjTssgqp4BL7RzuNLuNd2ZH2z5uVTvEtV5yi1dXA6DHBwCHC9sHLJYyRQehzhCym2cpdyR';
      const executeEncoded = 'L4Ue3akEN77AyWsLycRxKMJR2SiEkufwZCN6d5Exy7P261d3qBHsYqTai4nafQVDwk2opxPYgh8pVGep4S5awV31xde5fgMdoy6L3qj3pywpj4gbpySwamjbYcsyuhFqGnACMx1erAPYeygp9Vd6YxZfx9BM99nJVyXEfsiA1SA1TVzQG56aqUyBHXfii5x91YvUVDNvm6BjJ9i8wDr1qdPGEN9KtYeQ83g1jid5g5tCkHW6sWffYunbCbdowfr19iNnpGttpruZmVR7TnBCQLPWdgsw1Kk7J3BzhSnuFk8hBJrLjWDujJo1B5WU4bxfh1zqaGEMx72BrGch2kfrG6SGjfN53Ac9DQ9i3rG8JmdvSYLaSdqLR8AAeTL6Kmi6Tzy4sapeXVSyDQHYU7MgRG8r3t9Qn9EC5EMrSybEs3hccfUK2iZFnBqrSFGN9fUnNrRdLfw3zAhRyAbRSYPd8ag35eZSsn89f3qHQaMFn9Bis4t6yUfpRpCQMgosJ3N4k32BwmSkkHY8tchvxNk2XrzTHgKFZf7mnby9mMyZ';

      converted.push(proposeEncoded);
      converted.push(expandEncoded);
      converted.push(expandEncoded);

      execute.push(executeEncoded);
    } else {
      converted.push(transactionData);
    }
  });

  return {
    transactions: converted,
    execute: execute
  };
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
    payloads: (Buffer | Uint8Array | JsonSerializedTransaction)[],
    messageDisplay: 'tx' | 'utf8' | 'hex' | 'message'
  } = useMemo(() => {

    if (!request || request.method === 'connect') {
      return {payloads: [], messageDisplay: 'tx'};
    }
    switch (request.method) {
      case 'signTransaction':
        window.focus();
        return {
          payloads: request.params.largeTransaction
            ? [request.params.largeTransaction]
            : [bs58.decode(request.params.transaction)],
          messageDisplay: 'tx',
        };
      case 'signAllTransactions':
        window.focus();

        return {
          payloads: request.params.largeTransactions
            ? request.params.largeTransactions
            : request.params.transactions.map((t) => bs58.decode(t)),
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
      case 'signWithDIDKey':
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
  }, [request, postMessage, selectedCryptidAccount, wallet]);

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
    request.method === 'sign' ||
    request.method === 'getDID' ||
    request.method === 'signWithDIDKey')) {
    throw new Error('Unknown method');
  }
  if (!selectedCryptidAccount) {
    throw new Error('No selected cryptid account');
  }

  async function onApprove() {
    if (!request) {
      popRequest();
      throw new Error('onApprove: No request');
    }
    switch (request.method) {
      case 'sign':
        popRequest();
        throw new Error('onApprove: Not supported');
      case 'signTransaction':
        const success = await sendTransaction(payloads[0]);
        if(success) {
        }
        break;
      case 'signAllTransactions':
        opener.focus();
        await sendTransactions(payloads);
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

  async function sendTransaction(transactionBuffer: Buffer | Uint8Array | JsonSerializedTransaction) {
    const transaction = transactionBuffer instanceof Buffer || transactionBuffer instanceof Uint8Array
      ? Transaction.from(transactionBuffer)
      : deserializeTransaction(transactionBuffer);

    if (!request) {
      throw new Error('sendTransaction: no request');
    }
    if (!selectedCryptidAccount) {
      throw new Error('sendTransaction: no selected cryptid account');
    }

    try {
      const signedTransaction = await selectedCryptidAccount
        .signTransaction(transaction)
        .then((signedTx) => signedTx.serialize({verifySignatures: false}))
        .then(bs58.encode);

      postMessage({
        result: {
          transaction: signedTransaction
        },
        id: request.id,
      });

      return true;
    } catch (e) {
      console.log(e);
      return false;
    }
  }

  async function sendTransactions(transactionBuffers: (Buffer | Uint8Array | JsonSerializedTransaction)[]) {
    if (!request) {
      throw new Error('sendTransactions: no request');
    }
    if (!selectedCryptidAccount) {
      throw new Error('sendTransactions: no selected cryptid account');
    }
    const signedTransactions = transactionBuffers
      .map((tx) => tx instanceof Buffer || tx instanceof Uint8Array ? Transaction.from(tx) : deserializeTransaction(tx))
      .map((tx) => selectedCryptidAccount
        .signTransaction(tx)
        .then((signedTx) => signedTx.serialize({verifySignatures: false}))
        .then(bs58.encode),
      );
    postMessage({
      result: {
        transactions: await Promise.all(signedTransactions),
      },
      id: request.id,
    });
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

  const isPropose = request.method === 'signAllTransactions' && request?.params?.execute && request.params.execute.length > 0;

  return (
    <ApproveSignatureForm
      key={request.id}
      autoApprove={autoApprove}
      origin={origin}
      payloads={payloads}
      messageDisplay={messageDisplay}
      onApprove={onApprove}
      onReject={sendReject}
      isPropose={isPropose || false}
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
          <CryptidButton label='Allow' Icon={CheckCircleIcon}
                         disabled={!selectedCryptidAccount || !selectedCryptidAccount.activeSigningKey}
                         onClick={() => onApprove(autoApprove)}/>
        </CardActions>
      </Card>
    </>
  );
}

type ApproveSignerFormProps = {
  origin: string,
  payloads: (Buffer | Uint8Array | JsonSerializedTransaction)[],
  messageDisplay: 'tx' | 'utf8' | 'hex' | 'message',
  onApprove: () => void,
  onReject: () => void,
  autoApprove: boolean,
  isPropose: boolean,
};

function ApproveSignatureForm({
                                origin,
                                payloads,
                                messageDisplay,
                                onApprove,
                                onReject,
                                autoApprove,
                                isPropose,
                              }: ApproveSignerFormProps) {
  const isMultiTx = messageDisplay === 'tx' && payloads.length > 1;
  const mapTransactionToMessageBuffer = (tx) => tx instanceof Uint8Array || tx instanceof Buffer
    ? Transaction.from(tx).serializeMessage()
    : tx;

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
          onApprove={onApprove}
          buttonRef={buttonRef}
        />
      );
    } else if (messageDisplay === 'message') {
      return <CardContent>
        <h3>Propose</h3>
        <Typography variant="h6" gutterBottom>
          {`${origin} wants to sign a message: `}
        </Typography>
        <Divider style={{margin: 20}}/>
        <Typography style={{wordBreak: 'break-all'}}>{bs58.encode(payloads[0] as Buffer | Uint8Array)}</Typography>
        <Divider style={{margin: 20}}/>
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
        <CryptidButton label='Cancel' Icon={XCircleIcon} onClick={onReject}/>
        <CryptidButton label={isPropose ? 'Propose' : ('Approve' + (isMultiTx ? ' All' : ''))} Icon={CheckCircleIcon}
                       onClick={onApprove}/>
      </CardActions>
    </Card>
  );
}
