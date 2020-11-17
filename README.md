# elrond.js

Javascript SDK for the [Elrond](https://elrond.com) blockchain.

Features:

* Generate and load wallets, sign and broadcast transactions
* Query the blockchain and work with smart contracts
* Cross-platform: Node.js, Browser, Web workers and React Native.
* Typescript definitions.
* Full [documentation](https://elrondjs.erd.dev)

_MORE COMING SOON_

## Installation

```
npm install --save elrondjs
```

## Usage

Example - Claiming rewards from the Mainnet staking contract:

```js
import Elrond from '@elrondnetwork/elrond-core-js'
import { Contract, ProxyProvider, ElrondWallet } from 'elrondjs'

// create wallet
const wallet = ElrondWallet.generateRandom(),

// get contract
const c = Contract.at('0x....', {
  provider: new ProxyProvider('https://api.elrond.com'),
  signer: w,
})

// make the call
try {
  await c.callFunction('claimRewards', [], {
    gasLimit: 250000
  })
} catch (err) {
  console.error('Transaction failed', err.transactionReceipt)
}
```

For usage and full documentation see https://elrondjs.erd.dev.

## License

MIT