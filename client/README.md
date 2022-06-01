# Cryptid

The Cryptid client library provides functionality for signing transactions and managing Cryptid DID wallets.

# Install

```sh
npm i --save @identity.com/cryptid
```

# Usage

## Creating a Cryptid instance

This example shows creating a new keypair, and a Cryptid instance.

```javascript
import {Connection, Keypair, LAMPORTS_PER_SOL, SystemProgram, Transaction} from '@solana/web3.js';
import { build, util } from '@identity.com/cryptid';

const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');

// Create (or provide) a Solana keypair
const key = Keypair.generate();
const did = util.publicKeyToDid(key.publicKey, 'devnet');

// Create the Cryptid instance
const cryptid = build(did, key, {
  connection,
  waitForConfirmation: true,
});
```

*Note* both accounts would need to be funded (e.g. via an Airdrop)

## Cryptid Account Management

### Managing Keys

```javascript
const pubKey = Keypair.generate().publicKey;
const keyAlias = 'mobile';

// Add a key to the Cryptid account
await cryptid.addKey(pubKey, keyAlias);

// Remove a key from the Cryptid account
await cryptid.removeKey(keyAlias);
```

### Managing Services

```javascript
const serviceAlias = 'domains';

// Add a service to a Cryptid account
await cryptid.addService({
  id: `${did}#${serviceAlias}`,
  type: serviceAlias,
  serviceEndpoint: 'https://example.com',
  description: 'Domains'
});

// Remove a service from the Cryptid account
await cryptid.removeService(serviceAlias);
```

### Managing Controllers

```javascript
const controllerDid = 'did:sol:devnet:GxsFhrQNMU4HDgJ69vvYUmnzwzXNEve4tskCqTx7SsHK';

// Add a controller to the Cryptid account
await cryptid.addController(controllerDid);

// Remove a controller from Cryptid acccount
await cryptid.removeController(controllerDid);
```

### Retrieving the DID document

```javascript
const didDocument = await cryptid.document();
```

## Usage Examples

### Signing a transaction
An example of using Cryptid to sign a transaction to send
```javascript
const {blockhash: recentBlockhash} = await connection.getRecentBlockhash();
const transferTx = new Transaction({recentBlockhash, feePayer: cryptidAddress}).add(SystemProgram.transfer({
  fromPubkey: cryptidAddress,
  toPubkey: recipient,
  lamports: lamportsToTransfer,
}));

const [cryptidTransferTx] = await cryptid.sign(transferTx);

const transferTxSignature = await connection.sendRawTransaction(cryptidTransferTx.serialize());
await connection.confirmTransaction(transferTxSignature);
```

### Controller relationship
This example shows how a Cryptid account can control and transact on behalf of another Cryptid account.

```javascript
const cryptid = build(controllerDID, controllerDidKey, {
  connection,
  waitForConfirmation: true,
});

// Create the controller Cryptid instance
const controllerCryptid = cryptid.as(controlledDID);

// Create a transaction from the controlled Cryptid instance
const {blockhash: recentBlockhash} = await connection.getRecentBlockhash();
const tx = new Transaction({recentBlockhash, feePayer: controlledCryptidAddress}).add(
  SystemProgram.transfer({
    fromPubkey: controlledCryptidAddress,
    toPubkey: recipient,
    lamports: lamportsToTransfer,
  })
);

// Sign the transaction with the controller Cryptid instance
const txSignedByController = await controllerCryptid.sign(tx);
```
