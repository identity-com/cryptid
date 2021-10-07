# Cryptid
Solana DID-aware on-chain signer and wallet Integrations

## Contents
* [Roadmap](#roadmap)
* [Demo](#demo)
* [Frequently Asked Questions (FAQs)](#frequently-asked-questions--faqs-)
* [Getting started](#getting-started)
* [Technical Details](#technical-details)

## Demo

## Frequently Asked Questions (FAQs)

### What is Cryptid?

### Why did you create Cryptid?

### How secure is Cryptid?

### How decentralized is Cryptid?

### Can I use Cryptid on Mainnet?


## Getting Started
To contribute to Cryptid, please check out the [code of conduct](./CODE_OF_CONDUCT.md).

---

To build and test locally, first install the prerequisites and dependencies.

1. Install [NVM](https://github.com/nvm-sh/nvm#installing-and-updating) and [Yarn 1.x](https://yarnpkg.com/)
2. Update node:
```sh
nvm install
```
3. Install the dependencies
```
yarn
```

### Program

To build the Rust Solana program, please ensure:
1. You have the Solana tool suite installed locally by following the steps [here](https://docs.solana.com/cli/install-solana-cli-tools).
2. You have the Rust tool suite installed locally by following the steps [here](https://www.rust-lang.org/tools/install)

Once Rust and Solana are installed, build using:
```sh
cargo build-bpf
```

Run the program functional tests using:
```sh
cargo test-bpf
```

### Client

1. Build the client:
```sh
yarn workspace @identity.com/cryptid build
```

2. Run the unit tests:
```sh
yarn workspace @identity.com/cryptid test
```

3. Run the e2e tests (you must first compile the Cryptid Rust program (see [Program](#program) above):
```shell
yarn workspace @identity.com/cryptid test-e2e
```

### CLI

1. Run the tests:
```sh
yarn workspace @identity.com/cryptid-cli test
```

2. Run the cli locally:
```sh
yarn workspace @identity.com/cryptid-cli cryptid
```

CLI usage instructions can be found in the [readme](./cli/README.md).

### Wallet

1. Start the test validator:
```sh
yarn start-validator
```

2. Start the Cryptid wallet:
```sh
yarn workspace @identity.com/cryptid-wallet start
```

# Technical Details
