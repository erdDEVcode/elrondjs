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

  it('can create a new token', async () => {
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
    expect(info.config.canBurn).to.be.false
    expect(info.config.canChangeOwner).to.be.false
    expect(info.config.canFreeze).to.be.false
    expect(info.config.canMint).to.be.false
    expect(info.config.canPause).to.be.false
    expect(info.config.canUpgrade).to.be.false
    expect(info.config.canWipe).to.be.false
  })

  it('can create a new token with custom config', async () => {
    const t = await Token.new(
      'RamToken',
      'RAM',
      '10000',
      18,
      {
        canBurn: false,
        canChangeOwner: true,
        canFreeze: false,
        canMint: true,
        canPause: false,
        canUpgrade: true,
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

    expect(info.config.canBurn).to.be.false
    expect(info.config.canChangeOwner).to.be.true
    expect(info.config.canFreeze).to.be.false
    expect(info.config.canMint).to.be.true
    expect(info.config.canPause).to.be.false
    expect(info.config.canUpgrade).to.be.true
    expect(info.config.canWipe).to.be.false
  })

  describe('once issued', () => {
    let token: Token

    beforeEach(async () => {
      token = await Token.new(
        'RamToken2',
        'RAM2',
        '100000000000000000000', /* 100 * 10^18 */
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
    })

    it.only('can be transferred', async () => {
      // const initialBalance = await token.balanceOf(WALLETS.bob.bech32)

      // const { balance } await provider.getESDTData(, token.id)

      // const { hash } = token.transfer(WALLETS.eve.bech32, 1000)
      // await provider.waitForTransaction(hash)

      // check balances
    })
  })
})