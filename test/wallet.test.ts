import { WALLETS } from 'narya'

import { BasicWallet, ProxyProvider } from '../src'
import { expect, PROXY_ENDPOINT } from './utils'

const MNEMONIC = 'fringe dry little minor note hundred lottery garment announce space throw captain seven slim common piece blame battle void pistol diagram melody phone mother'

describe('BasicWallet', () => {
  const proxy = new ProxyProvider(PROXY_ENDPOINT)

  it('can generate a random wallet', async () => {
    const w = BasicWallet.generateRandom()
    expect(w.address().length > 1).to.be.true
  })

  it('can load from a mnemonic', async () => {
    const w = BasicWallet.fromMnemonic(MNEMONIC)
    w.address().should.eql('erd1tcylw3y4s2y43xps0cjuvgql2zld9aze4c7ku6ekhezu39tpag5q6audht')
  })

  it('can load from a JSON file string', async () => {
    const w = BasicWallet.fromJsonKeyFileString(JSON.stringify(WALLETS.alice), 'password')
    w.address().should.eql('erd1qyu5wthldzr8wx5c9ucg8kjagg0jfs53s8nr3zpz3hypefsdd8ssycr6th')
  })

  it('can load from a PEM file string', async () => {
    const w = BasicWallet.fromPemFileString(`-----BEGIN PRIVATE KEY for erd1qyu5wthldzr8wx5c9ucg8kjagg0jfs53s8nr3zpz3hypefsdd8ssycr6th-----
NDEzZjQyNTc1ZjdmMjZmYWQzMzE3YTc3ODc3MTIxMmZkYjgwMjQ1ODUwOTgxZTQ4
YjU4YTRmMjVlMzQ0ZThmOTAxMzk0NzJlZmY2ODg2NzcxYTk4MmYzMDgzZGE1ZDQy
MWYyNGMyOTE4MWU2Mzg4ODIyOGRjODFjYTYwZDY5ZTE=
-----END PRIVATE KEY for erd1qyu5wthldzr8wx5c9ucg8kjagg0jfs53s8nr3zpz3hypefsdd8ssycr6th-----`)

    w.address().should.eql('erd1qyu5wthldzr8wx5c9ucg8kjagg0jfs53s8nr3zpz3hypefsdd8ssycr6th')
  })

  it('can sign a transaction with minimal tx info', async () => {
    const w = BasicWallet.fromMnemonic(MNEMONIC)

    const signedTransaction = await w.signTransaction({
      sender: w.address(),
      receiver: w.address(),
      value: '0',
    }, proxy)

    expect(signedTransaction).to.deep.equal({
      nonce: 0,
      value: '0',
      receiver: 'erd1tcylw3y4s2y43xps0cjuvgql2zld9aze4c7ku6ekhezu39tpag5q6audht',
      sender: 'erd1tcylw3y4s2y43xps0cjuvgql2zld9aze4c7ku6ekhezu39tpag5q6audht',
      gasPrice: NaN,
      gasLimit: NaN,
      data: '',
      chainID: 'local-testnet',
      version: 1,
      signature: 'a6775dfd01617638cf8e4535f9aafc238dc48bfea8a966e9198f44b72e2f0a9eff37a014c329a47f53d655b0e26f0fec8b8391e1eb2f7d18e94bc5b313613605'
    })
  })

  it('can sign a transaction with some extra info set', async () => {
    const w = BasicWallet.fromMnemonic(MNEMONIC)

    const signedTransaction = await w.signTransaction({
      sender: w.address(),
      receiver: w.address(),
      value: '0',
      nonce: 53,
      gasPrice: 50000,
      gasLimit: 200000,
    }, proxy)

    expect(signedTransaction).to.deep.equal({
      nonce: 53,
      value: '0',
      receiver: 'erd1tcylw3y4s2y43xps0cjuvgql2zld9aze4c7ku6ekhezu39tpag5q6audht',
      sender: 'erd1tcylw3y4s2y43xps0cjuvgql2zld9aze4c7ku6ekhezu39tpag5q6audht',
      gasPrice: 50000,
      gasLimit: 200000,
      data: '',
      chainID: 'local-testnet',
      version: 1,
      signature: '7b243bb41693566365c8b901d885dc790bc14b6d69900f4be2b1ccd1a9857aa5caa3218bafd56f8c5f63279e6496ed7ff807496ff53394f7206fe30e4e4cec0f'
    })
  })
})
