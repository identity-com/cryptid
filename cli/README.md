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
* [`cryptid config [SUBCOMMAND]`](#cryptid-config-subcommand)
* [`cryptid help [COMMAND]`](#cryptid-help-command)
* [`cryptid init [FILE]`](#cryptid-init-file)
* [`cryptid token [FILE]`](#cryptid-token-file)
* [`cryptid transfer [FILE]`](#cryptid-transfer-file)

## `cryptid config [SUBCOMMAND]`

describe the command here

```
USAGE
  $ cryptid config [SUBCOMMAND]

OPTIONS
  -h, --help  show CLI help
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

describe the command here

```
USAGE
  $ cryptid init [FILE]

OPTIONS
  -f, --force
  -h, --help       show CLI help
  -n, --name=name  name to print
```

_See code: [src/commands/init.ts](https://github.com/identity-com/cryptid/blob/v0.0.0/src/commands/init.ts)_

## `cryptid token [FILE]`

describe the command here

```
USAGE
  $ cryptid token [FILE]

OPTIONS
  -f, --force
  -h, --help       show CLI help
  -n, --from=from  name to print
```

_See code: [src/commands/token.ts](https://github.com/identity-com/cryptid/blob/v0.0.0/src/commands/token.ts)_

## `cryptid transfer [FILE]`

describe the command here

```
USAGE
  $ cryptid transfer [FILE]

OPTIONS
  -f, --force
  -h, --help       show CLI help
  -n, --name=name  name to print
```

_See code: [src/commands/transfer.ts](https://github.com/identity-com/cryptid/blob/v0.0.0/src/commands/transfer.ts)_
<!-- commandsstop -->
