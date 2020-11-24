## Introduction

The **elrondjs** library is a Javascript library for working with the [Elrond](https://elrond.com) blockchain.

Some of it's features:

* Generate and load wallets, sign and broadcast transactions
* Query the blockchain and work with smart contracts
* Cross-platform: Works in Node.js, Browser, Web workers and React Native.
* Typescript definitions.

This guide will go through the main concepts and how to use it.

## Getting started

_Note: throughout this guide we're going to assume you already have Node.js installed and that you have some experience programming with Node.js and Javascript in general._

Install the [NPM](npmjs.com) package:

```shell
npm install --save elrondjs
```

Now let's use it to check on our [eGLD delegation rewards](https://elrond.com/blog/egold-delegation-waiting-list-guide/) on the Elrond mainnet. In an editor enter:

```js
const { 
  Contract, 
  ProxyProvider, 
  BasicWallet, 
  ContractQueryResultDataType, 
  addressToHexString, 
  parseQueryResult 
} = require('elrondjs')

;(async () => {
  // create connection to network
  const proxy = new ProxyProvider('https://gateway.elrond.com')

  // load wallet
  const wallet = BasicWallet.fromMnemonic('YOUR MNEMONIC HERE')

  // create interface to official delegation contract
  const c = await Contract.at('erd1qqqqqqqqqqqqqpgqxwakt2g7u9atsnr03gqcgmhcv38pt7mkd94q6shuwt', {
    provider: proxy,
    signer: wallet,
    sender: wallet.address(),
  })

  // get delegation rewards
  const ret = await c.query('getClaimableRewards', [ addressToHexString(wallet.address()) ])

  // parse
  const claimable = parseQueryResult(ret, { type: ContractQueryResultDataType.INT })
  console.log(claimable)
})()
```

_Note: make sure to replace `'YOUR MNEMONIC HERE'` in the above code example with a wallet mnemonic of your choice. You can create a new Elrond wallet by visiting [https://wallet.elrond.com](https://wallet.elrond.com)._

If you run this script in your shell it should output a single number corresponding to the total delegation rewards which can be claimed for the wallet represented by the mnemonic. For example, if you try it with the mnemonic `wine connect affair surge wealth wide pact naive cry cover sadness casino` it will return `0`.

Congratulations! You've just made a successful call to a contract on the Elrond mainnet. Now let's try claiming any outstanding rewards by sending a transaction to the chain:

_Note: ensure you have enough eGLD in your wallet to cover the transaction fee_.

```js
const { 
  Contract, 
  ProxyProvider, 
  BasicWallet, 
  ContractQueryResultDataType, 
  addressToHexString, 
  parseQueryResult 
} = require('.')

;(async () => {
  // create connection to network
  const proxy = new ProxyProvider('https://gateway.elrond.com')

  // load wallet
  const wallet = BasicWallet.fromMnemonic('YOUR MNEMONIC HERE')

  // create contract interface
  // and tell it to use our provider and wallet
  const c = await Contract.at('erd1qqqqqqqqqqqqqpgqxwakt2g7u9atsnr03gqcgmhcv38pt7mkd94q6shuwt', {
    provider: proxy,
    signer: wallet,
    sender: wallet.address(),
  })

  // claim delegation rewards
  const tx = await c.invoke('claimRewards')

  // wait for transaction to complete
  await proxy.waitForTransaction(tx.hash)
})()
```

If you run this without any errors then you'll have just sent a transaction to the delegation contract to claim pending rewards.

## Connecting to a network

Communication with an Elrond network is done through a `Provider` instance.

Elrondjs provides a concrete implementation known as the `ProxyProvider`. This provider which connects to an [Elrond Proxy](https://docs.elrond.com/tools/proxy) and can be initialized as follows:

```js
const { ProxyProvider } = require('elrondjs')

const provider = new ProxyProvider('https://gateway.elrond.com')
```

_Note: `gateway.elrond.com` is the official Elrond mainnet proxy maintained by the Elrond team. Feel free to replace with any other Proxy endpoint_.

Providers must implement the following API:

* `getNetworkConfig: () => Promise<NetworkConfig>` - get network information
* `getAddress: (address: string) => Promise<Address>` - get information about an address
* `queryContract: (params: ContractQueryParams) => Promise<ContractQueryResult>` - read from a contract
* `sendSignedTransaction: (signedTx: SignedTransaction) => Promise<TransactionReceipt>` - broadcast a transaction to the network
* `waitForTransaction: (txHash: string) => Promise<void>` - wait for transaction to finish executing on the network
* `getTransaction: (txHash: string) => Promise<TransactionOnChain>` - get transaction information

For example, basic information about a network can be queried using the `getNetworkConfig()` method, to obtain a `NetworkConfig` instance:

```js
await provider.getNetworkConfig()
```

For example, running the above on the public mainnet returns:

```js
{
  version: 'v1.1.10.0',
  chainId: '1',
  gasPerDataByte: 1500,
  minGasPrice: 1000000000,
  minGasLimit: 50000,
  minTransactionVersion: 1
}
```

## Wallets

Elrondjs has built-in support for loading the following types of user wallets and classes for each:

* `BasicWallet` - Mnemonic, PEM and/or JSON files
* `LedgerWallet` - Ledger hardware wallets

For example:

```js
const { BasicWallet } = require('elrondjs')

const wallet = BasicWallet.fromMenmonic('tourist judge garden detail summer differ want voyage foot good design text')
```

Creating a "dummy" wallet with a random mnemonic can be done:

```js
const { BasicWallet } = require('elrondjs')

const wallet = BasicWallet.generateRandom()
```

To connect to a Ledger hardware wallet one or more "transports" will need to be passed in. For example, to connect to Ledger in a browser environment:

```js
const TransportWebUsb = require('@ledgerhq/hw-transport-webusb').default
const TransportU2F = require('@ledgerhq/hw-transport-u2f').default

const { LedgerWallet } = require('elrondjs')

// The first transport that works will be the one that's used for all subsequent calls
const wallet = await LedgerWallet.connect([ TransportWebUsb, TransportU2F ])
```

## Transactions

Transactions may involve value transfers (eGLD and tokens) and/or smart contract interactions. The minimum structure of a `Transaction` is:

* `sender` - sender address in bech32 format
* `receiver` - receiver address in bech32 format
* `value` - Amount of eGLD to transfer (denominated in `10^18`, i.e. `10^18` represents `1 eGLD`)

They may also additionally specify the following properties, though if using the `Contract` class then these will usually get set automatically:

* `gasPrice` - gas price to use
* `gasLimit` - gas limit to use
* `data` - data string to send alongside transaction

A simple transaction can be constructed as follows:

```js
const tx = {
  sender: 'erd1tmz6ax3ylejsa3n528uedztrnp70w4p4ptgz23harervvnnf932stkw6h9',
  receiver: 'erd19hdzdg2tmjmfk2kvplsssf3ps7rnyaumhpjhg0l50r938hftkh2qr4cu92',
  value: '2000000000000000000' // 2 eGLD
}
```

To sign a transaction we need a `Signer` instance. The `BasicWallet` class implements the `Signer` interface and thus an instance of it can be used to sign a `Transaction`:

```js
const wallet = ... // create a wallet instance
const provider = ... // create a Provider instance
const tx = ... // create a Transaction instance

// Signing a transaction requires access to a Provider so that the signer can set the correct nonce, transaction version, etc.
await signedTx = await wallet.signTransaction(tx, provider) 
```

A `SignedTransaction` can be broadcast to the network using a provider:

```js
const txReceipt = await provider.sendSignedTransaction(signedTx)
```

Once a transaction has been broadcast to the network a `TransactionReceipt` is returned. This contains the transaction hash which can be used to wait until the transaction has finished executing:

```js
// This will throw an Error if the transaction fails
await provider.waitForTransaction(txReceipt.hash)
```

And at any time the status of a transaction can be queried through the provider to obtain a `TransactionOnChain` instance:

```js
const txOnChain = await provider.getTransaction(txReceipt.hash)
```

## Contracts

The `Contract` class provides the necessary methods for interacting with smart contracts. To get an instance to talk to an existing on-chain contract:

```js
const contract = await Contract.at('contract bech32 address here', {
  provider: // Provider instance,
})
```

We pass in a `Provider` that is to be used for all subsequent requests. Note that we can also specify a default gas limit and gas price, etc to use for subsequent transactions.

To query a contract (i.e. call a read-only method on it):

```js
await contract.query('method name', [ /* method arguments */ ])
```

This will internally query the blockchain using the provider passed in during construction. The provider can be overridden on a per-call basis:

```js
await contract.query('method name', [ /* method arguments */ ], { 
  provider: ...// another Provider instance to use instead of the one passed in to the constructor
})
```

If we wish to send a transaction to a contract (i.e. write data) we need to pass in a `Signer` and set the `sender` address for transactions:

```js
const contract = await Contract.at('contract bech32 address here', {
  provider: ...// Provider instance,
  signer: ...// Singer instance, e.g. an BasicWallet
  sender: ...// wallet bech32 address
})

await contract.invoke('method name', [ /* method arguments */])
```

This will internally do the following in sequence:

1. Use the `Provider` to fetch the current `NetworkConfig`
1. Use the current `NetworkConfig` to set the gas price and calculate the gas limit to be used
1. Sign the transaction using the `Signer`
1. Broadcast the `SignedTransaction` to the network using the `Provider`

We can of course override the various values on a per-call basis:

```js
const contract = await Contract.at('contract bech32 address here', {
  provider: ...// Provider instance,
  signer: ...// Singer instance, e.g. an BasicWallet
  sender: ...// wallet bech32 address
})

await contract.invoke('method name', [ /* method arguments */], {
  provider: ...// new Provider instance
  signer: ...// new Signer instance
  sender: ...// different from address
  gasLimit: 250000000,
  gasPrice: 1000000,
  value: '123',
})
```

The Provider can be used to monitor transaction progress:

```js
const { hash } = await contract.invoke('method name', [ /* method arguments */])

await provider.waitForTransaction(hash)
```

Although `invoke()` does everything needed to send a transation you can also choose to do the steps manually by obtaining a  `ContractTransaction` instance:

```js
// get ContractInvocation (instance of a ContractTransaction)
const contractTransaction = await contract.createInvocation('method name', [ /* method arguments */ ])
// get Transaction object
const tx = await contractTransaction.toTransaction()
// sign it
const signedTx = await wallet.signTransaction(tx, provider)
// send it
const txReceipt = await provider.sendSignedTransaction(signedTx)
```

## Typescript support

First-class support for Typescript is built-in. Even the [API docs](/docs/api) are generated from the Typescript source code and comments.


