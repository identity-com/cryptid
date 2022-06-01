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
$ cryptid (--version|-v)
@identity.com/cryptid-cli/0.1.9 darwin-arm64 node-v16.13.0
$ cryptid --help [COMMAND]
USAGE
  $ cryptid COMMAND
...
```
<!-- usagestop -->
# Commands
<!-- commands -->
* [`cryptid help [COMMAND]`](#cryptid-help-command)
* [`cryptid plugins`](#cryptid-plugins)
* [`cryptid plugins:inspect PLUGIN...`](#cryptid-pluginsinspect-plugin)
* [`cryptid plugins:install PLUGIN...`](#cryptid-pluginsinstall-plugin)
* [`cryptid plugins:link PLUGIN`](#cryptid-pluginslink-plugin)
* [`cryptid plugins:uninstall PLUGIN...`](#cryptid-pluginsuninstall-plugin)
* [`cryptid plugins update`](#cryptid-plugins-update)
* [`cryptid version`](#cryptid-version)

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

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v5.1.11/src/commands/help.ts)_

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

## `cryptid version`

```
USAGE
  $ cryptid version
```

_See code: [@oclif/plugin-version](https://github.com/oclif/plugin-version/blob/v1.0.4/src/commands/version.ts)_
<!-- commandsstop -->
