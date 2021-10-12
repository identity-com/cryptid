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
import { Connection, Keypair, clusterApiUrl, SystemProgram } from '@solana/web3.js';
import { build, util } from '@identity/cryptid';

const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');

// Create (or provide) a Solana keypair
const key = Keypair.generate();
const did = util.publicKeyToDid(key.publicKey, 'devnet');

// Create the Cryptid instance
const cryptid = build(did, key, {
    connection,
    waitForConfirmation: true
});

// Airdrop to fund the main Cryptid account
let airdropSignature = await connection.requestAirdrop(cryptidAddress, LAMPORTS_PER_SOL);
await connection.confirmTransaction(airdropSignature);

// Airdrop to cover fees
airdropSignature = await connection.requestAirdrop(key.publicKey, 5_000_000);
await connection.confirmTransaction(airdropSignature);
```

Note that the above details are re-used in the examples below.

## Cryptid Account Management

### Managing Keys

This example shows adding and removing additional keys

```javascript
const pubKey = Keypair.generate().publicKey;
const alias = 'mobile';

// Add a key to the Cryptid account
await cryptid.addKey(pubKey, alias);

// Remove a key from the Cryptid account
await cryptid.removeKey(alias);
```

### Managing Services

This example show adding and removing of services

```javascript
const alias = 'domains';

// Add a service to a Cryptid account
await cryptid.addService({
  id: `${did}#${alias}`,
  type: alias,
  serviceEndpoint: 'https://example.com',
  description: 'Domains'
});

// Remove a service from the Cryptid account
await cryptid.removeService(alias);
```

### Managing Controllers

This example show adding and removing of controllers
```javascript
const controllerDid = 'did:sol:devnet:GxsFhrQNMU4HDgJ69vvYUmnzwzXNEve4tskCqTx7SsHK';

// Add a controller to the Cryptid acccount
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
An example of using Cryptid to sign multiple transactions and send it
```javascript
const instruction1 = SystemProgram.transfer({
    fromPubkey: cryptid.address(),
    toPubkey: recipient,
    lamports: lamportsToTransfer,
});
const instruction2 = SystemProgram.transfer({
    fromPubkey: cryptid.address(),
    toPubkey: recipient,
    lamports: lamportsToTransfer,
});

const { blockhash: recentBlockhash } = await connection.getRecentBlockhash();

return new Transaction({ recentBlockhash, feePayer: cryptid.address() }).add(
  ...instructions
);

const [cryptidTx] = await cryptid.sign(tx);

const txSignature = await connection.sendRawTransaction(tx.serialize());
await connection.confirmTransaction(txSignature);
```

### Controller relationship
This example shows how a Cryptid account can control and transact on behalf of another Cryptid account.

```javascript
// Create a new Cryptid instance to be controlled
const controlledDIDKey = Keypair.generate();
const controlledDID = publicKeyToDid(controlledDIDKey.publicKey, 'devnet');

const controlledCryptid = build(controlledDID, controlledDIDKey, {
  connection,
  waitForConfirmation: true,
});

// ... airdrop as per the example above

// Add the Cryptid instance as the controller to the new instance
await controlledCryptid.addController(did);

// Create the controller Cryptid instance
const controllerCryptid = cryptid.as(controlledDID);

// Create a transaction from the controlled Cryptid instance
const { blockhash: recentBlockhash } = await connection.getRecentBlockhash();
const tx = new Transaction({ recentBlockhash, feePayer: controllerCryptid.address() }).add(
  SystemProgram.transfer({
    fromPubkey: controllerCryptid.address(),
    toPubkey: recipient,
    lamports: lamportsToTransfer,
  })
);

// Sign the transaction with the controller Cryptid instance
const [cryptidTx] = await controllerCryptid.sign(tx);

// Send and confirm the transaction
const txSignature = await connection.sendRawTransaction(tx.serialize());
await connection.confirmTransaction(txSignature);
```
