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
  await c.invoke('claimRewards')
})()
```

If you run this without any errors then you'll have just sent a transaction to the delegation contract to claim pending rewards.

## Querying a network

Communication with an Elrond network is done through a `Provider` instance.

Elrondjs provides a concrete implementation known as the `ProxyProvider`. This provider which connects to an [Elrond Proxy](https://docs.elrond.com/tools/proxy) and can be initialized as follows:

```js
const { ProxyProvider } = require('elrondjs')

const provider = new ProxyProvider('https://gateway.elrond.com')
```

_Note: `gateway.elrond.com` is the official Elrond mainnet proxy maintained by the Elrond team. Feel free to replace this with your own Proxy endpoint address_.

Providers must implement the following API:

* `getNetworkConfig: () => Promise<NetworkConfig>` - get network information
* `getAddress: (address: string) => Promise<Address>` - get information about an address
* `queryContract: (params: ContractQueryParams) => Promise<ContractQueryResult>` - read from a contract
* `sendSignedTransaction: (signedTx: SignedTransaction) => Promise<TransactionReceipt>` - broadcast a transaction to the network
* `waitForTransaction: (txHash: string) => Promise<TransactionOnChain>` - wait for transaction to finish executing on the network
* `getTransaction: (txHash: string) => Promise<TransactionOnChain>` - get transaction information

### Get network config

Basic configuration information about a network can be queried using the `getNetworkConfig()` method, to obtain a `NetworkConfig` instance:

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

### Get address information

To get information about an address:

```js
await provider.getAddress('erd1qqqqq...')
```

This will return an `AddressInfo` object with the following structure:

* `address` - bech32 format address 
* `balance` - eGLD balance
* `nonce` - next transaction nonce
* `code` - bytecode at address (empty if not a smart contract address)


## Signing transactions

To sign transactions a `Signer` implementation is needed:

```js
{
  signTransaction: (tx: Transaction, provider: Provider) => Promise<SignedTransaction>,
}
```

Any object that implements the above interface can be used to sign transactions. 

### Wallets

A `Wallet` usually represents an externally-owned address and extends the `Signer` interface.

Elrondjs has built-in support for loading the following types of user wallets:

* `BasicWallet` - Mnemonic, PEM and/or JSON files
* `LedgerWallet` - Ledger hardware wallets

For example:

```js
const { BasicWallet } = require('elrondjs')

const wallet = BasicWallet.fromMenmonic('tourist judge garden detail summer differ want voyage foot good design text')
```

Sometimes you may wish to create a _dummy_ wallet for testing purposes. This can be done as follows:

```js
const { BasicWallet } = require('elrondjs')

const wallet = BasicWallet.generateRandom()
```

To connect to a Ledger hardware wallet one or more [transports](https://github.com/LedgerHQ/ledgerjs#ledgerhqhw-transport-) will need to be passed in. For example, to connect to Ledger in a browser environment:

```js
const TransportWebUsb = require('@ledgerhq/hw-transport-webusb').default
const TransportU2F = require('@ledgerhq/hw-transport-u2f').default

const { LedgerWallet } = require('elrondjs')

// The first transport that works will be the one that's used for all subsequent calls
const wallet = await LedgerWallet.connect([ TransportWebUsb, TransportU2F ])
```

Wallets additionally provide the ability to retrieve the signer address:

```js
const wallet = BasicWallet.generateRandom()

console.log( wallet.address() ) // erd1q.....
```

## Transactions

Transactions may involve value transfers (eGLD and tokens) and/or smart contract interactions. 

An unsigned `Transaction` must at minimum contain:

* `sender` - sender address in bech32 format
* `receiver` - receiver address in bech32 format
* `value` - Amount of eGLD to transfer (denominated in `10^18`, i.e. the value `1 * 10^18` represents `1 eGLD`)

They may also additionally specify the following properties:

* `nonce` - the nonce to use
* `gasPrice` - gas price to use
* `gasLimit` - gas limit to use
* `data` - data string to send alongside transaction
* `meta` - additional configuration to pass to the signer

_Note: the `meta` parameter is non-standard and optional, and is meant for customizing the UI and/or performing custom configuration on the `Signer`. It does not get passed to the network._

### Simple transaction

A simple transaction can be constructed as follows:

```js
const tx = {
  sender: 'erd1tmz6ax3ylejsa3n528uedztrnp70w4p4ptgz23harervvnnf932stkw6h9',
  receiver: 'erd19hdzdg2tmjmfk2kvplsssf3ps7rnyaumhpjhg0l50r938hftkh2qr4cu92',
  value: '2000000000000000000' // 2 eGLD
}
```

To sign a transaction we need a `Signer` instance. The `BasicWallet` class implements the `Signer` interface and thus an instance of it can be used to sign a transaction:

```js
const wallet = ... // create a wallet instance
const provider = ... // create a Provider instance
const tx = ... // create a Transaction instance

// Signing a transaction requires access to a Provider so that the signer can set the correct nonce, transaction version, etc.
await signedTx = await wallet.signTransaction(tx, provider) 
```

A `SignedTransaction` can be broadcast to the network using a provider:

```js
const hash = await provider.sendSignedTransaction(signedTx)
```

Once a transaction has been broadcast to the network a hash is returned. This can be used to wait until the transaction has finished executing:

```js
try {
  const receipt = await provider.waitForTransaction(hash)

  console.log('Succeeded', receipt.transactionOnChain)
} catch (err) {
  console.error('Failed')

  // The "receipt" contains the TransactionReceipt instance
  console.log(err.receipt.transactionOnChain)
}
```


### Auto-calculate gas 

The gas price and gas limits can be auto-calculated:

```js
const tx = await setDefaultGasPriceAndLimit({
  sender: 'erd1tmz6ax3ylejsa3n528uedztrnp70w4p4ptgz23harervvnnf932stkw6h9',
  receiver: 'erd19hdzdg2tmjmfk2kvplsssf3ps7rnyaumhpjhg0l50r938hftkh2qr4cu92',
  value: '2000000000000000000', // 2 eGLD
  data: 'test',
}, provider)

/*
tx.gasPrice and tx.gasLimit will now be set according to network defaults
*/
```

### Query transaction status

And at any time the status of a transaction can be queried through the provider to obtain a `TransactionOnChain` instance:

```js
const txOnChain = await provider.getTransaction(txReceipt.hash)
```

This returns an object with the following properties (in addition to core `Transaction` properties):

* `raw` - raw transaction data
* `smartContractErrors` - list of smart contract error messages. If non-empty then transaction is marked as failed.
* `status` - transaction status - success, pending or failed


## Contracts

The `Contract` class provides the necessary methods for interacting with smart contracts. 

### Deploying

To deploy a new contract:

```js
const receipt = await Contract.deploy(/* bytecode */, /* contract metadata */, /* constructor arguments */, {
  provider: // Provider instance,
  signer: // Signer instance,
  sender: // sender address
})
```

For example:

```js
const { BasicWallet, ProxyProvider, Contract, numberToHex } = require('elrondjs')

const provider = new ProxyProvider('https://gateway.elrond.com')

const wallet = BasicWallet.generateRandom()

const adderWasm = fs.readFileSync(path.join(__dirname, 'adder.wasm'))

const { contract } = await Contract.deploy(addderWasm, { upgradeable: true }, [ numberToHex(3) ], {
  provider,
  signer: wallet,
  sender: wallet.address(),
})

console.log(`Contract has been deployed at: ${contract.address}`)
```

Contract metadata specifies the following properties about a contract and can be changed via an upgrade:

* `upgradeable` - whether this contract can be upgraded (default is no)
* `readable` - whether other contracts can read this contract's data without calling a getter
* `payable` - whether this contract can receive eGLD and ESDT tokens via a transfer (without calling one of its methods).

### Pre-calculate address

The contract deploment address is based on the sender's address and nonce and nothing else. It can thus easily be calculated ahead-of-time using:

```js
const expectedAddress = await Contract.computeDeployedAddress('erd1q...', provider)
```

We can go further and calculate the expected contract deployment address for a specific nonce:

```js
const expectedAddress = await Contract.computeDeployedAddressWithNonce('erd1q...', 23)
```


### Querying

To get a `Contract` instance to talk to an existing on-chain contract:

```js
const contract = await Contract.at('erdq1...')
```

If we supply a `Provider` then it will be queried to ensure that a contract exists at the given address:

```js
// this will throw an error if contract doesn't exist at the addres
const contract = await Contract.at('erdq1...', {
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

### Parsing return values

When a contract is queries the return value is an array of one or more values. For example, the `getUserStakeByType` method of the Mainnet staking contract returns 5 values:

```js
const { addressToHexString } = require('elrondjs')

... // initialize contract object

const returnData = await contract.query('getUserStakeByType', [ addressToHexString('erd1a...')])

/*
  `returnData` is an array of values:

  1. Withdrawable amount (int)
  2. Amount in delegation queue (int)
  3. Amount actively delegated (int)
  4. Unstaked amount (int)
  5. Deferred pament amount (int)
*/
```

The raw returned data is usually in string format. To parse the data to obtain the value we want we use the `parseQueryResult()` method:

```js
const waitingStake = parseQueryResult(returnData, { index: 1, type: ContractQueryResultDataType.INT })
```

The `index` parameter above refers to the index of the desired value in the return data array. If ommitted then it's assumed to equal `0`. The `type` 
parameter specifies the expected data type of the final parsed result. Thus, in this example `waitingStake` will be of type `Number`. The currently supported 
types are:

* `BOOLEAN` - booleans (`true` or `false`)
* `INT` - integers
* `HEX` - hex strings
* `STRING` - strings

## Invoking via transaction

If we wish to send a transaction to a contract (i.e. write data) we need to pass in a `Signer` and set the `sender` address for transactions:

```js
const contract = await Contract.at('contract bech32 address here', {
  provider: ...// Provider instance,
  signer: ...// Signer instance, e.g. a wallet
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


### Upgrading

If a contract's current metadata marks it as upgradeable then it can be upgraded by its owner. This means that the bytecode gets changed but the 
contract on-chain address stays the same.

An example:

```js
const contract = await Contract.at('erdq1...', {
  provider,
  signer: wallet,
  sender: wallet.address(),
})

await contract.upgrade(/*new code wasm */, /* new metadata */, /* constructor args */)
```

### Function arguments

When passing arguments to contract functions it is necessary to format them as hex strings. 

The following utility methods are made available to facilitate this:

* `numberToHex()` - convert number to hex representation
* `stringToHex()` - convert string to hex representation

For example, given a contract function `getValues()` which takes a string and an integer as parameters:

```js
const c = Contract.at('erd1qq....', { provider })

const ret = await c.query('getValues', [
  stringToHex("name"),
  numberToHex(5)
])
```

## Typescript support

First-class support for Typescript is built-in. Even the [API docs](/docs/api) are generated from the Typescript source code and comments.


