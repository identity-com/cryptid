# Cryptid

The Cryptid client library provides functionality for signing transactions and managing Cryptid DID wallets.

# Install

```sh
npm i --save @identity.com/cryptid
```

# Usage

## Creating a Cryptid instance

This example shows creating a new keypair, creating a Cryptid instance and funding the accounts via an airdrop.

```javascript
import {Connection, Keypair, LAMPORTS_PER_SOL, SystemProgram, Transaction} from '@solana/web3.js';
import { build, util } from '@identity/cryptid';

const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');

// Create (or provide) a Solana keypair
const key = Keypair.generate();
const did = util.publicKeyToDid(key.publicKey, 'devnet');

// Create the Cryptid instance
const cryptid = build(did, key, {
  connection,
  waitForConfirmation: true,
});

const cryptidAddress = await cryptid.address();

// Airdrop to fund the main Cryptid account
let airdropSignature = await connection.requestAirdrop(cryptidAddress, LAMPORTS_PER_SOL);
await connection.confirmTransaction(airdropSignature);

// Airdrop to cover fees
airdropSignature = await connection.requestAirdrop(key.publicKey, 5_000_000);
await connection.confirmTransaction(airdropSignature);
```

*Note* that the above details are re-used in the examples below.

## Cryptid Account Management

### Managing Keys

This example shows adding and removing additional keys

```javascript
const pubKey = Keypair.generate().publicKey;
const keyAlias = 'mobile';

// Add a key to the Cryptid account
await cryptid.addKey(pubKey, keyAlias);

// Remove a key from the Cryptid account
await cryptid.removeKey(keyAlias);
```

### Managing Services

This example show adding and removing of services

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

This example show adding and removing of controllers
```javascript
const controllerDid = 'did:sol:devnet:GxsFhrQNMU4HDgJ69vvYUmnzwzXNEve4tskCqTx7SsHK';

// Add a controller to the Cryptid account
await cryptid.addController(controllerDid);

// Remove a controller from Cryptid acccount
await cryptid.removeController(controllerDid);
```

### Retrieving the DID document

Retrieve the DID document associated with your Cryptid account
```javascript
const didDocument = await cryptid.document();
```

## Usage Examples

### Signing a transaction
An example of using Cryptid to sign multiple transactions to send
```javascript
const recipient = Keypair.generate().publicKey;
const lamportsToTransfer = 20_000;

const instruction1 = SystemProgram.transfer({
  fromPubkey: cryptidAddress,
  toPubkey: recipient,
  lamports: lamportsToTransfer,
});
const instruction2 = SystemProgram.transfer({
  fromPubkey: cryptidAddress,
  toPubkey: recipient,
  lamports: lamportsToTransfer,
});

const {blockhash: recentBlockhash} = await connection.getRecentBlockhash();
const transferTx = new Transaction({recentBlockhash, feePayer: cryptidAddress}).add(
  instruction1,
  instruction2
);

const [cryptidTransferTx] = await cryptid.sign(transferTx);

const transferTxSignature = await connection.sendRawTransaction(cryptidTransferTx.serialize());
await connection.confirmTransaction(transferTxSignature);
```

### Controller relationship
This example shows how a Cryptid account can control and transact on behalf of another Cryptid account.

```javascript
// Create (or import) a key to be controlled
const controlledDIDKey = Keypair.generate();
const controlledDID = util.publicKeyToDid(controlledDIDKey.publicKey, 'devnet');

const controlledCryptid = build(controlledDID, controlledDIDKey, {
  connection,
  waitForConfirmation: true,
});

const controlledCryptidAddress = await controlledCryptid.address();

// Airdrop to fund the main Cryptid account
airdropSignature = await connection.requestAirdrop(controlledCryptidAddress, LAMPORTS_PER_SOL);
await connection.confirmTransaction(airdropSignature);

// Airdrop to cover fees
airdropSignature = await connection.requestAirdrop(controlledDIDKey.publicKey, 5_000_000);
await connection.confirmTransaction(airdropSignature);

// Add the Cryptid instance as the controller to the new instance
await controlledCryptid.addController(did);

// Create the controller Cryptid instance
const controllerCryptid = cryptid.as(controlledDID);

// Create a transaction from the controlled Cryptid instance
const {blockhash: controlledRecentBlockhash} = await connection.getRecentBlockhash();
const tx = new Transaction({recentBlockhash: controlledRecentBlockhash, feePayer: controlledCryptidAddress}).add(
  SystemProgram.transfer({
    fromPubkey: controlledCryptidAddress,
    toPubkey: recipient,
    lamports: lamportsToTransfer,
  })
);

// Sign the transaction with the controller Cryptid instance
const [controllerTx] = await controllerCryptid.sign(tx);

// Send and confirm the transaction
const txSignature = await connection.sendRawTransaction(controllerTx.serialize());
await connection.confirmTransaction(txSignature);
```

### Add a key to another Cryptid and sign on it's behalf

This example shows how a Cryptid account can add a key from another device and have transactions signed with it

```javascript
// Create (or import) the new key that will be added to the DID
const device2Key = Keypair.generate();
const device2Alias = 'device2';

// Airdrop to cover fees
airdropSignature = await connection.requestAirdrop(device2Key.publicKey, 5_000_000);
await connection.confirmTransaction(airdropSignature);

// add the new key and create a cryptid client for device 2
await cryptid.addKey(device2Key.publicKey, device2Alias);
const cryptidForDevice2 = await build(did, device2Key, {
  connection,
  waitForConfirmation: true,
});

const device2CryptidAddress = await cryptidForDevice2.address();

// create a transfer and sign with cryptid for device 2
const {blockhash: device2RecentBlockhash} = await connection.getRecentBlockhash();
const device2Tx = new Transaction({recentBlockhash: device2RecentBlockhash, feePayer: device2CryptidAddress}).add(
  SystemProgram.transfer({
    fromPubkey: device2CryptidAddress,
    toPubkey: recipient,
    lamports: lamportsToTransfer,
  })
);

const [device2CryptidTx] = await cryptidForDevice2.sign(device2Tx);

const device2TxSignature = await connection.sendRawTransaction(device2CryptidTx.serialize());
await connection.confirmTransaction(device2TxSignature);
```
