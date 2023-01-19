# Cryptid Client SDK

A client-side javascript SDK for the Cryptid protocol on Solana.

Cryptid is a powerful account abstraction which allows a decentralized
identifier (DID) to control assets and send transactions.

For more details, visit the [Cryptid website](https://www.identity.com/cryptid/).

The Client SDK can be extended with custom middleware to support a variety of use-cases.

## Installation

```sh
yarn add @identity.com/cryptid
```

## Getting Started

Get the default cryptid account:

```ts
import { Cryptid } from '@identity.com/cryptid';

const did = `did:sol:${wallet.publicKey.toBase58()}`

const cryptid = await Cryptid.buildFromDID(did, wallet, connection);

console.log("Cryptid account:", cryptid.address());
```

Send funds from the cryptid account to another account:

```ts
const transferTransaction = new Transaction().add(
  SystemProgram.transfer({
    fromPubkey: cryptid.address(),
    toPubkey: anotherAccount,
    lamports: 1000000,
  })
);

const cryptidTransaction = await cryptid.directExecute(transferTransaction);
await cryptid.send(cryptidTransaction);
```

## Usage

### Proposing and Executing Transactions

The Cryptid SDK allows you to propose transactions, and execute them later.
This allows, for example, a user to sign a transaction on their phone, and
execute it later on their computer.

```ts
const {proposeTransaction, proposeSigners, transactionAccount} = await cryptid.propose(transferTransaction);
await cryptid.send(proposeTransaction, proposeSigners);

const {executeTransactions, executeSigners} = await cryptid.execute(transactionAccount);
executeTransactions.forEach(async (tx) => await cryptid.send(tx, executeSigners));
```

### Extending a transaction

```ts
// Propose an initial transaction
const {proposeTransaction, proposeSigners, transactionAccount} = await cryptid.propose(tx1, TransactionState.NotReady);
await cryptid.send(proposeTransaction, proposeSigners);

// Extend it with a second transaction
const {extendTransaction, extendSigners} = await cryptid.extend(transactionAccount, tx2);
await cryptid.send(extendTransaction, extendSigners, TransactionState.Ready);

// Execute the transaction
const {executeTransactions, executeSigners} = await cryptid.execute(transactionAccount);
executeTransactions.forEach(async (tx) => await cryptid.send(tx, executeSigners));
```

### Middleware

To create a cryptid account with middleware, pass the middleware program ID and PDA into the `create` function:

```ts
cryptid = await Cryptid.createFromDID(
      did,
      wallet,
      [
        {
          programId: checkRecipientMiddlewareProgram.programId,
          address: middlewareAccount,
        },
      ],
      { connection: provider.connection, accountIndex: 1 }
    );
```

This middleware will now be checked when executing transactions against this cryptid account.
For details on how to create the middleware account, see the tests in `packages/tests/src/middleware`.

### Custom Middleware

Each middleware requires the injection of a client SDK which creates the
middleware instructions.

The cryptid client supports the registration of custom middleware through
a global singleton MiddlewareRegistry.

To register a middleware client:

```ts
import { MiddlewareRegistry } from "@identity.com/cryptid";

MiddlewareRegistry.get().register(
    MY_MIDDLWARE_PROGRAM_ID,
    new MyMiddleware()
);
```

Middleware injected in this way must
implement the [MiddlewareClient](packages/core/src/types/middleware.ts) interface.

Example middleware implementing this interface
can be found in the [middleware](packages/middleware) package.
