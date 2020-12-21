import { WALLETS } from 'narya'

import { expect, PROXY_ENDPOINT } from './utils'
import { BasicWallet, ProxyProvider } from '../dist/cjs'

describe('ESDT tokens', () => {
  const provider = new ProxyProvider(PROXY_ENDPOINT)
  const signer = BasicWallet.fromJsonKeyFileString(JSON.stringify(WALLETS.alice), 'password')
  const sender = signer.address()
})