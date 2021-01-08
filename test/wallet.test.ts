import { BigVal, BigValScale } from 'bigval'
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
      value: new BigVal(1, BigValScale.NORMAL),
    }, proxy)

    expect(signedTransaction).to.deep.equal({
      nonce: 0,
      value: '1000000000000000000',
      receiver: 'erd1tcylw3y4s2y43xps0cjuvgql2zld9aze4c7ku6ekhezu39tpag5q6audht',
      sender: 'erd1tcylw3y4s2y43xps0cjuvgql2zld9aze4c7ku6ekhezu39tpag5q6audht',
      gasPrice: NaN,
      gasLimit: NaN,
      data: '',
      chainID: 'local-testnet',
      version: 1,
      signature: '26e145a58f5fbd6bbc46ad771518e9dc1208db7e03195aaf9ca8846708b95177d3518f99793c081c8210a0cfebe42850debb6f5b06009818cb6abe73f9e47e08'
    })
  })

  it('can sign a transaction with some extra info set', async () => {
    const w = BasicWallet.fromMnemonic(MNEMONIC)

    const signedTransaction = await w.signTransaction({
      sender: w.address(),
      receiver: w.address(),
      value: new BigVal(1, BigValScale.NORMAL),
      nonce: 53,
      gasPrice: 50000,
      gasLimit: 200000,
    }, proxy)

    expect(signedTransaction).to.deep.equal({
      nonce: 53,
      value: '1000000000000000000',
      receiver: 'erd1tcylw3y4s2y43xps0cjuvgql2zld9aze4c7ku6ekhezu39tpag5q6audht',
      sender: 'erd1tcylw3y4s2y43xps0cjuvgql2zld9aze4c7ku6ekhezu39tpag5q6audht',
      gasPrice: 50000,
      gasLimit: 200000,
      data: '',
      chainID: 'local-testnet',
      version: 1,
      signature: '54c5b4bddf71812f811bdbae1751fae628d30e4f246875d429f127ec34128cba25d31a369f23193ea890b9ef59092336fcff1618e7120cce43f6c8b2d1a59108'
    })
  })
})
