import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {useCryptid} from '../utils/Cryptid/cryptid';
import {PublicKey, Transaction} from '@solana/web3.js';
import bs58 from 'bs58';
import {
  Button,
  CardContent,
  FormControlLabel,
  Typography,
  Card,
  Switch,
  SnackbarContent,
  CardActions,
} from '@material-ui/core';
import {makeStyles} from '@material-ui/core/styles';
import {useLocalStorageState} from '../utils/utils';
import WarningIcon from '@material-ui/icons/Warning';
import SignTransactionFormContent from '../components/SignTransactionFormContent';
import SignFormContent from '../components/SignFormContent';

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
  params: { transactions: string[] },
} | {
  method: 'sign',
  params: { data: any, display: string },
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
}
type Opener = {
  postMessage: (message: ResponseMessage & { jsonrpc: '2.0' }, to: string) => void;
}

export default function PopupPage({opener}: { opener: Opener }) {
  const origin = useMemo(() => {
    let params = new URLSearchParams(window.location.hash.slice(1));
    const origin = params.get('origin');
    if (!origin) {
      throw new Error('No origin');
    }
    return origin;
  }, []);
  const {selectedCryptidAccount} = useCryptid();

  const [connectedAccount, setConnectedAccount] = useState<PublicKey | null>(null);
  const hasConnectedAccount = !!connectedAccount;
  const [requests, setRequests] = useState<RequestMessage[]>([]);
  const [autoApprove, setAutoApprove] = useState(false);
  const postMessage = useCallback((
    (message: ResponseMessage) => {
      opener.postMessage({jsonrpc: '2.0', ...message}, origin);
    }
  ), [opener, origin]);

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
          e.data.method !== 'sign'
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
    messageDisplay: 'tx' | 'utf8' | 'hex'
  } = useMemo(() => {
    if (!request || request.method === 'connect') {
      return {payloads: [], messageDisplay: 'tx'};
    }
    switch (request.method) {
      case 'signTransaction':
        return {
          payloads: [bs58.decode(request.params.transaction)],
          messageDisplay: 'tx',
        };
      case 'signAllTransactions':
        return {
          payloads: request.params.transactions.map((t) => bs58.decode(t)),
          messageDisplay: 'tx',
        };
      case 'sign':
        if (!(request.params.data instanceof Uint8Array)) {
          throw new Error('Data must be instance of Uint8Array');
        }
        return {
          payloads: [request.params.data],
          messageDisplay: request.params.display === 'utf8' ? 'utf8' : 'hex',
        };
    }
  }, [request]);

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

    return <ApproveConnectionForm origin={origin} onApprove={connect} autoApprove={autoApprove}
                                  setAutoApprove={setAutoApprove}/>;
  }

  if (!request) {
    throw new Error('No request');
  }
  if (!(request.method === 'signTransaction' ||
    request.method === 'signAllTransactions' ||
    request.method === 'sign')) {
    throw new Error('Unknown method');
  }
  if (!selectedCryptidAccount) {
    throw new Error('No selected cryptid account');
  }

  async function onApprove() {
    popRequest();
    if (!request) {
      throw new Error('onApprove: No request');
    }
    switch (request.method) {
      case 'sign':
        throw new Error('onApprove: Not supported');
      case 'signTransaction':
        await sendTransaction(payloads[0]);
        break;
      case 'signAllTransactions':
        await sendTransactions(payloads);
        break;
      default:
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
    postMessage({
      result: {
        transaction: await selectedCryptidAccount
          .signTransaction(transaction)
          .then((signedTx) => signedTx.serialize({verifySignatures: false}))
          .then(bs58.encode),
      },
      id: request.id,
    });
  }

  async function sendTransactions(transactionBuffers: (Buffer | Uint8Array)[]) {
    if (!request) {
      throw new Error('sendTransactions: no request');
    }
    if (!selectedCryptidAccount) {
      throw new Error('sendTransactions: no selected cryptid account');
    }
    const signedTransactions = transactionBuffers
      .map(Transaction.from)
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
    postMessage({
      error: 'Transaction cancelled',
      id: request.id,
    });
  }

  return (
    <ApproveSignatureForm
      key={request.id}
      autoApprove={autoApprove}
      origin={origin}
      payloads={payloads}
      messageDisplay={messageDisplay}
      onApprove={onApprove}
      onReject={sendReject}
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

function ApproveConnectionForm({
                                 origin,
                                 onApprove,
                                 autoApprove,
                                 setAutoApprove,
                               }: { origin: string, onApprove: (boolean) => void, autoApprove: boolean, setAutoApprove: (boolean) => void }) {
  const classes = useStyles();
  let [dismissed, setDismissed] = useLocalStorageState('dismissedAutoApproveWarning', false);
  let {selectedCryptidAccount} = useCryptid();
  return (
    <Card>
      <CardContent>
        <Typography variant="h6" component="h1" gutterBottom>
          Allow {origin} to transact with your Cryptid account?
        </Typography>
        <div className={classes.connection}>
          {(() => {
            if (!selectedCryptidAccount) {
              return (<Typography variant="h6">
                No selected Cryptid account.
              </Typography>);
            } else {
              return (<>
                <div className="has-tooltip flex justify-center">
                  <span className="tooltip rounded shadow-lg bg-gray-100">
                    DID: {selectedCryptidAccount.did}
                    <br/>
                    Signer Address: {selectedCryptidAccount.address.toBase58()}
                  </span>
                  {/* TODO: Replace with identity picture */}
                  <svg className="h-6/12 w-6/12 text-gray-300 mr-2 items-center" fill="currentColor"
                       viewBox="0 0 24 24">
                    <path
                      d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z"/>
                  </svg>
                </div>
                <p className="text-center">Alias: {selectedCryptidAccount.alias}</p>
              </>);
            }
          })()}

        </div>
        {/*<Typography>Only connect with sites you trust.</Typography>*/}
        {/*<Divider className={classes.divider} />*/}
        <FormControlLabel
          control={
            <Switch
              checked={autoApprove}
              onChange={() => {
                setAutoApprove(!autoApprove);
              }}
              color="primary"
            />
          }
          label={`Automatically approve transactions from ${origin}`}
        />
        {!dismissed && autoApprove && (
          <SnackbarContent
            className={classes.warningContainer}
            message={
              <div>
                <span className={classes.warningTitle}>
                  <WarningIcon className={classes.warningIcon}/>
                  Use at your own risk.
                </span>
                <Typography className={classes.warningMessage}>
                  The site will be able to send any transactions for the whole session without your confirmation. Are
                  you sure?
                </Typography>
              </div>
            }
            action={[
              <Button onClick={() => setDismissed(true)}>I understand</Button>,
            ]}
            classes={{root: classes.snackbarRoot}}
          />
        )}
      </CardContent>
      <CardActions className={classes.actions}>
        <Button onClick={window.close}>Deny</Button>
        <Button
          color="primary"
          onClick={() => onApprove(autoApprove)}
          disabled={!dismissed && autoApprove && !selectedCryptidAccount}
        >
          Allow
        </Button>
      </CardActions>
    </Card>
  );
}

type ApproveSignerFormProps = {
  origin: string,
  payloads: (Buffer | Uint8Array)[],
  messageDisplay: 'tx' | 'utf8' | 'hex',
  onApprove: () => void,
  onReject: () => void,
  autoApprove: boolean,
};
function ApproveSignatureForm({
                                origin,
                                payloads,
                                messageDisplay,
                                onApprove,
                                onReject,
                                autoApprove,
                              }: ApproveSignerFormProps) {
  const classes = useStyles();

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
          onApprove={onApprove}
          buttonRef={buttonRef}
        />
      );
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
      <CardActions className={classes.actions}>
        <Button onClick={onReject}>Cancel</Button>
        <Button
          ref={buttonRef}
          className={classes.approveButton}
          variant="contained"
          color="primary"
          onClick={onApprove}
        >
          Approve{isMultiTx ? ' All' : ''}
        </Button>
      </CardActions>
    </Card>
  );
}
