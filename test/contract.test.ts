import path from 'path'
import fs from 'fs'
import { WALLETS } from 'narya'

import { expect, PROXY_ENDPOINT } from './utils'
import { BasicWallet, ProxyProvider, Contract, parseQueryResult, ContractDeploymentTransactionReceipt, ContractQueryResultDataType, numberToHex, Token } from '../src'
import delay from 'delay'


describe('contracts', () => {
  const adderWasm = fs.readFileSync(path.join(__dirname, 'adder.wasm'))

  const provider = new ProxyProvider(PROXY_ENDPOINT)
  const signer = BasicWallet.fromJsonKeyFileString(JSON.stringify(WALLETS.alice), 'password')
  const sender = signer.address()

  let receipt: ContractDeploymentTransactionReceipt

  beforeEach(async () => {
    receipt = await Contract.deploy(
      adderWasm,
      {
      },
      [numberToHex(3)],
      {
        provider,
        signer,
        sender,
        gasLimit: 15000000,
      }
    )
  })

  it('can be deployed', async () => {
    const address = await provider.getAddress(receipt.contract.address)
    expect(address.code.length > 0).to.be.true
  })


  it('can be queried', async () => {
    const sum = parseQueryResult(await receipt.contract.query('getSum'), {
      type: ContractQueryResultDataType.INT
    }) as string

    expect(sum).to.equal('3')
  })

  it('can be invoked', async () => {
    await receipt.contract.invoke('add', [numberToHex(5)], {
      gasLimit: 2000000
    })

    const sum2 = parseQueryResult(await receipt.contract.query('getSum'), {
      type: ContractQueryResultDataType.INT
    })

    expect(sum2).to.equal('8')
  })

  it('can be invoked with tokens', async () => {
    const token = await Token.new(
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

    await delay(15000)
    await token.balanceOf(sender).should.eventually.eql('10000')

    await receipt.contract.invoke('add', [numberToHex(5)], {
      gasLimit: 2500000,
      esdt: {
        id: token.id,
        value: '1',
      }
    })

    const sum2 = parseQueryResult(await receipt.contract.query('getSum'), {
      type: ContractQueryResultDataType.INT
    })

    expect(sum2).to.equal('8')

    // check contract token balance
    await token.balanceOf(receipt.contract.address).should.eventually.eql('1')
  })

  it('can be found', async () => {
    const c = await Contract.at(receipt.contract.address, {
      provider,
      signer,
      sender,
    })

    const sum = parseQueryResult(await receipt.contract.query('getSum'), {
      type: ContractQueryResultDataType.INT
    })

    expect(sum).to.equal('3')
  })

  describe('and upgrades', () => {
    it('are off by default', async () => {
      await receipt.contract.upgrade(adderWasm, {}, [ 
        numberToHex(3) 
      ], {
        gasLimit: 15000000
      }).should.be.rejected
    })

    it('are on if deployed as upgradeable', async () => {
      const { contract } = await Contract.deploy(
        adderWasm,
        {
          upgradeable: true,
        },
        [numberToHex(3)],
        {
          provider,
          signer,
          sender,
          gasLimit: 15000000,
        }
      )

      await contract.upgrade(adderWasm, {
        upgradeable: true,
      }, [
        numberToHex(3)
      ], {
        gasLimit: 15000000
      })
    })
  })
})
