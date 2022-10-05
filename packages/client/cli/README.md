oclif-hello-world
=================

oclif example Hello World CLI

[![oclif](https://img.shields.io/badge/cli-oclif-brightgreen.svg)](https://oclif.io)
[![Version](https://img.shields.io/npm/v/oclif-hello-world.svg)](https://npmjs.org/package/oclif-hello-world)
[![CircleCI](https://circleci.com/gh/oclif/hello-world/tree/main.svg?style=shield)](https://circleci.com/gh/oclif/hello-world/tree/main)
[![Downloads/week](https://img.shields.io/npm/dw/oclif-hello-world.svg)](https://npmjs.org/package/oclif-hello-world)
[![License](https://img.shields.io/npm/l/oclif-hello-world.svg)](https://github.com/oclif/hello-world/blob/main/package.json)

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
$ cryptid (--version)
@identity.com/cryptid-cli/0.3.0-alpha.9 darwin-arm64 node-v16.15.1
$ cryptid --help [COMMAND]
USAGE
  $ cryptid COMMAND
...
```
<!-- usagestop -->
# Commands
<!-- commands -->
* [`cryptid`](#cryptid)
* [`cryptid address`](#cryptid-address)
* [`cryptid airdrop [AMOUNT]`](#cryptid-airdrop-amount)
* [`cryptid alias [NAME] [DID]`](#cryptid-alias-name-did)
* [`cryptid balance`](#cryptid-balance)
* [`cryptid base`](#cryptid-base)
* [`cryptid config [SUBCOMMAND] [KEY] [VALUE]`](#cryptid-config-subcommand-key-value)
* [`cryptid controller show [DID]`](#cryptid-controller-show-did)
* [`cryptid document`](#cryptid-document)
* [`cryptid help [COMMAND]`](#cryptid-help-command)
* [`cryptid init`](#cryptid-init)
* [`cryptid key add KEY ALIAS`](#cryptid-key-add-key-alias)
* [`cryptid key remove [ALIAS]`](#cryptid-key-remove-alias)
* [`cryptid key show`](#cryptid-key-show)
* [`cryptid plugins`](#cryptid-plugins)
* [`cryptid plugins:install PLUGIN...`](#cryptid-pluginsinstall-plugin)
* [`cryptid plugins:inspect PLUGIN...`](#cryptid-pluginsinspect-plugin)
* [`cryptid plugins:install PLUGIN...`](#cryptid-pluginsinstall-plugin-1)
* [`cryptid plugins:link PLUGIN`](#cryptid-pluginslink-plugin)
* [`cryptid plugins:uninstall PLUGIN...`](#cryptid-pluginsuninstall-plugin)
* [`cryptid plugins:uninstall PLUGIN...`](#cryptid-pluginsuninstall-plugin-1)
* [`cryptid plugins:uninstall PLUGIN...`](#cryptid-pluginsuninstall-plugin-2)
* [`cryptid plugins update`](#cryptid-plugins-update)
* [`cryptid token balance MINT`](#cryptid-token-balance-mint)
* [`cryptid token show`](#cryptid-token-show)
* [`cryptid token transfer TO AMOUNT`](#cryptid-token-transfer-to-amount)
* [`cryptid transfer TO AMOUNT`](#cryptid-transfer-to-amount)

## `cryptid`

List keys attached to the cryptid account

```
USAGE
  $ cryptid [-h] [-c <value>] [-s <value>]

FLAGS
  -c, --config=<value>  Path to config file
  -h, --help            Show CLI help.
  -s, --as=<value>      Execute transactions as a controlled identity (alias or did)

DESCRIPTION
  List keys attached to the cryptid account

ALIASES
  $ cryptid
```

## `cryptid address`

Show the cryptid account's address

```
USAGE
  $ cryptid address [-h] [-c <value>] [-s <value>]

FLAGS
  -c, --config=<value>  Path to config file
  -h, --help            Show CLI help.
  -s, --as=<value>      Execute transactions as a controlled identity (alias or did)

DESCRIPTION
  Show the cryptid account's address
```

_See code: [dist/commands/address.ts](https://github.com/identity-com/cryptid/blob/v0.3.0-alpha.9/dist/commands/address.ts)_

## `cryptid airdrop [AMOUNT]`

Airdrop funds into the cryptid account and owner key

```
USAGE
  $ cryptid airdrop [AMOUNT] [-h] [-c <value>] [-s <value>]

FLAGS
  -c, --config=<value>  Path to config file
  -h, --help            Show CLI help.
  -s, --as=<value>      Execute transactions as a controlled identity (alias or did)

DESCRIPTION
  Airdrop funds into the cryptid account and owner key
```

_See code: [dist/commands/airdrop.ts](https://github.com/identity-com/cryptid/blob/v0.3.0-alpha.9/dist/commands/airdrop.ts)_

## `cryptid alias [NAME] [DID]`

Associate a DID with an alias

```
USAGE
  $ cryptid alias [NAME] [DID] [-h] [-c <value>] [-s <value>] [-u]

FLAGS
  -c, --config=<value>  Path to config file
  -h, --help            Show CLI help.
  -s, --as=<value>      Execute transactions as a controlled identity (alias or did)
  -u, --unset           unset an alias

DESCRIPTION
  Associate a DID with an alias
```

_See code: [dist/commands/alias.ts](https://github.com/identity-com/cryptid/blob/v0.3.0-alpha.9/dist/commands/alias.ts)_

## `cryptid balance`

Show the cryptid account SOL balance

```
USAGE
  $ cryptid balance [-h] [-c <value>] [-s <value>]

FLAGS
  -c, --config=<value>  Path to config file
  -h, --help            Show CLI help.
  -s, --as=<value>      Execute transactions as a controlled identity (alias or did)

DESCRIPTION
  Show the cryptid account SOL balance
```

_See code: [dist/commands/balance.ts](https://github.com/identity-com/cryptid/blob/v0.3.0-alpha.9/dist/commands/balance.ts)_

## `cryptid base`

```
USAGE
  $ cryptid base [-h] [-c <value>] [-s <value>]

FLAGS
  -c, --config=<value>  Path to config file
  -h, --help            Show CLI help.
  -s, --as=<value>      Execute transactions as a controlled identity (alias or did)
```

_See code: [dist/commands/base.ts](https://github.com/identity-com/cryptid/blob/v0.3.0-alpha.9/dist/commands/base.ts)_

## `cryptid config [SUBCOMMAND] [KEY] [VALUE]`

Manage Cryptid configuration

```
USAGE
  $ cryptid config [SUBCOMMAND] [KEY] [VALUE] [-h] [-c <value>] [-s <value>]

FLAGS
  -c, --config=<value>  Path to config file
  -h, --help            Show CLI help.
  -s, --as=<value>      Execute transactions as a controlled identity (alias or did)

DESCRIPTION
  Manage Cryptid configuration
```

_See code: [dist/commands/config.ts](https://github.com/identity-com/cryptid/blob/v0.3.0-alpha.9/dist/commands/config.ts)_

## `cryptid controller show [DID]`

Show the controllers of a cryptid account

```
USAGE
  $ cryptid controller show [DID] [-h] [-c <value>] [-s <value>]

FLAGS
  -c, --config=<value>  Path to config file
  -h, --help            Show CLI help.
  -s, --as=<value>      Execute transactions as a controlled identity (alias or did)

DESCRIPTION
  Show the controllers of a cryptid account
```

## `cryptid document`

Show the cryptid account's DID Document

```
USAGE
  $ cryptid document [-h] [-c <value>] [-s <value>]

FLAGS
  -c, --config=<value>  Path to config file
  -h, --help            Show CLI help.
  -s, --as=<value>      Execute transactions as a controlled identity (alias or did)

DESCRIPTION
  Show the cryptid account's DID Document
```

_See code: [dist/commands/document.ts](https://github.com/identity-com/cryptid/blob/v0.3.0-alpha.9/dist/commands/document.ts)_

## `cryptid help [COMMAND]`

Display help for cryptid.

```
USAGE
  $ cryptid help [COMMAND] [-n]

ARGUMENTS
  COMMAND  Command to show help for.

FLAGS
  -n, --nested-commands  Include all nested commands in the output.

DESCRIPTION
  Display help for cryptid.
```

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v5.1.12/src/commands/help.ts)_

## `cryptid init`

Initialise the cryptid library

```
USAGE
  $ cryptid init [-h] [-o] [-p <value>] [-k <value>] [-z <value>]

FLAGS
  -h, --help             Show CLI help.
  -k, --key=<value>      Path to a solana keypair
  -o, --overwrite        Overwrite existing configuration
  -p, --path=<value>     Configuration path
  -z, --cluster=<value>  Cluster

DESCRIPTION
  Initialise the cryptid library
```

_See code: [dist/commands/init.ts](https://github.com/identity-com/cryptid/blob/v0.3.0-alpha.9/dist/commands/init.ts)_

## `cryptid key add KEY ALIAS`

Add a cryptid key

```
USAGE
  $ cryptid key add [KEY] [ALIAS] [-h] [-c <value>] [-s <value>]

FLAGS
  -c, --config=<value>  Path to config file
  -h, --help            Show CLI help.
  -s, --as=<value>      Execute transactions as a controlled identity (alias or did)

DESCRIPTION
  Add a cryptid key
```

## `cryptid key remove [ALIAS]`

Remove a cryptid key

```
USAGE
  $ cryptid key remove [ALIAS] [-h] [-c <value>] [-s <value>]

FLAGS
  -c, --config=<value>  Path to config file
  -h, --help            Show CLI help.
  -s, --as=<value>      Execute transactions as a controlled identity (alias or did)

DESCRIPTION
  Remove a cryptid key
```

## `cryptid key show`

List keys attached to the cryptid account

```
USAGE
  $ cryptid key show [-h] [-c <value>] [-s <value>]

FLAGS
  -c, --config=<value>  Path to config file
  -h, --help            Show CLI help.
  -s, --as=<value>      Execute transactions as a controlled identity (alias or did)

DESCRIPTION
  List keys attached to the cryptid account

ALIASES
  $ cryptid
```

## `cryptid plugins`

List installed plugins.

```
USAGE
  $ cryptid plugins [--core]

FLAGS
  --core  Show core plugins.

DESCRIPTION
  List installed plugins.

EXAMPLES
  $ cryptid plugins
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v2.1.0/src/commands/plugins/index.ts)_

## `cryptid plugins:install PLUGIN...`

Installs a plugin into the CLI.

```
USAGE
  $ cryptid plugins:install PLUGIN...

ARGUMENTS
  PLUGIN  Plugin to install.

FLAGS
  -f, --force    Run yarn install with force flag.
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Installs a plugin into the CLI.

  Can be installed from npm or a git url.

  Installation of a user-installed plugin will override a core plugin.

  e.g. If you have a core plugin that has a 'hello' command, installing a user-installed plugin with a 'hello' command
  will override the core plugin implementation. This is useful if a user needs to update core plugin functionality in
  the CLI without the need to patch and update the whole CLI.

ALIASES
  $ cryptid plugins add

EXAMPLES
  $ cryptid plugins:install myplugin 

  $ cryptid plugins:install https://github.com/someuser/someplugin

  $ cryptid plugins:install someuser/someplugin
```

## `cryptid plugins:inspect PLUGIN...`

Displays installation properties of a plugin.

```
USAGE
  $ cryptid plugins:inspect PLUGIN...

ARGUMENTS
  PLUGIN  [default: .] Plugin to inspect.

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Displays installation properties of a plugin.

EXAMPLES
  $ cryptid plugins:inspect myplugin
```

## `cryptid plugins:install PLUGIN...`

Installs a plugin into the CLI.

```
USAGE
  $ cryptid plugins:install PLUGIN...

ARGUMENTS
  PLUGIN  Plugin to install.

FLAGS
  -f, --force    Run yarn install with force flag.
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Installs a plugin into the CLI.

  Can be installed from npm or a git url.

  Installation of a user-installed plugin will override a core plugin.

  e.g. If you have a core plugin that has a 'hello' command, installing a user-installed plugin with a 'hello' command
  will override the core plugin implementation. This is useful if a user needs to update core plugin functionality in
  the CLI without the need to patch and update the whole CLI.

ALIASES
  $ cryptid plugins add

EXAMPLES
  $ cryptid plugins:install myplugin 

  $ cryptid plugins:install https://github.com/someuser/someplugin

  $ cryptid plugins:install someuser/someplugin
```

## `cryptid plugins:link PLUGIN`

Links a plugin into the CLI for development.

```
USAGE
  $ cryptid plugins:link PLUGIN

ARGUMENTS
  PATH  [default: .] path to plugin

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Links a plugin into the CLI for development.

  Installation of a linked plugin will override a user-installed or core plugin.

  e.g. If you have a user-installed or core plugin that has a 'hello' command, installing a linked plugin with a 'hello'
  command will override the user-installed or core plugin implementation. This is useful for development work.

EXAMPLES
  $ cryptid plugins:link myplugin
```

## `cryptid plugins:uninstall PLUGIN...`

Removes a plugin from the CLI.

```
USAGE
  $ cryptid plugins:uninstall PLUGIN...

ARGUMENTS
  PLUGIN  plugin to uninstall

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Removes a plugin from the CLI.

ALIASES
  $ cryptid plugins unlink
  $ cryptid plugins remove
```

## `cryptid plugins:uninstall PLUGIN...`

Removes a plugin from the CLI.

```
USAGE
  $ cryptid plugins:uninstall PLUGIN...

ARGUMENTS
  PLUGIN  plugin to uninstall

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Removes a plugin from the CLI.

ALIASES
  $ cryptid plugins unlink
  $ cryptid plugins remove
```

## `cryptid plugins:uninstall PLUGIN...`

Removes a plugin from the CLI.

```
USAGE
  $ cryptid plugins:uninstall PLUGIN...

ARGUMENTS
  PLUGIN  plugin to uninstall

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Removes a plugin from the CLI.

ALIASES
  $ cryptid plugins unlink
  $ cryptid plugins remove
```

## `cryptid plugins update`

Update installed plugins.

```
USAGE
  $ cryptid plugins update [-h] [-v]

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Update installed plugins.
```

## `cryptid token balance MINT`

show an SPL Token balance

```
USAGE
  $ cryptid token balance [MINT] [-h] [-c <value>] [-s <value>]

ARGUMENTS
  MINT  The SPL-Token mint(base58)

FLAGS
  -c, --config=<value>  Path to config file
  -h, --help            Show CLI help.
  -s, --as=<value>      Execute transactions as a controlled identity (alias or did)

DESCRIPTION
  show an SPL Token balance
```

## `cryptid token show`

show all SPL Token balances

```
USAGE
  $ cryptid token show [-h] [-c <value>] [-s <value>]

FLAGS
  -c, --config=<value>  Path to config file
  -h, --help            Show CLI help.
  -s, --as=<value>      Execute transactions as a controlled identity (alias or did)

DESCRIPTION
  show all SPL Token balances
```

## `cryptid token transfer TO AMOUNT`

Send SPL-Tokens to a recipient

```
USAGE
  $ cryptid token transfer [TO] [AMOUNT] -m <value> [-h] [-c <value>] [-s <value>] [-f]

ARGUMENTS
  TO      Recipient alias, did or public key (base58)
  AMOUNT  The amount of tokens to transfer

FLAGS
  -c, --config=<value>          Path to config file
  -f, --allowUnfundedRecipient  Create a token account for the recipient if needed
  -h, --help                    Show CLI help.
  -m, --mint=<value>            (required) The SPL-Token mint(base58)
  -s, --as=<value>              Execute transactions as a controlled identity (alias or did)

DESCRIPTION
  Send SPL-Tokens to a recipient
```

## `cryptid transfer TO AMOUNT`

Send SOL to a recipient

```
USAGE
  $ cryptid transfer [TO] [AMOUNT] [-h] [-c <value>] [-s <value>]

ARGUMENTS
  TO      Recipient alias, did or public key (base58)
  AMOUNT  The amount in lamports to transfer

FLAGS
  -c, --config=<value>  Path to config file
  -h, --help            Show CLI help.
  -s, --as=<value>      Execute transactions as a controlled identity (alias or did)

DESCRIPTION
  Send SOL to a recipient
```

_See code: [dist/commands/transfer.ts](https://github.com/identity-com/cryptid/blob/v0.3.0-alpha.9/dist/commands/transfer.ts)_
<!-- commandsstop -->
