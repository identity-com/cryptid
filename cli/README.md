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
@identity.com/cryptid-cli/0.0.0 darwin-x64 node-v16.0.0
$ cryptid --help [COMMAND]
USAGE
  $ cryptid COMMAND
...
```
<!-- usagestop -->
# Commands
<!-- commands -->
* [`cryptid airdrop [FILE]`](#cryptid-airdrop-file)
* [`cryptid balance [FILE]`](#cryptid-balance-file)
* [`cryptid config [SUBCOMMAND] [KEY] [VALUE]`](#cryptid-config-subcommand-key-value)
* [`cryptid help [COMMAND]`](#cryptid-help-command)
* [`cryptid init [FILE]`](#cryptid-init-file)
* [`cryptid key SUBCOMMAND [KEY] [ALIAS]`](#cryptid-key-subcommand-key-alias)
* [`cryptid token [SUBCOMMAND]`](#cryptid-token-subcommand)
* [`cryptid transfer`](#cryptid-transfer)

## `cryptid airdrop [FILE]`

describe the command here

```
USAGE
  $ cryptid airdrop [FILE]

OPTIONS
  -a, --amount=amount  [default: 100000] The amount in lamports to airdrop
  -c, --config=config  Path to config file
  -h, --help           show CLI help
```

_See code: [src/commands/airdrop.ts](https://github.com/identity-com/cryptid/blob/v0.0.0/src/commands/airdrop.ts)_

## `cryptid balance [FILE]`

describe the command here

```
USAGE
  $ cryptid balance [FILE]

OPTIONS
  -c, --config=config  Path to config file
  -h, --help           show CLI help
```

_See code: [src/commands/balance.ts](https://github.com/identity-com/cryptid/blob/v0.0.0/src/commands/balance.ts)_

## `cryptid config [SUBCOMMAND] [KEY] [VALUE]`

Manage Cryptid configuration

```
USAGE
  $ cryptid config [SUBCOMMAND] [KEY] [VALUE]

OPTIONS
  -c, --config=config  Path to config file
  -h, --help           show CLI help
```

_See code: [src/commands/config.ts](https://github.com/identity-com/cryptid/blob/v0.0.0/src/commands/config.ts)_

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

## `cryptid init [FILE]`

Initialise the cryptid library

```
USAGE
  $ cryptid init [FILE]

OPTIONS
  -h, --help             show CLI help
  -k, --key=key          Path to a solana keypair
  -o, --overwrite        Overwrite existing configuration
  -p, --path=path        Configuration path
  -z, --cluster=cluster  Cluster
```

_See code: [src/commands/init.ts](https://github.com/identity-com/cryptid/blob/v0.0.0/src/commands/init.ts)_

## `cryptid key SUBCOMMAND [KEY] [ALIAS]`

Manage cryptid keys

```
USAGE
  $ cryptid key SUBCOMMAND [KEY] [ALIAS]

OPTIONS
  -a, --alias=alias    Key alias
  -c, --config=config  Path to config file
  -h, --help           show CLI help
  -k, --key=key        Key (base58)
```

_See code: [src/commands/key.ts](https://github.com/identity-com/cryptid/blob/v0.0.0/src/commands/key.ts)_

## `cryptid token [SUBCOMMAND]`

describe the command here

```
USAGE
  $ cryptid token [SUBCOMMAND]

OPTIONS
  -a, --amount=amount  (required) The amount in lamports to transfer
  -c, --config=config  Path to config file
  -h, --help           show CLI help
  -m, --mint=mint      (required) The SPL-Token mint(base58)
  -t, --to=to          (required) Recipient public key (base58)
```

_See code: [src/commands/token.ts](https://github.com/identity-com/cryptid/blob/v0.0.0/src/commands/token.ts)_

## `cryptid transfer`

describe the command here

```
USAGE
  $ cryptid transfer

OPTIONS
  -a, --amount=amount  (required) The amount in lamports to transfer
  -c, --config=config  Path to config file
  -h, --help           show CLI help
  -t, --to=to          (required) Recipient public key (base58)
```

_See code: [src/commands/transfer.ts](https://github.com/identity-com/cryptid/blob/v0.0.0/src/commands/transfer.ts)_
<!-- commandsstop -->
