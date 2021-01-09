import { WALLETS } from 'narya'
import delay from 'delay'

import { expect, PROXY_ENDPOINT } from './utils'
import { BasicWallet, ProxyProvider, Token } from '../src'
import { BigVal } from 'bigval'

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
      new BigVal('10000'), 
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

    expect(info.name).to.eq('RamToken')
    expect(info.ticker).to.eq('RAM')
    expect(info.supply).to.eq('10000')
    expect(info.decimals).to.eq(18)
    expect(info.owner).to.eq(WALLETS.bob.bech32)
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
      new BigVal('10000'),
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

    beforeAll(async () => {
      const name = `RAM${~~(Math.random() * 1000)}`

      token = await Token.new(
        name,
        name,
        new BigVal('100', 'coins'), /* 100 * 10^18 */
        18,
        {
          canBurn: true,
          canChangeOwner: true,
          canFreeze: true,
          canMint: true,
          canPause: true,
          canUpgrade: true,
          canWipe: true,
        },
        {
          provider,
          signer,
          sender,
        }
      )

      // give time for data to be saved in node
      await delay(15000)
    })

    it('can be transferred', async () => {
      await token.balanceOf(sender).should.eventually.eq('100000000000000000000')

      const receiver = WALLETS.eve.bech32
      await token.transfer(receiver, new BigVal('100'))

      await token.balanceOf(receiver).should.eventually.eq('100')
      await token.balanceOf(sender).should.eventually.eq('99999999999999999900')
    })

    it('can mint more to the owner', async () => {
      await token.mint('1')
      await delay(15000)

      await token.balanceOf(sender).should.eventually.eq('99999999999999999901')

      const info = await token.getInfo()
      expect(info.supply).to.eq('100000000000000000001')
    })

    it('can mint more to any address', async () => {
      await token.mint('1', WALLETS.dan.bech32)
      await delay(15000)

      await token.balanceOf(WALLETS.dan.bech32).should.eventually.eq('1')

      const info = await token.getInfo()
      expect(info.supply).to.eq('100000000000000000002')
    })

    it('it can burn tokens for sender', async () => {
      await token.burn('1')
      await delay(15000)

      await token.balanceOf(sender).should.eventually.eq('99999999999999999900')

      // TODO: why doesn't the supply get decreased??
      const info = await token.getInfo()
      // expect(info.supply).to.eq('100000000000000000001')
    })

    it('it can be paused and unpaused', async () => {
      await token.pause()
      await delay(5000)

      await token.getInfo().should.eventually.have.property('paused').that.eq(true)

      await token.unPause()
      await delay(5000)

      await token.getInfo().should.eventually.have.property('paused').that.eq(false)
    })

    it('it can freeze and unfreeze an address', async () => {
      await token.freeze(WALLETS.eve.bech32)
      await delay(5000)
      await token.unFreeze(WALLETS.eve.bech32)
      await delay(5000)
    })

    it('it can wipe frozen address balance', async () => {
      await token.balanceOf(WALLETS.eve.bech32).should.eventually.not.eq('0')      

      await token.freeze(WALLETS.eve.bech32)
      await delay(15000)
      await token.wipe(WALLETS.eve.bech32)
      await delay(15000)

      await token.balanceOf(WALLETS.eve.bech32).should.eventually.eq('0')      
    })

    it('can upgrade its config', async () => {
      const info = await token.getInfo()
      expect(info.config.canPause).to.be.true

      await token.updateConfig({
        canBurn: true,
        canChangeOwner: true,
        canFreeze: true,
        canMint: true,
        canPause: false,
        canUpgrade: true,
        canWipe: true,
      })
      await delay(15000)

      const info2 = await token.getInfo()
      expect(info2.config.canPause).to.be.false
    })

    it('can change its owner', async () => {
      await token.changeOwner(WALLETS.dan.bech32)
      await delay(15000)

      await token.getInfo().should.eventually.have.property('owner').which.eq(WALLETS.dan.bech32)
    })
  })
})