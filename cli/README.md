@identity.com/cryptid-cli
=========================

Sign transactions and configure Cryptid DID Wallets

[![oclif](https://img.shields.io/badge/cli-oclif-brightgreen.svg)](https://oclif.io)
[![Version](https://img.shields.io/npm/v/@identity.com/cryptid-cli.svg)](https://npmjs.org/package/@identity.com/cryptid-cli)
[![Downloads/week](https://img.shields.io/npm/dw/@identity.com/cryptid-cli.svg)](https://npmjs.org/package/@identity.com/cryptid-cli)
[![License](https://img.shields.io/npm/l/@identity.com/cryptid-cli.svg)](https://github.com/identity-com/cryptid/blob/master/package.json)

<!-- toc -->
* [Usage](#usage)
* [Commands](#commands)
<!-- tocstop -->
# Usage
<!-- usage -->
```sh-session
$ npm install -g @identity.com/cryptid-cli
$ cryptid COMMAND
running command...
$ cryptid (-v|--version|version)
@identity.com/cryptid-cli/0.1.5 darwin-x64 node-v16.0.0
$ cryptid --help [COMMAND]
USAGE
  $ cryptid COMMAND
...
```
<!-- usagestop -->
# Commands
<!-- commands -->
* [`cryptid address`](#cryptid-address)
* [`cryptid airdrop [AMOUNT]`](#cryptid-airdrop-amount)
* [`cryptid alias [NAME] [DID]`](#cryptid-alias-name-did)
* [`cryptid balance`](#cryptid-balance)
* [`cryptid base`](#cryptid-base)
* [`cryptid config [SUBCOMMAND] [KEY] [VALUE]`](#cryptid-config-subcommand-key-value)
* [`cryptid controller:add [DID]`](#cryptid-controlleradd-did)
* [`cryptid controller:remove [DID]`](#cryptid-controllerremove-did)
* [`cryptid controller:show [DID]`](#cryptid-controllershow-did)
* [`cryptid document`](#cryptid-document)
* [`cryptid help [COMMAND]`](#cryptid-help-command)
* [`cryptid init`](#cryptid-init)
* [`cryptid key:add [KEY] [ALIAS]`](#cryptid-keyadd-key-alias)
* [`cryptid key:remove [ALIAS]`](#cryptid-keyremove-alias)
* [`cryptid key:show`](#cryptid-keyshow)
* [`cryptid token:balance MINT`](#cryptid-tokenbalance-mint)
* [`cryptid token:show`](#cryptid-tokenshow)
* [`cryptid token:transfer TO AMOUNT`](#cryptid-tokentransfer-to-amount)
* [`cryptid transfer TO AMOUNT`](#cryptid-transfer-to-amount)

## `cryptid address`

Show the cryptid account's address

```
USAGE
  $ cryptid address

OPTIONS
  -c, --config=config  Path to config file
  -h, --help           show CLI help
  -s, --as=as          Execute transactions as a controlled identity (alias or did)
```

_See code: [src/commands/address.ts](https://github.com/identity-com/cryptid/blob/v0.1.5/src/commands/address.ts)_

## `cryptid airdrop [AMOUNT]`

Airdrop funds into the cryptid account and owner key

```
USAGE
  $ cryptid airdrop [AMOUNT]

OPTIONS
  -c, --config=config  Path to config file
  -h, --help           show CLI help
  -s, --as=as          Execute transactions as a controlled identity (alias or did)
```

_See code: [src/commands/airdrop.ts](https://github.com/identity-com/cryptid/blob/v0.1.5/src/commands/airdrop.ts)_

## `cryptid alias [NAME] [DID]`

Associate a DID with an alias

```
USAGE
  $ cryptid alias [NAME] [DID]

OPTIONS
  -c, --config=config  Path to config file
  -h, --help           show CLI help
  -s, --as=as          Execute transactions as a controlled identity (alias or did)
  -u, --unset          unset an alias
```

_See code: [src/commands/alias.ts](https://github.com/identity-com/cryptid/blob/v0.1.5/src/commands/alias.ts)_

## `cryptid balance`

Show the cryptid account SOL balance

```
USAGE
  $ cryptid balance

OPTIONS
  -c, --config=config  Path to config file
  -h, --help           show CLI help
  -s, --as=as          Execute transactions as a controlled identity (alias or did)
```

_See code: [src/commands/balance.ts](https://github.com/identity-com/cryptid/blob/v0.1.5/src/commands/balance.ts)_

## `cryptid base`

```
USAGE
  $ cryptid base

OPTIONS
  -c, --config=config  Path to config file
  -h, --help           show CLI help
  -s, --as=as          Execute transactions as a controlled identity (alias or did)
```

_See code: [src/commands/base.ts](https://github.com/identity-com/cryptid/blob/v0.1.5/src/commands/base.ts)_

## `cryptid config [SUBCOMMAND] [KEY] [VALUE]`

Manage Cryptid configuration

```
USAGE
  $ cryptid config [SUBCOMMAND] [KEY] [VALUE]

OPTIONS
  -c, --config=config  Path to config file
  -h, --help           show CLI help
  -s, --as=as          Execute transactions as a controlled identity (alias or did)
```

_See code: [src/commands/config.ts](https://github.com/identity-com/cryptid/blob/v0.1.5/src/commands/config.ts)_

## `cryptid controller:add [DID]`

Add a controller to a cryptid account

```
USAGE
  $ cryptid controller add [DID]

OPTIONS
  -c, --config=config  Path to config file
  -h, --help           show CLI help
  -s, --as=as          Execute transactions as a controlled identity (alias or did)
```

_See code: [src/commands/controller/add.ts](https://github.com/identity-com/cryptid/blob/v0.1.5/src/commands/controller/add.ts)_

## `cryptid controller:remove [DID]`

Remove a controller from a cryptid account

```
USAGE
  $ cryptid controller remove [DID]

OPTIONS
  -c, --config=config  Path to config file
  -h, --help           show CLI help
  -s, --as=as          Execute transactions as a controlled identity (alias or did)
```

_See code: [src/commands/controller/remove.ts](https://github.com/identity-com/cryptid/blob/v0.1.5/src/commands/controller/remove.ts)_

## `cryptid controller:show [DID]`

Show the controllers of a cryptid account

```
USAGE
  $ cryptid controller show [DID]

OPTIONS
  -c, --config=config  Path to config file
  -h, --help           show CLI help
  -s, --as=as          Execute transactions as a controlled identity (alias or did)
```

_See code: [src/commands/controller/show.ts](https://github.com/identity-com/cryptid/blob/v0.1.5/src/commands/controller/show.ts)_

## `cryptid document`

Show the cryptid account's DID Document

```
USAGE
  $ cryptid document

OPTIONS
  -c, --config=config  Path to config file
  -h, --help           show CLI help
  -s, --as=as          Execute transactions as a controlled identity (alias or did)
```

_See code: [src/commands/document.ts](https://github.com/identity-com/cryptid/blob/v0.1.5/src/commands/document.ts)_

## `cryptid help [COMMAND]`

display help for cryptid

```
USAGE
  $ cryptid help [COMMAND]

ARGUMENTS
  COMMAND  command to show help for

OPTIONS
  --all  see all commands in CLI
```

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v3.2.3/src/commands/help.ts)_

## `cryptid init`

Initialise the cryptid library

```
USAGE
  $ cryptid init

OPTIONS
  -h, --help             show CLI help
  -k, --key=key          Path to a solana keypair
  -o, --overwrite        Overwrite existing configuration
  -p, --path=path        Configuration path
  -z, --cluster=cluster  Cluster
```

_See code: [src/commands/init.ts](https://github.com/identity-com/cryptid/blob/v0.1.5/src/commands/init.ts)_

## `cryptid key:add [KEY] [ALIAS]`

Add a cryptid key

```
USAGE
  $ cryptid key add [KEY] [ALIAS]

OPTIONS
  -c, --config=config  Path to config file
  -h, --help           show CLI help
  -s, --as=as          Execute transactions as a controlled identity (alias or did)
```

_See code: [src/commands/key/add.ts](https://github.com/identity-com/cryptid/blob/v0.1.5/src/commands/key/add.ts)_

## `cryptid key:remove [ALIAS]`

Remove a cryptid key

```
USAGE
  $ cryptid key remove [ALIAS]

OPTIONS
  -c, --config=config  Path to config file
  -h, --help           show CLI help
  -s, --as=as          Execute transactions as a controlled identity (alias or did)
```

_See code: [src/commands/key/remove.ts](https://github.com/identity-com/cryptid/blob/v0.1.5/src/commands/key/remove.ts)_

## `cryptid key:show`

List keys attached to the cryptid account

```
USAGE
  $ cryptid key show

OPTIONS
  -c, --config=config  Path to config file
  -h, --help           show CLI help
  -s, --as=as          Execute transactions as a controlled identity (alias or did)

ALIASES
  $ cryptid
```

_See code: [src/commands/key/show.ts](https://github.com/identity-com/cryptid/blob/v0.1.5/src/commands/key/show.ts)_

## `cryptid token:balance MINT`

show an SPL Token balance

```
USAGE
  $ cryptid token balance MINT

ARGUMENTS
  MINT  The SPL-Token mint(base58)

OPTIONS
  -c, --config=config  Path to config file
  -h, --help           show CLI help
  -s, --as=as          Execute transactions as a controlled identity (alias or did)
```

_See code: [src/commands/token/balance.ts](https://github.com/identity-com/cryptid/blob/v0.1.5/src/commands/token/balance.ts)_

## `cryptid token:show`

show all SPL Token balances

```
USAGE
  $ cryptid token show

OPTIONS
  -c, --config=config  Path to config file
  -h, --help           show CLI help
  -s, --as=as          Execute transactions as a controlled identity (alias or did)
```

_See code: [src/commands/token/show.ts](https://github.com/identity-com/cryptid/blob/v0.1.5/src/commands/token/show.ts)_

## `cryptid token:transfer TO AMOUNT`

Send SPL-Tokens to a recipient

```
USAGE
  $ cryptid token transfer TO AMOUNT

ARGUMENTS
  TO      Recipient alias, did or public key (base58)
  AMOUNT  The amount in lamports to transfer

OPTIONS
  -c, --config=config           Path to config file
  -f, --allowUnfundedRecipient  Create a token account for the recipient if needed
  -h, --help                    show CLI help
  -m, --mint=mint               (required) The SPL-Token mint(base58)
  -s, --as=as                   Execute transactions as a controlled identity (alias or did)
```

_See code: [src/commands/token/transfer.ts](https://github.com/identity-com/cryptid/blob/v0.1.5/src/commands/token/transfer.ts)_

## `cryptid transfer TO AMOUNT`

Send SOL to a recipient

```
USAGE
  $ cryptid transfer TO AMOUNT

ARGUMENTS
  TO      Recipient alias, did or public key (base58)
  AMOUNT  The amount in lamports to transfer

OPTIONS
  -c, --config=config  Path to config file
  -h, --help           show CLI help
  -s, --as=as          Execute transactions as a controlled identity (alias or did)
```

_See code: [src/commands/transfer.ts](https://github.com/identity-com/cryptid/blob/v0.1.5/src/commands/transfer.ts)_
<!-- commandsstop -->
