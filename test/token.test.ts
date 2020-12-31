import { WALLETS } from 'narya'

import { expect, PROXY_ENDPOINT } from './utils'
import { BasicWallet, ProxyProvider, Token } from '../dist/cjs'

describe('ESDT tokens', () => {
  const provider = new ProxyProvider(PROXY_ENDPOINT)
  const signer = BasicWallet.fromJsonKeyFileString(JSON.stringify(WALLETS.bob), 'password')
  const sender = signer.address()

  it('can list existing tokens', async () => {
    const ids = await Token.getAllTokenIds({ provider })
    expect(ids).to.be.instanceOf(Array)
  })

  it.only('can create a new token', async () => {
    const t = await Token.new(
      'RamToken', 
      'RAM', 
      '10000', 
      18, 
      {
        canBurn: false,
        canChangeOwner: false,
        canFreeze: false,
        canMint: false,
        canPause: false,
        canUpgrade: false,
        canWipe: false,
      },
      { 
        provider,
        signer,
        sender,
      }
    )

    expect(t.id).to.exist

    const info = await t.getInfo()

    expect(info.name).to.eql('RamToken')
    expect(info.ticker).to.eql('RAM')
    expect(info.supply).to.eql('10000')
    expect(info.decimals).to.eql(18)
    expect(info.owner).to.eql(WALLETS.bob.bech32)
  })
})