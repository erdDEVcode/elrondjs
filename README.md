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

**Example - Claiming rewards from the Mainnet staking contract**

```js
import { Contract, ProxyProvider, ElrondWallet } from 'elrondjs'

(async () => {
  // create connection to network
  const proxy = new ProxyProvider('https://api.elrond.com')

  // load wallet
  const wallet = ElrondWallet.fromMnemonic('YOUR MNEMONIC HERE'),

  // create contract interface
  // and tell it to use our provider and wallet
  const c = await Contract.at('erd1qqqqqqqqqqqqqpgqxwakt2g7u9atsnr03gqcgmhcv38pt7mkd94q6shuwt', {
    provider: proxy,
    signer: wallet,
  })

  // make the claim!
  await c.invoke('claimRewards', [], {
    gasLimit: 250000000
  })
})()
```

For usage and full documentation see https://elrondjs.erd.dev.

## License

MIT